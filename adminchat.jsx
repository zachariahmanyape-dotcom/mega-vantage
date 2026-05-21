// adminchat.jsx — Admin Chat: all channels + DMs with member filter

// ─── Admin DM compose overlay (with audience filters) ────────────────────────
function AdminDMOverlay({ existingDMs, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ product: 'all', tier: 'all', status: 'all' });
  const inputRef = React.useRef(null);

  React.useEffect(() => {setTimeout(() => inputRef.current?.focus(), 50);}, []);

  // Build combined list: all members + self (Zachariah) is excluded (admin is composing)
  const everyone = ALL_PEOPLE.filter((p) => !p.isAdmin);

  const applyFilter = (p) => {
    const member = ADMIN_MEMBERS.find((m) => m.initials === p.initials);
    if (!member) return true; // keep if not in admin table (e.g. founders)
    if (filters.product !== 'all' && !member.plan.toLowerCase().includes(filters.product)) return false;
    if (filters.tier !== 'all' && !member.plan.toLowerCase().includes(filters.tier)) return false;
    if (filters.status !== 'all' && member.status.toLowerCase() !== filters.status.toLowerCase()) return false;
    return true;
  };

  const filtered = everyone.filter((p) =>
  applyFilter(p) && (
  q === '' || p.name.toLowerCase().includes(q.toLowerCase()) || p.role.toLowerCase().includes(q.toLowerCase()))
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== 'all').length;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div className="card" style={{
        position: 'absolute', top: 52, left: 12, right: 12, zIndex: 51,
        padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-3)'
      }}>
        {/* Search bar */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)' }} />
          
          <button onClick={() => setFiltersOpen((f) => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
            border: '1px solid ' + (activeFilterCount > 0 ? 'var(--accent)' : 'var(--border)'),
            background: activeFilterCount > 0 ? 'var(--accent-soft)' : 'var(--bg-sunken)',
            color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-2)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0
          }}>
            <Icon name="settings" size={12} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <button onClick={onClose} style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Collapsible filters */}
        {filtersOpen &&
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
          { key: 'product', label: 'Product', opts: ['all', 'mentorship', 'management'] },
          { key: 'tier', label: 'Plan / Tier', opts: ['all', 'foundations', 'breakthrough', 'essentials', 'advanced'] },
          { key: 'status', label: 'Status', opts: ['all', 'active', 'idle', 'at risk'] }].
          map((f) =>
          <div key={f.key}>
                <div className="eyebrow" style={{ fontSize: 9, marginBottom: 5 }}>{f.label}</div>
                <div className="seg" style={{ fontSize: 11 }}>
                  {f.opts.map((v) =>
              <button key={v} className={filters[f.key] === v ? 'on' : ''} style={{ fontSize: 11, padding: '5px 9px' }}
              onClick={() => setFilters((prev) => ({ ...prev, [f.key]: v }))}>
                      {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
              )}
                </div>
              </div>
          )}
            {activeFilterCount > 0 &&
          <button onClick={() => setFilters({ product: 'all', tier: 'all', status: 'all' })}
          style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, paddingBottom: 2 }}>
                Clear filters
              </button>
          }
          </div>
        }

        {/* Member list */}
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {filtered.length === 0 &&
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              No members match those filters.
            </div>
          }
          {filtered.map((p) => {
            const hasThread = !!existingDMs[p.id];
            const member = ADMIN_MEMBERS.find((m) => m.initials === p.initials);
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
                
                <div style={{ position: 'relative' }}>
                  <Avatar initials={p.initials} color={p.color} size={32} />
                  {member &&
                  <span style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 10, height: 10, borderRadius: 999,
                    background: member.status === 'Active' ? 'var(--teal-600)' : member.status === 'At risk' ? 'var(--coral)' : '#C88A1A',
                    border: '2px solid var(--bg-elev)'
                  }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {p.role}
                    {member && <span style={{ marginLeft: 6, color: member.streak > 0 ? 'var(--coral)' : 'var(--text-3)' }}>
                      · {member.streak > 0 ? `🔥 ${member.streak}d` : 'No streak'} · {member.points.toLocaleString()} pts
                    </span>}
                  </div>
                </div>
                {hasThread && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', flexShrink: 0 }}>existing thread</span>}
                <Icon name="arrow-right" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              </button>);

          })}
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
          {filtered.length} member{filtered.length !== 1 ? 's' : ''} shown
          {activeFilterCount > 0 && ` (filtered from ${everyone.length})`}
        </div>
      </div>
    </>);

}

