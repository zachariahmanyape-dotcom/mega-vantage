// roadmapbuilder.jsx — Admin "Roadmap Builder" view
// Admin runs this live during a discovery call: pick a member, fill the intake,
// generate a roadmap via the secure `generate-roadmap` Edge Function, review &
// edit it on screen, then save it to that member's Vantage profile.

// Carries a user-facing message + a short support code from the generate flow,
// so the catch block can show our white-labelled copy instead of a raw error.
class RoadmapGenError extends Error {
  constructor(message, code) { super(message); this.name = 'RoadmapGenError'; this.code = code; }
}

const RB_TIMELINES = ['30 days', '60 days', '90 days', '6 months', '12 months'];
const RB_HOURS = [
  '1-2 hrs (very limited)',
  '3-5 hrs (moderate)',
  '6-10 hrs (committed)',
  '10+ hrs (intensive)',
];
const RB_PILLARS = [
  { key: 'mindset', label: 'Mindset', desc: 'Belief in their ability to grow, resilience, self-awareness, attitude under pressure', color: 'var(--sapphire)' },
  { key: 'structure', label: 'Structure', desc: 'Habits, systems, time management, consistency, planning, follow-through', color: 'var(--coral)' },
  { key: 'competence', label: 'Competence', desc: 'Hard and soft skills, communication, domain knowledge, visible expertise', color: 'var(--teal-600)' },
];
const RB_FOCUS = [
  'Professional Communication', 'Time Management', 'Growth Mindset',
  'Early Career Development', 'Personal Branding', 'CV Development',
  'Project Management', 'Public Speaking', 'Habit Tracking',
  'Personal Finance', 'Strategic Sales', 'Leadership',
  'Networking', 'Emotional Intelligence', 'Negotiation',
  'Data & Analytics',
];
const RB_PHASE_LABELS = ['Foundation', 'Build', 'Accelerate'];

function rbTargetDate(timeline) {
  const d = new Date();
  const map = { '30 days': 30, '60 days': 60, '90 days': 90, '6 months': 180, '12 months': 365 };
  d.setDate(d.getDate() + (map[timeline] || 90));
  return d.toISOString().split('T')[0];
}

function rbAccelerateWeeks(timeline) {
  const map = { '30 days': '4', '60 days': '8', '90 days': '12', '6 months': '24', '12 months': '52' };
  return map[timeline] || '12';
}

// ── Small reusable controls ───────────────────────────────────
function RbField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="eyebrow" style={{ whiteSpace: 'normal' }}>{label}</label>
      {children}
    </div>
  );
}

function RbScale({ value, onChange, color = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value >= n && value > 0;
        return (
          <button key={n} type="button" onClick={() => onChange(n)} className="rb-scale-btn"
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              border: '1.5px solid ' + (on ? color : 'var(--border)'),
              background: on ? color : 'var(--bg-elev)',
              color: on ? '#fff' : 'var(--text-3)',
              fontFamily: 'var(--ff-sub)', fontWeight: 700, fontSize: 15,
            }}>
            {n}
          </button>
        );
      })}
    </div>
  );
}

