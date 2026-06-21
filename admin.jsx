// admin.jsx — Admin views (Overview, Members+ViewAs, Tasks, Sessions, Resources, Chat)
// AdminAnalytics is in analytics.jsx

const OV_PERF_COLORS = ['#0F52BA', '#4FB7A6', '#E8B24C', '#B79BED', '#FF6B6B'];
const OV_BAR_COLORS = ['var(--coral)', '#E8B24C', 'var(--teal-600)', 'var(--accent)', 'var(--text)', 'var(--sapphire)', 'var(--teal-600)'];
function ovInitials(n) { return (n || 'M').trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2); }
function ovPlan(tier) { return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Foundations'; }

function AdminOverview({ onPick }) {
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    window._supabase.rpc('admin_overview_stats').then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Overview stats failed:', error.message);
      setStats(error ? null : data);
      setLoading(false);
    });
    window._supabase.from('profiles').select('*').neq('role', 'admin').order('joined_at', { ascending: false })
      .then(({ data }) => { if (active) { setMembers(data || []); setMembersLoading(false); } });
    return () => { active = false; };
  }, []);

  const tiles = [
    { label: 'Active members',          v: stats?.active_members ?? 0,    sub: (stats?.recent_signups ? `+${stats.recent_signups} in last 30 days` : 'Members') },
    { label: 'Weekly engagement tasks', v: stats?.weekly_tasks ?? 0,      sub: 'Completed this week (Mon–Sun)' },
    { label: 'Assigned attendance',     v: stats?.weekly_attendance ?? 0, sub: 'Sessions attended this week' },
    { label: 'At-risk members',         v: stats?.at_risk ?? 0,           sub: 'No activity in 14 days', coral: true },
  ];

  const engagement = stats?.engagement || [];
  const engMax = Math.max(1, ...engagement.map((e) => e.count || 0));
  const engHasData = engagement.some((e) => (e.count || 0) > 0);
  const performers = stats?.top_performers || [];

  return (
    <>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-eyebrow">Admin · Overview</div>
          <h1 className="page-title xl" style={{ margin: '6px 0 0', color: 'var(--text)' }}>Mission control</h1>
          <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.6, opacity: 0.8 }}>
            {loading ? 'Loading live member data…'
              : `${stats?.active_members ?? 0} active of ${stats?.total_members ?? 0} members · ${stats?.recent_signups ?? 0} joined in the last 30 days.`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn" onClick={() => onPick('admin-tasks')}><span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>add</span> New task</button>
          <button className="btn primary" onClick={() => onPick('admin-sessions')}><span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>add</span> Schedule session</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {tiles.map((t, i) => {
          const ICONS = [{ mat: 'group', cls: 'primary' }, { mat: 'task_alt', cls: 'teal' }, { mat: 'event', cls: 'primary' }, { mat: 'warning', cls: 'coral' }];
          return (
            <div key={t.label} className="stat-tile">
              <div className={`stat-tile-icon ${ICONS[i].cls}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, lineHeight: 1, fontVariationSettings: "'FILL' 1" }}>{ICONS[i].mat}</span>
              </div>
              <div>
                <div className="stat-tile-label">{t.label}</div>
                <div className="stat-tile-value">{loading ? '—' : t.v}</div>
                {t.sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{t.sub}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row-between" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <div className="page-eyebrow" style={{ marginBottom: 0 }}>Members · recent activity</div>
            <button className="btn ghost sm" onClick={() => onPick('admin-members')}>View all <span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1}}>arrow_forward</span></button>
          </div>
          <MembersTable compact onViewAs={() => onPick('admin-members')} members={members} loading={membersLoading} />
        </div>

        <div className="stack" style={{ gap: 20 }}>
          <div className="bento-card" style={{ padding: 22 }}>
            <div className="page-eyebrow" style={{ marginBottom: 12 }}>Activity · last 7 days</div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '28px 0', textAlign: 'center' }}>Loading…</div>
            ) : !engHasData ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '28px 0', textAlign: 'center' }}>No activity yet this week.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${engagement.length}, 1fr)`, gap: 8, alignItems: 'end', height: 120 }}>
                {engagement.map((e, i) =>
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div className="bar" style={{ width: '100%', height: 100, position: 'relative' }}>
                      <span style={{ height: ((e.count || 0) / engMax * 100) + '%', background: OV_BAR_COLORS[i % OV_BAR_COLORS.length] }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{e.day}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bento-card" style={{ padding: 22 }}>
            <div className="page-eyebrow" style={{ marginBottom: 12 }}>Top performers · by XP</div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
            ) : performers.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No members yet.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {performers.map((m, i) =>
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="display" style={{ fontSize: 18, color: 'var(--text-3)', width: 18 }}>{i + 1}</div>
                    <Avatar initials={ovInitials(m.full_name)} color={OV_PERF_COLORS[i % OV_PERF_COLORS.length]} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name || 'Member'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ovPlan(m.membership_tier)}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{(m.xp_total || 0).toLocaleString()} XP</div>
                  </div>
                )}
              </div>
            )}
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
    if (!onViewAs) return;
    // Normalise the raw profile row to the shape the member shell expects
    // (name / initials / color / plan) so the banner + impersonated header render.
    onViewAs({
      ...m,
      name: m.full_name || 'Member',
      initials: (m.full_name || 'M').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      color: '#0F52BA',
      plan: m.membership_tier ? m.membership_tier.charAt(0).toUpperCase() + m.membership_tier.slice(1) : '—',
    });
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
                  {m.age_gate_state === 'manual_review' && (
                    <span className="chip" title="Under 16 — needs a manual safeguarding decision" style={{ color: 'var(--coral)', borderColor: 'var(--coral)55', background: 'var(--coral)15' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, lineHeight: 1 }}>shield_person</span>Review
                    </span>
                  )}
                  {m.age_gate_state === 'awaiting_consent' && (
                    <span className="chip" title="16–17 — awaiting parental consent" style={{ color: '#C88A1A', borderColor: '#C88A1A55', background: '#C88A1A15' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, lineHeight: 1 }}>hourglass_top</span>Consent
                    </span>
                  )}
                  {m.age_gate_state === 'blocked' && (
                    <span className="chip" title="Under 13 — blocked" style={{ color: 'var(--text-3)', borderColor: 'var(--text-3)55', background: 'var(--text-3)15' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, lineHeight: 1 }}>block</span>Under 13
                    </span>
                  )}
                </div>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{plan}</td>
              <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{lastActive}</td>
              <td style={{ padding: '12px 16px', fontWeight: 700 }}>{points.toLocaleString()}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: streak > 0 ? 'var(--coral)' : 'var(--text-3)' }}>
                  <span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1}}>local_fire_department</span>{streak}
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
                    View as <span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>arrow_forward</span>
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
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-eyebrow">Admin · Members</div>
          <h1 className="page-title" style={{ fontSize: 42, margin: '6px 0 0' }}>All Members</h1>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, opacity: 0.8 }}>Click "View as" to enter read-only member view for any account.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', width: 260 }}>
            <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,position:'absolute',left:12,top:12,color:'var(--text-3)'}}>search</span>
            <input className="input" style={{ paddingLeft: 34 }} placeholder="Search members…" />
          </div>
          <button className="btn primary" onClick={() => setShowInvite(true)}><span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>add</span> Invite member</button>
        </div>
      </div>
      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
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
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-eyebrow">Admin · Tasks & Goals</div>
          <h1 className="page-title" style={{ fontSize: 42, margin: '6px 0 0' }}>Assign the next move</h1>
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
            <button className="btn" style={{ justifyContent: 'center' }}><span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>add</span> New goal</button>
          </div>
        </div>
      </div>
    </>);

}

