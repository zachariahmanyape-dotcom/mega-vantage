// tour.jsx — Vantage Tour v2: sidebar-pinned card, spotlight dimming, precise nav alignment

const TOUR_STEPS = [
  {
    route:  'dashboard',
    nav:    'dashboard',
    title:  'Dashboard',
    icon:   'dashboard',
    desc:   'Your mission control. Your streak, XP tier, upcoming session, and a focus timer that follows you to the Tasks page — all in one view.',
  },
  {
    route:  'tasks',
    nav:    'tasks',
    title:  'Tasks & Goals',
    icon:   'assignment_turned_in',
    desc:   'Capture every task and goal here. Open a task to log focus time, add subtasks, or let AI break it down into smaller steps for you.',
  },
  {
    route:  'sessions',
    nav:    'sessions',
    title:  'Sessions',
    icon:   'event',
    desc:   'All your 1:1s and town halls in one calendar. Each session carries the agenda your mentor wrote, and you can add it to Google or Outlook in one click.',
  },
  {
    route:  'roadmap',
    nav:    'roadmap',
    title:  'Your Roadmap',
    icon:   'timeline',
    desc:   'A personalized growth roadmap built with your mentor — split into phases with tasks, reflection prompts, and a personal note for each stage.',
  },
  {
    route:  'wins',
    nav:    'wins',
    title:  'Wins Board',
    icon:   'military_tech',
    desc:   'The community feed. Share achievements big or small, react to your cohort\'s wins, and build a record of everything you\'ve accomplished.',
  },
  {
    route:  'resources',
    nav:    'resources',
    title:  'Resources',
    icon:   'menu_book',
    desc:   'Your mentor\'s library — videos, worksheets, templates — organised by subject area and plan tier. Everything is searchable.',
  },
  {
    route:  'chat',
    nav:    'chat',
    title:  'Chat',
    icon:   'chat',
    desc:   'Talk to your cohort in shared channels, or start a private direct message with your mentor whenever you need a 1:1.',
  },
  {
    route:  'profile',
    nav:    'profile',
    title:  'Profile & Badges',
    icon:   'person',
    desc:   'Your XP tier, streak history, and the full badge wall. Every action you take in Vantage unlocks something new — climb 8 tiers from Rookie to Icon.',
  },
  {
    route:   'tasks',
    nav:     'tasks',
    title:   'Your first task',
    icon:    'target',
    desc:    'You\'re ready. Create your first task now — it\'s the first step toward building the momentum Vantage is designed to sustain.',
    isFinal: true,
  },
];

// ─── Nav item order in sidebar (member view, 0-indexed) ───────────────────────
// Matches the memberItems array order in SidebarWithWins:
// 0: dashboard, 1: tasks, 2: sessions, 3: roadmap, 4: wins, 5: resources, 6: chat, 7: profile
const NAV_ORDER = ['dashboard','tasks','sessions','roadmap','wins','resources','chat','profile'];

// ─── Tour bubble ──────────────────────────────────────────────────────────────
function TourBubble({ onStart, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => { setGone(true); onDismiss(); }, 280);
  };

  if (gone) return null;

  return (
    <div style={{
      position:'fixed', bottom:28, right:28, zIndex:90,
      width:300,
      background:'var(--bg-elev)',
      border:'1px solid var(--border)',
      borderRadius:18,
      boxShadow:'var(--shadow-3)',
      padding:'18px 18px 16px',
      opacity: exiting ? 0 : 1,
      transform: exiting ? 'translateY(10px) scale(0.97)' : 'translateY(0) scale(1)',
      transition:'opacity .28s ease, transform .28s ease',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:12, flexShrink:0,
            background:'linear-gradient(135deg, var(--accent), var(--teal-600))',
            display:'grid', placeItems:'center', color:'#fff'
          }}>
            <span className="material-symbols-outlined" style={{fontSize:18,lineHeight:1}}>star</span>
          </div>
          <div>
            <div style={{ fontFamily:'var(--ff-display)', fontSize:18, lineHeight:1 }}>Vantage Tour</div>
            <div style={{ fontSize:11, color:'var(--teal-600)', fontFamily:'var(--ff-sub)', marginTop:2, fontWeight:600, letterSpacing:'0.06em' }}>New here? Start here.</div>
          </div>
        </div>
        <button onClick={dismiss} style={{ color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', fontSize:14, lineHeight:1, flexShrink:0, marginTop:2 }}>✕</button>
      </div>
      <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.55, marginBottom:14 }}>
        A 2-minute guided walkthrough of every section — so you hit the ground running from day one.
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn primary" style={{ flex:1, justifyContent:'center', fontSize:13 }} onClick={onStart}>
          Start tour <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span>
        </button>
        <button className="btn ghost sm" onClick={dismiss}>Later</button>
      </div>
    </div>
  );
}

