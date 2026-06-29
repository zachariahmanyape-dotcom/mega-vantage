// crm.jsx — Admin CRM (migrated from the standalone MEGA CRM).
// Admin-only route `admin-crm`. Reads/writes crm_contacts + crm_interactions
// (RLS is admin-only via is_admin()). Three views: All Contacts (table),
// Pipeline (kanban), Interactions (feed). Edit happens in a right slide-over
// with Edit + Log tabs. All filtering is client-side over the full dataset
// loaded once on mount — matching the original CRM's workflow.

const { useState, useEffect, useMemo, useRef } = React;

// ── Domain constants ──────────────────────────────────────────
const CRM_CONTACT_TYPES = ['Lead', 'Account', 'Affiliate'];
const CRM_BUSINESS_LINES = ['Management', 'Mentorship'];
const CRM_INTEREST_LEVELS = ['Unknown', 'Low', 'Medium', 'High'];
const CRM_INTERACTION_TYPES = ['Note', 'Call', 'Email', 'LinkedIn DM', 'Meeting', 'Other'];

// Pipeline column order (Kanban). Excludes "Not Interested" (terminal) — those
// still appear in the table + are filterable, just not a board column.
const CRM_PIPELINE_STAGES = [
  'Scraped', 'Not Contacted', 'LinkedIn Request Sent', 'LinkedIn Connected',
  'Contacted', 'Replied', 'Interested', 'Discovery Scheduled', 'Proposal Sent', 'Closed Won',
];
// Every stage value that exists, for the table's stage filter + edit dropdown.
const CRM_ALL_STAGES = [...CRM_PIPELINE_STAGES.slice(0, 1), 'Not Contacted', 'LinkedIn Request Sent',
  'LinkedIn Connected', 'Contacted', 'Replied', 'Interested', 'Discovery Scheduled',
  'Proposal Sent', 'Not Interested', 'Closed Won'];

// Stage → pill color class (defined in styles.css as .crm-pill.<x>).
const CRM_STAGE_CLASS = {
  'Scraped': 'gray',
  'Not Contacted': 'gray',
  'LinkedIn Request Sent': 'blue-soft',
  'LinkedIn Connected': 'teal',
  'Contacted': 'blue',
  'Replied': 'teal',
  'Interested': 'green',
  'Discovery Scheduled': 'green',
  'Proposal Sent': 'amber',
  'Not Interested': 'red',
  'Closed Won': 'cobalt',
};

// ── Helpers ───────────────────────────────────────────────────
const crmNull = (v) => { const t = (v == null ? '' : String(v)).trim(); return t === '' ? null : t; };
const crmToday = () => new Date().toISOString().slice(0, 10);

function crmFmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (d.length === 10 ? 'T12:00:00' : ''));
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CrmStagePill({ stage }) {
  if (!stage) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  return <span className={'crm-pill ' + (CRM_STAGE_CLASS[stage] || 'gray')}>{stage}</span>;
}
function CrmTypePill({ type }) {
  const cls = type === 'Account' ? 'sapphire' : type === 'Affiliate' ? 'coral' : '';
  return <span className={'chip ' + cls}>{type || 'Lead'}</span>;
}
function CrmLinePill({ line }) {
  return <span className={'chip ' + (line === 'Mentorship' ? 'teal' : '')}>{line || 'Management'}</span>;
}

// ── Right slide-over shell ────────────────────────────────────
function CrmSlideOver({ title, subtitle, onClose, children, footer, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="crm-slideover-bg" onClick={onClose} />
      <aside className="crm-slideover" style={{ width: 'min(' + width + 'px, 96vw)' }} role="dialog" aria-modal="true">
        <header className="crm-slideover-head">
          <div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, lineHeight: 1.1 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} className="crm-x" aria-label="Close">✕</button>
        </header>
        <div className="crm-slideover-body">{children}</div>
        {footer && <div className="crm-slideover-foot">{footer}</div>}
      </aside>
    </>
  );
}

const crmField = (label, node) => (
  <div>
    <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
    {node}
  </div>
);

