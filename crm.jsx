// crm.jsx — Admin CRM (migrated from the standalone MEGA CRM).
// Admin-only route `admin-crm`. Reads/writes crm_contacts + crm_interactions
// (RLS is admin-only via is_admin()). Five views, ported from the original
// standalone CRM's seven screens:
//   Overview     = Today's Actions (daily driver) + a quick metric strip
//   Contacts     = full table w/ filters + Import action
//   Pipeline     = kanban board w/ a "Board · Hot" toggle (Hot Pipeline)
//   Analytics    = conversion funnel + rates + breakdowns + activity
//   Interactions = reverse-chron feed
// Edits happen in a right slide-over (Edit + Log tabs). All filtering is
// client-side over the full dataset loaded once on mount.

const { useState, useEffect, useMemo, useRef } = React;

// ── Domain constants (ported from the original data.js) ───────
const CRM_CONTACT_TYPES = ['Lead', 'Account', 'Affiliate'];
const CRM_BUSINESS_LINES = ['Management', 'Mentorship'];
const CRM_INTEREST_LEVELS = ['Unknown', 'Low', 'Medium', 'High'];
const CRM_INTERACTION_TYPES = ['Note', 'Call', 'Email', 'LinkedIn DM', 'Meeting', 'Other'];
const CRM_SOURCES = ['Apollo', 'Apify', 'LinkedIn', 'Referral', 'Manual', 'University'];

// Full stage order (top of funnel → terminal).
const CRM_STAGE_ORDER = ['Not Contacted', 'Scraped', 'LinkedIn Request Sent', 'LinkedIn Connected',
  'Contacted', 'Replied', 'Interested', 'Discovery Scheduled', 'Proposal Sent',
  'Closed Won', 'Closed Lost', 'Not Interested'];
// Kanban / funnel order (excludes terminal lost/not-interested).
const CRM_PIPELINE_STAGES = ['Not Contacted', 'Scraped', 'LinkedIn Request Sent', 'LinkedIn Connected',
  'Contacted', 'Replied', 'Interested', 'Discovery Scheduled', 'Proposal Sent', 'Closed Won'];
const CRM_ALL_STAGES = CRM_STAGE_ORDER;
const CRM_NOT_CONTACTED_STAGES = ['Not Contacted', 'Scraped', 'LinkedIn Request Sent'];
const CRM_OUTREACH_STEPS = ['Not Started', 'Initial Message Sent', 'Follow Up 1 Sent', 'Follow Up 2 Sent', 'Sequence Complete'];
const CRM_OUTREACH_SHORT = { 'Not Started': '—', 'Initial Message Sent': 'Initial', 'Follow Up 1 Sent': 'FU1', 'Follow Up 2 Sent': 'FU2', 'Sequence Complete': 'Done' };

// Stage → pill color class (defined in styles.css as .crm-pill.<x>).
const CRM_STAGE_CLASS = {
  'Scraped': 'gray', 'Not Contacted': 'gray', 'Closed Lost': 'gray',
  'LinkedIn Request Sent': 'blue-soft', 'LinkedIn Connected': 'teal',
  'Contacted': 'blue', 'Replied': 'teal', 'Interested': 'green',
  'Discovery Scheduled': 'green', 'Proposal Sent': 'amber',
  'Not Interested': 'red', 'Closed Won': 'cobalt',
};
const CRM_INTEREST_CLASS = { High: 'teal', Medium: 'blue', Low: 'gray', Unknown: 'gray' };

// ── Date / domain helpers ─────────────────────────────────────
const crmNull = (v) => { const t = (v == null ? '' : String(v)).trim(); return t === '' ? null : t; };
const crmToday = () => new Date().toISOString().slice(0, 10);
const crmTomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const crmAddDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const CRM_DISREGARD_SENTINEL = '9999-12-31';
const crmParse = (s) => (s ? new Date(s + 'T00:00:00') : null);
const crmDaysUntil = (s) => { const d = crmParse(s); return d ? Math.round((d - crmParse(crmToday())) / 86400000) : null; };
const crmDaysSince = (s) => { const d = crmParse(s); return d ? Math.round((crmParse(crmToday()) - d) / 86400000) : null; };

function crmFmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (String(d).length === 10 ? 'T12:00:00' : ''));
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function crmRelativeDue(s) {
  if (!s) return { label: 'No date', cls: 'future', sub: '' };
  const n = crmDaysUntil(s);
  if (n < 0) return { label: `${Math.abs(n)}d overdue`, cls: 'over', sub: crmFmtDate(s) };
  if (n === 0) return { label: 'Today', cls: 'today', sub: crmFmtDate(s) };
  if (n === 1) return { label: 'Tomorrow', cls: 'future', sub: crmFmtDate(s) };
  return { label: `In ${n}d`, cls: 'future', sub: crmFmtDate(s) };
}
const crmStageRank = (s) => { const i = CRM_STAGE_ORDER.indexOf(s); return i < 0 ? 99 : i; };
const crmIsOverdue = (c) => c.next_step_date && crmDaysUntil(c.next_step_date) < 0;
const crmIsContacted = (c) => !CRM_NOT_CONTACTED_STAGES.includes(c.stage);
const crmIsReplied = (c) => ['Replied', 'Interested', 'Discovery Scheduled', 'Proposal Sent', 'Closed Won'].includes(c.stage);
const crmIsHot = (c) => c.interest_level === 'High' || ['Interested', 'Discovery Scheduled', 'Proposal Sent'].includes(c.stage);
const crmIsDisregarded = (c) => !!c.disregarded_on && c.disregarded_on >= '2900-01-01'; // indefinite sentinel only
function crmSequenceDue(c) {
  if (!c.last_contact_date) return false;
  const since = crmDaysSince(c.last_contact_date);
  return (c.outreach_status === 'Initial Message Sent' && since >= 2) || (c.outreach_status === 'Follow Up 1 Sent' && since >= 2);
}
function crmSequenceStepTag(c) {
  if (c.outreach_status === 'Initial Message Sent') return 'Initial';
  if (c.outreach_status === 'Follow Up 1 Sent') return 'FU1';
  if (c.outreach_status === 'Follow Up 2 Sent') return 'FU2';
  return null;
}
function crmNeedsAttention(c) {
  if (c.stage === 'Not Interested' || c.stage === 'Closed Lost') return false;
  if (c.disregarded_on && c.disregarded_on >= crmToday()) return false; // snoozed (incl. indefinite sentinel)
  const dueByDate = c.next_step_date && crmDaysUntil(c.next_step_date) <= 0;
  const awaitingInitial = c.stage === 'LinkedIn Connected' && (!c.outreach_status || c.outreach_status === 'Not Started');
  return dueByDate || crmSequenceDue(c) || awaitingInitial;
}

