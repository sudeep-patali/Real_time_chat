function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="settings-segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`settings-segmented-option ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedControl