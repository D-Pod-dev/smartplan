import { useLocation, useNavigate } from 'react-router-dom'
import { useFocusTimer } from '../contexts/FocusTimerContext'

export default function FloatingTimer() {
  const { timerState, timeRemaining, breakTimeRemaining, selectedTask } = useFocusTimer()
  const location = useLocation()
  const navigate = useNavigate()

  // Don't show on Focus page
  if (location.pathname === '/focus') {
    return null
  }

  // Don't show if timer is idle
  if (timerState === 'idle') {
    return null
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentTime = timerState === 'break' ? breakTimeRemaining : timeRemaining
  const isBreak = timerState === 'break'
  const isPaused = timerState === 'paused'

  return (
    <div
      className="floating-timer"
      onClick={() => navigate('/focus')}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        background: isBreak ? 'rgba(107, 212, 255, 0.1)' : 'rgba(123, 168, 240, 0.1)',
        border: isBreak ? '2px solid #6bd4ff' : '2px solid #7ba8f0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        cursor: 'pointer',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        transition: 'all 200ms ease',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        minWidth: '180px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.background = isBreak ? 'rgba(107, 212, 255, 0.15)' : 'rgba(123, 168, 240, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = isBreak ? 'rgba(107, 212, 255, 0.1)' : 'rgba(123, 168, 240, 0.1)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isBreak ? '☕ Break Time' : isPaused ? '⏸ Paused' : '⏱ Focus Session'}
        </div>
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: isBreak ? '#6bd4ff' : '#7ba8f0',
          }}
        >
          {formatTime(currentTime)}
        </div>
        {selectedTask && !isBreak && (
          <div style={{ fontSize: '0.8rem', color: 'var(--sidebar-text)', marginTop: '0.25rem' }}>
            {selectedTask.title}
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
          Click to return to Focus
        </div>
      </div>
    </div>
  )
}
