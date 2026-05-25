// dashboard.jsx — updated with focus timer linking, weekly focus breakdown, intention card, Eisenhower

const { useState, useEffect, useRef } = React;

// ─── Focus session data (Supabase) ────────────────────────────────────────────
if (!window.FOCUS_LOG) window.FOCUS_LOG = {}; // legacy, retained for task time refs

async function fetchFocusSessions() {
  const { data: { user } } = await window._supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await window._supabase
    .from('focus_sessions')
    .select('id, duration_minutes, label, subject, linked_kind, started_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('Failed to load focus sessions:', error.message); return []; }
  return data || [];
}
function focusYmd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function focusWeekStart() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d; }
function fmtMins(m) { return `${Math.floor(m/60)}h ${m%60}m`; }

// ─── Shared focus-timer helpers (the live timer state lives in App) ────────────
// Wall-clock remaining (seconds) for the shared timer object, so the countdown
// stays accurate across collapse, navigation, and background-tab throttling.
function focusTimerRemaining(t) {
  if (!t) return 0;
  if (t.paused) return t.remainingSec || 0;
  if (t.endsAt == null) return t.remainingSec || 0;
  return Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
}
// Forces a 1s re-render only while `active`, so per-second ticking is localised
// to the components actually showing a countdown (not the whole app tree).
function useNowTick(active) {
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}
Object.assign(window, { fetchFocusSessions, focusYmd, focusWeekStart, fmtMins, focusTimerRemaining, useNowTick });

// ─── Focus Timer with task-linking ────────────────────────────────────────────
function FocusTimerModal({ tasks, goals, setTasks, onStart, onClose }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [newGoalId, setNewGoalId] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [errNew, setErrNew] = useState('');

  const options = tasks
    .filter(t => !t.is_completed)
    .map(t => ({ id:t.id, label:t.title, subject:t.subject, kind:'task' }));
  const filtered = options.filter(o => q==='' || o.label.toLowerCase().includes(q.toLowerCase()));
  const noTaskMatch = q.trim() !== '' && filtered.filter(o => o.kind === 'task').length === 0;

  const createTask = async () => {
    setErrNew('');
    setSavingNew(true);
    const { data: { user } } = await window._supabase.auth.getUser();
    const { data, error } = await window._supabase.from('tasks').insert({
      user_id: user.id,
      title: q.trim(),
      priority: 'Routine',
      goal_id: newGoalId || null,
      order_index: 0,
    }).select('*, roadmap_step:roadmap_steps(title, goal_id)').single();
    setSavingNew(false);
    if (error) { setErrNew(error.message); return; }
    const mapped = window.mapTaskRow ? window.mapTaskRow(data) : data;
    if (setTasks) setTasks(ts => [mapped, ...ts]);
    setSelected({ id: data.id, label: data.title, subject: data.subject || null, kind: 'task' });
    setNewGoalId('');
    setQ('');
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:460, maxHeight:'78vh', overflow:'auto', zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
        <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)' }}>
          <div className="display" style={{ fontSize:26, marginBottom:4 }}>Start a focus session</div>
          <div style={{ fontSize:13, color:'var(--text-2)' }}>Link this session to a task to track your time.</div>
        </div>
        <div style={{ padding:'14px 24px 0' }}>
          <div style={{ position:'relative' }}>
            <Icon name="search" size={14} style={{ position:'absolute', left:12, top:12, color:'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft:34, fontSize:13 }} placeholder="Search your tasks…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
        <div style={{ padding:'12px 24px', maxHeight:280, overflow:'auto' }}>
          {['task'].map(kind => {
            const items = filtered.filter(o=>o.kind===kind);
            if (!items.length) return null;
            return (
              <div key={kind} style={{ marginBottom:12 }}>
                <div className="eyebrow" style={{ marginBottom:6 }}>Tasks</div>
                {items.map(o => (
                  <button key={o.id} onClick={() => setSelected(o)} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'9px 10px', width:'100%',
                    borderRadius:9, border:'1.5px solid '+(selected?.id===o.id?'var(--accent)':'var(--border)'),
                    background: selected?.id===o.id?'var(--accent-soft)':'var(--bg-elev)',
                    cursor:'pointer', textAlign:'left', marginBottom:5, transition:'all .12s'
                  }}>
                    <div style={{ width:26,height:26,borderRadius:7,background:selected?.id===o.id?'var(--accent-soft)':'var(--bg-sunken)',display:'grid',placeItems:'center',color:kind==='goal'?'var(--teal-600)':'var(--accent)',flexShrink:0 }}>
                      <Icon name={kind==='goal'?'target':'tasks'} size={13} />
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.label}</div>
                      {o.subject && <div style={{ fontSize:10,color:'var(--text-3)',marginTop:1 }}>{o.subject}</div>}
                    </div>
                    {selected?.id===o.id && <Icon name="check" size={13} stroke={3} style={{ color:'var(--accent)',flexShrink:0 }} />}
                  </button>
                ))}
              </div>
            );
          })}
          {noTaskMatch && (
            <div style={{ border:'1px dashed var(--border)', borderRadius:10, padding:'12px 14px', background:'var(--bg-sunken)', marginTop:4 }}>
              <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:10 }}>No task matches “<strong>{q.trim()}</strong>”. Create it?</div>
              {goals.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div className="eyebrow" style={{ marginBottom:6 }}>Link to goal (optional)</div>
                  <select className="input" style={{ fontSize:13 }} value={newGoalId} onChange={e=>setNewGoalId(e.target.value)}>
                    <option value="">No goal</option>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
              )}
              {errNew && <div style={{ fontSize:11, color:'var(--coral)', marginBottom:8 }}>{errNew}</div>}
              <button className="btn primary sm" disabled={savingNew} onClick={createTask} style={{ width:'100%', justifyContent:'center' }}>
                <Icon name="plus" size={12} /> {savingNew ? 'Creating…' : `Create task “${q.trim()}”`}
              </button>
            </div>
          )}
        </div>
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
          <button className="btn primary" style={{ flex:1, justifyContent:'center' }} disabled={!selected} onClick={() => onStart(selected)}>
            <Icon name="play" size={13} /> Start focus session
          </button>
          <button className="btn ghost" onClick={() => onStart(null)}>Start without linking</button>
        </div>
      </div>
    </>
  );
}

