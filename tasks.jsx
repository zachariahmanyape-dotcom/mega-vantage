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
  const done = task.subtasks.filter((s) => s.done).length;
  const pct = Math.round(done / task.subtasks.length * 100);
  const completed = done === task.subtasks.length;
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
            <span>{done} of {task.subtasks.length} subtasks</span>
            <span style={{ opacity: 0.5 }}>·</span>
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
            <div className="eyebrow" style={{ marginBottom: 10 }}>Subtasks</div>
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
  const linked = tasks.filter(t => t.roadmap_step?.goal_id === goal.id);
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

function TasksScreen({ tasks, setTasks, goals, setGoals, dataLoading, onReward }) {
  const [tab, setTab] = useState('tasks');
  const [expanded, setExpanded] = useState(null);

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
        <div className="tabs">
          <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>Tasks ({tasks.length})</button>
          <button className={tab === 'goals' ? 'on' : ''} onClick={() => setTab('goals')}>Goals ({goals.length})</button>
          <button className={tab === 'focus' ? 'on' : ''} onClick={() => setTab('focus')}>Focus</button>
        </div>
      </div>

      {tab === 'tasks' &&
      <div>
          {/* Priority legend */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) =>
          <span key={k} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: v.bg, color: v.color, border: '1px solid ' + v.color + '55', fontFamily: 'var(--ff-sub)', fontWeight: 700 }}>{k}</span>
          )}
            <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>· Drag tasks in the matrix to reprioritize</span>
          </div>
          {tasksLoading
            ? <div style={{ color: 'var(--text-3)', fontSize: 14, padding: 20 }}>Loading tasks...</div>
            : tasks.length === 0
            ? <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, marginBottom: 8 }}>No tasks yet</div>
                <div style={{ fontSize: 14 }}>Tasks from your growth roadmap will appear here.</div>
              </div>
            : <div className="stack" style={{ gap: 12 }}>
                {tasks.map((t) =>
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
    </>);

}

Object.assign(window, { TasksScreen, SubjectTag, PriorityBadge, DueDateBadge });