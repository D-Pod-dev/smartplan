import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import '../App.css'

const mainNavItems = [
  { label: 'Today', to: '/' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Goals', to: '/goals' },
  { label: 'Focus', to: '/focus' },
  { label: 'SmartPlan Chat', to: '/chat' },
]

const footerNavItems = [
  { label: 'Insights', to: '/insights' },
  { label: 'Settings', to: '/settings' },
]

export default function Sidebar({ isOpen, onClose, devPanelEnabled, devPanelInSidebar, debugDate, onDateChange, currentPath, timerOverrideTime, onTimerOverride, timerState }) {
  const navigate = useNavigate()
  const [timerInput, setTimerInput] = useState('00:00')
  
  const isOnFocusPage = currentPath === '/focus'
  const isTimerRunning = timerState === 'running'
  
  const handleTimerInputChange = (e) => {
    const value = e.target.value
    setTimerInput(value)
  }

  const handleApplyTimerOverride = () => {
    // Parse MM:SS format
    const parts = timerInput.split(':')
    if (parts.length !== 2) return
    
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      alert('Please enter valid time in MM:SS format (e.g., 05:30)')
      return
    }
    
    const totalSeconds = minutes * 60 + seconds
    onTimerOverride(totalSeconds)
  }

  const handleResetTimerOverride = () => {
    setTimerInput('00:00')
    onTimerOverride(null)
  }
  return (
    <aside
      id="app-sidebar"
      className={`sidebar ${isOpen ? 'is-open' : ''}`}
      aria-label="Sidebar navigation"
    >
      <div className="sidebar__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <div className="brand__text">
            <span className="brand__title">SmartPlan</span>
            <span className="brand__subtitle">AI to-do</span>
          </div>
        </div>
        <button className="sidebar__close" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <nav className="sidebar__nav">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            onClick={onClose}
            end={item.to === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        {devPanelInSidebar && (
          <div className="sidebar-dev-panel">
            <div className="sidebar-dev-panel-title">Dev Panel</div>
            <div className="sidebar-dev-panel-controls">
              <label className="sidebar-dev-panel-label">
                <span>Debug Date</span>
                <input 
                  type="date" 
                  value={debugDate || (() => {
                    const today = new Date()
                    const year = today.getFullYear()
                    const month = String(today.getMonth() + 1).padStart(2, '0')
                    const day = String(today.getDate()).padStart(2, '0')
                    return `${year}-${month}-${day}`
                  })()}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="sidebar-dev-panel-input"
                />
              </label>
              <button 
                onClick={() => onDateChange(null)}
                className="sidebar-dev-panel-button"
              >
                Reset
              </button>
              <div className="sidebar-dev-panel-status">
                {debugDate ? '🟢 Override Active' : '⚪ System Date'}
              </div>
            </div>
            {isOnFocusPage && isTimerRunning && (
              <div className="sidebar-dev-panel-controls" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', marginBottom: '8px' }}>Focus Timer Override</div>
                <label className="sidebar-dev-panel-label">
                  <span>Time (MM:SS)</span>
                  <input 
                    type="text" 
                    value={timerInput}
                    onChange={handleTimerInputChange}
                    placeholder="05:30"
                    className="sidebar-dev-panel-input"
                  />
                </label>
                <button 
                  onClick={handleApplyTimerOverride}
                  className="sidebar-dev-panel-button"
                  style={{ backgroundColor: '#4CAF50', color: 'white' }}
                >
                  Apply Override
                </button>
                <button 
                  onClick={handleResetTimerOverride}
                  className="sidebar-dev-panel-button"
                >
                  Reset Timer
                </button>
                <div className="sidebar-dev-panel-status">
                  {timerOverrideTime !== null ? `🟢 Override: ${Math.floor(timerOverrideTime / 60)}:${(timerOverrideTime % 60).toString().padStart(2, '0')}` : '⚪ No Override'}
                </div>
              </div>
            )}
          </div>
        )}
        <nav className="sidebar__nav">
          {devPanelEnabled && (
            <NavLink
              to="/dev"
              className={({ isActive }) => `sidebar__link sidebar__link--dev ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
            >
              Dev Panel
            </NavLink>
          )}
          {footerNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
