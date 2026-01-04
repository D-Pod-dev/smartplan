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
  const getStoredTaskCount = () => {
    if (typeof localStorage === 'undefined') return 0
    const saved = localStorage.getItem('smartplan.tasks')
    if (!saved) return 0
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.length : 0
    } catch {
      return 0
    }
  }
  const [taskCount, setTaskCount] = useState(() => getStoredTaskCount())
  const seedTasks = [
    {
      id: 1,
      title: 'Outline launch checklist',
      due: { date: '2026-01-03', time: '11:00' },
      tags: ['Launch', 'Planning'],
      priority: 'High',
      completed: false,
      timeAllocated: 90,
      objective: '5 items',
      goalId: null,
      recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
      inToday: true,
    },
    {
      id: 2,
      title: 'Reply to customer threads',
      due: { date: '2026-01-02', time: '13:00' },
      tags: ['CX', 'Communication'],
      priority: 'Medium',
      completed: false,
      timeAllocated: 45,
      objective: '8 emails',
      goalId: null,
      recurrence: { type: 'Daily', interval: null, unit: 'day', daysOfWeek: [] },
      inToday: true,
    },
    {
      id: 3,
      title: 'Team standup',
      due: { date: '2026-01-02', time: '09:00' },
      tags: ['Meetings'],
      priority: 'High',
      completed: false,
      timeAllocated: 15,
      objective: null,
      goalId: null,
      recurrence: { type: 'Weekly', interval: null, unit: 'week', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      inToday: true,
    },
    {
      id: 4,
      title: 'Review pull requests',
      due: { date: '2026-01-02', time: '15:30' },
      tags: ['Development', 'Code Review'],
      priority: 'Medium',
      completed: false,
      timeAllocated: 60,
      objective: '3 PRs',
      goalId: null,
      recurrence: { type: 'Custom', interval: 2, unit: 'day', daysOfWeek: [] },
      inToday: true,
    },
    {
      id: 5,
      title: 'Weekly planning session',
      due: { date: '2026-01-06', time: '10:00' },
      tags: ['Planning', 'Personal'],
      priority: 'Low',
      completed: false,
      timeAllocated: 30,
      objective: null,
      goalId: null,
      recurrence: { type: 'Weekly', interval: null, unit: 'week', daysOfWeek: ['Mon'] },
      inToday: false,
    },
  ]

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

  const loadSeedTasks = () => {
    localStorage.setItem('smartplan.tasks', JSON.stringify(seedTasks))
    localStorage.setItem('smartplan.tags', JSON.stringify(Array.from(new Set(seedTasks.flatMap((t) => t.tags || [])))))
    setTaskCount(seedTasks.length)
    alert('Seed tasks loaded. Refresh the Tasks/Today pages to see them.')
  }

  const clearAllTasks = () => {
    const confirmed = window.confirm('Delete all tasks? This cannot be undone.')
    if (!confirmed) return
    localStorage.setItem('smartplan.tasks', JSON.stringify([]))
    setTaskCount(0)
    alert('All tasks cleared. Refresh the Tasks/Today pages to see the change.')
  }

  useEffect(() => {
    setTaskCount(getStoredTaskCount())
  }, [])

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
          <div className="panel__title">Data</div>
          <p className="panel__copy">Manage stored tasks for quick testing or resets.</p>
          <p className="panel__copy" style={{ marginTop: '0.4rem', fontSize: '0.95rem', opacity: 0.85 }}>
            Current tasks stored: {taskCount}
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button className="action ghost" type="button" onClick={loadSeedTasks}>
              Load seed tasks
            </button>
            <button className="action" type="button" onClick={clearAllTasks} style={{ borderColor: 'rgba(255, 255, 255, 0.18)' }}>
              Clear all tasks
            </button>
          </div>
          <p className="panel__copy" style={{ marginTop: '0.8rem', fontSize: '0.9rem', opacity: 0.75 }}>
            Loading seeds overwrites your current tasks. Clearing tasks requires confirmation.
          </p>
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
