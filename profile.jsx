// profile.jsx — identity, milestones, and the full badge wall

// ── Badge helpers ──────────────────────────────────────────────
function badgePad2(n) { return n < 10 ? '0' + n : '' + n; }
function badgeYmd(d) { const x = new Date(d); return x.getFullYear() + '-' + badgePad2(x.getMonth() + 1) + '-' + badgePad2(x.getDate()); }
function badgeMondayKey(d) { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); return badgeYmd(x); }
function badgeLongestStreak(daySet) {
  const days = [...daySet].sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    if (prev) {
      const diff = Math.round((new Date(d + 'T00:00:00') - new Date(prev + 'T00:00:00')) / 86400000);
      cur = diff === 1 ? cur + 1 : 1;
    } else cur = 1;
    if (cur > best) best = cur;
    prev = d;
  }
  return best;
}

// Build the full 57+ badge catalog (grouped by category) from live metrics.
function computeBadgeCategories(member, sessions, focusRows, doneTasks, bd) {
  const past = sessions.filter((s) => s.status === 'past');
  const focusCount = focusRows.length;
  const focusHours = focusRows.reduce((a, r) => a + (r.duration_minutes || 0), 0) / 60;
  const taskCount = doneTasks.length;
  const sessionCount = past.length;
  const goals = (bd && bd.goals) || [];
  const goalsSet = goals.length;
  const goalsDone = goals.filter((g) => g.status === 'completed').length;
  const resourceCount = (bd && bd.resourceCount) || 0;
  const communityCount = (bd && bd.communityCount) || 0;
  const winsCount = (bd && bd.myWinsCount) || 0;
  const wotw = !!(bd && bd.wotw);

  // Active-day set (any completed task, focus session, or attended session)
  const daySet = new Set();
  doneTasks.forEach((t) => { if (t.completed_at) daySet.add(badgeYmd(t.completed_at)); });
  focusRows.forEach((f) => daySet.add(badgeYmd(f.started_at || f.created_at)));
  past.forEach((s) => { if (s.dateISO) daySet.add(s.dateISO); });
  const streak = badgeLongestStreak(daySet);

  const tenureDays = member.joinedAt ? Math.floor((Date.now() - new Date(member.joinedAt)) / 86400000) : 0;

  // Special / time-based
  const earlyBird = focusRows.some((f) => new Date(f.started_at || f.created_at).getHours() < 8) ||
    past.some((s) => s.startH != null && s.startH < 8);
  const nightOwl = focusRows.some((f) => new Date(f.started_at || f.created_at).getHours() >= 22);
  const weekendWarrior = [...daySet].some((d) => { const g = new Date(d + 'T00:00:00').getDay(); return g === 0 || g === 6; });

  // Per-week activity flags (Monday-keyed) for Perfect Week / Perfect Month
  const weeks = {};
  doneTasks.forEach((t) => { if (t.completed_at) (weeks[badgeMondayKey(t.completed_at)] = weeks[badgeMondayKey(t.completed_at)] || {}).task = true; });
  focusRows.forEach((f) => { const k = badgeMondayKey(f.started_at || f.created_at); (weeks[k] = weeks[k] || {}).focus = true; });
  past.forEach((s) => { if (s.dateISO) (weeks[badgeMondayKey(s.dateISO)] = weeks[badgeMondayKey(s.dateISO)] || {}).sess = true; });
  const isPerfect = (w) => w && w.task && w.focus && w.sess;
  const perfectWeek = Object.values(weeks).some(isPerfect);
  const monthAgg = {};
  Object.keys(weeks).forEach((k) => {
    const m = k.slice(0, 7);
    const a = monthAgg[m] = monthAgg[m] || { total: 0, perfect: 0 };
    a.total++; if (isPerfect(weeks[k])) a.perfect++;
  });
  const perfectMonth = Object.values(monthAgg).some((m) => m.total >= 4 && m.total === m.perfect);

  const profileComplete = !!(member.role && member.field && member.focus && (member.interests || []).length >= 1);

  let n = 0;
  const B = (name, desc, earned, prestige) => ({ id: 'b' + (n++), name, desc, earned: !!earned, prestige: !!prestige });

  return [
    { name: 'Focus Sessions', badges: [
      B('First Focus', 'Log 1 focus session', focusCount >= 1),
      B('Deep Worker', 'Log 10 focus sessions', focusCount >= 10),
      B('In The Zone', 'Log 25 focus sessions', focusCount >= 25),
      B('Flow State', 'Log 50 focus sessions', focusCount >= 50),
      B('The Practitioner', 'Log 100 focus sessions', focusCount >= 100),
      B('No Distraction', 'Log 200 focus sessions', focusCount >= 200, true),
    ] },
    { name: 'Focused Hours', badges: [
      B('Five Hours', 'Accumulate 5 focused hours', focusHours >= 5),
      B('Marathoner', 'Accumulate 25 focused hours', focusHours >= 25),
      B('Century', 'Accumulate 100 focused hours', focusHours >= 100),
      B('Iron Mind', 'Accumulate 250 focused hours', focusHours >= 250),
      B('500 Club', 'Accumulate 500 focused hours', focusHours >= 500, true),
    ] },
    { name: 'Tasks', badges: [
      B('First Task', 'Complete 1 task', taskCount >= 1),
      B('Task Streaker', 'Complete 5 tasks', taskCount >= 5),
      B('Finisher', 'Complete 20 tasks', taskCount >= 20),
      B('On A Roll', 'Complete 50 tasks', taskCount >= 50),
      B('Century Maker', 'Complete 100 tasks', taskCount >= 100),
      B('Machine', 'Complete 250 tasks', taskCount >= 250, true),
    ] },
    { name: 'Streaks', badges: [
      B('Three Day Run', 'Maintain a 3-day activity streak', streak >= 3),
      B('Week One', 'Maintain a 7-day activity streak', streak >= 7),
      B('Two Week Grind', 'Maintain a 14-day activity streak', streak >= 14),
      B('Monthly', 'Maintain a 30-day activity streak', streak >= 30),
      B('Unbreakable', 'Maintain a 60-day activity streak', streak >= 60),
      B('Relentless', 'Maintain a 90-day activity streak', streak >= 90),
      B('The Standard', 'Maintain a 180-day activity streak', streak >= 180, true),
    ] },
    { name: 'Sessions', badges: [
      B('First Session', 'Attend 1 session', sessionCount >= 1),
      B('Showing Up', 'Attend 5 sessions', sessionCount >= 5),
      B('All In', 'Attend 10 sessions', sessionCount >= 10),
      B('Committed', 'Attend 25 sessions', sessionCount >= 25),
      B('The Long Game', 'Attend 50 sessions', sessionCount >= 50),
    ] },
    { name: 'Goals', badges: [
      B('Goal Setter', 'Set your first goal', goalsSet >= 1),
      B('Goal Getter', 'Complete your first goal', goalsDone >= 1),
      B('North Star', 'Complete 5 goals', goalsDone >= 5),
      B('Purpose Driven', 'Complete 15 goals', goalsDone >= 15),
      B('Architect', 'Complete 30 goals', goalsDone >= 30),
    ] },
    { name: 'Resources', badges: [
      B('First Read', 'Access 1 resource', resourceCount >= 1),
      B('Knowledge Seeker', 'Access 10 resources', resourceCount >= 10),
      B('Hungry', 'Access 25 resources', resourceCount >= 25),
      B('Voracious', 'Access 50 resources', resourceCount >= 50),
    ] },
    { name: 'Community', badges: [
      B('Joined The Conversation', 'Make your first community contribution', communityCount >= 1),
      B('Regular', 'Make 10 community contributions', communityCount >= 10),
      B('Voice Of MEGA', 'Make 25 community contributions', communityCount >= 25),
    ] },
    { name: 'Wins', badges: [
      B('First Win', 'Share your first win', winsCount >= 1),
      B('On A High', 'Share 5 wins', winsCount >= 5),
      B('Momentum', 'Share 10 wins', winsCount >= 10),
      B('Win Collector', 'Share 25 wins', winsCount >= 25),
      B('Unstoppable', 'Share 50 wins', winsCount >= 50, true),
      B('Win Of The Week', 'Top-reacted win in a week', wotw),
    ] },
    { name: 'Milestones', badges: [
      B('Day One', 'Join Vantage', true),
      B('One Month', 'Be a member for 30 days', tenureDays >= 30),
      B('Quarter', 'Be a member for 90 days', tenureDays >= 90),
      B('Half Year', 'Be a member for 180 days', tenureDays >= 180),
      B('The Annual', 'Be a member for 365 days', tenureDays >= 365, true),
    ] },
    { name: 'Special / Rare', badges: [
      B('Early Bird', 'Focus or attend before 8:00 AM', earlyBird),
      B('Night Owl', 'Focus after 10:00 PM', nightOwl),
      B('Weekend Warrior', 'Log activity on a weekend', weekendWarrior),
      B('Perfect Week', 'Task + focus + session in one week', perfectWeek),
      B('Perfect Month', 'A Perfect Week every week of a month', perfectMonth),
      B('Profile Complete', 'Fill in every profile field', profileComplete),
    ] },
  ];
}

function BadgeTile({ badge, theme }) {
  const e = badge.earned, pr = badge.prestige;
  const iconBg = !e ? 'var(--border-strong)' :
    pr ? 'linear-gradient(135deg, #E8B24C, #F5D98B)' : 'linear-gradient(135deg, var(--accent), var(--coral))';
  const prestigeColor = e ? (theme === 'dark' ? '#FFFFFF' : '#B8860B') : 'var(--text-3)';
  return (
    <div style={{ padding:'16px 14px', borderRadius:14, border:'1px solid '+(e&&pr?'#E8B24C':'var(--border)'), background:e?'var(--bg-elev)':'var(--bg-sunken)', opacity:e?1:0.55, textAlign:'center', position:'relative' }}>
      {pr && <span style={{ position:'absolute', top:7, right:7, fontSize:7, fontFamily:'var(--ff-sub)', letterSpacing:'0.1em', textTransform:'uppercase', color:prestigeColor }}>Prestige</span>}
      <div style={{ width:52, height:52, margin:'0 auto 10px', borderRadius:14, background:iconBg, display:'grid', placeItems:'center', color:'#fff' }}>
        <Icon name={e ? (pr ? 'trophy' : 'star') : 'trophy'} size={22} />
      </div>
      <div style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>{badge.name}</div>
      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4, lineHeight:1.4 }}>{badge.desc}</div>
    </div>
  );
}

