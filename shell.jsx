// Shell — Sidebar, Topbar, wrappers

const { useState, useEffect, useMemo, useRef } = React;

function Avatar({ initials, color, size=32, style }) {
  const s = { width: size, height: size, fontSize: Math.max(10, size*0.38), background: color || '#0F52BA', ...style };
  return <div className="avatar" style={s}>{initials}</div>;
}

function Sidebar({ route, setRoute, admin, isRealAdmin, unread, member, onOpenProfile }) {
  const items = admin ? [
    { k: "admin-overview", label: "Overview", icon: "dashboard" },
    { k: "admin-members",  label: "Members",  icon: "users" },
    { k: "admin-tasks",    label: "Tasks & Goals", icon: "tasks" },
    { k: "admin-sessions", label: "Sessions", icon: "sessions" },
    { k: "admin-resources",label: "Resources",icon: "resources" },
    { k: "admin-chat",     label: "Channels", icon: "chat" },
    { k: "admin-analytics",label: "Analytics",icon: "chart" },
  ] : [
    { k: "dashboard", label: "Dashboard", icon: "dashboard" },
    { k: "tasks",     label: "Tasks & Goals", icon: "tasks" },
    { k: "sessions",  label: "Sessions",  icon: "sessions" },
    { k: "resources", label: "Resources", icon: "resources" },
    { k: "chat",      label: "Chat",      icon: "chat", badge: unread },
    { k: "profile",   label: "Profile",   icon: "profile" },
  ];

  return (
    <aside className={"sidebar" + (admin ? " admin" : "")}>
      <div className="brand">
        <div className="brand-logo" style={admin ? { background: '#FF6B6B', color:'#fff' } : undefined}>V</div>
        <div>
          <div className="brand-mark">VANTAGE</div>
          <div className="brand-sub">{admin ? "Admin · MEGA" : "by MEGA"}</div>
        </div>
      </div>

      <div className="sb-section">{admin ? "Control" : "Workspace"}</div>
      {items.map(it => (
        <button key={it.k} className={"sb-item" + (route === it.k ? " active" : "")} onClick={() => setRoute(it.k)}>
          <span className="sb-icon"><Icon name={it.icon} size={18} /></span>
          <span>{it.label}</span>
          {it.badge ? <span className="sb-badge">{it.badge}</span> : null}
        </button>
      ))}

      <div className="sb-spacer" />
      <div className="sb-divider" />
      {admin && (
        <button className="sb-item" onClick={() => setRoute("dashboard")}>
          <span className="sb-icon"><Icon name="logout" size={18} /></span>
          <span>Back to member view</span>
        </button>
      )}
      {isRealAdmin && !admin && (
        <button className="sb-item" onClick={() => setRoute("admin-overview")}>
          <span className="sb-icon"><Icon name="admin" size={18} /></span>
          <span>Admin view</span>
        </button>
      )}

      {!admin && (
        <button className="user-card" onClick={onOpenProfile} style={{ cursor:'pointer', textAlign:'left' }}>
          <Avatar initials={member.initials} color={member.avatarColor} size={36} />
          <div className="user-card-meta">
            <div className="user-name">{member.firstName} {member.lastName}</div>
            <div className="user-sub">
              <span>{member.product}</span>
              <span style={{ opacity:0.5 }}>·</span>
              <span>{member.plan}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="user-points">{(member.points/1000).toFixed(1)}k</div>
            <div className="user-sub" style={{ letterSpacing:0.08, fontSize:10 }}>PTS</div>
          </div>
        </button>
      )}
      {admin && (
        <div className="user-card" style={{ cursor:'default' }}>
          <Avatar initials="RE" color="#FF6B6B" size={36} />
          <div className="user-card-meta">
            <div className="user-name" style={{ color: '#fff' }}>Ramy El-Sayed</div>
            <div className="user-sub">Founder · MEGA</div>
          </div>
        </div>
      )}
    </aside>
  );
}

