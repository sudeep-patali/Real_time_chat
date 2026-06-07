import { useState, useRef, useEffect } from 'react'
import { useSocket } from '../hooks/useSocket'
import { TYPING_START, TYPING_STOP, GROUP_TYPING_START, GROUP_TYPING_STOP } from '../socket/socketEvents'
import FileUpload from './FileUpload'
import EmojiPicker from './EmojiPicker'
import VoiceMessageRecorder from './VoiceMessageRecorder'
import '../styles/chat.css'

function MessageInput({ onSend, roomId, disabled = false, isGroup = false }) {
  const [text,        setText]        = useState('')
  const [showUpload,  setShowUpload]  = useState(false)
  const [showEmoji,   setShowEmoji]   = useState(false)
  const { emit }                      = useSocket()
  const typingTimer                   = useRef(null)
  const isTypingRef                   = useRef(false)
  const inputRef                      = useRef(null)
  const emojiRef                      = useRef(null)

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
    if (isGroup) {
      emit(GROUP_TYPING_START, { roomId })
    } else {
      emit(TYPING_START, { roomId })
    }
  }

  const emitTypingStop = () => {
    if (!isTypingRef.current) return
    isTypingRef.current = false
    if (isGroup) {
      emit(GROUP_TYPING_STOP, { roomId })
    } else {
      emit(TYPING_STOP, { roomId })
    }
  }

  const handleChange = (e) => {
    if (disabled) return
    const val = e.target.value
    setText(val)

    if (val.trim()) {
      emitTypingStart()
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        emitTypingStop()
      }, 2000)
    } else {
      clearTimeout(typingTimer.current)
      emitTypingStop()
    }
  }

  const handleSend = () => {
    if (disabled || !text.trim()) return
    clearTimeout(typingTimer.current)
    emitTypingStop()
    onSend(text.trim(), 'text')
    setText('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
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
    if (!input) {
      setText(prev => prev + emoji)
      return
    }
    const start = input.selectionStart
    const end   = input.selectionEnd
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    // Restore cursor position after emoji insert
    requestAnimationFrame(() => {
      input.selectionStart = start + emoji.length
      input.selectionEnd   = start + emoji.length
      input.focus()
    })
  }

  const showMic = !text.trim() && !disabled

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
        <div ref={emojiRef} style={styles.emojiPickerWrap}>
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
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
          📎
        </button>

        <div className='input-pill'>
          <button
            className='emoji-btn'
            title='Emoji'
            tabIndex={-1}
            disabled={disabled}
            onClick={() => !disabled && setShowEmoji(prev => !prev)}
            style={showEmoji ? { color: 'var(--color-primary)' } : {}}
          >
            😊
          </button>
          <input
            ref={inputRef}
            type='text'
            placeholder={disabled ? 'Messaging unavailable' : 'Type a message'}
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
            ➤
          </button>
        )}
      </div>
    </>
  )
}

const styles = {
  emojiPickerWrap: {
    position: 'absolute',
    bottom: '70px',
    left: '16px',
    zIndex: 300,
  }
}

export default MessageInput