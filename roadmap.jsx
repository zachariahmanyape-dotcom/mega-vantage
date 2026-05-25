// roadmap.jsx — Member "Roadmap" view
// Shows the member's most recent active goal as a phased roadmap: progress bar,
// one card per roadmap_step, with checkable tasks, editable due dates + notes,
// reflection prompts and "Note from Zach" callouts.

const RM_PHASE_TONE = {
  Foundation: 'sapphire',
  Build: 'teal',
  Accelerate: 'coral',
};

// Pull the leading "Weeks X-Y" out of a roadmap_step.description ("Weeks 1-2 — summary")
function rmWeeks(description) {
  if (!description) return '';
  const m = description.match(/^\s*(weeks?[^—\-–]*)/i);
  return m ? m[1].trim() : '';
}

function RmSaveTick({ on }) {
  if (!on) return null;
  return (
    <span className="rm-saved" style={{ fontSize: 11, color: 'var(--teal-600)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Icon name="check" size={11} /> Saved
    </span>
  );
}

function RmTask({ task, onToggle, onSaveField }) {
  const { useState } = React;
  const [done, setDone] = useState(!!task.is_completed);
  const [due, setDue] = useState(task.due_date || '');
  const [note, setNote] = useState(task.member_notes || '');
  const [savedTick, setSavedTick] = useState(null); // 'due' | 'note'

  const tick = (which) => { setSavedTick(which); setTimeout(() => setSavedTick(null), 1600); };

  const toggle = async () => {
    const next = !done;
    setDone(next);
    await onToggle(task.id, next);
  };

  const blurDue = async () => {
    if (due === (task.due_date || '')) return;
    await onSaveField(task.id, { due_date: due || null });
    tick('due');
  };
  const blurNote = async () => {
    if (note === (task.member_notes || '')) return;
    await onSaveField(task.id, { member_notes: note || null });
    tick('note');
  };

  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid var(--border)' }}>
      <button onClick={toggle} className={'check' + (done ? ' on' : '')} style={{ marginTop: 2 }}>
        {done && <Icon name="check" size={12} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
          {task.title}
        </div>
        {task.notes && (
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.55 }}>{task.notes}</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={12} /> Due
          </span>
          <input type="date" className="input" value={due ? due.slice(0, 10) : ''}
            onChange={(e) => setDue(e.target.value)} onBlur={blurDue}
            style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} />
          {savedTick === 'due' && <RmSaveTick on />}
        </div>

        <div style={{ marginTop: 10 }}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={blurNote}
            rows={2} placeholder="Add your notes, reflections, or progress on this task..."
            className="input" style={{ fontSize: 12.5, resize: 'vertical', lineHeight: 1.5 }} />
          {savedTick === 'note' && <div style={{ marginTop: 4 }}><RmSaveTick on /></div>}
        </div>
      </div>
    </div>
  );
}

function RmPhaseCard({ step, tasks, index, dimmed, defaultOpen, onToggleTask, onSaveField }) {
  const { useState } = React;
  const [open, setOpen] = useState(defaultOpen);
  const tone = RM_PHASE_TONE[step.phase_label] || 'sapphire';
  const weeks = rmWeeks(step.description);
  const doneCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="card rm-phase" style={{ padding: 0, overflow: 'hidden', marginBottom: 16, opacity: dimmed ? 0.62 : 1, transition: 'opacity .3s ease', animationDelay: (index * 80) + 'ms' }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', textAlign: 'left', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            {step.phase_label && <span className={'chip ' + tone}>{step.phase_label}</span>}
            {weeks && <span className="eyebrow">{weeks}</span>}
            {dimmed && <span className="eyebrow" style={{ color: 'var(--text-3)' }}>· complete a task above to begin</span>}
          </div>
          <div style={{ fontFamily: 'var(--ff-sub)', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{step.title}</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{doneCount}/{tasks.length}</span>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      </button>

      {open && (
        <div className="rm-phase-body" style={{ padding: '4px 22px 20px' }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-3)' }}>No tasks in this phase yet.</div>
          ) : (
            tasks.map((t) => (
              <RmTask key={t.id} task={t} onToggle={onToggleTask} onSaveField={onSaveField} />
            ))
          )}

          {step.reflection_prompt && (
            <div style={{ marginTop: 16, background: 'rgba(79,183,166,0.12)', borderRadius: 10, padding: '14px 16px', borderLeft: '3px solid var(--teal-600)' }}>
              <div className="eyebrow" style={{ color: 'var(--teal-600)', marginBottom: 6 }}>Reflection prompt</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.6 }}>{step.reflection_prompt}</div>
            </div>
          )}

          {step.admin_notes && (
            <div style={{ marginTop: 12, background: 'rgba(255,107,107,0.12)', borderRadius: 10, padding: '14px 16px', borderLeft: '3px solid var(--coral)' }}>
              <div className="eyebrow" style={{ color: 'var(--coral)', marginBottom: 6 }}>Note from Zach</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{step.admin_notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoadmapScreen() {
  const { useState, useEffect } = React;
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [steps, setSteps] = useState([]);
  const [tasksByStep, setTasksByStep] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await window._supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: goals } = await window._supabase.from('goals')
        .select('*').eq('user_id', user.id).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1);
      const g = goals && goals[0];
      if (!g) { if (active) { setGoal(null); setLoading(false); } return; }

      const [{ data: stepRows }, { data: taskRows }] = await Promise.all([
        window._supabase.from('roadmap_steps').select('*').eq('goal_id', g.id).order('order_index', { ascending: true }),
        window._supabase.from('tasks').select('*').eq('goal_id', g.id).order('roadmap_step_id', { ascending: true }).order('order_index', { ascending: true }),
      ]);

      const grouped = {};
      (taskRows || []).forEach((t) => {
        const k = t.roadmap_step_id || 'none';
        (grouped[k] = grouped[k] || []).push(t);
      });

      if (!active) return;
      setGoal(g);
      setSteps(stepRows || []);
      setTasksByStep(grouped);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const toggleTask = async (taskId, done) => {
    const patch = { is_completed: done, completed_at: done ? new Date().toISOString() : null };
    await window._supabase.from('tasks').update(patch).eq('id', taskId);
    setTasksByStep((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = prev[k].map((t) => t.id === taskId ? { ...t, ...patch } : t); });
      return next;
    });
  };

  const saveField = async (taskId, patch) => {
    await window._supabase.from('tasks').update(patch).eq('id', taskId);
    setTasksByStep((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = prev[k].map((t) => t.id === taskId ? { ...t, ...patch } : t); });
      return next;
    });
  };

  const allTasks = Object.values(tasksByStep).flat();
  const total = allTasks.length;
  const done = allTasks.filter((t) => t.is_completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (loading) {
    return (
      <div className="card" style={{ padding: '28px 22px', color: 'var(--text-3)', fontSize: 13 }}>Loading your roadmap…</div>
    );
  }

  // Empty state — no active goal / roadmap
  if (!goal || steps.length === 0) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="eyebrow">Your plan</div>
            <h1 className="page-title">Roadmap</h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <Icon name="roadmap" size={26} />
          </div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 26, marginBottom: 8 }}>Your roadmap is on its way</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
            After your first discovery session with Zach, your personalized growth roadmap will appear right here — phase by phase, built around your goal.
          </div>
        </div>
      </>
    );
  }

  // Determine which phases are dimmed: a phase is soft-locked until the previous
  // phase has at least one completed task. First phase is always active + open.
  const prevHasProgress = steps.map((s, i) => {
    if (i === 0) return true;
    const prevTasks = tasksByStep[steps[i - 1].id] || [];
    return prevTasks.some((t) => t.is_completed);
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Your plan</div>
          <h1 className="page-title">Roadmap</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>{goal.title}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div className="eyebrow">Overall progress</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{done} of {total} tasks complete</div>
        </div>
        <div className="progress" style={{ height: 8 }}>
          <span style={{ width: pct + '%' }} />
        </div>
      </div>

      {steps.map((s, i) => (
        <RmPhaseCard
          key={s.id}
          step={s}
          tasks={tasksByStep[s.id] || []}
          index={i}
          dimmed={!prevHasProgress[i]}
          defaultOpen={i === 0}
          onToggleTask={toggleTask}
          onSaveField={saveField}
        />
      ))}
    </>
  );
}

Object.assign(window, { RoadmapScreen });