// Mark-done sequence maps (ported).
const CRM_SEQ_DONE_OPTS = ['Initial Message Sent', 'Follow Up 1 Sent', 'Follow Up 2 Sent'];
const CRM_NEXT_STEP_OPTS = ['Send Follow Up 1', 'Send Follow Up 2', 'Await reply'];
const CRM_DEFAULT_DONE = { '': 'Initial Message Sent', 'Not Started': 'Initial Message Sent', 'Initial Message Sent': 'Follow Up 1 Sent', 'Follow Up 1 Sent': 'Follow Up 2 Sent', 'Follow Up 2 Sent': 'Follow Up 2 Sent', 'Sequence Complete': 'Follow Up 2 Sent' };
const CRM_NEXT_FOR_DONE = { 'Initial Message Sent': 'Send Follow Up 1', 'Follow Up 1 Sent': 'Send Follow Up 2', 'Follow Up 2 Sent': 'Await reply' };
const CRM_NOTE_FOR_DONE = { 'Initial Message Sent': 'Sent initial LinkedIn message', 'Follow Up 1 Sent': 'Sent follow-up 1 LinkedIn message', 'Follow Up 2 Sent': 'Sent follow-up 2 LinkedIn message' };

// ── Pills ─────────────────────────────────────────────────────
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
function CrmInterestPill({ level }) {
  return <span className={'crm-pill ' + (CRM_INTEREST_CLASS[level] || 'gray')}>{level || 'Unknown'}</span>;
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
  const blank = { full_name: '', role: '', company: '', email: '', linkedin_url: '', contact_type: 'Lead', business_line: 'Management', source: '', stage: 'Scraped', interest_level: 'Unknown', outreach_status: '', last_contact_date: '', next_step: '', next_step_date: '' };
  const init = editing ? {
    full_name: contact.full_name || '', role: contact.role || '', company: contact.company || '',
    email: contact.email || '', linkedin_url: contact.linkedin_url || '',
    contact_type: contact.contact_type || 'Lead', business_line: contact.business_line || 'Management',
    source: contact.source || '', stage: contact.stage || 'Scraped',
    interest_level: contact.interest_level || 'Unknown', outreach_status: contact.outreach_status || '',
    last_contact_date: contact.last_contact_date || '', next_step: contact.next_step || '', next_step_date: contact.next_step_date || '',
  } : blank;
  const [form, setForm] = useState(init);
  const [disregarded, setDisregarded] = useState(crmIsDisregarded(contact || {}));
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
      disregarded_on: disregarded ? ((contact && crmIsDisregarded(contact) && contact.disregarded_on) || CRM_DISREGARD_SENTINEL) : null,
    };
    let res;
    if (editing) res = await window._supabase.from('crm_contacts').update(payload).eq('id', contact.id).select().single();
    else res = await window._supabase.from('crm_contacts').insert(payload).select().single();
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    onSaved(res.data, !editing);
    onClose();
  };

  const addInt = (payload, reset) => { setBusyInt(true); onAddInteraction(contact.id, payload, (ok) => { setBusyInt(false); if (ok) reset(); }); };

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
            {crmField('Outreach status', <select className="input" style={{ fontSize: 13 }} value={form.outreach_status} onChange={set('outreach_status')}><option value="">—</option>{CRM_OUTREACH_STEPS.map((t) => <option key={t}>{t}</option>)}</select>)}
            {crmField('Source', <input className="input" value={form.source} onChange={set('source')} placeholder="e.g. LinkedIn, Referral" />)}
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
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>Hidden from the table (unless shown), the pipeline board, and Today's Actions.</span>
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

  const submit = (payload) => { if (!contactId) return; setBusy(true); onSaved(contactId, payload, (ok) => { setBusy(false); if (ok) onClose(); }); };

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

// ── Import slide-over (paste JSON / upload CSV / add manually) ─
const CRM_SAMPLE_JSON = JSON.stringify([
  { fullName: 'Aisha Rahman', headline: 'Head of People at Noon', companyName: 'Noon', profileUrl: 'https://linkedin.com/in/aisharahman' },
  { fullName: 'David Chen', headline: 'L&D Lead at Careem', companyName: 'Careem', profileUrl: 'https://linkedin.com/in/davidchen' },
], null, 2);

function crmParseJson(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { error: 'Invalid JSON. Check the syntax and try again.' }; }
  if (!Array.isArray(data)) data = [data];
  const recs = data.map((d) => {
    const name = d.fullName || d.full_name || d.name || '';
    let role = d.role || d.headline || d.title || '';
    const company = d.companyName || d.company || '';
    if (role.includes(' at ')) role = role.split(' at ')[0];
    return { full_name: name, role: (role || '').trim(), company, linkedin_url: d.profileUrl || d.linkedin_url || d.url || '', business_line: 'Management', contact_type: 'Lead', source: 'Apollo' };
  }).filter((r) => r.full_name);
  return { recs };
}
function crmParseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const get = (names) => { for (const nm of names) { const i = headers.indexOf(nm); if (i >= 0) return (cells[i] || '').trim(); } return ''; };
    return { full_name: get(['name', 'full_name', 'fullname']), role: get(['role', 'title', 'headline']), company: get(['company', 'companyname']), linkedin_url: get(['linkedin', 'url', 'profileurl', 'linkedin_url']), email: get(['email']), business_line: 'Management', contact_type: 'Lead', source: 'LinkedIn' };
  }).filter((r) => r.full_name);
}
function crmMakeContact(r) {
  return {
    full_name: r.full_name, role: r.role || null, company: r.company || null,
    linkedin_url: r.linkedin_url || null, email: r.email || null,
    contact_type: r.contact_type || 'Lead', business_line: r.business_line || 'Management',
    source: r.source || 'Manual', stage: r.stage || 'Scraped', interest_level: r.interest_level || 'Unknown',
    outreach_status: r.contact_type === 'Account' ? null : 'Not Started',
    next_step: r.next_step || 'Send initial message', next_step_date: r.next_step_date || crmTomorrow(),
  };
}