function BadgeModal({ categories, earnedCount, total, theme, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.4)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(880px, 92vw)', maxHeight:'86vh', zIndex:201, padding:0, boxShadow:'var(--shadow-3)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div className="eyebrow">Achievements</div>
            <div className="display" style={{ fontSize:24, marginTop:2 }}>All badges</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:13, color:'var(--text-3)' }}>{earnedCount} of {total} earned</div>
            <button onClick={onClose} style={{ color:'var(--text-3)', fontSize:16, background:'none', border:'none', cursor:'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ padding:'4px 24px 24px', overflowY:'auto' }}>
          {categories.map((cat) => (
            <div key={cat.name} style={{ marginTop:20 }}>
              <div className="row-between" style={{ marginBottom:10 }}>
                <div className="eyebrow" style={{ margin:0 }}>{cat.name}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>{cat.badges.filter((b) => b.earned).length}/{cat.badges.length}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {cat.badges.map((b) => <BadgeTile key={b.id} badge={b} theme={theme} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ProfileScreen({ member, theme, setTheme, onSignOut, onProfileSaved }) {
  const [sessions, setSessions] = React.useState([]);
  const [focusRows, setFocusRows] = React.useState([]);
  const [doneTasks, setDoneTasks] = React.useState([]);
  const [badgeData, setBadgeData] = React.useState(null);
  const [showAllBadges, setShowAllBadges] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ role:'', status:'', field:'', focus:'', interests:'' });

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await window._supabase.auth.getUser();
      const [sess, focus, tasksRes, goalsRes, winsMineRes, winsAllRes] = await Promise.all([
        window.fetchListSessions(),
        window.fetchFocusSessions(),
        user ? window._supabase.from('tasks').select('id, title, is_completed, completed_at').eq('user_id', user.id).eq('is_completed', true) : Promise.resolve({ data: [] }),
        user ? window._supabase.from('goals').select('id, status').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        user ? window._supabase.from('wins').select('id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
        window._supabase.from('wins').select('id, user_id, created_at').eq('is_public', true),
      ]);
      const [resourceCount, communityCount] = await Promise.all([
        window.fetchResourceViewCount(), window.fetchCommunityPostCount(),
      ]);

      // Win Of The Week: top-reacted win within its (Mon–Sun) week, attributed to its author
      let wotw = false;
      const allWins = winsAllRes.data || [];
      if (allWins.length) {
        const ids = allWins.map((w) => w.id);
        const { data: rx } = await window._supabase.from('win_reactions').select('win_id').in('win_id', ids);
        const rcount = {};
        (rx || []).forEach((r) => { rcount[r.win_id] = (rcount[r.win_id] || 0) + 1; });
        const weekMax = {};
        allWins.forEach((w) => { const k = badgeMondayKey(w.created_at); const c = rcount[w.id] || 0; if (c > (weekMax[k] || 0)) weekMax[k] = c; });
        wotw = allWins.some((w) => user && w.user_id === user.id && (rcount[w.id] || 0) > 0 && (rcount[w.id] || 0) === weekMax[badgeMondayKey(w.created_at)]);
      }

      if (!active) return;
      setSessions(sess);
      setFocusRows(focus);
      setDoneTasks(tasksRes.data || []);
      setBadgeData({ goals: goalsRes.data || [], resourceCount, communityCount, myWinsCount: (winsMineRes.data || []).length, wotw });
    })();
    return () => { active = false; };
  }, []);

  const pastSessions = sessions.filter((s) => s.status === 'past');
  const upcomingCount = sessions.filter((s) => s.status === 'upcoming').length;
  const totalMin = pastSessions.reduce((a, s) => a + Math.max(0, (s.endH - s.startH) * 60), 0);
  const totalLearning = `${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m`;

  // ── Milestones (derived from real activity) ──
  const milestones = [];
  if (member.joinedAt) milestones.push({ icon: 'star', color: 'var(--accent)', label: 'Joined Vantage', date: member.joinedAt, desc: `${member.product} · ${member.plan}` });
  const pastSorted = [...pastSessions].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (pastSorted.length) milestones.push({ icon: 'sessions', color: 'var(--accent)', label: 'First session attended', date: pastSorted[0].dateISO, desc: pastSorted[0].title });
  const focusSorted = [...focusRows].sort((a, b) => new Date(a.started_at || a.created_at) - new Date(b.started_at || b.created_at));
  if (focusSorted.length) milestones.push({ icon: 'clock', color: 'var(--teal-600)', label: 'First focus session', date: focusSorted[0].started_at || focusSorted[0].created_at, desc: `${focusSorted[0].duration_minutes || 0}m focused` });
  const tasksSorted = [...doneTasks].filter((t) => t.completed_at).sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
  if (tasksSorted.length) milestones.push({ icon: 'check', color: 'var(--teal-600)', label: 'First task completed', date: tasksSorted[0].completed_at, desc: tasksSorted[0].title });
  milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

  // ── Badges (computed on load from live data) ──
  const categories = computeBadgeCategories(member, sessions, focusRows, doneTasks, badgeData);
  const allBadges = categories.flatMap((c) => c.badges);
  const earned = allBadges.filter((b) => b.earned).length;
  // Compact wall: earned first, then the easiest locked badges, capped to three rows.
  const compact = [...allBadges].sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0)).slice(0, 12);

  const startEdit = () => {
    setForm({
      role: member.role || '', status: member.status || '', field: member.field || '',
      focus: member.focus || '', interests: (member.interests || []).join(', '),
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await window._supabase.auth.getUser();
    const interestsArr = form.interests.split(',').map((s) => s.trim()).filter(Boolean);
    const fields = {
      job_title: form.role.trim() || null,
      employment_status: form.status.trim() || null,
      field: form.field.trim() || null,
      focus_area: form.focus.trim() || null,
      interests: interestsArr,
    };
    const { error } = await window._supabase.from('profiles').update(fields).eq('id', user.id);
    setSaving(false);
    if (error) { console.error('Failed to save profile:', error.message); return; }
    if (onProfileSaved) onProfileSaved(fields);
    setEditing(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Profile</div>
          <h1 className="page-title">{member.firstName} {member.lastName}</h1>
        </div>
        {editing ?
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
          </div> :
          <button className="btn" onClick={startEdit}><Icon name="edit" size={13} /> Edit profile</button>
        }
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
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{earned} of {allBadges.length} earned</div>
              <button onClick={() => setShowAllBadges(true)} style={{ marginTop:6, background:'none', border:'none', padding:0, cursor:'pointer', color:'var(--accent)', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:4 }}>
                View all <Icon name="chevron-right" size={12} />
              </button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:16 }}>
            {compact.map((b) => <BadgeTile key={b.id} badge={b} theme={theme} />)}
          </div>
        </div>

        <div className="stack" style={{ gap:20 }}>
          {/* Personal info */}
          <div className="card" style={{ padding:22 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>Personal info</div>
            {editing ?
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 14px' }}>
                {[['Role','role'],['Status','status'],['Field','field'],['Focus area','focus']].map(([l,k]) => (
                  <div key={k}>
                    <div className="eyebrow" style={{ fontSize:10, marginBottom:4 }}>{l}</div>
                    <input className="input" style={{ fontSize:13 }} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ gridColumn:'1 / -1' }}>
                  <div className="eyebrow" style={{ fontSize:10, marginBottom:4 }}>Interests <span style={{ textTransform:'none', letterSpacing:0, color:'var(--text-3)' }}>(comma-separated)</span></div>
                  <input className="input" style={{ fontSize:13 }} value={form.interests} onChange={(e) => setForm((f) => ({ ...f, interests: e.target.value }))} placeholder="e.g. Public speaking, Running, Strategy" />
                </div>
              </div> :
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 18px' }}>
                  {[['Role',member.role],['Status',member.status],['Field',member.field],['Focus area',member.focus]].map(([l,v]) => (
                    <div key={l}>
                      <div className="eyebrow" style={{ fontSize:10 }}>{l}</div>
                      <div style={{ fontSize:13, marginTop:3, fontWeight:500, color:v?'var(--text)':'var(--text-3)' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
                <div className="hr" />
                <div className="eyebrow" style={{ marginBottom:8 }}>Interests</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(member.interests || []).length
                    ? member.interests.map((i) => <span key={i} className="chip">{i}</span>)
                    : <span style={{ fontSize:13, color:'var(--text-3)' }}>No interests added yet.</span>}
                </div>
              </>
            }
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

      {showAllBadges && <BadgeModal categories={categories} earnedCount={earned} total={allBadges.length} theme={theme} onClose={() => setShowAllBadges(false)} />}
    </>
  );
}

Object.assign(window, { ProfileScreen });
