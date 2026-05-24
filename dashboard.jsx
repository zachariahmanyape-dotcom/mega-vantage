// dashboard.jsx — updated with focus timer linking, weekly focus breakdown, intention card, Eisenhower

const { useState, useEffect, useRef } = React;

// ─── Focus time data (shared state via window) ────────────────────────────────
if (!window.FOCUS_LOG) window.FOCUS_LOG = {}; // { taskId: minutes }

const WEEKLY_FOCUS = [
  { subject:'Personal Branding',          minutes:165 },
  { subject:'CV Development',             minutes:112 },
  { subject:'Growth Mindset',             minutes:78  },
  { subject:'Time Management',            minutes:52  },
  { subject:'Professional Communication', minutes:30  },
];
const TOTAL_FOCUS_MIN = WEEKLY_FOCUS.reduce((a,s)=>a+s.minutes,0);

// ─── Focus Timer with task-linking ────────────────────────────────────────────
function FocusTimerModal({ tasks, goals, onStart, onClose }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const options = [
    ...tasks.filter(t => !t.subtasks.every(s=>s.done)).map(t => ({ id:t.id, label:t.title, subject:t.subject, kind:'task' })),
    ...goals.map(g => ({ id:g.id, label:g.title, subject:null, kind:'goal' })),
  ];
  const filtered = options.filter(o => q==='' || o.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.45)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div className="card" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:460, maxHeight:'78vh', overflow:'auto', zIndex:201, padding:0, boxShadow:'var(--shadow-3)' }}>
        <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)' }}>
          <div className="display" style={{ fontSize:26, marginBottom:4 }}>Start a focus session</div>
          <div style={{ fontSize:13, color:'var(--text-2)' }}>Link this session to a task or goal to track time.</div>
        </div>
        <div style={{ padding:'14px 24px 0' }}>
          <div style={{ position:'relative' }}>
            <Icon name="search" size={14} style={{ position:'absolute', left:12, top:12, color:'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft:34, fontSize:13 }} placeholder="Search tasks and goals…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
        <div style={{ padding:'12px 24px', maxHeight:280, overflow:'auto' }}>
          {['task','goal'].map(kind => {
            const items = filtered.filter(o=>o.kind===kind);
            if (!items.length) return null;
            return (
              <div key={kind} style={{ marginBottom:12 }}>
                <div className="eyebrow" style={{ marginBottom:6 }}>{kind==='task'?'Tasks':'Goals'}</div>
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

const DashPomodoro = ({ gameMode, tasks, goals }) => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [linkedItem, setLinkedItem] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); setRunning(false); setSessionDone(true); }
        return Math.max(0, s-1);
      });
      elapsed.current += 1;
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const handleStart = (item) => {
    setLinkedItem(item);
    setShowPicker(false);
    setRunning(true);
    elapsed.current = 0;
  };

  const handleStop = () => {
    setRunning(false);
    if (linkedItem && elapsed.current > 0) {
      window.FOCUS_LOG[linkedItem.id] = (window.FOCUS_LOG[linkedItem.id]||0) + Math.floor(elapsed.current/60);
    }
    elapsed.current = 0;
    setSessionDone(false);
  };

  const mm = String(Math.floor(seconds/60)).padStart(2,'0');
  const ss = String(seconds%60).padStart(2,'0');
  const pct = (1 - seconds/(25*60)) * 100;

  return (
    <>
      <div className="card" style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="eyebrow">Focus timer</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{Math.floor(TOTAL_FOCUS_MIN/60)}h {TOTAL_FOCUS_MIN%60}m this week</div>
        </div>
        {linkedItem && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, padding:'6px 10px', background:'var(--accent-soft)', borderRadius:8, border:'1px solid var(--accent)' }}>
            <Icon name={linkedItem.kind==='goal'?'target':'tasks'} size={12} style={{ color:'var(--accent)' }} />
            <span style={{ fontSize:12, color:'var(--accent)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{linkedItem.label}</span>
            {!running && <button onClick={() => setLinkedItem(null)} style={{ fontSize:11, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer' }}>✕</button>}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:8 }}>
          <span className="display mono" style={{ fontSize:46, letterSpacing:'0.02em' }}>{mm}:{ss}</span>
          <span className="sub" style={{ fontSize:13, color:'var(--text-3)' }}>pomodoro</span>
        </div>
        <div className="progress" style={{ marginTop:10 }}><span style={{ width: pct+'%' }} /></div>
        {sessionDone && <div style={{ marginTop:8, fontSize:12, color:'var(--teal-600)', fontWeight:600 }}>✓ Session complete{linkedItem?' — time logged to "'+linkedItem.label+'"':''}</div>}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          {!running
            ? <button className="btn primary" onClick={() => setShowPicker(true)} style={{ flex:1, justifyContent:'center' }}><Icon name="play" size={14} /> Start focus</button>
            : <button className="btn coral" onClick={handleStop} style={{ flex:1, justifyContent:'center' }}><Icon name="pause" size={14} /> Stop</button>
          }
          <button className="btn" onClick={() => { setRunning(false); setSeconds(25*60); setLinkedItem(null); elapsed.current=0; }}>Reset</button>
        </div>
      </div>
      {showPicker && <FocusTimerModal tasks={tasks} goals={goals} onStart={handleStart} onClose={() => setShowPicker(false)} />}
    </>
  );
};

// ─── Weekly Focus Breakdown ───────────────────────────────────────────────────
const DashFocusBreakdown = () => {
  const maxMin = Math.max(...WEEKLY_FOCUS.map(s=>s.minutes));
  return (
    <div className="card" style={{ padding:22 }}>
      <div className="row-between" style={{ marginBottom:16 }}>
        <div>
          <div className="eyebrow">Focus this week · by subject</div>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>
            Total: <strong>{Math.floor(TOTAL_FOCUS_MIN/60)}h {TOTAL_FOCUS_MIN%60}m</strong>
          </div>
        </div>
      </div>
      <div className="stack" style={{ gap:10 }}>
        {WEEKLY_FOCUS.map(s => {
          const color = SUBJECTS[s.subject] || '#888';
          const h = Math.floor(s.minutes/60);
          const m = s.minutes%60;
          return (
            <div key={s.subject}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                <span style={{ fontWeight:600, color:'var(--text)' }}>{s.subject}</span>
                <span style={{ color:'var(--text-3)', fontFamily:'var(--ff-sub)', letterSpacing:'0.04em' }}>
                  {h>0?`${h}h ${m}m`:`${m}m`}
                </span>
              </div>
              <div style={{ height:7, background:'var(--bg-sunken)', borderRadius:999, overflow:'hidden' }}>
                <div style={{ height:'100%', width:(s.minutes/maxMin*100)+'%', borderRadius:999, background:color, transition:'width .4s ease' }} />
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
  const pct = (member.pointsInLevel / (member.pointsInLevel + member.pointsToNext)) * 100;
  const next = LEVELS[Math.min(member.levelIndex+1, LEVELS.length-1)];
  return (
    <div className="card" style={{ padding:20 }}>
      <div className="eyebrow">Level</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:2 }}>
        <div className="display" style={{ fontSize:34 }}>{member.level}</div>
        <div className="sub" style={{ fontSize:13, color:'var(--text-3)' }}>Tier {member.levelIndex+1} / 5</div>
      </div>
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-3)', marginBottom:6 }}>
          <span>{member.pointsInLevel} pts</span>
          <span>{member.pointsToNext} to {next}</span>
        </div>
        <div className="progress"><span style={{ width:pct+'%' }} /></div>
      </div>
      <div style={{ display:'flex', gap:4, marginTop:14 }}>
        {LEVELS.map((l,i) => (
          <div key={l} style={{ flex:1, textAlign:'center', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'var(--ff-sub)', color:i<=member.levelIndex?'var(--text)':'var(--text-3)', fontWeight:i===member.levelIndex?700:500, padding:'6px 0', borderTop:i<=member.levelIndex?'2px solid var(--accent)':'2px solid var(--border)' }}>{l}</div>
        ))}
      </div>
    </div>
  );
};

// ─── Upcoming session card ────────────────────────────────────────────────────
const DashUpcoming = ({ onJoin }) => {
  const s = SESSIONS.find(s => s.status === 'upcoming');
  const [remaining, setRemaining] = useState(s.countdownMinutes);
  const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setRemaining(r => Math.max(0,r-1)), 60000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(remaining/60), m = remaining%60;

  const calSes = { id:s.id, type:s.type, title:s.title, date:s.date, startH:16.5, endH:17.5, mentor:s.mentor, mInit:s.mentorInitials, mColor:s.mentorColor, status:s.status, link:s.link, recurring:'weekly' };

  return (
    <>
      <div className="card" style={{ padding:0, overflow:'hidden', cursor:'pointer' }} onClick={() => setModalOpen(true)}>
        <div style={{ padding:'14px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-sunken)' }}>
          <div className="eyebrow" style={{ margin:0 }}>Next up · click to view agenda</div>
          <div className="chip sapphire"><span className="dot"/>{s.type}</div>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div className="sub" style={{ fontSize:13, color:'var(--text-3)', letterSpacing:'0.06em' }}>{s.date} · {s.time}</div>
          <div className="display" style={{ fontSize:24, marginTop:6, lineHeight:1.1, maxWidth:520 }}>{s.title}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18, gap:16, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Avatar initials={s.mentorInitials} color={s.mentorColor} size={32} />
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>{s.mentor}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>Your mentor</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ textAlign:'right' }}>
                <div className="eyebrow" style={{ fontSize:10 }}>Starts in</div>
                <div style={{ fontFamily:'var(--ff-display)', fontSize:22, lineHeight:1 }}>{h>0?`${h}h ${m}m`:`${m}m`}</div>
              </div>
              <button className="btn primary" onClick={e=>{e.stopPropagation();onJoin();}}>Join <Icon name="arrow-right" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && <SessionDetailModal session={calSes} onClose={() => setModalOpen(false)} isAdmin={false} />}
    </>
  );
};

// ─── Stats row ────────────────────────────────────────────────────────────────
const MiniBars = ({ values, accent }) => {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:34, marginTop:14 }}>
      {values.map((v,i) => {
        const isLast = i === values.length - 1;
        return (
          <div key={i} style={{
            flex: 1,
            height: ((v / max) * 100) + '%',
            background: isLast ? accent : 'var(--border-strong)',
            opacity: isLast ? 1 : 0.5,
            borderRadius: 3,
            minHeight: 4,
            transition: 'height .4s ease'
          }} />
        );
      })}
    </div>
  );
};

const DashStats = ({ stats }) => {
  const items = [
    { label:'1:1 Sessions', v:stats.sessions, sub:'completed', trend:[2,3,2,4,3,5,4,6], color:'var(--accent)',   delta:'+18%' },
    { label:'Modules',      v:stats.modules,  sub:'completed', trend:[1,2,4,3,5,4,6,7], color:'var(--teal-600)', delta:'+24%' },
    { label:'Habits',       v:stats.habits,   sub:'created',   trend:[1,2,2,3,3,4,4,5], color:'var(--coral)',    delta:'+12%' },
    { label:'Town Halls',   v:stats.townHalls,sub:'attended',  trend:[0,1,1,2,2,3,3,3], color:'#E8B24C',         delta:'+9%'  },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, minWidth:0 }}>
      {items.map((it) => (
        <div key={it.label} className="card" style={{ padding:'18px 18px 16px', borderRadius:22, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:4 }}>
            <div className="eyebrow" style={{ fontSize:10, whiteSpace:'normal', overflow:'hidden', textOverflow:'ellipsis' }}>{it.label}</div>
            <span style={{ fontSize:10, color:'var(--teal-600)', fontWeight:700, fontFamily:'var(--ff-sub)', letterSpacing:'0.04em', flexShrink:0 }}>{it.delta}</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:8 }}>
            <span className="display" style={{ fontSize:38, lineHeight:1 }}>{it.v}</span>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{it.sub}</span>
          </div>
          <MiniBars values={it.trend} accent={it.color} />
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
function DashboardScreen({ member, onJoin, onGoto, gameMode, intention, onClearIntention, tasks, goals }) {
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  return (
    <>
      <div className="page-header" style={{ alignItems:'flex-end' }}>
        <div>
          <div className="eyebrow">Good morning · {today}</div>
          <h1 className="page-title">Hello, <span style={{ color:'var(--accent)' }}>{member.firstName}</span></h1>
          <div className="page-sub" style={{ marginTop:10, maxWidth:620, color:'var(--text-2)' }}>
            You're on pace for a sharp week. One session, three tasks, and a town hall between now and Friday.
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
          <DashStats stats={member.stats} />
          <DashWeeklyChart />
          <EisenhowerMatrix tasks={tasks} />
        </div>
        <div className="stack" style={{ gap:22, minWidth:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <DashStreak days={member.streakDays} gameMode={gameMode} />
            <DashLevel member={member} />
          </div>
          <DashPomodoro gameMode={gameMode} tasks={tasks} goals={goals} />
          <DashFocusBreakdown />
          <DashTasksPeek tasks={tasks} onGoTasks={() => onGoto('tasks')} />
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DashboardScreen });
