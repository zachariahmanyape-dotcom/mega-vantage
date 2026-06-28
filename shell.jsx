// Shell — Sidebar, Topbar, wrappers

const { useState, useEffect, useMemo, useRef } = React;

function Avatar({ initials, color, size=32, style }) {
  const s = { width: size, height: size, fontSize: Math.max(10, size*0.38), background: color || '#0F52BA', ...style };
  return <div className="avatar" style={s}>{initials}</div>;
}

function Sidebar({ route, setRoute, admin, isRealAdmin, unread, member, onOpenProfile }) {
  // Chat is gated to MEGA Management members for now (not enough members to
  // justify a community feed for everyone else yet).
  const chatEnabled = member && member.membershipTier === 'management';
  const memberItems = [
    { k: "dashboard",       label: "Dashboard",         mat: "dashboard" },
    { k: "tasks",           label: "Tasks & Goals",     mat: "assignment_turned_in" },
    { k: "sessions",        label: "Sessions",          mat: "event" },
    { k: "roadmap",         label: "Roadmap",           mat: "timeline" },
    { k: "wins",            label: "Wins Board",        mat: "military_tech" },
    { k: "resources",       label: "Resources",         mat: "menu_book" },
    ...(chatEnabled ? [{ k: "chat", label: "Chat", mat: "chat", badge: unread }] : []),
    { k: "profile",         label: "Profile",           mat: "person" },
  ];

  const careerItems = [
    { k: "corporate-radar", label: "Corporate Radar",   mat: "radar" },
  ];

  const adminItems = [
    { k: "admin-overview",  label: "Overview",          mat: "dashboard" },
    { k: "admin-members",   label: "Members",           mat: "group" },
    { k: "admin-tasks",     label: "Tasks & Goals",     mat: "assignment_turned_in" },
    { k: "admin-sessions",  label: "Sessions",          mat: "event" },
    { k: "admin-resources", label: "Resources",         mat: "menu_book" },
    { k: "admin-messaging", label: "Chat",              mat: "chat" },
    { k: "admin-roadmap",   label: "Roadmap Builder",   mat: "timeline" },
    { k: "admin-analytics", label: "Analytics",         mat: "bar_chart" },
  ];

  const navItems = admin ? adminItems : memberItems;

  const NavItem = ({ item }) => {
    const isActive = route === item.k;
    return (
      <button
        className={"sb-item" + (isActive ? " active" : "")}
        onClick={() => setRoute(item.k)}
      >
        <span className="material-symbols-outlined sb-mat-icon">{item.mat}</span>
        <span>{item.label}</span>
        {item.badge ? <span className="sb-badge">{item.badge}</span> : null}
      </button>
    );
  };

  return (
    <aside className={"sidebar" + (admin ? " admin" : "")}>
      {/* Brand wordmark */}
      <div className="sb-brand">
        <div className="sb-brand-name">Vantage</div>
        <div className="sb-brand-sub">{admin ? "Admin · MEGA" : "Built for momentum"}</div>
      </div>

      {/* Scrollable nav */}
      <nav className="sb-nav">
        {!admin && <div className="sb-section">Workspace</div>}
        {navItems.map(it => <NavItem key={it.k} item={it} />)}

        {!admin && (
          <>
            <div className="sb-divider" />
            <div className="sb-section">Career</div>
            {careerItems.map(it => <NavItem key={it.k} item={it} />)}
          </>
        )}
      </nav>

      {/* Footer: back-links + user card */}
      <div className="sb-footer">
        <div className="sb-divider" />

        {admin && (
          <button className="sb-item" onClick={() => setRoute("dashboard")}>
            <span className="material-symbols-outlined sb-mat-icon">logout</span>
            <span>Exit admin</span>
          </button>
        )}
        {isRealAdmin && !admin && (
          <button className="sb-item" onClick={() => setRoute("admin-overview")}>
            <span className="material-symbols-outlined sb-mat-icon">admin_panel_settings</span>
            <span>Admin view</span>
          </button>
        )}

        {!admin && (
          <button className="user-card" onClick={onOpenProfile} style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <Avatar initials={member.initials} color={member.avatarColor} size={36} />
            <div className="user-card-meta">
              <div className="user-name">{member.firstName} {member.lastName}</div>
              <div className="user-sub">
                <span>{member.product}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{member.plan}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="user-points">{(member.points / 1000).toFixed(1)}k</div>
              <div className="user-sub" style={{ fontSize: 10 }}>PTS</div>
            </div>
          </button>
        )}
        {admin && (
          <div className="user-card" style={{ cursor: 'default' }}>
            <Avatar initials="RE" color="#FF6B6B" size={36} />
            <div className="user-card-meta">
              <div className="user-name" style={{ color: '#fff' }}>Ramy El-Sayed</div>
              <div className="user-sub">Founder · MEGA</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Topbar({ theme, setTheme, onOpenTweaks, notifCount, onOpenNotifs, route, member, onOpenNav }) {
  const ROUTE_LABELS = {
    dashboard: 'Dashboard',
    tasks: 'Tasks & Goals',
    sessions: 'Sessions',
    roadmap: 'Roadmap',
    wins: 'Wins Board',
    resources: 'Resources',
    chat: 'Community Chat',
    profile: 'Profile',
    'corporate-radar': 'Corporate Radar',
    'admin-overview': 'Overview',
    'admin-members': 'Members',
    'admin-tasks': 'Tasks & Goals',
    'admin-sessions': 'Sessions',
    'admin-resources': 'Resources',
    'admin-messaging': 'Chat',
    'admin-roadmap': 'Roadmap Builder',
    'admin-analytics': 'Analytics',
    'admin-wins': 'Wins Board',
  };

  const isAdmin = route && route.startsWith('admin-');
  const sectionLabel = isAdmin ? 'Admin' : 'Workspace';
  const routeLabel = (route && ROUTE_LABELS[route]) || 'Dashboard';
  const planLabel = member && (member.plan || 'Foundations');
  // The top search pill only appears on Tasks & Goals — every other page either
  // has its own in-page search or doesn't need one.
  const showSearch = route === 'tasks' || route === 'admin-tasks';

  return (
    <header className="topbar">
      {/* Mobile-only hamburger — opens the off-canvas nav drawer (hidden on desktop via CSS) */}
      <button className="topbar-hamburger" onClick={onOpenNav} title="Menu" aria-label="Open navigation">
        <span className="material-symbols-outlined" style={{ fontSize: 22, lineHeight: 1 }}>menu</span>
      </button>

      {/* Left: pill search bar (Tasks & Goals only) or a breadcrumb label */}
      {showSearch ? (
        <div className="topbar-search">
          <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1, color: 'var(--text-3)', flexShrink: 0 }}>search</span>
          <input placeholder={`Search ${routeLabel.toLowerCase()}…`} readOnly style={{ pointerEvents: 'none' }} />
        </div>
      ) : (
        <div className="topbar-crumb">
          <span className="topbar-crumb-section">{sectionLabel}</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1, opacity: 0.5 }}>chevron_right</span>
          <span className="topbar-crumb-page">{routeLabel}</span>
        </div>
      )}

      {/* Right: actions */}
      <div className="topbar-actions">
        {planLabel && (
          <div className="topbar-tier-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>stars</span>
            <span>{planLabel.toUpperCase()}</span>
          </div>
        )}
        <button className="topbar-icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          <span className="material-symbols-outlined" style={{ fontSize: 20, lineHeight: 1 }}>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <button className="topbar-icon-btn" onClick={onOpenTweaks} title="Tweaks">
          <span className="material-symbols-outlined" style={{ fontSize: 20, lineHeight: 1 }}>tune</span>
        </button>
        <button className="topbar-icon-btn" onClick={onOpenNotifs} title="Notifications" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, lineHeight: 1 }}>notifications</span>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--coral)',
              border: '2px solid var(--bg)',
            }} />
          )}
        </button>
      </div>
    </header>
  );
}

