// dashboard.jsx — updated with focus timer linking, weekly focus breakdown, intention card, Eisenhower

const { useState, useEffect, useRef } = React;

// ─── Focus session data (Supabase) ────────────────────────────────────────────
if (!window.FOCUS_LOG) window.FOCUS_LOG = {}; // legacy, retained for task time refs

async function fetchFocusSessions() {
  const uid = window.getActiveUserId ? await window.getActiveUserId() : null;
  if (!uid) return [];
  const { data, error } = await window._supabase
    .from('focus_sessions')
    .select('id, duration_minutes, label, subject, linked_kind, started_at, created_at')
    .eq('user_id', uid)
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
// Elapsed seconds for either mode — countdown (totalSec − remaining) or stopwatch (count up).
function focusTimerElapsed(t) {
  if (!t) return 0;
  if (t.mode === 'stopwatch') {
    const base = t.baseElapsedSec || 0;
    if (t.paused || t.runStartMs == null) return Math.round(base);
    return Math.round(base + (Date.now() - t.runStartMs) / 1000);
  }
  return Math.max(0, (t.totalSec || 0) - focusTimerRemaining(t));
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
Object.assign(window, { fetchFocusSessions, focusYmd, focusWeekStart, fmtMins, focusTimerRemaining, focusTimerElapsed, useNowTick });

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
            <span className="material-symbols-outlined" style={{ position:'absolute', left:12, top:10, color:'var(--text-3)', fontSize:16, lineHeight:1 }}>search</span>
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
                      <span className="material-symbols-outlined" style={{ fontSize:13, lineHeight:1 }}>{kind==='goal'?'target':'assignment_turned_in'}</span>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{o.label}</div>
                      {o.subject && <div style={{ fontSize:10,color:'var(--text-3)',marginTop:1 }}>{o.subject}</div>}
                    </div>
                    {selected?.id===o.id && <span className="material-symbols-outlined" style={{ fontSize:13, lineHeight:1, color:'var(--accent)', flexShrink:0 }}>check</span>}
                  </button>
                ))}
              </div>
            );
          })}
          {noTaskMatch && (
            <div style={{ border:'1px dashed var(--border)', borderRadius:10, padding:'12px 14px', background:'var(--bg-sunken)', marginTop:4 }}>
              <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:10 }}>No task matches "<strong>{q.trim()}</strong>". Create it?</div>
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
                <span className="material-symbols-outlined" style={{ fontSize:12, lineHeight:1 }}>add</span> {savingNew ? 'Creating…' : `Create task "${q.trim()}"`}
              </button>
            </div>
          )}
        </div>
        <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
          <button className="btn primary" style={{ flex:1, justifyContent:'center' }} disabled={!selected} onClick={() => onStart(selected)}>
            <span className="material-symbols-outlined" style={{ fontSize:13, lineHeight:1 }}>play_arrow</span> Start focus session
          </button>
          <button className="btn ghost" onClick={() => onStart(null)}>Start without linking</button>
        </div>
      </div>
    </>
  );
}

