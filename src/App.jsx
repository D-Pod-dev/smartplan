import { useState } from 'react'
import './App.css'

const navItems = [
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Calendar', href: '#calendar' },
  { label: 'Teams', href: '#teams' },
  { label: 'Reports', href: '#reports' },
  { label: 'Settings', href: '#settings' },
]

const upcoming = [
  { title: 'Sprint Planning', time: 'Tue · 10:00 AM' },
  { title: 'Design Review', time: 'Wed · 2:30 PM' },
  { title: 'Stakeholder Sync', time: 'Thu · 4:00 PM' },
]

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

      <aside
        id="app-sidebar"
        className={`sidebar ${isSidebarOpen ? 'is-open' : ''}`}
        aria-label="Sidebar navigation"
      >
        <div className="sidebar__header">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <div className="brand__text">
              <span className="brand__title">Smart Schedule</span>
              <span className="brand__subtitle">Team planning</span>
            </div>
          </div>
          <button className="sidebar__close" type="button" onClick={closeSidebar}>
            Close
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="sidebar__link"
              onClick={closeSidebar}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar__footer">
          <p className="sidebar__hint">Your time, organized.</p>
          <button className="sidebar__cta" type="button">
            New Event
          </button>
        </div>
      </aside>

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
        <header className="page__header">
          <p className="eyebrow">Schedule</p>
          <h1>Plan work that stays on track</h1>
          <p className="lede">
            Build a predictable rhythm for product, design, and delivery. Keep the team aligned with a
            single view of every commitment.
          </p>
          <div className="actions">
            <button className="action primary" type="button">
              Create schedule
            </button>
            <button className="action ghost" type="button">
              Share calendar
            </button>
          </div>
        </header>

        <section className="panels">
          <div className="panel">
            <div className="panel__title">Upcoming</div>
            <ul className="list">
              {upcoming.map((item) => (
                <li key={item.title} className="list__item">
                  <div className="list__title">{item.title}</div>
                  <div className="list__meta">{item.time}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <div className="panel__title">Team load</div>
            <div className="progress">
              <div className="progress__bar" style={{ width: '72%' }} />
              <div className="progress__meta">72% capacity this week</div>
            </div>
            <p className="panel__copy">
              Stay ahead of conflicts and overbooking with a single source of truth for every team member.
            </p>
          </div>
          <div className="panel">
            <div className="panel__title">Automation</div>
            <p className="panel__copy">
              Automate handoffs, recurring events, and reminders so everyone knows what comes next.
            </p>
            <button className="action link" type="button">
              Explore automations
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