const SESSION_TIME_OPTS = (() => {
  const a = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    a.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return a;
})();
function fmtTime12(v) {
  const [h, m] = v.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  const d = h % 12 === 0 ? 12 : h % 12;
  return `${d}:${String(m).padStart(2, '0')} ${p}`;
}
function sessionDurLabel(s, e) {
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60), mm = mins % 60;
  const parts = [];
  if (h) parts.push(h + (h === 1 ? ' hr' : ' hrs'));
  if (mm) parts.push(mm + ' min');
  return ' · ' + parts.join(' ');
}

function AdminSessions() {
  const [type, setType] = React.useState('1:1');
  const [title, setTitle] = React.useState('');
  const [attendeeId, setAttendeeId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('17:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [recurrence, setRecurrence] = React.useState('does-not-repeat');
  const [agenda, setAgenda] = React.useState('');
  const [link, setLink] = React.useState('');
  const [members, setMembers] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [googleConnected, setGoogleConnected] = React.useState(false);
  const [googleEmail, setGoogleEmail] = React.useState('');
  const [connecting, setConnecting] = React.useState(false);

  React.useEffect(() => {
    window._supabase.from('profiles').select('id, full_name, email').order('full_name').
    then(({ data }) => setMembers(data || []));
    window._supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      window._supabase.from('profiles').select('google_connected, google_email').eq('id', user.id).single().
      then(({ data }) => {if (data) {setGoogleConnected(!!data.google_connected);setGoogleEmail(data.google_email || '');}});
    });
  }, []);

  const connectGoogle = async () => {
    setMsg(null);
    setConnecting(true);
    const { data, error } = await window._supabase.functions.invoke('google-oauth-start');
    if (error || !data?.url) {
      let detail = '';
      try {detail = (await error.context.json())?.error || '';} catch (_e) {}
      setConnecting(false);
      setMsg({ ok: false, text: 'Could not start Google connect' + (detail ? ': ' + detail : '') });
      return;
    }
    window.open(data.url, '_blank', 'noopener');
    let tries = 0;
    const poll = setInterval(async () => {
      tries++;
      const { data: { user } } = await window._supabase.auth.getUser();
      const { data: prof } = await window._supabase.from('profiles').select('google_connected, google_email').eq('id', user.id).single();
      if (prof?.google_connected) {
        setGoogleConnected(true);setGoogleEmail(prof.google_email || '');setConnecting(false);clearInterval(poll);
      } else if (tries > 40) {setConnecting(false);clearInterval(poll);}
    }, 3000);
  };

  const reset = () => {
    setTitle('');setAttendeeId('');setDate('');
    setStartTime('17:00');setEndTime('18:00');
    setRecurrence('does-not-repeat');setAgenda('');setLink('');
  };

  const onStartChange = (v) => {
    setStartTime(v);
    if (endTime <= v) {
      const idx = SESSION_TIME_OPTS.indexOf(v);
      setEndTime(SESSION_TIME_OPTS[Math.min(idx + 4, SESSION_TIME_OPTS.length - 1)]);
    }
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
    const attendee = type === '1:1' ? members.find((m) => m.id === attendeeId) : null;
    const { data: inserted, error } = await window._supabase.from('sessions').insert({
      type,
      title: title.trim(),
      session_date: date,
      start_time: startTime,
      end_time: endTime,
      mentor_name: mentorName,
      meeting_link: link.trim() || null,
      recurrence,
      agenda: agenda.trim() || null,
      attendee_id: type === '1:1' ? attendeeId : null,
      created_by: user?.id || null
    }).select().single();
    if (error) {setSaving(false);setMsg({ ok: false, text: error.message });return;}

    // Auto-attach a Google Meet link when connected and no manual link was given.
    let meetNote = '';
    if (googleConnected && !link.trim()) {
      const baseDesc = type === '1:1' ?
      `1:1 with ${attendee?.full_name || 'member'} — via Vantage` :
      `${title.trim()} — via Vantage`;
      const description = agenda.trim() ?
      `${baseDesc}\n\nAgenda:\n${agenda.trim()}` : baseDesc;
      const { data: mres, error: merr } = await window._supabase.functions.invoke('google-calendar-event', {
        body: {
          sessionId: inserted.id, title: title.trim(), dateISO: date,
          startTime, endTime,
          attendeeEmail: type === '1:1' ? attendee?.email || null : null,
          description
        }
      });
      if (merr) {
        let detail = '';
        try {detail = (await merr.context.json())?.error || '';} catch (_e) {}
        console.error('Meet link error:', detail || merr.message);
        meetNote = ' (Meet link not added' + (detail ? ': ' + detail : '') + ')';
      } else if (mres?.meeting_link) {
        meetNote = type === '1:1' ? ' Google Meet link added and the member was invited.' : ' Google Meet link added.';
      }
    }

    setSaving(false);
    const who = type === 'Town Hall' ?
    'all members' :
    attendee?.full_name || 'the member';
    setMsg({ ok: true, text: `Session scheduled for ${who}.` + meetNote });
    reset();
    setReloadKey((k) => k + 1);
  };

  return (
    <>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-eyebrow">Admin · Sessions</div>
          <h1 className="page-title" style={{ fontSize: 42, margin: '6px 0 0' }}>Schedule</h1>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, opacity: 0.8 }}>
            Create 1:1s and town halls. 1:1s appear only for the chosen member; town halls appear for everyone.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Calendar */}
        <div className="bento-card" style={{ padding: 24 }}>
          <Calendar isAdmin={true} reloadKey={reloadKey} />
        </div>

        {/* Create panel */}
        <div className="card" style={{ padding: 22, height: 'fit-content', position: 'sticky', top: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Create session</div>

          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
            {googleConnected ?
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--teal-600)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>Google connected{googleEmail ? ' · ' + googleEmail : ''}</span>
                <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={connectGoogle} disabled={connecting}>{connecting ? 'Waiting…' : 'Reconnect'}</button>
              </div> :

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-3)' }}>Connect Google to auto-add Meet links.</span>
                <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={connectGoogle} disabled={connecting}>{connecting ? 'Waiting…' : 'Connect Google'}</button>
              </div>
            }
          </div>

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
                <select className="input" style={{ fontSize: 13 }} value={startTime} onChange={(e) => onStartChange(e.target.value)}>
                  {SESSION_TIME_OPTS.map((v) => <option key={v} value={v}>{fmtTime12(v)}</option>)}
                </select>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>End</div>
                <select className="input" style={{ fontSize: 13 }} value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                  {SESSION_TIME_OPTS.filter((v) => v > startTime).map((v) => <option key={v} value={v}>{fmtTime12(v)}{sessionDurLabel(startTime, v)}</option>)}
                </select>
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

            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Agenda <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)', fontWeight: 400 }}>(optional · one bullet per line)</span></div>
              <textarea className="input" rows={4} placeholder={"Review last session's action items\nProgress update\nKey challenge this week\nNext steps"} value={agenda} onChange={(e) => setAgenda(e.target.value)} style={{ fontSize: 13, resize: 'vertical', fontFamily: 'var(--ff-body)', lineHeight: 1.5 }} />
            </div>

            <input className="input" placeholder={googleConnected ? 'Meeting link (leave blank to auto-create a Google Meet)' : 'Meeting link (optional)'} value={link} onChange={(e) => setLink(e.target.value)} />

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

