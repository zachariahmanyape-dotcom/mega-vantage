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
            </div>);

        })}
      </div>
    </div>);

}

function TasksScreen({ onReward }) {
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState(() => TASKS.map((t) => ({
    ...t,
    priority: ['Critical', 'Important', 'Important', 'Routine', 'Routine'][TASKS.indexOf(t)] || 'Routine',
    subtasks: t.subtasks.map((s) => ({ ...s }))
  })));
  const [expanded, setExpanded] = useState('t1');

  const completeTask = (id) => {
    setTasks((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const allDone = t.subtasks.every((s) => s.done);
      if (allDone) return { ...t, subtasks: t.subtasks.map((s) => ({ ...s, done: false })) };
      onReward(t.points);
      return { ...t, subtasks: t.subtasks.map((s) => ({ ...s, done: true })) };
    }));
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
          <button className={tab === 'goals' ? 'on' : ''} onClick={() => setTab('goals')}>Goals ({GOALS.length})</button>
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
          <div className="stack" style={{ gap: 12 }}>
            {tasks.map((t) =>
          <TaskRow key={t.id} task={t}
          expanded={expanded === t.id}
          onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
          onCheck={() => completeTask(t.id)}
          onSubCheck={(i) => toggleSub(t.id, i)} />

          )}
          </div>
        </div>
      }

      {tab === 'goals' &&
      <div className="stack" style={{ gap: 16 }}>
          {GOALS.map((g) => <GoalCard key={g.id} goal={g} tasks={tasks} />)}
        </div>
      }
    </>);

}

Object.assign(window, { TasksScreen, SubjectTag, PriorityBadge, DueDateBadge });