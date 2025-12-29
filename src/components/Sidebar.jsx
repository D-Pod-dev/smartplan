import { NavLink, useNavigate } from 'react-router-dom'
import '../App.css'

const mainNavItems = [
  { label: 'Today', to: '/' },
  { label: 'SmartPlan Chat', to: '/chat' },
]

const footerNavItems = [
  { label: 'Insights', to: '/insights' },
  { label: 'Settings', to: '/settings' },
]

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
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
        <nav className="sidebar__nav">
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
