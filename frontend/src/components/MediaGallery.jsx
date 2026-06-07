import { useState } from 'react'

const formatBytes = (b) => {
  if (!b) return ''
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// Full-screen image / video preview
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
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn:{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', zIndex: 501 },
  content: { maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  media:   { maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' },
}

export default function MediaGallery({ media = [], documents = [] }) {
  const [tab,      setTab]      = useState('media')     // 'media' | 'docs'
  const [lightbox, setLightbox] = useState(null)

  const docIcon = (item) => {
    const ext = (item.fileName || item.fileUrl || '').split('.').pop()?.toLowerCase()
    if (ext === 'pdf')               return '📕'
    if (['doc','docx'].includes(ext)) return '📝'
    if (['xls','xlsx'].includes(ext)) return '📊'
    return '📄'
  }

  return (
    <>
      {lightbox && <LightBox item={lightbox} onClose={() => setLightbox(null)} />}

      {/* Tab bar */}
      <div style={g.tabs}>
        <button
          style={{ ...g.tab, ...(tab === 'media' ? g.tabActive : {}) }}
          onClick={() => setTab('media')}
        >
          Media
          {media.length > 0 && <span style={g.badge}>{media.length}</span>}
        </button>
        <button
          style={{ ...g.tab, ...(tab === 'docs' ? g.tabActive : {}) }}
          onClick={() => setTab('docs')}
        >
          Documents
          {documents.length > 0 && <span style={g.badge}>{documents.length}</span>}
        </button>
      </div>

      {/* Media grid */}
      {tab === 'media' && (
        media.length === 0
          ? <p style={g.empty}>No shared media yet</p>
          : (
            <div style={g.grid}>
              {media.map((item, i) => (
                <div
                  key={i}
                  style={g.thumb}
                  onClick={() => setLightbox(item)}
                  title='Click to preview'
                >
                  {item.type === 'video'
                    ? (
                      <div style={g.videoThumb}>
                        <video src={item.fileUrl} style={g.thumbMedia} muted />
                        <span style={g.playIcon}>▶</span>
                      </div>
                    )
                    : item.type === 'gif'
                    ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img
                          src={item.fileUrl}
                          alt='gif'
                          style={g.thumbMedia}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                        <span style={g.gifBadgeThumb}>GIF</span>
                      </div>
                    )
                    : (
                      <img
                        src={item.fileUrl}
                        alt='media'
                        style={g.thumbMedia}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    )
                  }
                </div>
              ))}
            </div>
          )
      )}

      {/* Documents list */}
      {tab === 'docs' && (
        documents.length === 0
          ? <p style={g.empty}>No shared documents yet</p>
          : (
            <div style={g.docList}>
              {documents.map((item, i) => (
                <a
                  key={i}
                  href={item.fileUrl}
                  download={item.fileName || true}
                  target='_blank'
                  rel='noreferrer'
                  style={g.docItem}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={g.docIcon}>{docIcon(item)}</span>
                  <div style={g.docMeta}>
                    <p style={g.docName}>{item.fileName || 'Document'}</p>
                    <p style={g.docSize}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {item.fileSize && ` · ${formatBytes(item.fileSize)}`}
                    </p>
                  </div>
                  <span style={g.downloadBtn}>⬇</span>
                </a>
              ))}
            </div>
          )
      )}
    </>
  )
}

const g = {
  tabs:      { display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 12 },
  tab:       { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 500, color: 'var(--color-text-dim)', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.15s' },
  tabActive: { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' },
  badge:     { background: 'var(--color-primary)', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' },
  empty:     { fontSize: 12, color: 'var(--color-text-dim)', textAlign: 'center', padding: '16px 0' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 },
  thumb:     { aspectRatio: '1', backgroundColor: 'var(--color-surface-2)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--color-border)', transition: 'opacity 0.15s' },
  thumbMedia:{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  videoThumb:{ position: 'relative', width: '100%', height: '100%' },
  playIcon:  { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 18 },
  gifBadgeThumb: { position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '1px 4px', letterSpacing: '0.4px' },
  docList:   { display: 'flex', flexDirection: 'column', gap: 2 },
  docItem:   { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.12s' },
  docIcon:   { fontSize: 24, flexShrink: 0 },
  docMeta:   { flex: 1, minWidth: 0 },
  docName:   { fontSize: 13, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  docSize:   { fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 },
  downloadBtn:{ fontSize: 14, color: 'var(--color-primary)', flexShrink: 0 },
}