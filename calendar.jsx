// calendar.jsx — Full-featured calendar with Day/Week/Month views

const HOUR_START = 0;
const HOUR_END = 24;
const HOUR_H = 54; // px per hour
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CAL_SESSIONS = [
{ id: 'cs1', type: '1:1', title: '1:1 — Brand kickoff', date: '2026-04-08', startH: 16.5, endH: 17.5, mentor: 'Ramy El-Sayed', mInit: 'RE', mColor: '#0F52BA', status: 'past', link: 'https://zoom.us/j/vantage' },
{ id: 'cs2', type: '1:1', title: '1:1 — Positioning review', date: '2026-04-15', startH: 16.5, endH: 17.5, mentor: 'Ramy El-Sayed', mInit: 'RE', mColor: '#0F52BA', status: 'past', link: 'https://zoom.us/j/vantage', recurring: 'weekly' },
{ id: 'cs3', type: '1:1', title: '1:1 — Career check-in', date: '2026-04-22', startH: 16.5, endH: 17.5, mentor: 'Ramy El-Sayed', mInit: 'RE', mColor: '#0F52BA', status: 'upcoming', link: 'https://zoom.us/j/vantage', recurring: 'weekly' },
{ id: 'cs4', type: 'Town Hall', title: 'April Town Hall', date: '2026-04-30', startH: 19, endH: 20.25, mentor: 'All Mentorship', mInit: 'MG', mColor: '#0A0A0A', status: 'upcoming', link: 'https://zoom.us/j/townhall', recurring: 'monthly' },
{ id: 'cs5', type: '1:1', title: '1:1 — CV rewrite review', date: '2026-05-05', startH: 17, endH: 18, mentor: 'Ramy El-Sayed', mInit: 'RE', mColor: '#0F52BA', status: 'upcoming', link: 'https://zoom.us/j/vantage', recurring: 'weekly' },
{ id: 'cs6', type: '1:1', title: '1:1 — Mid-month check', date: '2026-05-13', startH: 16.5, endH: 17.5, mentor: 'Ramy El-Sayed', mInit: 'RE', mColor: '#0F52BA', status: 'upcoming', link: 'https://zoom.us/j/vantage', recurring: 'weekly' },
{ id: 'cs7', type: 'Town Hall', title: 'May Town Hall', date: '2026-05-28', startH: 19, endH: 20.25, mentor: 'All Mentorship', mInit: 'MG', mColor: '#0A0A0A', status: 'upcoming', link: 'https://zoom.us/j/townhall', recurring: 'monthly' }];


const DEFAULT_AGENDA = {
  '1:1': [
  "Review last session's action items",
  "Progress update on current tasks",
  "Key challenge or friction this week",
  "Next steps and task assignments"],

  'Town Hall': [
  "Welcome and announcements",
  "Guest speaker / feature topic",
  "Member spotlight",
  "Open Q&A",
  "Closing — next session preview"]

};

function fmtH(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const p = hh >= 12 ? 'PM' : 'AM';
  const d = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return mm ? `${d}:${String(mm).padStart(2, '0')} ${p}` : `${d} ${p}`;
}

