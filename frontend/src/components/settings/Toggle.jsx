function Toggle({ checked, onChange, disabled = false, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
      {(label || description) && (
        <div className="settings-row-info">
          {label && <div className="settings-row-label">{label}</div>}
          {description && <div className="settings-row-desc">{description}</div>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`settings-toggle ${checked ? 'on' : 'off'}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className="settings-toggle-knob" />
      </button>
    </div>
  )
}

export default Toggle