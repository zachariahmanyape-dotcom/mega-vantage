// chat.jsx — Channels + Direct Messages with compose overlay

// ─── DM seed data ─────────────────────────────────────────────────────────────
const ALL_PEOPLE = [
{ id: 'p-ramy', name: 'Zachariah Rampa', initials: 'ZR', color: '#0F52BA', role: 'Mentor · MEGA Founder', isAdmin: true },
{ id: 'p-noura', name: 'Noura Al-Mansouri', initials: 'NA', color: '#4FB7A6', role: 'Breakthrough · member' },
{ id: 'p-omar', name: 'Omar Farouk', initials: 'OF', color: '#E8B24C', role: 'Foundations · member' },
{ id: 'p-yasmine', name: 'Yasmine Bakr', initials: 'YB', color: '#B79BED', role: 'Management · Advanced' },
{ id: 'p-khalid', name: 'Khalid Hassan', initials: 'KH', color: '#FF6B6B', role: 'Breakthrough · member' },
{ id: 'p-fatima', name: 'Fatima Al-Riyami', initials: 'FA', color: '#5BC0DE', role: 'Management · Essentials' },
{ id: 'p-tariq', name: 'Tariq Saleh', initials: 'TS', color: '#8B8FA3', role: 'Foundations · member' },
{ id: 'p-lina', name: 'Lina Haddad', initials: 'LH', color: '#D76C82', role: 'Management · Advanced' }];


const SEED_DMS = {
  'p-ramy': [
  { id: 'dm1', from: 'p-ramy', text: 'Hey Amira — just confirmed your next 1:1 for Apr 22. Anything specific you want to cover?', time: 'Yesterday · 6:10 PM', read: true },
  { id: 'dm2', from: 'self', text: 'Yes — I want to go over the positioning draft and the CV rewrite progress.', time: 'Yesterday · 6:14 PM', read: true },
  { id: 'dm3', from: 'p-ramy', text: 'Perfect. Drop a draft in the thread before we start and I\'ll have notes ready.', time: 'Yesterday · 6:16 PM', read: false }],

  'p-noura': [
  { id: 'dm4', from: 'p-noura', text: 'Did you catch Ramy\'s message about the CV teardown at the May Town Hall?', time: 'Today · 10:22 AM', read: true },
  { id: 'dm5', from: 'self', text: 'Yes! Definitely sending mine in. You?', time: 'Today · 10:25 AM', read: true },
  { id: 'dm6', from: 'p-noura', text: 'Already done. Anonymised version submitted.', time: 'Today · 10:27 AM', read: false }]

};

// ─── New DM Compose Overlay ───────────────────────────────────────────────────
function NewDMOverlay({ existingDMs, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = ALL_PEOPLE.filter((p) =>
  p.name.toLowerCase().includes(q.toLowerCase()) ||
  p.role.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div className="card" style={{
        position: 'absolute', top: 52, left: 12, right: 12, zIndex: 51,
        padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-3)'
      }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)' }} />
          
          <button onClick={onClose} style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ maxHeight: 280, overflow: 'auto' }}>
          {filtered.length === 0 &&
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>No people found.</div>
          }
          {filtered.map((p) => {
            const hasThread = !!existingDMs[p.id];
            return (
              <button key={p.id} onClick={() => onSelect(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                width: '100%', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-elev)', cursor: 'pointer', textAlign: 'left',
                transition: 'background .1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-sunken)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elev)'}>
                
                <Avatar initials={p.initials} color={p.color} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.name}
                    {p.isAdmin && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff-sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>MEGA</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{p.role}</div>
                </div>
                {hasThread && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>existing thread</span>}
                <Icon name="arrow-right" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              </button>);

          })}
        </div>
      </div>
    </>);

}

