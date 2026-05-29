// Resources screen — live library backed by the `resources` Supabase table.

// Record that the current user opened a resource (one row per distinct resource).
async function logResourceView(resourceId) {
  const { data: { user } } = await window._supabase.auth.getUser();
  if (!user) return;
  await window._supabase.from('resource_views').upsert(
    { user_id: user.id, resource_id: String(resourceId) },
    { onConflict: 'user_id,resource_id', ignoreDuplicates: true }
  );
}
// Count of distinct resources the current user has opened (powers Resources badges).
async function fetchResourceViewCount() {
  const uid = window.getActiveUserId ? await window.getActiveUserId() : null;
  if (!uid) return 0;
  const { count } = await window._supabase.from('resource_views')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid);
  return count || 0;
}

// ---------- Shared resource helpers (used by member + admin views) ----------
const RES_FOLDERS = [
  { key: 'foundations', label: 'Foundations' },
  { key: 'breakthrough', label: 'Breakthrough' },
  { key: 'mega_management', label: 'MEGA Management' }];

const RES_FOLDER_LABEL = { foundations: 'Foundations', breakthrough: 'Breakthrough', mega_management: 'MEGA Management' };
// Access tier display: foundations resources are open to everyone ("Both").
const RES_ACCESS_LABEL = { foundations: 'Both', breakthrough: 'Breakthrough', mega_management: 'Management' };
const RES_ACCESS_CHIP = { foundations: 'teal', breakthrough: 'sapphire', mega_management: 'coral' };
const RES_TYPES = [
  { key: 'video', label: 'Video' },
  { key: 'pdf', label: 'PDF' },
  { key: 'template', label: 'Template' },
  { key: 'article', label: 'Article' }];

const RES_TYPE_META = {
  video: { icon: 'video', label: 'Video' },
  pdf: { icon: 'doc', label: 'PDF' },
  template: { icon: 'link', label: 'Template' },
  article: { icon: 'doc', label: 'Article' } };


// Subject areas suggested in the admin form (brief list); colored via SUBJECTS.
const RES_SUBJECTS = Object.keys(SUBJECTS);

function resRelTime(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);if (d < 30) return d + 'd ago';
  const mo = Math.floor(d / 30);if (mo < 12) return mo + 'mo ago';
  return Math.floor(mo / 12) + 'y ago';
}

function resYouTubeId(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function resLoomId(url) {
  const m = (url || '').match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  return m ? m[1] : null;
}
function resVideoEmbed(url) {
  const yt = resYouTubeId(url);
  if (yt) return 'https://www.youtube.com/embed/' + yt;
  const lm = resLoomId(url);
  if (lm) return 'https://www.loom.com/embed/' + lm;
  return url;
}
function resPdfEmbed(url) {
  const gd = (url || '').match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (gd) return 'https://drive.google.com/file/d/' + gd[1] + '/preview';
  return url;
}
function resDomain(url) {
  try {return new URL(url).hostname.replace(/^www\./, '');} catch (e) {return url || '';}
}

// Member tier → resource user type.
function resUserType(member) {
  const t = member && member.membershipTier || 'foundations';
  if (t === 'management') return 'mega_management';
  if (t === 'breakthrough') return 'breakthrough';
  return 'foundations'; // foundations + free/trial
}
function resVisibleFolders(userType) {
  return userType === 'mega_management' ?
  ['foundations', 'breakthrough', 'mega_management'] :
  ['foundations', 'breakthrough'];
}
// 'open' (fully accessible) | 'locked' (visible upsell) | 'hidden' (not shown)
function resCardState(resource, userType) {
  const at = resource.access_tier;
  if (at === 'foundations') return 'open';
  if (at === 'breakthrough') return userType === 'breakthrough' || userType === 'mega_management' ? 'open' : 'locked';
  if (at === 'mega_management') return userType === 'mega_management' ? 'open' : 'hidden';
  return 'open';
}

Object.assign(window, {
  logResourceView, fetchResourceViewCount,
  RES_FOLDERS, RES_FOLDER_LABEL, RES_ACCESS_LABEL, RES_ACCESS_CHIP, RES_TYPES, RES_TYPE_META, RES_SUBJECTS,
  resRelTime, resVideoEmbed, resPdfEmbed, resDomain, resUserType, resVisibleFolders, resCardState });


// ---------- Resource viewer modal ----------
function ResourceViewer({ resource: r, onClose }) {
  const subjColor = SUBJECTS[r.subject_area] || 'var(--text-3)';
  let body;
  if (r.content_type === 'video') {
    body =
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 10, overflow: 'hidden' }}>
        <iframe src={resVideoEmbed(r.url)} title={r.title}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>;

  } else if (r.content_type === 'pdf') {
    body =
    <div className="stack" style={{ gap: 10 }}>
        <div style={{ position: 'relative', width: '100%', height: '64vh', background: 'var(--bg-sunken)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <iframe src={resPdfEmbed(r.url)} title={r.title} style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
        <a className="btn" href={r.url} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>
          <Icon name="external" size={13} /> Open PDF
        </a>
      </div>;

  } else {
    // template / article — designed preview card, opens in new tab.
    const isArticle = r.content_type === 'article';
    body =
    <div className="card" style={{ padding: 32, textAlign: 'center', display: 'grid', placeItems: 'center', gap: 14, background: 'var(--bg-sunken)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, display: 'grid', placeItems: 'center', background: subjColor + '1A', color: subjColor }}>
          <Icon name={isArticle ? 'doc' : 'link'} size={26} stroke={1.4} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, marginBottom: 6 }}>{r.title}</div>
          {r.description && <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 460, lineHeight: 1.5 }}>{r.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {r.subject_area && <SubjectTag subject={r.subject_area} />}
          {isArticle && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{resDomain(r.url)}</span>}
        </div>
        <a className="btn primary" href={r.url} target="_blank" rel="noopener noreferrer" onClick={() => window.logResourceView(r.id)} style={{ marginTop: 4 }}>
          <Icon name="external" size={13} /> {isArticle ? 'Read Article' : 'Open Template'}
        </a>
      </div>;

  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.6)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(880px, 94vw)', maxHeight: '92vh', overflow: 'auto', zIndex: 201, padding: 0, boxShadow: 'var(--shadow-3)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip"><Icon name={RES_TYPE_META[r.content_type].icon} size={11} /> {RES_TYPE_META[r.content_type].label}</span>
              {r.duration_minutes ? <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{r.duration_minutes} min</span> : null}
            </div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>
          {(r.content_type === 'video' || r.content_type === 'pdf') && r.description &&
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 14 }}>{r.description}</div>
          }
          {body}
        </div>
      </div>
    </>);

}

