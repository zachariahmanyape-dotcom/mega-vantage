// Resources screen — library with folders, search, recently added

const FOLDERS = [
{ id: 'all', label: 'All resources', count: 48 },
{ id: 'found', label: 'Foundations', count: 18 },
{ id: 'break', label: 'Breakthrough', count: 12 },
{ id: 'mgmt', label: 'Management', count: 9 },
{ id: 'habits', label: 'Habit systems', count: 6 },
{ id: 'money', label: 'Life / Money', count: 3 }];


function ResourceCard({ r, compact }) {
  const color = SUBJECTS[r.subject] || '#888';
  const typeIcon = r.type === 'video' ? 'video' : r.type === 'doc' ? 'doc' : 'link';
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform .14s ease, box-shadow .14s ease' }}
    onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px)';e.currentTarget.style.boxShadow = 'var(--shadow-2)';}}
    onMouseLeave={(e) => {e.currentTarget.style.transform = '';e.currentTarget.style.boxShadow = '';}}>
      {r.type === 'video' ?
      <div className="ph-img" style={{ aspectRatio: '16/9', borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(10,10,10,0.7)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <Icon name="play" size={16} />
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(10,10,10,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--ff-sub)' }}>{r.length}</div>
        </div> :

      <div style={{
        aspectRatio: '16/9',
        background: color + '12',
        borderBottom: '1px solid var(--border)',
        display: 'grid', placeItems: 'center',
        color: color
      }}>
          <Icon name={typeIcon} size={40} stroke={1.2} />
        </div>
      }
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <SubjectTag subject={r.subject} />
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--ff-sub)', letterSpacing: '0.08em' }}>{r.addedDays}d ago</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{r.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="folder" size={11} /> {r.folder}
        </div>
      </div>
    </div>);

}

function ResourcesScreen({ onStartTour, tourCompleted }) {
  const [folder, setFolder] = useState('all');
  const [q, setQ] = useState('');
  const filtered = RESOURCES.filter((r) =>
  (folder === 'all' || r.folder.toLowerCase().includes(folder.slice(0, 4))) && (
  q === '' || r.title.toLowerCase().includes(q.toLowerCase()))
  );
  const recent = [...RESOURCES].sort((a, b) => a.addedDays - b.addedDays).slice(0, 3);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Library</div>
          <h1 className="page-title">Resources</h1>
          <div className="page-sub" style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: 560 }}>All of your resources, organized and ready when you need them.

          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by title or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <TourStatusBadge completed={tourCompleted} onRetake={onStartTour} />
        </div>
      </div>

      {/* Recently added */}
      <div style={{ marginBottom: 32 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="eyebrow">Recently added</div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Last 14 days</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {recent.map((r) => <ResourceCard key={r.id} r={r} />)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Folders</div>
          <div className="stack" style={{ gap: 2 }}>
            {FOLDERS.map((f) =>
            <button key={f.id} className={"sb-item" + (folder === f.id ? " active" : "")}
            onClick={() => setFolder(f.id)}
            style={{ padding: '9px 12px', fontSize: 13 }}>
                <span className="sb-icon"><Icon name="folder" size={15} /></span>
                <span style={{ flex: 1, textAlign: 'left' }}>{f.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{f.count}</span>
              </button>
            )}
          </div>

          <div className="eyebrow" style={{ marginTop: 20, marginBottom: 10 }}>Subject area</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(SUBJECTS).slice(0, 8).map((s) =>
            <span key={s} className="chip" style={{
              background: SUBJECTS[s] + '14', color: SUBJECTS[s], borderColor: SUBJECTS[s] + '33',
              fontSize: 10
            }}>{s}</span>
            )}
            <span className="chip">+5 more</span>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            {folder === 'all' ? 'All resources' : FOLDERS.find((f) => f.id === folder).label} · <span style={{ color: 'var(--text-3)' }}>{filtered.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map((r) => <ResourceCard key={r.id} r={r} />)}
          </div>
          {filtered.length === 0 &&
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
              No resources match "{q}" in this folder.
            </div>
          }
        </div>
      </div>
    </>);

}

Object.assign(window, { ResourcesScreen });