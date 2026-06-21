// Corporate Radar — company discovery page
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ── Pre-defined tag lists (brief §Your Interests) ── */
const CR_INTEREST_TAGS = {
  Industries: ['Tech', 'Finance', 'Consulting', 'Real Estate', 'Media', 'Healthcare', 'Logistics', 'Retail', 'Gov / Semi-Gov', 'Hospitality', 'Energy', 'Legal', 'Education', 'Non-Profit', 'Conglomerate'],
  Functions: ['Operations', 'Business Development', 'Marketing', 'Product', 'Finance', 'Human Resources', 'Engineering', 'Design', 'Sales', 'Strategy', 'Communications', 'Legal', 'Research'],
  'Company Types': ['Startup', 'Scale-up', 'Enterprise', 'Government Entity', 'Family Business', 'Holding Group', 'NGO']
};

const CR_ROLE_TAGS = CR_INTEREST_TAGS.Functions;

const CR_SECTORS = [
  'Tech', 'Finance', 'Healthcare', 'Real Estate', 'Media',
  'Logistics', 'Consulting', 'Gov/Semi-Gov', 'Hospitality', 'Retail', 'Conglomerate', 'Energy'
];

const CR_SIZES = ['1-50', '51-200', '201-1000', '1000+'];

const CR_SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const CR_THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/* ── Debounce helper ── */
function crDebounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* ── Date helpers ── */
function crDaysAgo(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1 day ago';
  return 'Updated ' + days + ' days ago';
}

