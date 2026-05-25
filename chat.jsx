// chat.jsx — Multi-channel community chat (channels + membership + messages backend)

// Count of messages the current user has posted — powers Community badges.
async function fetchCommunityPostCount() {
  const { data: { user } } = await window._supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await window._supabase.from('messages')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  return count || 0;
}
Object.assign(window, { fetchCommunityPostCount });

function mapMsgRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    author: r.author_name || 'Member',
    initials: winInitials(r.author_name),
    color: winColor(r.author_name),
    role: r.author_role || '',
    isAdmin: (r.author_role || '').includes('MEGA') || (r.author_role || '').toLowerCase().includes('founder'),
    body: r.body,
    time: winTimeAgo(r.created_at),
  };
}

function channelInitials(name) {
  if (!name) return '#';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Create-channel modal (admin only) ──────────────────────────────
function NewChannelModal({ onClose, onCreated }) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());
  const [directory, setDirectory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [meId, setMeId] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await window._supabase.auth.getUser();
      if (active) setMeId(user?.id || null);
      const { data, error } = await window._supabase.rpc('list_members');
      if (!active) return;
      if (error) setErr(error.message);
      setDirectory((data || []));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const candidates = directory
    .filter((m) => m.id !== meId)
    .filter((m) => (m.full_name || '').toLowerCase().includes(search.trim().toLowerCase()));

  const create = async () => {
    const nm = name.trim();
    if (!nm || saving) return;
    setSaving(true); setErr(null);
    const { data: { user } } = await window._supabase.auth.getUser();
    if (!user) { setSaving(false); setErr('Not signed in.'); return; }
    const { data: ch, error } = await window._supabase.from('channels')
      .insert({ name: nm, description: desc.trim() || null, created_by: user.id, is_default: false })
      .select().single();
    if (error) { setSaving(false); setErr(error.message || 'Could not create channel.'); return; }
    const rows = [{ channel_id: ch.id, user_id: user.id, role: 'owner' },
      ...[...selected].map((id) => ({ channel_id: ch.id, user_id: id, role: 'member' }))];
    const { error: mErr } = await window._supabase.from('channel_members').insert(rows);
    setSaving(false);
    if (mErr) { setErr('Channel created, but adding members failed: ' + mErr.message); return; }
    onCreated(ch);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.5)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(520px, 92vw)', maxHeight: '88vh', overflow: 'auto', zIndex: 201, padding: 0, boxShadow: 'var(--shadow-3)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="eyebrow">Chat</div>
            <div className="display" style={{ fontSize: 24, marginTop: 2, lineHeight: 1.1 }}>New channel</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div className="stack" style={{ gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>Channel name</div>
              <input className="input" style={{ fontSize: 13 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Breakthrough Cohort" autoFocus />
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>Description <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)' }}>(optional)</span></div>
              <input className="input" style={{ fontSize: 13 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this channel for?" />
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>Add members {selected.size > 0 && <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--accent)' }}>· {selected.size} selected</span>}</div>
              <input className="input" style={{ fontSize: 13, marginBottom: 8 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…" />
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
                {loading
                  ? <div style={{ padding: 16, fontSize: 13, color: 'var(--text-3)' }}>Loading members…</div>
                  : candidates.length === 0
                    ? <div style={{ padding: 16, fontSize: 13, color: 'var(--text-3)' }}>No members found.</div>
                    : candidates.map((m) => {
                      const on = selected.has(m.id);
                      return (
                        <div key={m.id} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                          <div className={'check' + (on ? ' on' : '')}>{on && <Icon name="check" size={11} stroke={3} />}</div>
                          <Avatar initials={winInitials(m.full_name)} color={winColor(m.full_name)} size={28} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.full_name || 'Member'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.role === 'admin' ? 'Admin' : (m.membership_tier ? m.membership_tier.charAt(0).toUpperCase() + m.membership_tier.slice(1) : 'Member')}</div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
          {err && <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--coral)', lineHeight: 1.45 }}>{err}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={create} disabled={!name.trim() || saving}>{saving ? 'Creating…' : 'Create channel'}</button>
        </div>
      </div>
    </>
  );
}

function ChatScreen() {
  const [channels, setChannels] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [memberCount, setMemberCount] = React.useState(0);
  const [loadingChannels, setLoadingChannels] = React.useState(true);
  const [loadingMsgs, setLoadingMsgs] = React.useState(true);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [xpByUser, setXpByUser] = React.useState({});
  const scrollRef = React.useRef(null);

  // Member XP map (list_members is SECURITY DEFINER — profiles is otherwise own-row only).
  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await window._supabase.rpc('list_members');
      if (!active || !data) return;
      const map = {};
      data.forEach((m) => { map[m.id] = m.xp_total || 0; });
      setXpByUser(map);
    })();
    return () => { active = false; };
  }, []);

  const isAdmin = !!(window._currentMember && window._currentMember.isAdmin);
  const selected = channels.find((c) => c.id === selectedId) || null;

  // Load channels the user can see (RLS filters to default + their channels).
  const loadChannels = React.useCallback(async (preferId) => {
    const { data } = await window._supabase.from('channels')
      .select('id, name, description, is_default, created_by')
      .order('is_default', { ascending: false }).order('created_at', { ascending: true });
    const list = data || [];
    setChannels(list);
    setLoadingChannels(false);
    setSelectedId((cur) => preferId || cur || (list[0] && list[0].id) || null);
    return list;
  }, []);

  React.useEffect(() => { loadChannels(); }, [loadChannels]);

  // Load messages + member count for the selected channel, then poll for new ones.
  React.useEffect(() => {
    if (!selectedId || !selected) return;
    let active = true;
    setLoadingMsgs(true);

    const loadMsgs = async () => {
      const { data } = await window._supabase.from('messages')
        .select('id, user_id, body, author_name, author_role, created_at')
        .eq('channel_id', selectedId).order('created_at', { ascending: true });
      if (!active) return;
      setMessages((data || []).map(mapMsgRow));
      setLoadingMsgs(false);
    };

    const loadCount = async () => {
      if (selected.is_default) {
        const { data } = await window._supabase.rpc('member_count');
        if (active) setMemberCount(data || 0);
      } else {
        const { count } = await window._supabase.from('channel_members')
          .select('id', { count: 'exact', head: true }).eq('channel_id', selectedId);
        if (active) setMemberCount(count || 0);
      }
    };

    loadMsgs();
    loadCount();
    const poll = setInterval(loadMsgs, 6000);
    return () => { active = false; clearInterval(poll); };
  }, [selectedId, selected && selected.is_default]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !selectedId) return;
    setSending(true);
    const { data: { user } } = await window._supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const m = window._currentMember;
    const author_name = m ? `${m.firstName} ${m.lastName}`.trim() : 'Member';
    const author_role = m?.isAdmin ? 'Founder, MEGA' : (m?.plan ? `${m.plan} · member` : 'Member');
    const { data, error } = await window._supabase.from('messages')
      .insert({ channel_id: selectedId, user_id: user.id, body, author_name, author_role })
      .select().single();
    setSending(false);
    if (error) { console.error('Failed to send message:', error.message); return; }
    setMessages((p) => [...p, mapMsgRow(data)]);
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
            Channels and direct discussion for the MEGA Mentorship community.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 640 }}>
        {/* Sidebar — channel list */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '16px 12px', background: 'var(--bg-sunken)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="row-between" style={{ padding: '4px 8px 10px' }}>
            <div className="eyebrow" style={{ margin: 0 }}>Channels</div>
            {isAdmin && (
              <button onClick={() => setCreating(true)} title="New channel"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600 }}>
                <Icon name="plus" size={13} /> New
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {loadingChannels
              ? <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
              : channels.map((c) => (
                <button key={c.id} className={'sb-item' + (c.id === selectedId ? ' active' : '')} onClick={() => setSelectedId(c.id)} style={{ padding: '8px 10px', width: '100%' }}>
                  <Avatar initials={c.is_default ? 'MG' : channelInitials(c.name)} color={c.is_default ? '#0F52BA' : winColor(c.name)} size={28} />
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {c.is_default ? 'Everyone' : 'Channel'}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Main pane */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {loadingChannels ? 'Loading channels…' : 'Select a channel to start chatting.'}
            </div>
          ) : (
            <>
              <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <Avatar initials={selected.is_default ? 'MG' : channelInitials(selected.name)} color={selected.is_default ? '#0F52BA' : winColor(selected.name)} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}># {selected.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {memberLabel}{selected.description ? ` · ${selected.description}` : ''}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', background: 'var(--bg)', minHeight: 0 }}>
                {loadingMsgs
                  ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading messages…</div>
                  : messages.length === 0
                    ? <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                          <Icon name="chat" size={26} />
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>Start the conversation</div>
                          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, maxWidth: 440, lineHeight: 1.6 }}>
                            Be the first to post in <strong>{selected.name}</strong> — share an update, ask a question, or cheer someone on.
                          </div>
                        </div>
                      </div>
                    : <div className="stack" style={{ gap: 16 }}>
                        {messages.map((p) => (
                          <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <Avatar initials={p.initials} color={p.color} size={34} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.author}</span>
                                {xpByUser[p.userId] != null &&
                                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.02em' }}>· {xpByUser[p.userId].toLocaleString()}</span>}
                                {p.isAdmin &&
                                  <span style={{ fontFamily: 'var(--ff-sub)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>MEGA</span>}
                                {p.role && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.role}</span>}
                                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{p.time}</span>
                              </div>
                              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.body}</div>
                            </div>
                          </div>
                        ))}
                      </div>}
              </div>

              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={`Message ${selected.name}…`}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, padding: '6px 0', color: 'var(--text)' }} />
                  <button className="btn primary sm" disabled={!text.trim() || sending} onClick={send} style={{ opacity: !text.trim() || sending ? 0.5 : 1 }}>
                    <Icon name="send" size={12} /> {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {creating && <NewChannelModal onClose={() => setCreating(false)} onCreated={(ch) => { setCreating(false); loadChannels(ch.id); }} />}
    </>
  );
}

Object.assign(window, { ChatScreen });
