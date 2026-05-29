import { useState, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { USER_TYPING, USER_STOP_TYPING } from '../socket/socketEvents'
import FileUpload from './FileUpload'
import '../styles/chat.css'

function MessageInput({ onSend, roomId }) {
  const [text, setText]           = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const { emit }                  = useSocket()
  const typingTimer               = useRef(null)

  const handleChange = (e) => {
    setText(e.target.value)
    emit(USER_TYPING, { roomId, isTyping: true })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      emit(USER_STOP_TYPING, { roomId, isTyping: false })
    }, 1500)
  }

  const handleSend = () => {
    if (!text.trim()) return
    clearTimeout(typingTimer.current)
    emit(USER_STOP_TYPING, { roomId, isTyping: false })
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleUploadComplete = (url) => {
    onSend(url, 'file')
    setShowUpload(false)
  }

  return (
    <>
      {showUpload && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}

      <div className='input-bar'>

        {/* Attach button — left of pill */}
        <button
          className='attach-btn'
          title='Attach file'
          onClick={() => setShowUpload(true)}
        >
          📎
        </button>

        {/* Input pill */}
        <div className='input-pill'>
          {/* Emoji placeholder (Step 6 / future) */}
          <button className='emoji-btn' title='Emoji' tabIndex={-1}>
            😊
          </button>

          <input
            type='text'
            placeholder='Type a message'
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete='off'
          />
        </div>

        {/* Send button */}
        <button
          className='send-btn'
          onClick={handleSend}
          title='Send'
        >
          ➤
        </button>

      </div>
    </>
  )
}

export default MessageInput