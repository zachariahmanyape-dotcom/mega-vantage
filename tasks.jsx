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

function SubtaskTag({ source }) {
  const isAI = source === 'ai';
  return (
    <span style={{
      fontSize: 9, lineHeight: 1, padding: '3px 6px', borderRadius: 5,
      background: isAI ? 'var(--sapphire)' : 'var(--coral)', color: '#fff',
      fontFamily: 'var(--ff-sub)', fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0,
    }}>{isAI ? 'AI' : 'Manual'}</span>);

}

// Inline focus timer for the task detail panel (right column).
// Reads/writes the single shared timer (lives in App) so it keeps running when
// the row is collapsed or you navigate away, and is mirrored on the Dashboard.
function TaskFocusTimer({ task, focus }) {
  const [open, setOpen] = React.useState(false);
  const [mins, setMins] = React.useState(25);
  const [saving, setSaving] = React.useState(false);

  const t = focus && focus.state;
  const linked = t && t.linked;
  const mine = !!t && t.running && linked && linked.kind === 'task' && String(linked.id) === String(task.id);
  const other = !!t && t.running && !mine;
  window.useNowTick(mine && !t.paused);

  const startTimer = () => {
    focus.start({ id: task.id, label: task.title, subject: task.subject || null, kind: 'task' }, mins);
    setOpen(false);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    await focus.save();
    setSaving(false);
  };

  if (mine) {
    const remaining = window.focusTimerRemaining(t);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    const pct = t.totalSec ? (remaining / t.totalSec * 100) : 0;
    return (
      <div>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 30, fontWeight: 700, textAlign: 'center', letterSpacing: '0.02em', color: 'var(--text)' }}>{mm}:{ss}</div>
        <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden', margin: '8px 0 10px' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', borderRadius: 999, transition: 'width 0.9s linear' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => t.paused ? focus.resume() : focus.pause()}>{t.paused ? 'Resume' : 'Pause'}</button>
          <button className="btn sm" style={{ flex: 1, justifyContent: 'center', background: 'var(--teal-600)', color: '#fff', borderColor: 'var(--teal-600)' }} disabled={saving} onClick={save}>{saving ? '…' : 'Save'}</button>
        </div>
      </div>);

  }

  return (
    <div>
      {!open &&
        <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setOpen(true)}>Start timer</button>
      }
      <div style={{ maxHeight: open ? 260 : 0, opacity: open ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.22s ease, opacity 0.22s ease' }}>
        {other &&
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.4 }}>A timer is running on another task — starting here replaces it.</div>
        }
        <div className="eyebrow" style={{ marginBottom: 8 }}>Duration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          {[15, 25, 45, 60].map((m) =>
          <button key={m} className="btn sm" onClick={() => setMins(m)}
            style={{ justifyContent: 'center', ...(mins === m ? { background: 'var(--accent)', color: 'var(--accent-contrast)', borderColor: 'var(--accent)' } : {}) }}>{m} min</button>
          )}
        </div>
        <button className="btn primary sm" style={{ width: '100%', justifyContent: 'center' }} onClick={startTimer}>Start</button>
      </div>
    </div>);

}