// ── Interaction composer (shared by Log tab + Interactions view) ──
function CrmInteractionForm({ onSubmit, busy }) {
  const [date, setDate] = useState(crmToday());
  const [type, setType] = useState('Note');
  const [note, setNote] = useState('');
  const submit = () => {
    if (!note.trim()) return;
    onSubmit({ interaction_date: date, type, note: note.trim() }, () => { setNote(''); setType('Note'); setDate(crmToday()); });
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {crmField('Date', <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />)}
        {crmField('Type', <select className="input" style={{ fontSize: 13 }} value={type} onChange={(e) => setType(e.target.value)}>{CRM_INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
      </div>
      {crmField('Note', <textarea className="input" rows={3} placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: 'vertical', lineHeight: 1.5 }} />)}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn primary sm" disabled={!note.trim() || busy} onClick={submit}>{busy ? 'Saving…' : 'Add interaction'}</button>
      </div>
    </div>
  );
}

// ── Contact slide-over (Edit + Log tabs; also used to add) ────
function CrmContactPanel({ contact, interactions, onClose, onSaved, onAddInteraction, initialTab }) {
  const editing = !!(contact && contact.id);
  const [tab, setTab] = useState(initialTab || 'edit');
  const blank = {
    full_name: '', role: '', company: '', email: '', linkedin_url: '',
    contact_type: 'Lead', business_line: 'Management', source: '',
    stage: 'Scraped', interest_level: 'Unknown', outreach_status: '',
    last_contact_date: '', next_step: '', next_step_date: '',
  };
  const init = editing ? {
    full_name: contact.full_name || '', role: contact.role || '', company: contact.company || '',
    email: contact.email || '', linkedin_url: contact.linkedin_url || '',
    contact_type: contact.contact_type || 'Lead', business_line: contact.business_line || 'Management',
    source: contact.source || '', stage: contact.stage || 'Scraped',
    interest_level: contact.interest_level || 'Unknown', outreach_status: contact.outreach_status || '',
    last_contact_date: contact.last_contact_date || '', next_step: contact.next_step || '',
    next_step_date: contact.next_step_date || '',
  } : blank;
  const [form, setForm] = useState(init);
  const [disregarded, setDisregarded] = useState(!!(contact && contact.disregarded_on));
  const [saving, setSaving] = useState(false);
  const [busyInt, setBusyInt] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const logRows = useMemo(
    () => (interactions || []).filter((i) => editing && i.contact_id === contact.id)
      .slice().sort((a, b) => (b.interaction_date || '').localeCompare(a.interaction_date || '') || (b.created_at || '').localeCompare(a.created_at || '')),
    [interactions, contact, editing]
  );

  const save = async () => {
    setErr('');
    if (!form.full_name.trim()) { setErr('Full name is required.'); setTab('edit'); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(), role: crmNull(form.role), company: crmNull(form.company),
      email: crmNull(form.email), linkedin_url: crmNull(form.linkedin_url),
      contact_type: form.contact_type, business_line: form.business_line,
      source: crmNull(form.source), stage: form.stage,
      interest_level: form.interest_level || 'Unknown', outreach_status: crmNull(form.outreach_status),
      last_contact_date: form.last_contact_date || null, next_step: crmNull(form.next_step),
      next_step_date: form.next_step_date || null,
      disregarded_on: disregarded ? ((contact && contact.disregarded_on) || crmToday()) : null,
    };
    let res;
    if (editing) res = await window._supabase.from('crm_contacts').update(payload).eq('id', contact.id).select().single();
    else res = await window._supabase.from('crm_contacts').insert(payload).select().single();
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    onSaved(res.data, !editing);
    onClose();
  };

  const addInt = (payload, reset) => {
    setBusyInt(true);
    onAddInteraction(contact.id, payload, (ok) => { setBusyInt(false); if (ok) reset(); });
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn primary" disabled={saving || !form.full_name.trim()} onClick={save}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create contact'}</button>
    </div>
  );

  return (
    <CrmSlideOver title={editing ? (contact.full_name || 'Contact') : 'New contact'}
      subtitle={editing ? [contact.role, contact.company].filter(Boolean).join(' · ') : 'Add a contact to the CRM'}
      onClose={onClose} footer={footer} width={520}>
      {editing && (
        <div className="crm-tabs">
          <button className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>Edit</button>
          <button className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>Log <span className="crm-tab-count">{logRows.length}</span></button>
        </div>
      )}

      {tab === 'edit' && (
        <div className="stack" style={{ gap: 12 }}>
          {crmField('Full name *', <input className="input" value={form.full_name} onChange={set('full_name')} autoFocus />)}
          <div className="crm-grid2">
            {crmField('Role', <input className="input" value={form.role} onChange={set('role')} placeholder="e.g. Head of Talent" />)}
            {crmField('Company', <input className="input" value={form.company} onChange={set('company')} />)}
          </div>
          <div className="crm-grid2">
            {crmField('Email', <input className="input" type="email" value={form.email} onChange={set('email')} />)}
            {crmField('LinkedIn URL', <input className="input" value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" />)}
          </div>
          <div className="crm-grid2">
            {crmField('Contact type *', <select className="input" style={{ fontSize: 13 }} value={form.contact_type} onChange={set('contact_type')}>{CRM_CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
            {crmField('Business line *', <select className="input" style={{ fontSize: 13 }} value={form.business_line} onChange={set('business_line')}>{CRM_BUSINESS_LINES.map((t) => <option key={t}>{t}</option>)}</select>)}
          </div>
          <div className="crm-grid2">
            {crmField('Stage *', <select className="input" style={{ fontSize: 13 }} value={form.stage} onChange={set('stage')}>{CRM_ALL_STAGES.map((t) => <option key={t}>{t}</option>)}</select>)}
            {crmField('Interest level', <select className="input" style={{ fontSize: 13 }} value={form.interest_level} onChange={set('interest_level')}>{CRM_INTEREST_LEVELS.map((t) => <option key={t}>{t}</option>)}</select>)}
          </div>
          <div className="crm-grid2">
            {crmField('Source', <input className="input" value={form.source} onChange={set('source')} placeholder="e.g. LinkedIn, Referral" />)}
            {crmField('Outreach status', <input className="input" value={form.outreach_status} onChange={set('outreach_status')} />)}
          </div>
          <div className="crm-grid2">
            {crmField('Last contact', <input className="input" type="date" value={form.last_contact_date} onChange={set('last_contact_date')} />)}
            {crmField('Next step date', <input className="input" type="date" value={form.next_step_date} onChange={set('next_step_date')} />)}
          </div>
          {crmField('Next step', <input className="input" value={form.next_step} onChange={set('next_step')} placeholder="e.g. Send proposal" />)}

          <label className="crm-disregard">
            <input type="checkbox" checked={disregarded} onChange={(e) => setDisregarded(e.target.checked)} />
            <span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Disregarded</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>Hidden from the table (unless shown) and the pipeline board.</span>
            </span>
          </label>

          {err && <div className="crm-err">{err}</div>}
        </div>
      )}

      {tab === 'log' && editing && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="card flat" style={{ padding: 14, border: '1px solid var(--border)' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Log an interaction</div>
            <CrmInteractionForm busy={busyInt} onSubmit={addInt} />
          </div>
          {logRows.length === 0
            ? <div style={{ padding: '14px 2px', fontSize: 13, color: 'var(--text-3)' }}>No interactions logged yet.</div>
            : <div className="crm-log-list">{logRows.map((i) => <CrmLogItem key={i.id} item={i} />)}</div>}
        </div>
      )}
    </CrmSlideOver>
  );
}

function CrmLogItem({ item }) {
  return (
    <div className="crm-log-item">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className="chip" style={{ fontSize: 10 }}>{item.type || 'Note'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{crmFmtDate(item.interaction_date)}</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{item.note}</div>
    </div>
  );
}

// ── Add-interaction slide-over (Interactions view) ────────────
function CrmAddInteractionPanel({ contacts, defaultContactId, onClose, onSaved }) {
  const [contactId, setContactId] = useState(defaultContactId || '');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term ? contacts.filter((c) => (c.full_name || '').toLowerCase().includes(term) || (c.company || '').toLowerCase().includes(term)) : contacts;
    return base.slice(0, 50);
  }, [q, contacts]);
  const chosen = contacts.find((c) => c.id === contactId);

  const submit = (payload, reset) => {
    if (!contactId) return;
    setBusy(true);
    onSaved(contactId, payload, (ok) => { setBusy(false); if (ok) onClose(); });
  };

  return (
    <CrmSlideOver title="Log interaction" subtitle="Add an interaction for any contact" onClose={onClose} width={480}>
      <div className="stack" style={{ gap: 12 }}>
        {crmField('Contact', chosen
          ? <div className="crm-chosen"><span><strong>{chosen.full_name}</strong>{chosen.company ? ' · ' + chosen.company : ''}</span><button className="btn ghost sm" onClick={() => setContactId('')}>Change</button></div>
          : <div className="crm-picker">
              <input className="input" placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, fontSize: 13 }} autoFocus />
              <div className="crm-picker-list">
                {matches.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-3)' }}>No contacts found.</div>}
                {matches.map((c) => (
                  <button key={c.id} className="crm-picker-item" onClick={() => { setContactId(c.id); setQ(''); }}>
                    <span style={{ fontWeight: 600 }}>{c.full_name}</span>
                    {c.company && <span style={{ color: 'var(--text-3)' }}> · {c.company}</span>}
                  </button>
                ))}
              </div>
            </div>)}
        {chosen && <CrmInteractionForm busy={busy} onSubmit={submit} />}
        {!chosen && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Pick a contact to log an interaction.</div>}
      </div>
    </CrmSlideOver>
  );
}

// ── All Contacts view ─────────────────────────────────────────
function CrmContactsView({ contacts, onEdit, onLog, onAdd }) {
  const [search, setSearch] = useState('');
  const [line, setLine] = useState('All');
  const [type, setType] = useState('All');
  const [stage, setStage] = useState('All');
  const [showDisregarded, setShowDisregarded] = useState(false);
  const [limit, setLimit] = useState(250);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!showDisregarded && c.disregarded_on) return false;
      if (line !== 'All' && c.business_line !== line) return false;
      if (type !== 'All' && c.contact_type !== type) return false;
      if (stage !== 'All' && c.stage !== stage) return false;
      if (term) {
        const hay = (c.full_name || '') + ' ' + (c.company || '') + ' ' + (c.linkedin_url || '');
        if (!hay.toLowerCase().includes(term)) return false;
      }
      return true;
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [contacts, search, line, type, stage, showDisregarded]);

  useEffect(() => { setLimit(250); }, [search, line, type, stage, showDisregarded]);
  const shown = filtered.slice(0, limit);

  const selStyle = { fontSize: 13, minWidth: 130 };
  return (
    <div>
      <div className="crm-filters">
        <div className="crm-search">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-3)' }}>search</span>
          <input placeholder="Search name, company, LinkedIn…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={selStyle} value={line} onChange={(e) => setLine(e.target.value)}>
          <option value="All">All business lines</option>{CRM_BUSINESS_LINES.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select className="input" style={selStyle} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">All types</option>{CRM_CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="input" style={selStyle} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="All">All stages</option>{CRM_ALL_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="crm-toggle">
          <input type="checkbox" checked={showDisregarded} onChange={(e) => setShowDisregarded(e.target.checked)} />
          <span>Show disregarded</span>
        </label>
        <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={onAdd}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>add</span> Add contact
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 2px 10px' }}>
        {filtered.length.toLocaleString()} contact{filtered.length === 1 ? '' : 's'}{filtered.length !== contacts.length ? ` of ${contacts.length.toLocaleString()}` : ''}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="m-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)' }}>
                {['Name', 'Role', 'Company', 'Type', 'Business line', 'Stage', 'Last contact', 'Next step', ''].map((h) =>
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)', whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }} className="crm-row">
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                    <span style={c.disregarded_on ? { textDecoration: 'line-through', color: 'var(--text-3)' } : null}>{c.full_name || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{c.role || '—'}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-2)' }}>{c.company || '—'}</td>
                  <td style={{ padding: '11px 16px' }}><CrmTypePill type={c.contact_type} /></td>
                  <td style={{ padding: '11px 16px' }}><CrmLinePill line={c.business_line} /></td>
                  <td style={{ padding: '11px 16px' }}><CrmStagePill stage={c.stage} /></td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{crmFmtDate(c.last_contact_date)}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{crmFmtDate(c.next_step_date)}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn ghost sm" title="Interaction log" onClick={() => onLog(c)}><span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>forum</span></button>
                      <button className="btn ghost sm" title="Edit" onClick={() => onEdit(c)}><span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>edit</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No contacts match these filters.</div>}
        {filtered.length > limit && (
          <div style={{ padding: '14px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={() => setLimit((l) => l + 250)}>Load more ({(filtered.length - limit).toLocaleString()} remaining)</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pipeline (Kanban) view ────────────────────────────────────
function CrmPipelineView({ contacts, onEdit }) {
  const [line, setLine] = useState('All');
  const CARD_CAP = 60;

  const byStage = useMemo(() => {
    const map = {}; CRM_PIPELINE_STAGES.forEach((s) => map[s] = []);
    contacts.forEach((c) => {
      if (c.disregarded_on) return;
      if (line !== 'All' && c.business_line !== line) return;
      if (map[c.stage]) map[c.stage].push(c);
    });
    return map;
  }, [contacts, line]);

  return (
    <div>
      <div className="crm-chiprow">
        {['All', ...CRM_BUSINESS_LINES].map((l) => (
          <button key={l} className={'crm-segchip' + (line === l ? ' on' : '')} onClick={() => setLine(l)}>{l === 'All' ? 'All lines' : l}</button>
        ))}
      </div>
      <div className="crm-kanban">
        {CRM_PIPELINE_STAGES.map((s) => {
          const cards = byStage[s] || [];
          return (
            <div key={s} className="crm-kcol">
              <div className="crm-kcol-head">
                <span className={'crm-kdot ' + (CRM_STAGE_CLASS[s] || 'gray')} />
                <span className="crm-kcol-title">{s}</span>
                <span className="crm-kcol-count">{cards.length}</span>
              </div>
              <div className="crm-kcards">
                {cards.slice(0, CARD_CAP).map((c) => (
                  <button key={c.id} className="crm-kcard" onClick={() => onEdit(c)}>
                    <div className="crm-kcard-name">{c.full_name || '—'}</div>
                    {(c.company || c.role) && <div className="crm-kcard-sub">{[c.role, c.company].filter(Boolean).join(' · ')}</div>}
                    <div className="crm-kcard-foot">
                      <CrmLinePill line={c.business_line} />
                      {c.next_step_date && <span className="crm-kcard-date"><span className="material-symbols-outlined" style={{ fontSize: 11, lineHeight: 1 }}>event</span>{crmFmtDate(c.next_step_date)}</span>}
                    </div>
                  </button>
                ))}
                {cards.length > CARD_CAP && <div className="crm-kmore">+{cards.length - CARD_CAP} more</div>}
                {cards.length === 0 && <div className="crm-kempty">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Interactions view ─────────────────────────────────────────
function CrmInteractionsView({ interactions, contactMap, onOpenContact, onAdd }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(60);

  const feed = useMemo(() => {
    const term = search.trim().toLowerCase();
    return interactions.slice().sort((a, b) =>
      (b.interaction_date || '').localeCompare(a.interaction_date || '') || (b.created_at || '').localeCompare(a.created_at || ''))
      .filter((i) => {
        if (!term) return true;
        const name = (contactMap[i.contact_id] && contactMap[i.contact_id].full_name) || '';
        return (i.note || '').toLowerCase().includes(term) || name.toLowerCase().includes(term);
      });
  }, [interactions, search, contactMap]);

  useEffect(() => { setLimit(60); }, [search]);
  const shown = feed.slice(0, limit);

  return (
    <div>
      <div className="crm-filters">
        <div className="crm-search">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-3)' }}>search</span>
          <input placeholder="Search by contact or note…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={onAdd}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>add</span> Add interaction
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 2px 10px' }}>{feed.length.toLocaleString()} interaction{feed.length === 1 ? '' : 's'}</div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {shown.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No interactions found.</div>}
        {shown.map((i) => {
          const c = contactMap[i.contact_id];
          return (
            <div key={i.id} className="crm-feed-row">
              <div className="crm-feed-date">{crmFmtDate(i.interaction_date)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  {c
                    ? <button className="crm-feed-link" onClick={() => onOpenContact(c)}>{c.full_name || 'Contact'}</button>
                    : <span style={{ fontWeight: 600, color: 'var(--text-3)' }}>Unknown contact</span>}
                  <span className="chip" style={{ fontSize: 10 }}>{i.type || 'Note'}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{i.note}</div>
              </div>
            </div>
          );
        })}
        {feed.length > limit && (
          <div style={{ padding: '14px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
            <button className="btn" onClick={() => setLimit((l) => l + 60)}>Load more ({(feed.length - limit).toLocaleString()} remaining)</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root screen ───────────────────────────────────────────────
function CRMScreen() {
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [view, setView] = useState('contacts');
  const [panel, setPanel] = useState(null);          // { mode:'edit'|'add', contact, tab }
  const [addInt, setAddInt] = useState(null);        // { defaultContactId }

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('');
      const [cs, is] = await Promise.all([
        window._supabase.from('crm_contacts').select('*'),
        window._supabase.from('crm_interactions').select('*'),
      ]);
      if (cs.error) setErr(cs.error.message);
      else setContacts(cs.data || []);
      if (!cs.error && is.error) setErr(is.error.message);
      else if (!is.error) setInteractions(is.data || []);
      setLoading(false);
    })();
  }, []);

  const contactMap = useMemo(() => {
    const m = {}; contacts.forEach((c) => { m[c.id] = c; }); return m;
  }, [contacts]);

  const onSavedContact = (row, isNew) => {
    setContacts((prev) => isNew ? [row, ...prev] : prev.map((c) => c.id === row.id ? row : c));
  };

  const addInteractionFor = async (contactId, payload, done) => {
    const { data, error } = await window._supabase.from('crm_interactions')
      .insert({ contact_id: contactId, ...payload }).select().single();
    if (error) { setErr(error.message); done && done(false); return; }
    setInteractions((prev) => [data, ...prev]);
    done && done(true);
  };

  const stats = useMemo(() => {
    const active = contacts.filter((c) => !c.disregarded_on);
    return { total: contacts.length, won: contacts.filter((c) => c.stage === 'Closed Won').length, active: active.length };
  }, [contacts]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · CRM</div>
          <h1 className="page-title">Contacts & pipeline.</h1>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right', lineHeight: 1.5 }}>
          <div><strong style={{ color: 'var(--text)' }}>{stats.total.toLocaleString()}</strong> contacts</div>
          <div><strong style={{ color: 'var(--text)' }}>{interactions.length.toLocaleString()}</strong> interactions · <strong style={{ color: 'var(--text)' }}>{stats.won}</strong> closed won</div>
        </div>
      </div>

      <div className="crm-viewtabs">
        {[['contacts', 'All Contacts', 'group'], ['pipeline', 'Pipeline', 'view_kanban'], ['interactions', 'Interactions', 'forum']].map(([k, label, icon]) => (
          <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {err && <div className="crm-err" style={{ marginBottom: 12 }}>{err}</div>}
      {loading && <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading CRM…</div>}

      {!loading && view === 'contacts' && (
        <CrmContactsView contacts={contacts}
          onAdd={() => setPanel({ mode: 'add', contact: null, tab: 'edit' })}
          onEdit={(c) => setPanel({ mode: 'edit', contact: c, tab: 'edit' })}
          onLog={(c) => setPanel({ mode: 'edit', contact: c, tab: 'log' })} />
      )}
      {!loading && view === 'pipeline' && (
        <CrmPipelineView contacts={contacts} onEdit={(c) => setPanel({ mode: 'edit', contact: c, tab: 'edit' })} />
      )}
      {!loading && view === 'interactions' && (
        <CrmInteractionsView interactions={interactions} contactMap={contactMap}
          onOpenContact={(c) => setPanel({ mode: 'edit', contact: c, tab: 'log' })}
          onAdd={() => setAddInt({ defaultContactId: '' })} />
      )}

      {panel && (
        <CrmContactPanel
          contact={panel.contact}
          interactions={interactions}
          initialTab={panel.tab}
          onClose={() => setPanel(null)}
          onSaved={onSavedContact}
          onAddInteraction={addInteractionFor} />
      )}
      {addInt && (
        <CrmAddInteractionPanel
          contacts={contacts}
          defaultContactId={addInt.defaultContactId}
          onClose={() => setAddInt(null)}
          onSaved={addInteractionFor} />
      )}
    </>
  );
}

Object.assign(window, { CRMScreen });