function Topbar({ theme, setTheme, onOpenTweaks, notifCount, onOpenNotifs }) {
  return (
    <div className="topbar">
      <button className="icon-btn" title="Search"><Icon name="search" size={16} /></button>
      <button className="icon-btn" onClick={onOpenNotifs} title="Notifications" style={{ position:'relative' }}>
        <Icon name="bell" size={16} />
        {notifCount > 0 && (
          <span style={{
            position:'absolute', top:6, right:6,
            width:8, height:8, borderRadius:999,
            background:'var(--coral)', border:'2px solid var(--bg-elev)'
          }} />
        )}
      </button>
      <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
      </button>
      <button className="icon-btn" onClick={onOpenTweaks} title="Tweaks"><Icon name="settings" size={16} /></button>
    </div>
  );
}

// Notification drawer (simple popover)
function NotifPanel({ open, onClose }) {
  if (!open) return null;
  const notifs = [
    { t: "Session reminder: 1:1 with Ramy in 90 minutes", when: "just now", kind:"session" },
    { t: "New task assigned: Refactor CV — results-first formatting", when: "2h ago", kind:"task" },
    { t: "Session reminder: April Town Hall in 90 minutes", when: "Apr 30", kind:"session" },
    { t: "New task assigned: Prepare two questions for Ramy", when: "Yesterday", kind:"task" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:40 }} />
      <div className="card" style={{
        position:'fixed', top:60, right:40, width:360, zIndex:45,
        padding:0, overflow:'hidden', boxShadow:'var(--shadow-3)'
      }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="sub" style={{ fontSize:13, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-3)' }}>Notifications</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{notifs.length} new</div>
        </div>
        <div>
          {notifs.map((n,i) => (
            <div key={i} style={{
              padding:'12px 18px',
              borderBottom:i===notifs.length-1 ? 'none' : '1px solid var(--border)',
              display:'flex', gap:12, alignItems:'flex-start'
            }}>
              <div style={{
                width:28, height:28, flex:'0 0 28px', borderRadius:8,
                display:'grid', placeItems:'center',
                background: n.kind==='session' ? 'var(--sapphire-100)' : 'var(--coral-100)',
                color: n.kind==='session' ? 'var(--sapphire)' : 'var(--coral)'
              }}>
                <Icon name={n.kind==='session' ? 'sessions' : 'tasks'} size={14} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, lineHeight:1.45 }}>{n.t}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{n.when}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 18px', textAlign:'center', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-3)' }}>
          Manage notification preferences in <span style={{ color:'var(--accent)', fontWeight:600 }}>Profile → Settings</span>
        </div>
      </div>
    </>
  );
}

// Tweaks panel
function TweaksPanel({ open, onClose, theme, setTheme, accent, setAccent, gameMode, setGameMode }) {
  if (!open) return null;
  const accents = [
    { k: 'sapphire', hex: '#0F52BA', label: 'Sapphire' },
    { k: 'coral',    hex: '#FF6B6B', label: 'Coral' },
    { k: 'teal',     hex: '#3A9D8C', label: 'Teal' },
    { k: 'violet',   hex: '#7C5CD6', label: 'Violet' },
    { k: 'forest',   hex: '#2F7D4A', label: 'Forest' },
    { k: 'ink',      hex: '#0A0A0A', label: 'Ink' },
  ];
  return (
    <div className="tweaks-panel">
      <h4>
        Tweaks
        <button onClick={onClose} style={{ color:'var(--text-3)', fontSize:14 }}>✕</button>
      </h4>

      <div className="tweak-row">
        <label>Theme</label>
        <div className="seg">
          <button className={theme==='light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
          <button className={theme==='dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Dark</button>
        </div>
      </div>

      <div className="tweak-row">
        <label>Accent color</label>
        <div className="swatches">
          {accents.map(a => (
            <button key={a.k}
              className={"swatch" + (accent === a.k ? " active" : "")}
              style={{ background:a.hex }}
              title={a.label}
              onClick={() => setAccent(a.k)} />
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Gamification</label>
        <div className="seg">
          <button className={gameMode==='subtle' ? 'on' : ''} onClick={() => setGameMode('subtle')}>Subtle</button>
          <button className={gameMode==='balanced' ? 'on' : ''} onClick={() => setGameMode('balanced')}>Balanced</button>
          <button className={gameMode==='loud' ? 'on' : ''} onClick={() => setGameMode('loud')}>Loud</button>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, marginTop:4 }}>
        Accent overrides the primary action color site-wide. Gamification affects streak pops, level effects, and XP animations.
      </div>
    </div>
  );
}

Object.assign(window, { Avatar, Sidebar, Topbar, NotifPanel, TweaksPanel });
