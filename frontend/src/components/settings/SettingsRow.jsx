function SettingsRow({ label, description, children, danger = false }) {
  return (
    <div className={`settings-row${danger ? ' danger' : ''}`}>
      <div className="settings-row-info">
        <div className="settings-row-label">{label}</div>
        {description && <div className="settings-row-desc">{description}</div>}
      </div>
      {children && (
        <div style={{ flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default SettingsRow