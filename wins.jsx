// wins.jsx — Community Wins Board

const WINS_DATA = [
{ id: 'w1', author: 'Ramy El-Sayed', initials: 'RE', color: '#0F52BA', role: 'Founder, MEGA', isAdmin: true,
  text: 'Huge congratulations to everyone who completed their CV rewrite this month — 18 members submitted and every single one improved. That\'s the standard now.',
  subject: 'CV Development', time: '2h ago',
  reactions: { '👍': 14, '🔥': 22, '👏': 18, '⭐': 9 } },
{ id: 'w2', author: 'Amira Khaled', initials: 'AK', color: '#0F52BA', role: 'Breakthrough',
  text: 'Sent my revised CV to three recruiters this morning. First response came in within 90 minutes. The results-first format makes a real difference.',
  subject: 'CV Development', time: '4h ago',
  reactions: { '👍': 8, '🔥': 12, '👏': 6, '⭐': 4 } },
{ id: 'w3', author: 'Noura Al-Mansouri', initials: 'NA', color: '#4FB7A6', role: 'Breakthrough',
  text: 'Presented to a room of 60 people yesterday without notes. Six months ago I couldn\'t get through a sentence without freezing. Consistency compounds.',
  subject: 'Public Speaking & Presentation', time: 'Yesterday',
  reactions: { '👍': 19, '🔥': 28, '👏': 24, '⭐': 11 } },
{ id: 'w4', author: 'Omar Farouk', initials: 'OF', color: '#E8B24C', role: 'Foundations',
  text: 'Hit my 14-day streak today. Logging in every morning before checking anything else. It changes how the whole day starts.',
  subject: 'Habit Tracking', time: 'Yesterday',
  reactions: { '👍': 11, '🔥': 15, '👏': 7, '⭐': 3 } },
{ id: 'w5', author: 'Yasmine Bakr', initials: 'YB', color: '#B79BED', role: 'Management · Advanced',
  text: 'Closed our Q1 strategic planning deck. First time I led a cross-functional process end-to-end. The consulting frameworks from MEGA made it structurally clean.',
  subject: 'Consulting', time: '2 days ago',
  reactions: { '👍': 16, '🔥': 9, '👏': 21, '⭐': 8 } },
{ id: 'w6', author: 'Lina Haddad', initials: 'LH', color: '#D76C82', role: 'Management · Advanced (RTA)',
  text: 'Negotiated a 22% salary increase this week. Preparation, positioning, and knowing your number. Three months of work landed in one conversation.',
  subject: 'Strategic Sales', time: '3 days ago',
  reactions: { '👍': 31, '🔥': 44, '👏': 38, '⭐': 20 } }];


const EMOJI_LABELS = ['👍', '🔥', '👏', '⭐'];

