// adminplus.jsx — Bulk messaging tool + Private admin notes

// BulkMessaging now delegates to AdminChatScreen (defined in adminchat.jsx)
// This stub is replaced at runtime by the real component.
function BulkMessaging() {
  // AdminChatScreen is defined in adminchat.jsx, loaded after this file
  return typeof AdminChatScreen !== 'undefined'
    ? <AdminChatScreen />
    : <div style={{padding:40,textAlign:'center',color:'var(--text-3)'}}>Loading…</div>;
}

function _BulkMessagingArchived() {
  const [filters, setFilters] = useState({ product:'all', tier:'all', status:'all', company:'all' });
  const [selected, setSelected] = useState(new Set());
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delivery, setDelivery] = useState('both');
  const [sent, setSent] = useState(false);

  const applyFilter = (m) => {
    if (filters.product !== 'all' && !m.plan.toLowerCase().includes(filters.product)) return false;
    if (filters.tier !== 'all' && !m.plan.toLowerCase().includes(filters.tier)) return false;
    if (filters.status !== 'all' && m.status.toLowerCase() !== filters.status.toLowerCase()) return false;
    return true;
  };

  const filtered = ADMIN_MEMBERS.filter(applyFilter);
  const allChecked = filtered.length > 0 && filtered.every(m => selected.has(m.name));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(m => m.name)));
  };
  const toggleOne = (name) => {
    const s = new Set(selected);
    s.has(name) ? s.delete(name) : s.add(name);
    setSelected(s);
  };

  const recipientCount = selected.size || filtered.length;

  const preview = subject && body ? {
    from: 'Ramy El-Sayed via Vantage',
    subject,
    body: body.slice(0, 160) + (body.length > 160 ? '…' : ''),
  } : null;

  if (sent) return (
    <div style={{ textAlign:'center', padding:'60px 0' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
      <div className="display" style={{ fontSize:36, marginBottom:12 }}>Message sent.</div>
      <div style={{ fontSize:14, color:'var(--text-2)', marginBottom:28 }}>Delivered to {recipientCount} member{recipientCount>1?'s':''} via {delivery==='both'?'in-app + email':delivery}.</div>
      <button className="btn primary" onClick={() => { setSent(false); setSubject(''); setBody(''); setSelected(new Set()); }}>Send another</button>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Messaging</div>
          <h1 className="page-title">Bulk message.</h1>
          <div className="page-sub" style={{ marginTop:6, color:'var(--text-2)', maxWidth:500 }}>
            Reach specific segments or all members at once. Delivered in-app, by email, or both.
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:24, alignItems:'start' }}>
        {/* Left: Audience filter */}
        <div>
          <div className="card" style={{ padding:22, marginBottom:16 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>Filter audience</div>
            <div className="stack" style={{ gap:12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Product</div>
                <div className="seg">
                  {['all','mentorship','management'].map(v => (
                    <button key={v} className={filters.product===v?'on':''} onClick={() => setFilters(f=>({...f,product:v}))}>
                      {v==='all'?'All':v.charAt(0).toUpperCase()+v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Plan / Tier</div>
                <div className="seg">
                  {['all','foundations','breakthrough','essentials','advanced'].map(v => (
                    <button key={v} className={filters.tier===v?'on':''} onClick={() => setFilters(f=>({...f,tier:v}))}>
                      {v==='all'?'All':v.charAt(0).toUpperCase()+v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Engagement status</div>
                <div className="seg">
                  {['all','active','idle','at risk'].map(v => (
                    <button key={v} className={filters.status===v?'on':''} onClick={() => setFilters(f=>({...f,status:v}))}>
                      {v==='all'?'All':v.charAt(0).toUpperCase()+v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <div className={"check" + (allChecked?' on':'')} onClick={toggleAll}>
                {allChecked && <Icon name="check" size={11} stroke={3} />}
              </div>
              <div className="eyebrow" style={{ margin:0, flex:1 }}>
                {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} matched`}
              </div>
              <div style={{ fontFamily:'var(--ff-display)', fontSize:22, color:'var(--accent)' }}>{recipientCount}</div>
              <div className="eyebrow" style={{ margin:0, fontSize:10 }}>recipients</div>
            </div>
            <div style={{ maxHeight:280, overflow:'auto' }}>
              {filtered.map(m => (
                <div key={m.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onClick={() => toggleOne(m.name)}>
                  <div className={"check" + (selected.has(m.name)?' on':'')}>
                    {selected.has(m.name) && <Icon name="check" size={11} stroke={3} />}
                  </div>
                  <Avatar initials={m.initials} color={m.color} size={26} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{m.plan}</div>
                  </div>
                  <span className="chip" style={{ fontSize:10, color:m.status==='Active'?'var(--teal-600)':m.status==='At risk'?'var(--coral)':'#C88A1A' }}>
                    <span className="dot" style={{ background:m.status==='Active'?'var(--teal-600)':m.status==='At risk'?'var(--coral)':'#C88A1A' }} />
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Composer */}
        <div className="stack" style={{ gap:16 }}>
          <div className="card" style={{ padding:22 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>Compose message</div>
            <div className="stack" style={{ gap:12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Delivery method</div>
                <div className="seg">
                  <button className={delivery==='inapp'?'on':''} onClick={()=>setDelivery('inapp')}>In-app</button>
                  <button className={delivery==='email'?'on':''} onClick={()=>setDelivery('email')}>Email</button>
                  <button className={delivery==='both'?'on':''} onClick={()=>setDelivery('both')}>Both</button>
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Subject</div>
                <input className="input" placeholder="Message subject" value={subject} onChange={e=>setSubject(e.target.value)} />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Message body</div>
                <textarea className="input" rows={6} placeholder="Write your message…" value={body} onChange={e=>setBody(e.target.value)} style={{ resize:'none', lineHeight:1.55 }} />
              </div>
            </div>
          </div>

          {preview && (
            <div className="card" style={{ padding:20, background:'var(--bg-sunken)' }}>
              <div className="eyebrow" style={{ marginBottom:10 }}>Preview</div>
              <div style={{ padding:'14px 16px', background:'var(--bg-elev)', borderRadius:12, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>From: {preview.from}</div>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>{preview.subject}</div>
                <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.55 }}>{preview.body}</div>
              </div>
            </div>
          )}

          <button className="btn primary" style={{ justifyContent:'center', fontSize:14 }}
            disabled={!subject || !body}
            onClick={() => setSent(true)}>
            <Icon name="send" size={14} />
            Send to {recipientCount} member{recipientCount>1?'s':''}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Private Admin Notes ──────────────────────────────────────────────────────
function PrivateNotes({ memberName }) {
  const [notes, setNotes] = useState([
    { id:'n1', date:'Apr 8, 2026', text:'Amira is sharp and self-aware. Her biggest blocker is confidence, not capability. The CV rewrite task is a forcing function — she needs external validation to believe what she already knows.' },
    { id:'n2', date:'Mar 15, 2026', text:'Good energy in today\'s 1:1. She asked two prepared questions for the first time. Habit forming.' },
    { id:'n3', date:'Feb 28, 2026', text:'First month check-in: engaged, consistent, asks good questions. Raise the ceiling — give her harder tasks.' },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const addNote = () => {
    if (!draft.trim()) return;
    const today = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    setNotes(n => [{ id:'n'+Date.now(), date:today, text:draft.trim() }, ...n]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="card" style={{ padding:22 }}>
      <div className="row-between" style={{ marginBottom:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="edit" size={16} style={{ color:'var(--text-3)' }} />
            <div className="eyebrow" style={{ margin:0 }}>Private coaching notes</div>
            <span style={{ fontFamily:'var(--ff-sub)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase',
              background:'var(--coral)', color:'#fff', padding:'2px 7px', borderRadius:4 }}>Admin only</span>
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>Invisible to {memberName}. Each note is timestamped and preserved.</div>
        </div>
        <button className="btn sm" onClick={() => setAdding(a=>!a)}>
          <Icon name="plus" size={13} /> Add note
        </button>
      </div>

      {adding && (
        <div style={{ marginBottom:16 }}>
          <textarea className="input" rows={4} autoFocus
            placeholder="Your private coaching note…"
            value={draft} onChange={e=>setDraft(e.target.value)}
            style={{ resize:'none', lineHeight:1.55, marginBottom:8 }} />
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn primary sm" onClick={addNote} disabled={!draft.trim()}>Save note</button>
            <button className="btn ghost sm" onClick={() => { setAdding(false); setDraft(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap:10 }}>
        {notes.map((n, i) => (
          <div key={n.id} style={{
            padding:'14px 16px', borderRadius:12,
            background: i===0 ? 'var(--bg-sunken)' : 'var(--bg-elev)',
            border:'1px solid var(--border)'
          }}>
            <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--ff-sub)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
              {n.date}
            </div>
            <div style={{ fontSize:13, lineHeight:1.6, color:'var(--text-2)' }}>{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Member Detail Page ──────────────────────────────────────────────────
function AdminMemberDetail({ member, onBack }) {
  if (!member) return null;
  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn ghost sm" onClick={onBack} style={{ marginBottom:8 }}>
            <Icon name="chevron-right" size={13} style={{ transform:'rotate(180deg)' }} /> Back to members
          </button>
          <div className="eyebrow">Admin · Member detail</div>
          <h1 className="page-title">{member.name}</h1>
          <div className="page-sub" style={{ marginTop:4, color:'var(--text-2)' }}>{member.plan} · Last active {member.lastActive}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn"><Icon name="tasks" size={13} /> Assign task</button>
          <button className="btn primary"><Icon name="sessions" size={13} /> Schedule 1:1</button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="card" style={{ padding:0, marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
          {[
            ['Points', member.points.toLocaleString()],
            ['Streak', member.streak + ' days'],
            ['Status', member.status],
            ['Plan', member.plan.split(' · ')[1] || member.plan],
          ].map(([l,v],i) => (
            <div key={l} style={{ padding:'20px', borderRight:i<3?'1px solid var(--border)':'none' }}>
              <div className="eyebrow" style={{ fontSize:10 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:700, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <PrivateNotes memberName={member.name} />
    </>
  );
}

Object.assign(window, { BulkMessaging, PrivateNotes, AdminMemberDetail });
