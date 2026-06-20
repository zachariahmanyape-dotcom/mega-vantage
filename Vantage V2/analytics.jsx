// analytics.jsx — Admin analytics (live data via admin_analytics_stats RPC)
// Metrics with no backing data in the schema (login frequency, composite scores,
// reschedule/no-show tracking, revenue/billing) render honest empty states.

function Sparkline({ data, color }) {
  const arr = (data && data.length) ? data : [0, 0];
  const max = Math.max(1, ...arr);
  const pts = arr.map((v, i) => `${i / Math.max(arr.length - 1, 1) * 76},${28 - v / max * 24}`).join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 76 28" fill="none">
      <polyline points={pts} stroke={color || 'var(--accent)'} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <circle cx={76} cy={28 - arr[arr.length - 1] / max * 24} r="2.5" fill={color || 'var(--accent)'} />
    </svg>);
}

const AN_COLORS = ['#0F52BA', '#4FB7A6', '#E8B24C', '#B79BED', '#FF6B6B', '#5BC0DE', '#D76C82', '#4CAF88'];
function anColor(name) {
  let h = 0; const s = name || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AN_COLORS[h % AN_COLORS.length];
}
function anInitials(n) { return (n || 'M').trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2); }
function anTier(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Foundations'; }
function anLastActive(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return 'Just now';
  const h = Math.floor(s / 3600); if (h < 24) return h + 'h ago';
  const days = Math.floor(h / 24); if (days === 1) return 'Yesterday';
  if (days < 30) return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function anDaysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function AnStat({ label, value, sub, color, loading }) {
  return (
    <div className="bento-card" style={{ padding: 20 }}>
      <div className="eyebrow">{label}</div>
      <div className="display" style={{ fontSize: 38, marginTop: 4, lineHeight: 1, color: color || 'var(--text)' }}>
        {loading ? '—' : value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>
    </div>);
}

function AnEmpty({ title, note }) {
  return (
    <div style={{ padding: '32px 22px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>{note}</div>
    </div>);
}

// ---------- At-Risk Banner (members with no activity for 7+ days) ----------
function AtRiskBanner({ members }) {
  const atRisk = (members || []).filter((m) => anDaysSince(m.last_active) >= 7);
  if (atRisk.length === 0) return null;
  return (
    <div className="risk-alert">
      <div style={{ width: 36, height: 36, flex: '0 0 36px', borderRadius: 10, background: 'var(--coral)', color: '#fff', display: 'grid', placeItems: 'center' }}>
        <span className="material-symbols-outlined" style={{fontSize:18,lineHeight:1}}>notifications</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, color: 'var(--coral)' }}>{atRisk.length} member{atRisk.length > 1 ? 's' : ''} at risk — no activity for 7+ days</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>These members need outreach before they disengage fully.</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {atRisk.map((m) =>
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elev)', borderRadius: 8, border: '1px solid var(--coral)', fontSize: 12 }}>
              <Avatar initials={anInitials(m.name)} color={anColor(m.name)} size={22} />
              <div>
                <span style={{ fontWeight: 600 }}>{m.name || 'Member'}</span>
                <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>{m.last_active ? Math.floor(anDaysSince(m.last_active)) + 'd inactive' : 'No activity yet'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>);
}

// ---------- Engagement Tab ----------
function EngagementTab({ stats, loading }) {
  const members = stats?.members || [];
  const sorted = [...members].sort((a, b) => (b.hours || 0) - (a.hours || 0));
  return (
    <div>
      <AtRiskBanner members={members} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        <AnStat loading={loading} label="Active members" value={stats?.active_members ?? 0} sub={`of ${stats?.total_members ?? 0} total`} />
        <AnStat loading={loading} label="Avg. focus time / week" value={`${stats?.avg_focus_hours_week ?? 0}h`} sub="Per active member (last 4 weeks)" color="var(--accent)" />
        <AnStat loading={loading} label="Task completion rate" value={`${stats?.completion_rate ?? 0}%`} sub="Across all members" color="var(--teal-600)" />
      </div>

      <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="eyebrow" style={{ margin: 0 }}>Member engagement health</div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Sorted by focus time</span>
        </div>
        {loading ? (
          <div style={{ padding: '28px 20px', fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
        ) : sorted.length === 0 ? (
          <AnEmpty title="No member activity yet" note="Engagement metrics will appear here as members complete tasks and log focus time." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-sunken)' }}>
                {['Member', 'Plan', 'Focus / wk', 'Streak', 'Tasks done', 'Last active'].map((h) =>
                <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)' }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) =>
              <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={anInitials(m.name)} color={anColor(m.name)} size={26} />
                      <span style={{ fontWeight: 600 }}>{m.name || 'Member'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-2)', fontSize: 12 }}>{anTier(m.tier)}</td>
                  <td style={{ padding: '10px 16px' }}>{(m.hours || 0)}h</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: m.streak > 0 ? 'var(--coral)' : 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1}}>local_fire_department</span>{m.streak || 0}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>{m.tasks_done || 0}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 12 }}>{anLastActive(m.last_active)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
          Login frequency and composite engagement scores aren't tracked yet — focus time and task activity stand in as the engagement signal.
        </div>
      </div>
    </div>);
}

// ---------- Tasks & Goals Tab ----------
function TasksGoalsTab({ stats, loading }) {
  const subjects = stats?.subject_completion || [];
  const volume = stats?.weekly_task_volume || [];
  const volMax = Math.max(1, ...volume.map((w) => w.count || 0));
  const goalsTotal = Math.max(1, stats?.goals_total ?? 0);
  const goalRows = [
    { label: 'In progress', v: stats?.goals_active ?? 0, color: 'var(--accent)' },
    { label: 'Stalled', v: stats?.goals_stalled ?? 0, color: 'var(--coral)' },
    { label: 'Completed', v: stats?.goals_completed ?? 0, color: 'var(--teal-600)' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <AnStat loading={loading} label="Completion rate" value={`${stats?.completion_rate ?? 0}%`} sub={`${stats?.done_tasks ?? 0} of ${stats?.total_tasks ?? 0} tasks`} color="var(--teal-600)" />
        <AnStat loading={loading} label="Avg. time to complete" value={`${stats?.avg_days_to_complete ?? 0}d`} sub="From created to done" color="var(--accent)" />
        <AnStat loading={loading} label="Goals in progress" value={stats?.goals_active ?? 0} sub="Across all members" />
        <AnStat loading={loading} label="Goals stalled" value={stats?.goals_stalled ?? 0} sub=">7 days no completion" color="var(--coral)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="bento-card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Subject area completion</div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
          ) : subjects.length === 0 ? (
            <AnEmpty title="No tagged tasks yet" note="Tag tasks with a subject to see completion rates broken down by area." />
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {subjects.map((s, i) =>
              <div key={s.s} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: i < 3 ? 600 : 500, color: i < 3 ? 'var(--text)' : 'var(--text-2)' }}>{s.s}</div>
                  <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: s.pct + '%', borderRadius: 999, background: s.pct >= 65 ? 'var(--teal-600)' : s.pct >= 45 ? 'var(--accent)' : 'var(--coral)', transition: 'width .4s ease' }} />
                  </div>
                  <div style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>{s.pct}% · {s.total}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="bento-card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Goals status breakdown</div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
            ) : (stats?.goals_total ?? 0) === 0 ? (
              <AnEmpty title="No goals yet" note="Goals set by members will be summarised here." />
            ) : (
              goalRows.map((g) =>
              <div key={g.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>{g.label}</span>
                    <span style={{ color: 'var(--text-3)' }}>{g.v} goal{g.v === 1 ? '' : 's'}</span>
                  </div>
                  <div className="progress" style={{ height: 5 }}>
                    <span style={{ width: g.v / goalsTotal * 100 + '%', background: g.color }} />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="bento-card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Task assignment volume</div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
            ) : volume.length === 0 ? (
              <AnEmpty title="No tasks created yet" note="Weekly task creation volume will appear here." />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${volume.length},1fr)`, gap: 8, height: 80, alignItems: 'end' }}>
                  {volume.map((w, i) =>
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div className="bar" style={{ width: '100%', height: 60 }}>
                        <span style={{ height: (w.count || 0) / volMax * 100 + '%', background: i === volume.length - 1 ? 'var(--accent)' : 'var(--border-strong)' }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{w.week}</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>{volume[volume.length - 1]?.count || 0} tasks created this week</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>);
}

// ---------- Sessions Tab ----------
function SessionMetricsTab({ stats, loading }) {
  const th = stats?.townhall_attendance ?? 0;
  const oto = stats?.onetoone_attendance ?? 0;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <AnStat loading={loading} label="1:1 attendances" value={oto} sub="Confirmed all-time" color="var(--accent)" />
        <AnStat loading={loading} label="Town hall attendances" value={th} sub="Confirmed all-time" color="var(--coral)" />
        <AnStat loading={loading} label="Reschedule requests" value="—" sub="Not tracked yet" />
        <AnStat loading={loading} label="No-show rate" value="—" sub="Not tracked yet" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="bento-card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Attendance by type</div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
          ) : (th + oto) === 0 ? (
            <AnEmpty title="No attendance logged yet" note="Confirmed 1:1 and town hall attendances will be summarised here." />
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {[{ label: '1:1 sessions', v: oto, color: 'var(--accent)' }, { label: 'Town halls', v: th, color: 'var(--coral)' }].map((r) =>
              <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>{r.label}</span>
                    <span style={{ color: 'var(--text-3)' }}>{r.v}</span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <span style={{ width: r.v / Math.max(1, th + oto) * 100 + '%', background: r.color }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bento-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnEmpty title="Reschedule & no-show analytics" note="These aren't tracked yet — sessions don't record reschedule requests or attendance no-shows. This will light up once that data is captured." />
        </div>
      </div>
    </div>);
}

// ---------- Revenue Tab (no billing data in the schema) ----------
function RevenueTab() {
  return (
    <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
      <AnEmpty
        title="Revenue & CLV tracking isn't connected"
        note="Vantage doesn't store billing, subscription, or fee data yet, so there's nothing to report here. Once payments/plans are wired to the backend, MRR, per-member revenue, and CLV will populate automatically." />
    </div>);
}

// ---------- Main AdminAnalytics ----------
function AdminAnalytics() {
  const [tab, setTab] = useState('engagement');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    window._supabase.rpc('admin_analytics_stats').then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Analytics stats failed:', error.message);
      setStats(error ? null : data);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-eyebrow">Admin · Analytics</div>
          <h1 className="page-title xl" style={{ margin: '6px 0 0', color: 'var(--text)' }}>The numbers</h1>
          <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.6, opacity: 0.8 }}>Engagement, tasks, and sessions across all members — pulled live from the platform.</div>
        </div>
      </div>

      <div className="analytics-tabs">
        <button className={tab === 'engagement' ? 'on' : ''} onClick={() => setTab('engagement')}>Engagement health</button>
        <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>Tasks & Goals</button>
        <button className={tab === 'sessions' ? 'on' : ''} onClick={() => setTab('sessions')}>Session metrics</button>
        <button className={tab === 'revenue' ? 'on' : ''} onClick={() => setTab('revenue')}>Revenue & CLV</button>
      </div>

      {tab === 'engagement' && <EngagementTab stats={stats} loading={loading} />}
      {tab === 'tasks' && <TasksGoalsTab stats={stats} loading={loading} />}
      {tab === 'sessions' && <SessionMetricsTab stats={stats} loading={loading} />}
      {tab === 'revenue' && <RevenueTab />}
    </>);
}

Object.assign(window, { AdminAnalytics });
