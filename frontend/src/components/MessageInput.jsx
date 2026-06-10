import { useState, useRef, useEffect } from 'react'
import { Paperclip, Smile, Mic, Send, X, ImageIcon, FileText } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { useAuth }   from '../hooks/useAuth'
import { TYPING_START, TYPING_STOP, GROUP_TYPING_START, GROUP_TYPING_STOP } from '../socket/socketEvents'
import FileUpload from './FileUpload'
import EmojiPicker from './EmojiPicker'
import VoiceMessageRecorder from './VoiceMessageRecorder'
import '../styles/chat.css'

function MessageInput({ onSend, roomId, disabled = false, isGroup = false, replyTo = null, onCancelReply }) {
  const [text,       setText]       = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadMode, setUploadMode]   = useState(null)   // null | 'media' | 'document'
  const [showUploadPicker, setShowUploadPicker] = useState(false)
  const attachBtnRef = useRef(null)
  const [showEmoji,  setShowEmoji]  = useState(false)
  const { emit }                    = useSocket()
  const { currentUser }             = useAuth()
  const typingTimer                 = useRef(null)
  const isTypingRef                 = useRef(false)
  const inputRef                    = useRef(null)
  const emojiRef                    = useRef(null)

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  // Close upload picker when clicking outside
  useEffect(() => {
    if (!showUploadPicker) return
    const handler = (e) => {
      if (attachBtnRef.current && !attachBtnRef.current.contains(e.target)) {
        setShowUploadPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUploadPicker])

  const emitTypingStart = () => {
    if (isTypingRef.current) return
    isTypingRef.current = true
    emit(isGroup ? GROUP_TYPING_START : TYPING_START, { roomId })
  }

  const emitTypingStop = () => {
    if (!isTypingRef.current) return
    isTypingRef.current = false
    emit(isGroup ? GROUP_TYPING_STOP : TYPING_STOP, { roomId })
  }

  const handleChange = (e) => {
    if (disabled) return
    const val = e.target.value
    setText(val)
    if (val.trim()) {
      emitTypingStart()
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(emitTypingStop, 2000)
    } else {
      clearTimeout(typingTimer.current)
      emitTypingStop()
    }
  }

  const handleSend = () => {
    if (disabled || !text.trim()) return
    clearTimeout(typingTimer.current)
    emitTypingStop()
    const replyContext = replyTo
      ? { id: replyTo.id, content: replyTo.content, senderName: replyTo.senderName, type: replyTo.type || 'text', senderId: replyTo.senderId || null }
      : null
    onSend(text.trim(), 'text', null, null, null, null, replyContext)
    setText('')
    onCancelReply?.()
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && replyTo) onCancelReply?.()
  }

  const handleUploadComplete = ({ url, mediaType, fileName, mimeType }) => {
    if (disabled) return
    const msgType = mediaType === 'gif'   ? 'gif'
                  : mediaType === 'image' ? 'image'
                  : mediaType === 'video' ? 'video'
                  : 'file'
    onSend(url, msgType, url, fileName, mimeType)
    setShowUpload(false)
  }

  const handleEmojiSelect = (emoji) => {
    if (disabled) return
    const input = inputRef.current
    if (!input) { setText(prev => prev + emoji); return }
    const start   = input.selectionStart
    const end     = input.selectionEnd
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    requestAnimationFrame(() => {
      input.selectionStart = start + emoji.length
      input.selectionEnd   = start + emoji.length
      input.focus()
    })
  }

  const showMic = !text.trim() && !disabled

  const replyPreviewText = (() => {
    if (!replyTo) return ''
    const t = replyTo.type || 'text'
    if (t === 'audio')                    return '🎤 Voice message'
    if (t === 'image')                    return '📷 Photo'
    if (t === 'video')                    return '📹 Video'
    if (t === 'gif')                      return '🎞 GIF'
    if (t === 'file' || t === 'document') return '📎 File'
    const c = replyTo.content || ''
    if (/^https?:\/\/.+\.(webm|ogg|mp3|m4a|wav|opus)(\?.*)?$/i.test(c)) return '🎤 Voice message'
    if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(c)) return '📷 Photo'
    if (/^https?:\/\/.+\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(c))         return '📹 Video'
    if (/^https?:\/\//.test(c) && c.includes('/uploads/'))                  return '📎 Attachment'
    return c.length > 80 ? c.slice(0, 80) + '…' : c
  })()

  const replyPreviewName = (() => {
    if (!replyTo) return ''
    const myName = currentUser?.name || ''
    return (myName && replyTo.senderName === myName) ? 'You' : (replyTo.senderName || 'User')
  })()

  return (
    <>
      {showUpload && !disabled && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => { setShowUpload(false); setUploadMode(null) }}
          roomId={roomId}
          mode={uploadMode}
        />
      )}

      {/* Emoji picker floats above input bar */}
      {showEmoji && !disabled && (
        <div ref={emojiRef} className='emoji-picker-wrap'>
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <div className='input-bar-container'>

      {/* ── Reply preview bar ── */}
      {replyTo && !disabled && (
        <div className='reply-preview-bar'>
          <div className='reply-preview-accent' />
          <div className='reply-preview-text'>
            <span className='reply-preview-name'>{replyPreviewName}</span>
            <span className='reply-preview-content'>{replyPreviewText}</span>
          </div>
          <button className='reply-preview-cancel' onClick={onCancelReply} title='Cancel reply (Esc)'>
            <X size={15} />
          </button>
        </div>
      )}

      <div
        className='input-bar'
        style={disabled ? { opacity: 0.5, pointerEvents: 'none', userSelect: 'none' } : {}}
      >
        <div className='attach-wrap' ref={attachBtnRef}>
          <button
            className='attach-btn'
            title={disabled ? 'Messaging disabled' : 'Attach file'}
            onClick={() => !disabled && setShowUploadPicker(prev => !prev)}
            disabled={disabled}
          >
            <Paperclip size={20} />
          </button>
          {showUploadPicker && !disabled && (
            <div className='attach-picker'>
              <button
                className='attach-picker-item'
                onClick={() => { setUploadMode('media'); setShowUpload(true); setShowUploadPicker(false) }}
              >
                <ImageIcon size={16} />
                <span>Images &amp; Videos</span>
              </button>
              <div className='attach-picker-divider' />
              <button
                className='attach-picker-item'
                onClick={() => { setUploadMode('document'); setShowUpload(true); setShowUploadPicker(false) }}
              >
                <FileText size={16} />
                <span>Documents</span>
              </button>
            </div>
          )}
        </div>

        <div className='input-pill'>
          <button
            className={`emoji-btn${showEmoji ? ' active' : ''}`}
            title='Emoji'
            tabIndex={-1}
            disabled={disabled}
            onClick={() => !disabled && setShowEmoji(prev => !prev)}
          >
            <Smile size={20} />
          </button>
          <input
            ref={inputRef}
            type='text'
            placeholder={
              disabled  ? 'Messaging unavailable' :
              replyTo   ? `Replying to ${replyTo.senderName || 'User'}…` :
                          'Type a message'
            }
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete='off'
            disabled={disabled}
            readOnly={disabled}
          />
        </div>

        {showMic ? (
          <VoiceMessageRecorder onSend={onSend} disabled={disabled} roomId={roomId} />
        ) : (
          <button
            className='send-btn'
            onClick={handleSend}
            title={disabled ? 'Messaging disabled' : 'Send'}
            disabled={disabled}
          >
            <Send size={20} />
          </button>
        )}
      </div>
      </div>
    </>
  )
}

export default MessageInput