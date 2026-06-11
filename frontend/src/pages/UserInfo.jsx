import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import { useSocket } from '../hooks/useSocket'
import * as userService from '../services/userService'
import * as roomService from '../services/roomService'
import * as messageService from '../services/messageService'
import MediaGallery from '../components/MediaGallery'
import { USER_ONLINE } from '../socket/socketEvents'
import {
  ArrowLeft, MessageCircle, Bell, BellOff, Ban, Flag,
  Trash2, Info, Mail, Clock, Calendar, MessageSquare,
  Image, Paperclip
} from 'lucide-react'
import '../styles/chat.css'
import '../styles/userinfo.css'

// ── Animated online indicator ──────────────────────────────────────────────
function OnlinePulse({ isOnline }) {
  return (
    <span className={`ui-online-pill${isOnline ? ' ui-online-pill--online' : ''}`}>
      <span className={`ui-online-dot${isOnline ? ' ui-online-dot--active' : ''}`} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }) {
  return (
    <div className="ui-stat-card">
      <span className="ui-stat-icon">{icon}</span>
      <span className="ui-stat-value">{value}</span>
      <span className="ui-stat-label">{label}</span>
    </div>
  )
}

function UserInfo() {
  const { userId }   = useParams()
  const navigate     = useNavigate()
  const { on, off }  = useSocket()

  const onlineUsers    = useChatStore(state => state.onlineUsers)
  const rooms          = useChatStore(state => state.rooms)
  const setMessages    = useChatStore(state => state.setMessages)
  const toggleMuteRoom = useChatStore(state => state.toggleMuteRoom)
  const clearUnread    = useNotificationStore(state => state.clearUnread)

  const [user,         setUser]         = useState(null)
  const [media,        setMedia]        = useState([])
  const [docs,         setDocs]         = useState([])
  const [totalMsgs,    setTotalMsgs]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [busy,         setBusy]         = useState('')
  const [liveOnline,   setLiveOnline]   = useState(null)
  const [liveLastSeen, setLiveLastSeen] = useState(null)

  // Find the shared room
  const room = rooms.find(r =>
    !r.isGroup && r.participantIds?.some(p => {
      const pid = p?.id || p?._id || p
      return pid?.toString() === userId?.toString()
    })
  )
  const rid     = room?._id || room?.id
  const isMuted = room?.isMuted || false

  const isOnline = liveOnline !== null
    ? liveOnline
    : onlineUsers.includes(userId?.toString())

  // ── Load user ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    setLoading(true); setError(null)
    userService.getUserById(userId)
      .then(res => setUser(res.data.user))
      .catch(() => setError('Could not load user info.'))
      .finally(() => setLoading(false))
  }, [userId])

  // ── Load shared media ──────────────────────────────────────────────────
  useEffect(() => {
    if (!rid) return
    roomService.getRoomMedia(rid)
      .then(res => { setMedia(res.data.media || []); setDocs(res.data.documents || []) })
      .catch(() => {})
  }, [rid])

  // ── Load total messages ────────────────────────────────────────────────
  useEffect(() => {
    if (!rid) return
    messageService.fetchHistory(rid)
      .then(res => setTotalMsgs((res.data.messages || []).length))
      .catch(() => {})
  }, [rid])

  // ── Real-time online status via socket ─────────────────────────────────
  useEffect(() => {
    const handle = ({ userId: uid, isOnline: online, lastSeen }) => {
      if (uid?.toString() !== userId?.toString()) return
      setLiveOnline(online)
      if (lastSeen) setLiveLastSeen(lastSeen)
    }
    on(USER_ONLINE, handle)
    return () => off(USER_ONLINE, handle)
  }, [userId, on, off])

  // ── Clear unread when viewing this chat ───────────────────────────────
  useEffect(() => {
    if (rid) clearUnread(rid)
  }, [rid, clearUnread])

  const handleClearChat = async () => {
    if (!rid || !window.confirm('Clear all messages? This cannot be undone.')) return
    setBusy('clear')
    try { await roomService.clearChat(rid); setMessages([]); navigate(-1) }
    catch { alert('Failed to clear chat.') }
    finally { setBusy('') }
  }

  const handleBlock = async () => {
    if (!window.confirm(`${user?.isBlocked ? 'Unblock' : 'Block'} ${user?.name}?`)) return
    setBusy('block')
    try {
      const res = await userService.blockUser(userId)
      setUser(u => ({ ...u, isBlocked: res.data.isBlocked }))
    } catch { alert('Action failed.') }
    finally { setBusy('') }
  }

  const handleMute = async () => {
    if (!rid) return
    setBusy('mute')
    try { await roomService.muteRoom(rid); toggleMuteRoom(rid) }
    catch { alert('Failed to mute.') }
    finally { setBusy('') }
  }

  const handleReport = async () => {
    const reason = window.prompt(`Reason for reporting ${user?.name}? (optional)`)
    if (reason === null) return
    setBusy('report')
    try { const r = await userService.reportUser(userId, reason); alert(r.data.message || 'Report submitted.') }
    catch { alert('Failed to submit report.') }
    finally { setBusy('') }
  }

  if (loading) return <LoadingScreen title="Contact Info" onBack={() => navigate(-1)} />
  if (error || !user) return <ErrorScreen title="Contact Info" msg={error} onBack={() => navigate(-1)} />

  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = user.memberSince
    ? new Date(user.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null

  const lastSeenRaw = liveLastSeen || user.lastSeen
  const lastSeenText = isOnline
    ? 'Online'
    : lastSeenRaw
      ? `Last seen ${new Date(lastSeenRaw).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : 'Offline'

  return (
    <div className="ui-page">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="ui-topbar">
        <button className="ui-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="ui-topbar-title">Contact Info</span>
      </div>

      <div className="ui-scroll">
        <div className="ui-inner">

          {/* ── Hero Card ────────────────────────────────────────────────── */}
          <div className="ui-hero-card">
            <div
              className="ui-avatar-ring"
              style={{ borderColor: isOnline ? '#00a884' : 'rgba(124,110,247,0.3)' }}
            >
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="ui-avatar-img" />
                : <div className="ui-avatar-initials">{initials}</div>
              }
              {isOnline && <span className="ui-avatar-online-dot" />}
            </div>

            <h2 className="ui-hero-name">{user.name}</h2>
            <OnlinePulse isOnline={isOnline} />

            {user.isBlocked && (
              <div className="ui-blocked-badge">
                <Ban size={12} />
                You have blocked this user
              </div>
            )}

            {/* Action buttons */}
            <div className="ui-action-row">
              <button
                className="ui-action-btn"
                onClick={() => rid && navigate(`/chat/${rid}`)}
                disabled={!rid}
              >
                <span className="ui-action-icon">
                  <MessageCircle size={18} />
                </span>
                <span className="ui-action-label">Message</span>
              </button>

              <button
                className={`ui-action-btn${busy === 'mute' ? ' ui-action-btn--busy' : ''}`}
                onClick={handleMute}
                disabled={!rid || busy === 'mute'}
              >
                <span className={`ui-action-icon${isMuted ? ' ui-action-icon--muted' : ''}`}>
                  {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                </span>
                <span className="ui-action-label">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>
          </div>

          {/* ── About ──────────────────────────────────────────────────────── */}
          <div className="ui-section">
            <p className="ui-section-label">About</p>
            <div className="ui-info-row">
              <Info size={16} className="ui-info-icon" />
              <p className="ui-info-value">{user.bio || 'Hey there! I am using this app.'}</p>
            </div>
          </div>

          {/* ── Contact ─────────────────────────────────────────────────────── */}
          <div className="ui-section">
            <p className="ui-section-label">Contact</p>
            <div className="ui-info-row">
              <Mail size={16} className="ui-info-icon" />
              <div>
                <p className="ui-info-value">{user.email}</p>
                <p className="ui-info-sub">Email</p>
              </div>
            </div>

            <div className="ui-row-divider" />
            <div className="ui-info-row">
              <Clock size={16} className="ui-info-icon" />
              <div>
                <p className="ui-info-value" style={{ color: isOnline ? '#00a884' : 'var(--color-text)' }}>
                  {lastSeenText}
                </p>
                <p className="ui-info-sub">Last Seen</p>
              </div>
            </div>

            {memberSince && (
              <>
                <div className="ui-row-divider" />
                <div className="ui-info-row">
                  <Calendar size={16} className="ui-info-icon" />
                  <div>
                    <p className="ui-info-value">Member since {memberSince}</p>
                    <p className="ui-info-sub">Joined</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Shared Media & Documents ─────────────────────────────────── */}
          <div className="ui-section">
            <p className="ui-section-label">Shared Media & Documents</p>
            <MediaGallery media={media} documents={docs} />
          </div>

          {/* ── Danger Actions ───────────────────────────────────────────── */}
          <div className="ui-danger-section">
            {rid && (
              <>
                <button
                  className="ui-danger-btn"
                  onClick={handleClearChat}
                  disabled={busy === 'clear'}
                  style={{ opacity: busy === 'clear' ? 0.5 : 1 }}
                >
                  <Trash2 size={16} className="ui-danger-icon" />
                  {busy === 'clear' ? 'Clearing...' : 'Clear Chat'}
                </button>
                <div className="ui-row-divider" />
              </>
            )}
            <button
              className="ui-danger-btn"
              onClick={handleBlock}
              disabled={busy === 'block'}
              style={{ opacity: busy === 'block' ? 0.5 : 1 }}
            >
              <Ban size={16} className="ui-danger-icon" />
              {busy === 'block' ? 'Please wait...' : (user.isBlocked ? `Unblock ${user.name}` : `Block ${user.name}`)}
            </button>
            <div className="ui-row-divider" />
            <button
              className="ui-danger-btn ui-danger-btn--error"
              onClick={handleReport}
              disabled={busy === 'report'}
              style={{ opacity: busy === 'report' ? 0.5 : 1 }}
            >
              <Flag size={16} className="ui-danger-icon" />
              {busy === 'report' ? 'Submitting...' : `Report ${user.name}`}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes ui-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(0,168,132,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(0,168,132,0);   }
          100% { box-shadow: 0 0 0 0   rgba(0,168,132,0);   }
        }
        @keyframes ui-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function LoadingScreen({ title, onBack }) {
  return (
    <div className="ui-page">
      <div className="ui-topbar">
        <button className="ui-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <span className="ui-topbar-title">{title}</span>
      </div>
      <div className="ui-centered">
        <div className="ui-spinner" />
        <p className="ui-loading-text">Loading...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ title, msg, onBack }) {
  return (
    <div className="ui-page">
      <div className="ui-topbar">
        <button className="ui-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <span className="ui-topbar-title">{title}</span>
      </div>
      <div className="ui-centered">
        <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{msg || 'Not found.'}</p>
      </div>
    </div>
  )
}

export default UserInfo