// Upload / edit panel for a single resource.
function ResourceFormModal({ resource, onClose, onSaved }) {
  const editing = !!(resource && resource.id);
  // Source: an external link, or a file uploaded straight to private storage.
  const [source, setSource] = React.useState(resource && resource.storage_path ? 'upload' : 'link');
  const [file, setFile] = React.useState(null);
  const [title, setTitle] = React.useState(resource ? resource.title || '' : '');
  const [description, setDescription] = React.useState(resource ? resource.description || '' : '');
  const [contentType, setContentType] = React.useState(resource ? resource.content_type || 'video' : 'video');
  const [folder, setFolder] = React.useState(resource ? resource.folder || 'foundations' : 'foundations');
  const [subjectArea, setSubjectArea] = React.useState(resource ? resource.subject_area || '' : '');
  const [accessTier, setAccessTier] = React.useState(resource ? resource.access_tier || 'foundations' : 'foundations');
  const [url, setUrl] = React.useState(resource ? resource.url || '' : '');
  const [thumbnailUrl, setThumbnailUrl] = React.useState(resource ? resource.thumbnail_url || '' : '');
  const [duration, setDuration] = React.useState(resource && resource.duration_minutes != null ? String(resource.duration_minutes) : '');
  const [published, setPublished] = React.useState(resource ? resource.published !== false : true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  // Member assignment (bespoke resources).
  const [members, setMembers] = React.useState([]);
  const [assigned, setAssigned] = React.useState(() => new Set());
  const [memberQ, setMemberQ] = React.useState('');
  const initialAssigned = React.useRef(new Set());

  React.useEffect(() => {
    (async () => {
      const { data } = await window._supabase.rpc('list_members');
      setMembers((data || []).filter((m) => m.role !== 'admin'));
      if (editing) {
        const { data: a } = await window._supabase.from('resource_assignments').select('member_id').eq('resource_id', resource.id);
        const ids = new Set((a || []).map((r) => r.member_id));
        initialAssigned.current = ids;
        setAssigned(new Set(ids));
      }
    })();
  }, []);

  const toggleMember = (id) => setAssigned((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isUpload = source === 'upload';
  const effType = isUpload ? 'pdf' : contentType; // direct uploads are PDFs
  const memberList = members.filter((m) => !memberQ || (m.full_name || '').toLowerCase().includes(memberQ.toLowerCase()));

  const submit = async () => {
    setErr('');
    if (!title.trim()) {setErr('Please enter a title.');return;}
    if (isUpload) {
      if (!file && !(resource && resource.storage_path)) {setErr('Please choose a PDF file to upload.');return;}
    } else if (!url.trim()) {setErr('Please enter a resource URL.');return;}
    setSaving(true);

    // Upload the file first (if a new one was picked) so we have its storage path.
    let storagePath = resource && resource.storage_path || null;
    if (isUpload && file) {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)) + '/' + safe;
      const up = await window._supabase.storage.from('resource-files').upload(path, file, { upsert: false, contentType: file.type || 'application/pdf' });
      if (up.error) {setSaving(false);setErr('Upload failed: ' + up.error.message);return;}
      storagePath = up.data.path;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      content_type: effType,
      folder,
      subject_area: subjectArea || null,
      access_tier: accessTier,
      url: isUpload ? null : url.trim(),
      storage_path: isUpload ? storagePath : null,
      thumbnail_url: thumbnailUrl.trim() || null,
      duration_minutes: effType === 'video' && duration ? parseInt(duration, 10) : null,
      published };

    let resourceId = resource && resource.id;
    if (editing) {
      const { error } = await window._supabase.from('resources').update(payload).eq('id', resource.id);
      if (error) {setSaving(false);setErr(error.message);return;}
    } else {
      const { data, error } = await window._supabase.from('resources').insert(payload).select('id').single();
      if (error) {setSaving(false);setErr(error.message);return;}
      resourceId = data.id;
    }

    // Sync member assignments (diff against what was loaded).
    const cur = initialAssigned.current;
    const toDel = [...cur].filter((id) => !assigned.has(id));
    const toAdd = [...assigned].filter((id) => !cur.has(id));
    if (toDel.length) await window._supabase.from('resource_assignments').delete().eq('resource_id', resourceId).in('member_id', toDel);
    if (toAdd.length) await window._supabase.from('resource_assignments').insert(toAdd.map((m) => ({ resource_id: resourceId, member_id: m })));

    setSaving(false);
    onSaved();
    onClose();
  };

  const field = (label, node) =>
  <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {node}
    </div>;


  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.45)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 520, maxHeight: '88vh', overflow: 'auto', zIndex: 201, padding: 0, boxShadow: 'var(--shadow-3)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>{editing ? 'Edit resource' : 'Upload resource'}</div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <div className="stack" style={{ gap: 12 }}>
            {field('Title', <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />)}
            {field('Description', <textarea className="input" rows={3} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'none', lineHeight: 1.5 }} />)}

            {field('Source',
            <div style={{ display: 'flex', gap: 6 }}>
                {[['link', 'link', 'External link'], ['upload', 'upload', 'Upload PDF']].map(([key, icon, label]) =>
                <button key={key} onClick={() => setSource(key)} type="button"
                style={{ flex: 1, padding: '9px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                  border: '1px solid ' + (source === key ? 'var(--accent)' : 'var(--border)'),
                  background: source === key ? 'var(--accent)' : 'var(--bg-elev)',
                  color: source === key ? '#fff' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>{icon === 'upload' ? 'upload_file' : 'link'}</span>{label}
                  </button>)}
              </div>)}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {isUpload ?
              field('Content type', <input className="input" value="PDF (uploaded file)" disabled style={{ fontSize: 13, opacity: 0.7 }} />) :
              field('Content type',
              <select className="input" style={{ fontSize: 13 }} value={contentType} onChange={(e) => setContentType(e.target.value)}>
                  {RES_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>)}
              {field('Folder',
              <select className="input" style={{ fontSize: 13 }} value={folder} onChange={(e) => setFolder(e.target.value)}>
                  {RES_FOLDERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {field('Subject area',
              <select className="input" style={{ fontSize: 13 }} value={subjectArea} onChange={(e) => setSubjectArea(e.target.value)}>
                  <option value="">None</option>
                  {RES_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>)}
              {field('Access tier',
              <select className="input" style={{ fontSize: 13 }} value={accessTier} onChange={(e) => setAccessTier(e.target.value)}>
                  <option value="foundations">Foundations and Breakthrough</option>
                  <option value="breakthrough">Breakthrough only</option>
                  <option value="mega_management">MEGA Management only</option>
                </select>)}
            </div>
            {isUpload ?
            field('PDF file',
            <div>
                <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files && e.target.files[0] || null)}
                style={{ fontSize: 12, color: 'var(--text-2)' }} />
                {editing && resource.storage_path && !file &&
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>A file is already uploaded. Choose a new one to replace it.</div>}
              </div>) :
            field('Resource URL', <input className="input" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />)}
            {field('Thumbnail URL', <input className="input" placeholder="Optional" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />)}
            {effType === 'video' && field('Duration (minutes)',
            <input className="input" type="number" min="0" placeholder="Optional" value={duration} onChange={(e) => setDuration(e.target.value)} />)}

            {field('Assign to members (optional)',
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <input className="input" placeholder="Search members…" value={memberQ} onChange={(e) => setMemberQ(e.target.value)}
                style={{ border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0, fontSize: 12 }} />
                <div style={{ maxHeight: 132, overflow: 'auto' }}>
                  {memberList.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-3)' }}>No members found.</div>}
                  {memberList.map((m) =>
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={assigned.has(m.id)} onChange={() => toggleMember(m.id)} />
                      <span style={{ flex: 1 }}>{m.full_name || 'Member'}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{m.membership_tier || ''}</span>
                    </label>)}
                </div>
              </div>)}
            <div style={{ fontSize: 11, color: assigned.size > 0 ? 'var(--coral)' : 'var(--text-3)', lineHeight: 1.5, marginTop: -4 }}>
              {assigned.size > 0
                ? `Private to ${assigned.size} selected member${assigned.size > 1 ? 's' : ''}. The access tier and folder are ignored — only these members will see it.`
                : 'Leave empty to share by tier/folder as usual. Select members to make this a private, bespoke resource.'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Published</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{published ? 'Visible to members' : 'Hidden from members'}</div>
              </div>
              <button onClick={() => setPublished((p) => !p)} role="switch" aria-checked={published}
              style={{ width: 36, height: 20, borderRadius: 999, background: published ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', cursor: 'pointer', transition: 'background .15s', border: 'none', padding: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: published ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
              </button>
            </div>

            {err && <div style={{ fontSize: 12, color: 'var(--coral)', background: 'var(--coral-100)', borderRadius: 8, padding: '8px 12px' }}>{err}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={!title.trim() || saving || (isUpload ? !file && !(editing && resource.storage_path) : !url.trim())} onClick={submit}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Upload'}</button>
            </div>
          </div>
        </div>
      </div>
    </>);

}

function AdminResources() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null); // null | {} (new) | row (edit)
  const [copiedId, setCopiedId] = React.useState(null);
  const [err, setErr] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await window._supabase.
    from('resources').select('*, resource_assignments(member_id)').order('created_at', { ascending: false });
    if (error) setErr(error.message); else setRows((data || []).map((r) => ({ ...r, _assignedCount: (r.resource_assignments || []).length })));
    setLoading(false);
  }, []);

  React.useEffect(() => {load();}, [load]);

  const copyLink = (r) => {
    if (!r.url) return; // uploaded files have no shareable permanent link
    navigator.clipboard.writeText(r.url);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId((c) => c === r.id ? null : c), 1500);
  };

  const del = async (r) => {
    if (!window.confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    const { error } = await window._supabase.from('resources').delete().eq('id', r.id);
    if (error) {setErr(error.message);return;}
    if (r.storage_path) await window._supabase.storage.from('resource-files').remove([r.storage_path]);
    load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Resources</div>
          <h1 className="page-title">Resource manager.</h1>
        </div>
        <button className="btn primary" onClick={() => setModal({})}><span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>add</span> Upload resource</button>
      </div>

      {err && <div style={{ fontSize: 12, color: 'var(--coral)', background: 'var(--coral-100)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{err}</div>}

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
            {rows.map((r) =>
            <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                  {r.title}
                  {r.storage_path && <span className="chip" style={{ marginLeft: 8, fontSize: 9 }}><span className="material-symbols-outlined" style={{fontSize:10,lineHeight:1}}>upload_file</span> File</span>}
                  {r.published === false && <span className="chip coral" style={{ marginLeft: 8, fontSize: 9 }}>Draft</span>}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{RES_FOLDER_LABEL[r.folder] || r.folder}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="chip"><span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>{({'video':'videocam','pdf':'picture_as_pdf','template':'description','article':'article'}[(RES_TYPE_META[r.content_type] || {}).icon] || 'link')}</span> {(RES_TYPE_META[r.content_type] || {}).label || r.content_type}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>{r._assignedCount > 0
                  ? <span className="chip coral"><span className="material-symbols-outlined" style={{fontSize:10,lineHeight:1}}>person</span> Private · {r._assignedCount}</span>
                  : <span className={'chip ' + (RES_ACCESS_CHIP[r.access_tier] || '')}>{RES_ACCESS_LABEL[r.access_tier] || r.access_tier}</span>}</td>
                <td style={{ padding: '12px 16px' }}>{r.subject_area ? <SubjectTag subject={r.subject_area} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{resRelTime(r.created_at)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {r.url &&
                    <button className="btn ghost sm" onClick={() => copyLink(r)}>
                      <span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>{copiedId === r.id ? 'check' : 'content_copy'}</span> {copiedId === r.id ? 'Copied' : 'Copy link'}
                    </button>}
                    <button className="btn ghost sm" onClick={() => setModal(r)}><span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>edit</span> Edit</button>
                    <button className="btn ghost sm" onClick={() => del(r)} style={{ color: 'var(--coral)' }}><span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>delete</span></button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!loading && rows.length === 0 &&
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            No resources yet. Click <strong>Upload resource</strong> to add the first one.
          </div>
        }
        {loading &&
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
        }
      </div>

      {modal && <ResourceFormModal resource={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={load} />}
    </>);

}

// Admin "Chat" page reuses the real multi-channel chat. Admins get the
// "New channel" control (gated by isAdmin inside ChatScreen).
function AdminChat() {
  return <ChatScreen />;
}

Object.assign(window, { AdminOverview, AdminMembers, AdminTasks, AdminSessions, AdminResources, AdminChat, MembersTable });