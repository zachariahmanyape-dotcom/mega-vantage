// analytics.jsx — Admin analytics with 4 tabs

const REVENUE_DATA = {
  totalMRR: 186500,
  monthly: [142000, 156000, 168000, 172000, 180000, 186500],
  byProduct: { mentorship: 78000, management: 108500 },
  tiers: [
  { name: 'Mentorship · Foundations', count: 48, fee: 2500, type: 'member' },
  { name: 'Mentorship · Breakthrough', count: 12, fee: 4500, type: 'member' },
  { name: 'Management · Essentials', count: 3, fee: 8000, type: 'company' },
  { name: 'Management · Advanced', count: 2, fee: 15000, type: 'company' }]

};

const ENGAGEMENT_DATA = ADMIN_MEMBERS.map((m, i) => ({
  ...m,
  avgLogins: [4.2, 3.8, 2.1, 4.5, 1.0, 3.2, 0.4, 4.8][i],
  avgHours: [6.4, 5.9, 3.2, 7.1, 1.8, 4.6, 0.9, 7.8][i],
  score: [84, 76, 52, 91, 23, 67, 9, 94][i],
  daysInactive: [0, 0, 0, 1, 3, 0, 9, 0][i]
}));

function scoreColor(s) {return s >= 70 ? 'green' : s >= 40 ? 'amber' : 'red';}
function scoreLabel(s) {return s >= 70 ? 'Healthy' : s >= 40 ? 'Moderate' : 'At risk';}