function CrmImportPanel({ contacts, onClose, onImported }) {
  const [tab, setTab] = useState('paste');
  const [json, setJson] = useState(CRM_SAMPLE_JSON);
  const [preview, setPreview] = useState(null);   // [{...rec, dup}]
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  // manual form
  const [m, setM] = useState({ full_name: '', role: '', company: '', email: '', linkedin_url: '', business_line: 'Management', contact_type: 'Lead', source: 'Manual', interest_level: 'Unknown' });
  const setMf = (k) => (e) => setM((s) => ({ ...s, [k]: e.target.value }));

  const isDup = (r) => contacts.find((c) =>
    (r.linkedin_url && c.linkedin_url === r.linkedin_url) ||
    (r.email && c.email && c.email.toLowerCase() === r.email.toLowerCase()) ||
    ((c.full_name || '').toLowerCase() === (r.full_name || '').toLowerCase() && (c.company || '').toLowerCase() === (r.company || '').toLowerCase()));

  const buildPreview = (recs) => {
    if (!recs || !recs.length) { setErr('No valid contact records found.'); setPreview(null); return; }
    setErr('');
    setPreview(recs.map((r) => ({ ...r, dup: !!isDup(r) })));
  };
  const doParseJson = () => { const res = crmParseJson(json); if (res.error) { setErr(res.error); setPreview(null); return; } buildPreview(res.recs); };
  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const recs = file.name.endsWith('.csv') ? crmParseCsv(reader.result) : (crmParseJson(reader.result).recs || []);
      if (!recs.length) { setErr('Could not parse any records from ' + file.name + '.'); setPreview(null); return; }
      buildPreview(recs);
    };
    reader.readAsText(file);
  };
  const setPrevField = (i, k, v) => setPreview((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const commit = async (recs) => {
    const toAdd = recs.filter((r) => !r.dup).map(crmMakeContact);
    if (!toAdd.length) { setErr('Nothing to import — all rows are duplicates.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await window._supabase.from('crm_contacts').insert(toAdd).select();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onImported(data || []);
    onClose();
  };

  const addManual = async () => {
    if (!m.full_name.trim()) { setErr('A full name is required.'); return; }
    if (isDup(m)) { setErr(m.full_name + ' already exists in your database.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await window._supabase.from('crm_contacts').insert(crmMakeContact(m)).select().single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onImported([data]);
    setM((s) => ({ ...s, full_name: '', role: '', company: '', email: '', linkedin_url: '' }));
  };

  const importable = preview ? preview.filter((r) => !r.dup).length : 0;
  const dupN = preview ? preview.filter((r) => r.dup).length : 0;

  return (
    <CrmSlideOver title="Import contacts" subtitle="Bring in scraped or exported lead lists" onClose={onClose} width={680}>
      <div className="crm-tabs">
        {[['paste', 'Paste JSON'], ['upload', 'Upload file'], ['manual', 'Add manually']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setErr(''); }}>{l}</button>
        ))}
      </div>

      {tab === 'paste' && (
        <div className="stack" style={{ gap: 10 }}>
          {crmField('Apify LinkedIn scraper output (JSON array)',
            <textarea className="input" rows={8} value={json} onChange={(e) => setJson(e.target.value)} style={{ resize: 'vertical', fontFamily: 'var(--ff-mono)', fontSize: 12, lineHeight: 1.5 }} />)}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary sm" onClick={doParseJson}>Parse &amp; preview</button>
            <button className="btn sm" onClick={() => { setJson(''); setPreview(null); }}>Clear</button>
          </div>
        </div>
      )}
      {tab === 'upload' && (
        <div className="crm-dropzone" onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--text-3)' }}>upload_file</span>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Drag &amp; drop a .json or .csv file</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>or click to browse — Apify exports and CSV lead lists supported</div>
          <input ref={fileRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files && e.target.files[0])} />
        </div>
      )}
      {tab === 'manual' && (
        <div className="stack" style={{ gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Only a name is required; everything else can be filled in later.</div>
          {crmField('Full name *', <input className="input" value={m.full_name} onChange={setMf('full_name')} placeholder="e.g. Aisha Rahman" autoFocus />)}
          <div className="crm-grid2">
            {crmField('Role / title', <input className="input" value={m.role} onChange={setMf('role')} />)}
            {crmField('Company', <input className="input" value={m.company} onChange={setMf('company')} />)}
          </div>
          <div className="crm-grid2">
            {crmField('Email', <input className="input" type="email" value={m.email} onChange={setMf('email')} />)}
            {crmField('LinkedIn URL', <input className="input" value={m.linkedin_url} onChange={setMf('linkedin_url')} />)}
          </div>
          <div className="crm-grid2">
            {crmField('Business line', <select className="input" style={{ fontSize: 13 }} value={m.business_line} onChange={setMf('business_line')}>{CRM_BUSINESS_LINES.map((t) => <option key={t}>{t}</option>)}</select>)}
            {crmField('Contact type', <select className="input" style={{ fontSize: 13 }} value={m.contact_type} onChange={setMf('contact_type')}>{CRM_CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
          </div>
          <div className="crm-grid2">
            {crmField('Source', <select className="input" style={{ fontSize: 13 }} value={m.source} onChange={setMf('source')}>{CRM_SOURCES.map((t) => <option key={t}>{t}</option>)}</select>)}
            {crmField('Interest level', <select className="input" style={{ fontSize: 13 }} value={m.interest_level} onChange={setMf('interest_level')}>{CRM_INTEREST_LEVELS.map((t) => <option key={t}>{t}</option>)}</select>)}
          </div>
          <div><button className="btn primary" disabled={busy || !m.full_name.trim()} onClick={addManual}>{busy ? 'Adding…' : 'Add lead'}</button></div>
        </div>
      )}

      {err && <div className="crm-err" style={{ marginTop: 12 }}>{err}</div>}

      {preview && tab !== 'manual' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="eyebrow">Preview — {preview.length} record{preview.length !== 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{importable} ready to import</div>
          </div>
          {dupN > 0 && <div className="crm-err" style={{ marginBottom: 8 }}>{dupN} record{dupN !== 1 ? 's' : ''} already exist and will be skipped.</div>}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ maxHeight: 280, overflow: 'auto' }}>
              <table className="m-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: 'var(--bg-sunken)' }}>{['Name', 'Role', 'Company', 'Line', 'Type'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)', opacity: r.dup ? 0.5 : 1 }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.full_name} {r.dup && <span className="crm-pill amber" style={{ marginLeft: 4 }}>Duplicate</span>}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{r.role || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{r.company || '—'}</td>
                      <td style={{ padding: '8px 12px' }}><select className="input" style={{ fontSize: 12, padding: '4px 8px' }} value={r.business_line} disabled={r.dup} onChange={(e) => setPrevField(i, 'business_line', e.target.value)}>{CRM_BUSINESS_LINES.map((l) => <option key={l}>{l}</option>)}</select></td>
                      <td style={{ padding: '8px 12px' }}><select className="input" style={{ fontSize: 12, padding: '4px 8px' }} value={r.contact_type} disabled={r.dup} onChange={(e) => setPrevField(i, 'contact_type', e.target.value)}>{CRM_CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn primary" disabled={busy || !importable} onClick={() => commit(preview)}>{busy ? 'Importing…' : `Import ${importable} contact${importable !== 1 ? 's' : ''}`}</button>
          </div>
        </div>
      )}
    </CrmSlideOver>
  );
}

// ── Metric strip (Overview) ───────────────────────────────────
function CrmMetrics({ contacts, onPick }) {
  const m = useMemo(() => {
    const total = contacts.length;
    const contacted = contacts.filter(crmIsContacted).length;
    const replied = contacts.filter(crmIsReplied).length;
    const overdue = contacts.filter(crmIsOverdue).length;
    return { total, contacted, replied, overdue };
  }, [contacts]);
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const cards = [
    { key: null, label: 'Total contacts', value: m.total, foot: 'Across both pipelines' },
    { key: 'contacted', label: 'Contacted', value: m.contacted, foot: pct(m.contacted, m.total) + '% of database' },
    { key: 'replied', label: 'Replies received', value: m.replied, foot: pct(m.replied, Math.max(m.contacted, 1)) + '% reply rate' },
    { key: 'overdue', label: 'Overdue follow-ups', value: m.overdue, foot: 'Needs action now', danger: true },
  ];
  return (
    <div className="crm-metrics">
      {cards.map((c) => (
        <button key={c.label} className={'crm-metric' + (c.danger ? ' danger' : '') + (c.key ? ' clickable' : '')} onClick={() => c.key && onPick(c.key)} disabled={!c.key}>
          <div className="crm-metric-label">{c.label}</div>
          <div className="crm-metric-value">{c.value.toLocaleString()}</div>
          <div className="crm-metric-foot">{c.foot}</div>
        </button>
      ))}
    </div>
  );
}

// ── Today's Actions row ───────────────────────────────────────
function CrmActionItem({ c, onMarkDone, onDefer, onDisregard }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const defaultDone = CRM_DEFAULT_DONE[c.outreach_status || ''] || 'Initial Message Sent';
  const [completed, setCompleted] = useState(defaultDone);
  const [nextStep, setNextStep] = useState(CRM_NEXT_FOR_DONE[defaultDone] || 'Await reply');
  const [date, setDate] = useState(crmAddDays(2));
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const r = crmRelativeDue(c.next_step_date);
  const seqTag = crmSequenceStepTag(c);
  const stepLabel = c.stage === 'LinkedIn Connected' ? 'Send initial message'
    : (c.next_step || (crmSequenceDue(c) ? (c.outreach_status === 'Initial Message Sent' ? 'Send follow-up 1' : 'Send follow-up 2') : 'Follow up'));

  const onCompletedChange = (v) => { setCompleted(v); if (CRM_NEXT_FOR_DONE[v]) setNextStep(CRM_NEXT_FOR_DONE[v]); };
  const save = () => { setBusy(true); onMarkDone(c, { completed, nextStep, nextStepDate: date, context: context.trim() }, () => setBusy(false)); };

  return (
    <div className={'crm-action' + (crmIsOverdue(c) ? ' over' : '')}>
      <div className="crm-action-main">
        <div className="crm-action-body">
          <div className="crm-action-name">{c.full_name}{seqTag && <span className="crm-seqtag">{seqTag}</span>}</div>
          <div className="crm-action-co">{[c.role, c.company].filter(Boolean).join(' · ') || '—'}</div>
          <div className="crm-action-step"><span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>arrow_forward</span>{stepLabel}</div>
        </div>
        <div className="crm-action-due">
          <div className={'crm-due-label ' + r.cls}>{r.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.sub}</div>
        </div>
        <div className="crm-action-btns">
          <button className="btn sm" onClick={() => setOpen((o) => !o)}><span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>check</span> Mark done</button>
          <button className="btn ghost sm" title="Move to tomorrow" onClick={() => onDefer(c)}>Tomorrow</button>
          <button className={'btn ghost sm' + (armed ? ' crm-armed' : '')} title="Hide from Today's Actions"
            onClick={() => { if (armed) { onDisregard(c); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}>{armed ? 'Sure?' : 'Disregard'}</button>
        </div>
      </div>
      {open && (
        <div className="crm-md">
          <div className="crm-md-grid">
            {crmField('Outreach stage completed', <select className="input" style={{ fontSize: 13 }} value={completed} onChange={(e) => onCompletedChange(e.target.value)}>{CRM_SEQ_DONE_OPTS.map((o) => <option key={o}>{o}</option>)}</select>)}
            {crmField('Next step', <select className="input" style={{ fontSize: 13 }} value={nextStep} onChange={(e) => setNextStep(e.target.value)}>{CRM_NEXT_STEP_OPTS.map((o) => <option key={o}>{o}</option>)}</select>)}
            {crmField('Next step due', <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />)}
          </div>
          {crmField('Context (optional)', <input className="input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Anything to remember for the next message?" />)}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <button className="btn sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn primary sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save & log'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overview (metrics + Today's Actions) ──────────────────────
function CrmOverview({ contacts, onMetric, onMarkDone, onDefer, onDisregard }) {
  const [line, setLine] = useState('all');
  const all = useMemo(() => contacts.filter(crmNeedsAttention), [contacts]);
  const mgmtN = useMemo(() => all.filter((c) => c.business_line === 'Management').length, [all]);
  const mentN = useMemo(() => all.filter((c) => c.business_line === 'Mentorship').length, [all]);
  const items = useMemo(() => {
    let l = line === 'all' ? all : all.filter((c) => c.business_line === line);
    return l.slice().sort((a, b) => {
      const va = a.next_step_date == null ? 9999 : crmDaysUntil(a.next_step_date);
      const vb = b.next_step_date == null ? 9999 : crmDaysUntil(b.next_step_date);
      return va - vb;
    });
  }, [all, line]);
  const overdueN = items.filter(crmIsOverdue).length;
  const seg = [{ key: 'all', label: 'Both pipelines', n: all.length }, { key: 'Management', label: 'Management', n: mgmtN }, { key: 'Mentorship', label: 'Mentorship', n: mentN }];

  return (
    <div>
      <CrmMetrics contacts={contacts} onPick={onMetric} />
      <div className="crm-section-head">
        <h2 className="crm-h2">Today's Actions</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {items.length > 0 && <>
            <span className="crm-pill red">{overdueN} overdue</span>
            <span className="crm-pill blue">{items.length - overdueN} due / soon</span>
          </>}
        </div>
      </div>
      <div className="crm-chiprow">
        {seg.map((s) => <button key={s.key} className={'crm-segchip' + (line === s.key ? ' on' : '')} onClick={() => setLine(s.key)}>{s.label} <span className="crm-seg-n">{s.n}</span></button>)}
      </div>
      {items.length === 0
        ? <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--teal-600)' }}>task_alt</span>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, marginTop: 8 }}>All clear</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>No actions due right now. Nicely handled.</div>
          </div>
        : <div className="crm-action-list">{items.map((c) => <CrmActionItem key={c.id} c={c} onMarkDone={onMarkDone} onDefer={onDefer} onDisregard={onDisregard} />)}</div>}
    </div>
  );
}

// ── All Contacts view ─────────────────────────────────────────
const CRM_PRESETS = {
  contacted: { label: 'Contacted', pred: crmIsContacted },
  replied: { label: 'Replies received', pred: crmIsReplied },
  overdue: { label: 'Overdue', pred: crmIsOverdue },
  hot: { label: 'Hot leads', pred: crmIsHot },
  outreach_initial: { label: 'Outreach: Initial Message Sent', pred: (c) => c.outreach_status === 'Initial Message Sent' },
  outreach_fu1: { label: 'Outreach: Follow Up 1 Sent', pred: (c) => c.outreach_status === 'Follow Up 1 Sent' },
  outreach_fu2: { label: 'Outreach: Follow Up 2 Sent', pred: (c) => c.outreach_status === 'Follow Up 2 Sent' },
};

function CrmContactsView({ contacts, preset, onClearPreset, onEdit, onLog, onAdd, onImport }) {
  const [search, setSearch] = useState('');
  const [line, setLine] = useState('All');
  const [type, setType] = useState('All');
  const [stage, setStage] = useState('All');
  const [showDisregarded, setShowDisregarded] = useState(false);
  const [limit, setLimit] = useState(250);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const presetPred = preset && CRM_PRESETS[preset] ? CRM_PRESETS[preset].pred : null;
    return contacts.filter((c) => {
      if (!showDisregarded && crmIsDisregarded(c)) return false;
      if (presetPred && !presetPred(c)) return false;
      if (line !== 'All' && c.business_line !== line) return false;
      if (type !== 'All' && c.contact_type !== type) return false;
      if (stage !== 'All' && c.stage !== stage) return false;
      if (term) {
        const hay = (c.full_name || '') + ' ' + (c.company || '') + ' ' + (c.linkedin_url || '');
        if (!hay.toLowerCase().includes(term)) return false;
      }
      return true;
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [contacts, search, line, type, stage, showDisregarded, preset]);

  useEffect(() => { setLimit(250); }, [search, line, type, stage, showDisregarded, preset]);
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onImport}><span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>upload</span> Import</button>
          <button className="btn primary" onClick={onAdd}><span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>add</span> Add contact</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 2px 10px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {filtered.length.toLocaleString()} contact{filtered.length === 1 ? '' : 's'}{filtered.length !== contacts.length ? ` of ${contacts.length.toLocaleString()}` : ''}
        </span>
        {preset && CRM_PRESETS[preset] && (
          <button className="crm-active-chip" onClick={onClearPreset}>{CRM_PRESETS[preset].label} <span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>close</span></button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="m-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 920 }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)' }}>
                {['Name', 'Role', 'Company', 'Type', 'Business line', 'Stage', 'Outreach', 'Last contact', 'Next step', ''].map((h) =>
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)', whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }} className="crm-row">
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                    <span style={crmIsDisregarded(c) ? { textDecoration: 'line-through', color: 'var(--text-3)' } : null}>{c.full_name || '—'}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{c.role || '—'}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-2)' }}>{c.company || '—'}</td>
                  <td style={{ padding: '11px 16px' }}><CrmTypePill type={c.contact_type} /></td>
                  <td style={{ padding: '11px 16px' }}><CrmLinePill line={c.business_line} /></td>
                  <td style={{ padding: '11px 16px' }}><CrmStagePill stage={c.stage} /></td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-3)', fontSize: 12 }}>{CRM_OUTREACH_SHORT[c.outreach_status] || '—'}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{crmFmtDate(c.last_contact_date)}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.next_step || ''}>{c.next_step || '—'}</td>
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

// ── Pipeline (kanban board + Hot toggle) ──────────────────────
function CrmPipelineView({ contacts, onEdit }) {
  const [line, setLine] = useState('All');
  const [mode, setMode] = useState('board');
  const CARD_CAP = 60;

  const lineFilter = (c) => line === 'All' || c.business_line === line;
  const byStage = useMemo(() => {
    const map = {}; CRM_PIPELINE_STAGES.forEach((s) => map[s] = []);
    contacts.forEach((c) => { if (crmIsDisregarded(c) || !lineFilter(c)) return; if (map[c.stage]) map[c.stage].push(c); });
    return map;
  }, [contacts, line]);
  const hotList = useMemo(() => contacts.filter((c) => crmIsHot(c) && !crmIsDisregarded(c) && lineFilter(c))
    .sort((a, b) => {
      const da = a.next_step_date ? crmParse(a.next_step_date).getTime() : Infinity;
      const db = b.next_step_date ? crmParse(b.next_step_date).getTime() : Infinity;
      return da - db;
    }), [contacts, line]);
  const hotOverdue = hotList.filter(crmIsOverdue).length;

  return (
    <div>
      <div className="crm-toolbar-row">
        <div className="crm-seg">
          <button className={mode === 'board' ? 'on' : ''} onClick={() => setMode('board')}><span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>view_kanban</span> Board</button>
          <button className={mode === 'hot' ? 'on' : ''} onClick={() => setMode('hot')}><span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>local_fire_department</span> Hot</button>
        </div>
        <div className="crm-chiprow" style={{ margin: 0 }}>
          {['All', ...CRM_BUSINESS_LINES].map((l) => <button key={l} className={'crm-segchip' + (line === l ? ' on' : '')} onClick={() => setLine(l)}>{l === 'All' ? 'All lines' : l}</button>)}
        </div>
      </div>

      {mode === 'board' ? (
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
      ) : (
        <div>
          <div className="crm-hot-summary">
            <div className="crm-hot-stat"><div className="crm-hot-label">In hot pipeline</div><div className="crm-hot-val">{hotList.length}</div></div>
            <div className="crm-hot-stat"><div className="crm-hot-label">Overdue actions</div><div className="crm-hot-val" style={{ color: 'var(--coral)' }}>{hotOverdue}</div></div>
            <div className="crm-hot-stat"><div className="crm-hot-label">High interest</div><div className="crm-hot-val">{hotList.filter((c) => c.interest_level === 'High').length}</div></div>
          </div>
          {hotList.length === 0
            ? <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No hot leads yet. Contacts marked high interest or in active discussion appear here.</div>
            : <div className="crm-hotgrid">
                {hotList.map((c) => {
                  const r = crmRelativeDue(c.next_step_date);
                  return (
                    <button key={c.id} className="crm-hotcard" onClick={() => onEdit(c)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div className="crm-kcard-name">{c.full_name}</div>
                        <CrmStagePill stage={c.stage} />
                      </div>
                      <div className="crm-kcard-sub">{[c.role, c.company].filter(Boolean).join(' · ') || '—'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <CrmInterestPill level={c.interest_level} />
                        <CrmLinePill line={c.business_line} />
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>{c.next_step || '—'}</div>
                      <div className={'crm-hotdue ' + (r.cls === 'over' ? 'over' : '')}>{c.next_step_date ? r.label + ' · ' + r.sub : 'No date'}</div>
                    </button>
                  );
                })}
              </div>}
        </div>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────
function CrmBar({ name, val, max, color }) {
  return (
    <div className="crm-bd-row">
      <div className="crm-bd-top"><span className="crm-bd-name"><span className="crm-kdot" style={{ background: color }} />{name}</span><span style={{ fontWeight: 700 }}>{val}</span></div>
      <div className="crm-bd-track"><span style={{ width: (max ? val / max * 100 : 0) + '%', background: color }} /></div>
    </div>
  );
}

function CrmAnalytics({ contacts, interactions, onMetric }) {
  const a = useMemo(() => {
    const cs = contacts;
    const n = (p) => cs.filter(p).length;
    const contacted = n(crmIsContacted), replied = n(crmIsReplied);
    const discovery = n((c) => c.stage === 'Discovery Scheduled');
    const won = n((c) => c.stage === 'Closed Won');
    const pct = (x, y) => (y ? Math.round(x / y * 100) : 0);
    const funnel = CRM_PIPELINE_STAGES.map((s) => ({ stage: s, count: cs.filter((c) => crmStageRank(c.stage) >= crmStageRank(s) && CRM_PIPELINE_STAGES.includes(c.stage)).length }));
    const seq = [
      { label: 'Initial Message Sent', count: n((c) => c.outreach_status === 'Initial Message Sent'), key: 'outreach_initial' },
      { label: 'Follow Up 1 Sent', count: n((c) => c.outreach_status === 'Follow Up 1 Sent'), key: 'outreach_fu1' },
      { label: 'Follow Up 2 Sent', count: n((c) => c.outreach_status === 'Follow Up 2 Sent'), key: 'outreach_fu2' },
    ];
    const resp = [
      { name: 'Interested / positive', val: n((c) => ['Interested', 'Discovery Scheduled', 'Proposal Sent', 'Closed Won'].includes(c.stage)), color: 'var(--teal-600)' },
      { name: 'Neutral / replied', val: n((c) => c.stage === 'Replied'), color: 'var(--sapphire)' },
      { name: 'No response yet', val: n((c) => CRM_NOT_CONTACTED_STAGES.concat(['LinkedIn Connected', 'Contacted']).includes(c.stage)), color: 'var(--text-3)' },
      { name: 'Not interested / lost', val: n((c) => ['Not Interested', 'Closed Lost'].includes(c.stage)), color: 'var(--coral)' },
    ];
    const byLine = CRM_BUSINESS_LINES.map((l) => ({ name: l, val: n((c) => c.business_line === l), color: l === 'Management' ? 'var(--sapphire)' : 'var(--teal-600)' }));
    const byType = CRM_CONTACT_TYPES.map((t) => ({ name: t, val: n((c) => c.contact_type === t), color: t === 'Lead' ? 'var(--sapphire)' : t === 'Account' ? 'var(--teal-600)' : 'var(--coral)' }));
    // activity from interactions
    const today = crmToday();
    const weekDays = Array.from({ length: 7 }, (_, i) => crmAddDays(-(6 - i)));
    const perDay = Object.fromEntries(weekDays.map((d) => [d, 0]));
    let weekTotal = 0, todayTotal = 0;
    (interactions || []).forEach((it) => {
      const d = it.interaction_date;
      if (d === today) todayTotal++;
      if (perDay[d] != null) { perDay[d]++; weekTotal++; }
    });
    return { contacted, replied, discovery, won, pct, funnel, seq, resp, byLine, byType, perDay, weekDays, weekTotal, todayTotal, total: cs.length };
  }, [contacts, interactions]);

  const rates = [
    { label: 'Contacted → Replied', val: a.pct(a.replied, a.contacted), frac: `${a.replied} of ${a.contacted}`, key: 'replied' },
    { label: 'Replied → Discovery', val: a.pct(a.discovery, a.replied), frac: `${a.discovery} of ${a.replied}`, key: null },
    { label: 'Discovery → Closed', val: a.pct(a.won, a.discovery), frac: `${a.won} of ${a.discovery}`, key: null },
  ];
  const funnelMax = a.funnel[0] ? a.funnel[0].count || 1 : 1;
  const respMax = a.total || 1;
  const seqMax = Math.max(1, ...a.seq.map((s) => s.count));
  const perDayMax = Math.max(1, ...Object.values(a.perDay));

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="crm-an-rates">
        {rates.map((r) => (
          <button key={r.label} className={'crm-rate' + (r.key ? ' clickable' : '')} disabled={!r.key} onClick={() => r.key && onMetric(r.key)}>
            <div className="crm-rate-label"><span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>target</span> {r.label}</div>
            <div className="crm-rate-val">{r.val}<span style={{ fontSize: 22 }}>%</span></div>
            <div className="crm-rate-frac">{r.frac}</div>
          </button>
        ))}
      </div>

      <div className="crm-an-grid">
        <div className="card" style={{ padding: 20 }}>
          <div className="crm-card-head"><h3 className="crm-h3">Conversion funnel</h3><span className="eyebrow">{a.total.toLocaleString()} total</span></div>
          {a.funnel.map((f) => (
            <div key={f.stage} className="crm-funnel-row">
              <span className="crm-funnel-label"><span className={'crm-kdot ' + (CRM_STAGE_CLASS[f.stage] || 'gray')} />{f.stage}</span>
              <div className="crm-funnel-bar-wrap">
                <div className="crm-funnel-bar" style={{ width: Math.max(f.count / funnelMax * 100, 3) + '%' }}>{f.count}</div>
                <span className="crm-funnel-pct">{a.pct(f.count, a.total)}%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="crm-card-head"><h3 className="crm-h3">Response breakdown</h3></div>
          {a.resp.map((r) => <CrmBar key={r.name} name={r.name} val={r.val} max={respMax} color={r.color} />)}
        </div>
      </div>

      <div className="crm-an-grid">
        <div className="card" style={{ padding: 20 }}>
          <div className="crm-card-head"><h3 className="crm-h3">Sequence distribution</h3><span className="eyebrow">current counts</span></div>
          {a.seq.map((s, i) => (
            <button key={s.label} className="crm-bd-row crm-bd-click" title={`View contacts: ${s.label}`} onClick={() => onMetric(s.key)}>
              <div className="crm-bd-top"><span className="crm-bd-name">{s.label}</span><span style={{ fontWeight: 700 }}>{s.count}</span></div>
              <div className="crm-bd-track"><span style={{ width: s.count / seqMax * 100 + '%', background: ['var(--sapphire)', 'var(--teal-600)', 'var(--coral)'][i] }} /></div>
            </button>
          ))}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="crm-card-head"><h3 className="crm-h3">Distribution</h3></div>
          <div className="crm-split">
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>By business line</div>
              {a.byLine.map((r) => <CrmBar key={r.name} name={r.name} val={r.val} max={a.total} color={r.color} />)}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>By contact type</div>
              {a.byType.map((r) => <CrmBar key={r.name} name={r.name} val={r.val} max={a.total} color={r.color} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="crm-card-head"><h3 className="crm-h3">Activity</h3><span className="eyebrow">interactions logged</span></div>
        <div className="crm-an-rates" style={{ marginBottom: 16 }}>
          <div className="crm-rate" style={{ cursor: 'default' }}><div className="crm-rate-label">Logged today</div><div className="crm-rate-val">{a.todayTotal}</div></div>
          <div className="crm-rate" style={{ cursor: 'default' }}><div className="crm-rate-label">This week</div><div className="crm-rate-val">{a.weekTotal}</div></div>
          <div className="crm-rate" style={{ cursor: 'default' }}><div className="crm-rate-label">All-time</div><div className="crm-rate-val">{(interactions || []).length}</div></div>
        </div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Interactions this week</div>
        <div className="crm-wk">
          {a.weekDays.map((d) => {
            const v = a.perDay[d];
            const h = Math.round(v / perDayMax * 100);
            const isToday = d === crmToday();
            const dow = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={d} className="crm-wk-col">
                <div className="crm-wk-val">{v || ''}</div>
                <div className="crm-wk-track"><span className={'crm-wk-fill' + (isToday ? ' today' : '')} style={{ height: h + '%' }} /></div>
                <div className="crm-wk-label">{dow}</div>
              </div>
            );
          })}
        </div>
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
                  {c ? <button className="crm-feed-link" onClick={() => onOpenContact(c)}>{c.full_name || 'Contact'}</button>
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

// Supabase/PostgREST caps a single select at 1,000 rows. Page through with a
// stable (unique) order so the full dataset loads regardless of size.
async function crmFetchAll(table) {
  const PAGE = 1000;
  let from = 0, all = [];
  for (;;) {
    const { data, error } = await window._supabase.from(table).select('*').order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) return { data: all, error };
    all = all.concat(data || []);
    if (!data || data.length < PAGE) return { data: all, error: null };
    from += PAGE;
  }
}

// ── Root screen ───────────────────────────────────────────────
function CRMScreen() {
  const [contacts, setContacts] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [view, setView] = useState('overview');
  const [panel, setPanel] = useState(null);          // { contact, tab }
  const [addInt, setAddInt] = useState(null);        // { defaultContactId }
  const [importOpen, setImportOpen] = useState(false);
  const [preset, setPreset] = useState(null);        // contacts preset filter key
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('');
      const [cs, is] = await Promise.all([
        crmFetchAll('crm_contacts'),
        crmFetchAll('crm_interactions'),
      ]);
      if (cs.error) setErr(cs.error.message); else setContacts(cs.data || []);
      if (!cs.error && is.error) setErr(is.error.message); else if (!is.error) setInteractions(is.data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const contactMap = useMemo(() => { const m = {}; contacts.forEach((c) => { m[c.id] = c; }); return m; }, [contacts]);
  const patchContact = (row) => setContacts((prev) => prev.map((c) => c.id === row.id ? { ...c, ...row } : c));
  const onSavedContact = (row, isNew) => setContacts((prev) => isNew ? [row, ...prev] : prev.map((c) => c.id === row.id ? row : c));

  const addInteractionFor = async (contactId, payload, done) => {
    const { data, error } = await window._supabase.from('crm_interactions').insert({ contact_id: contactId, ...payload }).select().single();
    if (error) { setErr(error.message); done && done(false); return; }
    setInteractions((prev) => [data, ...prev]);
    done && done(true);
  };

  // Today's Actions mutations
  const markDone = async (c, { completed, nextStep, nextStepDate, context }, done) => {
    const today = crmToday();
    const noteText = CRM_NOTE_FOR_DONE[completed] || ('Marked ' + completed);
    const fields = {
      outreach_status: completed, outreach_status_changed_at: new Date().toISOString(),
      last_contact_date: today, next_step: context ? `${nextStep} — ${context}` : nextStep, next_step_date: nextStepDate || null,
    };
    const upd = await window._supabase.from('crm_contacts').update(fields).eq('id', c.id).select().single();
    if (upd.error) { setErr(upd.error.message); done && done(); return; }
    const ins = await window._supabase.from('crm_interactions').insert({ contact_id: c.id, interaction_date: today, type: 'LinkedIn message', note: noteText }).select().single();
    patchContact(upd.data);
    if (!ins.error && ins.data) setInteractions((prev) => [ins.data, ...prev]);
    setToast(`Logged — ${c.full_name} updated`);
    done && done();
  };
  const deferTomorrow = async (c) => {
    const fields = { next_step_date: crmTomorrow(), disregarded_on: crmToday() };
    const { data, error } = await window._supabase.from('crm_contacts').update(fields).eq('id', c.id).select().single();
    if (error) { setErr(error.message); return; }
    patchContact(data); setToast(`Moved to tomorrow — ${c.full_name}`);
  };
  const disregard = async (c) => {
    const { data, error } = await window._supabase.from('crm_contacts').update({ disregarded_on: CRM_DISREGARD_SENTINEL }).eq('id', c.id).select().single();
    if (error) { setErr(error.message); return; }
    patchContact(data); setToast(`Disregarded — ${c.full_name} removed from Today's Actions`);
  };

  const onImported = (rows) => {
    if (!rows || !rows.length) return;
    setContacts((prev) => [...rows, ...prev]);
    setToast(`Imported ${rows.length} contact${rows.length !== 1 ? 's' : ''}`);
  };

  const goContactsPreset = (key) => { setPreset(key); setView('contacts'); };

  const stats = useMemo(() => ({ total: contacts.length, won: contacts.filter((c) => c.stage === 'Closed Won').length, hot: contacts.filter(crmIsHot).length }), [contacts]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · CRM</div>
          <h1 className="page-title">Outbound command center.</h1>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right', lineHeight: 1.5 }}>
          <div><strong style={{ color: 'var(--text)' }}>{stats.total.toLocaleString()}</strong> contacts · <strong style={{ color: 'var(--text)' }}>{stats.hot}</strong> hot</div>
          <div><strong style={{ color: 'var(--text)' }}>{interactions.length.toLocaleString()}</strong> interactions · <strong style={{ color: 'var(--text)' }}>{stats.won}</strong> closed won</div>
        </div>
      </div>

      <div className="crm-viewtabs">
        {[['overview', 'Overview', 'space_dashboard'], ['contacts', 'Contacts', 'group'], ['pipeline', 'Pipeline', 'view_kanban'], ['analytics', 'Analytics', 'bar_chart'], ['interactions', 'Interactions', 'forum']].map(([k, label, icon]) => (
          <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>{label}
          </button>
        ))}
      </div>

      {err && <div className="crm-err" style={{ marginBottom: 12 }}>{err}</div>}
      {loading && <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading CRM…</div>}

      {!loading && view === 'overview' && (
        <CrmOverview contacts={contacts} onMetric={goContactsPreset} onMarkDone={markDone} onDefer={deferTomorrow} onDisregard={disregard} />
      )}
      {!loading && view === 'contacts' && (
        <CrmContactsView contacts={contacts} preset={preset} onClearPreset={() => setPreset(null)}
          onAdd={() => setPanel({ contact: null, tab: 'edit' })}
          onImport={() => setImportOpen(true)}
          onEdit={(c) => setPanel({ contact: c, tab: 'edit' })}
          onLog={(c) => setPanel({ contact: c, tab: 'log' })} />
      )}
      {!loading && view === 'pipeline' && (
        <CrmPipelineView contacts={contacts} onEdit={(c) => setPanel({ contact: c, tab: 'edit' })} />
      )}
      {!loading && view === 'analytics' && (
        <CrmAnalytics contacts={contacts} interactions={interactions} onMetric={goContactsPreset} />
      )}
      {!loading && view === 'interactions' && (
        <CrmInteractionsView interactions={interactions} contactMap={contactMap}
          onOpenContact={(c) => setPanel({ contact: c, tab: 'log' })}
          onAdd={() => setAddInt({ defaultContactId: '' })} />
      )}

      {panel && (
        <CrmContactPanel contact={panel.contact} interactions={interactions} initialTab={panel.tab}
          onClose={() => setPanel(null)} onSaved={onSavedContact} onAddInteraction={addInteractionFor} />
      )}
      {addInt && (
        <CrmAddInteractionPanel contacts={contacts} defaultContactId={addInt.defaultContactId}
          onClose={() => setAddInt(null)} onSaved={addInteractionFor} />
      )}
      {importOpen && (
        <CrmImportPanel contacts={contacts} onClose={() => setImportOpen(false)} onImported={onImported} />
      )}

      {toast && <div className="crm-toast">{toast}</div>}
    </>
  );
}

Object.assign(window, { CRMScreen });
