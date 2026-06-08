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

/* ── Match score algorithm (brief §Match Score Calculation) ── */
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
      <div className="cr-filter-head"><i className="ti ti-filter"></i> Filters</div>

      <div className="cr-fg">
        <div className="cr-fg-label">Sector</div>
        <div className="cr-chips">
          {CR_SECTORS.map(s => (
            <button key={s} className={`cr-chip ${filters.sectors.includes(s) ? 'on' : ''}`}
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
            <span className="cr-check-mark"><i className="ti ti-check"></i></span>
            <span>{s}</span>
          </label>
        ))}
      </div>

      <div className="cr-fg">
        <div className="cr-fg-label">Hiring signal</div>
        <div className="cr-sw-row" onClick={() => setFilters(f => ({ ...f, hiringWeek: !f.hiringWeek, hiringMonth: f.hiringWeek ? f.hiringMonth : false }))}>
          <span>Hiring this week</span>
          <div className={`cr-sw ${filters.hiringWeek ? 'on' : ''}`}><div className="cr-sw-t"></div></div>
        </div>
        <div className="cr-sw-row" onClick={() => setFilters(f => ({ ...f, hiringMonth: !f.hiringMonth, hiringWeek: f.hiringMonth ? f.hiringWeek : false }))}>
          <span>Hiring this month</span>
          <div className={`cr-sw ${filters.hiringMonth ? 'on' : ''}`}><div className="cr-sw-t"></div></div>
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
function CRStatsBar({ total, matching, hiring }) {
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
    </div>
  );
}

