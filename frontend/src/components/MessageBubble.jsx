import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MoreVertical,
  Pencil,
  Info,
  Trash2,
  X,
  Copy,
  CornerUpLeft,
  Flag,
  Star,
  Ban,
  Mic,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
} from 'lucide-react'
import AudioPlayer from './AudioPlayer'
import { generateAvatar } from '../utils/generateAvatar'
import { sanitizeMessage } from '../utils/sanitizeMessage'
import { formatTime } from '../utils/formatTime'
import * as messageService from '../services/messageService'
import '../styles/chat.css'
import '../styles/message-ticks.css'

// ── WhatsApp-style tick icon ─────────────────────────────────────────────────
// status: 'sent' | 'delivered' | 'read'
// DO NOT MODIFY — production-quality SVG
function StatusTick({ status }) {
  if (!status || status === 'sent') {
    return (
      <svg className='msg-tick msg-tick--sent' viewBox='0 0 16 11' width='16' height='11'>
        <path d='M11.071.653a.75.75 0 0 1 .205 1.04l-5.5 8a.75.75 0 0 1-1.192.07l-2.5-3a.75.75 0 1 1 1.155-.96l1.87 2.243 4.921-7.16a.75.75 0 0 1 1.04-.233z'/>
      </svg>
    )
  }

  if (status === 'delivered') {
    return (
      <svg className='msg-tick msg-tick--delivered' viewBox='0 0 18 11' width='18' height='11'>
        <path d='M17.394.653a.75.75 0 0 1 .205 1.04l-5.5 8a.75.75 0 0 1-1.192.07l-.463-.556a14.42 14.42 0 0 0 .463-.714l.101-.171 4.345-6.32.041-.35z'/>
        <path d='M11.071.653a.75.75 0 0 1 .205 1.04l-5.5 8a.75.75 0 0 1-1.192.07l-2.5-3a.75.75 0 1 1 1.155-.96l1.87 2.243 4.921-7.16a.75.75 0 0 1 1.04-.233z'/>
      </svg>
    )
  }

  // read — blue double tick
  return (
    <svg className='msg-tick msg-tick--read' viewBox='0 0 18 11' width='18' height='11'>
      <path d='M17.394.653a.75.75 0 0 1 .205 1.04l-5.5 8a.75.75 0 0 1-1.192.07l-.463-.556a14.42 14.42 0 0 0 .463-.714l.101-.171 4.345-6.32.041-.35z' fill='#53bdeb'/>
      <path d='M11.071.653a.75.75 0 0 1 .205 1.04l-5.5 8a.75.75 0 0 1-1.192.07l-2.5-3a.75.75 0 1 1 1.155-.96l1.87 2.243 4.921-7.16a.75.75 0 0 1 1.04-.233z' fill='#53bdeb'/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function highlightText(text, query) {
  if (!query || !text) return sanitizeMessage(text)
  const safeText = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safeText.replace(new RegExp(`(${escapedQuery})`, 'gi'),
    '<mark class="search-highlight">$1</mark>')
}

function fmtDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── MessageInfo Modal ────────────────────────────────────────────────────────
function MessageInfoModal({ messageId, onClose }) {
  const [info,    setInfo]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!messageId) return
    setLoading(true)
    messageService.getMessageInfo(messageId)
      .then(res => { setInfo(res.data); setLoading(false) })
      .catch(() => { setError('Failed to load message info'); setLoading(false) })
  }, [messageId])

  const statusIcon = (s) => {
    if (s === 'read')      return <StatusTick status='read' />
    if (s === 'delivered') return <StatusTick status='delivered' />
    return <StatusTick status='sent' />
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal msg-info-modal' onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className='modal-header'>
          <span className='modal-title'>Message Info</span>
          <button className='btn btn-ghost btn-icon' onClick={onClose} aria-label='Close'>
            <X size={18} />
          </button>
        </div>

        {loading && <div className='msg-info-loading'>Loading…</div>}
        {error   && <div className='msg-info-error'>{error}</div>}

        {info && !loading && (
          <div className='modal-body msg-info-body'>

            {/* ── Common fields ── */}
            <div className='msg-info-section'>
              <div className='msg-info-section-title'>Details</div>
              <InfoRow label='Type'      value={info.type?.charAt(0).toUpperCase() + info.type?.slice(1)} />
              <InfoRow label='Sent'      value={fmtDateTime(info.sentAt)} />
              {!info.isGroup && (
                <>
                  <InfoRow label='Sender'    value={info.sender?.name} />
                  {info.receiver && <InfoRow label='Receiver'  value={info.receiver.name} />}
                  <InfoRow label='Delivered' value={fmtDateTime(info.deliveredAt)} />
                  <InfoRow label='Read'      value={fmtDateTime(info.readAt)} />
                  <div className='msg-info-status-row'>
                    <span className='msg-info-label'>Status</span>
                    <span className='msg-info-status-val'>
                      {statusIcon(info.status)}
                      <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{info.status}</span>
                    </span>
                  </div>
                </>
              )}
              {info.isGroup && (
                <>
                  <InfoRow label='Sender'    value={info.sender?.name} />
                  <InfoRow label='Delivered' value={fmtDateTime(info.deliveredAt)} />
                  <InfoRow label='Read'      value={fmtDateTime(info.readAt)} />
                  <div className='msg-info-status-row'>
                    <span className='msg-info-label'>Status</span>
                    <span className='msg-info-status-val'>
                      {statusIcon(info.status)}
                      <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>{info.status}</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ── Group member-wise status ── */}
            {info.isGroup && info.memberDetails?.length > 0 && (
              <div className='msg-info-section'>
                <div className='msg-info-section-title'>Member Status</div>
                {info.memberDetails.map(member => (
                  <div key={member.userId} className='msg-info-member-row'>
                    <div className='msg-info-member-left'>
                      {statusIcon(member.status)}
                      <span className='msg-info-member-name'>{member.name}</span>
                    </div>
                    <div className='msg-info-member-right'>
                      <span
                        className='msg-info-member-status'
                        style={{
                          color: member.status === 'read'
                            ? '#53bdeb'
                            : member.status === 'delivered'
                              ? 'var(--color-text-muted)'
                              : 'var(--color-text-dim)'
                        }}
                      >
                        {member.status === 'read'
                          ? `Read ${member.readAt ? new Date(member.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                          : member.status === 'delivered'
                            ? `Delivered ${member.deliveredAt ? new Date(member.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                            : 'Sent'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className='msg-info-row'>
      <span className='msg-info-label'>{label}</span>
      <span className='msg-info-val'>{value || '—'}</span>
    </div>
  )
}

// ── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, isOwn, searchQuery = '', isActiveMatch = false, isMatch = false, onEdit, onDelete }) {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [editText,    setEditText]    = useState(message.content)
  const [deleteModal, setDeleteModal] = useState(false)
  const [infoOpen,    setInfoOpen]    = useState(false)
  const [hovered,     setHovered]     = useState(false)

  const menuRef   = useRef(null)
  const editRef   = useRef(null)
  const hideTimer = useRef(null)
  const avatarSrc = generateAvatar(message.senderName || 'User')

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setHovered(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    if (editing) {
      editRef.current?.focus()
      const len = editRef.current?.value.length
      editRef.current?.setSelectionRange(len, len)
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setEditText(message.content)
  }, [message.content, editing])

  const handleMouseEnter = () => { clearTimeout(hideTimer.current); setHovered(true) }
  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => { if (!menuOpen) setHovered(false) }, 100)
  }

  const handleEditSave = () => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === message.content) { setEditing(false); return }
    onEdit?.(message.id, trimmed)
    setEditing(false)
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave() }
    if (e.key === 'Escape') { setEditText(message.content); setEditing(false) }
  }

  const handleDeleteChoice = (deleteFor) => {
    setDeleteModal(false)
    onDelete?.(message.id, deleteFor)
  }

  const handleCopy = useCallback(() => {
    if (message.type === 'text') {
      navigator.clipboard.writeText(message.content)
      setMenuOpen(false)
    }
  }, [message])

  // ── Deleted message ─────────────────────────────────────────────────────
  if (message.isDeleted) {
    return (
      <div className={`bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
        {!isOwn && <img src={avatarSrc} alt='' className='bubble-avatar' style={{ visibility: 'hidden' }} />}
        <div className={`bubble ${isOwn ? 'own' : 'other'}`} style={{ opacity: 0.55 }}>
          <span className='bubble-content bubble-deleted'>
            <Ban size={13} style={{ flexShrink: 0 }} />
            This message was deleted
          </span>
          <span className='bubble-meta'>
            <span className='bubble-time'>{formatTime(message.timestamp)}</span>
          </span>
        </div>
      </div>
    )
  }

  const canEdit   = isOwn && message.type === 'text' && !message.isDeleted
  const canDelete = !message.isDeleted
  const showMenu  = (hovered || menuOpen) && canDelete && !editing

  const getFileIcon = (ext) => {
    if (ext === 'pdf') return <FileText size={20} />
    if (['doc','docx'].includes(ext)) return <FileText size={20} />
    if (['xls','xlsx'].includes(ext)) return <FileSpreadsheet size={20} />
    if (['js','ts','jsx','tsx','py','java'].includes(ext)) return <FileCode size={20} />
    return <File size={20} />
  }

  const renderContent = () => {
    if (message.type === 'image') {
      return (
        <img
          src={message.fileUrl}
          alt='attachment'
          className='bubble-image'
          style={{ cursor: 'pointer' }}
          onClick={() => window.open(message.fileUrl, '_blank')}
        />
      )
    }

    if (message.type === 'gif') {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={message.fileUrl}
            alt='GIF'
            className='bubble-image'
            style={{ cursor: 'pointer' }}
            onClick={() => window.open(message.fileUrl, '_blank')}
          />
          <span className='bubble-gif-badge'>GIF</span>
        </div>
      )
    }

    if (message.type === 'video') {
      return (
        <video
          src={message.fileUrl}
          controls
          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block' }}
        />
      )
    }

    if (message.type === 'audio') {
      return (
        <div className='bubble-audio-wrap'>
          <Mic size={18} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
          <AudioPlayer src={message.fileUrl} totalDuration={message.fileDuration || 0} mimeType={message.mimeType || ''} />
        </div>
      )
    }

    if (message.type === 'file' || message.type === 'document') {
      const name = message.fileName || message.content || 'Download file'
      const ext  = name.split('.').pop()?.toLowerCase()
      return (
        <a href={message.fileUrl} download={name} target='_blank' rel='noreferrer'
          className={`bubble-file-link${isOwn ? ' own' : ''}`}>
          <span style={{ flexShrink: 0, color: 'var(--color-primary)' }}>
            {getFileIcon(ext)}
          </span>
          <span className='bubble-file-name'>{name}</span>
          <Download size={16} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
        </a>
      )
    }

    if (editing) {
      return (
        <div className='bubble-edit-wrap'>
          <textarea
            ref={editRef}
            className='bubble-edit-input'
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            rows={Math.min(editText.split('\n').length + 1, 6)}
            autoComplete='off'
            spellCheck
          />
          <div className='bubble-edit-actions'>
            <button
              className='bubble-edit-cancel'
              onClick={() => { setEditText(message.content); setEditing(false) }}
            >
              Cancel
            </button>
            <button className='bubble-edit-save' onClick={handleEditSave}>Save</button>
          </div>
        </div>
      )
    }

    const html = searchQuery ? highlightText(message.content, searchQuery) : sanitizeMessage(message.content)
    return <span className='bubble-content' dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <>
      <div
        className={`bubble-wrapper ${isOwn ? 'own' : 'other'}`}
        style={isMatch && !isActiveMatch ? { opacity: 0.6 } : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {!isOwn && (
          <img src={avatarSrc} alt={message.senderName || 'User'} className='bubble-avatar' />
        )}

        <div className={`bubble ${isOwn ? 'own' : 'other'}`} style={{ position: 'relative' }}>
          {!isOwn && message.senderName && (
            <span className='bubble-sender'>{message.senderName}</span>
          )}

          {renderContent()}

          {/* ── Meta: time + status ticks ── */}
          <span className='bubble-meta'>
            {message.isEdited && !editing && (
              <span className='bubble-edited-label'>edited</span>
            )}
            <span className='bubble-time'>{formatTime(message.timestamp)}</span>
            {isOwn && (
              <span className='bubble-tick-wrap'>
                <StatusTick status={message.status || 'sent'} />
              </span>
            )}
          </span>

          {/* ── Chevron menu trigger — appears on hover ── */}
          {showMenu && (
            <div
              ref={menuRef}
              className={`bubble-menu-anchor ${isOwn ? 'own' : 'other'}`}
            >
              <button
                className='bubble-menu-trigger'
                onClick={() => setMenuOpen(p => !p)}
                title='More options'
              >
                <MoreVertical size={14} />
              </button>

              {menuOpen && (
                <div className={`dropdown-menu bubble-dropdown ${isOwn ? 'own' : 'other'}`}>
                  {canEdit && (
                    <button
                      className='dropdown-item'
                      onClick={() => { setMenuOpen(false); setEditing(true) }}
                    >
                      <Pencil size={14} />
                      Edit Message
                    </button>
                  )}
                  {message.type === 'text' && (
                    <button
                      className='dropdown-item'
                      onClick={handleCopy}
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  )}
                  <button
                    className='dropdown-item'
                    onClick={() => { setMenuOpen(false) }}
                  >
                    <CornerUpLeft size={14} />
                    Reply
                  </button>
                  <button
                    className='dropdown-item'
                    onClick={() => { setMenuOpen(false) }}
                  >
                    <Star size={14} />
                    Star
                  </button>
                  {isOwn && (
                    <button
                      className='dropdown-item'
                      onClick={() => { setMenuOpen(false); setInfoOpen(true) }}
                    >
                      <Info size={14} />
                      Message Info
                    </button>
                  )}
                  <div className='dropdown-separator' />
                  <button
                    className='dropdown-item danger'
                    onClick={() => { setMenuOpen(false) }}
                  >
                    <Flag size={14} />
                    Report
                  </button>
                  <button
                    className='dropdown-item danger'
                    onClick={() => { setMenuOpen(false); setDeleteModal(true) }}
                  >
                    <Trash2 size={14} />
                    Delete Message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteModal && (
        <div className='modal-overlay' onClick={() => setDeleteModal(false)}>
          <div className='modal bubble-delete-modal' onClick={e => e.stopPropagation()}>
            <div className='modal-body'>
              <p className='bubble-delete-title'>Delete message?</p>
              <p className='bubble-delete-sub'>This action cannot be undone.</p>
            </div>
            <div className='modal-footer'>
              <button className='btn btn-ghost btn-sm' onClick={() => setDeleteModal(false)}>
                Cancel
              </button>
              <button className='btn btn-sm bubble-delete-me-btn' onClick={() => handleDeleteChoice('me')}>
                Delete for me
              </button>
              {isOwn && (
                <button className='btn btn-sm bubble-delete-all-btn' onClick={() => handleDeleteChoice('all')}>
                  Delete for everyone
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Message Info modal ── */}
      {infoOpen && (
        <MessageInfoModal messageId={message.id} onClose={() => setInfoOpen(false)} />
      )}
    </>
  )
}

export default MessageBubble