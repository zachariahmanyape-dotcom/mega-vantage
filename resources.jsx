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
// Mint a short-lived signed URL for a directly-uploaded file in the private
// `resource-files` bucket. Returns null on failure (caller falls back to url).
async function resSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await window._supabase.storage
    .from('resource-files').createSignedUrl(path, 60 * 60);
  if (error) { console.error('resource signed url', error); return null; }
  return data ? data.signedUrl : null;
}
// Resolve the effective URL to render/open: signed URL for uploaded files,
// otherwise the external link. Returns a shallow copy with `url` filled in.
async function resResolve(r) {
  if (r && r.storage_path) {
    const signed = await resSignedUrl(r.storage_path);
    if (signed) return { ...r, url: signed };
  }
  return r;
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
  resRelTime, resVideoEmbed, resPdfEmbed, resDomain, resUserType, resVisibleFolders, resCardState,
  resSignedUrl, resResolve });

// ============================================================
// DEMO FALLBACK — preview-only sample library.
// Renders ONLY when the live `resources` table returns 0 rows,
// so you can preview the 3D library design before real content
// is published. No DB writes. Delete this block (and the
// RES_DEMO_FALLBACK usage in ResourcesScreen) to remove.
// ============================================================
const RES_DEMO_FALLBACK = false;
const _demoDays = (n) => new Date(Date.now() - n * 86400000).toISOString();
const RES_DEMO = [
  { id: 'demo-1', title: 'Mastering Professional Email', description: 'A practical walkthrough of structuring emails that get replies — subject lines, openers, asks, and sign-offs that read as confident, not pushy.', content_type: 'video', folder: 'foundations', subject_area: 'Professional Communication', access_tier: 'foundations', url: 'https://www.youtube.com/watch?v=arj7oStGLkU', thumbnail_url: null, duration_minutes: 18, published: true, created_at: _demoDays(1) },
  { id: 'demo-2', title: 'The One-Page CV Template', description: 'A recruiter-tested one-page CV layout with annotated guidance on what to include in each section and what to cut.', content_type: 'pdf', folder: 'foundations', subject_area: 'CV Development', access_tier: 'foundations', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', thumbnail_url: null, duration_minutes: null, published: true, created_at: _demoDays(3) },
  { id: 'demo-3', title: 'Why Small Wins Compound', description: 'On the psychology of momentum: how stacking tiny, visible wins rewires motivation and beats relying on willpower.', content_type: 'article', folder: 'foundations', subject_area: 'Growth Mindset', access_tier: 'foundations', url: 'https://jamesclear.com/small-habits', thumbnail_url: null, duration_minutes: null, published: true, created_at: _demoDays(5) },
  { id: 'demo-4', title: 'Weekly Planning Template', description: 'A simple, repeatable weekly planning sheet — priorities, time blocks, and a Friday reflection prompt.', content_type: 'template', folder: 'foundations', subject_area: 'Time Management', access_tier: 'foundations', url: 'https://www.notion.so', thumbnail_url: null, duration_minutes: null, published: true, created_at: _demoDays(8) },
  { id: 'demo-5', title: 'Building Your LinkedIn Presence', description: 'Turn a dormant profile into a magnet for opportunities — headline, about section, and a posting cadence you can sustain.', content_type: 'video', folder: 'foundations', subject_area: 'Personal Branding', access_tier: 'foundations', url: 'https://www.youtube.com/watch?v=arj7oStGLkU', thumbnail_url: null, duration_minutes: 24, published: true, created_at: _demoDays(11) },
  { id: 'demo-6', title: 'Closing High-Value Deals', description: 'A framework for navigating the final stretch of a deal — handling objections, creating urgency, and asking for the close.', content_type: 'video', folder: 'breakthrough', subject_area: 'Strategic Sales', access_tier: 'breakthrough', url: 'https://www.youtube.com/watch?v=arj7oStGLkU', thumbnail_url: null, duration_minutes: 32, published: true, created_at: _demoDays(13) },
  { id: 'demo-7', title: 'Commanding the Room', description: 'Presence techniques for high-stakes presentations — voice, pacing, and the structure of a memorable talk.', content_type: 'article', folder: 'breakthrough', subject_area: 'Public Speaking & Presentation', access_tier: 'breakthrough', url: 'https://hbr.org', thumbnail_url: null, duration_minutes: null, published: true, created_at: _demoDays(16) },
  { id: 'demo-8', title: 'The Management Operating Model', description: 'How high-performing teams run their week — rituals, metrics, and decision rights that scale.', content_type: 'pdf', folder: 'mega_management', subject_area: 'Consulting', access_tier: 'mega_management', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', thumbnail_url: null, duration_minutes: null, published: true, created_at: _demoDays(20) },
];

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
          <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>open_in_new</span> Open PDF
        </a>
      </div>;

  } else {
    // template / article — designed preview card, opens in new tab.
    const isArticle = r.content_type === 'article';
    body =
    <div className="card" style={{ padding: 32, textAlign: 'center', display: 'grid', placeItems: 'center', gap: 14, background: 'var(--bg-sunken)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, display: 'grid', placeItems: 'center', background: subjColor + '1A', color: subjColor }}>
          <span className="material-symbols-outlined" style={{fontSize:26,lineHeight:1}}>{isArticle ? 'article' : 'description'}</span>
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
          <span className="material-symbols-outlined" style={{fontSize:13,lineHeight:1}}>open_in_new</span> {isArticle ? 'Read Article' : 'Open Template'}
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
              <span className="chip"><span className="material-symbols-outlined" style={{fontSize:11,lineHeight:1}}>{r.content_type === 'video' ? 'videocam' : r.content_type === 'pdf' ? 'picture_as_pdf' : r.content_type === 'template' ? 'description' : 'article'}</span> {RES_TYPE_META[r.content_type].label}</span>
              {r.duration_minutes ? <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{r.duration_minutes} min</span> : null}
            </div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1 }}>close</span></button>
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
          <span className="material-symbols-outlined" style={{fontSize:24,lineHeight:1}}>lock</span>
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

// Book "byline" — we have no authors, so use the subject area (imprint feel),
// falling back to the folder label or MEGA.
function resByline(r) {
  return r.subject_area || RES_FOLDER_LABEL[r.folder] || 'MEGA';
}
// Self-contained book colour: subject hue, darkened so cream text always reads.
function resBookColor(r) {
  return SUBJECTS[r.subject_area] || '#5B6472';
}

// ---------- Library grid item: a forward-facing book cover with a 3D tilt ----------
function ResourceCover({ r, state, onOpen, onLocked }) {
  const locked = state === 'locked';
  const color = resBookColor(r);
  const ref = React.useRef(null);
  const click = () => { if (locked) { onLocked(r); return; } onOpen(r); };
  const typeIcon = r.content_type === 'video' ? 'videocam' : r.content_type === 'pdf' ? 'picture_as_pdf' : r.content_type === 'template' ? 'description' : 'article';

  // Pointer-tracked 3D tilt (direct style mutation — no per-move re-render).
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.transform = `rotateY(${(px - 0.5) * 18}deg) rotateX(${(0.5 - py) * 18}deg) translateZ(16px)`;
    el.style.setProperty('--mx', px * 100 + '%');
    el.style.setProperty('--my', py * 100 + '%');
  };
  const onLeave = () => { const el = ref.current; if (el) el.style.transform = ''; };

  return (
    <div className="rb-cover-wrap">
      <div ref={ref} className={"rb-cover" + (locked ? " locked" : "")} onClick={click} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ backgroundColor: color, backgroundImage: 'linear-gradient(155deg, rgba(255,255,255,0.18), rgba(0,0,0,0.55))' }}>
        <span className="material-symbols-outlined rb-cover-watermark" style={{ fontSize: 120, lineHeight: 1 }}>{typeIcon}</span>
        <div className="rb-cover-inner">
          <div className="rb-cover-top">
            <span className="rb-cover-type"><span className="material-symbols-outlined" style={{ fontSize: 12, lineHeight: 1 }}>{typeIcon}</span>{r.content_type === 'video' && r.duration_minutes ? r.duration_minutes + ' min' : RES_TYPE_META[r.content_type].label}</span>
            <span className="rb-cover-mark">V</span>
          </div>
          <div className="rb-cover-byline">{resByline(r)}</div>
          <div className="rb-cover-title">{r.title}</div>
        </div>
        {locked &&
        <div className="rb-cover-lock"><span className="material-symbols-outlined" style={{ fontSize: 30, lineHeight: 1 }}>lock</span></div>
        }
        <div className="rb-cover-glare" />
      </div>
    </div>);

}

