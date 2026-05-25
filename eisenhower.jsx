// eisenhower.jsx — Eisenhower Matrix widget + full view

const PRIORITY_CONFIG = {
  Critical:  { color:'var(--coral)',    bg:'var(--coral-100)',  label:'Critical'  },
  Important: { color:'var(--accent)',   bg:'var(--accent-soft)',label:'Important' },
  Routine:   { color:'var(--teal-600)', bg:'var(--teal-50)',    label:'Routine'   },
  Backlog:   { color:'var(--text-3)',   bg:'var(--bg-sunken)',  label:'Backlog'   },
};

const DUE_CONFIG = {
  overdue:  { color:'var(--coral)',    label:'Overdue' },
  soon:     { color:'#C88A1A',         label:'Due soon' },
  upcoming: { color:'var(--teal-600)', label:'Upcoming' },
  none:     { color:'var(--text-3)',   label:'No date' },
};

function dueDateStatus(due) {
  if (!due) return 'none';
  // due is a string like "Tomorrow · 6:00 PM", "Apr 24", etc.
  if (due.toLowerCase().includes('tomorrow') || due.toLowerCase().includes('today')) return 'soon';
  if (due.toLowerCase().includes('overdue')) return 'overdue';
  return 'upcoming';
}

// Fully automatic placement from priority + due date. No manual override.
//   Critical/Important + (overdue OR due within 3 days) → Q1 Do Now
//   Critical/Important + (due beyond 3 days OR no due date) → Q2 Do Next
//   Routine/Backlog   + (overdue OR due within 3 days) → Q3 Handle Soon
//   Routine/Backlog   + (due beyond 3 days OR no due date) → Q4 Revisit Later
// Edge cases: no due date is treated as Not Urgent; overdue is always Urgent
// (even Routine/Backlog → Q3). Recomputed every render so it tracks the clock.
function getQuadrant(task) {
  const p = task.priority || 'Routine';
  const important = p === 'Critical' || p === 'Important';

  let urgent = false;
  if (task.due_date) {
    const days = Math.ceil((new Date(task.due_date) - new Date()) / 86400000);
    urgent = days <= 3; // overdue (<= 0) or within 3 days
  }

  if (important) return urgent ? 'do' : 'schedule';
  return urgent ? 'delegate' : 'eliminate';
}

const QUADRANTS = [
  { id:'do',       label:'Do Now',      sub:'Urgent + Important',        color:'var(--coral)',    icon:'flame'   },
  { id:'schedule', label:'Do Next',     sub:'Not Urgent + Important',    color:'var(--accent)',   icon:'sessions'},
  { id:'delegate', label:'Handle Soon', sub:'Urgent + Lower Priority',   color:'var(--teal-600)', icon:'users'   },
  { id:'eliminate',label:'Revisit Later',sub:'Not Urgent + Lower Priority',color:'var(--text-3)', icon:'target'  },
];

function MatrixTaskCard({ task, compact }) {
  const p = task.priority || 'Routine';
  const pc = PRIORITY_CONFIG[p];
  const ds = dueDateStatus(task.due);
  const dc = DUE_CONFIG[ds];

  if (compact) {
    return (
      <div style={{
        padding:'6px 8px', borderRadius:8, background:'var(--bg-elev)',
        border:'1px solid var(--border)', fontSize:11, lineHeight:1.35,
        display:'flex', alignItems:'center', gap:6, minWidth:0
      }}>
        <span style={{ width:6, height:6, borderRadius:999, background:pc.color, flexShrink:0 }} />
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{task.title}</span>
      </div>
    );
  }

  return (
    <div style={{
      padding:'10px 12px', borderRadius:10, background:'var(--bg-elev)',
      border:'1px solid var(--border)', marginBottom:6
    }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
        <span style={{ fontSize:9, padding:'2px 6px', borderRadius:999, background:pc.bg, color:pc.color,
          fontFamily:'var(--ff-sub)', fontWeight:700, letterSpacing:'0.08em', border:'1px solid '+pc.color+'55' }}>
          {p}
        </span>
        {task.due && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:999, background:'transparent',
          color:dc.color, fontFamily:'var(--ff-sub)', fontWeight:600 }}>📅 {task.due}</span>}
      </div>
      <div style={{ fontSize:12, fontWeight:600, lineHeight:1.35, marginBottom:4 }}>{task.title}</div>
      <div style={{ fontSize:10, color:'var(--text-3)' }}>{task.subject}</div>
    </div>
  );
}

