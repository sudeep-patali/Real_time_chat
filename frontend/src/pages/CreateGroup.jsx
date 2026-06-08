import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { generateAvatar } from '../utils/generateAvatar'
import * as userService from '../services/userService'
import * as groupService from '../services/groupService'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { ArrowLeft, Search, X, Camera, Users, Check } from 'lucide-react'

// ─── Debounce helper ─────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateGroup() {
  const navigate        = useNavigate()
  const { currentUser } = useAuth()
  const addRoom         = useChatStore(state => state.setRooms)
  const existingRooms   = useChatStore(state => state.rooms)

  // Form fields
  const [groupName,     setGroupName]     = useState('')
  const [description,   setDescription]   = useState('')
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Member search
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])

  // Submission
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState('')

  const avatarInputRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery)

  // ── Search users ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) { setSearchResults([]); return }

    setSearching(true)
    userService.searchUsers(q)
      .then(res => {
        const users = (res.data.users || res.data || []).filter(
          u => u._id !== currentUser?.id && u.id !== currentUser?.id
        )
        setSearchResults(users)
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, currentUser])

  // ── Avatar pick ───────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Toggle member selection ───────────────────────────────────────────────
  const toggleUser = useCallback((user) => {
    setSelectedUsers(prev => {
      const id = user._id || user.id
      const exists = prev.some(u => (u._id || u.id) === id)
      if (exists) return prev.filter(u => (u._id || u.id) !== id)
      return [...prev, user]
    })
  }, [])

  const removeSelected = (userId) => {
    setSelectedUsers(prev => prev.filter(u => (u._id || u.id) !== userId))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setError('')
    if (!groupName.trim()) return setError('Group name is required.')

    setCreating(true)
    try {
      const res = await groupService.createGroup({
        groupName:   groupName.trim(),
        description: description.trim(),
        memberIds:   [],
        avatar:      avatarFile,
      })
      const newRoom = res.data.room
      const normalised = {
        ...newRoom,
        id:             newRoom._id || newRoom.id,
        participantIds: (newRoom.participantIds || []).map(p =>
          typeof p === 'object' ? { ...p, id: p._id || p.id } : p
        ),
        lastMessage: null,
      }
      addRoom([normalised, ...existingRooms])

      if (selectedUsers.length > 0) {
        const userIds = selectedUsers.map(u => u._id || u.id)
        await groupService.inviteUsers(normalised.id, userIds)
      }

      navigate(`/group/${normalised.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const groupAvatarSrc = avatarPreview || generateAvatar(groupName || 'Group')
  const canCreate      = groupName.trim().length > 0

  return (
    <div className="cg-shell">
      <Navbar />
      <div className="cg-body">
        <Sidebar />

        <main className="cg-main">
          <div className="cg-card">

            {/* ── Header ── */}
            <div className="cg-header">
              <button className="cg-back-btn" onClick={() => navigate(-1)} title="Back">
                <ArrowLeft size={20} />
              </button>
              <h1 className="cg-title">New Group</h1>
            </div>

            {/* ── Avatar + name row ── */}
            <div className="cg-avatar-row">
              <div
                className="cg-avatar-wrap"
                onClick={() => avatarInputRef.current?.click()}
                title="Change photo"
              >
                <img src={groupAvatarSrc} alt="Group" className="cg-avatar-img" />
                <div className="cg-avatar-overlay">
                  <Camera size={20} color="#fff" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="cg-name-col">
                <label className="cg-label">Group Name *</label>
                <input
                  className="cg-input"
                  placeholder="Enter group name…"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
                <span className="cg-char-count">{groupName.length}/60</span>
              </div>
            </div>

            {/* ── Description ── */}
            <div className="cg-field">
              <label className="cg-label">
                Description <span className="cg-optional">(optional)</span>
              </label>
              <textarea
                className="cg-textarea"
                placeholder="What is this group about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
              />
              <span className="cg-char-count cg-char-count--right">
                {description.length}/200
              </span>
            </div>

            {/* ── Selected members chips ── */}
            {selectedUsers.length > 0 && (
              <div className="cg-chips-wrap">
                <span className="cg-chips-label">Members ({selectedUsers.length})</span>
                <div className="cg-chips">
                  {selectedUsers.map(u => {
                    const uid = u._id || u.id
                    const src = u.avatar || generateAvatar(u.name || 'U')
                    return (
                      <div key={uid} className="cg-chip">
                        <img src={src} alt={u.name} className="cg-chip-avatar" />
                        <span className="cg-chip-name">{u.name}</span>
                        <button
                          className="cg-chip-remove"
                          onClick={() => removeSelected(uid)}
                          title="Remove"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Search ── */}
            <div className="cg-field">
              <label className="cg-label">Add Members *</label>
              <div className="cg-search-wrap">
                <Search size={14} className="cg-search-icon" />
                <input
                  className="cg-search-input"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button className="cg-clear-btn" onClick={() => setSearchQuery('')}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Search results ── */}
            {searching && (
              <div className="cg-hint">Searching…</div>
            )}

            {!searching && searchQuery.trim() && searchResults.length === 0 && (
              <div className="cg-hint">No users found for "{searchQuery}"</div>
            )}

            {searchResults.length > 0 && (
              <div className="cg-results-list">
                {searchResults.map(u => {
                  const uid      = u._id || u.id
                  const src      = u.avatar || generateAvatar(u.name || 'U')
                  const selected = selectedUsers.some(s => (s._id || s.id) === uid)
                  return (
                    <div
                      key={uid}
                      className={`cg-result-row${selected ? ' cg-result-row--selected' : ''}`}
                      onClick={() => toggleUser(u)}
                    >
                      <div className="cg-result-avatar-wrap">
                        <img src={src} alt={u.name} className="cg-result-avatar" />
                        {u.isOnline && <span className="cg-online-dot" />}
                      </div>
                      <div className="cg-result-info">
                        <span className="cg-result-name">{u.name}</span>
                        <span className="cg-result-email">{u.email}</span>
                      </div>
                      <div className={`cg-checkbox${selected ? ' cg-checkbox--checked' : ''}`}>
                        {selected && <Check size={12} color="#fff" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Error ── */}
            {error && <p className="cg-error">{error}</p>}

            {/* ── Create button ── */}
            <button
              className={`cg-create-btn${(!canCreate || creating) ? ' cg-create-btn--disabled' : ''}`}
              onClick={handleCreate}
              disabled={!canCreate || creating}
            >
              {creating ? (
                <span className="cg-spinner-row">
                  <Spinner />
                  Creating group…
                </span>
              ) : (
                <>
                  <Users size={16} />
                  Create Group{selectedUsers.length > 0 ? ` & Invite ${selectedUsers.length}` : ''}
                </>
              )}
            </button>

          </div>
        </main>
      </div>

      <style>{`
        .cg-shell {
          display: flex; flex-direction: column;
          height: 100vh; overflow: hidden;
          background-color: var(--color-bg);
        }
        .cg-body {
          display: flex; flex: 1; overflow: hidden;
        }
        .cg-main {
          flex: 1; overflow-y: auto;
          display: flex; justify-content: center;
          padding: 32px 16px;
          background-color: var(--color-surface-3);
        }
        .cg-card {
          width: 100%; max-width: 520px;
          background-color: var(--color-surface);
          border-radius: 14px;
          padding: 28px 28px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
          display: flex; flex-direction: column; gap: 20px;
          height: fit-content;
          border: 1px solid var(--color-border);
        }
        .cg-header {
          display: flex; align-items: center; gap: 12px;
        }
        .cg-back-btn {
          background: none; border: none;
          color: var(--color-primary); cursor: pointer;
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .cg-back-btn:hover { background: var(--color-btn-ghost-hover); }
        .cg-title {
          font-size: 18px; font-weight: 700; color: var(--color-text);
          margin: 0;
        }
        .cg-avatar-row {
          display: flex; align-items: flex-start; gap: 20px;
        }
        .cg-avatar-wrap {
          position: relative; flex-shrink: 0;
          width: 80px; height: 80px;
          border-radius: 50%; cursor: pointer;
          overflow: hidden;
          border: 2px solid var(--color-primary);
        }
        .cg-avatar-wrap:hover .cg-avatar-overlay { opacity: 1; }
        .cg-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .cg-avatar-overlay {
          position: absolute; inset: 0;
          background-color: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.15s;
        }
        .cg-name-col { flex: 1; display: flex; flex-direction: column; gap: 4; }
        .cg-field { display: flex; flex-direction: column; gap: 6; }
        .cg-label {
          font-size: 12px; font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .cg-optional {
          font-weight: 400; text-transform: none; letter-spacing: 0;
          color: var(--color-text-dim);
        }
        .cg-input, .cg-textarea {
          background-color: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 8px; color: var(--color-text);
          font-size: 14px; padding: 10px 12px;
          outline: none; width: 100%; box-sizing: border-box;
          font-family: inherit; transition: border-color 0.15s;
        }
        .cg-input:focus, .cg-textarea:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-input-focus);
        }
        .cg-textarea { resize: none; line-height: 1.5; }
        .cg-char-count {
          font-size: 11px; color: var(--color-text-dim); align-self: flex-end;
        }
        .cg-char-count--right { text-align: right; display: block; }
        .cg-chips-wrap { display: flex; flex-direction: column; gap: 8; }
        .cg-chips-label {
          font-size: 12px; font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .cg-chips { display: flex; flex-wrap: wrap; gap: 8; }
        .cg-chip {
          display: flex; align-items: center; gap: 6;
          background-color: var(--color-primary-light);
          border: 1px solid var(--color-primary);
          border-radius: 20px; padding: 4px 10px 4px 6px;
        }
        .cg-chip-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
        .cg-chip-name { font-size: 13px; color: var(--color-primary); font-weight: 500; }
        .cg-chip-remove {
          background: none; border: none; color: var(--color-primary);
          cursor: pointer; padding: 0; line-height: 1; opacity: 0.7;
          display: flex; align-items: center;
        }
        .cg-chip-remove:hover { opacity: 1; }
        .cg-search-wrap {
          display: flex; align-items: center;
          background-color: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 8px; overflow: hidden;
          gap: 6px; padding: 0 10px;
          transition: border-color 0.15s;
        }
        .cg-search-wrap:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-input-focus);
        }
        .cg-search-icon { color: var(--color-text-dim); flex-shrink: 0; }
        .cg-search-input {
          flex: 1; background: none; border: none;
          color: var(--color-text); font-size: 14px;
          padding: 10px 4px; outline: none;
        }
        .cg-clear-btn {
          background: none; border: none;
          color: var(--color-text-dim); cursor: pointer;
          display: flex; align-items: center; padding: 2px;
        }
        .cg-clear-btn:hover { color: var(--color-text); }
        .cg-results-list {
          display: flex; flex-direction: column; gap: 2;
          max-height: 260px; overflow-y: auto;
          border-radius: 8px; border: 1px solid var(--color-border);
        }
        .cg-result-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; cursor: pointer;
          background-color: transparent; transition: background 0.12s;
        }
        .cg-result-row:hover { background-color: var(--color-surface-2); }
        .cg-result-row--selected { background-color: var(--color-primary-light); }
        .cg-result-avatar-wrap { position: relative; flex-shrink: 0; }
        .cg-result-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .cg-online-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 10px; height: 10px; border-radius: 50%;
          background-color: var(--color-online);
          border: 2px solid var(--color-surface);
        }
        .cg-result-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2; }
        .cg-result-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
        .cg-result-email { font-size: 12px; color: var(--color-text-dim); }
        .cg-checkbox {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid var(--color-border);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.12s;
        }
        .cg-checkbox--checked {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
        }
        .cg-hint {
          font-size: 13px; color: var(--color-text-dim);
          text-align: center; padding: 12px 0;
        }
        .cg-error {
          font-size: 13px; color: var(--color-error);
          background-color: rgba(241,92,109,0.08);
          border-radius: 8px; padding: 10px 12px; margin: 0;
        }
        .cg-create-btn {
          width: 100%;
          background-color: var(--color-primary);
          color: #fff; border: none; border-radius: 10px;
          padding: 13px 0; font-size: 15px; font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, opacity 0.15s;
        }
        .cg-create-btn:hover { filter: brightness(1.08); }
        .cg-create-btn--disabled { opacity: 0.45; cursor: not-allowed; }
        .cg-create-btn--disabled:hover { filter: none; }
        .cg-spinner-row { display: flex; align-items: center; gap: 8px; }

        /* UserInfo page styles */
        .ui-page {
          height: 100vh; display: flex; flex-direction: column;
          background-color: var(--color-bg); overflow: hidden;
        }
        .ui-topbar {
          display: flex; align-items: center; gap: 12px;
          padding: 0 20px; height: 59px; min-height: 59px;
          background-color: var(--color-header-bg);
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .ui-back-btn {
          background: none; border: none;
          color: var(--color-primary); cursor: pointer;
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .ui-back-btn:hover { background: var(--color-btn-ghost-hover); }
        .ui-topbar-title { font-size: 16px; font-weight: 600; color: var(--color-text); }
        .ui-scroll { flex: 1; overflow-y: auto; background-color: var(--color-bg); }
        .ui-inner {
          max-width: 680px; margin: 0 auto;
          padding: 24px 16px 48px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .ui-centered {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
        }
        .ui-spinner {
          width: 28px; height: 28px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: ui-spin 0.7s linear infinite;
        }
        .ui-loading-text { font-size: 13px; color: var(--color-text-muted); }
        .ui-hero-card {
          background-color: var(--color-surface);
          border-radius: 16px; padding: 32px 24px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          border: 1px solid var(--color-border);
        }
        .ui-avatar-ring {
          position: relative; width: 100px; height: 100px;
          border-radius: 50%; border: 3px solid;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px; transition: border-color 0.4s;
        }
        .ui-avatar-initials {
          width: 88px; height: 88px; border-radius: 50%;
          background: linear-gradient(135deg,#9c8ef7,#7c6ef7);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 32px;
        }
        .ui-avatar-img { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; }
        .ui-avatar-online-dot {
          position: absolute; bottom: 4px; right: 4px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #00a884;
          border: 2px solid var(--color-surface);
          animation: ui-pulse 2s infinite;
        }
        .ui-hero-name { font-size: 22px; font-weight: 700; color: var(--color-text); margin: 0; }
        .ui-online-pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600;
          color: var(--color-text-dim);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--color-border);
          border-radius: 20px; padding: 4px 12px;
        }
        .ui-online-pill--online {
          color: #00a884;
          background: rgba(0,168,132,0.1);
          border-color: rgba(0,168,132,0.25);
        }
        .ui-online-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          background: var(--color-text-dim);
        }
        .ui-online-dot--active {
          background: #00a884;
          box-shadow: 0 0 0 3px rgba(0,168,132,0.2);
          animation: ui-pulse 2s infinite;
        }
        .ui-blocked-badge {
          margin-top: 2px; font-size: 12px; font-weight: 600;
          color: #ef4444;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 20px; padding: 4px 14px;
          display: flex; align-items: center; gap: 6px;
        }
        .ui-stats-row { display: flex; gap: 8px; width: 100%; margin-top: 4px; }
        .ui-stat-card {
          flex: 1; background-color: var(--color-surface-2);
          border-radius: 10px; border: 1px solid var(--color-border);
          padding: 12px 10px;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .ui-stat-icon { display: flex; align-items: center; }
        .ui-stat-value { font-size: 18px; font-weight: 700; color: var(--color-primary); }
        .ui-stat-label {
          font-size: 10px; color: var(--color-text-dim);
          text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
        }
        .ui-action-row {
          display: flex; gap: 8px; margin-top: 4px;
          width: 100%; justify-content: center;
        }
        .ui-action-btn {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          cursor: pointer; padding: 10px 20px;
          border-radius: 10px; flex: 1; max-width: 120px;
          transition: background 0.15s;
        }
        .ui-action-btn:hover { background: var(--color-surface); }
        .ui-action-btn--busy { opacity: 0.5; }
        .ui-action-icon { color: var(--color-primary); display: flex; align-items: center; }
        .ui-action-icon--muted { color: #f59e0b; }
        .ui-action-label { font-size: 11px; color: var(--color-text-muted); font-weight: 500; white-space: nowrap; }
        .ui-section {
          background-color: var(--color-surface);
          border-radius: 12px; padding: 16px 20px;
          border: 1px solid var(--color-border);
          display: flex; flex-direction: column; gap: 10px;
        }
        .ui-section-label {
          font-size: 10px; font-weight: 700; color: var(--color-primary);
          text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;
        }
        .ui-info-row { display: flex; align-items: flex-start; gap: 14px; }
        .ui-info-icon { color: var(--color-text-dim); flex-shrink: 0; margin-top: 2px; }
        .ui-info-value { font-size: 14px; color: var(--color-text); font-weight: 500; line-height: 1.4; margin: 0; }
        .ui-info-sub { font-size: 11px; color: var(--color-text-dim); margin-top: 2px; margin-bottom: 0; }
        .ui-row-divider { height: 1px; background: var(--color-divider); margin: 4px 0; }
        .ui-danger-section {
          background-color: var(--color-surface);
          border-radius: 12px; padding: 4px 20px;
          border: 1px solid var(--color-border);
        }
        .ui-danger-btn {
          display: flex; align-items: center; gap: 12px;
          width: 100%; background: none; border: none;
          padding: 13px 0; font-size: 14px; cursor: pointer;
          font-weight: 500; text-align: left;
          color: var(--color-text-muted); transition: color 0.15s;
        }
        .ui-danger-btn:hover { color: var(--color-text); }
        .ui-danger-btn--error { color: var(--color-error) !important; }
        .ui-danger-btn--error:hover { color: var(--color-error) !important; }
        .ui-danger-icon { flex-shrink: 0; }
        @keyframes cg-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'cg-spin 0.8s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}