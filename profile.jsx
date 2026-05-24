// profile.jsx — with milestone timeline

function BadgeTile({ badge }) {
  return (
    <div style={{ padding:'16px 14px', borderRadius:14, border:'1px solid var(--border)', background:badge.earned?'var(--bg-elev)':'var(--bg-sunken)', opacity:badge.earned?1:0.55, textAlign:'center' }}>
      <div style={{ width:52, height:52, margin:'0 auto 10px', borderRadius:14, background:badge.earned?'linear-gradient(135deg, var(--accent), var(--coral))':'var(--border-strong)', display:'grid', placeItems:'center', color:'#fff' }}>
        <Icon name={badge.earned?'star':'trophy'} size={22} />
      </div>
      <div style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>{badge.name}</div>
      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4, lineHeight:1.4 }}>{badge.desc}</div>
    </div>
  );
}

function ProfileScreen({ member, theme, setTheme, onSignOut }) {
  const [sessions, setSessions] = React.useState([]);
  const [focusRows, setFocusRows] = React.useState([]);
  const [doneTasks, setDoneTasks] = React.useState([]);

  React.useEffect(() => {
    let active = true;
    window.fetchListSessions().then(rows => { if (active) setSessions(rows); });
    window.fetchFocusSessions().then(rows => { if (active) setFocusRows(rows); });
    window._supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      window._supabase.from('tasks').select('id, title, is_completed, completed_at').eq('user_id', user.id).eq('is_completed', true)
        .then(({ data }) => { if (active) setDoneTasks(data || []); });
    });
    return () => { active = false; };
  }, []);

  const pastSessions = sessions.filter(s => s.status === 'past');
  const upcomingCount = sessions.filter(s => s.status === 'upcoming').length;
  const totalMin = pastSessions.reduce((a, s) => a + Math.max(0, (s.endH - s.startH) * 60), 0);
  const totalLearning = `${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m`;

  // ── Milestones (derived from real activity) ──
  const milestones = [];
  if (member.joinedAt) milestones.push({ icon: 'star', color: 'var(--accent)', label: 'Joined Vantage', date: member.joinedAt, desc: `${member.product} · ${member.plan}` });
  const pastSorted = [...pastSessions].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (pastSorted.length) milestones.push({ icon: 'sessions', color: 'var(--accent)', label: 'First session attended', date: pastSorted[0].dateISO, desc: pastSorted[0].title });
  const focusSorted = [...focusRows].sort((a, b) => new Date(a.started_at || a.created_at) - new Date(b.started_at || b.created_at));
  if (focusSorted.length) milestones.push({ icon: 'clock', color: 'var(--teal-600)', label: 'First focus session', date: focusSorted[0].started_at || focusSorted[0].created_at, desc: `${focusSorted[0].duration_minutes || 0}m focused` });
  const tasksSorted = [...doneTasks].filter(t => t.completed_at).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
  if (tasksSorted.length) milestones.push({ icon: 'check', color: 'var(--teal-600)', label: 'First task completed', date: tasksSorted[0].completed_at, desc: tasksSorted[0].title });
  milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

  // ── Badges (earned from real data) ──
  const totalFocusMin = focusRows.reduce((a, r) => a + (r.duration_minutes || 0), 0);
  const badges = [
    { id: 'b_sess1', name: 'First Session', desc: 'Attended your first session.', earned: pastSessions.length >= 1 },
    { id: 'b_focus1', name: 'First Focus', desc: 'Logged your first focus session.', earned: focusRows.length >= 1 },
    { id: 'b_task1', name: 'First Task', desc: 'Completed your first task.', earned: doneTasks.length >= 1 },
    { id: 'b_task5', name: 'Task Streaker', desc: 'Completed 5 tasks.', earned: doneTasks.length >= 5 },
    { id: 'b_focus10', name: 'Deep Worker', desc: 'Logged 10 focus sessions.', earned: focusRows.length >= 10 },
    { id: 'b_focus5h', name: '5 Hours In', desc: 'Focused for 5 hours in total.', earned: totalFocusMin >= 300 },
    { id: 'b_task20', name: 'Finisher', desc: 'Completed 20 tasks.', earned: doneTasks.length >= 20 },
    { id: 'b_focus25h', name: 'Marathoner', desc: 'Focused for 25 hours in total.', earned: totalFocusMin >= 1500 },
  ];
  const earned = badges.filter(b => b.earned).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Profile</div>
          <h1 className="page-title">{member.firstName} {member.lastName}</h1>
        </div>
        <button className="btn"><Icon name="edit" size={13} /> Edit profile</button>
      </div>

      {/* Identity card */}
      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'28px 28px 24px', display:'flex', gap:24, alignItems:'center' }}>
          <Avatar initials={member.initials} color={member.avatarColor} size={88} style={{ fontSize:32 }} />
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span className="chip sapphire"><span className="dot"/>{member.product}</span>
              <span className="chip teal"><span className="dot"/>{member.plan}</span>
              <span className="chip"><span className="dot" style={{ background:'var(--coral)' }}/>{member.level} · Tier {member.levelIndex+1}</span>
            </div>
            <div className="display" style={{ fontSize:36, marginTop:10, lineHeight:1 }}>{member.firstName} {member.lastName}</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:6 }}>
              {member.email} · Joined {member.joinedAt
                ? new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : 'Recently joined'}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, textAlign:'right' }}>
            <div>
              <div className="display" style={{ fontSize:32, color:'var(--accent)' }}>{member.points.toLocaleString()}</div>
              <div className="eyebrow">Points</div>
            </div>
            <div>
              <div className="display" style={{ fontSize:32, color:'var(--coral)' }}>{member.streakDays}</div>
              <div className="eyebrow">Day streak</div>
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderTop:'1px solid var(--border)' }}>
          {[['Total learning', totalLearning],['Sessions', `${pastSessions.length} done`],['Upcoming', `${upcomingCount} scheduled`]].map(([l,v],i) => (
            <div key={l} style={{ padding:'16px 20px', borderRight:i<2?'1px solid var(--border)':'none' }}>
              <div className="eyebrow" style={{ fontSize:10 }}>{l}</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone timeline */}
      <div style={{ marginBottom:20 }}>
        <MilestoneTimeline milestones={milestones} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 }}>
        {/* Badge wall */}
        <div className="card" style={{ padding:22 }}>
          <div className="row-between">
            <div>
              <div className="eyebrow">Achievements</div>
              <div className="display" style={{ fontSize:22, marginTop:4 }}>Badge wall</div>
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>{earned} of {badges.length} earned</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:16 }}>
            {badges.map(b => <BadgeTile key={b.id} badge={b} />)}
          </div>
        </div>

        <div className="stack" style={{ gap:20 }}>
          {/* Personal info */}
          <div className="card" style={{ padding:22 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>Personal info</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 18px' }}>
              {[['Role',member.role],['Status',member.status],['Field',member.field],['Focus area',member.focus]].map(([l,v]) => (
                <div key={l}>
                  <div className="eyebrow" style={{ fontSize:10 }}>{l}</div>
                  <div style={{ fontSize:13, marginTop:3, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="hr" />
            <div className="eyebrow" style={{ marginBottom:8 }}>Interests</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {member.interests.map(i => <span key={i} className="chip">{i}</span>)}
            </div>
          </div>

          {/* Settings */}
          <div className="card" style={{ padding:22 }}>
            <div className="eyebrow" style={{ marginBottom:12 }}>Appearance</div>
            <div className="row-between" style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>Theme</div>
              <div className="seg">
                <button className={theme==='light'?'on':''} onClick={()=>setTheme('light')}>Light</button>
                <button className={theme==='dark'?'on':''} onClick={()=>setTheme('dark')}>Dark</button>
              </div>
            </div>
            <div className="hr" />
            <div className="eyebrow" style={{ marginBottom:10 }}>Notifications</div>
            {[['Task assignments','In-app',true],['Task assignments','Email',true],['Session reminders','In-app',true],['Session reminders','Email',false],['Weekly digest','Email (Mon)',true]].map(([l,ch,on],i) => (
              <div key={i} className="row-between" style={{ padding:'8px 0', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{l}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{ch}</div>
                </div>
                <div style={{ width:36, height:20, borderRadius:999, background:on?'var(--accent)':'var(--border-strong)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                  <div style={{ position:'absolute', top:2, left:on?18:2, width:16, height:16, borderRadius:999, background:'#fff', transition:'left .15s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ marginTop:28, paddingTop:24, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
        <button
          className="btn"
          onClick={onSignOut}
          style={{ color:'var(--coral)', borderColor:'var(--coral)', gap:8 }}
        >
          <Icon name="arrow-right" size={13} style={{ transform:'rotate(180deg)', color:'var(--coral)' }} />
          Sign out
        </button>
      </div>
    </>
  );
}

Object.assign(window, { ProfileScreen });
