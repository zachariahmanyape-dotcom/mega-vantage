// milestone.jsx — Milestone timeline for profile page (derived from real activity)

function MilestoneTimeline({ milestones }) {
  const [expanded, setExpanded] = useState(false);
  const all = milestones || [];

  if (all.length === 0) {
    return (
      <div className="card" style={{ padding: 22 }}>
        <div className="eyebrow">Achievement story</div>
        <div className="display" style={{ fontSize: 26, marginTop: 4 }}>Milestones</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
          Your milestones will appear here as you attend sessions, complete tasks, and log focus time.
        </div>
      </div>
    );
  }

  const visible = expanded ? all : all.slice(-6);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow">Achievement story</div>
          <div className="display" style={{ fontSize: 26, marginTop: 4 }}>Milestones</div>
        </div>
        {all.length > 6 &&
        <button className="btn ghost sm" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show recent' : 'Show all'} <Icon name={expanded ? 'chevron-down' : 'arrow-right'} size={12} />
        </button>
        }
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
        <div style={{ display: 'flex', gap: 0, minWidth: visible.length * 160 }}>
          {visible.map((m, i) =>
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 160px' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 1, height: 2, background: i === 0 ? 'transparent' : 'var(--border)' }} />
                <div style={{
                  width: 38, height: 38, borderRadius: 999, flexShrink: 0,
                  background: m.color + '20',
                  border: '2.5px solid ' + m.color,
                  display: 'grid', placeItems: 'center',
                  color: m.color,
                  boxShadow: '0 0 0 4px var(--bg-elev)'
                }}>
                  <Icon name={m.icon} size={16} />
                </div>
                <div style={{ flex: 1, height: 2, background: i === visible.length - 1 ? 'transparent' : 'var(--border)' }} />
              </div>
              <div style={{ padding: '10px 6px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: m.color }}>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{fmtDate(m.date)}</div>
                {m.desc && <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.35 }}>{m.desc}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MilestoneTimeline });