function Sparkline({ data, color }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${i / (data.length - 1) * 76},${28 - v / max * 24}`).join(' ');
  return (
    <svg className="sparkline" viewBox="0 0 76 28" fill="none">
      <polyline points={pts} stroke={color || 'var(--accent)'} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <circle cx={76} cy={28 - data[data.length - 1] / max * 24} r="2.5" fill={color || 'var(--accent)'} />
    </svg>);

}

// ---------- At-Risk Banner ----------
function AtRiskBanner() {
  const atRisk = ENGAGEMENT_DATA.filter((m) => m.daysInactive >= 7);
  if (atRisk.length === 0) return null;
  return (
    <div className="risk-alert">
      <div style={{ width: 36, height: 36, flex: '0 0 36px', borderRadius: 10, background: 'var(--coral)', color: '#fff', display: 'grid', placeItems: 'center' }}>
        <Icon name="bell" size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, color: 'var(--coral)' }}>{atRisk.length} member{atRisk.length > 1 ? 's' : ''} at risk — no login for 7+ days</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>These members need outreach before they disengage fully.</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {atRisk.map((m) =>
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elev)', borderRadius: 8, border: '1px solid var(--coral)', fontSize: 12 }}>
              <Avatar initials={m.initials} color={m.color} size={22} />
              <div>
                <span style={{ fontWeight: 600 }}>{m.name}</span>
                <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>{m.daysInactive}d inactive</span>
              </div>
              <button className="btn coral sm" style={{ padding: '4px 8px', fontSize: 11 }}>Reach out</button>
            </div>
          )}
        </div>
      </div>
    </div>);

}

// ---------- Engagement Tab ----------
function EngagementTab() {
  return (
    <div>
      <AtRiskBanner />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        {[
        { label: 'Avg. logins / week', v: '3.8', sub: 'Across active members', trend: '+0.4' },
        { label: 'Avg. time / week', v: '5.7h', sub: 'On platform', trend: '+0.6h' },
        { label: 'Composite score avg', v: '62', sub: 'Platform-wide', trend: '+5pts' }].
        map((s) =>
        <div key={s.label} className="card" style={{ padding: 20 }}>
            <div className="eyebrow">{s.label}</div>
            <div className="display" style={{ fontSize: 40, marginTop: 4, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: 'var(--teal-600)', marginTop: 4 }}>{s.trend} this month · <span style={{ color: 'var(--text-3)' }}>{s.sub}</span></div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="eyebrow" style={{ margin: 0 }}>Member engagement health</div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Sorted by score</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunken)' }}>
              {['Member', 'Plan', 'Logins / wk', 'Hrs / wk', 'Streak', 'Last active', 'Score', ''].map((h) =>
              <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, fontFamily: 'var(--ff-sub)' }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {[...ENGAGEMENT_DATA].sort((a, b) => b.score - a.score).map((m) =>
            <tr key={m.name} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar initials={m.initials} color={m.color} size={26} />
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-2)', fontSize: 12 }}>{m.plan.split(' · ')[1]}</td>
                <td style={{ padding: '10px 16px' }}>{m.avgLogins.toFixed(1)}</td>
                <td style={{ padding: '10px 16px' }}>{m.avgHours.toFixed(1)}h</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ color: m.streak > 0 ? 'var(--coral)' : 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="flame" size={12} />{m.streak}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 12 }}>{m.lastActive}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span className={"score-badge " + scoreColor(m.score)}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
                    {m.score} · {scoreLabel(m.score)}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <button className="btn ghost sm">Nudge</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>);

}

// ---------- Tasks & Goals Tab ----------
const SUBJECT_COMPLETION = [
{ s: 'Personal Branding', pct: 82 }, { s: 'Time Management', pct: 74 },
{ s: 'Professional Communication', pct: 71 }, { s: 'Growth Mindset', pct: 68 },
{ s: 'CV Development', pct: 63 }, { s: 'Early Career Development', pct: 59 },
{ s: 'Habit Tracking', pct: 54 }, { s: 'Public Speaking & Presentation', pct: 48 },
{ s: 'Project Management', pct: 44 }, { s: 'Consulting', pct: 38 },
{ s: 'Strategic Sales', pct: 34 }, { s: 'Data Management', pct: 31 },
{ s: 'Personal Financial Management', pct: 28 }];


function TasksGoalsTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {[
        { label: 'Avg. completion rate', v: '72%', sub: 'Across all members', color: 'var(--teal-600)' },
        { label: 'Avg. time to complete', v: '3.4d', sub: 'From assignment to done', color: 'var(--accent)' },
        { label: 'Goals in progress', v: '38', sub: 'Across all members' },
        { label: 'Goals stalled', v: '7', sub: '>5 days no activity', color: 'var(--coral)' }].
        map((s) =>
        <div key={s.label} className="card" style={{ padding: 20 }}>
            <div className="eyebrow">{s.label}</div>
            <div className="display" style={{ fontSize: 36, marginTop: 4, lineHeight: 1, color: s.color || 'var(--text)' }}>{s.v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{s.sub}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Subject area completion heatmap</div>
          <div className="stack" style={{ gap: 10 }}>
            {SUBJECT_COMPLETION.map((s, i) =>
            <div key={s.s} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: i < 3 ? 600 : 500, color: i < 3 ? 'var(--text)' : 'var(--text-2)' }}>{s.s}</div>
                <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: s.pct + '%', borderRadius: 999, background: s.pct >= 65 ? 'var(--teal-600)' : s.pct >= 45 ? 'var(--accent)' : 'var(--coral)', transition: 'width .4s ease' }} />
                </div>
                <div style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-3)', fontWeight: 600 }}>{s.pct}%</div>
              </div>
            )}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Goals status breakdown</div>
            {[
            { label: 'In progress', v: 38, color: 'var(--accent)' },
            { label: 'Stalled', v: 7, color: 'var(--coral)' },
            { label: 'Completed', v: 51, color: 'var(--teal-600)' }].
            map((g) =>
            <div key={g.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{g.label}</span>
                  <span style={{ color: 'var(--text-3)' }}>{g.v} goals</span>
                </div>
                <div className="progress" style={{ height: 5 }}>
                  <span style={{ width: g.v / 96 * 100 + '%', background: g.color }} />
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Task assignment volume</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, height: 80, alignItems: 'end' }}>
              {[34, 41, 38, 46, 52, 48, 60].slice(-4).map((v, i) =>
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div className="bar" style={{ width: '100%', height: 60 }}>
                    <span style={{ height: v / 60 * 100 + '%', background: i === 3 ? 'var(--accent)' : 'var(--border-strong)' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>W{i + 1}</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>60 tasks assigned this week · +25% vs last</div>
          </div>
        </div>
      </div>
    </div>);

}

// ---------- Sessions Tab ----------
function SessionMetricsTab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        {[
        { label: '1:1 attendance rate', v: '96%', sub: 'Last 30 days', color: 'var(--accent)' },
        { label: 'Town hall attendance', v: '88%', sub: 'Last 3 town halls', color: 'var(--coral)' },
        { label: 'Reschedule requests', v: '14', sub: 'This month' },
        { label: 'No-show rate', v: '4%', sub: 'Across all sessions' }].
        map((s) =>
        <div key={s.label} className="card" style={{ padding: 20 }}>
            <div className="eyebrow">{s.label}</div>
            <div className="display" style={{ fontSize: 36, marginTop: 4, color: s.color || 'var(--text)' }}>{s.v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{s.sub}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Reschedule requests — by member</div>
          <div className="stack" style={{ gap: 8 }}>
            {[
            { name: 'Khalid Hassan', count: 3, initials: 'KH', color: '#FF6B6B' },
            { name: 'Omar Farouk', count: 2, initials: 'OF', color: '#E8B24C' },
            { name: 'Amira Khaled', count: 1, initials: 'AK', color: '#0F52BA' },
            { name: 'Fatima Al-Riyami', count: 1, initials: 'FA', color: '#5BC0DE' },
            { name: 'Noura Al-Mansouri', count: 0, initials: 'NA', color: '#4FB7A6' }].
            map((m) =>
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <Avatar initials={m.initials} color={m.color} size={26} />
                <span style={{ flex: 1, fontSize: 13 }}>{m.name}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: Math.max(m.count, 0) }).map((_, i) =>
                <span key={i} style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--coral)' }} />
                )}
                  {m.count === 0 && <span style={{ fontSize: 11, color: 'var(--teal-600)' }}>✓ None</span>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 20, textAlign: 'right' }}>{m.count}</span>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Attendance trend — last 6 sessions</div>
          <div style={{ display: 'flex', gap: 10, height: 120, alignItems: 'end', marginBottom: 8 }}>
            {[91, 94, 88, 92, 96, 88].map((v, i) =>
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{v}%</div>
                <div className="bar" style={{ width: '100%', height: 90 }}>
                  <span style={{ height: v + '%', background: i === 4 ? 'var(--accent)' : i % 2 === 0 ? 'var(--teal-600)' : 'var(--coral)' }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-3)' }}>S{i + 1}</div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>S = session (alternates 1:1 / Town Hall)</div>
        </div>
      </div>
    </div>);

}

// ---------- Revenue Tab ----------
const MEMBER_REVENUE = [
{ name: 'Yasmine Bakr', plan: 'Management · Advanced', fee: 15000, months: 8, color: '#B79BED', initials: 'YB', trend: [10000, 12000, 13500, 15000, 15000, 15000] },
{ name: 'Lina Haddad', plan: 'Management · Advanced (RTA)', fee: 15000, months: 6, color: '#D76C82', initials: 'LH', trend: [15000, 15000, 15000, 15000, 15000, 15000] },
{ name: 'Fatima Al-Riyami', plan: 'Management · Essentials', fee: 8000, months: 5, color: '#5BC0DE', initials: 'FA', trend: [8000, 8000, 8000, 8000, 8000] },
{ name: 'Amira Khaled', plan: 'Mentorship · Breakthrough', fee: 4500, months: 3, color: '#0F52BA', initials: 'AK', trend: [4500, 4500, 4500] },
{ name: 'Noura Al-Mansouri', plan: 'Mentorship · Breakthrough', fee: 4500, months: 4, color: '#4FB7A6', initials: 'NA', trend: [4500, 4500, 4500, 4500] },
{ name: 'Omar Farouk', plan: 'Mentorship · Foundations', fee: 2500, months: 6, color: '#E8B24C', initials: 'OF', trend: [2500, 2500, 2500, 2500, 2500, 2500] }];


function RevenueMemberCard({ m }) {
  const total = m.fee * m.months;
  const clv = m.fee * 12 * 1.6; // rough 12-month CLV estimate
  return (
    <div className="rev-card">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Avatar initials={m.initials} color={m.color} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.plan}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Monthly</div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, lineHeight: 1 }}>AED {m.fee.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ padding: '8px 10px', background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div className="eyebrow" style={{ fontSize: 9 }}>Total to date</div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, color: 'var(--accent)' }}>AED {total.toLocaleString()}</div>
        </div>
        <div style={{ padding: '8px 10px', background: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div className="eyebrow" style={{ fontSize: 9 }}>Est. CLV (12mo)</div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 18, color: 'var(--teal-600)' }}>AED {clv.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.months} month{m.months > 1 ? 's' : ''} active</div>
        <Sparkline data={m.trend} color={m.color} />
      </div>
    </div>);

}

function RevenueTab() {
  const mrr = REVENUE_DATA.totalMRR;
  return (
    <div>
      {/* Platform summary */}
      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 24, alignItems: 'start' }}>
          <div>
            <div className="eyebrow">Total MRR</div>
            <div className="display" style={{ fontSize: 46, marginTop: 4, lineHeight: 1 }}>AED {(mrr / 1000).toFixed(0)}k</div>
            <div style={{ fontSize: 11, color: 'var(--teal-600)', marginTop: 4 }}>+7.2% month-over-month</div>
          </div>
          <div>
            <div className="eyebrow">Mentorship</div>
            <div className="display" style={{ fontSize: 32, marginTop: 4, color: 'var(--accent)' }}>AED {(REVENUE_DATA.byProduct.mentorship / 1000).toFixed(0)}k</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{Math.round(REVENUE_DATA.byProduct.mentorship / mrr * 100)}% of total</div>
          </div>
          <div>
            <div className="eyebrow">Management</div>
            <div className="display" style={{ fontSize: 32, marginTop: 4, color: 'var(--coral)' }}>AED {(REVENUE_DATA.byProduct.management / 1000).toFixed(0)}k</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{Math.round(REVENUE_DATA.byProduct.management / mrr * 100)}% of total</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>6-month trend</div>
            <Sparkline data={REVENUE_DATA.monthly} color="var(--teal-600)" />
          </div>
        </div>

        {/* Tier breakdown */}
        <div style={{ borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {REVENUE_DATA.tiers.map((t, i) =>
          <div key={t.name} style={{ padding: '16px 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div className="eyebrow" style={{ fontSize: 9 }}>{t.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>AED {(t.fee * t.count).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t.count} {t.type}{t.count > 1 ? 's' : ''} · AED {t.fee.toLocaleString()} each</div>
            </div>
          )}
        </div>
      </div>

      {/* Per-member cards */}
      <div className="eyebrow" style={{ marginBottom: 12 }}>Per-member revenue</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {MEMBER_REVENUE.map((m) => <RevenueMemberCard key={m.name} m={m} />)}
      </div>
    </div>);

}

// ---------- Main AdminAnalytics ----------
function AdminAnalytics() {
  const [tab, setTab] = useState('engagement');
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Admin · Analytics</div>
          <h1 className="page-title">The numbers</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>Engagement, tasks, sessions, and revenue — across all members and products.</div>
        </div>
      </div>

      <div className="analytics-tabs">
        <button className={tab === 'engagement' ? 'on' : ''} onClick={() => setTab('engagement')}>Engagement health</button>
        <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>Tasks & Goals</button>
        <button className={tab === 'sessions' ? 'on' : ''} onClick={() => setTab('sessions')}>Session metrics</button>
        <button className={tab === 'revenue' ? 'on' : ''} onClick={() => setTab('revenue')}>Revenue & CLV</button>
      </div>

      {tab === 'engagement' && <EngagementTab />}
      {tab === 'tasks' && <TasksGoalsTab />}
      {tab === 'sessions' && <SessionMetricsTab />}
      {tab === 'revenue' && <RevenueTab />}
    </>);

}

Object.assign(window, { AdminAnalytics });