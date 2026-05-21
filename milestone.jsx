// milestone.jsx — Milestone timeline for profile page

const MILESTONES = [
  { id:'m1', type:'join',    icon:'star',    color:'var(--accent)',   label:'Joined Vantage',             date:'Feb 12, 2026', desc:'Account created · Breakthrough plan' },
  { id:'m2', type:'session', icon:'sessions',color:'var(--accent)',   label:'First 1:1 completed',        date:'Feb 18, 2026', desc:'With Ramy El-Sayed' },
  { id:'m3', type:'badge',   icon:'trophy',  color:'var(--teal-600)', label:'Badge: First 1:1',           date:'Feb 18, 2026', desc:'Earned after first mentorship call' },
  { id:'m4', type:'streak',  icon:'flame',   color:'var(--coral)',    label:'7-Day Streak',               date:'Feb 21, 2026', desc:'Seven consecutive weekday logins' },
  { id:'m5', type:'level',   icon:'chart',   color:'var(--accent)',   label:'Level up: Beginner → Rising',date:'Mar 1, 2026',  desc:'Reached 1,000 XP' },
  { id:'m6', type:'goal',    icon:'target',  color:'var(--teal-600)', label:'First goal achieved',        date:'Mar 10, 2026', desc:'Become the team\'s clearest communicator' },
  { id:'m7', type:'badge',   icon:'trophy',  color:'var(--teal-600)', label:'Badge: First Goal',          date:'Mar 10, 2026', desc:'Completed your first end-to-end goal' },
  { id:'m8', type:'badge',   icon:'trophy',  color:'var(--teal-600)', label:'Badge: Subject Mastered — Comms', date:'Mar 18, 2026', desc:'Completed all Professional Communication modules' },
  { id:'m9', type:'streak',  icon:'flame',   color:'var(--coral)',    label:'14-Day Streak',              date:'Mar 28, 2026', desc:'Two full weeks of weekday consistency' },
  { id:'m10',type:'level',   icon:'chart',   color:'var(--accent)',   label:'Level up: Rising → Skilled', date:'Apr 2, 2026',  desc:'Reached 3,000 XP' },
  { id:'m11',type:'session', icon:'sessions',color:'var(--accent)',   label:'Town Hall: 4 attended',      date:'Apr 8, 2026',  desc:'Badge unlocked: Town Hall Regular' },
  { id:'m12',type:'badge',   icon:'trophy',  color:'var(--teal-600)', label:'Badge: Town Hall Regular',   date:'Apr 8, 2026',  desc:'Attended four MEGA town halls' },
];

function MilestoneTimeline() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? MILESTONES : MILESTONES.slice(-6);

  return (
    <div className="card" style={{ padding:22 }}>
      <div className="row-between" style={{ marginBottom:20 }}>
        <div>
          <div className="eyebrow">Achievement story</div>
          <div className="display" style={{ fontSize:26, marginTop:4 }}>Milestones</div>
        </div>
        <button className="btn ghost sm" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show recent' : 'Show all'} <Icon name={expanded ? 'chevron-down' : 'arrow-right'} size={12} />
        </button>
      </div>

      {/* Horizontal scroll timeline */}
      <div style={{ overflowX:'auto', paddingBottom:12 }}>
        <div style={{ display:'flex', gap:0, minWidth: visible.length * 160 }}>
          {visible.map((m, i) => (
            <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:'0 0 160px' }}>
              {/* Connector + node */}
              <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                <div style={{ flex:1, height:2, background: i===0 ? 'transparent' : 'var(--border)' }} />
                <div style={{
                  width:38, height:38, borderRadius:999, flexShrink:0,
                  background: m.color + '20',
                  border: '2.5px solid ' + m.color,
                  display:'grid', placeItems:'center',
                  color: m.color,
                  boxShadow: '0 0 0 4px var(--bg-elev)'
                }}>
                  <Icon name={m.icon} size={16} />
                </div>
                <div style={{ flex:1, height:2, background: i===visible.length-1 ? 'transparent' : 'var(--border)' }} />
              </div>

              {/* Label */}
              <div style={{ padding:'10px 6px 0', textAlign:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, lineHeight:1.3, color: m.color }}>{m.label}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{m.date}</div>
                <div style={{ fontSize:10, color:'var(--text-2)', marginTop:2, lineHeight:1.35 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Type legend */}
      <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
        {[
          { label:'Level up', color:'var(--accent)' },
          { label:'Streak milestone', color:'var(--coral)' },
          { label:'Goal & badge', color:'var(--teal-600)' },
        ].map(l => (
          <span key={l.label} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-3)' }}>
            <span style={{ width:8, height:8, borderRadius:999, background:l.color }} />{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MilestoneTimeline });