const DashPomodoro = ({ gameMode, tasks, goals, setTasks, focusRows, focus }) => {
  const [durationMin, setDurationMin] = useState(25);
  const [mode, setMode] = useState('timer'); // 'timer' (countdown) | 'stopwatch' (count up)
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

  const startWith = (item) => { setLinkedItem(item); setShowPicker(false); focus.start(item, durationMin, mode); };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const r = await focus.save();
    setSaving(false);
    setLinkedItem(null);
    if (r) { setSavedNote(`✓ Saved ${r.elapsedMin}m${r.linked ? ' to "' + r.linked.label + '"' : ''}`); setTimeout(() => setSavedNote(''), 4000); }
  };

  const isStopwatch = isRunning ? t.mode === 'stopwatch' : mode === 'stopwatch';
  const shownSec = isRunning
    ? (isStopwatch ? window.focusTimerElapsed(t) : window.focusTimerRemaining(t))
    : (isStopwatch ? 0 : durationMin * 60);
  const mm = String(Math.floor(shownSec/60)).padStart(2,'0');
  const ss = String(shownSec%60).padStart(2,'0');
  const pct = isRunning
    ? (isStopwatch ? 100 : (t.totalSec ? (1 - window.focusTimerRemaining(t)/t.totalSec) * 100 : 0))
    : 0;
  const done = isRunning && !isStopwatch && window.focusTimerRemaining(t) <= 0;
  const shownLink = isRunning ? t.linked : linkedItem;
  const greenBtn = { flex:1, justifyContent:'center', background:'var(--teal-600)', color:'#fff', borderColor:'var(--teal-600)' };
  const weekMin = (focusRows || []).filter(r => new Date(r.started_at || r.created_at) >= focusWeekStart()).reduce((a, r) => a + (r.duration_minutes || 0), 0);

  const ringColor = done ? 'var(--teal-600)' : isRunning && t.paused ? 'var(--text-3)' : 'var(--accent)';

  return (
    <>
      <div className="bento-card" style={{ padding:'24px 24px 20px', display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', marginBottom:20 }}>
          <div className="page-eyebrow">Focus session</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{fmtMins(weekMin)} this week</div>
        </div>

        {/* Circular ring via conic-gradient */}
        <div style={{ position:'relative', width:200, height:200, flexShrink:0 }}>
          <div style={{
            position:'absolute', top:0, left:0, width:200, height:200, borderRadius:'50%',
            background:'conic-gradient(from -90deg, '+ringColor+' '+pct+'%, var(--border) '+pct+'%)',
            transition:'background 0.3s ease'
          }} />
          <div style={{
            position:'absolute', top:12, left:12, width:176, height:176, borderRadius:'50%',
            background:'var(--bg-elev)'
          }} />
          <div style={{ position:'absolute', top:0, left:0, width:200, height:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:36, fontWeight:700, letterSpacing:'0.02em', lineHeight:1, color:'var(--text)' }}>{mm}:{ss}</div>
            {shownLink ? (
              <div style={{ fontSize:10, fontWeight:700, color:'var(--accent)', textAlign:'center', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:7, textTransform:'uppercase', letterSpacing:'0.09em' }}>
                {shownLink.label}
              </div>
            ) : (
              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:5 }}>
                {isRunning && t.paused ? 'paused' : (isStopwatch ? 'stopwatch' : 'pomodoro')}
              </div>
            )}
          </div>
        </div>

        {/* Mode toggle + duration adjuster (idle only) */}
        {!isRunning && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, marginTop:16 }}>
            <div className="seg">
              <button className={mode==='timer' ? 'on' : ''} onClick={() => setMode('timer')}>Timer</button>
              <button className={mode==='stopwatch' ? 'on' : ''} onClick={() => setMode('stopwatch')}>Stopwatch</button>
            </div>
            {mode === 'timer'
              ? <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button className="btn ghost sm" onClick={() => adjust(-5)} disabled={durationMin<=5} style={{ minWidth:36, justifyContent:'center' }}>−5</button>
                  <span style={{ fontSize:14, fontWeight:700, minWidth:60, textAlign:'center', fontFamily:'var(--ff-sub)', letterSpacing:'0.04em' }}>{durationMin} min</span>
                  <button className="btn ghost sm" onClick={() => adjust(5)} disabled={durationMin>=120} style={{ minWidth:36, justifyContent:'center' }}>+5</button>
                </div>
              : <div style={{ fontSize:11, color:'var(--text-3)' }}>Counts up — save whenever you're done.</div>}
          </div>
        )}

        {done && <div style={{ marginTop:10, fontSize:12, color:'var(--teal-600)', fontWeight:600, textAlign:'center' }}>Time's up — saving your session…</div>}
        {savedNote && <div style={{ marginTop:10, fontSize:12, color:savedNote[0]==='✓'?'var(--teal-600)':'var(--coral)', fontWeight:600, textAlign:'center' }}>{savedNote}</div>}

        {/* Controls */}
        <div style={{ display:'flex', gap:8, marginTop:16, width:'100%' }}>
          {isRunning ? (
            <>
              <button className="btn" onClick={() => t.paused ? focus.resume() : focus.pause()} style={{ flex:1, justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>{t.paused ? 'play_arrow' : 'pause'}</span>
                {t.paused ? 'Resume' : 'Pause'}
              </button>
              <button className="btn" onClick={handleSave} disabled={saving} style={{ ...greenBtn, flex:1 }}>
                <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>check</span>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn" onClick={() => { focus.reset(); setLinkedItem(null); }}>Reset</button>
            </>
          ) : (
            <button className="btn primary" onClick={() => setShowPicker(true)} style={{ flex:1, justifyContent:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>play_arrow</span>
              Start focus
            </button>
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
    <div className="bento-card" style={{ padding:22, minWidth:0 }}>
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

// ─── Consistency this week (full-width) ──────────────────────────────────────
// A day counts as "active" if there was any focus session, completed task, or
// attended session that day. Reuses already-fetched data — no new queries.
const DashConsistency = ({ focusRows, tasks, sessions }) => {
  const ws = focusWeekStart(); // Monday 00:00 local
  const todayY = focusYmd(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(ws.getDate() + i);
    days.push({ ymd: focusYmd(d), dow: d.toLocaleDateString('en-US', { weekday: 'short' }), num: d.getDate() });
  }
  const act = {};
  const mark = (ymd, kind) => { if (!ymd) return; (act[ymd] = act[ymd] || {})[kind] = true; };
  (focusRows || []).forEach((r) => mark(focusYmd(new Date(r.started_at || r.created_at)), 'focus'));
  (tasks || []).forEach((t) => { const c = t.completed_at || t.completedAt; if (t.is_completed && c) mark(focusYmd(new Date(c)), 'task'); });
  (sessions || []).forEach((s) => { if (s.status === 'past' && s.dateISO) mark(s.dateISO, 'session'); });
  const isActive = (ymd) => !!act[ymd];
  const activeCount = days.filter((d) => isActive(d.ymd)).length;

  return (
    <div className="bento-card" style={{ padding:'22px 24px', marginTop:22 }}>
      <div className="row-between" style={{ marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div>
          <div className="eyebrow">Consistency this week</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>
            <strong>{activeCount}</strong> of 7 days active · Mon–Sun
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-3)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>bolt</span>
          A task, focus session, or session counts
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0,1fr))', gap:12 }}>
        {days.map((d) => {
          const active = isActive(d.ymd);
          const isToday = d.ymd === todayY;
          const future = d.ymd > todayY;
          return (
            <div key={d.ymd} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'16px 6px',
              borderRadius:14, background: active ? 'var(--accent-soft)' : 'var(--bg-sunken)',
              border: isToday ? '1.5px solid var(--accent)' : '1.5px solid transparent', opacity: future ? 0.45 : 1,
            }}>
              <div className="eyebrow" style={{ margin:0 }}>{d.dow}</div>
              <div style={{
                width:42, height:42, borderRadius:'50%', display:'grid', placeItems:'center',
                background: active ? 'var(--accent)' : 'transparent',
                border: active ? 'none' : '2px solid var(--border-strong)',
                color: active ? '#fff' : 'var(--text-3)',
              }}>
                {active
                  ? <span className="material-symbols-outlined" style={{ fontSize:20, lineHeight:1 }}>check</span>
                  : <span style={{ fontSize:15, fontWeight:700, fontFamily:'var(--ff-display)' }}>{d.num}</span>}
              </div>
              <div style={{ fontSize:11, fontWeight: active ? 700 : 500, color: active ? 'var(--accent)' : 'var(--text-3)' }}>
                {active ? 'Active' : future ? '—' : 'Rest'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Streak ───────────────────────────────────────────────────────────────────
const DashStreak = ({ days, gameMode }) => (
  <div className="card" style={{ padding:20, display:'flex', alignItems:'center', gap:14 }}>
    <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--coral-100)', display:'grid', placeItems:'center', flexShrink:0 }}>
      <span className="material-symbols-outlined" style={{ fontSize:22, lineHeight:1, color:'var(--coral)' }}>local_fire_department</span>
    </div>
    <div>
      <div style={{ fontSize:11, fontFamily:'var(--ff-sub)', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-3)' }}>Streak</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        <span className="display" style={{ fontSize:34, lineHeight:1.2, color:'var(--coral)' }}>{days}</span>
        <span style={{ fontSize:12, color:'var(--text-2)' }}>weekdays</span>
      </div>
    </div>
    {gameMode==='loud' && <div style={{ marginLeft:'auto', background:'linear-gradient(90deg, var(--coral), #FFA270)', color:'#fff', padding:'6px 10px', borderRadius:999, fontFamily:'var(--ff-sub)', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase' }}>On fire</div>}
  </div>
);

// ─── XP progress modal (opened from the XP tile or Level card) ────────────────
function XpProgressModal({ member, onClose }) {
  const t = xpTier(member.xp || 0);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.5)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(480px, 92vw)', maxHeight:'88vh', overflow:'auto', zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div className="eyebrow">Your XP progress</div>
            <div className="display" style={{ fontSize:26, marginTop:3, lineHeight:1.05 }}>{t.name}</div>
            <div style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>Tier {t.tier} of 8 · {(t.xp || 0).toLocaleString()} XP total</div>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', display:'inline-flex' }}><span className="material-symbols-outlined" style={{fontSize:18,lineHeight:1}}>close</span></button>
        </div>

        <div style={{ padding:'20px 24px' }}>
          {/* Progress to next tier */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <span className="eyebrow" style={{ margin:0 }}>{t.isMax ? 'Top tier reached' : `Progress to ${t.next.name}`}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--accent)' }}>{t.isMax ? '100%' : `${Math.round(t.pct)}%`}</span>
          </div>
          <div className="progress" style={{ height:10 }}><span style={{ width:(t.isMax ? 100 : t.pct)+'%' }} /></div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:10, lineHeight:1.5 }}>
            {t.isMax
              ? <>You've reached <strong>{t.name}</strong> — the highest tier. Keep earning XP to stay on top.</>
              : <>You need <strong style={{ color:'var(--accent)' }}>{t.toNext.toLocaleString()} more XP</strong> to reach <strong>{t.next.name}</strong>.</>}
          </div>

          {/* All tiers */}
          <div className="eyebrow" style={{ marginTop:22, marginBottom:10 }}>All tiers</div>
          <div className="stack" style={{ gap:0 }}>
            {XP_TIERS.map((lt, i) => {
              const achieved = i <= t.index;
              const current = i === t.index;
              return (
                <div key={lt.tier} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 10px', borderRadius:9, background: current ? 'var(--accent-soft)' : 'transparent' }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, display:'grid', placeItems:'center', background: achieved ? 'var(--accent)' : 'var(--bg-sunken)', color: achieved ? '#fff' : 'var(--text-3)', fontSize:12, fontWeight:700 }}>
                    {achieved ? <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>{current ? 'star' : 'check'}</span> : lt.tier}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight: current ? 700 : 600, color: achieved ? 'var(--text)' : 'var(--text-3)' }}>{lt.name}</div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--ff-sub)', letterSpacing:'0.03em' }}>{lt.min.toLocaleString()} XP</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Level ────────────────────────────────────────────────────────────────────
const DashLevel = ({ member, onOpenXp }) => {
  const t = xpTier(member.xp);
  return (
    <div className="bento-card" onClick={onOpenXp} style={{ padding:20, minWidth:0, cursor:'pointer' }}>
      <div className="row-between">
        <div className="eyebrow">Level</div>
        <span className="material-symbols-outlined" style={{ fontSize:16, lineHeight:1, color:'var(--text-3)' }}>open_in_full</span>
      </div>
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
      <div className="bento-card" style={{ padding:22, minWidth:0 }}>
        <div className="eyebrow" style={{ margin:0 }}>Next up</div>
        <div style={{ fontSize:13, color:'var(--text-3)', marginTop:8 }}>Loading…</div>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="bento-card" style={{ padding:22, minWidth:0 }}>
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
      <div className="bento-card" style={{ padding:0, overflow:'hidden', cursor:'pointer', minWidth:0 }} onClick={() => setModalOpen(true)}>
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
              <button className="btn primary" onClick={e=>{e.stopPropagation();onJoin(s);}}>Join <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && <SessionDetailModal session={s} onClose={() => setModalOpen(false)} isAdmin={false} />}
    </>
  );
};

// ─── Recent Wins feed ─────────────────────────────────────────────────────────
const DashWins = () => {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await window._supabase
        .from('wins')
        .select('id, title, subject, author_name, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(4);
      if (active) { setWins(data || []); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return d + 'd ago';
    if (h > 0) return h + 'h ago';
    if (m > 0) return m + 'm ago';
    return 'just now';
  };

  return (
    <div className="bento-card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
        <div className="page-eyebrow">Recent Wins</div>
      </div>
      <div style={{ padding:'4px 20px 12px' }}>
        {loading ? (
          <div style={{ fontSize:13, color:'var(--text-3)', padding:'16px 0' }}>Loading…</div>
        ) : wins.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-3)', padding:'16px 0' }}>No wins shared yet.</div>
        ) : wins.map((w, i) => {
          const color = SUBJECTS[w.subject] || 'var(--teal-600)';
          return (
            <div key={w.id} style={{ display:'flex', gap:12, padding:'12px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:color + '22', color:color, display:'grid', placeItems:'center', flexShrink:0, marginTop:1 }}>
                <span className="material-symbols-outlined" style={{ fontSize:16, lineHeight:1, fontVariationSettings:"'FILL' 1" }}>emoji_events</span>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>
                  <strong style={{ fontWeight:700 }}>{w.author_name || 'Member'}</strong> · {w.title}
                </div>
                <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>{timeAgo(w.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Stats row ────────────────────────────────────────────────────────────────

// Headline stat tiles (Stitch dashboard): XP Total · Streak · Active Tasks · Upcoming Sessions.
const DashStats = ({ member, tasks, goals, focusRows, sessions, onOpenXp }) => {
  const [attend, setAttend] = useState({ townHall: 0, oneToOne: 0 });
  useEffect(() => {
    let active = true;
    (async () => {
      const uid = window.getActiveUserId ? await window.getActiveUserId() : null;
      if (!uid) return;
      const { data } = await window._supabase
        .from('points_log').select('source')
        .eq('user_id', uid).in('source', ['town_hall', 'one_to_one']);
      if (!active) return;
      const c = { townHall: 0, oneToOne: 0 };
      (data || []).forEach((r) => { if (r.source === 'town_hall') c.townHall++; else if (r.source === 'one_to_one') c.oneToOne++; });
      setAttend(c);
    })();
    return () => { active = false; };
  }, [member.firstName]);

  const tier = xpTier(member.xp || 0);
  const tasksDone = (tasks || []).filter((t) => t.is_completed).length;
  const activeTasks = (tasks || []).filter((t) => !t.is_completed).length;
  const upcoming = (sessions || []).filter((s) => s.status === 'upcoming').length;
  const streak = member.streakDays || 0;

  const tiles = [
    {
      icon:'military_tech', iconColor:'var(--accent)', fill:1,
      tag: tier.name, tagColor:'var(--accent)',
      label:'XP Total', value:(member.xp || 0).toLocaleString(), suffix:`Tier ${tier.tier}`,
    },
    {
      icon:'local_fire_department', iconColor:'var(--coral)', fill:1,
      tag:'Current', tagColor:'var(--text-3)',
      label:'Streak', value:streak, suffix: streak === 1 ? 'weekday' : 'weekdays',
    },
    {
      icon:'task_alt', iconColor:'var(--teal-600)', fill:0,
      tag:`${tasksDone} done`, tagColor:'var(--teal-600)',
      label:'Active Tasks', value:activeTasks, suffix:'in progress',
    },
    {
      icon:'calendar_today', iconColor:'var(--accent)', fill:0,
      tag: upcoming > 0 ? 'Scheduled' : 'None', tagColor: upcoming > 0 ? 'var(--coral)' : 'var(--text-3)',
      label:'Upcoming Sessions', value:upcoming, suffix:'scheduled',
    },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16 }}>
      {tiles.map((t) => {
        const clickable = t.label === 'XP Total';
        return (
        <div key={t.label} className="bento-card" onClick={clickable ? onOpenXp : undefined} style={{ padding:'18px 20px', cursor: clickable ? 'pointer' : undefined }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <span className="material-symbols-outlined" style={{ fontSize:22, lineHeight:1, color:t.iconColor, fontVariationSettings: t.fill ? "'FILL' 1" : "'FILL' 0" }}>{t.icon}</span>
            <span style={{ fontSize:10, fontFamily:'var(--ff-sub)', letterSpacing:'0.08em', textTransform:'uppercase', color:t.tagColor, fontWeight:700 }}>{t.tag}</span>
          </div>
          <div style={{ fontSize:10, fontFamily:'var(--ff-sub)', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:7 }}>{t.label}</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
            <span style={{ fontFamily:'var(--ff-display)', fontSize:32, letterSpacing:'-0.02em', lineHeight:1, color:'var(--text)' }}>{t.value}</span>
            <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>{t.suffix}</span>
          </div>
        </div>
        );
      })}
    </div>
  );
};

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
const DashWeeklyChart = () => {
  const days = ['M','T','W','T','F','S','S'];
  const values = [45,72,34,88,56,12,0];
  const max = Math.max(...values);
  return (
    <div className="bento-card" style={{ padding:20 }}>
      <div className="row-between">
        <div>
          <div className="page-eyebrow" style={{ marginBottom:2 }}>Activity this week</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>307 min · +28% vs last week</div>
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

// ─── Quick Tasks peek ─────────────────────────────────────────────────────────
const DashTasksPeek = ({ tasks, onGoTasks }) => {
  const incomplete = (tasks || []).filter(t => !t.is_completed);
  const top = [...incomplete].sort((a,b) => a.dueSort - b.dueSort).slice(0, 4);
  return (
    <div className="bento-card" style={{ padding:'24px', display:'flex', flexDirection:'column', minWidth:0 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div>
          <div className="page-eyebrow" style={{ marginBottom:3 }}>Quick Tasks</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{incomplete.length} remaining</div>
        </div>
        <button className="btn ghost sm" onClick={onGoTasks} style={{ fontSize:11, marginTop:2 }}>
          View all <span className="material-symbols-outlined" style={{ fontSize:12, lineHeight:1 }}>chevron_right</span>
        </button>
      </div>

      {/* Task list */}
      {top.length === 0 ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'var(--text-3)', padding:'20px 0' }}>
          <span className="material-symbols-outlined" style={{ fontSize:32, lineHeight:1, opacity:0.4 }}>task_alt</span>
          <div style={{ fontSize:13 }}>All caught up!</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
          {top.map((t, i) => {
            const pc = PRIORITY_CONFIG && PRIORITY_CONFIG[t.priority];
            const subjectColor = SUBJECTS[t.subject] || 'var(--border-strong)';
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                {/* Mini checkbox circle */}
                <div style={{ width:18, height:18, borderRadius:5, border:'2px solid var(--border-strong)', flexShrink:0, marginTop:2, background:'transparent' }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{t.title}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5, flexWrap:'wrap' }}>
                    {pc && (
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', padding:'2px 7px', borderRadius:999, background:pc.bg, color:pc.color, border:'1px solid '+pc.color+'55' }}>
                        {t.priority}
                      </span>
                    )}
                    {t.due && <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--ff-sub)' }}>{t.due}</span>}
                  </div>
                </div>
                {/* Subject color dot */}
                <div style={{ width:8, height:8, borderRadius:'50%', background:subjectColor, flexShrink:0, marginTop:5 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <button className="btn ghost" onClick={onGoTasks} style={{ marginTop:16, justifyContent:'center', width:'100%', fontSize:12 }}>
        <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>add</span>
        New task
      </button>
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
  const [xpOpen, setXpOpen] = useState(false);
  const reloadFocus = () => fetchFocusSessions().then(setFocusRows);
  useEffect(() => { reloadFocus(); }, [focusTick]);
  useEffect(() => {
    if (window.fetchListSessions) window.fetchListSessions().then(setSessions);
  }, []);
  const overview = buildSmartOverview({ tasks, sessions, now });

  return (
    <>
      {/* Page header — Welcome row */}
      <div className="page-header" style={{ alignItems:'center', marginBottom:28 }}>
        <div>
          <div className="page-eyebrow">{greeting} · {today}</div>
          <h1 style={{ fontFamily:'var(--ff-heading)', fontSize:42, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.1, margin:'6px 0 0', color:'var(--text)' }}>
            Welcome back, <span style={{ color:'var(--accent)' }}>{member.firstName}.</span>
          </h1>
          <div style={{ fontSize:15, color:'var(--text-2)', marginTop:10, maxWidth:560, lineHeight:1.6 }}>
            {overview}
          </div>
        </div>

        {/* Today's Intention card — Stitch right-side card */}
        {intention && (
          <div className="bento-card" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', flexShrink:0, maxWidth:320 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'var(--accent-soft)', display:'grid', placeItems:'center', flexShrink:0 }}>
              <span className="material-symbols-outlined" style={{ fontSize:22, lineHeight:1, color:'var(--accent)' }}>calendar_today</span>
            </div>
            <div style={{ minWidth:0 }}>
              <div className="page-eyebrow" style={{ marginBottom:3 }}>Today's Intention</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220 }}>{intention}</div>
            </div>
            <button onClick={onClearIntention} style={{ color:'var(--text-3)', flexShrink:0, padding:'4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize:16, lineHeight:1 }}>close</span>
            </button>
          </div>
        )}
      </div>

      {/* Headline stat tiles */}
      <DashStats member={member} tasks={tasks} goals={goals} focusRows={focusRows} sessions={sessions} onOpenXp={() => setXpOpen(true)} />

      {/* Bento grid — left widgets column (8) + right feed column (4) */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.85fr) minmax(0, 1fr)', gap:22, minWidth:0, marginTop:22, alignItems:'start' }}>
        {/* Left column: Quick Tasks + Focus Timer, then Eisenhower */}
        <div className="stack" style={{ gap:22, minWidth:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) minmax(0, 1fr)', gap:22, minWidth:0 }}>
            <DashTasksPeek tasks={tasks} onGoTasks={() => onGoto('tasks')} />
            <DashPomodoro gameMode={gameMode} tasks={tasks} goals={goals} setTasks={setTasks} focusRows={focusRows} focus={focus} />
          </div>
          <EisenhowerMatrix tasks={tasks} />
        </div>

        {/* Right column: Level, next session, recent wins */}
        <div className="stack" style={{ gap:22, minWidth:0 }}>
          <DashLevel member={member} onOpenXp={() => setXpOpen(true)} />
          <DashUpcoming onJoin={onJoin} />
          <DashWins />
        </div>
      </div>

      {/* Full-width consistency strip */}
      <DashConsistency focusRows={focusRows} tasks={tasks} sessions={sessions} />

      {xpOpen && <XpProgressModal member={member} onClose={() => setXpOpen(false)} />}
    </>
  );
}

Object.assign(window, { DashboardScreen });
