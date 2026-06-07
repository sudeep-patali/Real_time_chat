import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as roomService from '../services/roomService'
import { useChatStore } from '../store/chatStore'
import { useSocket } from '../hooks/useSocket'
import { REQUEST_ACCEPTED, REQUEST_REJECTED } from '../socket/socketEvents'

function MessageRequestBanner({ roomId, senderName, onAccepted, onRejected }) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const moveToAccepted = useChatStore(state => state.moveToAccepted)
  const removePendingRoom = useChatStore(state => state.removePendingRoom)
  const { emit } = useSocket()

  const handleAccept = async () => {
    setLoading(true)
    try {
      await roomService.acceptRequest(roomId)
      moveToAccepted(roomId)
      emit(REQUEST_ACCEPTED, { roomId, receiverName: 'You' })
      onAccepted?.()
    } catch (err) {
      console.error('Accept failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      await roomService.rejectRequest(roomId)
      removePendingRoom(roomId)
      emit(REQUEST_REJECTED, { roomId })
      onRejected?.()
      navigate('/')
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.banner}>
      <div style={s.lock}>🔒</div>
      <p style={s.title}>Message Request</p>
      <p style={s.sub}>
        <strong>{senderName}</strong> wants to send you a message.
        You will not be added to their contacts until you accept.
      </p>
      <div style={s.actions}>
        <button
          style={s.rejectBtn}
          onClick={handleReject}
          disabled={loading}
        >
          Delete Request
        </button>
        <button
          style={s.acceptBtn}
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}

const s = {
  banner: {
    margin: '16px auto',
    maxWidth: 420,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '20px 24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  lock: {
    fontSize: 28,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--color-text)',
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: 20,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  rejectBtn: {
    padding: '9px 20px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  acceptBtn: {
    padding: '9px 20px',
    borderRadius: 8,
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

export default MessageRequestBanner