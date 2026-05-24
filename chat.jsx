// chat.jsx — Single MEGA Mentorship community channel

function ChatScreen() {
  const [memberCount, setMemberCount] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    window._supabase.rpc('member_count').then(({ data }) => {if (active) setMemberCount(data || 0);});
    return () => {active = false;};
  }, []);

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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px', gap: 14, background: 'var(--bg)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <Icon name="chat" size={26} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Welcome to the MEGA Mentorship channel</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, maxWidth: 440, lineHeight: 1.6 }}>
                This is the home for community announcements and discussion. Messaging will open up here soon.
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', opacity: 0.6 }}>
              <input disabled placeholder="Messaging coming soon…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, padding: '6px 0', color: 'var(--text-3)' }} />
              <button className="btn primary sm" disabled style={{ opacity: 0.5 }}><Icon name="send" size={12} /> Send</button>
            </div>
          </div>
        </div>
      </div>
    </>);

}

Object.assign(window, { ChatScreen });
