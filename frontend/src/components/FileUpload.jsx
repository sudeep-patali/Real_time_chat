import { useRef } from 'react'
import { useMediaUpload } from '../hooks/useMediaUpload'

function FileUpload({ onUploadComplete, onClose }) {
  const inputRef = useRef(null)
  const {
    file,
    progress,
    uploadedUrl,
    error,
    uploading,
    selectFile,
    reset
  } = useMediaUpload()

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  const handleSelect = (e) => {
    const selected = e.target.files[0]
    if (selected) selectFile(selected)
  }

  const handleAttach = () => {
    onUploadComplete?.(uploadedUrl)
    reset()
    onClose?.()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <p style={styles.title}>Upload File</p>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Drop Zone */}
        {!file && (
          <div
            style={styles.dropZone}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <p style={styles.dropIcon}>📁</p>
            <p style={styles.dropText}>
              Drag and drop a file here
            </p>
            <p style={styles.dropSub}>
              or click to browse
            </p>
            <p style={styles.dropHint}>
              JPEG, PNG, GIF, PDF — max 10MB
            </p>
            <input
              ref={inputRef}
              type='file'
              accept='image/jpeg,image/png,image/gif,application/pdf'
              style={{ display: 'none' }}
              onChange={handleSelect}
            />
          </div>
        )}

        {/* Progress */}
        {file && (
          <div style={styles.fileInfo}>
            <div style={styles.fileRow}>
              <span style={styles.fileIcon}>
                {file.type.startsWith('image') ? '🖼️' : '📄'}
              </span>
              <div style={styles.fileMeta}>
                <p style={styles.fileName}>{file.name}</p>
                <p style={styles.fileSize}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!uploading && !uploadedUrl && (
                <button
                  style={styles.removeBtn}
                  onClick={reset}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${progress}%`
                  }}
                />
              </div>
            )}

            {/* Success */}
            {uploadedUrl && (
              <div style={styles.successRow}>
                <span style={styles.successText}>
                  ✅ Upload complete
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={styles.error}>{error}</p>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.attachBtn,
              opacity: uploadedUrl ? 1 : 0.4,
              cursor: uploadedUrl ? 'pointer' : 'not-allowed'
            }}
            onClick={handleAttach}
            disabled={!uploadedUrl}
          >
            Attach File
          </button>
        </div>

      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '420px',
    margin: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--color-text)',
  },
  closeBtn: {
    background: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '16px',
    padding: '4px',
  },
  dropZone: {
    border: '2px dashed var(--color-border)',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'border-color 0.2s',
  },
  dropIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  dropText: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text)',
    marginBottom: '4px',
  },
  dropSub: {
    fontSize: '13px',
    color: 'var(--color-primary)',
    marginBottom: '8px',
  },
  dropHint: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  fileInfo: {
    backgroundColor: 'var(--color-bg)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '20px',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  fileIcon: {
    fontSize: '24px',
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileSize: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  removeBtn: {
    background: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  progressTrack: {
    height: '4px',
    backgroundColor: 'var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  successRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successText: {
    fontSize: '13px',
    color: 'var(--color-success)',
  },
  error: {
    fontSize: '13px',
    color: 'var(--color-error)',
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  attachBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
  }
}

export default FileUpload