function TaskDetailPanel({ task, onTaskMetaChange, focus, focusTick, onEdit }) {
  const [subs, setSubs] = React.useState([]);
  const [loadingSubs, setLoadingSubs] = React.useState(true);
  const [regenCount, setRegenCount] = React.useState(task.regen_count || 0);
  const [generating, setGenerating] = React.useState(false);
  const [genError, setGenError] = React.useState('');
  const [confirmRegen, setConfirmRegen] = React.useState(false);
  const [newSub, setNewSub] = React.useState('');
  const [focusTotal, setFocusTotal] = React.useState(0);
  const [editingSubId, setEditingSubId] = React.useState(null);
  const [editingText, setEditingText] = React.useState('');

  React.useEffect(() => {
    let active = true;
    window._supabase.from('subtasks').select('*').eq('task_id', task.id)
      .order('order_index', { ascending: true }).order('created_at', { ascending: true })
      .then(({ data, error }) => { if (active) { setSubs(error ? [] : (data || [])); setLoadingSubs(false); } });
    window._supabase.from('focus_sessions').select('duration_minutes')
      .eq('linked_kind', 'task').eq('linked_id', String(task.id))
      .then(({ data }) => { if (active) setFocusTotal((data || []).reduce((a, r) => a + (r.duration_minutes || 0), 0)); });
    return () => { active = false; };
  }, [task.id, focusTick]);

  const toggleSub = async (id) => {
    const sub = subs.find((s) => s.id === id);
    if (!sub) return;
    const next = !sub.is_completed;
    setSubs((s) => s.map((x) => x.id === id ? { ...x, is_completed: next } : x));
    await window._supabase.from('subtasks').update({ is_completed: next }).eq('id', id);
    if (next && window.awardXp) window.awardXp('subtask_complete', 5, id, true, true);
  };

  const addManual = async () => {
    const text = newSub.trim();
    if (!text) return;
    const { data: { user } } = await window._supabase.auth.getUser();
    const { data, error } = await window._supabase.from('subtasks').insert({
      task_id: task.id, user_id: user.id, text, source: 'manual', order_index: subs.length,
    }).select().single();
    if (!error && data) { setSubs((s) => [...s, data]); setNewSub(''); }
  };

  const startEditSub = (s) => { setEditingSubId(s.id); setEditingText(s.text); };
  const saveEditSub = async () => {
    const id = editingSubId;
    const text = editingText.trim();
    setEditingSubId(null);
    if (!id || !text) return;
    setSubs((arr) => arr.map((x) => x.id === id ? { ...x, text } : x));
    await window._supabase.from('subtasks').update({ text }).eq('id', id);
  };
  const deleteSub = async (id) => {
    setSubs((arr) => arr.filter((x) => x.id !== id));
    await window._supabase.from('subtasks').delete().eq('id', id);
  };

  const generate = async (regen) => {
    setGenError('');
    setGenerating(true);
    try {
      const { data, error } = await window._supabase.functions.invoke('generate-subtasks', {
        body: { title: task.title, description: task.notes || '' },
      });
      if (error || !data || !Array.isArray(data.subtasks) || data.subtasks.length < 3) throw new Error('bad response');
      const { data: { user } } = await window._supabase.auth.getUser();
      if (regen) await window._supabase.from('subtasks').delete().eq('task_id', task.id);
      const rows = data.subtasks.map((text, i) => ({
        task_id: task.id, user_id: user.id, text, source: 'ai', order_index: i,
      }));
      const { data: inserted, error: insErr } = await window._supabase.from('subtasks').insert(rows).select();
      if (insErr) throw insErr;
      setSubs(inserted || []);
      setConfirmRegen(false);
      if (regen) {
        const nc = regenCount + 1;
        setRegenCount(nc);
        await window._supabase.from('tasks').update({ regen_count: nc }).eq('id', task.id);
        if (onTaskMetaChange) onTaskMetaChange(task.id, { regen_count: nc });
      }
    } catch (e) {
      setGenError('Could not generate subtasks. Please try again.');
    }
    setGenerating(false);
  };

  const hasSubs = subs.length > 0;
  const focusLine = focusTotal > 0
    ? `${Math.floor(focusTotal / 60)}h ${focusTotal % 60}m focused on this task`
    : 'No focus time logged yet.';

  return (
    <div style={{ padding: '18px 20px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-sunken)', display: 'grid', gridTemplateColumns: '1fr 180px', gap: 24 }}>
      {/* Left column — Details + Subtasks */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="eyebrow" style={{ margin: 0 }}>Details</div>
          <button className="btn ghost sm" onClick={() => onEdit && onEdit(task)} style={{ padding: '4px 8px' }}><Icon name="edit" size={12} /> Edit task</button>
        </div>
        <div style={{ fontSize: 13, color: task.notes ? 'var(--text-2)' : 'var(--text-3)', lineHeight: 1.5, marginBottom: 16 }}>
          {task.notes || 'No description.'}
        </div>

        <div className="eyebrow" style={{ marginBottom: 10 }}>Subtasks</div>
        {loadingSubs
          ? <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Loading…</div>
          : <>
              {hasSubs &&
                <div className="stack" style={{ gap: 8, marginBottom: 10 }}>
                  {subs.map((s) =>
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                      <div className={"check" + (s.is_completed ? " on" : "")} onClick={() => toggleSub(s.id)}>
                        {s.is_completed && <Icon name="check" size={11} stroke={3} />}
                      </div>
                      {editingSubId === s.id
                        ? <input className="input" value={editingText} autoFocus
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEditSub(); if (e.key === 'Escape') setEditingSubId(null); }}
                            onBlur={saveEditSub}
                            style={{ flex: 1, fontSize: 13, padding: '4px 8px' }} />
                        : <div style={{ fontSize: 13, flex: 1, minWidth: 0, color: s.is_completed ? 'var(--text-3)' : 'var(--text)', textDecoration: s.is_completed ? 'line-through' : 'none' }}>{s.text}</div>
                      }
                      <SubtaskTag source={s.source} />
                      {editingSubId !== s.id &&
                        <button onClick={() => startEditSub(s)} title="Edit subtask" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', flexShrink: 0 }}><Icon name="edit" size={12} /></button>
                      }
                      <button onClick={() => deleteSub(s.id)} title="Delete subtask" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, fontSize: 13, lineHeight: 1, flexShrink: 0 }}>✕</button>
                    </div>
                  )}
                </div>
              }
              {!hasSubs &&
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>No subtasks yet — break it down or add one below.</div>
              }
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={newSub} placeholder="Add a subtask…"
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addManual(); }}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px' }} />
                <button className="btn sm" onClick={addManual} disabled={!newSub.trim()} style={{ flexShrink: 0 }}>Add</button>
              </div>
            </>
        }
      </div>

      {/* Right column — Focus Timer + AI breakdown controls */}
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Focus timer</div>
        <TaskFocusTimer task={task} focus={focus} />
        <div style={{ fontSize: 11, color: focusTotal > 0 ? 'var(--teal-600)' : 'var(--text-3)', marginTop: 10, fontWeight: focusTotal > 0 ? 600 : 400, lineHeight: 1.4 }}>
          {focusLine}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0 0', paddingTop: 14 }}>
          {!hasSubs &&
            <button className="btn primary sm" style={{ width: '100%', justifyContent: 'center' }} disabled={generating} onClick={() => generate(false)}>
              {generating ? 'Breaking down…' : '✦ Break this down'}
            </button>
          }
          {hasSubs && !confirmRegen && regenCount < 3 &&
            <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} disabled={generating} onClick={() => setConfirmRegen(true)}>
              {generating ? 'Regenerating…' : '↻ Regenerate'}
            </button>
          }
          {hasSubs && regenCount >= 3 && !confirmRegen &&
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>Regeneration limit reached. Add subtasks manually.</div>
          }
          {confirmRegen &&
            <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>
              Regenerating will remove all existing subtasks, including any you have completed or added manually. This cannot be undone. Are you sure?
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="btn sm" style={{ flex: 1, justifyContent: 'center', background: 'var(--coral)', color: '#fff', borderColor: 'var(--coral)' }} disabled={generating} onClick={() => generate(true)}>{generating ? '…' : 'Confirm'}</button>
                <button className="btn sm" style={{ flex: 1, justifyContent: 'center' }} disabled={generating} onClick={() => setConfirmRegen(false)}>Cancel</button>
              </div>
            </div>
          }
          {genError &&
            <div style={{ fontSize: 11, color: 'var(--coral)', marginTop: 8, lineHeight: 1.4 }}>{genError}</div>
          }
          {hasSubs && regenCount < 3 && !confirmRegen &&
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>{3 - regenCount} regeneration{3 - regenCount === 1 ? '' : 's'} left</div>
          }
        </div>
      </div>
    </div>);

}

