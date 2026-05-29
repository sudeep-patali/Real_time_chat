import { generateAvatar } from '../utils/generateAvatar'
import { sanitizeMessage } from '../utils/sanitizeMessage'
import { formatTime } from '../utils/formatTime'
import '../styles/chat.css'

function MessageBubble({ message, isOwn }) {
  const avatarSrc = generateAvatar(message.senderName || 'User')

  const renderContent = () => {
    if (message.type === 'image') {
      return (
        <img
          src={message.fileUrl}
          alt='attachment'
          className='bubble-image'
        />
      )
    }

    if (message.type === 'file') {
      return (
        <a
          href={message.fileUrl}
          download
          style={{ color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--color-primary)' }}
          className='bubble-file-link'
        >
          📎 Download file
        </a>
      )
    }

    return (
      <span
        className='bubble-content'
        dangerouslySetInnerHTML={{
          __html: sanitizeMessage(message.content)
        }}
      />
    )
  }

  return (
    <div className={`bubble-wrapper ${isOwn ? 'own' : 'other'}`}>

      {/* Avatar — only for received messages */}
      {!isOwn && (
        <img
          src={avatarSrc}
          alt={message.senderName || 'User'}
          className='bubble-avatar'
        />
      )}

      <div className={`bubble ${isOwn ? 'own' : 'other'}`}>

        {/* Sender name — shown in group chats for others' messages */}
        {!isOwn && message.senderName && (
          <span className='bubble-sender'>{message.senderName}</span>
        )}

        {/* Message body */}
        {renderContent()}

        {/* Timestamp + read receipt — floated inside bubble */}
        <span className='bubble-meta'>
          <span className='bubble-time'>{formatTime(message.timestamp)}</span>
          {isOwn && (
            <span className={`bubble-tick ${message.isRead ? 'read' : ''}`}>
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </span>

      </div>
    </div>
  )
}

export default MessageBubble