// ─── Admin Chat Screen ─────────────────────────────────────────────────────────
function AdminChatScreen() {
  const [active, setActive] = useState('c1');
  const [dmThreads, setDmThreads] = useState({});
  const [dmList, setDmList] = useState([]);
  const [showCompose, setShowCompose] = useState(false);

  const allChannels = CHANNELS; // admin sees all channels
  const activeChannel = CHANNELS.find((c) => c.id === active);
  const activePerson = ALL_PEOPLE.find((p) => p.id === active);

  const dmUnread = (pid) => (dmThreads[pid] || []).filter((m) => m.from !== 'self' && !m.read).length;
  const totalUnread = dmList.reduce((a, pid) => a + dmUnread(pid), 0);

  const openDM = (person) => {
    setShowCompose(false);
    if (!dmThreads[person.id]) setDmThreads((t) => ({ ...t, [person.id]: [] }));
    if (!dmList.includes(person.id)) setDmList((l) => [person.id, ...l]);
    setActive(person.id);
  };

  const sendDM = (text) => {
    const pid = active;
    const msg = { id: 'adm' + Date.now(), from: 'self', text, time: 'just now', read: true };
    setDmThreads((t) => ({ ...t, [pid]: [...(t[pid] || []), msg] }));
    // Simulate reply
    setTimeout(() => {
      const replies = ['Thanks, noted.', 'Got it!', 'I\'ll take a look.', 'On it — thanks.', '👍'];
      const reply = { id: 'adm' + Date.now() + 1, from: pid, text: replies[Math.floor(Math.random() * replies.length)], time: 'just now', read: true };
      setDmThreads((t) => ({ ...t, [pid]: [...(t[pid] || []), reply] }));
    }, 1200);
  };

  // Admin persona for DMThread (Zachariah)
  const adminPerson = ALL_PEOPLE.find((p) => p.isAdmin) || { initials: 'ZR', avatarColor: '#FF6B6B', firstName: 'Zachariah' };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Chat</div>
          <h1 className="page-title">Channels & DMs</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 540 }}>
            Post to any channel or send direct messages to individual members.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '268px 1fr', minHeight: 640 }}>

        {/* Sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '16px 12px', background: 'var(--bg-sunken)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

          {/* Channels */}
          <div className="eyebrow" style={{ padding: '4px 8px 10px' }}>All channels</div>
          {allChannels.map((c) =>
          <button key={c.id} className={"sb-item" + (active === c.id ? " active" : "")}
          onClick={() => setActive(c.id)} style={{ padding: '8px 10px', width: '100%' }}>
              <Avatar initials={c.avatar} color={c.color} size={28} />
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {c.kind === 'global' ? 'Global · Mentorship' : 'Company · Management'} · {c.members}
                </div>
              </div>
              {c.unread > 0 && <span className="sb-badge">{c.unread}</span>}
            </button>
          )}

          {/* Direct Messages */}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div className="eyebrow" style={{ padding: '16px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                Direct messages
                {totalUnread > 0 && <span style={{ background: 'var(--coral)', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 999, marginLeft: 4, fontFamily: 'var(--ff-sub)', fontWeight: 700 }}>{totalUnread}</span>}
              </span>
              <button onClick={() => setShowCompose((s) => !s)} title="New direct message"
              style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}>
                <Icon name="plus" size={12} />
              </button>
            </div>

            {showCompose &&
            <AdminDMOverlay
              existingDMs={dmThreads}
              onSelect={openDM}
              onClose={() => setShowCompose(false)} />

            }
          </div>

          {dmList.length === 0 &&
          <div style={{ padding: '6px 12px 10px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
              No direct messages yet. Hit <strong>+</strong> to start one. Use filters to find members by plan or engagement status.
            </div>
          }

          {dmList.map((pid) => {
            const person = ALL_PEOPLE.find((p) => p.id === pid);
            if (!person) return null;
            const unread = dmUnread(pid);
            const lastMsg = (dmThreads[pid] || []).slice(-1)[0];
            const memberData = ADMIN_MEMBERS.find((m) => m.initials === person.initials);
            return (
              <button key={pid} className={"sb-item" + (active === pid ? " active" : "")}
              onClick={() => setActive(pid)} style={{ padding: '8px 10px', width: '100%' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar initials={person.initials} color={person.color} size={28} />
                  {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 999, background: 'var(--coral)', border: '2px solid var(--bg-sunken)' }} />}
                </div>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
                  {lastMsg ?
                  <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                        {lastMsg.from === 'self' ? 'You: ' : ''}{lastMsg.text.slice(0, 32)}{lastMsg.text.length > 32 ? '…' : ''}
                      </div> :
                  memberData && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{memberData.plan.split(' · ')[1] || memberData.plan}</div>
                  }
                </div>
                {unread > 0 && <span className="sb-badge">{unread}</span>}
              </button>);

          })}
        </div>

        {/* Main pane */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {activeChannel && <ChannelPane channel={activeChannel} isAdmin />}
          {activePerson &&
          <DMThread
            person={activePerson}
            messages={dmThreads[activePerson.id] || []}
            onSend={sendDM}
            selfInitials="ZR"
            selfColor="#FF6B6B"
            selfName="Zachariah" />

          }
        </div>
      </div>
    </>);

}

Object.assign(window, { AdminChatScreen });