// wins.jsx — Community Wins Board (wired to Supabase `wins` table)

const EMOJI_LABELS = ['👍', '🔥', '👏', '⭐'];
const WIN_COLORS = ['#0F52BA', '#4FB7A6', '#E8B24C', '#B79BED', '#FF6B6B', '#5BC0DE', '#D76C82', '#4CAF88'];

function winColor(name) {
  let h = 0;
  const s = name || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return WIN_COLORS[h % WIN_COLORS.length];
}
function winInitials(name) {
  if (!name) return 'M';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}
function winTimeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const days = Math.floor(h / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + ' days ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function mapWinRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    author: r.author_name || 'Member',
    initials: winInitials(r.author_name),
    color: winColor(r.author_name),
    role: r.author_role || '',
    isAdmin: (r.author_role || '').includes('MEGA'),
    text: r.title,
    subject: r.subject || '',
    time: winTimeAgo(r.created_at),
    createdAt: r.created_at
  };
}

function WinCard({ win, counts, mine, userId }) {
  const [reactions, setReactions] = useState(counts || {});
  const [reacted, setReacted] = useState(mine || {});

  React.useEffect(() => { setReactions(counts || {}); }, [counts]);
  React.useEffect(() => { setReacted(mine || {}); }, [mine]);

  const react = async (emoji) => {
    if (!userId) return;
    const isOn = reacted[emoji];
    // optimistic update
    setReacted((r) => ({ ...r, [emoji]: !isOn }));
    setReactions((r) => ({ ...r, [emoji]: (r[emoji] || 0) + (isOn ? -1 : 1) }));
    const q = window._supabase.from('win_reactions');
    const { error } = isOn ?
      await q.delete().eq('win_id', win.id).eq('user_id', userId).eq('emoji', emoji) :
      await q.insert({ win_id: win.id, user_id: userId, emoji });
    if (error) {
      // revert on failure
      setReacted((r) => ({ ...r, [emoji]: isOn }));
      setReactions((r) => ({ ...r, [emoji]: (r[emoji] || 0) + (isOn ? 1 : -1) }));
    }
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
            {win.role && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{win.role}</span>}
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{win.time}</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 12px' }}>
            {win.text}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {win.subject &&
            <span className="chip teal" style={{ fontSize: 11, borderColor: subColor + '33', color: subColor, background: subColor + '14' }}>
                <span className="dot" style={{ background: subColor }} />{win.subject}
              </span>
            }
            <div style={{ display: 'flex', gap: 6 }}>
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
                  {reactions[e] > 0 && <span style={{ fontSize: 11, color: reacted[e] ? '#C84848' : 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{reactions[e]}</span>}
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
  const [posting, setPosting] = useState(false);
  const MAX = 280;

  const submit = async () => {
    setPosting(true);
    await onPost({ text: text.trim(), subject });
    setPosting(false);
    onClose();
  };

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
              <button className="btn primary" disabled={!text.trim() || posting} onClick={submit}>
                {posting ? 'Posting…' : 'Post win 🎯'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>);

}

function WinsScreen() {
  const [wins, setWins] = React.useState([]);
  const [memberCount, setMemberCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [composing, setComposing] = React.useState(false);
  const [reactionsByWin, setReactionsByWin] = React.useState({});
  const [myReactionsByWin, setMyReactionsByWin] = React.useState({});
  const [userId, setUserId] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await window._supabase.auth.getUser();
      if (active) setUserId(user?.id || null);
      const [winsRes, countRes] = await Promise.all([
        window._supabase.from('wins').select('id, user_id, title, subject, author_name, author_role, created_at').eq('is_public', true).order('created_at', { ascending: false }),
        window._supabase.rpc('member_count')]);
      if (!active) return;
      const winRows = winsRes.data || [];
      setWins(winRows.map(mapWinRow));
      setMemberCount(countRes.data || 0);
      setLoading(false);

      const ids = winRows.map((w) => w.id);
      if (!ids.length) return;
      const { data: rx } = await window._supabase.from('win_reactions').select('win_id, user_id, emoji').in('win_id', ids);
      if (!active) return;
      const counts = {}, mine = {};
      (rx || []).forEach((r) => {
        (counts[r.win_id] = counts[r.win_id] || {})[r.emoji] = (counts[r.win_id][r.emoji] || 0) + 1;
        if (user && r.user_id === user.id) (mine[r.win_id] = mine[r.win_id] || {})[r.emoji] = true;
      });
      setReactionsByWin(counts);
      setMyReactionsByWin(mine);
    })();
    return () => {active = false;};
  }, []);

  const postWin = async ({ text, subject }) => {
    if (!text) return;
    const m = window._currentMember;
    const { data: { user } } = await window._supabase.auth.getUser();
    const author_name = m?.isAdmin ? 'Zachariah Manyapye' : m ? `${m.firstName} ${m.lastName}`.trim() : 'Member';
    const author_role = m?.isAdmin ? 'Founder, MEGA' : m?.plan || 'Member';
    const { data, error } = await window._supabase.from('wins').insert({
      user_id: user.id,
      title: text,
      subject: subject || null,
      author_name,
      author_role,
      is_public: true,
      source: 'member_submitted'
    }).select().single();
    if (error) {console.error('Failed to post win:', error.message);return;}
    setWins((w) => [mapWinRow(data), ...w]);
  };

  const subjectAreas = new Set(wins.map((w) => w.subject).filter(Boolean)).size;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Community</div>
          <h1 className="page-title">Wins Board</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 540 }}>
            Share your progress and celebrate others. Every win counts — big or small.
          </div>
        </div>
        <button className="btn primary" onClick={() => setComposing(true)} style={{ width: "135px" }}>
          <Icon name="plus" size={13} /> Share a win
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 12 }}>
          {loading ?
          <div className="card" style={{ padding: '28px 22px', color: 'var(--text-3)', fontSize: 13 }}>Loading wins…</div> :
          wins.length === 0 ?
          <div className="card" style={{ padding: '40px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No wins shared yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Be the first to share a win with the community.</div>
            </div> :

          wins.map((w) => <WinCard key={w.id} win={w} counts={reactionsByWin[w.id]} mine={myReactionsByWin[w.id]} userId={userId} />)
          }
        </div>
        <div style={{ position: 'sticky', top: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>On the board</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
              { label: 'Wins shared', v: wins.length },
              { label: 'Subject areas', v: subjectAreas },
              { label: 'Community members', v: memberCount }].
              map((s) =>
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700 }}>{s.v}</span>
                </div>
              )}
            </div>
            {wins.length > 0 &&
            <>
                <div className="hr" />
                <div className="eyebrow" style={{ marginBottom: 10 }}>Recent wins</div>
                {wins.slice(0, 3).map((w) =>
              <div key={w.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                    <Avatar initials={w.initials} color={w.color} size={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{w.author}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.text.slice(0, 60)}{w.text.length > 60 ? '…' : ''}</div>
                    </div>
                  </div>
              )}
              </>
            }
          </div>
        </div>
      </div>

      {composing && <WinsComposer onClose={() => setComposing(false)} onPost={postWin} />}
    </>);

}

Object.assign(window, { WinsScreen });
