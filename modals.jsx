// modals.jsx — Daily intention setter, Friday reflection, Onboarding wizard

// ─── Shared helpers ───────────────────────────────────────────────────────────
function ModalOverlay({ onClick }) {
  return <div onClick={onClick} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.5)', zIndex: 300, backdropFilter: 'blur(4px)' }} />;
}

// ─── 1. Daily Intention Setter ────────────────────────────────────────────────
function IntentionModal({ tasks, goals, onSet, onSkip }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null); // { id, label, kind }

  const options = [
  ...tasks.filter((t) => !t.subtasks.every((s) => s.done)).map((t) => ({ id: t.id, label: t.title, subject: t.subject, kind: 'task' })),
  ...goals.map((g) => ({ id: g.id, label: g.title, subject: null, kind: 'goal' }))];

  const filtered = options.filter((o) => q === '' || o.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <ModalOverlay onClick={onSkip} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(480px, 92vw)', maxHeight: '80vh', background: 'var(--bg-elev)',
        border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden',
        boxShadow: 'var(--shadow-3)', zIndex: 301, display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 20px', background: 'linear-gradient(135deg, var(--accent) 0%, #1a6fd4 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span className="material-symbols-outlined" style={{fontSize:20,lineHeight:1}}>my_location</span>
            <span style={{ fontFamily: 'var(--ff-sub)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.85 }}>Daily intention</span>
          </div>
          <div style={{ fontFamily: 'var(--ff-heading)', fontWeight: 800, letterSpacing: '-0.01em', fontSize: 28, lineHeight: 1.1, marginBottom: 8 }}>What is your focus today?</div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>Pick one thing that matters most. Everything else is secondary.</div>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 28px 0', position: 'relative' }}>
          <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,position:'absolute',left:40,top:27,color:'var(--text-3)'}}>search</span>
          <input className="input" style={{ paddingLeft: 32, fontSize: 13 }} placeholder="Search tasks and goals…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 28px' }}>
          {['task', 'goal'].map((kind) => {
            const items = filtered.filter((o) => o.kind === kind);
            if (!items.length) return null;
            return (
              <div key={kind} style={{ marginBottom: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>{kind === 'task' ? 'Tasks' : 'Goals'}</div>
                <div className="stack" style={{ gap: 6 }}>
                  {items.map((o) =>
                  <button key={o.id} onClick={() => setSelected(o)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 10, border: '1.5px solid ' + (selected?.id === o.id ? 'var(--accent)' : 'var(--border)'),
                    background: selected?.id === o.id ? 'var(--accent-soft)' : 'var(--bg-elev)',
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .12s'
                  }}>
                      <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: kind === 'goal' ? 'rgba(163,228,219,0.3)' : 'var(--accent-soft)',
                      display: 'grid', placeItems: 'center',
                      color: kind === 'goal' ? 'var(--teal-600)' : 'var(--accent)'
                    }}>
                        {kind === 'goal'
                          ? <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>my_location</span>
                          : <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>assignment_turned_in</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</div>
                        {o.subject && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{o.subject}</div>}
                      </div>
                      {selected?.id === o.id && <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,color:'var(--accent)',flexShrink:0}}>check</span>}
                    </button>
                  )}
                </div>
              </div>);

          })}
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No tasks or goals found.</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
          disabled={!selected} onClick={() => selected && onSet(selected)}>
            Set my intention <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span>
          </button>
          <button onClick={onSkip} style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for today</button>
        </div>
      </div>
    </>);

}