function TaskRow({ task, expanded, onToggle, onCheck, onTaskMetaChange, focus, focusTick, onEdit }) {
  const hasSubs = task.subtasks && task.subtasks.length > 0;
  const done = hasSubs ? task.subtasks.filter((s) => s.done).length : 0;
  const completed = !!task.is_completed;
  const pct = completed ? 100 : (hasSubs ? Math.round(done / task.subtasks.length * 100) : 0);
  const timeSpent = window.FOCUS_LOG?.[task.id] || 0;

  // Live cue when this task's shared focus timer is running (visible while collapsed)
  const ft = focus && focus.state;
  const ftLinked = ft && ft.linked;
  const timing = !!ft && ft.running && ftLinked && ftLinked.kind === 'task' && String(ftLinked.id) === String(task.id);
  window.useNowTick(timing && !ft.paused);
  const tRemain = timing ? window.focusTimerRemaining(ft) : 0;
  const tmm = String(Math.floor(tRemain / 60)).padStart(2, '0');
  const tss = String(tRemain % 60).padStart(2, '0');

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
        {timing &&
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontFamily: 'var(--ff-mono)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {ft.paused ? '⏸' : '⏱'} {tmm}:{tss}
          </span>
        }
        <button className="btn ghost sm" onClick={(e) => {e.stopPropagation();onToggle();}}>
          <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
        </button>
      </div>

      {expanded && <TaskDetailPanel task={task} onTaskMetaChange={onTaskMetaChange} focus={focus} focusTick={focusTick} onEdit={onEdit} />}
    </div>);

}