// Notification drawer — driven by real upcoming sessions
function NotifPanel({ open, onClose, sessions, onGoToSettings }) {
  if (!open) return null;
  const items = (sessions || []).slice(0, 6);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:40 }} />
      <div className="card notif-panel" style={{
        position:'fixed', top:60, right:40, width:360, zIndex:45,
        padding:0, overflow:'hidden', boxShadow:'var(--shadow-3)'
      }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="sub" style={{ fontSize:13, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-3)' }}>Notifications</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>{items.length} upcoming</div>
        </div>
        {items.length === 0 ? (
          <div style={{ padding:'28px 18px', textAlign:'center', fontSize:13, color:'var(--text-3)' }}>You're all caught up — no upcoming sessions.</div>
        ) : (
          <div>
            {items.map((s,i) => {
              const d = new Date(s.date + 'T12:00');
              const isTH = s.type === 'Town Hall';
              return (
                <div key={s.id} style={{
                  padding:'12px 18px',
                  borderBottom:i===items.length-1 ? 'none' : '1px solid var(--border)',
                  display:'flex', gap:12, alignItems:'flex-start'
                }}>
                  <div style={{
                    width:28, height:28, flex:'0 0 28px', borderRadius:8,
                    display:'grid', placeItems:'center',
                    background: isTH ? 'var(--coral-100)' : 'var(--sapphire-100)',
                    color: isTH ? 'var(--coral)' : 'var(--sapphire)'
                  }}>
                    <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>event</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, lineHeight:1.45 }}>{s.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>
                      {d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}{window.fmtH ? ' · ' + window.fmtH(s.startH) : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button
          onClick={() => { onClose && onClose(); onGoToSettings && onGoToSettings(); }}
          style={{ width:'100%', padding:'10px 18px', textAlign:'center', fontSize:12, color:'var(--text-3)', background:'none', border:'none', borderTop:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit' }}>
          Manage notification preferences in <span style={{ color:'var(--accent)', fontWeight:600 }}>Profile → Settings</span>
        </button>
      </div>
    </>
  );
}

// Tweaks panel
function TweaksPanel({ open, onClose, theme, setTheme, accent, setAccent }) {
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

      <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, marginTop:4 }}>
        Accent overrides the primary action color site-wide.
      </div>
    </div>
  );
}

Object.assign(window, { Avatar, Sidebar, Topbar, NotifPanel, TweaksPanel });
