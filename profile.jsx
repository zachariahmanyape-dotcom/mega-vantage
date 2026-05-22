// profile.jsx — with milestone timeline

function BadgeTile({ badge }) {
  return (
    <div style={{ padding:'16px 14px', borderRadius:14, border:'1px solid var(--border)', background:badge.earned?'var(--bg-elev)':'var(--bg-sunken)', opacity:badge.earned?1:0.55, textAlign:'center' }}>
      <div style={{ width:52, height:52, margin:'0 auto 10px', borderRadius:14, background:badge.earned?'linear-gradient(135deg, var(--accent), var(--coral))':'var(--border-strong)', display:'grid', placeItems:'center', color:'#fff' }}>
        <Icon name={badge.earned?'star':'trophy'} size={22} />
      </div>
      <div style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>{badge.name}</div>
      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4, lineHeight:1.4 }}>{badge.desc}</div>
    </div>
  );
}

function ProfileScreen({ member, theme, setTheme, onSignOut }) {
  const earned = BADGES.filter(b=>b.earned).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Profile</div>
          <h1 className="page-title">{member.firstName} {member.lastName}</h1>
        </div>
        <button className="btn"><Icon name="edit" size={13} /> Edit profile</button>
      </div>

      {/* Identity card */}
      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'28px 28px 24px', display:'flex', gap:24, alignItems:'center' }}>
          <Avatar initials={member.initials} color={member.avatarColor} size={88} style={{ fontSize:32 }} />
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span className="chip sapphire"><span className="dot"/>{member.product}</span>
              <span className="chip teal"><span className="dot"/>{member.plan}</span>
              <span className="chip"><span className="dot" style={{ background:'var(--coral)' }}/>{member.level} · Tier {member.levelIndex+1}</span>
            </div>
            <div className="display" style={{ fontSize:36, marginTop:10, lineHeight:1 }}>{member.firstName} {member.lastName}</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:6 }}>{member.email} · Joined Feb 2026</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, textAlign:'right' }}>
            <div>
              <div className="display" style={{ fontSize:32, color:'var(--accent)' }}>{member.points.toLocaleString()}</div>
              <div className="eyebrow">Points</div>
            </div>
            <div>
              <div className="display" style={{ fontSize:32, color:'var(--coral)' }}>{member.streakDays}</div>
              <div className="eyebrow">Day streak</div>
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid var(--border)' }}>
          {[['Total learning','87h 12m'],['Sessions',`${member.stats.sessions} done`],['Modules',`${member.stats.modules} done`],['Longest streak','22 days']].map(([l,v],i) => (
            <div key={l} style={{ padding:'16px 20px', borderRight:i<3?'1px solid var(--border)':'none' }}>
              <div className="eyebrow" style={{ fontSize:10 }}>{l}</div>
              <div style={{ fontSize:17, fontWeight:700, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone timeline */}
      <div style={{ marginBottom:20 }}>
        <MilestoneTimeline />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20 }}>
        {/* Badge wall */}
        <div className="card" style={{ padding:22 }}>
          <div className="row-between">
            <div>
              <div className="eyebrow">Achievements</div>
              <div className="display" style={{ fontSize:22, marginTop:4 }}>Badge wall</div>
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>{earned} of {BADGES.length} earned</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:16 }}>
            {BADGES.map(b => <BadgeTile key={b.id} badge={b} />)}
          </div>
        </div>

        <div className="stack" style={{ gap:20 }}>
          {/* Personal info */}
          <div className="card" style={{ padding:22 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>Personal info</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 18px' }}>
              {[['Role',member.role],['Status',member.status],['Field',member.field],['Focus area',member.focus]].map(([l,v]) => (
                <div key={l}>
                  <div className="eyebrow" style={{ fontSize:10 }}>{l}</div>
                  <div style={{ fontSize:13, marginTop:3, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="hr" />
            <div className="eyebrow" style={{ marginBottom:8 }}>Interests</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {member.interests.map(i => <span key={i} className="chip">{i}</span>)}
            </div>
          </div>

          {/* Settings */}
          <div className="card" style={{ padding:22 }}>
            <div className="eyebrow" style={{ marginBottom:12 }}>Appearance</div>
            <div className="row-between" style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>Theme</div>
              <div className="seg">
                <button className={theme==='light'?'on':''} onClick={()=>setTheme('light')}>Light</button>
                <button className={theme==='dark'?'on':''} onClick={()=>setTheme('dark')}>Dark</button>
              </div>
            </div>
            <div className="hr" />
            <div className="eyebrow" style={{ marginBottom:10 }}>Notifications</div>
            {[['Task assignments','In-app',true],['Task assignments','Email',true],['Session reminders','In-app',true],['Session reminders','Email',false],['Weekly digest','Email (Mon)',true]].map(([l,ch,on],i) => (
              <div key={i} className="row-between" style={{ padding:'8px 0', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{l}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{ch}</div>
                </div>
                <div style={{ width:36, height:20, borderRadius:999, background:on?'var(--accent)':'var(--border-strong)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                  <div style={{ position:'absolute', top:2, left:on?18:2, width:16, height:16, borderRadius:999, background:'#fff', transition:'left .15s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ marginTop:28, paddingTop:24, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
        <button
          className="btn"
          onClick={onSignOut}
          style={{ color:'var(--coral)', borderColor:'var(--coral)', gap:8 }}
        >
          <Icon name="arrow-right" size={13} style={{ transform:'rotate(180deg)', color:'var(--coral)' }} />
          Sign out
        </button>
      </div>
    </>
  );
}

Object.assign(window, { ProfileScreen });
