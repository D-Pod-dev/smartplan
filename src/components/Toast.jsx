import { useEffect } from 'react'
import '../App.css'

export default function Toast({ message, onView, onUndo, onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div className="toast">
      <div className="toast__message">{message}</div>
      <div className="toast__actions">
        {onView && (
          <button className="toast__button toast__button--view" type="button" onClick={onView}>
            View
          </button>
        )}
        {onUndo && (
          <button className="toast__button toast__button--undo" type="button" onClick={onUndo}>
            Undo
          </button>
        )}
        {onClose && (
          <button className="toast__button toast__button--close" type="button" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  )
}