function ymd(d) {return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;}
function sameDay(a, b) {return ymd(a) === ymd(b);}
function getWeekStart(d) {
  const r = new Date(d);r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
function addDays(d, n) {const r = new Date(d);r.setDate(r.getDate() + n);return r;}

function sesColor(type) {return type === 'Town Hall' ? '#FF6B6B' : '#0F52BA';}

// ---------- Session Detail Modal ----------
function SessionDetailModal({ session, onClose, isAdmin }) {
  const [agenda, setAgenda] = useState(() =>
  (DEFAULT_AGENDA[session.type] || []).map((t) => ({ text: t, done: false }))
  );
  const [newItem, setNewItem] = useState('');
  const past = session.status === 'past';
  const isTH = session.type === 'Town Hall';

  const addItem = () => {
    if (!newItem.trim()) return;
    setAgenda((a) => [...a, { text: newItem.trim(), done: false }]);
    setNewItem('');
  };
  const toggleItem = (i) => setAgenda((a) => a.map((x, j) => j === i ? { ...x, done: !x.done } : x));
  const removeItem = (i) => setAgenda((a) => a.filter((_, j) => j !== i));

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.45)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 520, maxHeight: '86vh', overflow: 'auto', zIndex: 201, padding: 0, boxShadow: 'var(--shadow-3)' }}>

        {/* Header */}
        <div className={isTH ? 'coral-header' : 'sapphire-header'} style={{
          padding: '22px 24px',
          background: isTH ? 'rgba(255,107,107,0.08)' : 'rgba(15,82,186,0.07)',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className={"chip " + (isTH ? 'coral' : 'sapphire')}><span className="dot" />{session.type}</span>
                {session.recurring && <span className="chip teal">↻ Repeats {session.recurring}</span>}
                {past && <span className="chip teal"><Icon name="check" size={10} stroke={3} /> Completed</span>}
              </div>
              <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>{session.title}</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--text-2)', flexShrink: 0, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Date & time</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{session.date || ymd(new Date(session.date + 'T12:00'))}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{fmtH(session.startH)} – {fmtH(session.endH)} GST · {Math.round((session.endH - session.startH) * 60)} min</div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>With</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar initials={session.mInit} color={session.mColor} size={26} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{session.mentor}</span>
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Meeting link</div>
              {session.link ?
              <span style={{ fontSize: 12, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => window.open(session.link, '_blank')}>
                    Open in Zoom <Icon name="external" size={11} />
                  </span> :
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Not set</span>
              }
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Attending</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {['AK', 'RE'].map((ini, k) =>
                <Avatar key={k} initials={ini} color={['#0F52BA', '#4FB7A6'][k]} size={22} style={{ marginLeft: k > 0 ? -6 : 0, border: '2px solid var(--bg-elev)' }} />
                )}
                {isTH && <>
                  <Avatar initials="NA" color="#E8B24C" size={22} style={{ marginLeft: -6, border: '2px solid var(--bg-elev)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>+211 members</span>
                </>}
              </div>
            </div>
          </div>
        </div>

        {/* Agenda */}
        <div style={{ padding: '20px 24px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Session agenda</div>
          {agenda.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 12 }}>No agenda items yet. {isAdmin ? 'Add one below.' : 'Your mentor will add an agenda soon.'}</div>}
          <div className="stack" style={{ gap: 6 }}>
            {agenda.map((item, i) =>
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 9,
              background: item.done ? 'var(--bg-sunken)' : 'var(--bg-elev)',
              border: '1px solid var(--border)'
            }}>
                <div className={"check" + (item.done ? " on" : "")} onClick={() => toggleItem(i)}>
                  {item.done && <Icon name="check" size={11} stroke={3} />}
                </div>
                <span style={{ fontSize: 13, flex: 1, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-3)' : 'var(--text)' }}>{item.text}</span>
                {isAdmin && <button onClick={() => removeItem(i)} style={{ opacity: 0.35, fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>}
              </div>
            )}
          </div>
          {isAdmin &&
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input className="input" placeholder="Add agenda item…" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} style={{ flex: 1, fontSize: 13 }} />
              <button className="btn sm" onClick={addItem} disabled={!newItem.trim()}>Add</button>
            </div>
          }
        </div>

        {/* Footer */}
        {!past &&
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {isAdmin && <button className="btn ghost sm">Reschedule</button>}
            <button className="btn primary" onClick={() => window.open(session.link, '_blank')}>
              Join session <Icon name="external" size={13} />
            </button>
          </div>
        }
      </div>
    </>);

}

// ---------- Filter Bar ----------
function CalendarFilterBar({ filters, setFilters, sessions, view, date }) {
  const inPeriod = sessions.filter((s) => {
    const sd = new Date(s.date + 'T12:00');
    if (view === 'month') return sd.getFullYear() === date.getFullYear() && sd.getMonth() === date.getMonth();
    if (view === 'week') {
      const ws = getWeekStart(date);
      const we = addDays(ws, 6);
      return sd >= ws && sd <= we;
    }
    return sameDay(sd, date);
  });

  const stats = {};
  ['1:1', 'Town Hall'].forEach((t) => {
    const mine = inPeriod.filter((s) => s.type === t);
    const mins = mine.reduce((a, s) => a + (s.endH - s.startH) * 60, 0);
    stats[t] = { count: mine.length, mins: Math.round(mins) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0 18px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['1:1', 'Town Hall'].map((type) => {
          const on = filters[type];
          return (
            <button key={type} onClick={() => setFilters((f) => ({ ...f, [type]: !f[type] }))}
            className={"chip " + (type === 'Town Hall' ? 'coral' : 'sapphire')}
            style={{ opacity: on ? 1 : 0.4, cursor: 'pointer', padding: '5px 10px', fontSize: 12 }}>
              <span className="dot" style={{ background: sesColor(type) }} />
              {type} {!on && '(hidden)'}
            </button>);

        })}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-2)' }}>
        <span>
          <span style={{ color: '#0F52BA', fontWeight: 700 }}>{stats['1:1'].count} 1:1s</span>
          {' · '}{Math.floor(stats['1:1'].mins / 60)}h {stats['1:1'].mins % 60}m
        </span>
        <span style={{ color: 'var(--text-3)' }}>/</span>
        <span>
          <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{stats['Town Hall'].count} Town Halls</span>
          {' · '}{Math.floor(stats['Town Hall'].mins / 60)}h {stats['Town Hall'].mins % 60}m
        </span>
      </div>
    </div>);

}

// ---------- Month View ----------
function MonthView({ sessions, date, filters, onSelect }) {
  const year = date.getFullYear(),month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(2026, 3, 19);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const filtered = sessions.filter((s) => s.type === '1:1' ? filters['1:1'] : filters['Town Hall']);

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {DAY_NAMES.map((d) =>
        <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{d}</div>
        )}
      </div>
      <div className="cal-grid-month">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-day-cell other-month" />;
          const isToday = sameDay(d, today);
          const daySessions = filtered.filter((s) => sameDay(new Date(s.date + 'T12:00'), d));
          const shown = daySessions.slice(0, 2);
          const extra = daySessions.length - 2;
          return (
            <div key={i} className={"cal-day-cell" + (isToday ? " today" : "")}>
              <div className="cal-day-num" style={isToday ? undefined : { color: d.getDay() === 0 || d.getDay() === 6 ? 'var(--text-3)' : 'var(--text-2)' }}>{d.getDate()}</div>
              {shown.map((s) =>
              <div key={s.id} className={"cal-pill" + (s.status === 'past' ? " past" : "")}
              style={{ background: sesColor(s.type) }}
              onClick={() => onSelect(s)}>
                  {s.recurring && <span style={{ opacity: 0.9, fontSize: 9 }}>↻</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                </div>
              )}
              {extra > 0 && <div style={{ fontSize: 10, color: 'var(--text-3)', paddingLeft: 4 }}>+{extra} more</div>}
            </div>);

        })}
      </div>
    </div>);

}