// ─── Spotlight overlay ────────────────────────────────────────────────────────
// Very light dim over the main content only; sidebar stays fully lit.
function TourSpotlight() {
  return (
    <div style={{
      position:'fixed',
      // Start after the 272px sidebar
      top:0, left:272, right:0, bottom:0,
      background:'rgba(10,10,10,0.13)',
      zIndex:290,
      pointerEvents:'none',
      transition:'opacity .3s ease',
    }} />
  );
}

// ─── Sidebar nav highlight ────────────────────────────────────────────────────
// Renders a highlight rect precisely over the active nav item.
// The sidebar has: brand (≈76px) + section label (≈32px) + items (38px each, 8px gap) = start at ~116px
const SB_ITEM_H    = 38;   // height of each sb-item
const SB_ITEM_GAP  = 2;    // gap between items (from CSS gap:8px, but padding accounts for most)
const SB_ITEMS_TOP = 130;  // px from top of viewport to first nav item

function SidebarNavHighlight({ navKey }) {
  const idx = NAV_ORDER.indexOf(navKey);
  if (idx < 0) return null;

  const top = SB_ITEMS_TOP + idx * (SB_ITEM_H + SB_ITEM_GAP);

  return (
    <div style={{
      position:'fixed',
      left:8,
      top: top,
      width:256,
      height:SB_ITEM_H,
      borderRadius:10,
      border:'2px solid var(--accent)',
      boxShadow:'0 0 0 3px var(--accent-soft), 0 2px 12px rgba(15,82,186,0.18)',
      zIndex:295,
      pointerEvents:'none',
      transition:'top .25s cubic-bezier(.4,0,.2,1)',
      animation:'tourNavPulse 2s ease-in-out infinite',
    }} />
  );
}

// ─── Congratulations pop-up ───────────────────────────────────────────────────
function CongratsOverlay({ onClose }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.5)', zIndex:400, backdropFilter:'blur(4px)' }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:420, background:'var(--bg-elev)', border:'1px solid var(--border)',
        borderRadius:24, padding:'40px 36px', textAlign:'center', zIndex:401,
        boxShadow:'var(--shadow-3)'
      }}>
        <div style={{ fontSize:52, marginBottom:14 }}>🎯</div>
        <div className="display" style={{ fontSize:40, lineHeight:1, marginBottom:10 }}>
          First step <span style={{ color:'var(--accent)' }}>taken.</span>
        </div>
        <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.6, marginBottom:28 }}>
          You've created your first task on Vantage. That's how it starts — one clear next action. Keep going.
        </div>
        <button className="btn primary lg" style={{ width:'100%', justifyContent:'center', fontSize:14 }} onClick={onClose}>
          Go to my dashboard <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span>
        </button>
      </div>
    </>
  );
}

