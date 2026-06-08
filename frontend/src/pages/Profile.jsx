import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { generateAvatar } from '../utils/generateAvatar'
import * as userService from '../services/userService'
import Navbar from '../components/Navbar'
import {
  ArrowLeft, Camera, Pencil, X, Upload, Trash2,
  Circle, Calendar, Briefcase, CheckCircle, AlertCircle,
  Image as ImageIcon, Users, Paperclip, Mic, MessageCircle,
  Lock, Shield, Eye, UserMinus, Ban, AlertTriangle
} from 'lucide-react'
import '../styles/profile.css'

// ─── Constants ────────────────────────────────────────────────
const STATUS_PRESETS = [
  { label: 'Available',    icon: <Circle size={14} fill="#25d366" style={{ color: '#25d366' }} />, value: 'available' },
  { label: 'Busy',         icon: <Circle size={14} fill="#f44336" style={{ color: '#f44336' }} />, value: 'busy' },
  { label: 'In a Meeting', icon: <Calendar size={14} />,  value: 'in_meeting' },
  { label: 'At Work',      icon: <Briefcase size={14} />, value: 'at_work' },
  { label: 'Custom…',      icon: <Pencil size={14} />,    value: 'custom' },
]

const PRIVACY_OPTIONS = [
  { value: 'everyone',  label: 'Everyone' },
  { value: 'accepted',  label: 'Contacts only' },
  { value: 'nobody',    label: 'Nobody' },
]

const TABS = ['Profile', 'Privacy', 'Statistics', 'Blocked']

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ width = '100%', height = '16px', radius = '6px', style = {} }) {
  return <div className='skeleton' style={{ width, height, borderRadius: radius, ...style }} />
}

// ─── Avatar Upload Modal ──────────────────────────────────────
function AvatarModal({ currentAvatar, name, onClose, onSave }) {
  const [preview, setPreview] = useState(currentAvatar)
  const [file, setFile]       = useState(null)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!allowed.includes(f.type)) { setError('Only JPG, PNG, or WEBP allowed.'); return }
    if (f.size > 5 * 1024 * 1024) { setError('Max file size is 5MB.'); return }
    setError('')
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const handleRemove = () => {
    setPreview(generateAvatar(name))
    setFile('remove')
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(file, preview); onClose() }
    catch (err) { setError(err.message || 'Upload failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className='modal-backdrop' onClick={onClose}>
      <div className='modal-box' onClick={e => e.stopPropagation()}>
        <div className='modal-header'>
          <span className='modal-title'>Profile Photo</span>
          <button className='modal-close' onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className='modal-avatar-preview'>
          <img src={preview || generateAvatar(name)} alt='preview' className='modal-avatar-img' />
        </div>
        <p className='modal-drag-hint'>Upload a JPG, PNG or WEBP image (max 5MB)</p>
        {error && (
          <p className='modal-error'>
            <AlertCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {error}
          </p>
        )}
        <div className='modal-actions'>
          <button className='modal-btn primary' onClick={() => fileRef.current.click()}>
            <Upload size={14} /> Upload Photo
          </button>
          <button className='modal-btn danger' onClick={handleRemove}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
        <input ref={fileRef} type='file' accept='image/jpeg,image/jpg,image/png,image/webp'
          style={{ display: 'none' }} onChange={handleFile} />
        <div className='modal-footer'>
          <button className='modal-btn ghost' onClick={onClose}>Cancel</button>
          <button className='modal-btn primary' onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, loading }) {
  return (
    <div className='stat-card'>
      <div className='stat-icon'>{icon}</div>
      <div className='stat-info'>
        {loading
          ? <Skeleton width='40px' height='22px' style={{ marginBottom: 6 }} />
          : <span className='stat-value'>{value ?? '—'}</span>}
        <span className='stat-label'>{label}</span>
      </div>
    </div>
  )
}

