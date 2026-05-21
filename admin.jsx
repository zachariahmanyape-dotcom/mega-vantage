// admin.jsx — Admin views (Overview, Members+ViewAs, Tasks, Sessions, Resources, Chat)
// AdminAnalytics is in analytics.jsx

function AdminOverview({ onPick }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Overview</div>
          <h1 className="page-title">Mission control</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>
            Members, tasks, sessions, resources, channels, analytics — in one view.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn"><Icon name="plus" size={13} /> New task</button>
          <button className="btn primary"><Icon name="plus" size={13} /> Schedule session</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
          ['Active members', '214', '+12 this month'],
          ['Avg. weekly engagement', '78%', '+4 pts'],
          ['Tasks assigned this week', '96', '67 complete'],
          ['Session attendance', '92%', 'Last 30 days'],
          ['At-risk members', '7', 'Needs outreach']].
          map(([l, v, s], i) =>
          <div key={l} style={{ padding: '22px 20px', borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div className="eyebrow" style={{ fontSize: 10 }}>{l}</div>
              <div className="display" style={{ fontSize: 36, marginTop: 4, color: i === 4 ? 'var(--coral)' : 'var(--text)' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row-between" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <div className="eyebrow" style={{ margin: 0 }}>Members · recent activity</div>
            <button className="btn ghost sm" onClick={() => onPick('admin-members')}>View all <Icon name="arrow-right" size={12} /></button>
          </div>
          <MembersTable compact onViewAs={() => {}} />
        </div>

        <div className="stack" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Engagement distribution</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end', height: 120 }}>
              {[14, 32, 58, 72, 38].map((v, i) =>
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="bar" style={{ width: '100%', height: 100, position: 'relative' }}>
                    <span style={{ height: v + '%', background: ['var(--coral)', '#E8B24C', 'var(--teal-600)', 'var(--accent)', 'var(--text)'][i] }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{LEVELS[i]}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Top performers · this month</div>
            <div className="stack" style={{ gap: 10 }}>
              {[...ADMIN_MEMBERS].sort((a, b) => b.points - a.points).slice(0, 4).map((m, i) =>
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="display" style={{ fontSize: 18, color: 'var(--text-3)', width: 18 }}>{i + 1}</div>
                  <Avatar initials={m.initials} color={m.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.plan}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{m.points.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>);

}

function MembersTable({ compact, onViewAs }) {
  const rows = compact ? ADMIN_MEMBERS.slice(0, 6) : ADMIN_MEMBERS;
  const statusColor = (s) => s === 'At risk' ? 'var(--coral)' : s === 'Idle' ? '#E8B24C' : s === 'Top performer' ? 'var(--accent)' : 'var(--teal-600)';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--bg-sunken)' }}>
          {['Member', 'Plan', 'Last active', 'Points', 'Streak', 'Status', ''].map((h) =>
          <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)' }}>{h}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((m) =>
        <tr key={m.name} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar initials={m.initials} color={m.color} size={28} />
                <span style={{ fontWeight: 600 }}>{m.name}</span>
              </div>
            </td>
            <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{m.plan}</td>
            <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{m.lastActive}</td>
            <td style={{ padding: '12px 16px', fontWeight: 700 }}>{m.points.toLocaleString()}</td>
            <td style={{ padding: '12px 16px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: m.streak > 0 ? 'var(--coral)' : 'var(--text-3)' }}>
                <Icon name="flame" size={12} />{m.streak}
              </span>
            </td>
            <td style={{ padding: '12px 16px' }}>
              <span className="chip" style={{ color: statusColor(m.status), borderColor: statusColor(m.status) + '55', background: statusColor(m.status) + '15' }}>
                <span className="dot" style={{ background: statusColor(m.status) }} />{m.status}
              </span>
            </td>
            <td style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn ghost sm" onClick={() => onViewAs && onViewAs(m)}>
                  View as <Icon name="arrow-right" size={11} />
                </button>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>);

}

function AdminMembers({ onViewAs }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Members</div>
          <h1 className="page-title">All members</h1>
          <div className="page-sub" style={{ marginTop: 6, color: 'var(--text-2)' }}>Click "View as" to enter read-only member view for any account.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', width: 260 }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: 34 }} placeholder="Search members…" />
          </div>
          <button className="btn primary"><Icon name="plus" size={13} /> Invite member</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MembersTable onViewAs={onViewAs} />
      </div>
    </>);

}

function AdminTasks() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Tasks & Goals</div>
          <h1 className="page-title">Assign the next move</h1>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Create task</div>
          <div className="stack" style={{ gap: 12 }}>
            <input className="input" placeholder="Task title" defaultValue="Present your week's win in Friday's sync" />
            <textarea className="input" rows={3} placeholder="Description" defaultValue="Two minutes, one slide. One win. One learning. Practice aloud before you record." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Due</div>
                <input className="input" type="date" defaultValue="2026-04-25" />
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Points</div>
                <input className="input" defaultValue="80" />
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Subject area</div>
              <select className="input">{Object.keys(SUBJECTS).map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Effort / Impact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="seg" style={{ width: '100%' }}>
                  <button>Low</button><button className="on">Med</button><button>High</button>
                </div>
                <div className="seg" style={{ width: '100%' }}>
                  <button>Low</button><button>Med</button><button className="on">High</button>
                </div>
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Assign to</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ADMIN_MEMBERS.slice(0, 4).map((m) =>
                <span key={m.name} className="chip sapphire" style={{ padding: '4px 10px 4px 4px' }}>
                    <Avatar initials={m.initials} color={m.color} size={18} style={{ fontSize: 9 }} />
                    {m.name}
                  </span>
                )}
                <span className="chip">+ add</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>Assign to 4 members</button>
              <button className="btn">Save draft</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Goals pipeline</div>
          <div className="stack" style={{ gap: 10 }}>
            {GOALS.map((g) =>
            <div key={g.id} style={{ padding: 14, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{g.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{g.taskIds.length} tasks linked · assigned to 12 members</div>
                <div className="progress" style={{ marginTop: 10, height: 3 }}><span style={{ width: '45%' }} /></div>
              </div>
            )}
            <button className="btn" style={{ justifyContent: 'center' }}><Icon name="plus" size={13} /> New goal</button>
          </div>
        </div>
      </div>
    </>);

}

function AdminSessions() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Sessions</div>
          <h1 className="page-title">Schedule</h1>
          <div className="page-sub" style={{ marginTop: 6, color: 'var(--text-2)' }}>
            Create 1:1s and town halls. Set recurring cadence and meeting links.
          </div>
        </div>
        <button className="btn primary"><Icon name="plus" size={13} /> New session</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        {/* Calendar */}
        <div className="card" style={{ padding: 24 }}>
          <Calendar isAdmin={true} />
        </div>

        {/* Create panel */}
        <div className="card" style={{ padding: 22, height: 'fit-content', position: 'sticky', top: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Create session</div>
          <div className="stack" style={{ gap: 12 }}>
            <div className="seg" style={{ width: '100%' }}>
              <button className="on">1:1</button>
              <button>Town Hall</button>
            </div>
            <input className="input" placeholder="Session title" defaultValue="1:1 with Noura — portfolio review" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input className="input" type="date" defaultValue="2026-04-29" />
              <input className="input" type="time" defaultValue="17:00" />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Recurrence</div>
              <select className="input" style={{ fontSize: 13 }}>
                <option>Does not repeat</option>
                <option>Daily</option>
                <option>Weekly (select days)</option>
                <option>Biweekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <input className="input" placeholder="Meeting link" defaultValue="https://zoom.us/j/vantage-noura" />
            <div className="row-between" style={{ padding: '6px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>90-min reminder</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>In-app and email</div>
              </div>
              <div style={{ width: 36, height: 20, borderRadius: 999, background: 'var(--accent)', position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, left: 18, width: 16, height: 16, borderRadius: 999, background: '#fff' }} />
              </div>
            </div>
            <button className="btn primary" style={{ justifyContent: 'center' }}>Schedule & notify</button>
          </div>
        </div>
      </div>
    </>);

}

function AdminResources() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Resources</div>
          <h1 className="page-title">Resource manager.</h1>
        </div>
        <button className="btn primary"><Icon name="plus" size={13} /> Upload resource</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunken)' }}>
              {['Title', 'Folder', 'Type', 'Access', 'Subject', 'Added', ''].map((h) =>
              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) =>
            <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.title}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{r.folder}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="chip"><Icon name={r.type === 'video' ? 'video' : r.type === 'doc' ? 'doc' : 'link'} size={11} /> {r.type}</span>
                </td>
                <td style={{ padding: '12px 16px' }}><span className="chip teal">{r.plan}</span></td>
                <td style={{ padding: '12px 16px' }}><SubjectTag subject={r.subject} /></td>
                <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{r.addedDays}d ago</td>
                <td style={{ padding: '12px 16px' }}>
                  <button className="btn ghost sm"><Icon name="link" size={11} /> Copy link</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>);

}

function AdminChat() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Channels</div>
          <h1 className="page-title">The MEGA Members
          </h1>
        </div>
        <button className="btn primary"><Icon name="plus" size={13} /> New company channel</button>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>All channels</div>
        <div className="stack" style={{ gap: 8 }}>
          {CHANNELS.map((c) => <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12 }}>
              <Avatar initials={c.avatar} color={c.color} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>#{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.kind === 'global' ? 'Global · all Mentorship members' : 'Company (Management)'} · {c.members} members</div>
              </div>
              <button className="btn ghost sm">Manage</button>
              <button className="btn sm">Post</button>
            </div>
          )}
        </div>
      </div>
    </>);

}

Object.assign(window, { AdminOverview, AdminMembers, AdminTasks, AdminSessions, AdminResources, AdminChat, MembersTable });