function WinCard({ win, currentUserInitials, currentUserColor }) {
  const [reactions, setReactions] = useState({ ...win.reactions });
  const [reacted, setReacted] = useState({});

  const react = (emoji) => {
    const isOn = reacted[emoji];
    setReacted((r) => ({ ...r, [emoji]: !isOn }));
    setReactions((r) => ({ ...r, [emoji]: r[emoji] + (isOn ? -1 : 1) }));
  };

  const subColor = SUBJECTS[win.subject] || '#888';

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar initials={win.initials} color={win.color} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{win.author}</span>
            {win.isAdmin &&
            <span style={{ fontFamily: 'var(--ff-sub)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>MEGA</span>
            }
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{win.role}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{win.time}</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 12px',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {win.text}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {win.subject &&
            <span className="chip teal" style={{ fontSize: 11, borderColor: subColor + '33', color: subColor, background: subColor + '14' }}>
                <span className="dot" style={{ background: subColor }} />{win.subject}
              </span>
            }
            <div style={{ display: 'flex', gap: 6, marginLeft: win.subject ? 0 : 0 }}>
              {EMOJI_LABELS.map((e) =>
              <button key={e} onClick={() => react(e)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 999,
                border: '1px solid ' + (reacted[e] ? 'var(--coral)' : 'var(--border)'),
                background: reacted[e] ? 'var(--coral-100)' : 'var(--bg-sunken)',
                cursor: 'pointer', fontSize: 13, fontWeight: reacted[e] ? 700 : 400,
                transition: 'all .12s'
              }}>
                  {e}
                  <span style={{ fontSize: 11, color: reacted[e] ? '#C84848' : 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{reactions[e]}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}

function WinsComposer({ onClose, onPost }) {
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const MAX = 280;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.4)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, zIndex: 201, padding: 0, boxShadow: 'var(--shadow-3)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>Share a win</div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <Avatar initials={window._currentMember?.initials} color={window._currentMember?.avatarColor} size={36} />
            <textarea
              value={text}
              onChange={(e) => e.target.value.length <= MAX && setText(e.target.value)}
              placeholder="What did you achieve? Keep it real — even small wins matter here."
              rows={4}
              style={{ flex: 1, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '10px 12px', fontSize: 14, lineHeight: 1.55, resize: 'none', outline: 'none', color: 'var(--text)' }} />
            
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="eyebrow" style={{ margin: 0 }}>Subject area</div>
            <select className="input" style={{ flex: 1, fontSize: 12 }} value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Optional — tag a subject</option>
              {Object.keys(SUBJECTS).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: text.length > MAX * 0.9 ? 'var(--coral)' : 'var(--text-3)' }}>{text.length}/{MAX}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={!text.trim()} onClick={() => {onPost({ text, subject });onClose();}}>
                Post win 🎯
              </button>
            </div>
          </div>
        </div>
      </div>
    </>);

}

function WinsScreen() {
  const [wins, setWins] = useState(WINS_DATA);
  const [composing, setComposing] = useState(false);

  const postWin = ({ text, subject }) => {
    const newWin = {
      id: 'w' + Date.now(),
      author: MEMBER.firstName + ' ' + MEMBER.lastName,
      initials: MEMBER.initials,
      color: MEMBER.avatarColor,
      role: MEMBER.plan,
      text, subject,
      time: 'just now',
      reactions: { '👍': 0, '🔥': 0, '👏': 0, '⭐': 0 }
    };
    setWins((w) => [newWin, ...w]);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Community</div>
          <h1 className="page-title">Wins Board</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 540 }}>Share your wins. Celebrate theirs — A space to share your progress and congratulate others.

          </div>
        </div>
        <button className="btn primary" onClick={() => setComposing(true)} style={{ width: "135px" }}>
          <Icon name="plus" size={13} /> Share a win
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 12 }}>
          {wins.map((w) => <WinCard key={w.id} win={w} />)}
        </div>
        <div style={{ position: 'sticky', top: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>This week on the board</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
              { label: 'Wins posted', v: wins.length },
              { label: 'Total reactions', v: wins.reduce((a, w) => a + Object.values(w.reactions).reduce((s, n) => s + n, 0), 0) },
              { label: 'Subject areas', v: new Set(wins.map((w) => w.subject).filter(Boolean)).size }].
              map((s) =>
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700 }}>{s.v}</span>
                </div>
              )}
            </div>
            <div className="hr" />
            <div className="eyebrow" style={{ marginBottom: 10 }}>Most reacted this week</div>
            {[...wins].sort((a, b) => Object.values(b.reactions).reduce((s, n) => s + n, 0) - Object.values(a.reactions).reduce((s, n) => s + n, 0)).slice(0, 2).map((w) =>
            <div key={w.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <Avatar initials={w.initials} color={w.color} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{w.author}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.text.slice(0, 60)}…</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {composing && <WinsComposer onClose={() => setComposing(false)} onPost={postWin} />}
    </>);

}

Object.assign(window, { WinsScreen });