// ---------- Upgrade prompt for locked (Breakthrough-gated) cards ----------
function ResourceUpgrade({ resource: r, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.6)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div className="card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(440px, 92vw)', zIndex: 201, padding: 28, boxShadow: 'var(--shadow-3)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--sapphire-100)', color: 'var(--sapphire)', margin: '0 auto 14px' }}>
          <Icon name="lock" size={24} stroke={1.5} />
        </div>
        <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, marginBottom: 8 }}>Unlock with Breakthrough</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 6 }}>
          "{r.title}" is part of the Breakthrough programme.
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 20 }}>
          Breakthrough includes 1:1 mentorship and personalized guidance to move faster.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn" onClick={onClose}>Maybe later</button>
          <a className="btn primary" href="mailto:hello@mega-mentorship.com?subject=Upgrade%20to%20Breakthrough">Talk to MEGA</a>
        </div>
      </div>
    </>);

}

function ResourceCard({ r, state, onOpen, onLocked }) {
  const locked = state === 'locked';
  const color = SUBJECTS[r.subject_area] || '#888';
  const meta = RES_TYPE_META[r.content_type] || RES_TYPE_META.article;
  const [viewed, setViewed] = useState(false);
  const click = () => {
    if (locked) {onLocked(r);return;}
    setViewed(true);
    window.logResourceView(r.id);
    onOpen(r);
  };
  return (
    <div className="card" onClick={click} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative', transition: 'transform .14s ease, box-shadow .14s ease' }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px)';e.currentTarget.style.boxShadow = 'var(--shadow-2)';}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = '';e.currentTarget.style.boxShadow = '';}}>
      {locked &&
      <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--sapphire)', color: '#fff', fontSize: 9, fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em',
        textTransform: 'uppercase', padding: '3px 7px', borderRadius: 6 }}>
          <Icon name="lock" size={9} /> Locked
        </span>
      }
      {viewed && !locked &&
      <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--teal-600)', color: '#fff', fontSize: 9, fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em',
        textTransform: 'uppercase', padding: '3px 7px', borderRadius: 6 }}>
          <Icon name="check" size={9} /> Opened
        </span>
      }
      {/* Media */}
      {r.thumbnail_url ?
      <div style={{ aspectRatio: '16/9', borderBottom: '1px solid var(--border)', position: 'relative', backgroundImage: `url(${r.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: locked ? 'grayscale(0.4) brightness(0.8)' : 'none' }}>
          {r.content_type === 'video' && !locked &&
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(10,10,10,0.7)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="play" size={16} /></div>
            </div>
        }
          {locked && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}><Icon name="lock" size={26} /></div>}
        </div> :
      r.content_type === 'video' ?
      <div className="ph-img" style={{ aspectRatio: '16/9', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border)', position: 'relative', filter: locked ? 'grayscale(0.4) brightness(0.85)' : 'none' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(10,10,10,0.7)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <Icon name={locked ? 'lock' : 'play'} size={16} />
            </div>
          </div>
          {r.duration_minutes ? <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(10,10,10,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--ff-sub)' }}>{r.duration_minutes} min</div> : null}
        </div> :

      <div style={{ aspectRatio: '16/9', background: color + '12', borderBottom: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: locked ? 'var(--text-3)' : color, filter: locked ? 'grayscale(0.5)' : 'none' }}>
          <Icon name={locked ? 'lock' : meta.icon} size={40} stroke={1.2} />
        </div>
      }
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          {r.subject_area ? <SubjectTag subject={r.subject_area} /> : <span />}
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em' }}>{resRelTime(r.created_at)}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{r.title}</div>
        {locked ?
        <div style={{ fontSize: 11, color: 'var(--sapphire)', marginTop: 6, lineHeight: 1.4 }}>
            Unlocked with Breakthrough. Includes 1:1 mentorship and personalized guidance.
          </div> :

        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="folder" size={11} /> {RES_FOLDER_LABEL[r.folder] || r.folder}
          </div>
        }
      </div>
    </div>);

}

function ResourcesScreen({ member, onStartTour, tourCompleted }) {
  const userType = resUserType(member);
  const visibleFolders = resVisibleFolders(userType);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState(visibleFolders[0]);
  const [q, setQ] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await window._supabase.
      from('resources').select('*').
      eq('published', true).
      order('created_at', { ascending: false });
      if (!alive) return;
      if (error) {console.error('resources load', error);setRows([]);} else
      {
        // RLS already excludes hidden mega_management rows; filter again for safety.
        setRows((data || []).filter((r) => resCardState(r, userType) !== 'hidden'));
      }
      setLoading(false);
    })();
    return () => {alive = false;};
  }, [userType]);

  const withState = rows.map((r) => ({ r, state: resCardState(r, userType) }));
  const recent = withState.slice(0, 3);
  const subjects = [...new Set(rows.map((r) => r.subject_area).filter(Boolean))];

  const filtered = withState.filter(({ r }) =>
  r.folder === folder && (
  !subjectFilter || r.subject_area === subjectFilter) && (
  q === '' || r.title.toLowerCase().includes(q.toLowerCase()) || (r.subject_area || '').toLowerCase().includes(q.toLowerCase()))
  );
  const folderCount = (key) => withState.filter(({ r }) => r.folder === key).length;

  const openCard = (r) => setViewing(r);
  const lockCard = (r) => setUpgrading(r);

  const header =
  <div className="page-header">
      <div>
        <div className="eyebrow">Library</div>
        <h1 className="page-title">Resources</h1>
        <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>All of your resources, organized and ready when you need them.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ position: 'relative', width: 320 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by title or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <TourStatusBadge completed={tourCompleted} onRetake={onStartTour} />
      </div>
    </div>;


  // Empty state — no published resources visible to this member at all.
  if (!loading && rows.length === 0) {
    return (
      <>
        {header}
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center', display: 'grid', placeItems: 'center', gap: 16, color: 'var(--text-3)', marginTop: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--bg-sunken)', color: 'var(--text-2)' }}>
            <Icon name="resources" size={30} stroke={1.4} />
          </div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, color: 'var(--text-1)' }}>Hang on tight</div>
          <div style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.55 }}>Resources will be added to the library shortly.</div>
        </div>
      </>);

  }

  return (
    <>
      {header}

      {/* Recently added */}
      {recent.length > 0 &&
      <div style={{ marginBottom: 32 }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="eyebrow">Recently added</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {recent.map(({ r, state }) => <ResourceCard key={r.id} r={r} state={state} onOpen={openCard} onLocked={lockCard} />)}
          </div>
        </div>
      }

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Folders</div>
          <div className="stack" style={{ gap: 2 }}>
            {visibleFolders.map((key) =>
            <button key={key} className={"sb-item" + (folder === key ? " active" : "")}
            onClick={() => setFolder(key)}
            style={{ padding: '9px 12px', fontSize: 13 }}>
                <span className="sb-icon"><Icon name="folder" size={15} /></span>
                <span style={{ flex: 1, textAlign: 'left' }}>{RES_FOLDER_LABEL[key]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{folderCount(key)}</span>
              </button>
            )}
          </div>

          {subjects.length > 0 &&
          <>
              <div className="eyebrow" style={{ marginTop: 20, marginBottom: 10 }}>Subject area</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subjects.map((s) => {
                const active = subjectFilter === s;
                return (
                  <span key={s} className="chip" onClick={() => setSubjectFilter(active ? null : s)}
                  style={{
                    background: active ? SUBJECTS[s] || 'var(--text-3)' : (SUBJECTS[s] || '#888') + '14',
                    color: active ? '#fff' : SUBJECTS[s] || '#888',
                    borderColor: (SUBJECTS[s] || '#888') + '33', fontSize: 10, cursor: 'pointer' }}>{s}</span>);

              })}
              </div>
            </>
          }
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            {RES_FOLDER_LABEL[folder]} · <span style={{ color: 'var(--text-3)' }}>{filtered.length}</span>
            {subjectFilter && <span style={{ color: 'var(--text-3)' }}> · {subjectFilter} <button onClick={() => setSubjectFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 11 }}>clear</button></span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map(({ r, state }) => <ResourceCard key={r.id} r={r} state={state} onOpen={openCard} onLocked={lockCard} />)}
          </div>
          {!loading && filtered.length === 0 &&
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              No resources {q || subjectFilter ? 'match your filters' : 'in this folder yet'}.
            </div>
          }
        </div>
      </div>

      {viewing && <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />}
      {upgrading && <ResourceUpgrade resource={upgrading} onClose={() => setUpgrading(null)} />}
    </>);

}

Object.assign(window, { ResourcesScreen });