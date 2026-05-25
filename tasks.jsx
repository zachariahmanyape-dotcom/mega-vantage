// tasks.jsx — with priority labels, due date color-coding, time spent

function SubjectTag({ subject }) {
  const color = SUBJECTS[subject] || '#888';
  return (
    <span className="chip" style={{ background: color + '18', color, borderColor: color + '33' }}>
      <span className="dot" style={{ background: color }} />{subject}
    </span>);

}

function PriorityBadge({ priority }) {
  if (!priority) return null;
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      border: '1px solid ' + cfg.color + '55',
      fontFamily: 'var(--ff-sub)', fontWeight: 700, letterSpacing: '0.08em'
    }}>{priority}</span>);

}

function DueDateBadge({ due, dueSort }) {
  if (!due) return null;
  let color = 'var(--teal-600)',bg = 'var(--teal-50)';
  if (dueSort <= 1) {color = 'var(--coral)';bg = 'var(--coral-100)';} // overdue/today
  else if (dueSort <= 2) {color = '#C88A1A';bg = 'rgba(232,178,76,0.12)';} // within 48h
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: bg, color, fontFamily: 'var(--ff-sub)', fontWeight: 600 }}>
      📅 {due}
    </span>);

}

function EffortImpactMatrix({ point }) {
  const [effort, impact] = point;
  const x = (effort - 0.5) / 4 * 100;
  const y = 100 - (impact - 0.5) / 4 * 100;
  return (
    <div style={{ width: 140, position: 'relative' }}>
      <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 10, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
          {[0, 1, 2, 3].map((i) =>
          <div key={i} style={{ borderRight: i % 2 === 0 ? '1px dashed var(--border)' : 'none', borderBottom: i < 2 ? '1px dashed var(--border)' : 'none' }} />
          )}
        </div>
        <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: 999, background: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>
        <span>Low effort</span><span>High effort</span>
      </div>
    </div>);

}

function TaskRow({ task, expanded, onToggle, onCheck, onSubCheck }) {
  const hasSubs = task.subtasks && task.subtasks.length > 0;
  const done = hasSubs ? task.subtasks.filter((s) => s.done).length : 0;
  const completed = !!task.is_completed;
  const pct = completed ? 100 : (hasSubs ? Math.round(done / task.subtasks.length * 100) : 0);
  const timeSpent = window.FOCUS_LOG?.[task.id] || 0;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }} onClick={onToggle}>
        <div className={"check" + (completed ? " on" : "")} onClick={(e) => {e.stopPropagation();onCheck();}}>
          {completed && <Icon name="check" size={12} stroke={3} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 600, textDecoration: completed ? 'line-through' : 'none', color: completed ? 'var(--text-3)' : 'var(--text)' }}>{task.title}</div>
            {task.priority && <PriorityBadge priority={task.priority} />}
            <SubjectTag subject={task.subject} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            <DueDateBadge due={task.due} dueSort={task.dueSort} />
            {hasSubs && <><span>{done} of {task.subtasks.length} subtasks</span><span style={{ opacity: 0.5 }}>·</span></>}
            <span className="sub" style={{ color: 'var(--text-2)' }}>+{task.points} XP</span>
            {timeSpent > 0 && <span style={{ color: 'var(--teal-600)', fontWeight: 600 }}>⏱ {timeSpent}m focused</span>}
          </div>
          <div className="progress" style={{ marginTop: 10, height: 3 }}><span style={{ width: pct + '%' }} /></div>
        </div>
        <button className="btn ghost sm" onClick={(e) => {e.stopPropagation();onToggle();}}>
          <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
        </button>
      </div>

      {expanded &&
      <div style={{ padding: '18px 20px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunken)', display: 'grid', gridTemplateColumns: '1fr 180px', gap: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>{hasSubs ? 'Subtasks' : 'Details'}</div>
            {!hasSubs && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{task.notes || 'No subtasks for this task.'}</div>}
            <div className="stack" style={{ gap: 8 }}>
              {task.subtasks.map((s, i) =>
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                  <div className={"check" + (s.done ? " on" : "")} onClick={() => onSubCheck(i)}>
                    {s.done && <Icon name="check" size={11} stroke={3} />}
                  </div>
                  <div style={{ fontSize: 13, color: s.done ? 'var(--text-3)' : 'var(--text)', textDecoration: s.done ? 'line-through' : 'none', flex: 1 }}>{s.t}</div>
                  {task.priority && <PriorityBadge priority={task.priority} />}
                </div>
            )}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Effort × Impact</div>
            <EffortImpactMatrix point={task.impact} />
          </div>
        </div>
      }
    </div>);

}

