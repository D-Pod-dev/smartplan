import { useState, useEffect } from 'react'
import '../App.css'

const deriveFocusSettings = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.settings.focus')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          workDuration: parsed.workDuration ?? 25,
          breakDuration: parsed.breakDuration ?? 5,
          enableBreaks: parsed.enableBreaks ?? true,
        }
      } catch {}
    }
  }
  return { workDuration: 25, breakDuration: 5, enableBreaks: true }
}

export default function Settings({ devPanelEnabled, onToggleDevPanel, devPanelInNav, onToggleDevPanelInNav, devPanelInSidebar, onToggleDevPanelInSidebar }) {
  const [localDevEnabled, setLocalDevEnabled] = useState(devPanelEnabled)
  const [localDevInNav, setLocalDevInNav] = useState(devPanelInNav)
  const [localDevInSidebar, setLocalDevInSidebar] = useState(devPanelInSidebar)
  
  const [focusSettings, setFocusSettings] = useState(() => deriveFocusSettings())

  useEffect(() => {
    setLocalDevEnabled(devPanelEnabled)
  }, [devPanelEnabled])

  useEffect(() => {
    setLocalDevInNav(devPanelInNav)
  }, [devPanelInNav])

  useEffect(() => {
    setLocalDevInSidebar(devPanelInSidebar)
  }, [devPanelInSidebar])
  
  useEffect(() => {
    localStorage.setItem('smartplan.settings.focus', JSON.stringify(focusSettings))
  }, [focusSettings])

  const handleToggle = () => {
    const newValue = !localDevEnabled
    setLocalDevEnabled(newValue)
    onToggleDevPanel(newValue)
    if (!newValue) {
      // If disabling dev panel, also disable nav and sidebar display
      setLocalDevInNav(false)
      onToggleDevPanelInNav(false)
      setLocalDevInSidebar(false)
      onToggleDevPanelInSidebar(false)
    }
  }

  const handleToggleInNav = () => {
    const newValue = !localDevInNav
    setLocalDevInNav(newValue)
    onToggleDevPanelInNav(newValue)
    // If enabling nav, disable sidebar
    if (newValue) {
      setLocalDevInSidebar(false)
      onToggleDevPanelInSidebar(false)
    }
  }

  const handleToggleInSidebar = () => {
    const newValue = !localDevInSidebar
    setLocalDevInSidebar(newValue)
    onToggleDevPanelInSidebar(newValue)
    // If enabling sidebar, disable nav
    if (newValue) {
      setLocalDevInNav(false)
      onToggleDevPanelInNav(false)
    }
  }

  const handleFocusSettingChange = (key, value) => {
    setFocusSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
        <p className="lede">Customize SmartPlan to match your workflow.</p>
      </header>

      <section className="panels">
        <div className="panel">
          <div className="panel__title">General</div>
          <p className="panel__copy">Theme, notifications, and default durations.</p>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--heading)' }}>Focus Settings</h3>
            
            <div className="todo-field" style={{ marginBottom: '1rem' }}>
              <label>
                Work Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={focusSettings.workDuration}
                onChange={(e) => handleFocusSettingChange('workDuration', parseInt(e.target.value) || 25)}
                className="todo-edit-input"
                style={{ width: '120px' }}
              />
            </div>

            <div className="todo-field" style={{ marginBottom: '1rem' }}>
              <label>
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={focusSettings.breakDuration}
                onChange={(e) => handleFocusSettingChange('breakDuration', parseInt(e.target.value) || 5)}
                className="todo-edit-input"
                style={{ width: '120px' }}
              />
            </div>

            <div className="setting-toggle-row">
              <span className="setting-toggle-label">Enable breaks after work sessions</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={focusSettings.enableBreaks}
                  onChange={(e) => handleFocusSettingChange('enableBreaks', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel__title">Integrations</div>
          <p className="panel__copy">Connect calendar, tasks, and communication tools.</p>
        </div>
        <div className="panel">
          <div className="panel__title">Developer</div>
          <p className="panel__copy">Advanced debugging and testing tools.</p>
          <div className="setting-toggle-row">
            <span className="setting-toggle-label">Enable Dev Panel</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={localDevEnabled}
                onChange={handleToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          {localDevEnabled && (
            <>
              <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                Dev Panel is now available in the sidebar navigation.
              </p>
              <div className="setting-toggle-row" style={{ marginTop: '1rem' }}>
                <span className="setting-toggle-label">Show in navigation bar</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={localDevInNav}
                    onChange={handleToggleInNav}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {localDevInNav && (
                <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                  Dev panel controls are now visible on all pages.
                </p>
              )}
              <div className="setting-toggle-row" style={{ marginTop: '1rem' }}>
                <span className="setting-toggle-label">Show in sidebar</span>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={localDevInSidebar}
                    onChange={handleToggleInSidebar}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {localDevInSidebar && (
                <p className="panel__copy" style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                  Dev panel controls are now pinned in the sidebar.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
