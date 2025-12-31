import { useState, useEffect } from 'react'
import '../App.css'

export default function DevPanel({ currentDate, onDateChange }) {
  const [dateInput, setDateInput] = useState('')

  useEffect(() => {
    if (currentDate) {
      setDateInput(currentDate)
    } else {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      setDateInput(`${year}-${month}-${day}`)
    }
  }, [currentDate])

  const handleApply = () => {
    if (dateInput) {
      onDateChange(dateInput)
    }
  }

  const handleReset = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    setDateInput(todayStr)
    onDateChange(null)
  }

  const handleQuickDate = (daysOffset) => {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    const isoDate = date.toISOString().split('T')[0]
    setDateInput(isoDate)
    onDateChange(isoDate)
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow dev-panel-eyebrow">Developer Tools</p>
        <h1 className="dev-panel-title">Dev Panel</h1>
        <p className="lede dev-panel-lede">Override the current date for debugging and testing.</p>
      </header>

      <section className="panels">
        <div className="panel dev-panel">
          <div className="panel__title dev-panel-section-title">Date Override</div>
          <p className="panel__copy dev-panel-copy">
            {currentDate 
              ? `Currently using debug date: ${new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${currentDate}T00:00:00`))}`
              : 'Using system date (no override)'}
          </p>

          <div className="dev-panel-controls">
            <label className="dev-panel-label">
              <span className="dev-panel-label-text">Select Date</span>
              <input 
                type="date" 
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="dev-panel-input"
              />
            </label>

            <div className="dev-panel-buttons">
              <button 
                type="button"
                onClick={handleApply}
                className="dev-panel-button dev-panel-button--primary"
              >
                Apply Date
              </button>
              <button 
                type="button"
                onClick={handleReset}
                className="dev-panel-button dev-panel-button--secondary"
              >
                Reset to System Date
              </button>
            </div>

            <div className="dev-panel-quick">
              <span className="dev-panel-label-text">Quick Jump</span>
              <div className="dev-panel-quick-buttons">
                <button 
                  type="button"
                  onClick={() => handleQuickDate(-7)}
                  className="dev-panel-button dev-panel-button--small"
                >
                  -7 days
                </button>
                <button 
                  type="button"
                  onClick={() => handleQuickDate(-1)}
                  className="dev-panel-button dev-panel-button--small"
                >
                  Yesterday
                </button>
                <button 
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="dev-panel-button dev-panel-button--small"
                >
                  Tomorrow
                </button>
                <button 
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="dev-panel-button dev-panel-button--small"
                >
                  +7 days
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="panel dev-panel">
          <div className="panel__title dev-panel-section-title">Info</div>
          <p className="panel__copy dev-panel-copy">
            This panel allows you to test date-dependent features without changing your system clock.
            The override affects all date calculations throughout the app.
          </p>
          <div className="dev-panel-info">
            <div className="dev-panel-info-item">
              <span className="dev-panel-info-label">System Date:</span>
              <span className="dev-panel-info-value">
                {new Intl.DateTimeFormat('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(new Date())}
              </span>
            </div>
            <div className="dev-panel-info-item">
              <span className="dev-panel-info-label">App Date:</span>
              <span className="dev-panel-info-value">
                {currentDate 
                  ? new Intl.DateTimeFormat('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${currentDate}T00:00:00`))
                  : 'Same as system'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