// ---------- Week View ----------
function WeekView({ sessions, date, filters, onSelect }) {
  const ws = getWeekStart(date);
  const today = new Date(2026, 3, 19);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const filtered = sessions.filter((s) => s.type === '1:1' ? filters['1:1'] : filters['Town Hall']);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(7, 1fr)`, minWidth: 700 }}>
        {/* Corner */}
        <div style={{ borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--bg-sunken)' }} />
        {/* Day headers */}
        {weekDays.map((d, i) =>
        <div key={i} className={"week-col-header" + (sameDay(d, today) ? ' today-col' : '')} style={{ borderBottom: '1px solid var(--border)', borderRight: i < 6 ? '1px solid var(--border)' : 'none', padding: '10px 6px', textAlign: 'center', background: 'var(--bg-sunken)' }}>
            <div className="week-col-day">{DAY_NAMES[i]}</div>
            <div className="week-col-num" style={sameDay(d, today) ? { color: 'var(--accent)' } : {}}>{d.getDate()}</div>
          </div>
        )}
        {/* Time gutter + columns */}
        <div className="time-gutter">
          {HOURS.map((h) => <div key={h} className="time-label">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</div>)}
        </div>
        {weekDays.map((d, di) => {
          const daySessions = filtered.filter((s) => sameDay(new Date(s.date + 'T12:00'), d));
          const totalH = (HOUR_END - HOUR_START) * HOUR_H;
          return (
            <div key={di} style={{ position: 'relative', height: totalH, borderRight: di < 6 ? '1px solid var(--border)' : 'none' }}>
              {HOURS.map((h) => <div key={h} style={{ height: HOUR_H, borderBottom: '1px solid var(--border)' }} />)}
              {daySessions.map((s) => {
                const top = (s.startH - HOUR_START) * HOUR_H;
                const height = Math.max((s.endH - s.startH) * HOUR_H, 28);
                const klass = s.type === 'Town Hall' ? 'evt-coral' : 'evt-sapphire';
                return (
                  <div key={s.id} className={"cal-block " + klass + (s.status === 'past' ? ' past' : '')}
                  style={{ top, height, zIndex: 2 }}
                  onClick={() => onSelect(s)}>
                    {height > 38 && <div className="evt-time">{fmtH(s.startH)} – {fmtH(s.endH)}</div>}
                    <div className="evt-title">{s.recurring && '↻ '}{s.title}</div>
                  </div>);

              })}
            </div>);

        })}
      </div>
    </div>);

}

// ---------- Day View ----------
function DayView({ sessions, date, filters, onSelect }) {
  const today = new Date(2026, 3, 19);
  const isToday = sameDay(date, today);
  const filtered = sessions.filter((s) =>
  sameDay(new Date(s.date + 'T12:00'), date) && (
  s.type === '1:1' ? filters['1:1'] : filters['Town Hall'])
  );
  const totalH = (HOUR_END - HOUR_START) * HOUR_H;

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '10px 0 16px', fontFamily: 'var(--ff-display)', fontSize: 32, color: isToday ? 'var(--accent)' : 'var(--text)' }}>
        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div className="time-gutter">
          {HOURS.map((h) => <div key={h} className="time-label">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</div>)}
        </div>
        <div style={{ position: 'relative', height: totalH }}>
          {HOURS.map((h) => <div key={h} style={{ height: HOUR_H, borderBottom: '1px solid var(--border)' }} />)}
          {filtered.length === 0 &&
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No sessions today

          </div>
          }
          {filtered.map((s) => {
            const top = (s.startH - HOUR_START) * HOUR_H;
            const height = Math.max((s.endH - s.startH) * HOUR_H, 36);
            const klass = s.type === 'Town Hall' ? 'evt-coral' : 'evt-sapphire';
            return (
              <div key={s.id} className={"cal-block " + klass + (s.status === 'past' ? ' past' : '')}
              style={{ top, height, left: 10, right: 10, zIndex: 2, padding: '10px 14px' }}
              onClick={() => onSelect(s)}>
                <div className="evt-time">{fmtH(s.startH)} – {fmtH(s.endH)} · {s.mentor}</div>
                <div className="evt-title" style={{ fontSize: 13 }}>{s.recurring && '↻ '}{s.title}</div>
              </div>);

          })}
        </div>
      </div>
    </div>);

}

// ---------- Main Calendar ----------
function Calendar({ isAdmin }) {
  const TODAY = new Date(2026, 3, 19);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date(2026, 3, 19));
  const [filters, setFilters] = useState({ '1:1': true, 'Town Hall': true });
  const [selected, setSelected] = useState(null);
  const [recurringType, setRecurringType] = useState('does-not-repeat');

  const navigate = (delta) => {
    const d = new Date(date);
    if (view === 'month') d.setMonth(d.getMonth() + delta);else
    if (view === 'week') d.setDate(d.getDate() + delta * 7);else
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const periodLabel = () => {
    if (view === 'month') return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    if (view === 'week') {
      const ws = getWeekStart(date);
      const we = addDays(ws, 6);
      return ws.getMonth() === we.getMonth() ?
      `${ws.getDate()} – ${we.getDate()} ${MONTH_NAMES[ws.getMonth()]} ${ws.getFullYear()}` :
      `${ws.getDate()} ${MONTH_NAMES[ws.getMonth()]} – ${we.getDate()} ${MONTH_NAMES[we.getMonth()]}`;
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div>
      {/* Calendar nav */}
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn sm" onClick={() => setDate(new Date(TODAY))}>Today</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => navigate(-1)}><Icon name="chevron-right" size={13} style={{ transform: 'rotate(180deg)' }} /></button>
            <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => navigate(1)}><Icon name="chevron-right" size={13} /></button>
          </div>
          <div className="display" style={{ fontSize: 24 }}>{periodLabel()}</div>
        </div>
        <div className="tabs">
          <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Month</button>
          <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>Week</button>
          <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>Day</button>
        </div>
      </div>

      {/* Filter bar + time summary */}
      <CalendarFilterBar filters={filters} setFilters={setFilters} sessions={CAL_SESSIONS} view={view} date={date} />

      {/* Admin: recurring option */}
      {isAdmin &&
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'var(--bg-sunken)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <span className="eyebrow" style={{ margin: 0 }}>New session recurrence:</span>
          <select className="input" style={{ width: 'auto', fontSize: 12 }} value={recurringType} onChange={(e) => setRecurringType(e.target.value)}>
            <option value="does-not-repeat">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (select days)</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Recurring sessions show ↻ on their tiles.</span>
        </div>
      }

      {/* Active view */}
      {view === 'month' && <MonthView sessions={CAL_SESSIONS} date={date} filters={filters} onSelect={setSelected} />}
      {view === 'week' && <WeekView sessions={CAL_SESSIONS} date={date} filters={filters} onSelect={setSelected} />}
      {view === 'day' && <DayView sessions={CAL_SESSIONS} date={date} filters={filters} onSelect={setSelected} />}

      {selected && <SessionDetailModal session={selected} onClose={() => setSelected(null)} isAdmin={isAdmin} />}
    </div>);

}

Object.assign(window, { Calendar, SessionDetailModal, CAL_SESSIONS, fmtH });