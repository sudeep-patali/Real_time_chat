import { useRef, useState, useCallback } from 'react'
import { uploadFile } from '../services/mediaService'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, MEDIA_TYPE_MAP } from '../utils/constants'
import { ImageIcon, Video, FileText, Film, X, Paperclip, Send, AlertCircle, Upload } from 'lucide-react'

const LIMITS = { image: 10, video: 4, document: 5, gif: 10 }

const formatBytes = (b) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`

// Raw mime-type lookup (ignores upload source — only used for thumbnail display)
const getRawMediaType = (file) => MEDIA_TYPE_MAP[file.type] || 'document'

// Effective media type for the file item — document mode always yields 'document'
const getEffectiveMediaType = (file, mode) => {
  if (mode === 'document') return 'document'
  return getRawMediaType(file)
}

const TypeIcon = ({ type, size = 20 }) => {
  if (type === 'image') return <ImageIcon size={size} />
  if (type === 'video') return <Video size={size} />
  if (type === 'gif')   return <Film size={size} />
  return <FileText size={size} />
}

let _uid = 0
const uid = () => `f${++_uid}`

export default function FileUpload({ onUploadComplete, onClose, mode = null, roomId = null }) {
  // mode: 'media' = images+videos only, 'document' = all files treated as docs, null = all
  // Document mode accepts images and videos too — they are stored as document cards
  const acceptStr = mode === 'media'
    ? 'image/*,video/mp4,video/webm,video/quicktime'
    : mode === 'document'
    ? 'image/*,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'
    : 'image/*,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'

  const modeLabel = mode === 'media' ? 'Images & Videos' : mode === 'document' ? 'Documents' : 'Files'
  const inputRef = useRef(null)
  const itemsRef             = useRef([])
  const [items, _setItems]   = useState([])
  const [sending, setSending] = useState(false)
  const [errors,  setErrors]  = useState([])
  const [dragging, setDragging] = useState(false)

  const setItems = useCallback((updater) => {
    _setItems(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      itemsRef.current = next
      return next
    })
  }, [])

  // ── Add files ────────────────────────────────────────────────────────
  const addFiles = useCallback((fileList) => {
    setErrors([])
    const incoming = Array.from(fileList)
    const rejected = []
    const toAdd    = []

    for (const file of incoming) {
      // In document mode, allow images and videos too (treated as documents)
      const isAllowedType = SUPPORTED_FILE_TYPES.includes(file.type) ||
        (mode === 'document' && (file.type.startsWith('image/') || file.type.startsWith('video/')))
      if (!isAllowedType) {
        rejected.push(`"${file.name}" — unsupported type`); continue
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`"${file.name}" — exceeds 50 MB`); continue
      }
      toAdd.push(file)
    }

    setItems(prev => {
      const next   = [...prev]
      const counts = {}
      for (const it of next) counts[it.mediaType] = (counts[it.mediaType] || 0) + 1

      const incomingCounts = {}
      for (const file of toAdd) {
        const mt = getEffectiveMediaType(file, mode)
        incomingCounts[mt] = (incomingCounts[mt] || 0) + 1
      }

      const blockedTypes = {}
      for (const [mt, inCount] of Object.entries(incomingCounts)) {
        const limit   = LIMITS[mt] ?? 5
        const current = counts[mt] || 0
        const total   = current + inCount
        if (total > limit) {
          blockedTypes[mt] = { limit, current, incoming: inCount, total }
        }
      }

      if (Object.keys(blockedTypes).length > 0) {
        const msgs = []
        for (const [mt, info] of Object.entries(blockedTypes)) {
          if (mt === 'image') {
            msgs.push(`You can upload a maximum of ${info.limit} images only. You currently have ${info.current} and tried to add ${info.incoming} more (total ${info.total}). Please reduce your selection.`)
          } else if (mt === 'video') {
            msgs.push(`You can upload a maximum of ${info.limit} videos only. You currently have ${info.current} and tried to add ${info.incoming} more. Please reduce your selection.`)
          } else if (mt === 'document') {
            msgs.push(`You can upload a maximum of ${info.limit} documents only. You currently have ${info.current} and tried to add ${info.incoming} more. Please reduce your selection.`)
          } else {
            msgs.push(`You can upload a maximum of ${info.limit} ${mt}s only. Please reduce your selection.`)
          }
        }
        setErrors(msgs)
        return prev
      }

      for (const file of toAdd) {
        const effectiveType = getEffectiveMediaType(file, mode)
        const rawType       = getRawMediaType(file)  // for thumbnail only
        next.push({
          id:           uid(),
          file,
          mediaType:    effectiveType,   // logical type (drives message type + bucket)
          rawMediaType: rawType,          // only used for thumbnail preview in the upload UI
          uploadSource: mode === 'document' ? 'document' : mode === 'media' ? 'media' : null,
          status:       'pending',
          progress:     0,
          url:          null,
          fileName:     file.name,
          mimeType:     file.type,
          error:        null,
        })
      }

      if (rejected.length) setErrors(rejected)
      return next
    })
  }, [setItems, mode])

  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id))

  // ── Upload one file ───────────────────────────────────────────────────
  const uploadOne = useCallback(async (item) => {
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'uploading', progress: 0 } : it))
    try {
      const res = await uploadFile(item.file, (p) => {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, progress: p } : it))
      }, item.uploadSource, roomId)
      const { url, fileName: fName, mimeType: mime } = res.data
      const updated = {
        ...item,
        status:   'done',
        url,
        fileName: fName || item.fileName,
        mimeType: mime  || item.mimeType,
        progress: 100,
      }
      setItems(prev => prev.map(it => it.id === item.id ? updated : it))
      return updated
    } catch {
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: 'Upload failed' } : it))
      return null
    }
  }, [setItems, roomId])

  // ── Send: upload pending → send all done ─────────────────────────────
  const handleSend = useCallback(async () => {
    setSending(true)
    try {
      const current = itemsRef.current
      const pending = current.filter(it => it.status === 'pending')
      const already = current.filter(it => it.status === 'done')

      const freshlyUploaded = await Promise.all(pending.map(uploadOne))
      const newDone = freshlyUploaded.filter(Boolean)

      const allToSend = [...already, ...newDone]
      for (const it of allToSend) {
        // msgType: what gets stored in message.type in DB
        // Document-source files always use 'file' type so they render as document cards
        let msgType
        if (it.uploadSource === 'document') {
          msgType = 'file'
        } else {
          msgType = it.mediaType === 'gif'   ? 'gif'
                  : it.mediaType === 'image' ? 'image'
                  : it.mediaType === 'video' ? 'video'
                  : 'file'
        }
        onUploadComplete?.({
          url:          it.url,
          mediaType:    msgType,
          fileName:     it.fileName,
          mimeType:     it.mimeType,
          uploadSource: it.uploadSource,
        })
      }

      onClose?.()
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setSending(false)
    }
  }, [uploadOne, onUploadComplete, onClose])

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const anyUploading = items.some(it => it.status === 'uploading')
  const doneCount    = items.filter(it => it.status === 'done').length
  const pendingCount = items.filter(it => it.status === 'pending').length
  const canSend      = (doneCount + pendingCount) > 0 && !anyUploading && !sending

  return (
    <div className="fu-overlay">
      <div className="fu-modal">

        {/* Header */}
        <div className="fu-header">
          <div className="fu-header-left">
            <Paperclip size={17} />
            <span className="fu-title">{modeLabel === 'Files' ? 'Share Files' : `Share ${modeLabel}`}</span>
          </div>
          <button className="fu-close-btn" onClick={onClose}><X size={17} /></button>
        </div>

        {/* Drop zone */}
        <div
          className={`fu-dropzone${dragging ? ' fu-dropzone--drag' : ''}`}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={20} className="fu-drop-icon" />
          <p className="fu-drop-text">{items.length === 0 ? 'Drag & drop or click to browse' : 'Click to add more files'}</p>
          <p className="fu-drop-hint">
            {mode === 'media'    ? 'Images (max 10) · Videos (max 4) · max 50 MB each' :
             mode === 'document' ? 'Any file type including images & videos · max 50 MB each · shown as document card' :
             'Images (10) · Videos (4) · Documents (5) · max 50 MB each'}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptStr}
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = '' }}
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="fu-global-error">
            <AlertCircle size={14} />
            <div>
              {errors.map((e, i) => <p key={i} className="fu-global-error-text">{e}</p>)}
            </div>
          </div>
        )}

        {/* File list */}
        {items.length > 0 && (
          <div className="fu-file-list">
            {items.map(item => (
              <div key={item.id} className={`fu-file-row fu-file-row--${item.status}`}>

                <div className="fu-file-thumb">
                  {/* Show image/video thumbnails in the picker UI regardless of upload source */}
                  {(item.rawMediaType === 'image' || item.rawMediaType === 'gif') ? (
                    <img src={URL.createObjectURL(item.file)} alt="" className="fu-thumb-img" />
                  ) : item.rawMediaType === 'video' ? (
                    <video src={URL.createObjectURL(item.file)} className="fu-thumb-img" />
                  ) : (
                    <div className="fu-thumb-icon"><TypeIcon type={item.mediaType} size={20} /></div>
                  )}
                </div>

                <div className="fu-file-info">
                  <p className="fu-file-name">{item.fileName}</p>
                  <p className="fu-file-meta">
                    {formatBytes(item.file.size)}
                    {/* Badge shows effective type; document-sourced images/videos show as 'document' */}
                    <span className="fu-type-badge">{item.mediaType}</span>
                    {item.uploadSource === 'document' && (item.rawMediaType === 'image' || item.rawMediaType === 'video') && (
                      <span className="fu-type-badge" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>via docs</span>
                    )}
                    {item.status === 'pending'   && <span className="fu-status-label fu-status-label--pending">Pending</span>}
                    {item.status === 'uploading' && <span className="fu-status-label fu-status-label--uploading">Uploading {item.progress}%</span>}
                    {item.status === 'done'      && <span className="fu-status-label fu-status-label--done">Ready</span>}
                    {item.status === 'error'     && <span className="fu-status-label fu-status-label--error">{item.error}</span>}
                  </p>
                  {item.status === 'uploading' && (
                    <div className="fu-progress-track">
                      <div className="fu-progress-bar" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                </div>

                <div className="fu-file-status">
                  {item.status === 'done' && <span className="fu-status-done">✓</span>}
                  {(item.status === 'pending' || item.status === 'error') && (
                    <button className="fu-remove-btn" onClick={() => removeItem(item.id)}>
                      <X size={13} />
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="fu-actions">
          <span className="fu-count-hint">
            {items.length === 0
              ? 'No files selected'
              : `${items.length} file${items.length !== 1 ? 's' : ''} selected`
            }
          </span>
          <div className="fu-action-btns">
            <button className="fu-cancel-btn" onClick={onClose} disabled={sending}>Cancel</button>
            <button
              className="fu-send-btn"
              onClick={handleSend}
              disabled={!canSend}
            >
              {sending
                ? <><span className="fu-btn-spinner" /> Sending…</>
                : <><Send size={13} /> Send{items.length > 1 ? ` (${items.length})` : ''}</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}