import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { generateAvatar } from '../utils/generateAvatar'
import Navbar from '../components/Navbar'

function Profile() {
  const { currentUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentUser?.name || '')
  const [bio, setBio] = useState('')

  const avatarSrc = currentUser?.avatar || generateAvatar(currentUser?.name || 'U')

  const handleSave = () => {
    // Will connect to userService.updateProfile() when backend is ready
    setEditing(false)
  }

  return (
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>

          {/* Avatar */}
          <div style={styles.avatarSection}>
            <img src={avatarSrc} alt='avatar' style={styles.avatar} />
            <div>
              <p style={styles.userName}>{currentUser?.name}</p>
              <p style={styles.userEmail}>{currentUser?.email}</p>
              <span style={styles.roleBadge}>{currentUser?.role}</span>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Fields */}
          <div style={styles.fields}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              {editing ? (
                <input
                  style={styles.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              ) : (
                <p style={styles.value}>{currentUser?.name}</p>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <p style={styles.value}>{currentUser?.email}</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Bio</label>
              {editing ? (
                <textarea
                  style={{ ...styles.input, height: '80px', resize: 'vertical' }}
                  value={bio}
                  placeholder='Tell something about yourself...'
                  onChange={e => setBio(e.target.value)}
                />
              ) : (
                <p style={styles.value}>
                  {bio || <span style={{ color: 'var(--color-text-muted)' }}>No bio yet</span>}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            {editing ? (
              <>
                <button style={styles.saveBtn} onClick={handleSave}>
                  Save Changes
                </button>
                <button style={styles.cancelBtn} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button style={styles.editBtn} onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

const styles = {
  shell: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg)',
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 16px',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '520px',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
  },
  userName: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--color-text)',
    marginBottom: '4px',
  },
  userEmail: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '20px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    textTransform: 'capitalize',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--color-border)',
    marginBottom: '24px',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '28px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '14px',
    color: 'var(--color-text)',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    fontSize: '14px',
    width: '100%',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  editBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
  },
  saveBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
  },
  cancelBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  }
}

export default Profile