// ─── Privacy Row ──────────────────────────────────────────────
function PrivacyRow({ icon, label, value, onChange }) {
  return (
    <div className='privacy-row'>
      <div className='privacy-left'>
        <span className='privacy-row-icon'>{icon}</span>
        <span className='privacy-label'>{label}</span>
      </div>
      <select className='privacy-select' value={value} onChange={e => onChange(e.target.value)}>
        {PRIVACY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Main Profile Component ───────────────────────────────────
function Profile() {
  const { currentUser } = useAuth()
  const setUser = useAuthStore(state => state.setUser)
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('Profile')
  const [loading, setLoading]     = useState(true)

  // Profile fields
  const [name, setName]                 = useState('')
  const [username, setUsername]         = useState('')
  const [bio, setBio]                   = useState('')
  const [statusValue, setStatusValue]   = useState('available')
  const [customStatus, setCustomStatus] = useState('')
  const [editing, setEditing]           = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [saveError, setSaveError]       = useState(null)
  const [saveSuccess, setSaveSuccess]   = useState(false)
  const [saveStatusError, setSaveStatusError]     = useState(null)
  const [saveStatusSuccess, setSaveStatusSuccess] = useState(false)

  // Avatar
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState('')

  // Privacy
  const [privacy, setPrivacy] = useState({
    profilePhoto: 'everyone', lastSeen: 'everyone',
    onlineStatus: 'everyone', addToGroups: 'everyone', messages: 'everyone',
  })
  const [privacySaving, setPrivacySaving]   = useState(false)
  const [privacySuccess, setPrivacySuccess] = useState(false)

  // Stats
  const [stats, setStats]             = useState({ messagesSent: null, groupsJoined: null, filesShared: null, mediaShared: null })
  const [statsLoading, setStatsLoading] = useState(true)

  // Blocked
  const [blockedUsers, setBlockedUsers]     = useState([])
  const [blockedLoading, setBlockedLoading] = useState(true)
  const [unblockingId, setUnblockingId]     = useState(null)

  // ── Init ──
  useEffect(() => {
    if (!currentUser) return
    setName(currentUser.name || '')
    setUsername(currentUser.username || currentUser.email?.split('@')[0] || '')
    setBio(currentUser.bio || '')
    setStatusValue(currentUser.statusValue || 'available')
    setCustomStatus(currentUser.customStatus || '')
    setAvatarSrc(currentUser.avatar || generateAvatar(currentUser.name || 'U'))
    const storedPrivacy = JSON.parse(localStorage.getItem(`privacy_${currentUser.id}`) || 'null')
    if (storedPrivacy) setPrivacy(storedPrivacy)
    setLoading(false)
  }, [currentUser])

  // ── Stats ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setStatsLoading(true)
      try {
        const res = await userService.getUserStats?.()
        if (!cancelled && res?.data) setStats(res.data)
      } catch {
        if (!cancelled) setStats({ messagesSent: 0, groupsJoined: 0, filesShared: 0, mediaShared: 0 })
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Blocked ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setBlockedLoading(true)
      try {
        const res = await userService.getBlockedUsers?.()
        if (!cancelled && res?.data?.users) setBlockedUsers(res.data.users)
      } catch {
        if (!cancelled) setBlockedUsers([])
      } finally {
        if (!cancelled) setBlockedLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Helpers ──
  const getStatusLabel = () => {
    if (statusValue === 'custom') return customStatus || 'Custom status'
    return STATUS_PRESETS.find(s => s.value === statusValue)?.label || 'Available'
  }
  const getStatusIcon = () => STATUS_PRESETS.find(s => s.value === statusValue)?.icon || <Circle size={14} fill="#25d366" style={{ color: '#25d366' }} />

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const formatLastSeen = (d) => {
    if (!d) return 'Unknown'
    const diff = Date.now() - new Date(d)
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return formatDate(d)
  }

  // ── Save personal info (name, bio, username) ──
  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false)
    try {
      const res = await userService.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        username: username.trim(),
      })
      setUser(res.data.user)
      setEditing(false); setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save. Try again.')
    } finally { setSaving(false) }
  }

  // ── Save status message only ──
  const handleStatusSave = async () => {
    setSavingStatus(true); setSaveStatusError(null); setSaveStatusSuccess(false)
    try {
      const res = await userService.updateProfile({
        statusValue,
        customStatus: statusValue === 'custom' ? customStatus : '',
      })
      setUser(res.data.user)
      setEditingStatus(false); setSaveStatusSuccess(true)
      setTimeout(() => setSaveStatusSuccess(false), 3000)
    } catch (err) {
      setSaveStatusError(err.response?.data?.message || 'Failed to save status.')
    } finally { setSavingStatus(false) }
  }

  // ── Avatar save ──
  const handleAvatarSave = async (file, preview) => {
    if (file === 'remove') {
      const fallback = generateAvatar(currentUser?.name || 'U')
      setAvatarSrc(fallback)
      try {
        const res = await userService.updateProfile({ avatar: null })
        setUser(res.data.user)
      } catch { setUser({ ...currentUser, avatar: null }) }
      return
    }
    if (!file) return
    setAvatarSrc(preview)
    try {
      const res = await userService.updateProfile({ avatar: preview })
      setUser(res.data.user)
    } catch (err) {
      setAvatarSrc(currentUser?.avatar || generateAvatar(currentUser?.name || 'U'))
      throw new Error(err.response?.data?.message || 'Upload failed. Image may be too large.')
    }
  }

  // ── Privacy save ──
  const handlePrivacySave = async () => {
    setPrivacySaving(true); setPrivacySuccess(false)
    try {
      await userService.updatePrivacy?.(privacy)
    } catch { /* store locally anyway */ } finally {
      localStorage.setItem(`privacy_${currentUser?.id}`, JSON.stringify(privacy))
      setPrivacySuccess(true)
      setTimeout(() => setPrivacySuccess(false), 3000)
      setPrivacySaving(false)
    }
  }

  // ── Unblock ──
  const handleUnblock = async (userId) => {
    setUnblockingId(userId)
    try {
      await userService.blockUser(userId)
      setBlockedUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) { console.error('Unblock failed', err) }
    finally { setUnblockingId(null) }
  }

  const isOnline = currentUser?.isOnline ?? false

  return (
    <div className='profile-shell'>
      <Navbar />

      <div className='profile-page'>
        {/* ── Back Button ── */}
        <button className='profile-back-btn' onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>

        {/* ── Hero ── */}
        <div className='profile-hero'>
          <div className='profile-hero-bg' />
          <div className='profile-hero-content'>
            <div className='profile-avatar-wrap'>
              {loading ? <Skeleton width='96px' height='96px' radius='50%' /> : (
                <>
                  <img
                    src={avatarSrc || generateAvatar(currentUser?.name || 'U')}
                    alt={currentUser?.name}
                    className='profile-avatar'
                  />
                  <button className='avatar-edit-btn' onClick={() => setShowAvatarModal(true)} title='Change photo'>
                    <Camera size={13} />
                  </button>
                  <span className={`presence-dot ${isOnline ? 'online' : 'offline'}`} />
                </>
              )}
            </div>

            <div className='profile-identity'>
              {loading ? (
                <>
                  <Skeleton width='180px' height='26px' style={{ marginBottom: 8 }} />
                  <Skeleton width='120px' height='16px' />
                </>
              ) : (
                <>
                  <h1 className='profile-hero-name'>{currentUser?.name}</h1>
                  <p className='profile-hero-email'>{currentUser?.email}</p>
                  <div className='profile-hero-status'>
                    <span className='profile-status-icon'>{getStatusIcon()}</span>
                    <span className='status-text-sm'>{getStatusLabel()}</span>
                  </div>
                  <div className='profile-badges'>
                    <span className='badge role'>{currentUser?.role || 'member'}</span>
                    <span className={`badge presence ${isOnline ? 'online' : 'offline'}`}>
                      {isOnline ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!loading && (
            <div className='presence-strip'>
              <div className='presence-item'>
                <span className='presence-label'>Last Seen</span>
                <span className='presence-value'>{formatLastSeen(currentUser?.lastSeen)}</span>
              </div>
              <div className='presence-divider' />
              <div className='presence-item'>
                <span className='presence-label'>Member Since</span>
                <span className='presence-value'>{formatDate(currentUser?.createdAt)}</span>
              </div>
              <div className='presence-divider' />
              <div className='presence-item'>
                <span className='presence-label'>Account Created</span>
                <span className='presence-value'>{formatDate(currentUser?.createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className='profile-tabs-bar'>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Blocked' && blockedUsers.length > 0 && (
                <span className='tab-badge'>{blockedUsers.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className='profile-body'>

          {/* PROFILE TAB */}
          {activeTab === 'Profile' && (
            <div className='tab-panel'>
              {saveError   && (
                <div className='alert error'>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className='alert success'>
                  <CheckCircle size={14} style={{ flexShrink: 0 }} /> Profile saved successfully!
                </div>
              )}

              <div className='info-card'>
                <div className='card-header'>
                  <span className='card-title'>Personal Information</span>
                  {!editing && (
                    <button className='card-edit-btn' onClick={() => setEditing(true)}>
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                </div>

                <div className='field-grid'>
                  <div className='field-group'>
                    <label className='field-label'>Full Name</label>
                    {loading ? <Skeleton height='38px' /> : editing
                      ? <input className='field-input' value={name} onChange={e => setName(e.target.value)} placeholder='Your full name' />
                      : <p className='field-value'>{currentUser?.name || '—'}</p>}
                  </div>

                  <div className='field-group'>
                    <label className='field-label'>Username</label>
                    {loading ? <Skeleton height='38px' /> : editing
                      ? <input className='field-input' value={username}
                          onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          placeholder='username' />
                      : <p className='field-value'>@{username || currentUser?.email?.split('@')[0] || '—'}</p>}
                  </div>

                  <div className='field-group full-width'>
                    <label className='field-label'>Email Address</label>
                    {loading ? <Skeleton height='38px' />
                      : <p className='field-value muted'>{currentUser?.email}</p>}
                  </div>

                  <div className='field-group full-width'>
                    <label className='field-label'>Bio / About</label>
                    {loading ? <Skeleton height='72px' /> : editing
                      ? <>
                          <textarea className='field-input field-textarea'
                            value={bio} onChange={e => setBio(e.target.value)}
                            placeholder='Tell something about yourself…' maxLength={200} />
                          <span className='char-count'>{bio.length}/200</span>
                        </>
                      : <p className='field-value'>
                          {currentUser?.bio || <span className='muted'>No bio yet</span>}
                        </p>}
                  </div>
                </div>

                {editing && (
                  <div className='profile-actions'>
                    <button className='btn-primary' onClick={handleSave} disabled={saving}>
                      {saving ? <><span className='spinner' /> Saving…</> : <><CheckCircle size={14} /> Save Changes</>}
                    </button>
                    <button className='btn-ghost' onClick={() => {
                      setEditing(false); setSaveError(null)
                      setName(currentUser?.name || ''); setBio(currentUser?.bio || '')
                      setUsername(currentUser?.username || currentUser?.email?.split('@')[0] || '')
                    }}>Cancel</button>
                  </div>
                )}
              </div>

              {saveStatusError   && (
                <div className='alert error'>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {saveStatusError}
                </div>
              )}
              {saveStatusSuccess && (
                <div className='alert success'>
                  <CheckCircle size={14} style={{ flexShrink: 0 }} /> Status saved!
                </div>
              )}

              <div className='info-card'>
                <div className='card-header'>
                  <span className='card-title'>Status Message</span>
                  {!editingStatus && (
                    <button className='card-edit-btn' onClick={() => setEditingStatus(true)}>
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                </div>

                <div className='status-grid'>
                  {STATUS_PRESETS.map(s => (
                    <button
                      key={s.value}
                      className={`status-chip ${statusValue === s.value ? 'active' : ''}`}
                      onClick={() => { if (editingStatus) setStatusValue(s.value) }}
                      disabled={!editingStatus}
                    >
                      <span className='status-chip-icon'>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>

                {editingStatus && statusValue === 'custom' && (
                  <input className='field-input mt-12' value={customStatus}
                    onChange={e => setCustomStatus(e.target.value)}
                    placeholder='Type your custom status…' maxLength={60} />
                )}

                {!editingStatus && (
                  <div className='current-status-display'>
                    <span className='profile-status-icon'>{getStatusIcon()}</span>
                    <span>{getStatusLabel()}</span>
                  </div>
                )}

                {editingStatus && (
                  <div className='profile-actions'>
                    <button className='btn-primary' onClick={handleStatusSave} disabled={savingStatus}>
                      {savingStatus ? <><span className='spinner' /> Saving…</> : <><CheckCircle size={14} /> Save Status</>}
                    </button>
                    <button className='btn-ghost' onClick={() => {
                      setEditingStatus(false); setSaveStatusError(null)
                      setStatusValue(currentUser?.statusValue || 'available')
                      setCustomStatus(currentUser?.customStatus || '')
                    }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'Privacy' && (
            <div className='tab-panel'>
              {privacySuccess && (
                <div className='alert success'>
                  <CheckCircle size={14} style={{ flexShrink: 0 }} /> Privacy settings updated!
                </div>
              )}

              <div className='info-card'>
                <div className='card-header'><span className='card-title'>Visibility Controls</span></div>
                <p className='card-subtitle'>Control who can see your information</p>
                <div className='privacy-list'>
                  <PrivacyRow icon={<ImageIcon size={16} />} label='Profile Photo'
                    value={privacy.profilePhoto} onChange={v => setPrivacy(p => ({ ...p, profilePhoto: v }))} />
                  <PrivacyRow icon={<Eye size={16} />} label='Last Seen'
                    value={privacy.lastSeen} onChange={v => setPrivacy(p => ({ ...p, lastSeen: v }))} />
                  <PrivacyRow icon={<Shield size={16} />} label='Online Status'
                    value={privacy.onlineStatus} onChange={v => setPrivacy(p => ({ ...p, onlineStatus: v }))} />
                </div>
              </div>

              <div className='info-card'>
                <div className='card-header'><span className='card-title'>Communication Controls</span></div>
                <p className='card-subtitle'>Manage who can reach out to you</p>
                <div className='privacy-list'>
                  <PrivacyRow icon={<Users size={16} />} label='Add Me to Groups'
                    value={privacy.addToGroups} onChange={v => setPrivacy(p => ({ ...p, addToGroups: v }))} />
                  <PrivacyRow icon={<MessageCircle size={16} />} label='Message Me'
                    value={privacy.messages} onChange={v => setPrivacy(p => ({ ...p, messages: v }))} />
                </div>
              </div>

              <div className='privacy-note'>
                <Lock size={15} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
                <p>Privacy changes take effect immediately without requiring logout.</p>
              </div>

              <div className='profile-actions'>
                <button className='btn-primary' onClick={handlePrivacySave} disabled={privacySaving}>
                  {privacySaving ? <><span className='spinner' /> Saving…</> : <><CheckCircle size={14} /> Save Privacy Settings</>}
                </button>
              </div>
            </div>
          )}

          {/* STATISTICS TAB */}
          {activeTab === 'Statistics' && (
            <div className='tab-panel'>
              <div className='info-card'>
                <div className='card-header'><span className='card-title'>Activity Overview</span></div>
                <div className='stats-grid'>
                  <StatCard
                    icon={<MessageCircle size={22} style={{ color: 'var(--color-primary)' }} />}
                    label='Messages Sent'
                    value={stats.messagesSent?.toLocaleString()}
                    loading={statsLoading}
                  />
                  <StatCard
                    icon={<Users size={22} style={{ color: 'var(--color-primary)' }} />}
                    label='Groups Joined'
                    value={stats.groupsJoined?.toLocaleString()}
                    loading={statsLoading}
                  />
                  <StatCard
                    icon={<Paperclip size={22} style={{ color: 'var(--color-primary)' }} />}
                    label='Files Shared'
                    value={stats.filesShared?.toLocaleString()}
                    loading={statsLoading}
                  />
                  <StatCard
                    icon={<ImageIcon size={22} style={{ color: 'var(--color-primary)' }} />}
                    label='Media Shared'
                    value={stats.mediaShared?.toLocaleString()}
                    loading={statsLoading}
                  />
                </div>
              </div>

              <div className='info-card'>
                <div className='card-header'><span className='card-title'>Account Timeline</span></div>
                <div className='timeline'>
                  <div className='timeline-item'>
                    <div className='timeline-dot' />
                    <div className='timeline-content'>
                      <span className='timeline-label'>Account Created</span>
                      <span className='timeline-date'>{formatDate(currentUser?.createdAt)}</span>
                    </div>
                  </div>
                  <div className='timeline-item'>
                    <div className='timeline-dot secondary' />
                    <div className='timeline-content'>
                      <span className='timeline-label'>Last Active</span>
                      <span className='timeline-date'>{formatLastSeen(currentUser?.lastSeen)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BLOCKED TAB */}
          {activeTab === 'Blocked' && (
            <div className='tab-panel'>
              <div className='info-card'>
                <div className='card-header'>
                  <span className='card-title'>Blocked Users</span>
                  <span className='card-count'>{blockedUsers.length}</span>
                </div>

                {blockedLoading ? (
                  <div className='blocked-list'>
                    {[1, 2, 3].map(i => (
                      <div key={i} className='blocked-item'>
                        <Skeleton width='44px' height='44px' radius='50%' />
                        <div style={{ flex: 1 }}>
                          <Skeleton width='120px' height='14px' style={{ marginBottom: 6 }} />
                          <Skeleton width='80px' height='12px' />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className='empty-state'>
                    <Ban size={40} className='empty-state-icon' />
                    <p className='empty-title'>No blocked users</p>
                    <p className='empty-sub'>Users you block will appear here.</p>
                  </div>
                ) : (
                  <div className='blocked-list'>
                    {blockedUsers.map(user => (
                      <div key={user.id} className='blocked-item'>
                        <img
                          src={user.avatar || generateAvatar(user.name || 'U')}
                          alt={user.name} className='blocked-avatar'
                        />
                        <div className='blocked-info'>
                          <span className='blocked-name'>{user.name}</span>
                          <span className='blocked-sub'>{user.email || '@' + (user.username || '')}</span>
                          {user.blockedAt && (
                            <span className='blocked-date'>Blocked {formatDate(user.blockedAt)}</span>
                          )}
                        </div>
                        <button
                          className='unblock-btn'
                          onClick={() => handleUnblock(user.id)}
                          disabled={unblockingId === user.id}
                        >
                          {unblockingId === user.id ? '…' : 'Unblock'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='privacy-note warning'>
                <AlertTriangle size={15} style={{ flexShrink: 0, color: 'var(--color-error)' }} />
                <p>Unblocking restores full communication permissions immediately.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAvatarModal && (
        <AvatarModal
          currentAvatar={avatarSrc}
          name={currentUser?.name || 'U'}
          onClose={() => setShowAvatarModal(false)}
          onSave={handleAvatarSave}
        />
      )}
    </div>
  )
}

export default Profile