// ---------- Standing 3D book (cover + spine + page edges) for the detail view ----------
function ResourceBook3D({ r, w = 300, h = 420, d = 46 }) {
  const color = resBookColor(r);
  return (
    <div className="rb-book" style={{ '--bw': w + 'px', '--bh': h + 'px', '--bd': d + 'px' }}>
      <div className="rb-book__inner">
        <div className="rb-book__cover" style={{ backgroundColor: color, backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,0.16), rgba(0,0,0,0.55))' }}>
          <div className="rb-book__mark">V</div>
          <div className="rb-book__title">{r.title}</div>
          <div className="rb-book__byline">{resByline(r)}</div>
        </div>
      </div>
    </div>);

}

// ---------- Detail "sub-page" (Stripe Press style) ----------
function ResourceDetail({ r, onBack, onOpenContent }) {
  const isArticle = r.content_type === 'article';
  const isLink = r.content_type === 'template' || isArticle;
  const meta = RES_TYPE_META[r.content_type] || RES_TYPE_META.article;
  const typeIcon = r.content_type === 'video' ? 'videocam' : r.content_type === 'pdf' ? 'picture_as_pdf' : r.content_type === 'template' ? 'description' : 'article';
  const ctaLabel = r.content_type === 'video' ? 'Watch now' : r.content_type === 'pdf' ? 'Open document' : isArticle ? 'Read article' : 'Open template';
  return (
    <div>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 24 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, lineHeight: 1 }}>arrow_back</span> Back to library
      </button>
      <div className="rb-detail">
        <div style={{ display: 'grid', placeItems: 'center', padding: '24px 0' }}>
          <ResourceBook3D r={r} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className="chip"><span className="material-symbols-outlined" style={{ fontSize: 11, lineHeight: 1 }}>{typeIcon}</span> {meta.label}</span>
            {r.duration_minutes ? <span className="chip"><span className="material-symbols-outlined" style={{ fontSize: 11, lineHeight: 1 }}>schedule</span> {r.duration_minutes} min</span> : null}
            {r.subject_area && <SubjectTag subject={r.subject_area} />}
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)' }}>{resRelTime(r.created_at)}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--ff-heading)', fontWeight: 800, fontSize: 38, lineHeight: 1.08, letterSpacing: '-0.02em', margin: 0, color: 'var(--text)' }}>{r.title}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>folder</span>{RES_FOLDER_LABEL[r.folder] || r.folder}
          </div>
          {r.description &&
          <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, marginTop: 20, maxWidth: 560 }}>{r.description}</p>
          }
          <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            {isLink ?
            <a className="btn primary" href={r.url} target="_blank" rel="noopener noreferrer" onClick={() => window.logResourceView(r.id)}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>open_in_new</span> {ctaLabel}
              </a> :
            <button className="btn primary" onClick={() => onOpenContent(r)}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>{r.content_type === 'video' ? 'play_arrow' : 'visibility'}</span> {ctaLabel}
              </button>
            }
            <button className="btn" onClick={onBack}>Back to library</button>
          </div>
        </div>
      </div>
    </div>);

}