// ── Editable review pieces ────────────────────────────────────
function RbTaskRow({ task, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 10, background: 'var(--bg-elev)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input className="rb-inline-title" value={task.title}
          onChange={(e) => onChange({ ...task, title: e.target.value })}
          placeholder="Task title"
          style={{ width: '100%', fontSize: 14, fontWeight: 600, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', marginBottom: 4 }} />
        <textarea value={task.description}
          onChange={(e) => onChange({ ...task, description: e.target.value })}
          placeholder="What to do and why it matters for this person"
          rows={2}
          style={{ width: '100%', fontSize: 12.5, color: 'var(--text-2)', border: 'none', outline: 'none', background: 'transparent', resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ff-body)' }} />
        {task.estimated_time && (
          <div className="eyebrow" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1}}>schedule</span> {task.estimated_time}
          </div>
        )}
      </div>
      <button type="button" onClick={onRemove} title="Remove task"
        style={{ color: 'var(--text-3)', fontSize: 18, lineHeight: 1, alignSelf: 'flex-start' }}>×</button>
    </div>
  );
}

function RbPhaseCard({ phase, index, onChange }) {
  const setTask = (ti, t) => {
    const tasks = phase.tasks.slice(); tasks[ti] = t;
    onChange({ ...phase, tasks });
  };
  const removeTask = (ti) => onChange({ ...phase, tasks: phase.tasks.filter((_, i) => i !== ti) });
  const addTask = () => onChange({ ...phase, tasks: [...phase.tasks, { title: 'New task', description: '', estimated_time: '30 mins/week' }] });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--ff-display)', fontSize: 14, flexShrink: 0 }}>
          {phase.phase_number || index + 1}
        </div>
        <input value={phase.title} onChange={(e) => onChange({ ...phase, title: e.target.value })}
          placeholder="Phase title"
          style={{ flex: 1, fontFamily: 'var(--ff-sub)', fontSize: 17, fontWeight: 700, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)' }} />
        <span className="chip sapphire">{phase.weeks || ''}</span>
      </div>
      <div style={{ padding: '18px 20px' }}>
        {phase.tasks.map((t, ti) => (
          <RbTaskRow key={ti} task={t} onChange={(nt) => setTask(ti, nt)} onRemove={() => removeTask(ti)} />
        ))}
        <button type="button" onClick={addTask}
          style={{ width: '100%', padding: 10, border: '1.5px dashed var(--border)', borderRadius: 10, color: 'var(--text-3)', fontWeight: 600, fontSize: 13, marginTop: 2 }}>
          + Add task
        </button>

        <div style={{ marginTop: 16, background: 'rgba(79,183,166,0.12)', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid var(--teal-600)' }}>
          <div className="eyebrow" style={{ color: 'var(--teal-600)', marginBottom: 6 }}>Reflection prompt</div>
          <textarea value={phase.reflection_prompt || ''} onChange={(e) => onChange({ ...phase, reflection_prompt: e.target.value })}
            rows={2} placeholder="A question for the member to sit with after this phase"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', resize: 'vertical', fontStyle: 'italic', lineHeight: 1.6, fontFamily: 'var(--ff-body)' }} />
        </div>

        <div style={{ marginTop: 12, background: 'rgba(255,107,107,0.12)', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid var(--coral)' }}>
          <div className="eyebrow" style={{ color: 'var(--coral)', marginBottom: 6 }}>Note from Zach · visible to member</div>
          <textarea value={phase.admin_notes || ''} onChange={(e) => onChange({ ...phase, admin_notes: e.target.value })}
            rows={2} placeholder="A personal note for this member about this phase…"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--ff-body)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────
function RoadmapBuilder() {
  const { useState, useEffect } = React;

  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [member, setMember] = useState(null);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalSuccess, setGoalSuccess] = useState('');
  const [timeline, setTimeline] = useState('90 days');
  const [importance, setImportance] = useState(3);
  const [currentRole, setCurrentRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [alreadyTried, setAlreadyTried] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [hours, setHours] = useState(RB_HOURS[1]);
  const [diag, setDiag] = useState({ mindset: 0, structure: 0, competence: 0 });
  const [focus, setFocus] = useState([]);
  const [notes, setNotes] = useState('');

  const [stage, setStage] = useState('intake'); // intake | loading | review | saved
  const [roadmap, setRoadmap] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { msg, kind }
  const [histKey, setHistKey] = useState(0); // bump to reload Roadmap History

  useEffect(() => {
    window._supabase.from('profiles')
      .select('id, full_name, email, account_type')
      .eq('role', 'member')
      .order('full_name', { ascending: true })
      .then(({ data }) => setMembers(data || []));
  }, []);

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    // Errors stay on screen until dismissed; success toasts auto-hide after 4s.
    if (kind !== 'error') setTimeout(() => setToast(null), 4000);
  };

  const onPickMember = (id) => {
    setMemberId(id);
    setMember(members.find((m) => m.id === id) || null);
  };

  const toggleFocus = (f) =>
    setFocus((cur) => cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);

  const canGenerate = !!memberId && diag.mindset > 0 && diag.structure > 0 && diag.competence > 0;

  const buildPrompt = () => {
    const accel = rbAccelerateWeeks(timeline);
    return `You are building a personalized growth roadmap for a MEGA Mentorship member. MEGA's framework rests on three pillars: Mindset, Structure, and Competence. Weight the roadmap toward whichever pillar(s) score lowest.

MEMBER PROFILE:
- Name: ${member?.full_name || 'Member'}
- Current role / situation: ${currentRole}
- Industry / context: ${industry}

GOAL:
- Primary goal: ${goalTitle}
- What success looks like: ${goalSuccess}
- Timeline: ${timeline}
- Importance: ${importance}/5

CURRENT STATE:
- Already tried: ${alreadyTried}
- Biggest obstacle: ${obstacle}
- Hours available per week: ${hours}

MEGA DIAGNOSTIC SCORES:
- Mindset: ${diag.mindset}/5
- Structure: ${diag.structure}/5
- Competence: ${diag.competence}/5

FOCUS AREAS: ${focus.length ? focus.join(', ') : 'General professional development'}

ADDITIONAL CONTEXT: ${notes}

OUTPUT INSTRUCTIONS:
Return ONLY a valid JSON object with NO markdown, NO backticks, NO preamble. Use exactly this structure:

{
  "summary": "2-3 sentence personalized overview of why the roadmap is structured this way",
  "phases": [
    {
      "phase_number": 1,
      "phase_label": "Foundation",
      "title": "Short phase title specific to this member",
      "weeks": "Weeks 1-2",
      "tasks": [
        { "title": "Task title", "description": "1-2 sentences: what to do and why it matters for this person", "estimated_time": "e.g. 30 mins/week" }
      ],
      "reflection_prompt": "A question for the member to sit with after completing this phase"
    }
  ]
}

RULES:
- Create exactly 3 phases: Foundation (Weeks 1-2), Build (Weeks 3-6), Accelerate (Weeks 7-${accel}).
- 3-5 tasks per phase.
- Tasks must be SPECIFIC to this person's situation, not generic advice.
- The weakest-scoring diagnostic pillar must be addressed first in Foundation.
- Tone: direct, practical, human. Not corporate. Not motivational.
- Reflection prompts must be genuinely thought-provoking, not rhetorical.`;
  };

  const generate = async () => {
    if (!canGenerate) return;
    setStage('loading');
    try {
      const { data, error } = await window._supabase.functions.invoke('generate-roadmap', {
        body: { prompt: buildPrompt() },
      });
      if (error) {
        // supabase-js puts the function's JSON body on error.context (a Response)
        // for non-2xx responses — read our structured { code, error } from it.
        let body = null;
        try { body = await error.context.json(); } catch (_) { /* not JSON */ }
        const friendly = body?.error
          || 'AI service temporarily unavailable — your inputs are saved, please try again in a few minutes.';
        const code = body?.code || 'AI-503';
        if (body?.detail) console.error('[RoadmapBuilder] AI provider detail:', body.detail);
        throw new RoadmapGenError(friendly, code);
      }
      if (data?.error) throw new RoadmapGenError(data.error, data.code || 'AI-ERR');
      const raw = (data?.text || '').trim();
      const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(clean);
      // normalise phase labels / numbers defensively
      parsed.phases = (parsed.phases || []).map((p, i) => ({
        ...p,
        phase_number: p.phase_number || i + 1,
        phase_label: p.phase_label || RB_PHASE_LABELS[i] || `Phase ${i + 1}`,
        admin_notes: p.admin_notes || '',
        tasks: p.tasks || [],
      }));
      setRoadmap(parsed);
      setStage('review');
    } catch (e) {
      console.error('Roadmap generation failed:', e);
      if (e instanceof RoadmapGenError) {
        // White-labelled, reassuring message for AI-provider / upstream failures.
        showToast(e.message + ' (' + e.code + ')', 'error');
      } else {
        // Anything else (e.g. malformed JSON back from the model) — generic but calm.
        showToast('Couldn’t build the roadmap from the AI response — please try again. (AI-PARSE)', 'error');
      }
      setStage('intake');
    }
  };

  const regenerate = () => { setRoadmap(null); setStage('intake'); };

  const resetAll = () => {
    setMemberId(''); setMember(null);
    setGoalTitle(''); setGoalSuccess(''); setTimeline('90 days'); setImportance(3);
    setCurrentRole(''); setIndustry(''); setAlreadyTried(''); setObstacle('');
    setHours(RB_HOURS[1]); setDiag({ mindset: 0, structure: 0, competence: 0 });
    setFocus([]); setNotes('');
    setRoadmap(null); setStage('intake');
  };

  const save = async () => {
    if (!memberId) { showToast('Pick a member before saving the roadmap.', 'error'); return; }
    if (!roadmap)  { showToast('Generate a roadmap before saving.', 'error'); return; }
    setSaving(true);
    console.log('[RoadmapBuilder] Saving roadmap for member', memberId, 'phases:', (roadmap.phases || []).length);
    try {
      const goalRes = await window._supabase.from('goals').insert({
        user_id: memberId,
        title: goalTitle,
        description: goalSuccess,
        target_date: rbTargetDate(timeline),
        status: 'active',
      }).select().single();
      if (goalRes.error) { console.error('[RoadmapBuilder] goals insert failed:', goalRes.error); throw goalRes.error; }
      const goal = goalRes.data;

      for (let pi = 0; pi < roadmap.phases.length; pi++) {
        const phase = roadmap.phases[pi];
        const label = phase.phase_label || RB_PHASE_LABELS[pi] || `Phase ${pi + 1}`;
        const { data: step, error: stepErr } = await window._supabase.from('roadmap_steps').insert({
          user_id: memberId,
          goal_id: goal.id,
          title: phase.title,
          description: `${phase.weeks || ''} — ${roadmap.summary || ''}`.trim(),
          phase_label: label,
          reflection_prompt: phase.reflection_prompt || null,
          admin_notes: phase.admin_notes || null,
          order_index: pi,
          status: pi === 0 ? 'in_progress' : 'not_started',
        }).select().single();
        if (stepErr) throw stepErr;

        for (let ti = 0; ti < phase.tasks.length; ti++) {
          const task = phase.tasks[ti];
          const { error: taskErr } = await window._supabase.from('tasks').insert({
            user_id: memberId,
            goal_id: goal.id,
            roadmap_step_id: step.id,
            title: task.title,
            notes: task.description || null,
            phase_label: label,
            order_index: ti,
            is_completed: false,
          });
          if (taskErr) throw taskErr;
        }
      }
      showToast(`Roadmap saved for ${member?.full_name || 'member'} — it's now live on their Vantage.`, 'success');
      setStage('saved');
      setHistKey((k) => k + 1);
    } catch (e) {
      console.error('Save failed:', e);
      showToast('Save failed — ' + (e.message || 'check console'), 'error');
    }
    setSaving(false);
  };

  const setPhase = (pi, p) => {
    const phases = roadmap.phases.slice(); phases[pi] = p;
    setRoadmap({ ...roadmap, phases });
  };

  const memberNameById = {};
  members.forEach((m) => { memberNameById[m.id] = m.full_name; });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Discovery</div>
          <h1 className="page-title">Roadmap Builder</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>
            Build a member's personalized growth roadmap live, then save it straight to their Vantage.
          </div>
        </div>
      </div>

      {/* Member selector */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{fontSize:20,lineHeight:1}}>group</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Active session</div>
          <select className="input" value={memberId} onChange={(e) => onPickMember(e.target.value)} style={{ fontWeight: 600 }}>
            <option value="">Select a member to build their roadmap…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} — {m.email} — {m.account_type || 'member'}
              </option>
            ))}
          </select>
        </div>
        {member && (
          <span className="chip sapphire" style={{ flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>person</span> {member.full_name}
          </span>
        )}
      </div>

      {stage === 'intake' && (
        <>
          {/* 1 — Goal */}
          <RbSection num="01" title="The Goal" sub="What does this member want to achieve?">
            <RbField label="Primary goal (in their own words)">
              <textarea className="input" rows={2} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g. Get promoted to Senior Manager within 6 months" />
            </RbField>
            <RbField label="What does success look like to them?">
              <textarea className="input" rows={2} value={goalSuccess} onChange={(e) => setGoalSuccess(e.target.value)}
                placeholder="e.g. Leading my own team, making decisions independently" />
            </RbField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <RbField label="Timeline">
                <select className="input" value={timeline} onChange={(e) => setTimeline(e.target.value)}>
                  {RB_TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </RbField>
              <RbField label="Importance">
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  How critical is this goal to them right now? <strong>1</strong> = a nice-to-have they could put off; <strong>5</strong> = it has to happen, no excuses.
                </div>
                <RbScale value={importance} onChange={setImportance} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>1 = nice to have</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>5 = non-negotiable</span>
                </div>
              </RbField>
            </div>
          </RbSection>

          {/* 2 — Current State */}
          <RbSection num="02" title="Current State" sub="Where are they starting from?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <RbField label="Current role or situation">
                <input className="input" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="e.g. Marketing Executive, 2 years in role" />
              </RbField>
              <RbField label="Industry or context">
                <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Tech startup, Dubai" />
              </RbField>
            </div>
            <RbField label="What have they already tried?">
              <textarea className="input" rows={2} value={alreadyTried} onChange={(e) => setAlreadyTried(e.target.value)}
                placeholder="e.g. Applied for a promotion twice, asked for more visibility" />
            </RbField>
            <RbField label="Biggest obstacle">
              <textarea className="input" rows={2} value={obstacle} onChange={(e) => setObstacle(e.target.value)}
                placeholder="e.g. Struggles to delegate, avoids senior visibility" />
            </RbField>
            <RbField label="Hours available per week">
              <select className="input" value={hours} onChange={(e) => setHours(e.target.value)}>
                {RB_HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </RbField>
          </RbSection>

          {/* 3 — MEGA Diagnostic */}
          <RbSection num="03" title="MEGA Diagnostic" sub="Rate where they are across the three pillars. 1 = very weak, 5 = very strong.">
            {RB_PILLARS.map((p, i) => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < RB_PILLARS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{p.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{p.desc}</div>
                </div>
                <div style={{ width: 220, flexShrink: 0 }}>
                  <RbScale value={diag[p.key]} onChange={(v) => setDiag((d) => ({ ...d, [p.key]: v }))} color={p.color} />
                </div>
              </div>
            ))}
          </RbSection>

          {/* 4 — Focus Areas */}
          <RbSection num="04" title="Focus Areas" sub="Select all subject areas most relevant to this member's goal">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {RB_FOCUS.map((f) => {
                const on = focus.includes(f);
                return (
                  <button key={f} type="button" onClick={() => toggleFocus(f)}
                    style={{
                      padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                      border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                      background: on ? 'var(--accent)' : 'var(--bg-elev)',
                      color: on ? '#fff' : 'var(--text-2)',
                      transition: 'all .12s',
                    }}>
                    {f}
                  </button>
                );
              })}
            </div>
          </RbSection>

          {/* 5 — Additional Context */}
          <RbSection num="05" title="Additional Context" sub="Anything else the AI should factor in">
            <RbField label="Free notes (personality, constraints, things from the call)">
              <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Very self-critical, underestimates themselves. Strong technically but avoids visibility. Introvert. Supportive manager but no mentor." />
            </RbField>
          </RbSection>

          <div style={{ textAlign: 'center', margin: '28px 0' }}>
            <button className="btn primary lg" onClick={generate} disabled={!canGenerate}
              style={{ padding: '16px 44px', fontSize: 16, borderRadius: 14, opacity: canGenerate ? 1 : 0.5 }}>
              <span className="material-symbols-outlined" style={{fontSize:18,lineHeight:1}}>auto_awesome</span> Generate Roadmap
            </button>
            {!canGenerate && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                Select a member and rate all three diagnostic pillars to continue.
              </div>
            )}
          </div>
        </>
      )}

      {stage === 'loading' && (
        <div className="card" style={{ textAlign: 'center', padding: '52px 32px' }}>
          <div className="spin" style={{ width: 44, height: 44, borderWidth: 3, margin: '0 auto 18px' }} />
          <div className="eyebrow">Building their personalized roadmap…</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>This usually takes 10–20 seconds</div>
        </div>
      )}

      {stage === 'review' && roadmap && (
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--sapphire) 0%, var(--sapphire-600) 100%)', color: '#fff', marginBottom: 20, border: 'none' }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Growth Roadmap</div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 32, letterSpacing: '0.02em', margin: '4px 0 6px' }}>
              {member?.full_name}'s Roadmap
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, maxWidth: 600, lineHeight: 1.5 }}>{goalTitle}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <span className="rb-meta-chip"><span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>schedule</span> {timeline}</span>
              <span className="rb-meta-chip">Mindset {diag.mindset}/5</span>
              <span className="rb-meta-chip">Structure {diag.structure}/5</span>
              <span className="rb-meta-chip">Competence {diag.competence}/5</span>
            </div>
            {roadmap.summary && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 13.5, lineHeight: 1.6, opacity: 0.95 }}>
                {roadmap.summary}
              </div>
            )}
          </div>

          {roadmap.phases.map((p, pi) => (
            <RbPhaseCard key={pi} phase={p} index={pi} onChange={(np) => setPhase(pi, np)} />
          ))}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn" onClick={regenerate} disabled={saving}>↺ Regenerate</button>
            <button className="btn primary" onClick={save} disabled={saving}>
              <span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>save</span> {saving ? 'Saving…' : 'Save to Vantage'}
            </button>
          </div>
        </>
      )}

      {stage === 'saved' && (
        <div className="card" style={{ textAlign: 'center', padding: '52px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--teal-50)', color: 'var(--teal-600)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <span className="material-symbols-outlined" style={{fontSize:28,lineHeight:1}}>check_circle</span>
          </div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 30, letterSpacing: '0.02em', marginBottom: 8 }}>Roadmap saved</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.5 }}>
            {member?.full_name || 'The member'}'s roadmap is now live on their Vantage. Build another, or head back to start.
          </div>
          <button className="btn primary" onClick={resetAll} style={{ margin: '0 auto' }}>
            <span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>add</span> Build another roadmap
          </button>
        </div>
      )}

      {(stage === 'intake' || stage === 'saved') && (
        <RbRoadmapHistory memberNameById={memberNameById} refreshKey={histKey} />
      )}

      {toast && (
        <div className="rb-toast" style={{ background: toast.kind === 'error' ? '#7f1d1d' : toast.kind === 'success' ? '#14532d' : 'var(--black)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{toast.kind === 'error' ? '✕' : '✓'}</span>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          {toast.kind === 'error' && (
            <button onClick={() => setToast(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Dismiss</button>
          )}
        </div>
      )}
    </>
  );
}

