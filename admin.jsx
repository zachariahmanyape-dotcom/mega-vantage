// admin.jsx — Admin views (Overview, Members+ViewAs, Tasks, Sessions, Resources, Chat)
// AdminAnalytics is in analytics.jsx

function AdminOverview({ onPick }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Overview</div>
          <h1 className="page-title">Mission control</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>
            Members, tasks, sessions, resources, channels, analytics — in one view.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn"><Icon name="plus" size={13} /> New task</button>
          <button className="btn primary"><Icon name="plus" size={13} /> Schedule session</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
          ['Active members', '214', '+12 this month'],
          ['Avg. weekly engagement', '78%', '+4 pts'],
          ['Tasks assigned this week', '96', '67 complete'],
          ['Session attendance', '92%', 'Last 30 days'],
          ['At-risk members', '7', 'Needs outreach']].
          map(([l, v, s], i) =>
          <div key={l} style={{ padding: '22px 20px', borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div className="eyebrow" style={{ fontSize: 10 }}>{l}</div>
              <div className="display" style={{ fontSize: 36, marginTop: 4, color: i === 4 ? 'var(--coral)' : 'var(--text)' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row-between" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <div className="eyebrow" style={{ margin: 0 }}>Members · recent activity</div>
            <button className="btn ghost sm" onClick={() => onPick('admin-members')}>View all <Icon name="arrow-right" size={12} /></button>
          </div>
          <MembersTable compact onViewAs={() => {}} />
        </div>

        <div className="stack" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Engagement distribution</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end', height: 120 }}>
              {[14, 32, 58, 72, 38].map((v, i) =>
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="bar" style={{ width: '100%', height: 100, position: 'relative' }}>
                    <span style={{ height: v + '%', background: ['var(--coral)', '#E8B24C', 'var(--teal-600)', 'var(--accent)', 'var(--text)'][i] }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{LEVELS[i]}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Top performers · this month</div>
            <div className="stack" style={{ gap: 10 }}>
              {[...ADMIN_MEMBERS].sort((a, b) => b.points - a.points).slice(0, 4).map((m, i) =>
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="display" style={{ fontSize: 18, color: 'var(--text-3)', width: 18 }}>{i + 1}</div>
                  <Avatar initials={m.initials} color={m.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.plan}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{m.points.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>);

}

function MembersTable({ compact, onViewAs, onOpenDetail, members = [], loading = false }) {
  const [blockedMember, setBlockedMember] = useState(null);

  const handleViewAs = (m) => {
    if (['pending', 'inactive', 'expired'].includes(m.member_status)) {
      setBlockedMember(m);
      return;
    }
    if (onViewAs) onViewAs(m);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
        Loading members…
      </div>
    );
  }

  const rows = compact ? members.slice(0, 6) : members;
  const statusColor = (s) =>
    s === 'Pending'  ? '#C88A1A' :
    s === 'Inactive' ? 'var(--text-3)' :
    s === 'Expired'  ? 'var(--coral)' :
    s === 'Trial'    ? '#E8B24C' :
    s === 'At risk'  ? 'var(--coral)' :
    s === 'Top performer' ? 'var(--accent)' :
    'var(--teal-600)';

  return (
    <>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--bg-sunken)' }}>
          {['Member', 'Plan', 'Last active', 'Points', 'Streak', 'Trial Expires', 'Status', ''].map((h) =>
          <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)' }}>{h}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => {
          const name      = m.full_name || 'Unnamed';
          const initials  = (m.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const color     = '#0F52BA';
          const plan      = m.membership_tier ? m.membership_tier.charAt(0).toUpperCase() + m.membership_tier.slice(1) : '—';
          const lastActive = 'recently';
          const points    = 0;
          const streak    = 0;
          const memberStatus = m.member_status || 'active';
          const status =
            memberStatus === 'pending'  ? 'Pending'  :
            memberStatus === 'inactive' ? 'Inactive' :
            memberStatus === 'expired'  ? 'Expired'  :
            m.account_type === 'trial'  ? 'Trial'    :
            m.account_type === 'free'   ? 'Free'     : 'Active';
          const trialExpiry = m.trial_expires_at
            ? new Date(m.trial_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          return (
            <tr key={m.id || name} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={initials} color={color} size={28} />
                  <span style={{ fontWeight: 600 }}>{name}</span>
                </div>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{plan}</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{lastActive}</td>
              <td style={{ padding: '12px 16px', fontWeight: 700 }}>{points.toLocaleString()}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: streak > 0 ? 'var(--coral)' : 'var(--text-3)' }}>
                  <Icon name="flame" size={12} />{streak}
                </span>
              </td>
              <td style={{ padding: '12px 16px', color: trialExpiry ? (memberStatus === 'expired' ? 'var(--coral)' : 'var(--text-2)') : 'var(--text-3)', fontSize: 12 }}>
                {trialExpiry || '—'}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span className="chip" style={{ color: statusColor(status), borderColor: statusColor(status) + '55', background: statusColor(status) + '15' }}>
                  <span className="dot" style={{ background: statusColor(status) }} />{status}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn ghost sm" onClick={() => handleViewAs(m)}>
                    View as <Icon name="arrow-right" size={11} />
                  </button>
                  {onOpenDetail && (
                    <button className="btn ghost sm" onClick={() => onOpenDetail(m)}>
                      Details
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {blockedMember && (
      <>
        <div onClick={() => setBlockedMember(null)} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:200, backdropFilter:'blur(3px)' }} />
        <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
          <div style={{ padding:'24px 24px 20px' }}>
            <div className="display" style={{ fontSize:22, marginBottom:10 }}>Member not yet active</div>
            <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.65 }}>
              This member has not yet verified their account or logged in for the first time.
            </div>
          </div>
          <div style={{ padding:'0 24px 20px' }}>
            <button className="btn" onClick={() => setBlockedMember(null)} style={{ width:'100%', justifyContent:'center' }}>
              Back
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}

// ─── Invite Member Modal ──────────────────────────────────────────────────────
function InviteMemberModal({ onClose, onInvited }) {
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [tier,          setTier]          = useState('foundations');
  const [accountType,   setAccountType]   = useState('trial');
  const [trialDays,     setTrialDays]     = useState(10);
  const [trialExpiresAt, setTrialExpiresAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 10);
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  });
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState(null);

  const addDays = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const selectTrialDays = (days) => {
    setTrialDays(days);
    setTrialExpiresAt(addDays(days));
  };

  const handleSend = async () => {
    if (!email.trim()) { setResult({ type: 'error', msg: 'Email is required.' }); return; }
    setSending(true); setResult(null);
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      const res = await fetch(
        'https://npsfarsblfewdclhoquo.supabase.co/functions/v1/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email:            email.trim(),
            full_name:        fullName.trim(),
            membership_tier:  tier,
            account_type:     accountType,
            trial_days:       accountType === 'trial' ? trialDays : null,
            trial_expires_at: accountType === 'trial' && trialExpiresAt ? trialExpiresAt : null,
          }),
        }
      );
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Invite failed');

      setResult({ type: 'success', msg: `Invite sent to ${email.trim()}` });
      if (onInvited) onInvited();
    } catch (err) {
      setResult({ type: 'error', msg: err.message || 'Something went wrong.' });
    } finally {
      setSending(false);
    }
  };

  const selectStyle = {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid var(--border)', borderRadius: 10,
    fontSize: 13, fontFamily: 'var(--ff-body)',
    background: 'var(--bg)', color: 'var(--text)',
    outline: 'none', cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath fill=\'none\' stroke=\'%23999\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
    paddingRight: 36,
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:480, maxHeight:'88vh', overflow:'auto', zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
        <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)' }}>
          <div className="display" style={{ fontSize:26, marginBottom:4 }}>Invite member</div>
          <div style={{ fontSize:13, color:'var(--text-2)' }}>Send an invite link and pre-configure their account.</div>
        </div>
        <div style={{ padding:'20px 24px' }}>
          <div className="stack" style={{ gap:14 }}>

            {/* Name + Email */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Full name</div>
                <input className="input" placeholder="Amira Khaled" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Email</div>
                <input className="input" type="email" placeholder="amira@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            {/* Tier + Account type */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Membership tier</div>
                <select style={selectStyle} value={tier} onChange={e => setTier(e.target.value)}>
                  <option value="foundations">Foundations</option>
                  <option value="breakthrough">Breakthrough</option>
                </select>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom:6, fontSize:10 }}>Account type</div>
                <select style={selectStyle} value={accountType} onChange={e => setAccountType(e.target.value)}>
                  <option value="trial">Trial</option>
                  <option value="paid">Paid</option>
                  <option value="free">Free</option>
                  <option value="mega_management">MEGA Management</option>
                </select>
              </div>
            </div>

            {/* Trial options — only when account type is trial */}
            {accountType === 'trial' && (
              <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg-sunken)', border:'1px solid var(--border)' }}>
                <div className="eyebrow" style={{ marginBottom:10, fontSize:10 }}>Trial duration</div>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  {[5, 10, 20].map(days => (
                    <button key={days} className={'btn sm' + (trialDays === days ? ' primary' : '')}
                      style={{ flex:1, justifyContent:'center' }}
                      onClick={() => selectTrialDays(days)}>
                      {days} days
                    </button>
                  ))}
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom:6, fontSize:9 }}>Trial expiry date</div>
                  <input className="input" type="date" value={trialExpiresAt}
                    onChange={e => { setTrialExpiresAt(e.target.value); setTrialDays(null); }}
                    style={{ fontSize:13 }} />
                  {trialExpiresAt && (
                    <div style={{ fontSize:11, color:'var(--teal-600)', fontWeight:600, marginTop:8 }}>
                      Expires {formatExpiry(trialExpiresAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {result && (
              <div style={{
                padding:'10px 14px', borderRadius:8, fontSize:12, lineHeight:1.5,
                background: result.type==='success' ? 'rgba(163,228,219,0.2)' : 'rgba(255,107,107,0.1)',
                border: '1px solid '+(result.type==='success' ? 'rgba(163,228,219,0.5)' : 'rgba(255,107,107,0.3)'),
                color: result.type==='success' ? '#2E8A7B' : '#c0392b',
              }}>
                {result.msg}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
          <button className="btn primary" style={{ flex:1, justifyContent:'center' }}
            disabled={sending || !email.trim()} onClick={handleSend}>
            {sending ? 'Sending…' : 'Send invite'}
          </button>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}

function AdminMembers({ onViewAs, onOpenDetail }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await window._supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('joined_at', { ascending: false });
    if (!error && data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Members</div>
          <h1 className="page-title">All members</h1>
          <div className="page-sub" style={{ marginTop: 6, color: 'var(--text-2)' }}>Click "View as" to enter read-only member view for any account.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', width: 260 }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: 34 }} placeholder="Search members…" />
          </div>
          <button className="btn primary" onClick={() => setShowInvite(true)}><Icon name="plus" size={13} /> Invite member</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MembersTable onViewAs={onViewAs} onOpenDetail={onOpenDetail} members={members} loading={loading} />
      </div>
      {showInvite && (
        <InviteMemberModal
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); fetchMembers(); }}
        />
      )}
    </>);

}

function AdminTasks() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Tasks & Goals</div>
          <h1 className="page-title">Assign the next move</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Create task</div>
          <div className="stack" style={{ gap: 12 }}>
            <input className="input" placeholder="Task title" defaultValue="Present your week's win in Friday's sync" />
            <textarea className="input" rows={3} placeholder="Description" defaultValue="Two minutes, one slide. One win. One learning. Practice aloud before you record." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Due</div>
                <input className="input" type="date" defaultValue="2026-04-25" />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Points</div>
                <input className="input" defaultValue="80" />
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Subject area</div>
              <select className="input">{Object.keys(SUBJECTS).map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Effort / Impact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="seg" style={{ width: '100%' }}>
                  <button>Low</button><button className="on">Med</button><button>High</button>
                </div>
                <div className="seg" style={{ width: '100%' }}>
                  <button>Low</button><button>Med</button><button className="on">High</button>
                </div>
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Assign to</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ADMIN_MEMBERS.slice(0, 4).map((m) =>
                <span key={m.name} className="chip sapphire" style={{ padding: '4px 10px 4px 4px' }}>
                    <Avatar initials={m.initials} color={m.color} size={18} style={{ fontSize: 9 }} />
                    {m.name}
                  </span>
                )}
                <span className="chip">+ add</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>Assign to 4 members</button>
              <button className="btn">Save draft</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Goals pipeline</div>
          <div className="stack" style={{ gap: 10 }}>
            {GOALS.map((g) =>
            <div key={g.id} style={{ padding: 14, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{g.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{g.taskIds.length} tasks linked · assigned to 12 members</div>
                <div className="progress" style={{ marginTop: 10, height: 3 }}><span style={{ width: '45%' }} /></div>
              </div>
            )}
            <button className="btn" style={{ justifyContent: 'center' }}><Icon name="plus" size={13} /> New goal</button>
          </div>
        </div>
      </div>
    </>);

}

function AdminSessions() {
  const [type, setType] = React.useState('1:1');
  const [title, setTitle] = React.useState('');
  const [attendeeId, setAttendeeId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('17:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [recurrence, setRecurrence] = React.useState('does-not-repeat');
  const [link, setLink] = React.useState('');
  const [members, setMembers] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    window._supabase.from('profiles').select('id, full_name, email').order('full_name').
    then(({ data }) => setMembers(data || []));
  }, []);

  const reset = () => {
    setTitle('');setAttendeeId('');setDate('');
    setStartTime('17:00');setEndTime('18:00');
    setRecurrence('does-not-repeat');setLink('');
  };

  const submit = async () => {
    setMsg(null);
    if (!title.trim()) {setMsg({ ok: false, text: 'Add a session title.' });return;}
    if (!date) {setMsg({ ok: false, text: 'Pick a date.' });return;}
    if (!startTime || !endTime) {setMsg({ ok: false, text: 'Set a start and end time.' });return;}
    if (endTime <= startTime) {setMsg({ ok: false, text: 'End time must be after the start time.' });return;}
    if (type === '1:1' && !attendeeId) {setMsg({ ok: false, text: 'Select the member for this 1:1.' });return;}

    setSaving(true);
    const { data: { user } } = await window._supabase.auth.getUser();
    const mentorName = window._currentMember ?
    `${window._currentMember.firstName} ${window._currentMember.lastName}`.trim() : 'MEGA';
    const { error } = await window._supabase.from('sessions').insert({
      type,
      title: title.trim(),
      session_date: date,
      start_time: startTime,
      end_time: endTime,
      mentor_name: mentorName,
      meeting_link: link.trim() || null,
      recurrence,
      attendee_id: type === '1:1' ? attendeeId : null,
      created_by: user?.id || null
    });
    setSaving(false);
    if (error) {setMsg({ ok: false, text: error.message });return;}
    const who = type === 'Town Hall' ?
    'all members' :
    members.find((m) => m.id === attendeeId)?.full_name || 'the member';
    setMsg({ ok: true, text: `Session scheduled for ${who}.` });
    reset();
    setReloadKey((k) => k + 1);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Sessions</div>
          <h1 className="page-title">Schedule</h1>
          <div className="page-sub" style={{ marginTop: 6, color: 'var(--text-2)' }}>
            Create 1:1s and town halls. 1:1s appear only for the chosen member; town halls appear for everyone.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Calendar */}
        <div className="card" style={{ padding: 24 }}>
          <Calendar isAdmin={true} reloadKey={reloadKey} />
        </div>

        {/* Create panel */}
        <div className="card" style={{ padding: 22, height: 'fit-content', position: 'sticky', top: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Create session</div>
          <div className="stack" style={{ gap: 12 }}>
            <div className="seg" style={{ width: '100%' }}>
              <button className={type === '1:1' ? 'on' : ''} onClick={() => setType('1:1')}>1:1</button>
              <button className={type === 'Town Hall' ? 'on' : ''} onClick={() => setType('Town Hall')}>Town Hall</button>
            </div>

            {type === '1:1' &&
            <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Member</div>
                <select className="input" style={{ fontSize: 13 }} value={attendeeId} onChange={(e) => setAttendeeId(e.target.value)}>
                  <option value="">Select a member…</option>
                  {members.map((m) =>
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                  )}
                </select>
              </div>
            }

            <input className="input" placeholder={type === 'Town Hall' ? 'Town hall title' : 'Session title'} value={title} onChange={(e) => setTitle(e.target.value)} />

            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Start</div>
                <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>End</div>
                <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Recurrence</div>
              <select className="input" style={{ fontSize: 13 }} value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="does-not-repeat">Does not repeat</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <input className="input" placeholder="Meeting link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />

            {msg &&
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8, lineHeight: 1.45,
              background: msg.ok ? 'rgba(79,183,166,0.14)' : 'rgba(255,107,107,0.12)',
              color: msg.ok ? 'var(--teal-600)' : 'var(--coral)',
              border: '1px solid ' + (msg.ok ? 'rgba(79,183,166,0.3)' : 'rgba(255,107,107,0.3)')
            }}>{msg.text}</div>
            }

            <button className="btn primary" style={{ justifyContent: 'center' }} onClick={submit} disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule session'}
            </button>
          </div>
        </div>
      </div>
    </>);

}

function AdminResources() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Resources</div>
          <h1 className="page-title">Resource manager.</h1>
        </div>
        <button className="btn primary"><Icon name="plus" size={13} /> Upload resource</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunken)' }}>
              {['Title', 'Folder', 'Type', 'Access', 'Subject', 'Added', ''].map((h) =>
              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) =>
            <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.title}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{r.folder}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="chip"><Icon name={r.type === 'video' ? 'video' : r.type === 'doc' ? 'doc' : 'link'} size={11} /> {r.type}</span>
                </td>
                <td style={{ padding: '12px 16px' }}><span className="chip teal">{r.plan}</span></td>
                <td style={{ padding: '12px 16px' }}><SubjectTag subject={r.subject} /></td>
                <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{r.addedDays}d ago</td>
                <td style={{ padding: '12px 16px' }}>
                  <button className="btn ghost sm"><Icon name="link" size={11} /> Copy link</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>);

}

function AdminChat() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Channels</div>
          <h1 className="page-title">The MEGA Members
          </h1>
        </div>
        <button className="btn primary"><Icon name="plus" size={13} /> New company channel</button>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>All channels</div>
        <div className="stack" style={{ gap: 8 }}>
          {CHANNELS.map((c) => <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12 }}>
              <Avatar initials={c.avatar} color={c.color} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>#{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.kind === 'global' ? 'Global · all Mentorship members' : 'Company (Management)'} · {c.members} members</div>
              </div>
              <button className="btn ghost sm">Manage</button>
              <button className="btn sm">Post</button>
            </div>
          )}
        </div>
      </div>
    </>);

}

Object.assign(window, { AdminOverview, AdminMembers, AdminTasks, AdminSessions, AdminResources, AdminChat, MembersTable });