// ─── DM Thread Pane ───────────────────────────────────────────────────────────
function DMThread({ person, messages, onSend, selfInitials, selfColor, selfName }) {
  const sInit = selfInitials || MEMBER.initials;
  const sColor = selfColor || MEMBER.avatarColor;
  const sName = selfName || 'You';
  const [draft, setDraft] = useState('');
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Avatar initials={person.initials} color={person.color} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {person.name}
            {person.isAdmin && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff-sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>MEGA</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{person.role} · Direct message</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {messages.length === 0 &&
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', textAlign: 'center', gap: 12 }}>
            <Avatar initials={person.initials} color={person.color} size={52} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{person.name}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>This is the beginning of your direct message history.</div>
            </div>
          </div>
        }
        {messages.map((m, i) => {
          const isSelf = m.from === 'self';
          const prev = messages[i - 1];
          const stacked = prev && prev.from === m.from;
          return (
            <div key={m.id} style={{ display: 'flex', gap: 10, marginTop: stacked ? 3 : 16,
              flexDirection: isSelf ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {!stacked && !isSelf && <Avatar initials={person.initials} color={person.color} size={30} />}
              {!stacked && isSelf && <Avatar initials={sInit} color={sColor} size={30} />}
              {stacked && <div style={{ width: 30, flexShrink: 0 }} />}
              <div style={{ maxWidth: '68%' }}>
                {!stacked &&
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3,
                  textAlign: isSelf ? 'right' : 'left' }}>
                    {isSelf ? sName : person.name} · {m.time}
                  </div>
                }
                <div style={{
                  padding: '9px 13px', borderRadius: 14,
                  borderBottomRightRadius: isSelf ? 4 : 14,
                  borderBottomLeftRadius: isSelf ? 14 : 4,
                  background: isSelf ? 'var(--accent)' : 'var(--bg-elev)',
                  color: isSelf ? '#fff' : 'var(--text)',
                  border: isSelf ? 'none' : '1px solid var(--border)',
                  fontSize: 13, lineHeight: 1.55
                }}>{m.text}</div>
              </div>
            </div>);

        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
          <Avatar initials={sInit} color={sColor} size={24} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message ${person.name}…`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, padding: '4px 0' }} />
          
          <button className="btn primary sm" disabled={!draft.trim()} style={{ opacity: draft.trim() ? 1 : 0.4 }} onClick={handleSend}>
            <Icon name="send" size={12} /> Send
          </button>
        </div>
      </div>
    </div>);

}

// ─── Channel Message Pane ─────────────────────────────────────────────────────
function ChannelPane({ channel }) {
  const [draft, setDraft] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Avatar initials={channel.avatar} color={channel.color} size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}># {channel.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{channel.members} members · Announcements and discussion</div>
        </div>
        <button className="btn ghost sm"><Icon name="pin" size={13} /> Pinned</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {CHAT_MESSAGES.map((m, i) => {
          const isSelf = m.isSelf;
          const prev = CHAT_MESSAGES[i - 1];
          const stacked = prev && prev.author === m.author && !m.pinned;
          return (
            <div key={m.id} style={{ display: 'flex', gap: 10, marginTop: stacked ? 3 : 16,
              flexDirection: isSelf ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {!stacked && !isSelf && <Avatar initials={m.initials} color={m.color} size={30} />}
              {!stacked && isSelf && <Avatar initials={MEMBER.initials} color={MEMBER.avatarColor} size={30} />}
              {stacked && <div style={{ width: 30, flexShrink: 0 }} />}
              <div style={{ maxWidth: '68%' }}>
                {!stacked &&
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3,
                    textAlign: isSelf ? 'right' : 'left', display: 'flex', alignItems: 'center',
                    gap: 6, flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                    <span style={{ fontWeight: 600 }}>{m.author}</span>
                    <span className="chip" style={{ fontSize: 9, padding: '1px 5px' }}>{m.role}</span>
                    <span>· {m.time}</span>
                    {m.pinned && <span className="chip coral" style={{ fontSize: 9, padding: '1px 5px' }}><Icon name="pin" size={9} /> Pinned</span>}
                  </div>
                }
                <div style={{
                  padding: '9px 13px', borderRadius: 14,
                  borderBottomRightRadius: isSelf ? 4 : 14,
                  borderBottomLeftRadius: isSelf ? 14 : 4,
                  background: isSelf ? 'var(--accent)' : 'var(--bg-elev)',
                  color: isSelf ? '#fff' : 'var(--text)',
                  border: isSelf ? 'none' : '1px solid var(--border)',
                  fontSize: 13, lineHeight: 1.55
                }}>{m.text}</div>
              </div>
            </div>);
        })}
      </div>
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
          <Avatar initials={MEMBER.initials} color={MEMBER.avatarColor} size={26} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder={'Message #' + channel.name}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, padding: '6px 0' }} />
          <button className="btn primary sm" disabled={!draft} style={{ opacity: draft ? 1 : 0.4 }} onClick={() => setDraft('')}>
            <Icon name="send" size={12} /> Send
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, paddingLeft: 2 }}>
          Messages in the global channel are visible to all 214 MEGA Mentorship members.
        </div>
      </div>
    </div>);

}

// ─── Main ChatScreen ──────────────────────────────────────────────────────────
function ChatScreen() {
  const [active, setActive] = useState('c1'); // channel id OR person id
  const [dmThreads, setDmThreads] = useState(SEED_DMS); // { personId: [messages] }
  const [dmList, setDmList] = useState(['p-ramy', 'p-noura']); // ordered list of open DMs
  const [showCompose, setShowCompose] = useState(false);

  const visibleChannels = CHANNELS.filter((c) => c.kind === 'global');
  const mgmtChannels = CHANNELS.filter((c) => c.kind === 'company');
  const activeChannel = CHANNELS.find((c) => c.id === active);
  const activePerson = ALL_PEOPLE.find((p) => p.id === active);

  // Count unread DMs
  const unreadDMs = dmList.reduce((a, pid) => {
    const msgs = dmThreads[pid] || [];
    return a + msgs.filter((m) => m.from !== 'self' && !m.read).length;
  }, 0);

  const openDM = (person) => {
    setShowCompose(false);
    // Mark existing messages as read
    if (dmThreads[person.id]) {
      setDmThreads((t) => ({
        ...t,
        [person.id]: t[person.id].map((m) => ({ ...m, read: true }))
      }));
    } else {
      setDmThreads((t) => ({ ...t, [person.id]: [] }));
    }
    if (!dmList.includes(person.id)) {
      setDmList((l) => [person.id, ...l]);
    }
    setActive(person.id);
  };

  const sendDM = (text) => {
    const pid = active;
    const msg = {
      id: 'dm' + Date.now(),
      from: 'self',
      text,
      time: 'just now',
      read: true
    };
    setDmThreads((t) => ({ ...t, [pid]: [...(t[pid] || []), msg] }));
    // Simulate a reply after 1.2s
    setTimeout(() => {
      const person = ALL_PEOPLE.find((p) => p.id === pid);
      const replies = [
      'Got it, thanks!',
      'Makes sense — I\'ll take a look.',
      'Good point. Let\'s discuss in the next session.',
      '👍',
      'On it.'];

      const reply = {
        id: 'dm' + Date.now() + 1,
        from: pid,
        text: replies[Math.floor(Math.random() * replies.length)],
        time: 'just now',
        read: true
      };
      setDmThreads((t) => ({ ...t, [pid]: [...(t[pid] || []), reply] }));
    }, 1200);
  };

  const dmUnread = (pid) => (dmThreads[pid] || []).filter((m) => m.from !== 'self' && !m.read).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Chat</div>
          <h1 className="page-title">Channels & DMs</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 540 }}>
            Announcements, group channels, and private direct messages — all in one place.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 640 }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '16px 12px', background: 'var(--bg-sunken)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* Channels */}
          <div className="eyebrow" style={{ padding: '4px 8px 10px' }}>Channels</div>
          {visibleChannels.map((c) =>
          <button key={c.id} className={"sb-item" + (active === c.id ? " active" : "")}
          onClick={() => setActive(c.id)} style={{ padding: '8px 10px', width: '100%' }}>
              <Avatar initials={c.avatar} color={c.color} size={28} />
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Global · {c.members} members
                </div>
              </div>
              {c.unread > 0 && <span className="sb-badge">{c.unread}</span>}
            </button>
          )}

          {/* Company channels */}
          <div className="eyebrow" style={{ padding: '16px 8px 8px' }}>Company channels</div>
          {mgmtChannels.map((c) =>
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', opacity: 0.5 }}>
              <Avatar initials={c.avatar} color={c.color} size={22} />
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.name}</div>
              <Icon name="link" size={11} style={{ color: 'var(--text-3)', marginLeft: 'auto' }} />
            </div>
          )}

          {/* Direct Messages */}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div className="eyebrow" style={{ padding: '16px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Direct messages {unreadDMs > 0 && <span style={{ background: 'var(--coral)', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 999, marginLeft: 4, fontFamily: 'var(--ff-sub)', fontWeight: 700 }}>{unreadDMs}</span>}</span>
              <button onClick={() => setShowCompose((s) => !s)} title="New direct message"
              style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}>
                <Icon name="plus" size={12} />
              </button>
            </div>

            {showCompose &&
            <NewDMOverlay
              existingDMs={dmThreads}
              onSelect={openDM}
              onClose={() => setShowCompose(false)} />

            }
          </div>

          {dmList.length === 0 &&
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
              No direct messages yet. Hit <strong>+</strong> to start one.
            </div>
          }
          {dmList.map((pid) => {
            const person = ALL_PEOPLE.find((p) => p.id === pid);
            if (!person) return null;
            const unread = dmUnread(pid);
            const lastMsg = (dmThreads[pid] || []).slice(-1)[0];
            return (
              <button key={pid} className={"sb-item" + (active === pid ? " active" : "")}
              onClick={() => openDM(person)} style={{ padding: '8px 10px', width: '100%' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar initials={person.initials} color={person.color} size={28} />
                  {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: 'var(--coral)', border: '2px solid var(--bg-sunken)' }} />}
                </div>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
                  {lastMsg && <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                    {lastMsg.from === 'self' ? 'You: ' : ''}{lastMsg.text.slice(0, 32)}{lastMsg.text.length > 32 ? '…' : ''}
                  </div>}
                </div>
                {unread > 0 && <span className="sb-badge">{unread}</span>}
              </button>);

          })}
        </div>

        {/* Main pane */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {activeChannel && <ChannelPane channel={activeChannel} />}
          {activePerson &&
          <DMThread
            person={activePerson}
            messages={dmThreads[activePerson.id] || []}
            onSend={sendDM} />

          }
        </div>
      </div>
    </>);

}

Object.assign(window, { ChatScreen });