/* ── Company card ── */
function CRCompanyCard({ company, matchScore, saved, onToggleSave }) {
  const barColor = matchScore >= 80 ? 'var(--sapphire)' : matchScore >= 70 ? 'var(--teal-600)' : 'var(--coral)';
  return (
    <div className="cr-card">
      <div className="cr-card-top">
        <div className="cr-logo" style={{ background: company.logo_color || 'var(--sapphire)' }}>
          {company.abbreviation || company.name.charAt(0)}
        </div>
        <div className="cr-card-acts">
          <button className={`cr-act ${saved ? 'saved' : ''}`} onClick={() => onToggleSave(company.id)}
            title={saved ? 'Unsave' : 'Save'}>
            <i className={`ti ${saved ? 'ti-heart-filled' : 'ti-heart'}`}></i>
          </button>
          {company.website_url && (
            <a className="cr-act" href={company.website_url} target="_blank" rel="noopener noreferrer" title="Visit website">
              <i className="ti ti-external-link"></i>
            </a>
          )}
        </div>
      </div>
      <div className="cr-card-name">{company.name}</div>
      <div className="cr-card-sector">{(company.sector_tags || []).join(' · ')}</div>
      {company.description && <p className="cr-card-desc">{company.description}</p>}
      <div className="cr-card-badges">
        <span className="cr-badge-size"><i className="ti ti-users"></i> {company.size_tier}</span>
        <span className={`cr-badge-hire ${company.hiring_detected ? 'on' : ''}`}>
          {company.hiring_detected ? 'Hiring' : 'Not detected'}
        </span>
      </div>
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
            <button onClick={() => onToggle(t)}><i className="ti ti-x"></i></button>
          </span>
        ))}
      </div>
      {!open ? (
        <button className="cr-add-btn" onClick={() => setOpen(true)}>
          <i className="ti ti-plus"></i> Add {label.toLowerCase()}
        </button>
      ) : (
        <div className="cr-tag-picker">
          {Object.entries(tagGroups).map(([group, tags]) => (
            <div key={group} className="cr-tag-group">
              <div className="cr-tag-group-label">{group}</div>
              <div className="cr-chips">
                {tags.map(t => (
                  <button key={t} className={`cr-chip ${selected.includes(t) ? 'on' : ''}`}
                    onClick={() => onToggle(t)}>{t}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="cr-add-btn" onClick={() => setOpen(false)} style={{ marginTop: 6 }}>
            <i className="ti ti-chevron-up"></i> Close
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
    <div className={`cr-prefs ${isOverlay ? 'cr-prefs-overlay' : ''}`} ref={panelRef}>
      {isOverlay && (
        <div className="cr-prefs-overlay-header">
          <span className="cr-prefs-head" style={{ margin: 0 }}><i className="ti ti-adjustments-horizontal"></i> My Preferences</span>
          <button className="cr-icon-btn" onClick={onClose}><i className="ti ti-x"></i></button>
        </div>
      )}
      {!isOverlay && <div className="cr-prefs-head"><i className="ti ti-adjustments-horizontal"></i> Preferences</div>}

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
              <div className="cr-saved-dot" style={{ background: c.logo_color || 'var(--sapphire)' }}>
                {c.abbreviation || c.name.charAt(0)}
              </div>
              <div className="cr-saved-meta">
                <div className="cr-saved-name">{c.name}</div>
                <div className={`cr-saved-status ${c.hiring_detected ? 'on' : ''}`}>
                  {c.hiring_detected ? 'Hiring' : 'Watching'}
                </div>
              </div>
              <button className={`cr-saved-bell ${sc.notify ? 'active' : ''}`}
                onClick={() => {
                  if (!isPaid) {
                    onNotify(null, true);
                    return;
                  }
                  onNotify(c.name, false, sc.id, !sc.notify);
                }}
                title={isPaid ? 'Get alerts' : 'Upgrade to enable alerts'}>
                <i className={`ti ${sc.notify ? 'ti-bell-ringing' : 'ti-bell'}`}></i>
              </button>
            </div>
          );
        })}
      </div>

      <div className="cr-pg">
        <div className="cr-pg-label">Notifications</div>
        <div className="cr-sw-row" onClick={() => setNotifications(n => ({ ...n, hiring: !n.hiring }))}>
          <span>Hiring alerts</span>
          <div className={`cr-sw ${notifications.hiring ? 'on' : ''}`}><div className="cr-sw-t"></div></div>
        </div>
        <div className="cr-sw-row" onClick={() => setNotifications(n => ({ ...n, newCompanies: !n.newCompanies }))}>
          <span>New companies added</span>
          <div className={`cr-sw ${notifications.newCompanies ? 'on' : ''}`}><div className="cr-sw-t"></div></div>
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
      <i className="ti ti-bell-ringing"></i>
      <span>{message}</span>
      <button onClick={onClose}><i className="ti ti-x"></i></button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN CORPORATE RADAR SCREEN
   ══════════════════════════════════════════════════════════════ */
function CorporateRadarScreen({ member }) {
  const sb = window._supabase;

  /* ── Data state ── */
  const [companies, setCompanies] = useState([]);
  const [savedCompanies, setSavedCompanies] = useState([]);
  const [interests, setInterests] = useState([]);
  const [roleTargets, setRoleTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── UI state ── */
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('match');
  const [filters, setFilters] = useState({
    sectors: [], sizes: [], hiringWeek: false, hiringMonth: false, matchFilter: 'all'
  });
  const [prefsOverlay, setPrefsOverlay] = useState(false);
  const [notifications, setNotifications] = useState({ hiring: true, newCompanies: false });
  const [toast, setToast] = useState(null);
  const prefsRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Load data on mount ── */
  useEffect(() => {
    async function load() {
      const uid = await window.getActiveUserId();

      const [companiesRes, savedRes, profileRes] = await Promise.all([
        sb.from('radar_companies').select('*').order('name'),
        sb.from('radar_saved_companies').select('*').eq('member_id', uid),
        sb.from('profiles').select('radar_interests, radar_role_targets').eq('id', uid).single()
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (savedRes.data) setSavedCompanies(savedRes.data);
      if (profileRes.data) {
        setInterests(profileRes.data.radar_interests || []);
        setRoleTargets(profileRes.data.radar_role_targets || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ── Save interests to Supabase on change ── */
  const saveInterests = useCallback(async (newInterests) => {
    const uid = await window.getActiveUserId();
    await sb.from('profiles').update({ radar_interests: newInterests }).eq('id', uid);
  }, []);

  const saveRoleTargets = useCallback(async (newTargets) => {
    const uid = await window.getActiveUserId();
    await sb.from('profiles').update({ radar_role_targets: newTargets }).eq('id', uid);
  }, []);

  const toggleInterest = useCallback((tag) => {
    setInterests(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      saveInterests(next);
      return next;
    });
  }, [saveInterests]);

  const toggleRole = useCallback((tag) => {
    setRoleTargets(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      saveRoleTargets(next);
      return next;
    });
  }, [saveRoleTargets]);

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
      showToast(`You’ll be notified when ${companyName} posts new roles.`);
    }
  }, []);

  /* ── Match scores (recalculated on every render when interests change) ── */
  const scoreMap = useMemo(() => {
    const map = {};
    companies.forEach(c => { map[c.id] = calculateMatchScore(c, interests); });
    return map;
  }, [companies, interests]);

  const savedIdSet = useMemo(() => new Set(savedCompanies.map(sc => sc.company_id)), [savedCompanies]);

  /* ── Filtering ── */
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

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
        if (!c.hiring_last_checked || (now - new Date(c.hiring_last_checked).getTime()) > sevenDays) return false;
      }
      if (filters.hiringMonth) {
        if (!c.hiring_detected) return false;
        if (!c.hiring_last_checked || (now - new Date(c.hiring_last_checked).getTime()) > thirtyDays) return false;
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
    (now - new Date(c.hiring_last_checked).getTime()) <= sevenDays).length;

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
          <span className="cr-uae-badge">
            <span className="cr-uae-flag"></span>
            UAE
          </span>
        </div>
        <div className="cr-header-center">
          <div className="cr-search">
            <i className="ti ti-search"></i>
            <input type="text" placeholder="Search companies..." value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="cr-search-x" onClick={() => setSearch('')}>
                <i className="ti ti-x"></i>
              </button>
            )}
          </div>
        </div>
        <div className="cr-header-right">
          <button className="cr-btn-coral" onClick={handlePrefsClick}>
            <i className="ti ti-heart"></i> <span className="cr-btn-label">My Preferences</span>
          </button>
        </div>
      </div>

      {/* Body: filters | grid | prefs */}
      <div className="cr-body">
        <CRFilterPanel filters={filters} setFilters={setFilters} />

        <div className="cr-center">
          <CRStatsBar total={statsTotal} matching={statsMatching} hiring={statsHiring} />

          <div className="cr-grid-toolbar">
            <span className="cr-grid-count">{sorted.length} {sorted.length === 1 ? 'company' : 'companies'}</span>
            <select className="cr-sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="match">Best match</option>
              <option value="hiring">Recently hiring</option>
              <option value="az">A–Z</option>
            </select>
          </div>

          <div className="cr-grid">
            {sorted.map(c => (
              <CRCompanyCard key={c.id} company={c} matchScore={scoreMap[c.id] || 50}
                saved={savedIdSet.has(c.id)} onToggleSave={toggleSave} />
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="cr-empty-state">
              <i className="ti ti-radar-2"></i>
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
