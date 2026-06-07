import { useRef } from 'react'
import { useTheme } from '../../../context/ThemeContext'
import { useAppearance } from '../../../context/AppearanceContext'
import SegmentedControl from '../SegmentedControl'
import SettingsRow from '../SettingsRow'
import Toggle from '../Toggle'

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize, bubbleSize, setBubbleSize, compactMode, setCompactMode, getWallpaper, setWallpaper } = useAppearance()

  const lightWpRef = useRef()
  const darkWpRef  = useRef()

  const handleWallpaper = (mode, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setWallpaper(mode, e.target.result)
    reader.readAsDataURL(file)
  }

  const clearWallpaper = (mode) => setWallpaper(mode, null)

  return (
    <div className="settings-panel">
      <div className="settings-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
        Appearance
      </div>

      <div className="settings-subsection-label">Theme</div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Color Theme</div>
          <div className="settings-row-desc">Choose your preferred color scheme</div>
        </div>
        <SegmentedControl
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
          value={theme}
          onChange={setTheme}
        />
      </div>

      <div className="settings-subsection-label">Typography</div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Font Size</div>
          <div className="settings-row-desc">Affects message text and UI</div>
        </div>
        <SegmentedControl
          options={[{ value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }]}
          value={fontSize}
          onChange={setFontSize}
        />
      </div>

      <div className="settings-subsection-label">Messages</div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Message Bubble Size</div>
          <div className="settings-row-desc">Adjust the padding inside message bubbles</div>
        </div>
        <SegmentedControl
          options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }]}
          value={bubbleSize}
          onChange={setBubbleSize}
        />
      </div>

      <div className="settings-row">
        <Toggle
          checked={compactMode}
          onChange={setCompactMode}
          label="Compact Mode"
          description="Reduce spacing and padding throughout the app"
        />
      </div>

      <div className="settings-subsection-label">Chat Wallpaper</div>
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div className="settings-row-label">Light Theme Wallpaper</div>
          <div className="settings-row-desc">Background image for light mode chats</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {getWallpaper('light') && (
            <img
              src={getWallpaper('light')}
              alt="Light wallpaper"
              style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--color-primary)' }}
            />
          )}
          <input ref={lightWpRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleWallpaper('light', e.target.files[0])} />
          <button className="settings-btn secondary" onClick={() => lightWpRef.current.click()}>Upload</button>
          {getWallpaper('light') && (
            <button className="settings-btn danger" onClick={() => clearWallpaper('light')}>Remove</button>
          )}
        </div>
      </div>

      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div className="settings-row-label">Dark Theme Wallpaper</div>
          <div className="settings-row-desc">Background image for dark mode chats</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {getWallpaper('dark') && (
            <img
              src={getWallpaper('dark')}
              alt="Dark wallpaper"
              style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--color-primary)' }}
            />
          )}
          <input ref={darkWpRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleWallpaper('dark', e.target.files[0])} />
          <button className="settings-btn secondary" onClick={() => darkWpRef.current.click()}>Upload</button>
          {getWallpaper('dark') && (
            <button className="settings-btn danger" onClick={() => clearWallpaper('dark')}>Remove</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppearanceSection