// chat.jsx — Single MEGA Mentorship community channel (lightweight posts backend)

// Count of contributions (posts) the current user has made — powers Community badges.
async function fetchCommunityPostCount() {
  const { data: { user } } = await window._supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await window._supabase.from('community_posts')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  return count || 0;
}
Object.assign(window, { fetchCommunityPostCount });

function mapPostRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    author: r.author_name || 'Member',
    initials: winInitials(r.author_name),
    color: winColor(r.author_name),
    role: r.author_role || '',
    isAdmin: (r.author_role || '').includes('MEGA') || (r.author_role || '').toLowerCase().includes('founder'),
    body: r.body,
    time: winTimeAgo(r.created_at)
  };
}

function ChatScreen() {
  const [memberCount, setMemberCount] = React.useState(0);
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [userId, setUserId] = React.useState(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await window._supabase.auth.getUser();
      if (active) setUserId(user?.id || null);
      const [postsRes, countRes] = await Promise.all([
        window._supabase.from('community_posts').select('id, user_id, body, author_name, author_role, created_at')
          .eq('channel', 'mega').order('created_at', { ascending: true }),
        window._supabase.rpc('member_count')]);
      if (!active) return;
      setPosts((postsRes.data || []).map(mapPostRow));
      setMemberCount(countRes.data || 0);
      setLoading(false);
    })();
    return () => {active = false;};
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [posts.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const m = window._currentMember;
    const { data: { user } } = await window._supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const author_name = m ? `${m.firstName} ${m.lastName}`.trim() : 'Member';
    const author_role = m?.isAdmin ? 'Founder, MEGA' : (m?.plan ? `${m.plan} · member` : 'Member');
    const { data, error } = await window._supabase.from('community_posts').insert({
      user_id: user.id, channel: 'mega', body, author_name, author_role
    }).select().single();
    setSending(false);
    if (error) { console.error('Failed to post message:', error.message); return; }
    setPosts((p) => [...p, mapPostRow(data)]);
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const memberLabel = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Chat</div>
          <h1 className="page-title">Community</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 540 }}>
            Announcements and discussion for the MEGA Mentorship community.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 640 }}>
        {/* Sidebar — single channel */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '16px 12px', background: 'var(--bg-sunken)' }}>
          <div className="eyebrow" style={{ padding: '4px 8px 10px' }}>Channels</div>
          <button className="sb-item active" style={{ padding: '8px 10px', width: '100%' }}>
            <Avatar initials="MG" color="#0F52BA" size={28} />
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>MEGA Mentorship</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {memberLabel}
              </div>
            </div>
          </button>
        </div>

        {/* Main pane */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Avatar initials="MG" color="#0F52BA" size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}># MEGA Mentorship</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{memberLabel} · Announcements and discussion</div>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', background: 'var(--bg)', minHeight: 0 }}>
            {loading ?
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading messages…</div> :
            posts.length === 0 ?
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                <Icon name="chat" size={26} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Start the conversation</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, maxWidth: 440, lineHeight: 1.6 }}>
                  Be the first to post in the MEGA Mentorship channel — share an update, ask a question, or cheer someone on.
                </div>
              </div>
            </div> :
            <div className="stack" style={{ gap: 16 }}>
              {posts.map((p) =>
              <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Avatar initials={p.initials} color={p.color} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{p.author}</span>
                    {p.isAdmin &&
                    <span style={{ fontFamily: 'var(--ff-sub)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
                      background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>MEGA</span>
                    }
                    {p.role && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.role}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{p.time}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.body}</div>
                </div>
              </div>
              )}
            </div>
            }
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Share something with the community…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, padding: '6px 0', color: 'var(--text)' }} />
              <button className="btn primary sm" disabled={!text.trim() || sending} onClick={send} style={{ opacity: !text.trim() || sending ? 0.5 : 1 }}>
                <Icon name="send" size={12} /> {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>);

}

Object.assign(window, { ChatScreen });