function EisenhowerMatrix({ tasks }) {
  const [expanded, setExpanded] = useState(false);

  // Completed tasks never appear; everything else is auto-placed by getQuadrant.
  const activeTasks = (tasks || []).filter(t => !t.is_completed);
  const quadrantTasks = {};
  QUADRANTS.forEach(q => {
    quadrantTasks[q.id] = activeTasks.filter(t => getQuadrant(t) === q.id);
  });

  // Compact preview
  if (!expanded) {
    return (
      <div className="card" style={{ padding:22 }}>
        <div className="row-between" style={{ marginBottom:14 }}>
          <div>
            <div className="eyebrow">Priority matrix</div>
            <div style={{ fontFamily:'var(--ff-display)', fontSize:22, marginTop:2 }}>Eisenhower Matrix</div>
          </div>
          <button className="btn sm" onClick={() => setExpanded(true)}>
            Expand <Icon name="arrow-right" size={12} />
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {QUADRANTS.map(q => {
            const count = quadrantTasks[q.id].length;
            return (
              <div key={q.id} style={{
                padding:'14px', borderRadius:12,
                background: q.color + '10',
                border:'1px solid ' + q.color + '30',
                minWidth:0, overflow:'hidden'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <Icon name={q.icon} size={14} style={{ color:q.color }} />
                  <div style={{ fontSize:12, fontWeight:700, color:q.color }}>{q.label}</div>
                </div>
                <div className="display" style={{ fontSize:28, lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{q.sub}</div>
                {count > 0 && (
                  <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
                    {quadrantTasks[q.id].slice(0,2).map(t => <MatrixTaskCard key={t.id} task={t} compact />)}
                    {count > 2 && <div style={{ fontSize:10, color:'var(--text-3)', paddingLeft:4 }}>+{count-2} more</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded full panel
  return (
    <>
      <div onClick={() => setExpanded(false)} style={{ position:'fixed', inset:0, background:'rgba(10,10,10,0.5)', zIndex:200, backdropFilter:'blur(3px)' }} />
      <div style={{
        position:'fixed', top:'5vh', left:'5vw', right:'5vw', bottom:'5vh',
        background:'var(--bg)', border:'1px solid var(--border)',
        borderRadius:24, zIndex:201, overflow:'auto', padding:32,
        boxShadow:'var(--shadow-3)'
      }}>
        <div className="row-between" style={{ marginBottom:24 }}>
          <div>
            <div className="eyebrow">Dashboard · Priority matrix</div>
            <div className="display" style={{ fontSize:36 }}>Eisenhower Matrix</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:4 }}>Tasks are placed automatically from their priority and due date. Completed tasks drop off.</div>
          </div>
          <button className="btn" onClick={() => setExpanded(false)}>✕ Close</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:16, height:'calc(100% - 120px)' }}>
          {QUADRANTS.map(q => (
            <div key={q.id}
              style={{
                background: q.color + '08',
                border:'2px solid ' + q.color + '25',
                borderRadius:16, padding:18, overflow:'auto'
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:q.color+'22', display:'grid', placeItems:'center', color:q.color }}>
                  <Icon name={q.icon} size={16} />
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:q.color }}>{q.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{q.sub}</div>
                </div>
                <div style={{ marginLeft:'auto', fontFamily:'var(--ff-display)', fontSize:22, color:q.color }}>
                  {quadrantTasks[q.id].length}
                </div>
              </div>
              {quadrantTasks[q.id].length === 0 && (
                <div style={{ textAlign:'center', color:'var(--text-3)', fontSize:12, padding:'24px 0', opacity:0.6 }}>
                  Nothing here right now
                </div>
              )}
              {quadrantTasks[q.id].map(t => (
                <MatrixTaskCard key={t.id} task={t} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { EisenhowerMatrix, PRIORITY_CONFIG, DUE_CONFIG, getQuadrant, QUADRANTS });
