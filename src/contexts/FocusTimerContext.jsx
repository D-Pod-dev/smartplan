import { createContext, useContext, useEffect, useRef, useState } from 'react'

const FocusTimerContext = createContext()

export const useFocusTimer = () => {
  const context = useContext(FocusTimerContext)
  if (!context) {
    throw new Error('useFocusTimer must be used within FocusTimerProvider')
  }
  return context
}

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

const loadTimerStateFromStorage = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.focusTimer')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Calculate elapsed time if timer was running
        if (parsed.timerState === 'running' && parsed.lastUpdate) {
          const elapsed = Math.floor((Date.now() - parsed.lastUpdate) / 1000)
          const newTimeRemaining = Math.max(0, (parsed.timeRemaining || 0) - elapsed)
          return {
            ...parsed,
            timeRemaining: newTimeRemaining,
            timerState: newTimeRemaining > 0 ? 'running' : 'completed'
          }
        }
        return parsed
      } catch {}
    }
  }
  return {
    timerState: 'idle',
    timeRemaining: 0,
    totalTime: 0,
    selectedTask: null,
    currentQueueIndex: 0,
    hasCheckedIn: false,
    checkInMessage: '',
    breakTimeRemaining: 0,
    breakPaused: false,
    activeSessionMinutes: null,
    markCompletedBefore: false,
  }
}

const saveTimerStateToStorage = (state) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('smartplan.focusTimer', JSON.stringify({
      ...state,
      lastUpdate: Date.now()
    }))
  }
}

export const FocusTimerProvider = ({ children }) => {
  const [focusSettings] = useState(() => deriveFocusSettings())
  const [timerState, setTimerState] = useState(() => loadTimerStateFromStorage().timerState)
  const [timeRemaining, setTimeRemaining] = useState(() => loadTimerStateFromStorage().timeRemaining)
  const [totalTime, setTotalTime] = useState(() => loadTimerStateFromStorage().totalTime)
  const [selectedTask, setSelectedTask] = useState(() => loadTimerStateFromStorage().selectedTask)
  const [currentQueueIndex, setCurrentQueueIndex] = useState(() => loadTimerStateFromStorage().currentQueueIndex)
  const [hasCheckedIn, setHasCheckedIn] = useState(() => loadTimerStateFromStorage().hasCheckedIn)
  const [checkInMessage, setCheckInMessage] = useState(() => loadTimerStateFromStorage().checkInMessage)
  const [breakTimeRemaining, setBreakTimeRemaining] = useState(() => loadTimerStateFromStorage().breakTimeRemaining)
  const [breakPaused, setBreakPaused] = useState(() => loadTimerStateFromStorage().breakPaused)
  const [activeSessionMinutes, setActiveSessionMinutes] = useState(() => loadTimerStateFromStorage().activeSessionMinutes)
  const [markCompletedBefore, setMarkCompletedBefore] = useState(() => loadTimerStateFromStorage().markCompletedBefore)
  
  const intervalRef = useRef(null)

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    saveTimerStateToStorage({
      timerState,
      timeRemaining,
      totalTime,
      selectedTask,
      currentQueueIndex,
      hasCheckedIn,
      checkInMessage,
      breakTimeRemaining,
      breakPaused,
      activeSessionMinutes,
      markCompletedBefore,
    })
  }, [timerState, timeRemaining, totalTime, selectedTask, currentQueueIndex, hasCheckedIn, checkInMessage, breakTimeRemaining, breakPaused, activeSessionMinutes, markCompletedBefore])

  // Notify App of current timer state for sidebar visibility
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('focusTimerStateUpdate', { detail: { timerState } }))
  }, [timerState])

  // Main timer countdown effect - runs globally regardless of page
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setTimerState('completed')
            return 0
          }

          const newTime = prev - 1
          const halfwayPoint = totalTime / 2

          if (!hasCheckedIn && totalTime >= 20 * 60 && newTime <= halfwayPoint && prev > halfwayPoint) {
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
  }, [timerState, totalTime, hasCheckedIn])

  // Break timer countdown effect
  useEffect(() => {
    if (timerState === 'break' && !breakPaused) {
      intervalRef.current = setInterval(() => {
        setBreakTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setBreakTimeRemaining(0)
            setBreakPaused(true)
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
  }, [timerState, breakPaused])

  // Listen for focus timer override events
  useEffect(() => {
    const handleTimerOverride = (event) => {
      const seconds = event.detail?.seconds
      if (typeof seconds === 'number' && seconds >= 0) {
        if (timerState === 'running' || timerState === 'paused') {
          setTimeRemaining(seconds)
          setTotalTime(seconds)
        }
      }
    }

    window.addEventListener('focusTimerOverride', handleTimerOverride)
    return () => {
      window.removeEventListener('focusTimerOverride', handleTimerOverride)
    }
  }, [timerState])

  const startSession = (task, index, queueLength) => {
    setCurrentQueueIndex(index)
    setSelectedTask(task)
    const timeInSeconds = task.timeAllocated * 60
    setTimeRemaining(timeInSeconds)
    setTotalTime(timeInSeconds)
    setActiveSessionMinutes(task.timeAllocated)
    setTimerState('running')
    setHasCheckedIn(false)
    setMarkCompletedBefore(false)
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
    setActiveSessionMinutes(null)
    setHasCheckedIn(false)
    setCheckInMessage('')
    setMarkCompletedBefore(false)
  }

  const startBreak = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setBreakTimeRemaining(focusSettings.breakDuration * 60)
    setBreakPaused(false)
    setMarkCompletedBefore(false)
    setTimerState('break')
  }

  const skipBreak = () => {
    setTimerState('idle')
    setSelectedTask(null)
    setTimeRemaining(0)
    setTotalTime(0)
    setBreakTimeRemaining(0)
    setBreakPaused(false)
  }

  const pauseBreak = () => {
    setBreakPaused(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resumeBreak = () => {
    setBreakPaused(false)
  }

  const endBreakAndShowOptions = () => {
    setBreakTimeRemaining(0)
    setBreakPaused(true)
  }

  const endSessionAfterBreak = () => {
    setTimerState('idle')
    setSelectedTask(null)
    setTimeRemaining(0)
    setTotalTime(0)
    setBreakTimeRemaining(0)
    setBreakPaused(false)
  }

  const updateCheckInMessage = (message) => {
    setCheckInMessage(message)
  }

  const updateMarkCompletedBefore = (value) => {
    setMarkCompletedBefore(value)
  }

  const updateCurrentQueueIndex = (index) => {
    setCurrentQueueIndex(index)
  }

  const value = {
    // State
    timerState,
    timeRemaining,
    totalTime,
    selectedTask,
    currentQueueIndex,
    hasCheckedIn,
    checkInMessage,
    breakTimeRemaining,
    breakPaused,
    activeSessionMinutes,
    markCompletedBefore,
    focusSettings,
    // Actions
    startSession,
    pauseTimer,
    resumeTimer,
    stopSession,
    startBreak,
    skipBreak,
    pauseBreak,
    resumeBreak,
    endBreakAndShowOptions,
    endSessionAfterBreak,
    updateCheckInMessage,
    updateMarkCompletedBefore,
    updateCurrentQueueIndex,
    setTimerState,
  }

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>
}
