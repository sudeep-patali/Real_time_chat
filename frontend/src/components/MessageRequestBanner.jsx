import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
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
    <div className="msg-request-banner">
      <div className="msg-request-lock-icon">
        <Lock size={24} />
      </div>
      <p className="msg-request-title">Message Request</p>
      <p className="msg-request-sub">
        <strong>{senderName}</strong> wants to send you a message.
        You will not be added to their contacts until you accept.
      </p>
      <div className="msg-request-actions">
        <button
          className="btn btn-danger msg-request-reject-btn"
          onClick={handleReject}
          disabled={loading}
        >
          Delete Request
        </button>
        <button
          className="btn btn-primary msg-request-accept-btn"
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Accept'}
        </button>
      </div>
    </div>
  )
}

export default MessageRequestBanner