const DashPomodoro = ({ gameMode, tasks, goals, setTasks, focusRows, focus }) => {
  const [durationMin, setDurationMin] = useState(25);
  const [linkedItem, setLinkedItem] = useState(null); // setup-only display
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  const t = focus && focus.state;
  const isRunning = !!t && t.running;
  useNowTick(isRunning && !t.paused);

  const adjust = (delta) => {
    if (isRunning) return;
    setDurationMin(d => Math.min(120, Math.max(5, d + delta)));
  };

  const startWith = (item) => { setLinkedItem(item); setShowPicker(false); focus.start(item, durationMin); };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const r = await focus.save();
    setSaving(false);
    setLinkedItem(null);
    if (r) { setSavedNote(`✓ Saved ${r.elapsedMin}m${r.linked ? ' to "' + r.linked.label + '"' : ''}`); setTimeout(() => setSavedNote(''), 4000); }
  };

  const remaining = isRunning ? window.focusTimerRemaining(t) : durationMin * 60;
  const totalSec = isRunning ? t.totalSec : durationMin * 60;
  const mm = String(Math.floor(remaining/60)).padStart(2,'0');
  const ss = String(remaining%60).padStart(2,'0');
  const pct = totalSec ? (1 - remaining/totalSec) * 100 : 0;
  const done = isRunning && remaining <= 0;
  const shownLink = isRunning ? t.linked : linkedItem;
  const greenBtn = { flex:1, justifyContent:'center', background:'var(--teal-600)', color:'#fff', borderColor:'var(--teal-600)' };
  const weekMin = (focusRows || []).filter(r => new Date(r.started_at || r.created_at) >= focusWeekStart()).reduce((a, r) => a + (r.duration_minutes || 0), 0);

  return (
    <>
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="eyebrow">Focus timer</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{fmtMins(weekMin)} this week</div>
        </div>
        {shownLink && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, padding:'6px 10px', background:'var(--accent-soft)', borderRadius:8, border:'1px solid var(--accent)' }}>
            <Icon name={shownLink.kind==='goal'?'target':'tasks'} size={12} style={{ color:'var(--accent)' }} />
            <span style={{ fontSize:12, color:'var(--accent)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{shownLink.label}</span>
            {!isRunning && <button onClick={() => setLinkedItem(null)} style={{ fontSize:11, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer' }}>✕</button>}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:8 }}>
          <span className="display mono" style={{ fontSize:46, letterSpacing:'0.02em' }}>{mm}:{ss}</span>
          <span className="sub" style={{ fontSize:13, color:'var(--text-3)' }}>{isRunning && t.paused ? 'paused' : 'pomodoro'}</span>
        </div>
        <div className="progress" style={{ marginTop:10 }}><span style={{ width: pct+'%' }} /></div>
        {!isRunning && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12 }}>
            <span className="eyebrow" style={{ margin:0 }}>Session length</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button className="btn ghost sm" onClick={() => adjust(-5)} disabled={durationMin<=5} style={{ minWidth:36, justifyContent:'center' }}>−5</button>
              <span style={{ fontSize:14, fontWeight:700, minWidth:56, textAlign:'center', fontFamily:'var(--ff-sub)', letterSpacing:'0.04em' }}>{durationMin} min</span>
              <button className="btn ghost sm" onClick={() => adjust(5)} disabled={durationMin>=120} style={{ minWidth:36, justifyContent:'center' }}>+5</button>
            </div>
          </div>
        )}
        {done && <div style={{ marginTop:8, fontSize:12, color:'var(--teal-600)', fontWeight:600 }}>✓ Session complete — save it to log your focus time</div>}
        {savedNote && <div style={{ marginTop:8, fontSize:12, color: savedNote[0]==='✓' ? 'var(--teal-600)' : 'var(--coral)', fontWeight:600 }}>{savedNote}</div>}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          {isRunning ? (
            <>
              <button className="btn" onClick={() => t.paused ? focus.resume() : focus.pause()} style={{ justifyContent:'center' }}>
                <Icon name={t.paused ? 'play' : 'pause'} size={14} /> {t.paused ? 'Resume' : 'Pause'}
              </button>
              <button className="btn" onClick={handleSave} disabled={saving} style={greenBtn}><Icon name="check" size={14} /> {saving?'Saving…':'Save'}</button>
              <button className="btn" onClick={() => { focus.reset(); setLinkedItem(null); }}>Reset</button>
            </>
          ) : (
            <button className="btn primary" onClick={() => setShowPicker(true)} style={{ flex:1, justifyContent:'center' }}><Icon name="play" size={14} /> Start focus</button>
          )}
        </div>
      </div>
      {showPicker && <FocusTimerModal tasks={tasks} goals={goals} setTasks={setTasks} onStart={startWith} onClose={() => setShowPicker(false)} />}
    </>
  );
};

