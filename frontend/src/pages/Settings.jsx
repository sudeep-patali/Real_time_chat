import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'

function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { logout } = useAuth()

  return (
    <div style={styles.shell}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Settings</h2>

          {/* Appearance */}
          <div style={styles.section}>
            <p style={styles.sectionTitle}>Appearance</p>
            <div style={styles.row}>
              <div>
                <p style={styles.rowLabel}>Dark Mode</p>
                <p style={styles.rowSub}>Switch between dark and light theme</p>
              </div>
              <button
                style={{
                  ...styles.toggle,
                  backgroundColor: theme === 'dark'
                    ? 'var(--color-primary)'
                    : 'var(--color-border)'
                }}
                onClick={toggleTheme}
              >
                <span style={{
                  ...styles.toggleKnob,
                  transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(2px)'
                }} />
              </button>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Notifications */}
          <div style={styles.section}>
            <p style={styles.sectionTitle}>Notifications</p>
            <div style={styles.row}>
              <div>
                <p style={styles.rowLabel}>Message Notifications</p>
                <p style={styles.rowSub}>Get notified for new messages</p>
              </div>
              <button
                style={{
                  ...styles.toggle,
                  backgroundColor: 'var(--color-primary)'
                }}
              >
                <span style={{
                  ...styles.toggleKnob,
                  transform: 'translateX(22px)'
                }} />
              </button>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Danger Zone */}
          <div style={styles.section}>
            <p style={{ ...styles.sectionTitle, color: 'var(--color-error)' }}>
              Danger Zone
            </p>
            <button style={styles.dangerBtn} onClick={logout}>
              Log Out of All Devices
            </button>
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
  heading: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--color-text)',
    marginBottom: '28px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  rowLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text)',
    marginBottom: '2px',
  },
  rowSub: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  toggle: {
    width: '46px',
    height: '26px',
    borderRadius: '13px',
    border: 'none',
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleKnob: {
    position: 'absolute',
    top: '3px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'transform 0.2s',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--color-border)',
    margin: '24px 0',
  },
  dangerBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  }
}

export default Settings