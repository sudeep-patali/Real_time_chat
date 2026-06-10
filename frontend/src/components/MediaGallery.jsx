import { useState, useMemo } from 'react'

const formatBytes = (b) => {
  if (!b) return ''
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ── Date group label logic ────────────────────────────────────────────────────
function getDateGroupLabel(dateStr) {
  if (!dateStr) return 'Unknown Date'
  const date = new Date(dateStr)
  const now   = new Date()

  const sameYear  = date.getFullYear() === now.getFullYear()
  const sameMonth = sameYear && date.getMonth() === now.getMonth()

  if (sameMonth) {
    // Current month → group by exact date
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const fileDay   = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (fileDay.getTime() === today.getTime())     return 'Today'
    if (fileDay.getTime() === yesterday.getTime()) return 'Yesterday'
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (sameYear) {
    // Previous months in current year → group by month name
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  // Previous years → group by year
  return String(date.getFullYear())
}

// ── Sort key for group labels (newest first) ──────────────────────────────────
function groupSortKey(label) {
  if (label === 'Today')     return Date.now()
  if (label === 'Yesterday') return Date.now() - 86400000
  // Try to parse "10 June 2026", "June 2026", or "2026"
  const parsed = Date.parse(label)
  return isNaN(parsed) ? 0 : parsed
}

// ── Group items by date label ─────────────────────────────────────────────────
function groupByDate(items) {
  const map = {}
  const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  for (const item of sorted) {
    const label = getDateGroupLabel(item.createdAt)
    if (!map[label]) map[label] = []
    map[label].push(item)
  }

  return Object.entries(map).sort(([a], [b]) => groupSortKey(b) - groupSortKey(a))
}

// ── Full-screen lightbox ──────────────────────────────────────────────────────
function LightBox({ item, onClose }) {
  if (!item) return null
  return (
    <div style={lb.overlay} onClick={onClose}>
      <button style={lb.closeBtn} onClick={onClose}>✕</button>
      <div style={lb.content} onClick={e => e.stopPropagation()}>
        {item.type === 'video'
          ? <video src={item.fileUrl} controls autoPlay style={lb.media} />
          : <img src={item.fileUrl} alt='preview' style={lb.media} />
        }
      </div>
    </div>
  )
}

const lb = {
  overlay:  { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', zIndex: 501 },
  content:  { maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  media:    { maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' },
}

// ── Date header ───────────────────────────────────────────────────────────────
function DateHeader({ label }) {
  return (
    <div style={s.dateHeader}>
      <span style={s.dateHeaderLine} />
      <span style={s.dateHeaderLabel}>{label}</span>
      <span style={s.dateHeaderLine} />
    </div>
  )
}

export default function MediaGallery({ media = [], documents = [] }) {
  const [tab,      setTab]      = useState('media')
  const [lightbox, setLightbox] = useState(null)

  const mediaGroups = useMemo(() => groupByDate(media),     [media])
  const docGroups   = useMemo(() => groupByDate(documents), [documents])

  const docIcon = (item) => {
    const ext = (item.fileName || item.fileUrl || '').split('.').pop()?.toLowerCase()
    if (ext === 'pdf')                return '📕'
    if (['doc','docx'].includes(ext)) return '📝'
    if (['xls','xlsx'].includes(ext)) return '📊'
    return '📄'
  }

  return (
    <>
      {lightbox && <LightBox item={lightbox} onClose={() => setLightbox(null)} />}

      {/* Tab bar */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(tab === 'media' ? s.tabActive : {}) }}
          onClick={() => setTab('media')}
        >
          Media
          {media.length > 0 && <span style={s.badge}>{media.length}</span>}
        </button>
        <button
          style={{ ...s.tab, ...(tab === 'docs' ? s.tabActive : {}) }}
          onClick={() => setTab('docs')}
        >
          Documents
          {documents.length > 0 && <span style={s.badge}>{documents.length}</span>}
        </button>
      </div>

      {/* ── Media tab ── */}
      {tab === 'media' && (
        media.length === 0
          ? <p style={s.empty}>No shared media yet</p>
          : (
            <div style={s.groupedContainer}>
              {mediaGroups.map(([label, items]) => (
                <div key={label} style={s.group}>
                  <DateHeader label={label} />
                  <div style={s.grid}>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        style={s.thumb}
                        onClick={() => setLightbox(item)}
                        title='Click to preview'
                      >
                        {item.type === 'video'
                          ? (
                            <div style={s.videoThumb}>
                              <video src={item.fileUrl} style={s.thumbMedia} muted />
                              <span style={s.playIcon}>▶</span>
                            </div>
                          )
                          : item.type === 'gif'
                          ? (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              <img
                                src={item.fileUrl}
                                alt='gif'
                                style={s.thumbMedia}
                                onError={e => { e.target.style.display = 'none' }}
                              />
                              <span style={s.gifBadge}>GIF</span>
                            </div>
                          )
                          : (
                            <img
                              src={item.fileUrl}
                              alt='media'
                              style={s.thumbMedia}
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          )
                        }
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* ── Documents tab ── */}
      {tab === 'docs' && (
        documents.length === 0
          ? <p style={s.empty}>No shared documents yet</p>
          : (
            <div style={s.groupedContainer}>
              {docGroups.map(([label, items]) => (
                <div key={label} style={s.group}>
                  <DateHeader label={label} />
                  <div style={s.docList}>
                    {items.map((item, i) => (
                      <a
                        key={i}
                        href={item.fileUrl}
                        download={item.fileName || true}
                        target='_blank'
                        rel='noreferrer'
                        style={s.docItem}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={s.docIcon}>{docIcon(item)}</span>
                        <div style={s.docMeta}>
                          <p style={s.docName}>{item.fileName || 'Document'}</p>
                          <p style={s.docSize}>
                            {new Date(item.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                            {item.fileSize && ` · ${formatBytes(item.fileSize)}`}
                          </p>
                        </div>
                        <span style={s.downloadBtn}>⬇</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </>
  )
}

const s = {
  tabs:             { display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 16 },
  tab:              { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 500, color: 'var(--color-text-dim)', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.15s' },
  tabActive:        { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' },
  badge:            { background: 'var(--color-primary)', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  empty:            { fontSize: 12, color: 'var(--color-text-dim)', textAlign: 'center', padding: '16px 0' },
  groupedContainer: { display: 'flex', flexDirection: 'column', gap: 20 },
  group:            { display: 'flex', flexDirection: 'column', gap: 8 },
  dateHeader:       { display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' },
  dateHeaderLine:   { flex: 1, height: 1, background: 'var(--color-border)' },
  dateHeaderLabel:  { fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.4px', textTransform: 'uppercase' },
  grid:             { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 },
  thumb:            { aspectRatio: '1', backgroundColor: 'var(--color-surface-2)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--color-border)', transition: 'opacity 0.15s' },
  thumbMedia:       { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  videoThumb:       { position: 'relative', width: '100%', height: '100%' },
  playIcon:         { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 18 },
  gifBadge:         { position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '1px 4px', letterSpacing: '0.4px' },
  docList:          { display: 'flex', flexDirection: 'column', gap: 2 },
  docItem:          { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.12s' },
  docIcon:          { fontSize: 24, flexShrink: 0 },
  docMeta:          { flex: 1, minWidth: 0 },
  docName:          { fontSize: 13, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  docSize:          { fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 },
  downloadBtn:      { fontSize: 14, color: 'var(--color-primary)', flexShrink: 0 },
}