// ─── Sidebar-pinned tour card ─────────────────────────────────────────────────
function SidebarTourCard({ step, stepIdx, total, onNext, onBack, onClose, onComplete }) {
  const [showCongrats, setShowCongrats] = useState(false);
  const isFinal = !!step.isFinal;

  if (showCongrats) {
    return <CongratsOverlay onClose={() => { setShowCongrats(false); onComplete(); }} />;
  }

  return (
    <>
      {/* Light spotlight on main content */}
      <TourSpotlight />

      {/* Precise sidebar highlight */}
      <SidebarNavHighlight navKey={step.nav} />

      {/* Pinned card at bottom of sidebar */}
      <div style={{
        position:'fixed',
        bottom:0, left:0,
        width:272,
        zIndex:296,
        background:'var(--bg-elev)',
        borderTop:'1px solid var(--border)',
        borderRight:'1px solid var(--border)',
        padding:'14px 14px 16px',
        boxShadow:'0 -4px 20px rgba(10,10,10,0.08)',
      }}>
        {/* Step indicator + close */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:26, height:26, borderRadius:8,
              background:'var(--accent-soft)', color:'var(--accent)',
              display:'grid', placeItems:'center', flexShrink:0
            }}>
              <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>{step.icon}</span>
            </div>
            <div style={{ fontFamily:'var(--ff-sub)', fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--text-3)' }}>
              Step {stepIdx + 1} of {total}
            </div>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', fontSize:12, lineHeight:1 }}>✕</button>
        </div>

        {/* Title */}
        <div style={{ fontFamily:'var(--ff-display)', fontSize:20, lineHeight:1, marginBottom:7, color:'var(--text)' }}>
          {step.title}
        </div>

        {/* Description */}
        <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.55, marginBottom:12 }}>
          {step.desc}
        </div>

        {/* Final step — task creation prompt */}
        {isFinal && (
          <div style={{ background:'var(--accent-soft)', border:'1px solid var(--accent)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>Create your first task</div>
            <div style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.45, marginBottom:10 }}>
              Give it a title, pick a subject area, and set a due date.
            </div>
            <button className="btn primary sm" style={{ justifyContent:'center', width:'100%', fontSize:12 }}
              onClick={() => setShowCongrats(true)}>
              <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1,verticalAlign:'middle'}}>add</span> Create my first task
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div style={{ display:'flex', gap:5, marginBottom:12, justifyContent:'center' }}>
          {Array.from({ length:total }).map((_,i) => (
            <div key={i} style={{
              height:5, borderRadius:999,
              width: i===stepIdx ? 18 : 5,
              background: i===stepIdx ? 'var(--accent)' : i<stepIdx ? 'var(--border-strong)' : 'var(--border)',
              transition:'all .2s ease'
            }} />
          ))}
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button className="btn ghost sm" disabled={stepIdx===0} onClick={onBack}
            style={{ opacity:stepIdx===0?0.3:1, padding:'6px 10px', fontSize:12 }}>
            <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1,verticalAlign:'middle',transform:'rotate(180deg)',display:'inline-block'}}>chevron_right</span> Back
          </button>
          <div style={{ flex:1 }} />
          {isFinal
            ? <button className="btn ghost sm" onClick={onClose} style={{ fontSize:12 }}>Skip for now</button>
            : <button className="btn ghost sm" onClick={onClose} style={{ fontSize:12 }}>Exit tour</button>
          }
          {!isFinal && (
            <button className="btn primary sm" onClick={onNext} style={{ fontSize:12 }}>
              Next <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1,verticalAlign:'middle'}}>chevron_right</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tour Controller ──────────────────────────────────────────────────────────
function TourController({ onNavigate, onClose }) {
  const [step, setStep] = useState(0);

  React.useEffect(() => {
    onNavigate(TOUR_STEPS[step].route);
  }, [step]);

  const next = () => setStep(s => Math.min(s + 1, TOUR_STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <SidebarTourCard
      step={TOUR_STEPS[step]}
      stepIdx={step}
      total={TOUR_STEPS.length}
      onNext={next}
      onBack={back}
      onClose={onClose}
      onComplete={onClose}
    />
  );
}

// ─── Tour Status Badge (Resources page) ──────────────────────────────────────
function TourStatusBadge({ completed, onRetake }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:10,
      padding:'8px 12px 8px 10px',
      background: completed ? 'var(--teal-50)' : 'var(--bg-sunken)',
      border:'1px solid ' + (completed ? 'rgba(79,183,166,0.4)' : 'var(--border)'),
      borderRadius:10,
    }}>
      <div style={{
        width:28, height:28, borderRadius:8,
        background: completed ? 'var(--teal-600)' : 'var(--accent-soft)',
        display:'grid', placeItems:'center',
        color: completed ? '#fff' : 'var(--accent)'
      }}>
        <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>{completed ? 'check' : 'star'}</span>
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color: completed ? 'var(--teal-600)' : 'var(--text)' }}>
          Vantage Tour{completed ? ' · Completed' : ''}
        </div>
        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>
          {completed ? 'You\'ve seen everything.' : 'Get a guided walkthrough of the platform.'}
        </div>
      </div>
      <button className={"btn " + (completed ? "ghost sm" : "primary sm")} onClick={onRetake} style={{ marginLeft:4 }}>
        {completed ? 'Retake' : 'Start tour'} <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1,verticalAlign:'middle'}}>arrow_forward</span>
      </button>
    </div>
  );
}

// Inject tour keyframes
if (!document.getElementById('tour-styles')) {
  const s = document.createElement('style');
  s.id = 'tour-styles';
  s.textContent = `
    @keyframes tourNavPulse {
      0%, 100% { box-shadow: 0 0 0 3px var(--accent-soft), 0 2px 12px rgba(15,82,186,0.18); }
      50%       { box-shadow: 0 0 0 6px transparent, 0 2px 12px rgba(15,82,186,0.10); }
    }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { TourBubble, TourController, TourStatusBadge, TOUR_STEPS });
