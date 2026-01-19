import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar.jsx'
import Today from './pages/Today.jsx'
import Tasks from './pages/Tasks.jsx'
import SmartPlan from './pages/SmartPlan.jsx'
import Goals from './pages/Goals.jsx'
import Insights from './pages/Insights.jsx'
import Settings from './pages/Settings.jsx'
import DevPanel from './pages/DevPanel.jsx'
import Focus from './pages/Focus.jsx'
import { setDebugDate, getDebugDate } from './utils/dateUtils.js'
import { useSupabaseTags } from './hooks/useSupabaseTags'
import { useSupabaseGoals } from './hooks/useSupabaseGoals'

// Routed layout shell for pages

const PROTECTED_TAGS = ['Goal']

const deriveInitialTags = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tags')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const tags = Array.from(new Set(parsed.map((t) => String(t).trim()).filter(Boolean)))
          // Ensure protected tags are always included
          PROTECTED_TAGS.forEach(tag => {
            if (!tags.includes(tag)) tags.push(tag)
          })
          return tags
        }
      } catch {}
    }
  }
  return [...PROTECTED_TAGS]
}

const deriveInitialGoals = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.goals')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      } catch {}
    }
  }
  return []
}

const deriveDevPanelSettings = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.settings.devPanel')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          enabled: parsed.enabled ?? false,
          inNav: parsed.inNav ?? false,
          inSidebar: parsed.inSidebar ?? false,
        }
      } catch {}
    }
  }
  return { enabled: false, inNav: false, inSidebar: false }
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [tags, setTags] = useState(() => deriveInitialTags())
  const [goals, setGoals] = useState(() => deriveInitialGoals())
  const [deleteTasksByGoalId, setDeleteTasksByGoalId] = useState(() => () => {})
  const devPanelSettings = deriveDevPanelSettings()
  const [devPanelEnabled, setDevPanelEnabled] = useState(devPanelSettings.enabled)
  const [devPanelInNav, setDevPanelInNav] = useState(devPanelSettings.inNav)
  const [devPanelInSidebar, setDevPanelInSidebar] = useState(devPanelSettings.inSidebar)
  const [debugDate, setDebugDateState] = useState(() => getDebugDate())

  // Sync tags and goals with Supabase
  const { syncStatus: tagsSyncStatus } = useSupabaseTags(tags)
  const { syncStatus: goalsSyncStatus } = useSupabaseGoals(goals)

  useEffect(() => {
    localStorage.setItem('smartplan.tags', JSON.stringify(tags))
  }, [tags])

  useEffect(() => {
    localStorage.setItem('smartplan.goals', JSON.stringify(goals))
  }, [goals])

  useEffect(() => {
    localStorage.setItem('smartplan.settings.devPanel', JSON.stringify({
      enabled: devPanelEnabled,
      inNav: devPanelInNav,
      inSidebar: devPanelInSidebar,
    }))
  }, [devPanelEnabled, devPanelInNav, devPanelInSidebar])

  const closeSidebar = () => setIsSidebarOpen(false)
  const handleOverlayKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      closeSidebar()
    }
  }

  const addTagToPool = (label) => {
    const tag = label.trim()
    if (!tag) return null
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    return tag
  }

  const renameTag = (oldName, newName) => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    if (tags.includes(trimmed)) {
      alert('A tag with this name already exists')
      return
    }
    setTags((prev) => prev.map((t) => (t === oldName ? trimmed : t)))
  }

  const deleteTag = (tag) => {
    if (PROTECTED_TAGS.includes(tag)) {
      alert(`The "${tag}" tag is protected and cannot be deleted.`)
      return
    }
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleToggleDevPanelInNav = (enabled) => {
    setDevPanelInNav(enabled)
  }

  const handleToggleDevPanel = (enabled) => {
    setDevPanelEnabled(enabled)
  }
  const handleToggleDevPanelInSidebar = (enabled) => {
    setDevPanelInSidebar(enabled)
  }
  const handleDateChange = (isoDate) => {
    setDebugDate(isoDate)
    setDebugDateState(isoDate)
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('debugDateChanged'))
  }

  return (
    <div className="app-shell">
      <button
        className="sidebar-toggle"
        type="button"
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar"
        onClick={() => setIsSidebarOpen((open) => !open)}
      >
        {isSidebarOpen ? 'Close' : 'Menu'}
      </button>

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} devPanelEnabled={devPanelEnabled} devPanelInSidebar={devPanelInSidebar} debugDate={debugDate} onDateChange={handleDateChange} />

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          aria-label="Close sidebar"
          role="button"
          tabIndex={0}
          onClick={closeSidebar}
          onKeyDown={handleOverlayKeyDown}
        />
      )}

      <main className="page">
        {devPanelInNav && (
          <div className="dev-panel-nav">
            <div className="dev-panel-nav-content">
              <span className="dev-panel-nav-label">Debug Date:</span>
              <input 
                type="date" 
                value={debugDate || (() => {
                  const today = new Date()
                  const year = today.getFullYear()
                  const month = String(today.getMonth() + 1).padStart(2, '0')
                  const day = String(today.getDate()).padStart(2, '0')
                  return `${year}-${month}-${day}`
                })()}
                onChange={(e) => handleDateChange(e.target.value)}
                className="dev-panel-nav-input"
              />
              <button 
                onClick={() => handleDateChange(null)}
                className="dev-panel-nav-button"
              >
                Reset
              </button>
              <span className="dev-panel-nav-status">
                {debugDate ? '🟢 Override Active' : '⚪ System Date'}
              </span>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Today tags={tags} goals={goals} setGoals={setGoals} onAddTag={addTagToPool} onRenameTag={renameTag} onDeleteTag={deleteTag} onRegisterDeleteTasksByGoalId={setDeleteTasksByGoalId} />} />
          <Route path="/tasks" element={<Tasks tags={tags} goals={goals} setGoals={setGoals} onAddTag={addTagToPool} onRenameTag={renameTag} onDeleteTag={deleteTag} onRegisterDeleteTasksByGoalId={setDeleteTasksByGoalId} />} />
          <Route path="/goals" element={<Goals tags={tags} goals={goals} setGoals={setGoals} onAddTag={addTagToPool} onRenameTag={renameTag} onDeleteTag={deleteTag} onDeleteTasksByGoalId={deleteTasksByGoalId} />} />
          <Route path="/chat" element={<SmartPlan />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings devPanelEnabled={devPanelEnabled} onToggleDevPanel={handleToggleDevPanel} devPanelInNav={devPanelInNav} onToggleDevPanelInNav={handleToggleDevPanelInNav} devPanelInSidebar={devPanelInSidebar} onToggleDevPanelInSidebar={handleToggleDevPanelInSidebar} />} />
          <Route path="/dev" element={<DevPanel currentDate={debugDate} onDateChange={handleDateChange} />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