function GoalCard({ goal, tasks }) {
  // ── Legacy hardcoded shape (taskIds present) ──────────────────────────────
  if (goal.taskIds) {
    const linked = goal.taskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean);
    const totalSub = linked.reduce((a, t) => a + t.subtasks.length, 0);
    const doneSub = linked.reduce((a, t) => a + t.subtasks.filter((s) => s.done).length, 0);
    const pct = totalSub ? Math.round(doneSub / totalSub * 100) : 0;
    const totalTime = linked.reduce((a, t) => a + (window.FOCUS_LOG?.[t.id] || 0), 0);
    return (
      <div className="card" style={{ padding: 22 }}>
        <div className="row-between">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Goal</div>
            <div className="display" style={{ fontSize: 28, marginTop: 4, lineHeight: 1.1 }}>{goal.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>{goal.description}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 120 }}>
            <div className="display" style={{ fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>{pct}<span style={{ fontSize: 20, color: 'var(--text-3)' }}>%</span></div>
            <div className="eyebrow" style={{ marginTop: 4 }}>{doneSub} of {totalSub} steps</div>
            {totalTime > 0 && <div style={{ fontSize: 11, color: 'var(--teal-600)', marginTop: 4 }}>⏱ {totalTime}m total focus</div>}
          </div>
        </div>
        <div className="progress" style={{ marginTop: 14, height: 5 }}><span style={{ width: pct + '%' }} /></div>
        <div className="stack" style={{ gap: 8, marginTop: 18 }}>
          {linked.map((t) => {
            const d = t.subtasks.filter((s) => s.done).length;
            const p = Math.round(d / t.subtasks.length * 100);
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
                <div style={{ width: 3, alignSelf: 'stretch', background: SUBJECTS[t.subject], borderRadius: 2 }} />
                {t.priority && <PriorityBadge priority={t.priority} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{t.subject}</div>
                </div>
                <DueDateBadge due={t.due} dueSort={t.dueSort} />
                <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{p}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Supabase shape (id, title, description, target_date, status) ──────────
  const linked = tasks.filter(t => t.goal_id === goal.id || t.roadmap_step?.goal_id === goal.id);
  const totalLinked = linked.length;
  const doneLinked  = linked.filter(t => t.is_completed).length;
  const pct = totalLinked ? Math.round(doneLinked / totalLinked * 100) : 0;

  const statusCfg = {
    completed: { label: 'Completed', color: 'var(--teal-600)',  bg: 'var(--teal-50)' },
    active:    { label: 'Active',    color: 'var(--accent)',    bg: 'var(--accent-soft)' },
    paused:    { label: 'Paused',    color: '#C88A1A',          bg: 'rgba(232,178,76,0.12)' },
    archived:  { label: 'Archived',  color: 'var(--text-3)',    bg: 'var(--bg-sunken)' },
  };
  const sc = statusCfg[goal.status] || statusCfg.active;
  const targetDate = goal.target_date
    ? new Date(goal.target_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="eyebrow" style={{ margin: 0 }}>Goal</div>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 999,
              background: sc.bg, color: sc.color,
              border: '1px solid ' + sc.color + '44',
              fontFamily: 'var(--ff-sub)', fontWeight: 700, letterSpacing: '0.08em'
            }}>{sc.label}</span>
          </div>
          <div className="display" style={{ fontSize: 28, lineHeight: 1.1 }}>{goal.title}</div>
          {goal.description && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>{goal.description}</div>
          )}
          {targetDate && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="sessions" size={12} style={{ color: 'var(--text-3)' }} />
              Target: {targetDate}
            </div>
          )}
        </div>
        {totalLinked > 0 && (
          <div style={{ textAlign: 'right', minWidth: 110, paddingLeft: 16 }}>
            <div className="display" style={{ fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>
              {pct}<span style={{ fontSize: 20, color: 'var(--text-3)' }}>%</span>
            </div>
            <div className="eyebrow" style={{ marginTop: 4 }}>{doneLinked} of {totalLinked} tasks</div>
          </div>
        )}
      </div>
      {totalLinked > 0 && (
        <>
          <div className="progress" style={{ marginTop: 14, height: 5 }}><span style={{ width: pct + '%' }} /></div>
          <div className="stack" style={{ gap: 8, marginTop: 18 }}>
            {linked.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
                <div style={{ width: 3, alignSelf: 'stretch', background: 'var(--accent)', borderRadius: 2, opacity: t.is_completed ? 0.3 : 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, textDecoration: t.is_completed ? 'line-through' : 'none', color: t.is_completed ? 'var(--text-3)' : 'var(--text)' }}>{t.title}</div>
                  {t.roadmap_step?.title && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{t.roadmap_step.title}</div>}
                </div>
                {t.due && <DueDateBadge due={t.due} dueSort={t.dueSort} />}
                <div style={{ fontSize: 11, color: t.is_completed ? 'var(--teal-600)' : 'var(--text-3)', fontWeight: 600 }}>
                  {t.is_completed ? '✓' : '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FocusStats() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    window.fetchFocusSessions().then(r => { if (active) { setRows(r); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (loading) return <div style={{ color:'var(--text-3)', fontSize:14, padding:20 }}>Loading focus stats…</div>;

  if (rows.length === 0) {
    return (
      <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏱️</div>
        <div style={{ fontFamily:'var(--ff-display)', fontSize:22, marginBottom:8, color:'var(--text)' }}>No focus sessions yet</div>
        <div style={{ fontSize:14 }}>Start a focus timer on your dashboard and hit Save — your stats will show up here.</div>
      </div>
    );
  }

  const when = (r) => new Date(r.started_at || r.created_at);
  const totalMin = rows.reduce((a,r)=>a+(r.duration_minutes||0),0);
  const todayKey = window.focusYmd(new Date());
  const todayRows = rows.filter(r => window.focusYmd(when(r)) === todayKey);
  const todayMin = todayRows.reduce((a,r)=>a+(r.duration_minutes||0),0);
  const ws = window.focusWeekStart();
  const weekRows = rows.filter(r => when(r) >= ws);
  const weekMin = weekRows.reduce((a,r)=>a+(r.duration_minutes||0),0);

  const days = [];
  for (let i=6;i>=0;i--){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i); days.push(d); }
  const dayBars = days.map(d => ({
    label: d.toLocaleDateString('en-US',{weekday:'short'})[0],
    full: d.toLocaleDateString('en-US',{weekday:'short'}),
    min: rows.filter(r => window.focusYmd(when(r)) === window.focusYmd(d)).reduce((a,r)=>a+(r.duration_minutes||0),0),
  }));
  const maxDay = Math.max(...dayBars.map(d=>d.min),1);

  const bySubj = {};
  rows.forEach(r => { const k = r.subject || 'General'; bySubj[k]=(bySubj[k]||0)+(r.duration_minutes||0); });
  const subjects = Object.entries(bySubj).map(([subject,minutes])=>({subject,minutes})).sort((a,b)=>b.minutes-a.minutes);
  const maxSubj = Math.max(...subjects.map(s=>s.minutes),1);

  // Most-focused-time-of-day (minutes by hour)
  const byHour = new Array(24).fill(0);
  rows.forEach(r => { byHour[when(r).getHours()] += (r.duration_minutes || 0); });
  const maxHour = Math.max(...byHour, 1);

  // Weekly rhythm — weekday (Mon..Sun) × hour heatmap
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  rows.forEach(r => { const d = when(r); grid[(d.getDay() + 6) % 7][d.getHours()] += (r.duration_minutes || 0); });
  const maxCell = Math.max(1, ...grid.flat());

  // Year grid (GitHub-style)
  const yr = new Date().getFullYear();
  const dayMap = {};
  rows.forEach(r => { const k = window.focusYmd(when(r)); dayMap[k] = (dayMap[k] || 0) + (r.duration_minutes || 0); });
  const jan1 = new Date(yr, 0, 1);
  const gridStart = new Date(jan1); gridStart.setDate(jan1.getDate() - ((jan1.getDay() + 6) % 7));
  const yearEnd = new Date(yr, 11, 31);
  const weeks = [];
  let cur = new Date(gridStart);
  while (cur <= yearEnd) {
    const wk = [];
    for (let i = 0; i < 7; i++) { wk.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(wk);
  }
  const yearCellStyle = (mins, inYear) => {
    if (!inYear) return { background: 'transparent' };
    if (mins <= 0) return { background: 'var(--bg-sunken)' };
    const op = mins < 30 ? 0.3 : mins < 60 ? 0.55 : mins < 120 ? 0.78 : 1;
    return { background: 'var(--accent)', opacity: op };
  };

  const stat = (label, value, sub) => (
    <div className="card" style={{ padding:'18px 18px 16px', borderRadius:22 }}>
      <div className="eyebrow" style={{ fontSize:10 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:8 }}>
        <span className="display" style={{ fontSize:34, lineHeight:1 }}>{value}</span>
        {sub && <span style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</span>}
      </div>
    </div>
  );

  return (
    <div className="stack" style={{ gap:22 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {stat('Today', window.fmtMins(todayMin), `${todayRows.length} ${todayRows.length===1?'session':'sessions'}`)}
        {stat('This week', window.fmtMins(weekMin), `${weekRows.length} ${weekRows.length===1?'session':'sessions'}`)}
        {stat('Total focus', window.fmtMins(totalMin))}
        {stat('Sessions', String(rows.length), 'all time')}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:22, minWidth:0 }}>
        <div className="card" style={{ padding:22, minWidth:0 }}>
          <div className="eyebrow">Focus · last 7 days</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>Daily average <strong>{window.fmtMins(Math.round(weekMin/7))}</strong></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10, height:140, marginTop:18, alignItems:'end' }}>
            {dayBars.map((d,i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%', justifyContent:'end' }} title={`${d.full}: ${window.fmtMins(d.min)}`}>
                <div className="bar" style={{ height:'100%' }}>
                  <span style={{ height:(d.min/maxDay*100)+'%', background:i===6?'var(--accent)':'var(--border-strong)', opacity:i===6?1:0.7 }} />
                </div>
                <div style={{ fontSize:11, color:i===6?'var(--text)':'var(--text-3)', fontWeight:i===6?700:500 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding:22, minWidth:0 }}>
          <div className="eyebrow" style={{ marginBottom:16 }}>By subject · all time</div>
          <div className="stack" style={{ gap:10 }}>
            {subjects.map(s => {
              const color = SUBJECTS[s.subject] || '#888';
              return (
                <div key={s.subject}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                    <span style={{ fontWeight:600 }}>{s.subject}</span>
                    <span style={{ color:'var(--text-3)', fontFamily:'var(--ff-sub)' }}>{window.fmtMins(s.minutes)}</span>
                  </div>
                  <div style={{ height:7, background:'var(--bg-sunken)', borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:(s.minutes/maxSubj*100)+'%', borderRadius:999, background:color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:22, minWidth:0 }}>
        <div className="card" style={{ padding:22, minWidth:0 }}>
          <div className="eyebrow">Most focused time of day</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(24,1fr)', gap:2, height:120, marginTop:16, alignItems:'end' }}>
            {byHour.map((mins,h) => (
              <div key={h} title={`${h}:00 — ${window.fmtMins(mins)}`} style={{ height:'100%', display:'flex', alignItems:'flex-end' }}>
                <div style={{ width:'100%', height:Math.max(2, mins/maxHour*100)+'%', background: mins>0?'var(--accent)':'var(--bg-sunken)', borderRadius:2 }} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-3)', marginTop:6 }}>
            <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
          </div>
        </div>

        <div className="card" style={{ padding:22, minWidth:0 }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>Weekly rhythm</div>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {grid.map((rowArr,di) => (
              <div key={di} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:9, color:'var(--text-3)', width:22, flexShrink:0 }}>{DOW[di]}</span>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(24,1fr)', gap:2, flex:1 }}>
                  {rowArr.map((mins,h) => (
                    <div key={h} title={`${DOW[di]} ${h}:00 — ${window.fmtMins(mins)}`} style={{ height:12, borderRadius:2, background: mins>0?'var(--accent)':'var(--bg-sunken)', opacity: mins>0?(0.25+0.75*(mins/maxCell)):1 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--text-3)', marginTop:8, paddingLeft:28 }}>12 AM → 11 PM</div>
        </div>
      </div>

      <div className="card" style={{ padding:22 }}>
        <div className="row-between" style={{ marginBottom:16 }}>
          <div className="eyebrow">Focus in {yr}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--text-3)' }}>
            Less
            {[0,0.3,0.55,0.78,1].map((op,i) => <span key={i} style={{ width:11, height:11, borderRadius:2, background: op===0?'var(--bg-sunken)':'var(--accent)', opacity: op===0?1:op, display:'inline-block' }} />)}
            More
          </div>
        </div>
        <div style={{ overflowX:'auto', paddingBottom:6 }}>
          <div style={{ display:'flex', gap:3, minWidth:'min-content' }}>
            {weeks.map((wk,wi) => (
              <div key={wi} style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {wk.map((d,dyi) => {
                  const inYear = d.getFullYear()===yr;
                  const mins = inYear ? (dayMap[window.focusYmd(d)]||0) : 0;
                  return <div key={dyi} title={inYear?`${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} — ${window.fmtMins(mins)}`:''} style={{ width:11, height:11, borderRadius:2, ...yearCellStyle(mins, inYear) }} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:22 }}>
        <div className="eyebrow" style={{ marginBottom:14 }}>Focus records</div>
        <div className="stack" style={{ gap:0 }}>
          {rows.slice(0,15).map((r,i) => {
            const d = when(r);
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:i===0?'none':'1px solid var(--border)' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'var(--accent-soft)', color:'var(--accent)', display:'grid', placeItems:'center', flexShrink:0 }}>
                  <Icon name="clock" size={15} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label || 'Focus session'}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
                    {d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}{r.subject ? ' · '+r.subject : ''}
                  </div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{window.fmtMins(r.duration_minutes||0)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function mapTaskRow(t) {
  return {
    ...t,
    subtasks: [],
    points: 50,
    subject: t.subject || 'General',
    impact: [2.5, 2.5],
    due: t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null,
    dueSort: t.due_date ? Math.ceil((new Date(t.due_date) - new Date()) / 86400000) : 999,
    priority: t.priority || 'Routine',
  };
}

function CreateItemModal({ goals, defaultKind, onClose, onTaskCreated, onGoalCreated }) {
  const [kind, setKind] = React.useState(defaultKind || 'task');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [priority, setPriority] = React.useState('Routine');
  const [dueDate, setDueDate] = React.useState('');
  const [goalId, setGoalId] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [goalTasks, setGoalTasks] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const addGoalTask = () => setGoalTasks(g => [...g, { title: '', due: '' }]);
  const updateGoalTask = (i, field, val) => setGoalTasks(g => g.map((t, j) => j === i ? { ...t, [field]: val } : t));
  const removeGoalTask = (i) => setGoalTasks(g => g.filter((_, j) => j !== i));

  const submit = async () => {
    setErr('');
    if (!title.trim()) { setErr('Please enter a title.'); return; }
    setSaving(true);
    const { data: { user } } = await window._supabase.auth.getUser();
    if (kind === 'task') {
      const { data, error } = await window._supabase.from('tasks').insert({
        user_id: user.id,
        title: title.trim(),
        notes: description.trim() || null,
        subject: subject || null,
        priority,
        due_date: dueDate || null,
        goal_id: goalId || null,
        order_index: 0,
      }).select('*, roadmap_step:roadmap_steps(title, goal_id)').single();
      setSaving(false);
      if (error) { setErr(error.message); return; }
      onTaskCreated(mapTaskRow(data));
    } else {
      const { data: goal, error } = await window._supabase.from('goals').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
        status: 'active',
      }).select().single();
      if (error) { setSaving(false); setErr(error.message); return; }
      let createdTasks = [];
      const rows = goalTasks.filter(t => t.title.trim()).map(t => ({
        user_id: user.id, title: t.title.trim(), due_date: t.due || null,
        goal_id: goal.id, priority: 'Routine', order_index: 0,
      }));
      if (rows.length) {
        const { data: tdata, error: terr } = await window._supabase.from('tasks').insert(rows).select('*, roadmap_step:roadmap_steps(title, goal_id)');
        if (terr) { setSaving(false); setErr('Goal created, but adding tasks failed: ' + terr.message); return; }
        createdTasks = (tdata || []).map(mapTaskRow);
      }
      setSaving(false);
      onGoalCreated(goal, createdTasks);
    }
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:480, maxHeight:'86vh', overflow:'auto', zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--ff-display)', fontSize:22 }}>Create new</div>
          <button onClick={onClose} style={{ color:'var(--text-3)', fontSize:14, background:'none', border:'none', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px' }}>
          <div className="seg" style={{ width:'100%', marginBottom:16 }}>
            <button className={kind==='task'?'on':''} onClick={()=>setKind('task')}>Task</button>
            <button className={kind==='goal'?'on':''} onClick={()=>setKind('goal')}>Goal</button>
          </div>

          <div className="stack" style={{ gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Title</div>
              <input className="input" placeholder={kind==='task'?'What needs to get done?':'What do you want to achieve?'} value={title} onChange={e=>setTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Description</div>
              <textarea className="input" rows={3} placeholder="Optional details" value={description} onChange={e=>setDescription(e.target.value)} style={{ resize:'none', lineHeight:1.5 }} />
            </div>

            {kind==='task' ? (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom:6 }}>Subject</div>
                    <select className="input" style={{ fontSize:13 }} value={subject} onChange={e=>setSubject(e.target.value)}>
                      <option value="">None</option>
                      {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom:6 }}>Priority</div>
                    <select className="input" style={{ fontSize:13 }} value={priority} onChange={e=>setPriority(e.target.value)}>
                      {Object.keys(PRIORITY_CONFIG).map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom:6 }}>Due date</div>
                    <input className="input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom:6 }}>Link to goal</div>
                    <select className="input" style={{ fontSize:13 }} value={goalId} onChange={e=>setGoalId(e.target.value)}>
                      <option value="">No goal</option>
                      {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="eyebrow" style={{ marginBottom:6 }}>Target date</div>
                  <input className="input" type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)} />
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom:6 }}>Tasks for this goal (optional)</div>
                  {goalTasks.length > 0 &&
                    <div className="stack" style={{ gap:8, marginBottom:8 }}>
                      {goalTasks.map((t,i) =>
                        <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <input className="input" placeholder="Task title" value={t.title} onChange={e=>updateGoalTask(i,'title',e.target.value)} style={{ flex:1, fontSize:13 }} />
                          <input className="input" type="date" value={t.due} onChange={e=>updateGoalTask(i,'due',e.target.value)} style={{ width:140, fontSize:13 }} title="Due date (optional)" />
                          <button className="btn ghost sm" onClick={()=>removeGoalTask(i)} style={{ flexShrink:0 }}>✕</button>
                        </div>
                      )}
                    </div>
                  }
                  <button className="btn ghost sm" onClick={addGoalTask}><Icon name="plus" size={12} /> Add task</button>
                </div>
              </>
            )}

            {err && <div style={{ fontSize:12, color:'var(--coral)', background:'var(--coral-100)', borderRadius:8, padding:'8px 12px' }}>{err}</div>}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={!title.trim()||saving} onClick={submit}>{saving?'Creating…':(kind==='task'?'Create task':'Create goal')}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TasksScreen({ tasks, setTasks, goals, setGoals, dataLoading, onReward }) {
  const [tab, setTab] = useState('tasks');
  const [expanded, setExpanded] = useState(null);
  const [creating, setCreating] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const dayDiff = (dd) => {
    if (!dd) return null;
    const d = new Date(dd + 'T00:00:00');
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  };
  const matchesDue = (t, f) => {
    if (f === 'all') return true;
    const diff = dayDiff(t.due_date);
    if (diff === null) return false;
    if (f === 'today') return diff <= 0;
    if (f === 'tomorrow') return diff === 1;
    if (f === 'week') return diff <= 7;
    return true;
  };
  const openTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);
  const visibleOpen = openTasks.filter(t => matchesDue(t, taskFilter));
  const openCount = (f) => openTasks.filter(t => matchesDue(t, f)).length;

  const tasksLoading = dataLoading;
  const goalsLoading = dataLoading;

  const completeTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.is_completed;
    await window._supabase
      .from('tasks')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null
      })
      .eq('id', id);
    setTasks(ts => ts.map(t => t.id === id ? { ...t, is_completed: newCompleted } : t));
  };

  const toggleSub = (id, idx) => {
    setTasks((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const wasAllDone = t.subtasks.every((s) => s.done);
      const newSubs = t.subtasks.map((s, i) => i === idx ? { ...s, done: !s.done } : s);
      if (!wasAllDone && newSubs.every((s) => s.done)) onReward(t.points);
      return { ...t, subtasks: newSubs };
    }));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Tasks & Goals</div>
          <h1 className="page-title">Ship the work</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 580 }}>
            Every task has a priority label and due date. Critical + due soon → Do First.
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="tabs">
            <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>Tasks ({tasks.length})</button>
            <button className={tab === 'goals' ? 'on' : ''} onClick={() => setTab('goals')}>Goals ({goals.length})</button>
            <button className={tab === 'focus' ? 'on' : ''} onClick={() => setTab('focus')}>Focus Metrics</button>
          </div>
          <button className="btn primary" onClick={() => setCreating(true)} style={{ flexShrink:0 }}><Icon name="plus" size={13} /> New</button>
        </div>
      </div>

      {tab === 'tasks' &&
      <div>
          <div className="seg" style={{ marginBottom: 16, display: 'inline-flex', flexWrap: 'wrap' }}>
            {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days'], ['all', 'All']].map(([k, label]) =>
            <button key={k} className={taskFilter === k ? 'on' : ''} onClick={() => setTaskFilter(k)}>{label} ({openCount(k)})</button>
            )}
          </div>
          {tasksLoading
            ? <div style={{ color: 'var(--text-3)', fontSize: 14, padding: 20 }}>Loading tasks...</div>
            : <>
                {visibleOpen.length === 0
                  ? <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>{openTasks.length === 0 ? '✅' : '🗓️'}</div>
                      <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, marginBottom: 8 }}>{openTasks.length === 0 ? 'No open tasks' : 'Nothing in this view'}</div>
                      <div style={{ fontSize: 14 }}>{openTasks.length === 0 ? 'Create one with the + New button.' : 'No tasks match this date range.'}</div>
                    </div>
                  : <div className="stack" style={{ gap: 12 }}>
                      {visibleOpen.map((t) =>
                      <TaskRow key={t.id} task={t}
                        expanded={expanded === t.id}
                        onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                        onCheck={() => completeTask(t.id)}
                        onSubCheck={(i) => toggleSub(t.id, i)} />
                      )}
                    </div>
                }
                {completedTasks.length > 0 &&
                <div style={{ marginTop: 24 }}>
                    <button onClick={() => setShowCompleted(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, padding: '4px 0' }}>
                      <Icon name={showCompleted ? 'chevron-down' : 'chevron-right'} size={14} />
                      Completed ({completedTasks.length})
                    </button>
                    {showCompleted &&
                  <div className="stack" style={{ gap: 12, marginTop: 10 }}>
                        {completedTasks.map((t) =>
                    <TaskRow key={t.id} task={t}
                      expanded={expanded === t.id}
                      onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                      onCheck={() => completeTask(t.id)}
                      onSubCheck={(i) => toggleSub(t.id, i)} />
                    )}
                      </div>
                  }
                  </div>
                }
              </>
          }
        </div>
      }

      {tab === 'goals' &&
      <div className="stack" style={{ gap: 16 }}>
          {goalsLoading
            ? <div style={{ color: 'var(--text-3)', fontSize: 14, padding: 20 }}>Loading goals...</div>
            : goals.length === 0
            ? <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, marginBottom: 8 }}>No goals yet</div>
                <div style={{ fontSize: 14 }}>Your growth roadmap goals will appear here.</div>
              </div>
            : goals.map((g) => <GoalCard key={g.id} goal={g} tasks={tasks} />)
          }
        </div>
      }

      {tab === 'focus' && <FocusStats />}

      {creating && <CreateItemModal
        goals={goals}
        onClose={() => setCreating(false)}
        onTaskCreated={(t) => { setTasks(ts => [t, ...ts]); setTab('tasks'); }}
        onGoalCreated={(g, ts = []) => { setGoals(gs => [g, ...gs]); if (ts.length) setTasks(prev => [...ts, ...prev]); setTab('goals'); }}
      />}
    </>);

}

Object.assign(window, { TasksScreen, SubjectTag, PriorityBadge, DueDateBadge, mapTaskRow });