// ─── 2. Friday Reflection Modal ───────────────────────────────────────────────
function ReflectionModal({ onSubmit, onLater }) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [win, setWin] = useState('');
  const [improve, setImprove] = useState('');

  return (
    <>
      <ModalOverlay onClick={onLater} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(500px, 92vw)', background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 24, overflow: 'hidden', boxShadow: 'var(--shadow-3)', zIndex: 301
      }}>
        {/* Header */}
        <div className="reflection-header" style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span className="material-symbols-outlined refl-accent" style={{fontSize:18,lineHeight:1}}>star</span>
            <span className="refl-accent" style={{ fontFamily: 'var(--ff-sub)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Friday reflection</span>
          </div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 34, lineHeight: 1, color: 'var(--text)', marginBottom: 6 }}>Weekly Reflection</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>Two minutes to close the week well.</div>
        </div>

        <div style={{ padding: '24px 32px 20px' }}>
          {/* Star rating */}
          <div style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Rate your week</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) =>
              <button key={n} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)} onClick={() => setStars(n)}
              style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform .1s ease', transform: (hovered || stars) >= n ? 'scale(1.15)' : 'scale(1)', filter: (hovered || stars) >= n ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                  ⭐
                </button>
              )}
              {stars > 0 && <span style={{ fontSize: 13, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>
                {['', 'Tough week', 'Getting there', 'Solid week', 'Strong week', 'Outstanding'][stars]}
              </span>}
            </div>
          </div>

          {/* Win */}
          <div style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>One win from this week</div>
            <textarea className="input" rows={3} placeholder="What went well? What are you proud of?" value={win} onChange={(e) => setWin(e.target.value)}
            style={{ resize: 'none', lineHeight: 1.55 }} />
          </div>

          {/* Improve */}
          <div style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>One thing to improve next week</div>
            <textarea className="input" rows={3} placeholder="What would you do differently?" value={improve} onChange={(e) => setImprove(e.target.value)}
            style={{ resize: 'none', lineHeight: 1.55 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
            disabled={!stars} onClick={() => onSubmit({ stars, win, improve })}>
              Submit reflection
            </button>
            <button onClick={onLater} style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>Remind me later</button>
          </div>
        </div>
      </div>
    </>);

}

// ─── 3. Onboarding Wizard ─────────────────────────────────────────────────────
const OB_STEPS = ['Welcome', 'Profile', 'First Goal', 'How it Works', 'Ready'];

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ role: '', status: 'professional', subject: '', interests: '' });
  const [goal, setGoal] = useState({ title: '', desc: '' });
  const [dob, setDob] = useState('');

  const next = () => setStep((s) => Math.min(s + 1, OB_STEPS.length - 1));
  const isLast = step === OB_STEPS.length - 1;
  // Max selectable DOB = today (no future dates); the gate logic itself lives in App.
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Progress */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 }}>
        <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 999, width: (step + 1) / OB_STEPS.length * 100 + '%', transition: 'width .4s ease' }} />
      </div>
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
        {OB_STEPS.map((s, i) =>
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
            width: 24, height: 24, borderRadius: 999, border: '1.5px solid ' + (i <= step ? 'var(--accent)' : 'var(--border)'),
            background: i < step ? 'var(--accent)' : i === step ? 'var(--accent-soft)' : 'transparent',
            display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
            color: i <= step ? 'var(--accent)' : 'var(--text-3)', transition: 'all .2s'
          }}>{i < step ? <span className="material-symbols-outlined" style={{fontSize:10,lineHeight:1}}>check</span> : i + 1}</div>
            <span style={{ fontSize: 11, color: i === step ? 'var(--text)' : 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em' }}>{s}</span>
            {i < OB_STEPS.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--border)' }} />}
          </div>
        )}
      </div>

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: 600, marginTop: 60 }}>

        {/* Step 0: Welcome */}
        {step === 0 &&
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--text)', color: 'var(--bg-elev)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
              <svg viewBox="190 170 645 645" style={{ width: 56, height: 56 }} xmlns="http://www.w3.org/2000/svg" aria-label="Vantage" role="img">
                <path fill="currentColor" d="M 501.00 740.37 C484.16,737.18 467.83,727.24 458.11,714.25 C440.52,690.78 438.55,662.43 452.11,628.00 C455.04,620.54 465.42,599.58 480.57,570.50 L 485.26 561.50 L 463.00 514.50 C434.10,453.48 419.12,421.61 404.01,389.00 C397.26,374.42 383.86,345.62 374.25,325.00 C349.65,272.25 350.00,273.07 350.01,266.84 C350.02,259.03 353.55,252.10 359.65,247.88 C363.83,244.99 365.49,244.48 371.71,244.16 C377.53,243.86 379.77,244.19 383.27,245.89 C391.77,250.00 388.50,243.70 437.22,350.00 C444.41,365.67 461.52,402.80 475.26,432.50 C488.99,462.20 502.77,492.01 505.87,498.74 C508.96,505.48 511.75,510.99 512.06,510.99 C512.54,511.00 522.54,489.89 557.54,415.00 C575.25,377.12 602.39,318.51 626.04,267.10 C632.71,252.60 635.33,248.99 641.27,246.11 C649.57,242.10 662.42,244.27 668.20,250.66 C671.37,254.17 673.96,261.38 673.98,266.77 C674.00,272.50 669.17,283.42 624.78,378.00 C614.32,400.27 600.23,430.42 593.47,445.00 C586.71,459.58 572.09,490.85 560.98,514.50 C549.88,538.15 540.35,558.62 539.81,560.00 C538.95,562.18 540.81,566.43 554.22,593.00 C574.70,633.58 579.88,649.10 579.97,670.18 C580.09,701.19 561.36,727.79 532.50,737.58 C526.19,739.73 522.28,740.36 514.00,740.57 C508.23,740.72 502.38,740.63 501.00,740.37 ZM 522.14 694.91 C527.35,692.28 532.46,685.83 534.51,679.34 C538.04,668.09 534.65,654.63 521.97,629.50 C517.52,620.70 513.29,612.90 512.57,612.17 C511.49,611.06 510.40,612.43 506.25,620.17 C491.84,647.01 487.65,658.25 487.64,670.20 C487.63,676.76 488.06,678.74 490.57,683.60 C497.01,696.13 510.33,700.90 522.14,694.91 Z" />
              </svg>
            </div>
            <div className="display" style={{ fontSize: 64, lineHeight: 0.95, marginBottom: 16 }}>Welcome to<br /><span style={{ color: 'var(--accent)' }}>Vantage</span></div>
            <div style={{ fontFamily: 'var(--ff-sub)', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>by MEGA · Middle East Growth Academy</div>
            <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 420, margin: '0 auto 36px' }}>Your personal development command center. Every session, task, and goal in one place. Designed to make your growth feel real.

          </div>
            <button className="btn primary lg" style={{ fontSize: 16, padding: '14px 36px' }} onClick={next}>Get started <span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span></button>
          </div>
        }

        {/* Step 1: Profile */}
        {step === 1 &&
        <div className="card" style={{ padding: 36 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Step 2 of 5</div>
            <div className="display" style={{ fontSize: 38, marginBottom: 20 }}>Tell us about yourself</div>
            <div className="stack" style={{ gap: 16 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Your current role or occupation</div>
                <input className="input" placeholder="e.g. Marketing Analyst, Business Student" value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Date of birth</div>
                <input className="input" type="date" max={todayStr} value={dob} onChange={(e) => setDob(e.target.value)} />
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>We ask so we can confirm you meet the age requirements for the platform. Members under 18 need a parent or guardian to provide consent before full access.</div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>You are a…</div>
                <div className="seg">
                  <button className={profile.status === 'student' ? 'on' : ''} onClick={() => setProfile((p) => ({ ...p, status: 'student' }))}>Student</button>
                  <button className={profile.status === 'professional' ? 'on' : ''} onClick={() => setProfile((p) => ({ ...p, status: 'professional' }))}>Working professional</button>
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Primary subject area focus</div>
                <select className="input" value={profile.subject} onChange={(e) => setProfile((p) => ({ ...p, subject: e.target.value }))}>
                  <option value="">Select one…</option>
                  {Object.keys(SUBJECTS).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Interests & hobbies <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)' }}>(comma separated)</span></div>
                <input className="input" placeholder="e.g. running, Arabic literature, chess" value={profile.interests} onChange={(e) => setProfile((p) => ({ ...p, interests: e.target.value }))} />
              </div>
            </div>
            <button className="btn primary" style={{ marginTop: 24, justifyContent: 'center', width: '100%' }} onClick={next} disabled={!dob}>Continue <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span></button>
            {!dob && <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 10 }}>Please enter your date of birth to continue.</div>}
          </div>
        }

        {/* Step 2: First Goal */}
        {step === 2 &&
        <div className="card" style={{ padding: 36 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Step 3 of 5</div>
            <div className="display" style={{ fontSize: 38, marginBottom: 8 }}>Set your first goal</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.55 }}>A goal is the outcome you want. Tasks are the steps to get there. Start with one clear ambition.</div>
            <div className="stack" style={{ gap: 14 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Goal title</div>
                <input className="input" placeholder="e.g. Land a senior role by Q3" value={goal.title} onChange={(e) => setGoal((g) => ({ ...g, title: e.target.value }))} />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Short description</div>
                <textarea className="input" rows={3} placeholder="Describe it in one or two sentences…" value={goal.desc} onChange={(e) => setGoal((g) => ({ ...g, desc: e.target.value }))} style={{ resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={next} disabled={!goal.title}>Set goal & continue <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span></button>
              <button className="btn ghost" onClick={next}>Skip for now</button>
            </div>
          </div>
        }

        {/* Step 3: How it works */}
        {step === 3 &&
        <div>
            <div className="eyebrow" style={{ marginBottom: 4, textAlign: 'center' }}>Step 4 of 5</div>
            <div className="display" style={{ fontSize: 38, marginBottom: 24, textAlign: 'center' }}>How Vantage works</div>
            <div className="m-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
              {[
            { icon: 'star', color: 'var(--coral)', title: 'Points & levels', desc: 'Earn XP by completing tasks, attending sessions, hitting streak milestones, and unlocking badges. Climb 8 tiers from Rookie all the way to Icon — every action moves you up.' },
            { icon: 'local_fire_department', color: 'var(--coral)', title: 'Streaks', desc: 'Log in every weekday to build your streak. Weekends don\'t count. Streaks show consistency — one of the most reliable signals of growth.' },
            { icon: 'military_tech', color: 'var(--accent)', title: 'Badges & milestones', desc: 'Unlock badges for first sessions, subject mastery, streak records, and goals completed. Each badge has a story.' }].
            map((c) =>
            <div key={c.title} className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: c.color + '18', color: c.color, display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                    <span className="material-symbols-outlined" style={{fontSize:24,lineHeight:1}}>{c.icon}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, marginBottom: 8 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{c.desc}</div>
                </div>
            )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="btn primary lg" style={{ fontSize: 15, padding: '13px 32px' }} onClick={next}>Got it — let's go <span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span></button>
            </div>
          </div>
        }

        {/* Step 4: Ready */}
        {step === 4 &&
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
            <div className="display" style={{ fontSize: 60, lineHeight: 0.95, marginBottom: 14 }}>You are <span style={{ color: 'var(--accent)' }}>ready.</span></div>
            <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 420, margin: '0 auto 28px' }}>
              Your profile is set. {goal.title ? <>Your first goal — <strong>{goal.title}</strong> — is on the board.</> : 'Your workspace is ready.'} Your mentor is waiting for you.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 400, margin: '0 auto 32px' }}>
              {[
            { label: 'Plan', v: 'Foundations' },
            { label: 'Points', v: '0 XP' },
            { label: 'Streak', v: '0 days' }].
            map((s) =>
            <div key={s.label} style={{ padding: '12px', background: 'var(--bg-sunken)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div className="eyebrow" style={{ fontSize: 10 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{s.v}</div>
                </div>
            )}
            </div>
            <button className="btn primary lg" style={{ fontSize: 16, padding: '14px 36px' }} onClick={() => onComplete({ dateOfBirth: dob })}>Go to my dashboard <span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span></button>
          </div>
        }
      </div>
    </div>);

}

// ─── Legal Consent Modal (gates app entry until user accepts) ─────────────────
function LegalConsentModal({ onAccept }) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const accept = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    try { await onAccept(); }
    finally { setSaving(false); }
  };

  return (<>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.6)', zIndex: 400, backdropFilter: 'blur(4px)' }} />
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(480px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
      background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 16,
      padding: 28, zIndex: 401, boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
    }}>
      <div style={{ fontFamily: 'var(--ff-display)', fontSize: 26, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 8 }}>
        Before you continue
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 20 }}>
        To use Vantage, please review and accept our legal terms. They cover how we handle your data and the rules for using the platform.
      </div>

      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: 16, background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, cursor: 'pointer', userSelect: 'none', marginBottom: 20
      }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--sapphire)', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>
          I have read and agree to the{' '}
          <a href="/legal" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sapphire)', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a>
          {' '}and{' '}
          <a href="/legal" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sapphire)', fontWeight: 600, textDecoration: 'underline' }}>Terms of Use</a>.
        </span>
      </label>

      <button
        onClick={accept}
        disabled={!agreed || saving}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
          background: agreed ? 'var(--sapphire)' : 'var(--border)',
          color: agreed ? '#fff' : 'var(--text-dim)',
          fontFamily: 'var(--ff-body)', fontSize: 15, fontWeight: 600,
          cursor: agreed && !saving ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s'
        }}
      >
        {saving ? 'Saving…' : 'Accept and continue'}
      </button>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
        You must accept to continue using Vantage.
      </div>
    </div>
  </>);
}

// ─── Pinned Intention Card (dashboard) ────────────────────────────────────────
function PinnedIntentionCard({ intention, onClear }) {
  return (
    <div style={{
      background: 'var(--accent-soft)',
      border: '1px solid var(--accent)',
      borderLeft: '4px solid var(--accent)',
      borderRadius: 14,
      padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{fontSize:20,lineHeight:1}}>target</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 3 }}>Today's intention</div>
        <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{intention.label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'capitalize' }}>{intention.kind}</div>
      </div>
      <button onClick={onClear} style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
    </div>);

}

Object.assign(window, { IntentionModal, ReflectionModal, OnboardingWizard, PinnedIntentionCard });