function ResourcesScreen({ member, adminAll, onStartTour, tourCompleted }) {
  // Admins (when not impersonating) see every folder + full access to all cards.
  const userType = adminAll ? 'mega_management' : resUserType(member);
  const visibleFolders = resVisibleFolders(userType);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState(visibleFolders[0]);
  const [q, setQ] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sharedIds, setSharedIds] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const uid = await window.getActiveUserId();
      const [{ data, error }, asg] = await Promise.all([
        window._supabase.from('resources').select('*').
          eq('published', true).
          order('created_at', { ascending: false }),
        window._supabase.from('resource_assignments').select('resource_id').eq('member_id', uid)]);
      if (!alive) return;
      // Resources assigned directly to this member (bespoke, tier-independent).
      const shared = new Set((asg.data || []).map((a) => a.resource_id));
      setSharedIds(shared);
      if (error) {console.error('resources load', error);setRows([]);} else
      {
        // A shared row is always shown; otherwise apply the tier card-state.
        setRows((data || []).filter((r) => shared.has(r.id) || resCardState(r, userType) !== 'hidden'));
      }
      setLoading(false);
    })();
    return () => {alive = false;};
  }, [userType]);

  // First time bespoke resources appear, open that folder so the member sees them.
  const autoSharedRef = React.useRef(false);
  useEffect(() => {
    if (!autoSharedRef.current && sharedIds.size > 0) { autoSharedRef.current = true; setFolder('shared'); }
  }, [sharedIds]);

  // DEMO FALLBACK: if the live table is empty, preview with sample books.
  const baseRows = (!loading && rows.length === 0 && RES_DEMO_FALLBACK)
    ? RES_DEMO.filter((r) => resCardState(r, userType) !== 'hidden')
    : rows;

  // Shared (bespoke) resources are surfaced in their own folder and excluded
  // from the tier folders so they don't double-count.
  const withState = baseRows.map((r) => ({ r, state: sharedIds.has(r.id) ? 'open' : resCardState(r, userType), shared: sharedIds.has(r.id) }));
  const hasShared = withState.some(({ shared }) => shared);
  const recent = withState.filter(({ shared }) => !shared).slice(0, 3);
  const subjects = [...new Set(baseRows.map((r) => r.subject_area).filter(Boolean))];

  const isSharedFolder = folder === 'shared';
  const filtered = withState.filter(({ r, shared }) =>
  (isSharedFolder ? shared : r.folder === folder && !shared) && (
  !subjectFilter || r.subject_area === subjectFilter) && (
  q === '' || r.title.toLowerCase().includes(q.toLowerCase()) || (r.subject_area || '').toLowerCase().includes(q.toLowerCase()))
  );
  const folderCount = (key) => key === 'shared'
    ? withState.filter(({ shared }) => shared).length
    : withState.filter(({ r, shared }) => r.folder === key && !shared).length;

  // Uploaded files need a signed URL minted before the detail/viewer can render.
  const openCard = async (r) => setSelected(await resResolve(r)); // spine click → detail sub-page
  const lockCard = (r) => setUpgrading(r);
  const openContent = (r) => { window.logResourceView(r.id); setViewing(r); }; // detail CTA → player

  const header =
  <div className="page-header" style={{ marginBottom: 24 }}>
      <div>
        <div className="page-eyebrow">Library</div>
        <h1 className="page-title xl" style={{ margin: '6px 0 0', color: 'var(--text)' }}>Resources</h1>
        <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.6, opacity: 0.8 }}>All of your resources, organized and ready when you need them.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 300 }}>
          <span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1,position:'absolute',left:12,top:12,color:'var(--text-3)'}}>search</span>
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by title or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <TourStatusBadge completed={tourCompleted} onRetake={onStartTour} />
      </div>
    </div>;


  // Empty state — no published resources visible to this member at all.
  if (!loading && baseRows.length === 0) {
    return (
      <>
        {header}
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center', display: 'grid', placeItems: 'center', gap: 16, color: 'var(--text-3)', marginTop: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--bg-sunken)', color: 'var(--text-2)' }}>
            <span className="material-symbols-outlined" style={{fontSize:30,lineHeight:1}}>menu_book</span>
          </div>
          <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, color: 'var(--text-1)' }}>Hang on tight</div>
          <div style={{ fontSize: 14, maxWidth: 380, lineHeight: 1.55 }}>Resources will be added to the library shortly.</div>
        </div>
      </>);

  }

  // Detail "sub-page" replaces the library browse area when a book is opened.
  if (selected) {
    return (
      <>
        {header}
        <ResourceDetail r={selected} onBack={() => setSelected(null)} onOpenContent={openContent} />
        {viewing && <ResourceViewer resource={viewing} onClose={() => setViewing(null)} />}
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
          <div className="rb-grid">
            {recent.map(({ r, state }) => <ResourceCover key={r.id} r={r} state={state} onOpen={openCard} onLocked={lockCard} />)}
          </div>
        </div>
      }

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Folders</div>
          <div className="stack" style={{ gap: 2 }}>
            {hasShared &&
            <button className={"sb-item" + (folder === 'shared' ? " active" : "")}
            onClick={() => setFolder('shared')}
            style={{ padding: '9px 12px', fontSize: 13 }}>
                <span className="sb-icon"><span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1,color:'var(--coral)'}}>workspace_premium</span></span>
                <span style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>Shared with you</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{folderCount('shared')}</span>
              </button>
            }
            {visibleFolders.map((key) =>
            <button key={key} className={"sb-item" + (folder === key ? " active" : "")}
            onClick={() => setFolder(key)}
            style={{ padding: '9px 12px', fontSize: 13 }}>
                <span className="sb-icon"><span className="material-symbols-outlined" style={{fontSize:15,lineHeight:1}}>folder</span></span>
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
            {isSharedFolder ? 'Shared with you' : RES_FOLDER_LABEL[folder]} · <span style={{ color: 'var(--text-3)' }}>{filtered.length}</span>
            {subjectFilter && <span style={{ color: 'var(--text-3)' }}> · {subjectFilter} <button onClick={() => setSubjectFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 11 }}>clear</button></span>}
          </div>
          <div className="rb-grid">
            {filtered.map(({ r, state }) => <ResourceCover key={r.id} r={r} state={state} onOpen={openCard} onLocked={lockCard} />)}
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