function RbSection({ num, title, sub, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 28, color: 'var(--accent)', lineHeight: 1, minWidth: 30 }}>{num}</div>
        <div>
          <div style={{ fontFamily: 'var(--ff-sub)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

// ── Roadmap History (collapsible, lists saved roadmaps by member + date) ──────
function RbRoadmapHistory({ memberNameById, refreshKey }) {
  const { useState, useEffect } = React;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({}); // goalId -> { steps, tasksByStep }
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    window._supabase.from('goals')
      .select('id, user_id, title, created_at, target_date, status, roadmap_steps(count)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { console.error('Roadmap history load failed:', error.message); setGoals([]); setLoading(false); return; }
        // Only goals that actually have roadmap phases count as "roadmaps"
        const withSteps = (data || []).filter((g) => {
          const c = Array.isArray(g.roadmap_steps) ? (g.roadmap_steps[0] && g.roadmap_steps[0].count) || 0 : 0;
          return c > 0;
        });
        setGoals(withSteps);
        setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey]);

  const toggleEntry = async (goalId) => {
    if (expandedId === goalId) { setExpandedId(null); return; }
    setExpandedId(goalId);
    if (details[goalId]) return;
    setDetailLoading(true);
    const [stepsRes, tasksRes] = await Promise.all([
      window._supabase.from('roadmap_steps')
        .select('id, title, phase_label, reflection_prompt, admin_notes, order_index')
        .eq('goal_id', goalId).order('order_index', { ascending: true }),
      window._supabase.from('tasks')
        .select('id, title, notes, roadmap_step_id, order_index')
        .eq('goal_id', goalId).order('order_index', { ascending: true }),
    ]);
    const steps = stepsRes.data || [];
    const tasksByStep = {};
    (tasksRes.data || []).forEach((t) => {
      (tasksByStep[t.roadmap_step_id] = tasksByStep[t.roadmap_step_id] || []).push(t);
    });
    setDetails((d) => ({ ...d, [goalId]: { steps, tasksByStep } }));
    setDetailLoading(false);
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span className="material-symbols-outlined" style={{fontSize:18,lineHeight:1,color:'var(--accent)'}}>timeline</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--ff-sub)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)' }}>Roadmap History</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Previously saved roadmaps{goals.length ? ` · ${goals.length}` : ''}</div>
        </div>
        <span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1,color:'var(--text-3)',transform:open?'rotate(90deg)':'none',display:'inline-block',transition:'transform .15s'}}>chevron_right</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '4px 22px 14px' }}>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '16px 0' }}>Loading roadmaps…</div>
          ) : goals.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '16px 0' }}>No saved roadmaps yet. Build one above and it'll appear here.</div>
          ) : (
            goals.map((g) => {
              const name = memberNameById[g.user_id] || 'Member';
              const isOpen = expandedId === g.id;
              const detail = details[g.id];
              return (
                <div key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => toggleEntry(g.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{g.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{name} · {fmtDate(g.created_at)}{g.status ? ` · ${g.status}` : ''}</div>
                    </div>
                    <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,color:'var(--text-3)',transform:isOpen?'rotate(90deg)':'none',display:'inline-block',transition:'transform .15s'}}>chevron_right</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '2px 0 16px' }}>
                      {detailLoading && !detail ? (
                        <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Loading…</div>
                      ) : detail && detail.steps.length > 0 ? (
                        detail.steps.map((s) => (
                          <div key={s.id} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{s.phase_label ? s.phase_label + ' · ' : ''}{s.title}</div>
                            {(detail.tasksByStep[s.id] || []).map((t) => (
                              <div key={t.id} style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4, display: 'flex', gap: 6 }}>
                                <span style={{ color: 'var(--text-3)' }}>•</span><span>{t.title}</span>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>No phases recorded for this roadmap.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RoadmapBuilder });