// ─── Weekly Focus Breakdown ───────────────────────────────────────────────────
const DashFocusBreakdown = ({ focusRows }) => {
  const ws = focusWeekStart();
  const week = (focusRows || []).filter(r => new Date(r.started_at || r.created_at) >= ws);
  const bySubj = {};
  week.forEach(r => { const k = r.subject || 'General'; bySubj[k] = (bySubj[k] || 0) + (r.duration_minutes || 0); });
  const list = Object.entries(bySubj).map(([subject, minutes]) => ({ subject, minutes })).sort((a, b) => b.minutes - a.minutes);
  const total = list.reduce((a, s) => a + s.minutes, 0);
  const maxMin = Math.max(...list.map(s => s.minutes), 1);
  return (
    <div className="card" style={{ padding:22 }}>
      <div className="row-between" style={{ marginBottom:16 }}>
        <div>
          <div className="eyebrow">Focus this week · by subject</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>
            Total: <strong>{fmtMins(total)}</strong>
          </div>
        </div>
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize:13, color:'var(--text-3)', padding:'8px 0' }}>No focus time logged this week yet. Start a focus session and hit Save to track it here.</div>
      ) : (
        <div className="stack" style={{ gap:10 }}>
          {list.map(s => {
            const color = SUBJECTS[s.subject] || '#888';
            return (
              <div key={s.subject}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ fontWeight:600, color:'var(--text)' }}>{s.subject}</span>
                  <span style={{ color:'var(--text-3)', fontFamily:'var(--ff-sub)', letterSpacing:'0.04em' }}>{fmtMins(s.minutes)}</span>
                </div>
                <div style={{ height:7, background:'var(--bg-sunken)', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:(s.minutes/maxMin*100)+'%', borderRadius:999, background:color, transition:'width .4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Streak ───────────────────────────────────────────────────────────────────
const DashStreak = ({ days, gameMode }) => (
  <div className="card" style={{ padding:20, display:'flex', alignItems:'center', gap:14 }}>
    <div style={{ width:52, height:52, borderRadius:14, background:'var(--coral-100)', color:'var(--coral)', display:'grid', placeItems:'center' }}>
      <Icon name="flame" size={26} className="streak-flame" />
    </div>
    <div>
      <div className="eyebrow">Streak</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        <span className="display" style={{ fontSize:38, color:'var(--coral)' }}>{days}</span>
        <span className="sub" style={{ fontSize:14, color:'var(--text-2)' }}>weekdays</span>
      </div>
    </div>
    {gameMode==='loud' && <div style={{ marginLeft:'auto', background:'linear-gradient(90deg, var(--coral), #FFA270)', color:'#fff', padding:'6px 10px', borderRadius:999, fontFamily:'var(--ff-sub)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase' }}>On fire</div>}
  </div>
);

// ─── Level ────────────────────────────────────────────────────────────────────
const DashLevel = ({ member }) => {
  const t = xpTier(member.xp);
  return (
    <div className="card" style={{ padding:20 }}>
      <div className="eyebrow">Level</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:2 }}>
        <div className="display" style={{ fontSize:34 }}>{t.name}</div>
        <div className="sub" style={{ fontSize:13, color:'var(--text-3)' }}>Tier {t.tier} / 8</div>
      </div>
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-3)', marginBottom:6 }}>
          <span>{t.xp.toLocaleString()} XP</span>
          <span>{t.isMax ? 'Max Tier Reached' : `${t.toNext.toLocaleString()} to ${t.next.name}`}</span>
        </div>
        <div className="progress"><span style={{ width:t.pct+'%' }} /></div>
      </div>
      <div style={{ display:'flex', gap:3, marginTop:14 }}>
        {XP_TIERS.map((lt,i) => (
          <div key={lt.tier} title={`${lt.name} · ${lt.min.toLocaleString()} XP`} style={{ flex:1, textAlign:'center', fontSize:8, letterSpacing:'0.04em', textTransform:'uppercase', fontFamily:'var(--ff-sub)', color:i<=t.index?'var(--text)':'var(--text-3)', fontWeight:i===t.index?700:500, padding:'6px 0 0', borderTop:i<=t.index?'2px solid var(--accent)':'2px solid var(--border)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'clip' }}>{lt.tier}</div>
        ))}
      </div>
    </div>
  );
};

// ─── Upcoming session card ────────────────────────────────────────────────────
const startMsOf = (s) => {
  const d = new Date(s.date + 'T00:00');
  d.setHours(Math.floor(s.startH), Math.round((s.startH % 1) * 60), 0, 0);
  return d.getTime();
};

const DashUpcoming = ({ onJoin }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    window.fetchCalSessions().then(rows => { if (active) { setSessions(rows); setLoading(false); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const s = sessions.filter(x => x.status === 'upcoming').sort((a, b) => startMsOf(a) - startMsOf(b))[0];

  if (loading) {
    return (
      <div className="card" style={{ padding:22 }}>
        <div className="eyebrow" style={{ margin:0 }}>Next up</div>
        <div style={{ fontSize:13, color:'var(--text-3)', marginTop:8 }}>Loading…</div>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="card" style={{ padding:22 }}>
        <div className="eyebrow" style={{ margin:0 }}>Next up</div>
        <div className="display" style={{ fontSize:22, marginTop:8, lineHeight:1.1 }}>No upcoming sessions</div>
        <div style={{ fontSize:13, color:'var(--text-2)', marginTop:6 }}>You're all caught up. Your mentor will schedule your next session soon.</div>
      </div>
    );
  }

  const remaining = Math.max(0, Math.round((startMsOf(s) - now) / 60000));
  const days = Math.floor(remaining / 1440);
  const h = Math.floor(remaining % 1440 / 60), m = remaining % 60;
  const countdown = days > 0 ? `${days}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  const dateLabel = new Date(s.date + 'T12:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  const timeLabel = `${fmtH(s.startH)} – ${fmtH(s.endH)} GST`;

  return (
    <>
      <div className="card" style={{ padding:0, overflow:'hidden', cursor:'pointer' }} onClick={() => setModalOpen(true)}>
        <div style={{ padding:'14px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-sunken)' }}>
          <div className="eyebrow" style={{ margin:0 }}>Next up · click to view agenda</div>
          <div className={"chip " + (s.type === 'Town Hall' ? 'coral' : 'sapphire')}><span className="dot"/>{s.type}</div>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div className="sub" style={{ fontSize:13, color:'var(--text-3)', letterSpacing:'0.06em' }}>{dateLabel} · {timeLabel}</div>
          <div className="display" style={{ fontSize:24, marginTop:6, lineHeight:1.1, maxWidth:520 }}>{s.title}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18, gap:16, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Avatar initials={s.mInit} color={s.mColor} size={32} />
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{s.mentor}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>Your mentor</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ textAlign:'right' }}>
                <div className="eyebrow" style={{ fontSize:10 }}>Starts in</div>
                <div style={{ fontFamily:'var(--ff-display)', fontSize:22, lineHeight:1 }}>{countdown}</div>
              </div>
              <button className="btn primary" onClick={e=>{e.stopPropagation();onJoin(s);}}>Join <Icon name="arrow-right" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && <SessionDetailModal session={s} onClose={() => setModalOpen(false)} isAdmin={false} />}
    </>
  );
};

// ─── Stats row ────────────────────────────────────────────────────────────────

// Activity tiles — rendered conditionally by membership plan (Section 6 of the XP brief).
// Breakthrough sees 1:1 Sessions; Foundations sees Focus Time this week instead.
const DashStats = ({ member, tasks, goals, focusRows }) => {
  const [attend, setAttend] = useState({ townHall: 0, oneToOne: 0 });
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await window._supabase.auth.getUser();
      if (!user) return;
      const { data } = await window._supabase
        .from('points_log').select('source')
        .eq('user_id', user.id).in('source', ['town_hall', 'one_to_one']);
      if (!active) return;
      const c = { townHall: 0, oneToOne: 0 };
      (data || []).forEach((r) => { if (r.source === 'town_hall') c.townHall++; else if (r.source === 'one_to_one') c.oneToOne++; });
      setAttend(c);
    })();
    return () => { active = false; };
  }, []);

  const isBreakthrough = member.plan === 'Breakthrough';
  const tasksDone = (tasks || []).filter((t) => t.is_completed).length;
  const goalsDone = (goals || []).filter((g) => g.status === 'completed').length;
  const weekMin = (focusRows || [])
    .filter((r) => new Date(r.started_at || r.created_at) >= focusWeekStart())
    .reduce((a, r) => a + (r.duration_minutes || 0), 0);

  const firstTile = isBreakthrough
    ? { label:'1:1 Sessions', v:attend.oneToOne, sub:'completed', color:'var(--accent)' }
    : { label:'Focus Time',   v:fmtMins(weekMin), sub:'this week', color:'var(--accent)' };

  const items = [
    firstTile,
    { label:'Tasks',      v:tasksDone,       sub:'completed', color:'var(--teal-600)' },
    { label:'Goals',      v:goalsDone,       sub:'completed', color:'var(--coral)'    },
    { label:'Town Halls', v:attend.townHall, sub:'attended',  color:'#E8B24C'         },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, minWidth:0 }}>
      {items.map((it) => (
        <div key={it.label} className="card" style={{ padding:'18px 18px 16px', borderRadius:22, minWidth:0 }}>
          <div className="eyebrow" style={{ fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.label}</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:10 }}>
            <span className="display" style={{ fontSize: typeof it.v === 'string' && it.v.length > 4 ? 28 : 38, lineHeight:1 }}>{it.v}</span>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{it.sub}</span>
          </div>
          <div style={{ height:3, borderRadius:2, marginTop:14, background:it.color, opacity:0.85 }} />
        </div>
      ))}
    </div>
  );
};

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
const DashWeeklyChart = () => {
  const days = ['M','T','W','T','F','S','S'];
  const values = [45,72,34,88,56,12,0];
  const max = Math.max(...values);
  return (
    <div className="card" style={{ padding:20 }}>
      <div className="row-between">
        <div>
          <div className="eyebrow">Activity this week</div>
          <div className="sub" style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>307 min · +28% vs last week</div>
        </div>
        <div className="chip teal"><span className="dot"/>On pace</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:10, height:120, marginTop:18, alignItems:'end' }}>
        {values.map((v,i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%', justifyContent:'end' }}>
            <div className="bar" style={{ height:'100%' }}>
              <span style={{ height:(v/max*100)+'%', background:i===3?'var(--accent)':'var(--border-strong)', opacity:i===3?1:0.7 }} />
            </div>
            <div style={{ fontSize:11, color:i===3?'var(--text)':'var(--text-3)', fontWeight:i===3?700:500 }}>{days[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Task peek ────────────────────────────────────────────────────────────────
const DashTasksPeek = ({ tasks, onGoTasks }) => {
  const top = [...tasks].sort((a,b)=>a.dueSort-b.dueSort).slice(0,3);
  return (
    <div className="card" style={{ padding:20 }}>
      <div className="row-between">
        <div className="eyebrow" style={{ margin:0 }}>Up next</div>
        <button className="btn ghost sm" onClick={onGoTasks}>All tasks <Icon name="arrow-right" size={12} /></button>
      </div>
      <div className="stack" style={{ marginTop:12, gap:10 }}>
        {top.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
            <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background:SUBJECTS[t.subject] }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2, display:'flex', gap:8 }}>
                <span>{t.due}</span>
                {t.priority && <span style={{ fontWeight:600, color: PRIORITY_CONFIG[t.priority]?.color }}>{t.priority}</span>}
              </div>
            </div>
            <div className="sub" style={{ fontSize:12, color:'var(--text-2)' }}>+{t.points} XP</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
// Smart Overview — a dynamic welcome line built from the member's real
// tasks (today / overdue), today's calendar sessions, and yesterday's wins.
// Falls back to a small set of generic templates when the day is empty.
function buildSmartOverview({ tasks, sessions, now }) {
  const ymd = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const todayY = ymd(now);
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const yestY = ymd(y);

  const open = (tasks || []).filter((t) => !t.is_completed);
  const dueToday = open.filter((t) => t.due_date && ymd(t.due_date) === todayY);
  const overdue = open.filter((t) => t.due_date && ymd(t.due_date) < todayY);
  const doneYesterday = (tasks || []).filter((t) => t.is_completed && t.completed_at && ymd(t.completed_at) === yestY);
  const sessionsToday = (sessions || []).filter((s) => s.status === 'upcoming' && s.dateISO === todayY);

  const join = (arr) =>
    arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

  const parts = [];
  if (doneYesterday.length) {
    parts.push(`Nice work — you finished ${doneYesterday.length} task${doneYesterday.length > 1 ? 's' : ''} yesterday.`);
  }

  const todayBits = [];
  if (overdue.length) todayBits.push(`${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`);
  if (dueToday.length) todayBits.push(`${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`);
  if (sessionsToday.length === 1) todayBits.push(`a session at ${sessionsToday[0].time || 'today'}`);
  else if (sessionsToday.length > 1) todayBits.push(`${sessionsToday.length} sessions`);

  if (todayBits.length) {
    parts.push(`Today you have ${join(todayBits)}.`);
  } else if (!doneYesterday.length) {
    const generic = [
      'Nothing scheduled today — a clear runway to get ahead on what matters most.',
      'Your day is open. A great chance to make progress on a bigger goal.',
    ];
    parts.push(generic[new Date(now).getDate() % generic.length]);
  } else {
    parts.push('Nothing due today — enjoy the breathing room, or get a head start on tomorrow.');
  }

  return parts.join(' ');
}

function DashboardScreen({ member, onJoin, onGoto, gameMode, intention, onClearIntention, tasks, goals, setTasks, focus, focusTick }) {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const hr = now.getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const [focusRows, setFocusRows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const reloadFocus = () => fetchFocusSessions().then(setFocusRows);
  useEffect(() => { reloadFocus(); }, [focusTick]);
  useEffect(() => {
    if (window.fetchListSessions) window.fetchListSessions().then(setSessions);
  }, []);
  const overview = buildSmartOverview({ tasks, sessions, now });

  return (
    <>
      <div className="page-header" style={{ alignItems:'flex-end' }}>
        <div>
          <div className="eyebrow">{greeting} · {today}</div>
          <h1 className="page-title">Hello, <span style={{ color:'var(--accent)' }}>{member.firstName}</span></h1>
          <div className="page-sub" style={{ marginTop:10, maxWidth:620, color:'var(--text-2)' }}>
            {overview}
          </div>
        </div>
      </div>

      {intention && (
        <div style={{ marginBottom:20 }}>
          <PinnedIntentionCard intention={intention} onClear={onClearIntention} />
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:22, minWidth:0 }}>
        <div className="stack" style={{ gap:22, minWidth:0 }}>
          <DashUpcoming onJoin={onJoin} />
          <DashStats member={member} tasks={tasks} goals={goals} focusRows={focusRows} />
          <DashWeeklyChart />
          <EisenhowerMatrix tasks={tasks} />
        </div>
        <div className="stack" style={{ gap:22, minWidth:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <DashStreak days={member.streakDays} gameMode={gameMode} />
            <DashLevel member={member} />
          </div>
          <DashPomodoro gameMode={gameMode} tasks={tasks} goals={goals} setTasks={setTasks} focusRows={focusRows} focus={focus} />
          <DashFocusBreakdown focusRows={focusRows} />
          <DashTasksPeek tasks={tasks} onGoTasks={() => onGoto('tasks')} />
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DashboardScreen });
