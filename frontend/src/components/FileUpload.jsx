import { useRef } from 'react'
import { useMediaUpload } from '../hooks/useMediaUpload'

const TYPE_ICON = {
  image:    '🖼️',
  gif:      '🎞️',
  video:    '🎬',
  document: '📄',
}

const formatBytes = (bytes) => {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileUpload({ onUploadComplete, onClose, roomId }) {
  const inputRef = useRef(null)
  const {
    file, progress, uploadedUrl, mediaType, fileName, mimeType,
    error, uploading, selectFile, reset
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
    if (!uploadedUrl) return
    // Pass back url + type metadata so MessageInput can send correct message type
    onUploadComplete?.({ url: uploadedUrl, mediaType, fileName, mimeType })
    reset()
    onClose?.()
  }

  const isImage = mediaType === 'image'
  const isGif   = mediaType === 'gif'
  const isVideo = mediaType === 'video'

  return (
    <div style={st.overlay}>
      <div style={st.modal}>

        {/* Header */}
        <div style={st.header}>
          <span style={st.title}>Share Media or File</span>
          <button style={st.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Drop zone */}
        {!file && (
          <div
            style={st.dropZone}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <p style={st.dropIcon}>📎</p>
            <p style={st.dropText}>Drag and drop or click to browse</p>
            <p style={st.dropHint}>
              Images · Videos · PDF · Word · Excel · Text — up to 50 MB
            </p>
            <input
              ref={inputRef}
              type='file'
              accept='image/*,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'
              style={{ display: 'none' }}
              onChange={handleSelect}
            />
          </div>
        )}

        {/* File selected */}
        {file && (
          <div style={st.fileCard}>

            {/* Image preview */}
            {isImage && uploadedUrl && (
              <div style={st.previewWrap}>
                <img src={uploadedUrl} alt='preview' style={st.imagePreview} />
              </div>
            )}

            {/* GIF preview — show animated with badge */}
            {isGif && uploadedUrl && (
              <div style={{ ...st.previewWrap, position: 'relative' }}>
                <img src={uploadedUrl} alt='GIF preview' style={st.imagePreview} />
                <span style={st.gifBadge}>GIF</span>
              </div>
            )}

            {/* Video preview */}
            {isVideo && uploadedUrl && (
              <div style={st.previewWrap}>
                <video src={uploadedUrl} controls style={st.videoPreview} />
              </div>
            )}

            {/* File info row */}
            <div style={st.fileRow}>
              <span style={st.fileIcon}>{TYPE_ICON[mediaType] || '📄'}</span>
              <div style={st.fileMeta}>
                <p style={st.fileName}>{file.name}</p>
                <p style={st.fileSize}>
                  {formatBytes(file.size)}
                  {mediaType && <span style={st.typeBadge}>{mediaType}</span>}
                </p>
              </div>
              {!uploading && !uploadedUrl && (
                <button style={st.removeBtn} onClick={reset}>✕</button>
              )}
              {uploadedUrl && <span style={st.checkmark}>✅</span>}
            </div>

            {/* Progress bar */}
            {uploading && (
              <div style={st.progressTrack}>
                <div style={{ ...st.progressBar, width: `${progress}%` }} />
              </div>
            )}

            {/* Uploading label */}
            {uploading && (
              <p style={st.progressLabel}>Uploading… {progress}%</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p style={st.error}>{error}</p>}

        {/* Actions */}
        <div style={st.actions}>
          <button style={st.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...st.attachBtn, opacity: uploadedUrl ? 1 : 0.4, cursor: uploadedUrl ? 'pointer' : 'not-allowed' }}
            onClick={handleAttach}
            disabled={!uploadedUrl}
          >
            Send
          </button>
        </div>

      </div>
    </div>
  )
}

const st = {
  overlay:      { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, margin: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title:        { fontSize: 16, fontWeight: 600, color: 'var(--color-text)' },
  closeBtn:     { background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 16, cursor: 'pointer', padding: 4 },
  dropZone:     { border: '2px dashed var(--color-border)', borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' },
  dropIcon:     { fontSize: 34, marginBottom: 10 },
  dropText:     { fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 },
  dropHint:     { fontSize: 11, color: 'var(--color-text-dim)', lineHeight: 1.5 },
  fileCard:     { backgroundColor: 'var(--color-bg)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  previewWrap:  { borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', maxHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imagePreview: { maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 8 },
  videoPreview: { maxWidth: '100%', maxHeight: 220, borderRadius: 8 },
  gifBadge:     { position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.5px' },
  fileRow:      { display: 'flex', alignItems: 'center', gap: 12 },
  fileIcon:     { fontSize: 26, flexShrink: 0 },
  fileMeta:     { flex: 1, minWidth: 0 },
  fileName:     { fontSize: 13, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  fileSize:     { fontSize: 11, color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  typeBadge:    { backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '1px 6px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 },
  removeBtn:    { background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 14 },
  checkmark:    { fontSize: 18, flexShrink: 0 },
  progressTrack:{ height: 4, backgroundColor: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' },
  progressBar:  { height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.3s ease' },
  progressLabel:{ fontSize: 11, color: 'var(--color-text-dim)', textAlign: 'right' },
  error:        { fontSize: 13, color: 'var(--color-error)' },
  actions:      { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelBtn:    { padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' },
  attachBtn:    { padding: '9px 20px', borderRadius: 8, background: 'var(--color-primary)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}

export default FileUpload