// Sessions screen — uses full Calendar component

function SessionsScreen({ onJoin, isAdmin }) {
  const [view, setView] = useState('calendar');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  React.useEffect(() => {
    let active = true;
    window.fetchListSessions().then((rows) => {if (active) {setSessions(rows);setLoading(false);}});
    return () => {active = false;};
  }, []);

  const upcoming = sessions.filter((s) => s.status === 'upcoming');
  const past = sessions.filter((s) => s.status === 'past');

  // Convert a list session to the shape the detail modal expects
  function toCalSes(s) {
    return {
      ...s,
      startH: s.startH != null ? s.startH : 16.5,
      endH: s.endH != null ? s.endH : 17.5,
      mentor: s.mentor || 'MEGA',
      mInit: s.mentorInitials || 'ME',
      mColor: s.mentorColor || '#0F52BA',
      date: s.dateISO || s.date
    };
  }

  function ListCard({ s, past }) {
    const [open, setOpen] = useState(false);
    const isTown = s.type === "Town Hall";
    return (
      <>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ses-row" style={{ display: 'flex' }}>
            <div style={{
              width: 88, padding: '22px 16px', textAlign: 'center',
              borderRight: '1px solid var(--border)',
              background: 'var(--bg-sunken)'
            }}>
              <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4, color: 'var(--sapphire)' }}>{s.date.split(',')[0]}</div>
              <div className="display" style={{ fontSize: 30, lineHeight: 1, color: 'var(--sapphire)' }}>
                {s.dateISO.split('-')[2]}
              </div>
              <div className="sub" style={{ fontSize: 11, color: 'var(--sapphire)', opacity: 0.75, marginTop: 2 }}>
                {new Date(s.dateISO).toLocaleString('en-US', { month: 'short' })}
              </div>
            </div>
            <div className="ses-content" style={{ flex: 1, padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={"chip " + (isTown ? "coral" : "sapphire")}><span className="dot" />{s.type}</span>
                {past && <span className="chip teal"><span className="material-symbols-outlined" style={{ fontSize:10, lineHeight:1 }}>check</span>Completed</span>}
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.time}</span>
              </div>
              <div className="display" style={{ fontSize: 20, marginTop: 8, lineHeight: 1.15 }}>{s.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <Avatar initials={s.mentorInitials} color={s.mentorColor} size={24} />
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.mentor}</div>
              </div>
              {past && s.notes &&
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-sunken)', borderRadius: 10, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>Notes · </span>{s.notes}
                </div>
              }
            </div>
            <div className="ses-actions" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', borderLeft: '1px solid var(--border)', minWidth: 170 }}>
              <button className="btn" onClick={() => setOpen(true)} style={{ justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:13, lineHeight:1 }}>event</span> View agenda
              </button>
              {!past &&
              <>
                  <button className="btn primary" onClick={() => onJoin(s)} style={{ justifyContent: 'center' }}>Join <span className="material-symbols-outlined" style={{ fontSize:12, lineHeight:1 }}>open_in_new</span></button>
                  <button className="btn ghost sm" style={{ justifyContent: 'center' }}>Reschedule</button>
                </>
              }
              {past && <button className="btn ghost sm" style={{ justifyContent: 'center' }}>Resources</button>}
            </div>
          </div>
        </div>
        {open && <SessionDetailModal session={toCalSes(s)} onClose={() => setOpen(false)} isAdmin={isAdmin} />}
      </>);

  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-eyebrow">Sessions</div>
          <h1 className="page-title xl" style={{ margin: '6px 0 0', color: 'var(--text)' }}>Your calendar</h1>
          <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.6, opacity: 0.8 }}>
            Every 1:1 and town hall in one place. Reminders fire 90 minutes before you start.
          </div>
        </div>
        <div className="tabs" style={{ flexShrink: 0 }}>
          <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}><span className="material-symbols-outlined" style={{ fontSize:13, lineHeight:1, marginRight:6 }}>event</span>Calendar</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><span className="material-symbols-outlined" style={{ fontSize:13, lineHeight:1, marginRight:6 }}>list</span>List</button>
        </div>
      </div>

      {view === 'calendar' && <Calendar isAdmin={isAdmin} />}

      {view === 'list' &&
      <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Upcoming · {upcoming.length}</div>
          {loading ?
          <div style={{ padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>Loading sessions…</div> :
          upcoming.length === 0 ?
          <div className="card" style={{ padding: '28px 22px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No upcoming sessions scheduled yet. Your mentor will book your next one soon.</div> :

          <div className="stack" style={{ gap: 12 }}>
              {upcoming.map((s) => <ListCard key={s.id} s={s} />)}
            </div>
          }
          <div style={{ marginTop: 28 }}>
            {!loading && past.length === 0 ?
            <>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Past · 0</div>
                <div style={{ padding: '16px 0', color: 'var(--text-3)', fontSize: 13 }}>No past sessions yet.</div>
              </> :

            <>
                <button onClick={() => setShowPast((p) => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, padding: '4px 0', marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:14, lineHeight:1 }}>{showPast ? 'expand_more' : 'chevron_right'}</span>
                  Past ({past.length})
                </button>
                {showPast &&
              <div className="stack" style={{ gap: 12 }}>
                    {past.map((s) => <ListCard key={s.id} s={s} past />)}
                  </div>
              }
              </>
            }
          </div>
        </div>
      }
    </>);

}

Object.assign(window, { SessionsScreen });