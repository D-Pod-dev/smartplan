import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
const deriveTasksFromLocalStorage = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // Filter tasks that have timeAllocated and are not completed
          return parsed.filter(task => task.timeAllocated && !task.completed)
        }
      } catch {}
    }
  }
  return []
}
export default function Focus() {
  const navigate = useNavigate()
  const [focusSettings] = useState(() => deriveFocusSettings())
  const [tasks, setTasks] = useState(() => deriveTasksFromLocalStorage())
  const [selectedTask, setSelectedTask] = useState(null)
  const [timerState, setTimerState] = useState('idle') // idle, running, paused, break, completed
  const [timeRemaining, setTimeRemaining] = useState(0) // in seconds
  const [totalTime, setTotalTime] = useState(0) // in seconds
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [checkInMessage, setCheckInMessage] = useState('')
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)
  const intervalRef = useRef(null)

  // Listen for changes to localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setTasks(deriveTasksFromLocalStorage())
    }

    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom events from within the app
    window.addEventListener('tasksUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('tasksUpdated', handleStorageChange)
    }
  }, [])

  const startFocusSession = (task) => {
    setSelectedTask(task)
    const timeInSeconds = task.timeAllocated * 60
    setTimeRemaining(timeInSeconds)
    setTotalTime(timeInSeconds)
    setTimerState('running')
    setHasCheckedIn(false)
  }

  const pauseTimer = () => {
    setTimerState('paused')
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resumeTimer = () => {
    setTimerState('running')
  }

  const stopSession = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimerState('idle')
    setSelectedTask(null)
    setTimeRemaining(0)
    setTotalTime(0)
    setHasCheckedIn(false)
    setCheckInMessage('')
  }

  const startBreak = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setBreakTimeRemaining(focusSettings.breakDuration * 60)
    setTimerState('break')
  }

  const skipBreak = () => {
    setTimerState('idle')
    setSelectedTask(null)
    setTimeRemaining(0)
    setTotalTime(0)
    setBreakTimeRemaining(0)
  }

  // Timer effect
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            
            // Session completed
            if (focusSettings.enableBreaks) {
              setTimerState('completed')
            } else {
              setTimerState('idle')
              setSelectedTask(null)
            }
            return 0
          }

          const newTime = prev - 1
          const halfwayPoint = totalTime / 2

          // Check in at halfway point if task is at least 20 minutes
          if (
            !hasCheckedIn &&
            totalTime >= 20 * 60 &&
            newTime <= halfwayPoint &&
            prev > halfwayPoint
          ) {
            setHasCheckedIn(true)
            setTimerState('paused')
            setCheckInMessage('Halfway there! How are you progressing?')
          }

          return newTime
        })
      }, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [timerState, totalTime, hasCheckedIn, focusSettings.enableBreaks])

  // Break timer effect
  useEffect(() => {
    if (timerState === 'break') {
      intervalRef.current = setInterval(() => {
        setBreakTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setTimerState('idle')
            setSelectedTask(null)
            setBreakTimeRemaining(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [timerState])

  // --- Add state and handlers for custom session and mark complete ---
  const [customSessionMinutes, setCustomSessionMinutes] = useState(5)

  const handleMarkTaskComplete = () => {
    if (!selectedTask) return;
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const updated = parsed.map(task =>
          task.id === selectedTask.id ? { ...task, completed: true } : task
        )
        localStorage.setItem('smartplan.tasks', JSON.stringify(updated))
        window.dispatchEvent(new Event('tasksUpdated'))
        setTimerState('idle')
        setSelectedTask(null)
      } catch {}
    }
  }

  const startAnotherSession = (minutes) => {
    if (!selectedTask) return;
    setTimeRemaining(minutes * 60)
    setTotalTime(minutes * 60)
    setTimerState('running')
    setHasCheckedIn(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const continueFromCheckIn = () => {
    setCheckInMessage('')
    setTimerState('running')
  }



  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Deep Work</p>
        <h1>Focus</h1>
        <p className="lede">Select a task and stay focused with timed work sessions.</p>
      </header>

      <section className="panels">
        {timerState === 'idle' && (
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div className="panel__title">Select a Task</div>
              <button
                className="pill--utility"
                onClick={() => setShowTooltip(true)}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title="Don't see the task you want to work on?"
              >
                <span style={{ fontSize: '1rem' }}>ℹ️</span>
                Help
              </button>
            </div>
            <p className="panel__copy">Choose a task with allocated time to begin a focus session.</p>
            
            {tasks.length === 0 ? (
              <p className="panel__copy" style={{ marginTop: '1rem' }}>
                No tasks with allocated time found. Add tasks with time allocations in the Tasks page.
              </p>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="insight"
                    style={{
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onClick={() => startFocusSession(task)}
                  >
                    <div>
                      <div className="insight__label">{task.title}</div>
                      <div className="insight__meta" style={{ marginTop: '0.25rem' }}>
                        {task.timeAllocated} minutes
                        {task.tags && task.tags.length > 0 && (
                          <span> · {task.tags.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="action primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        startFocusSession(task)
                      }}
                    >
                      Start
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(timerState === 'running' || timerState === 'paused') && selectedTask && (
          <div className="panel">
            <div className="panel__title">{selectedTask.title}</div>
            <p className="panel__copy">Stay focused on your task.</p>
            
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              textAlign: 'center', 
              margin: '2rem 0',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--heading)'
            }}>
              {formatTime(timeRemaining)}
            </div>

            {checkInMessage && (
              <div className="insight" style={{
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <p className="insight__label" style={{ marginBottom: '1rem' }}>{checkInMessage}</p>
                <button
                  className="action primary"
                  onClick={continueFromCheckIn}
                >
                  Continue
                </button>
              </div>
            )}

            <div className="actions" style={{ justifyContent: 'center' }}>
              {timerState === 'running' && !checkInMessage && (
                <button className="action ghost" onClick={pauseTimer}>
                  Pause
                </button>
              )}
              {timerState === 'paused' && !checkInMessage && (
                <button className="action primary" onClick={resumeTimer}>
                  Resume
                </button>
              )}
              <button className="action ghost" onClick={stopSession}>
                Stop Session
              </button>
            </div>

            <div className="panel__copy" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <div>Allocated: {selectedTask.timeAllocated} minutes</div>
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div style={{ marginTop: '0.25rem' }}>Tags: {selectedTask.tags.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {timerState === 'completed' && selectedTask && (
          <div className="panel">
            <div className="panel__title">Session Complete! 🎉</div>
            <p className="panel__copy">Great work on "{selectedTask.title}"!</p>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (typeof customSessionMinutes === 'number' && customSessionMinutes > 0) {
                  startAnotherSession(customSessionMinutes);
                }
              }}
              style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--heading)', marginBottom: '0.5rem' }}>Did you complete your goal for this session?</div>
                <div className="actions" style={{ justifyContent: 'center', gap: '0.7rem' }}>
                  <button
                    type="button"
                    className="action primary"
                    onClick={() => handleMarkTaskComplete()}
                  >
                    Mark Task Complete
                  </button>
                  {focusSettings.enableBreaks && (
                    <button type="button" className="action ghost" onClick={startBreak}>
                      Take a {focusSettings.breakDuration}-minute break
                    </button>
                  )}
                  <button type="button" className="action ghost" onClick={skipBreak}>
                    Skip break
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <label htmlFor="customSessionMinutes" style={{ fontWeight: 500, color: 'var(--muted)', marginRight: 8 }}>
                  Or start another session for this task:
                </label>
                <input
                  id="customSessionMinutes"
                  type="number"
                  min={1}
                  value={customSessionMinutes}
                  onChange={e => setCustomSessionMinutes(Number(e.target.value))}
                  style={{ width: 60, marginRight: 8, padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--sidebar-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--heading)' }}
                />
                <span style={{ color: 'var(--muted)' }}>minutes</span>
                <button type="submit" className="action primary" style={{ marginLeft: 12 }}>
                  Start Session
                </button>
              </div>
            </form>
          </div>
        )}


        {timerState === 'break' && (
          <div className="panel">
            <div className="panel__title">Break Time 🧘</div>
            <p className="panel__copy">Rest and recharge.</p>
            
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              textAlign: 'center', 
              margin: '2rem 0',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--heading)'
            }}>
              {formatTime(breakTimeRemaining)}
            </div>

            <div className="actions" style={{ justifyContent: 'center' }}>
              <button className="action ghost" onClick={skipBreak}>
                End Break
              </button>
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel__title">Focus Settings</div>
          <p className="panel__copy">
            Work duration: {focusSettings.workDuration} minutes · 
            Break duration: {focusSettings.breakDuration} minutes · 
            Breaks: {focusSettings.enableBreaks ? 'Enabled' : 'Disabled'}
          </p>
          <p className="panel__copy" style={{ marginTop: '0.5rem' }}>
            Adjust these settings in the General section of Settings.
          </p>
        </div>
      </section>

      {/* Help Tooltip Modal */}
      {showTooltip && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowTooltip(false)} />
          <div className="tag-manager-modal">
            <div className="tag-manager-header">
              <h2>Don't see the task you want to work on?</h2>
              <button
                className="action link"
                onClick={() => setShowTooltip(false)}
                style={{ fontSize: '1.5rem', padding: '0.25rem 0.5rem' }}
              >
                ×
              </button>
            </div>
            <div className="tag-manager-content">
              <p style={{ 
                color: 'var(--sidebar-text)', 
                lineHeight: '1.6',
                marginBottom: '1rem'
              }}>
                For a task to appear in the Focus page, it must meet these requirements:
              </p>
              <ul style={{ 
                color: 'var(--sidebar-text)', 
                lineHeight: '1.8',
                marginBottom: '1.5rem',
                paddingLeft: '1.5rem'
              }}>
                <li>The task must be in <strong style={{ color: 'var(--heading)' }}>Today</strong></li>
                <li>The task must have <strong style={{ color: 'var(--heading)' }}>time allocated</strong> to it</li>
                <li>The task must <strong style={{ color: 'var(--heading)' }}>not be completed</strong></li>
              </ul>
              <p style={{ 
                color: 'var(--muted)', 
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                fontSize: '0.95rem'
              }}>
                You can change these properties by editing your task in the Today or Tasks page.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  className="action ghost"
                  onClick={() => setShowTooltip(false)}
                >
                  Close
                </button>
                <button
                  className="action primary"
                  onClick={() => {
                    setShowTooltip(false)
                    navigate('/tasks')
                  }}
                >
                  Go to All Tasks
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
