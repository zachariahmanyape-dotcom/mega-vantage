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

function getQuadrant(task) {
  // Manual override trumps everything
  if (task._quadrant) return task._quadrant;

  const p = task.priority || 'Routine';
  const urgent = task.dueSort && task.dueSort <= 2; // within 48 hrs proxy

  if (p === 'Critical' || p === 'Important') {
    return urgent ? 'do' : 'schedule';
  }
  if (p === 'Routine') {
    return urgent ? 'delegate' : 'eliminate';
  }
  return 'eliminate'; // Backlog
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
  const isAuto = !task._quadrant;

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
      border:'1px solid var(--border)', marginBottom:6,
      cursor:'grab'
    }}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
        <span style={{ fontSize:9, padding:'2px 6px', borderRadius:999, background:pc.bg, color:pc.color,
          fontFamily:'var(--ff-sub)', fontWeight:700, letterSpacing:'0.08em', border:'1px solid '+pc.color+'55' }}>
          {p}
        </span>
        {isAuto && <span style={{ fontSize:9, padding:'2px 6px', borderRadius:999, background:'var(--bg-sunken)', color:'var(--text-3)',
          fontFamily:'var(--ff-sub)', fontWeight:700, letterSpacing:'0.08em', border:'1px solid var(--border)' }}>Auto</span>}
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
  const [taskMap, setTaskMap] = useState({});
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);

  // Build quadrant map
  const quadrantTasks = {};
  QUADRANTS.forEach(q => {
    quadrantTasks[q.id] = tasks.filter(t => {
      const override = taskMap[t.id];
      return (override || getQuadrant(t)) === q.id;
    });
  });

  const moveTask = (taskId, toQ) => {
    setTaskMap(m => ({ ...m, [taskId]: toQ }));
  };

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
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:4 }}>Drag tasks between quadrants to override auto-placement. Auto-placed tasks show an <strong>Auto</strong> badge.</div>
          </div>
          <button className="btn" onClick={() => setExpanded(false)}>✕ Close</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap:16, height:'calc(100% - 120px)' }}>
          {QUADRANTS.map(q => (
            <div key={q.id}
              onDragOver={e => { e.preventDefault(); setDragOver(q.id); }}
              onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging, q.id); setDragOver(null); setDragging(null); }}
              onDragLeave={() => setDragOver(null)}
              style={{
                background: q.color + (dragOver===q.id ? '22' : '08'),
                border:'2px solid ' + q.color + (dragOver===q.id ? 'cc' : '25'),
                borderRadius:16, padding:18, overflow:'auto',
                transition:'background .15s, border-color .15s'
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
                  Drop tasks here
                </div>
              )}
              {quadrantTasks[q.id].map(t => (
                <div key={t.id} draggable
                  onDragStart={() => setDragging(t.id)}
                  onDragEnd={() => setDragging(null)}>
                  <MatrixTaskCard task={{ ...t, _quadrant: taskMap[t.id] }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { EisenhowerMatrix, PRIORITY_CONFIG, DUE_CONFIG, getQuadrant, QUADRANTS });
