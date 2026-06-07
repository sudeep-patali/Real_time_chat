import { useState, useRef, useEffect } from 'react'
import AudioPlayer from './AudioPlayer'
import { generateAvatar } from '../utils/generateAvatar'
import { sanitizeMessage } from '../utils/sanitizeMessage'
import { formatTime } from '../utils/formatTime'
import '../styles/chat.css'

function highlightText(text, query) {
  if (!query || !text) return sanitizeMessage(text)
  const safeText = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safeText.replace(new RegExp(`(${escapedQuery})`, 'gi'),
    '<mark class="search-highlight">$1</mark>')
}

function MessageBubble({ message, isOwn, searchQuery = '', isActiveMatch = false, isMatch = false, onEdit, onDelete }) {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [editText,    setEditText]    = useState(message.content)
  const [deleteModal, setDeleteModal] = useState(false)
  const [hovered,     setHovered]     = useState(false)

  const menuRef    = useRef(null)
  const editRef    = useRef(null)
  const hideTimer  = useRef(null)
  const avatarSrc  = generateAvatar(message.senderName || 'User')

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

  const handleMouseEnter = () => {
    clearTimeout(hideTimer.current)
    setHovered(true)
  }

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => {
      if (!menuOpen) setHovered(false)
    }, 100)
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

  // ── Deleted message ──
  if (message.isDeleted) {
    return (
      <div className={`bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
        {!isOwn && <img src={avatarSrc} alt='' className='bubble-avatar' style={{ visibility: 'hidden' }} />}
        <div className={`bubble ${isOwn ? 'own' : 'other'}`} style={{ opacity: 0.55 }}>
          <span className='bubble-content' style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>🚫</span> This message was deleted
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
          <span style={s.gifBadge}>GIF</span>
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
        <div style={s.audioBubble}>
          <span style={s.audioIcon}>🎤</span>
          <AudioPlayer src={message.fileUrl} totalDuration={message.fileDuration || 0} />
        </div>
      )
    }

    if (message.type === 'file' || message.type === 'document') {
      const name = message.fileName || message.content || 'Download file'
      const ext  = name.split('.').pop()?.toLowerCase()
      const icon = ext === 'pdf' ? '📕'
                 : ['doc','docx'].includes(ext) ? '📝'
                 : ['xls','xlsx'].includes(ext) ? '📊'
                 : '📄'
      return (
        <a
          href={message.fileUrl}
          download={name}
          target='_blank'
          rel='noreferrer'
          style={s.fileLink(isOwn)}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
          <span style={s.fileLinkName}>{name}</span>
          <span style={s.downloadIcon}>⬇</span>
        </a>
      )
    }

    if (editing) {
      return (
        <div style={s.editWrap}>
          <textarea
            ref={editRef}
            style={s.editInput}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            rows={Math.min(editText.split('\n').length + 1, 6)}
            autoComplete='off'
            spellCheck
          />
          <div style={s.editActions}>
            <button style={s.editCancel} onClick={() => { setEditText(message.content); setEditing(false) }}>
              Cancel
            </button>
            <button style={s.editSave} onClick={handleEditSave}>
              Save
            </button>
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

          <span className='bubble-meta'>
            {message.isEdited && !editing && (
              <span style={s.editedLabel}>edited</span>
            )}
            <span className='bubble-time'>{formatTime(message.timestamp)}</span>
            {isOwn && (
              <span className={`bubble-tick ${message.isRead ? 'read' : ''}`}>
                {message.isRead ? '✓✓' : '✓'}
              </span>
            )}
          </span>

          {/* ── Chevron/dot menu — inside the bubble, top-right corner ── */}
          {showMenu && (
            <div
              ref={menuRef}
              style={{
                ...s.menuAnchor,
                ...(isOwn ? s.menuAnchorOwn : s.menuAnchorOther),
              }}
            >
              <button
                style={s.menuTrigger}
                onClick={() => setMenuOpen(p => !p)}
                title='More options'
              >
                {/* Chevron-down icon like WhatsApp */}
                <svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M7 10l5 5 5-5z'/>
                </svg>
              </button>

              {menuOpen && (
                <div style={{ ...s.dropdown, ...(isOwn ? s.dropdownOwn : s.dropdownOther) }}>
                  {canEdit && (
                    <button
                      style={s.menuItem}
                      onClick={() => { setMenuOpen(false); setEditing(true) }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={s.menuIcon}>✏️</span> Edit Message
                    </button>
                  )}
                  <button
                    style={{ ...s.menuItem, ...s.menuItemDanger }}
                    onClick={() => { setMenuOpen(false); setDeleteModal(true) }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={s.menuIcon}>🗑️</span> Delete Message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div style={s.modalOverlay} onClick={() => setDeleteModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Delete message?</p>
            <p style={s.modalSub}>This action cannot be undone.</p>
            <div style={s.modalActions}>
              <button style={s.modalCancel} onClick={() => setDeleteModal(false)}>Cancel</button>
              <button style={s.modalDeleteMe} onClick={() => handleDeleteChoice('me')}>
                Delete for me
              </button>
              {isOwn && (
                <button style={s.modalDeleteAll} onClick={() => handleDeleteChoice('all')}>
                  Delete for everyone
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const s = {
  // ── Menu anchor: sits in top-right (own) or top-left (other) INSIDE the bubble ──
  menuAnchor: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  menuAnchorOwn: {
    right: 0,
    // Gradient fade on own (green/blue) bubbles
    background: 'linear-gradient(to left, var(--color-bubble-own, #005c4b) 60%, transparent)',
    borderTopRightRadius: 'inherit',
    paddingLeft: 14,
    paddingRight: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },
  menuAnchorOther: {
    right: 0,
    // Gradient fade on received bubbles
    background: 'linear-gradient(to left, var(--color-bubble-other, #1f2c34) 60%, transparent)',
    borderTopRightRadius: 'inherit',
    paddingLeft: 14,
    paddingRight: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },

  menuTrigger: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: 0,
    opacity: 0.85,
    transition: 'opacity 0.12s',
  },

  dropdown: {
    position: 'absolute',
    top: 24,
    zIndex: 100,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    minWidth: 170,
    overflow: 'hidden',
    animation: 'fadeSlideIn 0.12s ease',
  },
  dropdownOwn:   { right: 0 },
  dropdownOther: { right: 0 },

  menuItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
    padding: '10px 14px', background: 'transparent', border: 'none',
    color: 'var(--color-text)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.1s',
  },
  menuItemDanger: { color: 'var(--color-error)' },
  menuIcon: { fontSize: 14 },

  // Inline edit
  editWrap:    { display: 'flex', flexDirection: 'column', gap: 6 },
  editInput:   {
    background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, color: 'var(--color-text)', fontSize: 14, lineHeight: 1.45,
    padding: '6px 8px', resize: 'none', outline: 'none',
    fontFamily: 'inherit', width: '100%', minWidth: 160,
  },
  editActions: { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  editCancel:  {
    fontSize: 12, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--color-text-muted)',
  },
  editSave:    {
    fontSize: 12, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
    background: 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 600,
  },

  editedLabel: { fontSize: 10, color: 'var(--color-text-dim)', marginRight: 3, fontStyle: 'italic' },

  gifBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 4,
    padding: '1px 5px',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
  },

  // Audio voice message
  audioBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    maxWidth: 280,
  },
  audioIcon: {
    fontSize: 18,
    flexShrink: 0,
  },
  audioPlayer: {
    flex: 1,
    height: 32,
    minWidth: 0,
    accentColor: 'var(--color-primary)',
  },

  // File / document link
  fileLink:     (isOwn) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
    background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.07)',
    borderRadius: 8, textDecoration: 'none',
    color: isOwn ? 'rgba(255,255,255,0.92)' : 'var(--color-text)',
    maxWidth: 240, minWidth: 160,
  }),
  fileLinkName: { flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  downloadIcon: { fontSize: 14, flexShrink: 0, opacity: 0.7 },

  // Delete modal
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeSlideIn 0.15s ease',
  },
  modal: {
    background: 'var(--color-surface)', borderRadius: 14,
    padding: '24px 24px 20px', minWidth: 280, maxWidth: 340,
    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
    border: '1px solid var(--color-border)',
  },
  modalTitle:     { fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 },
  modalSub:       { fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 },
  modalActions:   { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  modalCancel:    {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
    background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
  },
  modalDeleteMe:  {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
  },
  modalDeleteAll: {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
    background: '#ef4444', border: 'none', color: '#fff',
  },
}

export default MessageBubble