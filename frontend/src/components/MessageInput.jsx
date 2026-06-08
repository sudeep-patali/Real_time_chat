import { useState, useRef, useEffect } from 'react'
import { Paperclip, Smile, Mic, Send, X, CornerUpLeft } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { TYPING_START, TYPING_STOP, GROUP_TYPING_START, GROUP_TYPING_STOP } from '../socket/socketEvents'
import FileUpload from './FileUpload'
import EmojiPicker from './EmojiPicker'
import VoiceMessageRecorder from './VoiceMessageRecorder'
import '../styles/chat.css'

function MessageInput({ onSend, roomId, disabled = false, isGroup = false, replyTo = null, onCancelReply }) {
  const [text,       setText]       = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showEmoji,  setShowEmoji]  = useState(false)
  const { emit }                    = useSocket()
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
      ? { id: replyTo.id, content: replyTo.content, senderName: replyTo.senderName }
      : null
    onSend(text.trim(), 'text', null, null, null, replyContext)
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

  const showMic      = !text.trim() && !disabled
  const replyPreview = replyTo
    ? (replyTo.type === 'text' ? replyTo.content : `[${replyTo.type}]`)
    : ''

  return (
    <>
      {showUpload && !disabled && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
          roomId={roomId}
        />
      )}

      {/* Emoji picker floats above input bar */}
      {showEmoji && !disabled && (
        <div ref={emojiRef} className='emoji-picker-wrap'>
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {/* ── Reply preview bar ── */}
      {replyTo && !disabled && (
        <div className='reply-preview-bar'>
          <CornerUpLeft size={14} className='reply-preview-icon' />
          <div className='reply-preview-text'>
            <span className='reply-preview-name'>{replyTo.senderName || 'User'}</span>
            <span className='reply-preview-content'>
              {replyPreview.length > 80 ? replyPreview.slice(0, 80) + '…' : replyPreview}
            </span>
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
        <button
          className='attach-btn'
          title={disabled ? 'Messaging disabled' : 'Attach file'}
          onClick={() => !disabled && setShowUpload(prev => !prev)}
          disabled={disabled}
        >
          <Paperclip size={20} />
        </button>

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
    </>
  )
}

export default MessageInput