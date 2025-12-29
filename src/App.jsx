import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar.jsx'
import Today from './pages/Today.jsx'
import SmartPlan from './pages/SmartPlan.jsx'
import Insights from './pages/Insights.jsx'
import Settings from './pages/Settings.jsx'

// Routed layout shell for pages

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const closeSidebar = () => setIsSidebarOpen(false)
  const handleOverlayKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      closeSidebar()
    }
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

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

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
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/chat" element={<SmartPlan />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