function GoalCard({ goal, tasks, onComplete }) {
  const [open, setOpen] = useState(true);
  const GoalChevron = () => (
    <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Collapse goal' : 'Expand goal'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-3)' }}>
      <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} />
    </button>
  );
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GoalChevron />
              <div className="eyebrow" style={{ margin: 0 }}>Goal</div>
            </div>
            <div className="display" style={{ fontSize: 28, marginTop: 4, lineHeight: 1.1 }}>{goal.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>{goal.description}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 120 }}>
            <div className="display" style={{ fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>{pct}<span style={{ fontSize: 20, color: 'var(--text-3)' }}>%</span></div>
            <div className="eyebrow" style={{ marginTop: 4 }}>{doneSub} of {totalSub} steps</div>
            {totalTime > 0 && <div style={{ fontSize: 11, color: 'var(--teal-600)', marginTop: 4 }}>⏱ {totalTime}m total focus</div>}
          </div>
        </div>
        {open && <>
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
        </>}
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
            <GoalChevron />
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
          {onComplete && goal.status !== 'completed' && (
            <button className="btn ghost sm" onClick={() => onComplete(goal.id)} style={{ marginTop: 14 }}>
              <Icon name="check" size={12} stroke={3} /> Mark goal complete
            </button>
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
      {open && totalLinked > 0 && (
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

function EditTaskModal({ task, goals, onClose, onSaved }) {
  const [title, setTitle] = React.useState(task.title || '');
  const [description, setDescription] = React.useState(task.notes || '');
  const [subject, setSubject] = React.useState(task.subject && SUBJECTS[task.subject] ? task.subject : '');
  const [priority, setPriority] = React.useState(task.priority || 'Routine');
  const [dueDate, setDueDate] = React.useState(task.due_date || '');
  const [goalId, setGoalId] = React.useState(task.goal_id || '');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async () => {
    setErr('');
    if (!title.trim()) { setErr('Please enter a title.'); return; }
    setSaving(true);
    const { data, error } = await window._supabase.from('tasks').update({
      title: title.trim(),
      notes: description.trim() || null,
      subject: subject || null,
      priority,
      due_date: dueDate || null,
      goal_id: goalId || null,
    }).eq('id', task.id).select('*, roadmap_step:roadmap_steps(title, goal_id)').single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved(window.mapTaskRow(data));
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:480, maxHeight:'86vh', overflow:'auto', zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--ff-display)', fontSize:22 }}>Edit task</div>
          <button onClick={onClose} style={{ color:'var(--text-3)', fontSize:14, background:'none', border:'none', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'18px 22px' }}>
          <div className="stack" style={{ gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Title</div>
              <input className="input" value={title} onChange={e=>setTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Description</div>
              <textarea className="input" rows={3} placeholder="Optional details" value={description} onChange={e=>setDescription(e.target.value)} style={{ resize:'none', lineHeight:1.5 }} />
            </div>
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

            {err && <div style={{ fontSize:12, color:'var(--coral)', background:'var(--coral-100)', borderRadius:8, padding:'8px 12px' }}>{err}</div>}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={!title.trim()||saving} onClick={submit}>{saving?'Saving…':'Save changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TasksScreen({ tasks, setTasks, goals, setGoals, dataLoading, focus, focusTick, onReward }) {
  const [tab, setTab] = useState('tasks');
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  // Panels stay open until explicitly closed (independent toggles).
  const toggleExpanded = (id) => setExpandedIds((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

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
    if (newCompleted && window.awardXp) window.awardXp('task_complete', 20, id, true, true);
  };

  const completeGoal = async (id) => {
    const goal = goals.find(g => g.id === id);
    if (!goal || goal.status === 'completed') return;
    const { error } = await window._supabase.from('goals').update({ status: 'completed' }).eq('id', id);
    if (error) { console.error('Failed to complete goal:', error.message); return; }
    setGoals(gs => gs.map(g => g.id === id ? { ...g, status: 'completed' } : g));
    if (window.awardXp) window.awardXp('goal_complete', 100, id, true, true);
  };

  const updateTaskMeta = (id, patch) => {
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t));
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
                        expanded={expandedIds.has(t.id)}
                        onToggle={() => toggleExpanded(t.id)}
                        onCheck={() => completeTask(t.id)}
                        onTaskMetaChange={updateTaskMeta}
                        focus={focus} focusTick={focusTick}
                        onEdit={setEditingTask} />
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
                      expanded={expandedIds.has(t.id)}
                      onToggle={() => toggleExpanded(t.id)}
                      onCheck={() => completeTask(t.id)}
                      onTaskMetaChange={updateTaskMeta}
                      focus={focus} focusTick={focusTick}
                      onEdit={setEditingTask} />
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
            : goals.map((g) => <GoalCard key={g.id} goal={g} tasks={tasks} onComplete={completeGoal} />)
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

      {editingTask && <EditTaskModal
        task={editingTask}
        goals={goals}
        onClose={() => setEditingTask(null)}
        onSaved={(updated) => setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))}
      />}
    </>);

}

Object.assign(window, { TasksScreen, SubjectTag, PriorityBadge, DueDateBadge, mapTaskRow });