function crFormatRefreshDate(dateStr) {
  if (!dateStr) return 'Awaiting first refresh';
  return 'Last refreshed: ' + new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Semantic matching (Voyage embeddings + pgvector cosine) ──
   crFetchSemanticScores pulls the precomputed cosine scores via the
   radar_match_scores RPC (returns null when the member has no interest
   embedding yet, or pgvector/the key isn't available — callers then fall
   back to the tag-overlap calculateMatchScore below).
   crReembedMember re-embeds the member's saved interests/roles (Voyage) and
   then re-pulls the scores; call it after a preference change. */
async function crFetchSemanticScores(uid) {
  try {
    const { data, error } = await window._supabase.rpc('radar_match_scores', { p_member: uid });
    if (error || !data || !data.length) return null;
    const map = {};
    data.forEach(r => { map[r.company_id] = r.score; });
    return map;
  } catch (_) { return null; }
}

async function crReembedMember(uid) {
  try {
    await window._supabase.functions.invoke('radar-embeddings', { body: { mode: 'member', memberId: uid } });
  } catch (_) { /* embedding is optional; tag scoring stays in place */ }
  return crFetchSemanticScores(uid);
}

/* ── Match score algorithm (brief §Match Score Calculation) — tag-overlap
   fallback used until/unless a semantic score exists for the company ── */
function calculateMatchScore(company, memberInterests) {
  if (!memberInterests || memberInterests.length === 0) return 50;
  const companyTags = company.sector_tags.map(t => t.toLowerCase());
  const interests = memberInterests.map(t => t.toLowerCase());
  let matchCount = 0;
  for (const interest of interests) {
    if (companyTags.some(tag => tag.includes(interest) || interest.includes(tag))) matchCount++;
  }
  const baseScore = Math.round((matchCount / interests.length) * 80);
  const hiringBonus = company.hiring_detected ? 12 : 0;
  return Math.min(100, baseScore + hiringBonus + 10);
}

/* ── Filter panel (left column) ── */
function CRFilterPanel({ filters, setFilters }) {
  const toggle = (key, val) => setFilters(f => ({
    ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
  }));
  return (
    <div className="cr-filters">
      <div className="cr-filter-head">
        <span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>tune</span> Filters
      </div>

      <div className="cr-fg">
        <div className="cr-fg-label">Sector</div>
        <div className="cr-chips">
          {CR_SECTORS.map(s => (
            <button key={s} className={'cr-chip' + (filters.sectors.includes(s) ? ' on' : '')}
              onClick={() => toggle('sectors', s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="cr-fg">
        <div className="cr-fg-label">Company size</div>
        {CR_SIZES.map(s => (
          <label key={s} className="cr-check">
            <input type="checkbox" checked={filters.sizes.includes(s)}
              onChange={() => toggle('sizes', s)} />
            <span className="cr-check-mark">
              <span className="material-symbols-outlined" style={{fontSize:10,lineHeight:1}}>check</span>
            </span>
            <span>{s}</span>
          </label>
        ))}
      </div>

      <div className="cr-fg">
        <div className="cr-fg-label">Hiring signal</div>
        <div className="cr-sw-row" onClick={() => setFilters(f => ({ ...f, hiringWeek: !f.hiringWeek, hiringMonth: f.hiringWeek ? f.hiringMonth : false }))}>
          <span>Hiring this week</span>
          <div className={'cr-sw' + (filters.hiringWeek ? ' on' : '')}><div className="cr-sw-t"></div></div>
        </div>
        <div className="cr-sw-row" onClick={() => setFilters(f => ({ ...f, hiringMonth: !f.hiringMonth, hiringWeek: f.hiringMonth ? f.hiringWeek : false }))}>
          <span>Hiring this month</span>
          <div className={'cr-sw' + (filters.hiringMonth ? ' on' : '')}><div className="cr-sw-t"></div></div>
        </div>
      </div>

      <div className="cr-fg">
        <div className="cr-fg-label">Match score</div>
        <label className="cr-radio">
          <input type="radio" name="cr-mf" checked={filters.matchFilter === 'high'}
            onChange={() => setFilters(f => ({ ...f, matchFilter: 'high' }))} />
          <span className="cr-radio-dot"></span><span>High match</span>
        </label>
        <label className="cr-radio">
          <input type="radio" name="cr-mf" checked={filters.matchFilter === 'all'}
            onChange={() => setFilters(f => ({ ...f, matchFilter: 'all' }))} />
          <span className="cr-radio-dot"></span><span>All</span>
        </label>
      </div>
    </div>
  );
}

/* ── Stats bar ── */
function CRStatsBar({ total, matching, hiring, lastRefreshed }) {
  return (
    <div className="cr-stats">
      <div className="cr-stat">
        <div className="cr-stat-n">{total}</div>
        <div className="cr-stat-l">Total in database</div>
      </div>
      <div className="cr-stat accent">
        <div className="cr-stat-n">{matching}</div>
        <div className="cr-stat-l">Match your profile</div>
      </div>
      <div className="cr-stat hire">
        <div className="cr-stat-n">{hiring}</div>
        <div className="cr-stat-l">Hiring this week</div>
      </div>
      <div className="cr-stat cr-stat-refresh-box">
        <div className="cr-stat-refresh-text">{crFormatRefreshDate(lastRefreshed)}</div>
      </div>
    </div>
  );
}

/* ── Recently added check ── */
function crIsRecentlyAdded(company) {
  if (!company.published_at) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(company.published_at) > sevenDaysAgo;
}

/* ── Company card ── */
/* Auto-generated abbreviations vary in length (1–5 chars). Cap the displayed
   text and scale the font so it never clips the edges of the logo box. */
function crAbbrText(c) {
  return (c.abbreviation || (c.name || '?').charAt(0) || '?').toString().slice(0, 4);
}
function crAbbrSize(txt, base) {
  const n = (txt || '').length;
  // base = font-size for a 1–2 char abbreviation; step down for longer ones.
  if (n >= 4) return Math.round(base * 0.7);
  if (n === 3) return Math.round(base * 0.82);
  return base;
}

function CRCompanyCard({ company, matchScore, saved, onToggleSave }) {
  const abbr = crAbbrText(company);
  const barColor = matchScore >= 80 ? 'var(--sapphire)' : matchScore >= 70 ? 'var(--teal-600)' : 'var(--coral)';
  const now = Date.now();
  const recentlyChecked = company.hiring_last_checked &&
    (now - new Date(company.hiring_last_checked).getTime()) <= CR_SEVEN_DAYS;

  const hiringLabel = (() => {
    if (company.job_count > 0) return company.job_count + ' open role' + (company.job_count === 1 ? '' : 's');
    if (company.hiring_detected) return 'Hiring';
    return 'Not hiring';
  })();
  const hiringActive = company.job_count > 0 || company.hiring_detected;
  const recentlyAdded = crIsRecentlyAdded(company);

  return (
    <div className="cr-card">
      <div className="cr-card-top">
        <div className="cr-logo" style={{ background: company.logo_color || 'var(--sapphire)', fontSize: crAbbrSize(abbr, 15) }}>
          {abbr}
        </div>
        <div className="cr-card-acts">
          <button className={'cr-act' + (saved ? ' saved' : '')} onClick={() => onToggleSave(company.id)}
            title={saved ? 'Unsave' : 'Save'}>
            <span className="material-symbols-outlined" style={saved ? {fontSize:16,lineHeight:1,color:'var(--coral)'} : {fontSize:16,lineHeight:1}}>{saved ? 'favorite' : 'favorite_border'}</span>
          </button>
          {company.website_url && (
            <a className="cr-act" href={company.website_url} target="_blank" rel="noopener noreferrer" title="Visit website">
              <span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1}}>open_in_new</span>
            </a>
          )}
        </div>
      </div>
      <div className="cr-card-name">{company.name}</div>
      <div className="cr-card-sector">{(company.sector_tags || []).join(' · ')}</div>
      {company.description && <p className="cr-card-desc">{company.description}</p>}
      <div className="cr-card-badges">
        <span className="cr-badge-size">
          <span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>group</span> {company.size_tier}
        </span>
        <span className={'cr-badge-hire' + (hiringActive ? ' on' : '')}>
          {hiringLabel}
        </span>
        {recentlyAdded && (
          <span className="cr-badge-new">Recently Added</span>
        )}
      </div>
      {recentlyChecked && (
        <div className="cr-updated-label">{crDaysAgo(company.hiring_last_checked)}</div>
      )}
      <div className="cr-match">
        <div className="cr-match-track">
          <div className="cr-match-fill" style={{ width: matchScore + '%', background: barColor }}></div>
        </div>
        <span className="cr-match-pct" style={{ color: barColor }}>{matchScore}%</span>
      </div>
    </div>
  );
}

/* ── Interest tag picker (pre-defined, grouped) ── */
function CRTagPicker({ selected, onToggle, tagGroups, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cr-pg">
      <div className="cr-pg-label">{label}</div>
      <div className="cr-tags">
        {selected.map(t => (
          <span key={t} className="cr-tag">
            {t}
            <button onClick={() => onToggle(t)}><span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1}}>close</span></button>
          </span>
        ))}
      </div>
      {!open ? (
        <button className="cr-add-btn" onClick={() => setOpen(true)}>
          <span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1}}>add</span> Add {label.toLowerCase()}
        </button>
      ) : (
        <div className="cr-tag-picker">
          {Object.entries(tagGroups).map(([group, tags]) => (
            <div key={group} className="cr-tag-group">
              <div className="cr-tag-group-label">{group}</div>
              <div className="cr-chips">
                {tags.map(t => (
                  <button key={t} className={'cr-chip' + (selected.includes(t) ? ' on' : '')}
                    onClick={() => onToggle(t)}>{t}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="cr-add-btn" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>
            <span className="material-symbols-outlined" style={{fontSize:12,lineHeight:1,transform:'rotate(180deg)'}}>expand_more</span> Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Preferences panel (right column / slide-in) ── */
function CRPrefsPanel({ interests, roleTargets, onToggleInterest, onToggleRole,
  savedCompanies, companies, notifications, setNotifications, onNotify, onUnsave,
  member, onClose, isOverlay }) {

  const panelRef = useRef(null);

  return (
    <div className={'cr-prefs' + (isOverlay ? ' cr-prefs-overlay' : '')} ref={panelRef}>
      {isOverlay && (
        <div className="cr-prefs-overlay-header">
          <span className="cr-prefs-head" style={{ margin: 0 }}>
            <span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>tune</span> My Preferences
          </span>
          <button className="cr-icon-btn" onClick={onClose}><span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1}}>close</span></button>
        </div>
      )}
      {!isOverlay && <div className="cr-prefs-head"><span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>tune</span> Preferences</div>}

      <CRTagPicker selected={interests} onToggle={onToggleInterest}
        tagGroups={CR_INTEREST_TAGS} label="Your Interests" />

      <CRTagPicker selected={roleTargets} onToggle={onToggleRole}
        tagGroups={{ Functions: CR_ROLE_TAGS }} label="Role Targets" />

      <div className="cr-pg">
        <div className="cr-pg-label">Saved Companies</div>
        {savedCompanies.length === 0 ? (
          <div className="cr-pg-empty">No saved companies yet.</div>
        ) : savedCompanies.map(sc => {
          const c = companies.find(co => co.id === sc.company_id);
          if (!c) return null;
          const isPaid = member.membershipTier === 'breakthrough' || member.membershipTier === 'management';
          return (
            <div key={sc.id} className="cr-saved-row">
              <div className="cr-saved-dot" style={{ background: c.logo_color || 'var(--sapphire)', fontSize: crAbbrSize(crAbbrText(c), 11) }}>
                {crAbbrText(c)}
              </div>
              <div className="cr-saved-meta">
                <div className="cr-saved-name">{c.name}</div>
                <div className={'cr-saved-status' + (c.hiring_detected ? ' on' : '')}>
                  {c.hiring_detected ? 'Hiring' : 'Watching'}
                </div>
              </div>
              <button className={'cr-saved-bell' + (sc.notify ? ' active' : '')}
                onClick={() => {
                  if (!isPaid) {
                    onNotify(null, true);
                    return;
                  }
                  onNotify(c.name, false, sc.id, !sc.notify);
                }}
                title={isPaid ? 'Get alerts' : 'Upgrade to enable alerts'}>
                <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>{sc.notify ? 'notifications_active' : 'notifications'}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="cr-pg">
        <div className="cr-pg-label">Notifications</div>
        <div className="cr-sw-row" onClick={() => setNotifications(n => ({ ...n, hiring: !n.hiring }))}>
          <span>Hiring alerts</span>
          <div className={'cr-sw' + (notifications.hiring ? ' on' : '')}><div className="cr-sw-t"></div></div>
        </div>
        <div className="cr-sw-row" onClick={() => setNotifications(n => ({ ...n, newCompanies: !n.newCompanies }))}>
          <span>New companies added</span>
          <div className={'cr-sw' + (notifications.newCompanies ? ' on' : '')}><div className="cr-sw-t"></div></div>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function CRToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="cr-toast">
      <span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1}}>notifications</span>
      <span>{message}</span>
      <button onClick={onClose}><span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>close</span></button>
    </div>
  );
}

/* ── Admin Draft Panel ── */
function CRDraftPanel({ drafts, onPublish, onDiscard }) {
  const [open, setOpen] = useState(true);

  if (drafts.length === 0) return null;

  return (
    <div className="cr-draft-panel">
      <button className="cr-draft-toggle" onClick={() => setOpen(!open)}>
        <span className="cr-draft-toggle-left">
          <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1,transform:open?'rotate(0)':'rotate(-90deg)',transition:'transform 0.2s'}}>expand_more</span>
          Draft Companies
        </span>
        <span className="cr-draft-count">{drafts.length}</span>
      </button>
      {open && (
        <div className="cr-draft-table-wrap">
          <table className="cr-draft-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Sectors</th>
                <th>Size</th>
                <th>Description</th>
                <th>Discovered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="cr-draft-dot" style={{ background: c.logo_color || 'var(--sapphire)', fontSize: crAbbrSize(crAbbrText(c), 11) }}>
                        {crAbbrText(c)}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td>{(c.sector_tags || []).join(', ')}</td>
                  <td>{c.size_tier}</td>
                  <td className="cr-draft-desc">{c.description}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td>
                    <div className="cr-draft-actions">
                      <button className="cr-draft-publish" onClick={() => onPublish(c.id)}>Publish</button>
                      <button className="cr-draft-discard" onClick={() => onDiscard(c.id, c.name)}>Discard</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN CORPORATE RADAR SCREEN
   ══════════════════════════════════════════════════════════════ */
function CorporateRadarScreen({ member }) {
  const sb = window._supabase;
  const isAdmin = member && member.isAdmin;

  /* ── Data state ── */
  const [allCompanies, setAllCompanies] = useState([]);
  const [savedCompanies, setSavedCompanies] = useState([]);
  const [interests, setInterests] = useState([]);
  const [roleTargets, setRoleTargets] = useState([]);
  /* Semantic cosine scores keyed by company_id (null = none yet → tag fallback). */
  const [semanticScores, setSemanticScores] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Derived: published companies (what the grid shows) and drafts (admin only) */
  const companies = useMemo(() => allCompanies.filter(c => c.status === 'published'), [allCompanies]);
  const drafts = useMemo(() => isAdmin ? allCompanies.filter(c => c.status === 'draft') : [], [allCompanies, isAdmin]);

  /* ── UI state ── */
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('match');
  const [filters, setFilters] = useState({
    sectors: [], sizes: [], hiringWeek: false, hiringMonth: false, matchFilter: 'all'
  });
  const [prefsOverlay, setPrefsOverlay] = useState(false);
  const [notifications, setNotifications] = useState({ hiring: true, newCompanies: false });
  const [toast, setToast] = useState(null);
  /* How many cards to show before the "See more" button (keeps initial scroll short). */
  const CR_PAGE = 12;
  const [visibleCount, setVisibleCount] = useState(CR_PAGE);
  /* Collapse back to the first page whenever the result set changes. */
  useEffect(() => { setVisibleCount(CR_PAGE); }, [search, sort, filters]);
  const prefsRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  /* ── Debounced Supabase upserts → then re-embed prefs + refresh semantic
     scores (Voyage). The profile write must land before crReembedMember reads
     it back, so we await the update first. setSemanticScores is a stable
     useState setter, safe to capture in the once-created ref. ── */
  const debouncedSaveInterests = useRef(
    crDebounce(async (newInterests) => {
      const uid = await window.getActiveUserId();
      await sb.from('profiles').update({ radar_interests: newInterests }).eq('id', uid);
      const scores = await crReembedMember(uid);
      setSemanticScores(scores);
    }, 600)
  ).current;

  const debouncedSaveRoleTargets = useRef(
    crDebounce(async (newTargets) => {
      const uid = await window.getActiveUserId();
      await sb.from('profiles').update({ radar_role_targets: newTargets }).eq('id', uid);
      const scores = await crReembedMember(uid);
      setSemanticScores(scores);
    }, 600)
  ).current;

  /* ── Load data on mount ── */
  useEffect(() => {
    async function load() {
      const uid = await window.getActiveUserId();

      const [companiesRes, savedRes, profileRes] = await Promise.all([
        sb.from('radar_companies').select('*').order('name'),
        sb.from('radar_saved_companies').select('*').eq('member_id', uid),
        sb.from('profiles').select('radar_interests, radar_role_targets').eq('id', uid).single()
      ]);

      if (companiesRes.data) setAllCompanies(companiesRes.data);
      if (savedRes.data) setSavedCompanies(savedRes.data);
      if (profileRes.data) {
        setInterests(profileRes.data.radar_interests || []);
        setRoleTargets(profileRes.data.radar_role_targets || []);
      }
      /* Pull any precomputed semantic scores (null → tag fallback). */
      setSemanticScores(await crFetchSemanticScores(uid));
      setLoading(false);
    }
    load();
  }, []);

  /* ── Toggle interest tag → immediate state update + debounced save ── */
  const toggleInterest = useCallback((tag) => {
    setInterests(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      debouncedSaveInterests(next);
      return next;
    });
  }, [debouncedSaveInterests]);

  const toggleRole = useCallback((tag) => {
    setRoleTargets(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      debouncedSaveRoleTargets(next);
      return next;
    });
  }, [debouncedSaveRoleTargets]);

  /* ── Save / unsave company ── */
  const toggleSave = useCallback(async (companyId) => {
    const uid = await window.getActiveUserId();
    const existing = savedCompanies.find(sc => sc.company_id === companyId);
    if (existing) {
      await sb.from('radar_saved_companies').delete().eq('id', existing.id);
      setSavedCompanies(prev => prev.filter(sc => sc.id !== existing.id));
    } else {
      const { data } = await sb.from('radar_saved_companies')
        .insert({ member_id: uid, company_id: companyId })
        .select()
        .single();
      if (data) setSavedCompanies(prev => [...prev, data]);
    }
  }, [savedCompanies]);

  /* ── Notify toggle ── */
  const handleNotify = useCallback(async (companyName, isUpgradePrompt, savedId, newNotifyValue) => {
    if (isUpgradePrompt) {
      showToast('Upgrade to a paid plan to enable hiring alerts.');
      return;
    }
    if (savedId != null) {
      await sb.from('radar_saved_companies').update({ notify: newNotifyValue }).eq('id', savedId);
      setSavedCompanies(prev => prev.map(sc => sc.id === savedId ? { ...sc, notify: newNotifyValue } : sc));
    }
    if (companyName && newNotifyValue) {
      showToast("You'll be notified when " + companyName + " posts new roles.");
    }
  }, []);

  /* ── Publish / Discard draft (admin only) ── */
  const publishDraft = useCallback(async (companyId) => {
    const { error } = await sb.from('radar_companies')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', companyId);
    if (!error) {
      setAllCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: 'published', published_at: new Date().toISOString() } : c));
      showToast('Company published and now visible to members.');
    }
  }, []);

  const discardDraft = useCallback(async (companyId, companyName) => {
    if (!window.confirm('Discard "' + companyName + '"? This will permanently delete it.')) return;
    const { error } = await sb.from('radar_companies').delete().eq('id', companyId);
    if (!error) {
      setAllCompanies(prev => prev.filter(c => c.id !== companyId));
      showToast('"' + companyName + '" discarded.');
    }
  }, []);

  /* ── Match scores: prefer the semantic cosine score per company; fall back
     to tag-overlap when the member has no embedding yet (or for a company that
     somehow lacks one). Recomputes when interests or semantic scores change. ── */
  const scoreMap = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      map[c.id] = (semanticScores && semanticScores[c.id] != null)
        ? semanticScores[c.id]
        : calculateMatchScore(c, interests);
    });
    return map;
  }, [companies, interests, semanticScores]);

  const savedIdSet = useMemo(() => new Set(savedCompanies.map(sc => sc.company_id)), [savedCompanies]);

  /* ── Global last refreshed (most recent hiring_last_checked) ── */
  const lastRefreshed = useMemo(() => {
    let latest = null;
    for (const c of companies) {
      if (c.hiring_last_checked) {
        const t = new Date(c.hiring_last_checked).getTime();
        if (!latest || t > latest) latest = t;
      }
    }
    return latest ? new Date(latest).toISOString() : null;
  }, [companies]);

  /* ── Filtering ── */
  const now = Date.now();

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const tagMatch = (c.sector_tags || []).some(t => t.toLowerCase().includes(q));
        if (!nameMatch && !tagMatch) return false;
      }
      if (filters.sectors.length && !filters.sectors.some(s => (c.sector_tags || []).some(t => t.includes(s) || s.includes(t)))) return false;
      if (filters.sizes.length && !filters.sizes.includes(c.size_tier)) return false;
      if (filters.hiringWeek) {
        if (!c.hiring_detected) return false;
        if (!c.hiring_last_checked || (now - new Date(c.hiring_last_checked).getTime()) > CR_SEVEN_DAYS) return false;
      }
      if (filters.hiringMonth) {
        if (!c.hiring_detected) return false;
        if (!c.hiring_last_checked || (now - new Date(c.hiring_last_checked).getTime()) > CR_THIRTY_DAYS) return false;
      }
      if (filters.matchFilter === 'high' && (scoreMap[c.id] || 0) < 70) return false;
      return true;
    });
  }, [companies, search, filters, scoreMap]);

  /* ── Sorting ── */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === 'match') return (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0);
      if (sort === 'hiring') {
        const hDiff = (b.hiring_detected ? 1 : 0) - (a.hiring_detected ? 1 : 0);
        return hDiff !== 0 ? hDiff : (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [filtered, sort, scoreMap]);

  /* ── Stats (from filtered set) ── */
  const statsTotal = filtered.length;
  const statsMatching = filtered.filter(c => (scoreMap[c.id] || 0) >= 70).length;
  const statsHiring = filtered.filter(c => c.hiring_detected && c.hiring_last_checked &&
    (now - new Date(c.hiring_last_checked).getTime()) <= CR_SEVEN_DAYS).length;

  /* ── Desktop prefs visibility check ── */
  const [isWide, setIsWide] = useState(window.innerWidth >= 1100);
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePrefsClick = () => {
    if (isWide && prefsRef.current) {
      prefsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      prefsRef.current.classList.add('cr-prefs-highlight');
      setTimeout(() => prefsRef.current && prefsRef.current.classList.remove('cr-prefs-highlight'), 1500);
    } else {
      setPrefsOverlay(true);
    }
  };

  if (loading) {
    return (
      <div className="cr-screen">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading Corporate Radar...</div>
      </div>
    );
  }

  const prefsProps = {
    interests, roleTargets, onToggleInterest: toggleInterest, onToggleRole: toggleRole,
    savedCompanies, companies, notifications, setNotifications,
    onNotify: handleNotify, member
  };

  return (
    <div className="cr-screen">
      {/* Page header */}
      <div className="cr-header">
        <div className="cr-header-left">
          <h1 className="cr-title">Corporate Radar</h1>
        </div>
        <div className="cr-header-center">
          <div className="cr-search">
            <span className="material-symbols-outlined" style={{fontSize:16,lineHeight:1}}>search</span>
            <input type="text" placeholder="Search companies..." value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="cr-search-x" onClick={() => setSearch('')}><span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>close</span></button>
            )}
          </div>
        </div>
        <div className="cr-header-right">
          <button className="cr-btn-coral" onClick={handlePrefsClick}>
            <span className="material-symbols-outlined" style={{fontSize:14,lineHeight:1}}>tune</span> <span className="cr-btn-label">My Preferences</span>
          </button>
        </div>
      </div>

      {/* Admin draft panel */}
      {isAdmin && drafts.length > 0 && (
        <CRDraftPanel drafts={drafts} onPublish={publishDraft} onDiscard={discardDraft} />
      )}

      {/* Body: filters | grid | prefs */}
      <div className="cr-body">
        <CRFilterPanel filters={filters} setFilters={setFilters} />

        <div className="cr-center">
          <CRStatsBar total={statsTotal} matching={statsMatching} hiring={statsHiring}
            lastRefreshed={lastRefreshed} />

          <div className="cr-grid-toolbar">
            <span className="cr-grid-count">
              {sorted.length > visibleCount
                ? `Showing ${visibleCount} of ${sorted.length} companies`
                : `${sorted.length} ${sorted.length === 1 ? 'company' : 'companies'}`}
            </span>
            <select className="cr-sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="match">Best match</option>
              <option value="hiring">Recently hiring</option>
              <option value="az">A–Z</option>
            </select>
          </div>

          <div className="cr-grid">
            {sorted.slice(0, visibleCount).map(c => (
              <CRCompanyCard key={c.id} company={c} matchScore={scoreMap[c.id] || 50}
                saved={savedIdSet.has(c.id)} onToggleSave={toggleSave} />
            ))}
          </div>

          {sorted.length > visibleCount && (
            <div className="cr-more">
              <button className="cr-more-btn" onClick={() => setVisibleCount(v => v + CR_PAGE)}>
                See more companies
                <span className="cr-more-count">{sorted.length - visibleCount} more</span>
              </button>
              {sorted.length - visibleCount > CR_PAGE && (
                <button className="cr-more-all" onClick={() => setVisibleCount(sorted.length)}>
                  See all
                </button>
              )}
            </div>
          )}

          {sorted.length === 0 && (
            <div className="cr-empty-state">
              <span className="material-symbols-outlined" style={{fontSize:36,lineHeight:1,opacity:0.3,display:'block',marginBottom:12}}>radar</span>
              <p>No companies match your current filters.</p>
              <button onClick={() => {
                setFilters({ sectors: [], sizes: [], hiringWeek: false, hiringMonth: false, matchFilter: 'all' });
                setSearch('');
              }}>Clear all filters</button>
            </div>
          )}
        </div>

        {/* Desktop inline prefs */}
        {isWide && (
          <div ref={prefsRef}>
            <CRPrefsPanel {...prefsProps} isOverlay={false} />
          </div>
        )}
      </div>

      {/* Mobile/tablet slide-in overlay */}
      {prefsOverlay && (
        <>
          <div className="cr-overlay-bg" onClick={() => setPrefsOverlay(false)} />
          <CRPrefsPanel {...prefsProps} isOverlay={true} onClose={() => setPrefsOverlay(false)} />
        </>
      )}

      <CRToast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

window.CorporateRadarScreen = CorporateRadarScreen;
