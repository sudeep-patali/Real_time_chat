import { useUiStore } from '../store/uiStore'

function MediaPreview({ mediaUrl, mediaType }) {
  const activeModal = useUiStore(state => state.activeModal)
  const closeModal = useUiStore(state => state.closeModal)

  if (activeModal !== 'mediaPreview') return null

  return (
    <div style={styles.overlay} onClick={closeModal}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        <button style={styles.closeBtn} onClick={closeModal}>✕</button>

        {mediaType === 'image' ? (
          <img
            src={mediaUrl}
            alt='preview'
            style={styles.image}
          />
        ) : (
          <div style={styles.filePreview}>
            <p style={styles.fileIcon}>📄</p>
            <p style={styles.fileName}>{mediaUrl?.split('/').pop()}</p>
            <a
              href={mediaUrl}
              download
              style={styles.downloadBtn}
            >
              ⬇ Download File
            </a>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  modal: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
  },
  closeBtn: {
    position: 'absolute',
    top: '-40px',
    right: '0',
    background: 'none',
    color: '#fff',
    fontSize: '20px',
    padding: '4px 8px',
  },
  image: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    borderRadius: '8px',
    objectFit: 'contain',
  },
  filePreview: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
  },
  fileIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  fileName: {
    fontSize: '16px',
    color: 'var(--color-text)',
    marginBottom: '24px',
  },
  downloadBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  }
}

export default MediaPreview