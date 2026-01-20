import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FocusQueue from '../components/FocusQueue'
import { useSupabaseFocusQueue } from '../hooks/useSupabaseFocusQueue'
import { useFocusTimer } from '../contexts/FocusTimerContext'
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
    const queueSaved = localStorage.getItem('smartplan.focusQueue')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const queueIds = new Set()
        
        // Get IDs of tasks in the queue
        if (queueSaved) {
          try {
            const queueParsed = JSON.parse(queueSaved)
            if (Array.isArray(queueParsed)) {
              queueParsed.forEach(item => queueIds.add(item.id))
            }
          } catch {}
        }
        
        if (Array.isArray(parsed)) {
          // Include tasks with timeAllocated that are either not completed OR in the queue
          return parsed.filter(task => task.timeAllocated && (!task.completed || queueIds.has(task.id)))
        }
      } catch {}
    }
  }
  return []
}

const deriveQueueFromLocalStorage = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.focusQueue')
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

const deriveTaskCompletionMap = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.reduce((acc, task) => {
            acc[task.id] = !!task.completed
            return acc
          }, {})
        }
      } catch {}
    }
  }
  return {}
}

const mergeQueueWithTasks = (taskList, queueList) => {
  const taskMap = taskList.reduce((acc, task) => {
    acc[task.id] = task
    return acc
  }, {})

  return queueList.map((item) => {
    const latest = taskMap[item.id]
    if (!latest) return item
    return { ...latest, addedAt: item.addedAt }
  })
}

const queuesDiffer = (a, b) => {
  if (a.length !== b.length) return true
  for (let i = 0; i < a.length; i += 1) {
    const current = a[i]
    const next = b[i]
    if (!current || !next) return true
    if (current.id !== next.id) return true
    if (current.title !== next.title) return true
    if (current.timeAllocated !== next.timeAllocated) return true
    if (current.objective !== next.objective) return true
    if ((current.priority || '') !== (next.priority || '')) return true
    const currentTags = Array.isArray(current.tags) ? current.tags.join('|') : ''
    const nextTags = Array.isArray(next.tags) ? next.tags.join('|') : ''
    if (currentTags !== nextTags) return true
  }
  return false
}

const saveQueueToLocalStorage = (queue) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('smartplan.focusQueue', JSON.stringify(queue))
    window.dispatchEvent(new Event('queueUpdated'))
  }
}

const deriveQueuePinnedFromLocalStorage = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.queuePinned')
    if (saved !== null) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
  }
  return false
}

const saveQueuePinnedToLocalStorage = (pinned) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('smartplan.queuePinned', JSON.stringify(pinned))
  }
}

const deriveTimeAdjustmentsFromLocalStorage = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.timeAdjustments')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed
        }
      } catch {}
    }
  }
  return {}
}

const saveTimeAdjustmentsToLocalStorage = (adjustments) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('smartplan.timeAdjustments', JSON.stringify(adjustments))
  }
}

export default function Focus() {
  const navigate = useNavigate()
  const [focusSettings] = useState(() => deriveFocusSettings())
  const [tasks, setTasks] = useState(() => deriveTasksFromLocalStorage())
  const [queue, setQueue] = useState(() => deriveQueueFromLocalStorage())
  const [queueExpanded, setQueueExpanded] = useState(true)
  const [queuePinned, setQueuePinned] = useState(() => deriveQueuePinnedFromLocalStorage())
  const [showSkipModal, setShowSkipModal] = useState(false)
  const [taskCompletedMap, setTaskCompletedMap] = useState(() => deriveTaskCompletionMap())
  const [skipModalChoice, setSkipModalChoice] = useState(null)
  const [skipModalAction, setSkipModalAction] = useState(null)
  const [cumulativeTime, setCumulativeTime] = useState({})
  const [timeAdjustments, setTimeAdjustments] = useState(() => deriveTimeAdjustmentsFromLocalStorage())
  const [customSessionMinutes, setCustomSessionMinutes] = useState(5)
  const [sortOption, setSortOption] = useState('default')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showStartTransition, setShowStartTransition] = useState(false)
  const [pendingTaskIndex, setPendingTaskIndex] = useState(null)
  const [pendingQueue, setPendingQueue] = useState(null)
  const [queueEditMode, setQueueEditMode] = useState(false)
  const [editQueueSnapshot, setEditQueueSnapshot] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const queueHoverRef = useRef(null)
  const queueCollapseTimeoutRef = useRef(null)
  const markCompleteButtonRef = useRef(null)

  // Get timer state and actions from context
  const {
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
  } = useFocusTimer()

  // Sync focus queue with Supabase
  const { syncStatus: queueSyncStatus } = useSupabaseFocusQueue(queue, currentQueueIndex)

  const sortTasksForDisplay = useMemo(() => {
    const priorityRank = { High: 0, Medium: 1, Low: 2, None: 3 }
    const toDateValue = (task) => {
      if (!task.due?.date) return Number.POSITIVE_INFINITY
      const base = new Date(`${task.due.date}T${task.due.time || '00:00'}`).getTime()
      return Number.isFinite(base) ? base : Number.POSITIVE_INFINITY
    }
    return (list, option, direction = 'asc') => {
      const copy = [...list]
      if (option === 'priority') {
        copy.sort((a, b) => (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4))
        return direction === 'desc' ? copy.reverse() : copy
      }
      if (option === 'due') {
        copy.sort((a, b) => toDateValue(a) - toDateValue(b))
        return direction === 'desc' ? copy.reverse() : copy
      }
      if (option === 'time') {
        copy.sort((a, b) => (b.timeAllocated ?? 0) - (a.timeAllocated ?? 0))
        return direction === 'desc' ? copy.reverse() : copy
      }
      if (option === 'title') {
        copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        return direction === 'desc' ? copy.reverse() : copy
      }
      if (direction === 'desc') return copy.reverse()
      return copy
    }
  }, [])

  const sortedTasks = useMemo(() => sortTasksForDisplay(tasks, sortOption, sortDirection), [tasks, sortOption, sortDirection, sortTasksForDisplay])

  useEffect(() => {
    const handleStorageChange = () => {
      const latestTasks = deriveTasksFromLocalStorage()
      const storedQueue = deriveQueueFromLocalStorage()
      const mergedQueue = mergeQueueWithTasks(latestTasks, storedQueue)
      const completionMap = deriveTaskCompletionMap()

      setTasks(latestTasks)
      setQueue((prev) => {
        if (!queuesDiffer(prev, mergedQueue)) return prev
        saveQueueToLocalStorage(mergedQueue)
        return mergedQueue
      })
      setTaskCompletedMap(completionMap)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('tasksUpdated', handleStorageChange)
    window.addEventListener('queueUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('tasksUpdated', handleStorageChange)
      window.removeEventListener('queueUpdated', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    setQueue((prev) => {
      const merged = mergeQueueWithTasks(tasks, prev)
      if (!queuesDiffer(prev, merged)) return prev
      saveQueueToLocalStorage(merged)
      return merged
    })
  }, [tasks])

  useEffect(() => {
    if (queueEditMode && timerState !== 'completed') {
      setQueueEditMode(false)
      setEditQueueSnapshot(null)
    }
  }, [timerState, queueEditMode])

  const startFocusSessionFromQueue = (index, sourceQueue = queue) => {
    if (!sourceQueue || index >= sourceQueue.length) return
    setPendingTaskIndex(index)
    setPendingQueue(sourceQueue)
    setShowStartTransition(true)
  }

  const confirmStartSession = () => {
    if (pendingQueue === null || pendingTaskIndex === null) return
    if (pendingTaskIndex >= pendingQueue.length) return
    
    const task = pendingQueue[pendingTaskIndex]
    startSession(task, pendingTaskIndex, pendingQueue.length)
    setShowStartTransition(false)
    setPendingTaskIndex(null)
    setPendingQueue(null)
    if (!queuePinned) {
      setQueueExpanded(false)
    }
  }

  const cancelStartSession = () => {
    setShowStartTransition(false)
    setPendingTaskIndex(null)
    setPendingQueue(null)
  }

  const addTaskToQueue = (task) => {
    if (queueLocked) return
    if (queue.some(item => item.id === task.id)) return
    const newQueue = [...queue, { ...task, addedAt: Date.now() }]
    setQueue(newQueue)
    saveQueueToLocalStorage(newQueue)
  }

  const removeTaskFromQueue = (taskId) => {
    if (queueLocked) return
    const newQueue = queue.filter(item => item.id !== taskId)
    const adjustedIndex = timerState === 'idle'
      ? 0
      : Math.min(currentQueueIndex, Math.max(0, newQueue.length - 1))
    setQueue(newQueue)
    updateCurrentQueueIndex(adjustedIndex)
    saveQueueToLocalStorage(newQueue)
  }

  const updateAdjustments = (taskId, deltaAdded = 0, deltaSaved = 0) => {
    if (!taskId) return
    setTimeAdjustments((prev) => {
      const current = prev[taskId] || { added: 0, saved: 0 }
      const newAdjustments = {
        ...prev,
        [taskId]: {
          added: Math.max(0, current.added + deltaAdded),
          saved: Math.max(0, current.saved + deltaSaved),
        },
      }
      saveTimeAdjustmentsToLocalStorage(newAdjustments)
      return newAdjustments
    })
  }

  const confirmStopSession = () => {
    if (confirm('End this focus session?')) {
      stopSession()
      setQueueExpanded(true)
      const emptyAdjustments = {}
      setTimeAdjustments(emptyAdjustments)
      saveTimeAdjustmentsToLocalStorage(emptyAdjustments)
    }
  }

  const handlePauseTimer = () => {
    pauseTimer()
    setQueueExpanded(true)
    if (queueCollapseTimeoutRef.current) {
      clearTimeout(queueCollapseTimeoutRef.current)
    }
  }

  const handleResumeTimer = () => {
    resumeTimer()
    if (!queuePinned) {
      setQueueExpanded(false)
    }
  }

  const continueToNextTaskAfterBreak = () => {
    const nextIndex = currentQueueIndex + 1
    if (nextIndex < queue.length) {
      skipBreak()
      startFocusSessionFromQueue(nextIndex)
    }
  }

  const handleEndSessionAfterBreak = () => {
    endSessionAfterBreak()
  }

  useEffect(() => {
    if (queuePinned) {
      setQueueExpanded(true)
    } else if (timerState === 'paused') {
      setQueueExpanded(true)
    } else if (timerState === 'running') {
      setQueueExpanded(false)
    }
  }, [queuePinned, timerState])

  useEffect(() => {
    if (timerState === 'completed') {
      setQueueExpanded(true)
    }
  }, [timerState])

  // Update queue expanded when checkin message appears
  useEffect(() => {
    if (checkInMessage) {
      setQueueExpanded(true)
    }
  }, [checkInMessage])

  useEffect(() => {
    if (queueHoverRef.current && !queuePinned && timerState === 'running') {
      const handleMouseEnter = () => {
        setQueueExpanded(true)
        if (queueCollapseTimeoutRef.current) {
          clearTimeout(queueCollapseTimeoutRef.current)
        }
      }

      const handleMouseLeave = () => {
        if (queueCollapseTimeoutRef.current) {
          clearTimeout(queueCollapseTimeoutRef.current)
        }
        // Only collapse while actively running and not pinned
        if (timerState === 'running' && !queuePinned) {
          setQueueExpanded(false)
        }
      }

      queueHoverRef.current.addEventListener('mouseenter', handleMouseEnter)
      queueHoverRef.current.addEventListener('mouseleave', handleMouseLeave)

      return () => {
        if (queueHoverRef.current) {
          queueHoverRef.current.removeEventListener('mouseenter', handleMouseEnter)
          queueHoverRef.current.removeEventListener('mouseleave', handleMouseLeave)
        }
        if (queueCollapseTimeoutRef.current) {
          clearTimeout(queueCollapseTimeoutRef.current)
        }
      }
    }
  }, [queuePinned, timerState])

  const handleMarkTaskComplete = () => {
    if (!selectedTask) return
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const isCurrentlyCompleted = taskCompletedMap[selectedTask.id]
        const updated = parsed.map(task =>
          task.id === selectedTask.id ? { ...task, completed: !isCurrentlyCompleted } : task
        )
        localStorage.setItem('smartplan.tasks', JSON.stringify(updated))
        window.dispatchEvent(new Event('tasksUpdated'))

        setTaskCompletedMap(prev => ({
          ...prev,
          [selectedTask.id]: !isCurrentlyCompleted
        }))

        if (timerState === 'completed') {
          updateMarkCompletedBefore(!isCurrentlyCompleted)
        }
        // Don't reset to idle - stay in current state
      } catch {}
    }
  }

  const handleSkipModalSubmit = () => {
    if (!skipModalChoice || !skipModalAction) return

    if (!selectedTask) return

    const newQueue = [...queue]
    let nextIndex = currentQueueIndex + 1

    // Handle the task choice
    if (skipModalChoice === 'mark-complete') {
      const saved = localStorage.getItem('smartplan.tasks')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const isCurrentlyCompleted = taskCompletedMap[selectedTask.id]
          const updated = parsed.map(task =>
            task.id === selectedTask.id ? { ...task, completed: !isCurrentlyCompleted } : task
          )
          localStorage.setItem('smartplan.tasks', JSON.stringify(updated))
          window.dispatchEvent(new Event('tasksUpdated'))

          setTaskCompletedMap(prev => ({
            ...prev,
            [selectedTask.id]: !isCurrentlyCompleted
          }))
        } catch {}
      }
    } else if (skipModalChoice === 'move-after') {
      if (nextIndex < newQueue.length) {
        const current = newQueue[currentQueueIndex]
        newQueue.splice(currentQueueIndex, 1)
        newQueue.splice(currentQueueIndex + 1, 0, current)
        nextIndex = currentQueueIndex
      }
    } else if (skipModalChoice === 'move-end') {
      const current = newQueue[currentQueueIndex]
      newQueue.splice(currentQueueIndex, 1)
      newQueue.push(current)
      nextIndex = currentQueueIndex
    } else if (skipModalChoice === 'skip-task') {
      // Skip task - don't move, just advance index
    }

    // Handle the action choice
    if (skipModalAction === 'next-task') {
      if (nextIndex < newQueue.length) {
        setQueue(newQueue)
        saveQueueToLocalStorage(newQueue)
        startFocusSessionFromQueue(nextIndex, newQueue)
      } else {
        setQueue(newQueue)
        saveQueueToLocalStorage(newQueue)
        stopSession()
      }
    } else if (skipModalAction === 'take-break') {
      setQueue(newQueue)
      saveQueueToLocalStorage(newQueue)
      startBreak()
    }

    setShowSkipModal(false)
    setSkipModalChoice(null)
    setSkipModalAction(null)
  }

  const handleNextTaskClick = () => {
    // If task is already marked complete, proceed directly without modal
    if (taskCompletedMap[selectedTask?.id]) {
      handleSkipModalSubmit_DirectAction('next-task')
    } else {
      setShowSkipModal(true)
      setSkipModalChoice(null)
      setSkipModalAction('next-task')
    }
  }

  const handleTakeBreakClick = () => {
    // If task is already marked complete, proceed directly without modal
    if (taskCompletedMap[selectedTask?.id]) {
      handleSkipModalSubmit_DirectAction('take-break')
    } else {
      setShowSkipModal(true)
      setSkipModalChoice(null)
      setSkipModalAction('take-break')
    }
  }

  const handleSkipModalSubmit_DirectAction = (action) => {
    if (!selectedTask) return

    const newQueue = [...queue]
    let nextIndex = currentQueueIndex + 1

    // Handle the action choice
    if (action === 'next-task') {
      if (nextIndex < newQueue.length) {
        setQueue(newQueue)
        saveQueueToLocalStorage(newQueue)
        startFocusSessionFromQueue(nextIndex, newQueue)
      } else {
        setQueue(newQueue)
        saveQueueToLocalStorage(newQueue)
        stopSession()
      }
    } else if (action === 'take-break') {
      setQueue(newQueue)
      saveQueueToLocalStorage(newQueue)
      startBreak()
    }
  }

  const closeSkipModal = () => {
    setShowSkipModal(false)
    setSkipModalChoice(null)
    setSkipModalAction(null)
  }

  const startAnotherSession = (minutes) => {
    if (!selectedTask) return

    const taskId = selectedTask.id
    const previousTotal = cumulativeTime[taskId] ?? selectedTask.timeAllocated

    setCumulativeTime(prev => ({
      ...prev,
      [taskId]: previousTotal + minutes
    }))

    updateAdjustments(taskId, minutes, 0)

    startSession({ ...selectedTask, timeAllocated: minutes }, currentQueueIndex, queue.length)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const continueFromCheckIn = () => {
    updateCheckInMessage('')
    resumeTimer()
  }

  const formatTarget = (target) => {
    if (target === null || target === undefined || target === '') return null
    return typeof target === 'number' ? `${target}` : target
  }

  const getAdjustmentForTask = (taskId) => {
    return timeAdjustments[taskId] || { added: 0, saved: 0 }
  }

  const getWorkBlockLabel = (task) => {
    if (!task) return ''
    const position = queue.findIndex((item) => item.id === task.id)
    const blockIndex = position >= 0 ? position : currentQueueIndex
    const blockNumber = blockIndex >= 0 ? blockIndex + 1 : 1
    return `Work Block ${blockNumber} - ${task.title}`
  }

  const getTimeAllocationDisplay = (task) => {
    const taskId = task.id
    const { added, saved } = getAdjustmentForTask(taskId)
    const net = added - saved
    const base = `${task.timeAllocated} min`
    if (net === 0) return base

    const netLabel = `${net > 0 ? '+' : ''}${net} min`
    const color = net > 0 ? '#6bd4ff' : '#ff9b6b'

    return (
      <>
        <span>{base}</span>
        <span style={{ marginLeft: '0.4rem', color, fontWeight: 700 }}>{netLabel}</span>
      </>
    )
  }

  const queueLocked = timerState === 'running' || timerState === 'paused'

  const isTaskInQueue = (taskId) => queue.some(item => item.id === taskId)

  const startQueueItem = (index) => {
    if (queueLocked) return
    startFocusSessionFromQueue(index)
  }

  const removeQueueItem = (index) => {
    if (index < 0 || index >= queue.length) return
    if (queueLocked) return

    // Require confirmation when editing queue between work blocks
    if (queueEditMode) {
      const taskTitle = queue[index]?.title || 'this task'
      if (!confirm(`Remove "${taskTitle}" from the queue?`)) {
        return
      }
    }

    const currentTaskId = queue[currentQueueIndex]?.id
    const newQueue = queue.filter((_, i) => i !== index)
    const newCurrentIndex = newQueue.findIndex(item => item.id === currentTaskId)

    setQueue(newQueue)
    saveQueueToLocalStorage(newQueue)
    const adjustedIndex = newCurrentIndex === -1 ? 0 : newCurrentIndex
    updateCurrentQueueIndex(adjustedIndex)
  }

  const moveQueueItem = (index, direction) => {
    if (queueLocked) return
    // Allow full reordering while planning (before timer starts)
    if (timerState !== 'idle') {
      // Prevent moving current task
      if (index === currentQueueIndex) return
      // Prevent moving tasks before current
      if (index < currentQueueIndex) return
      // Prevent moving task after current upward
      if (index === currentQueueIndex + 1 && direction === -1) return
    }
    
    const target = index + direction
    if (target < 0 || target >= queue.length) return

    const newQueue = [...queue]
    const [item] = newQueue.splice(index, 1)
    newQueue.splice(target, 0, item)

    const currentTaskId = queue[currentQueueIndex]?.id
    const newCurrentIndex = timerState === 'idle'
      ? 0
      : newQueue.findIndex(entry => entry.id === currentTaskId)

    setQueue(newQueue)
    saveQueueToLocalStorage(newQueue)
    const adjustedIndex = newCurrentIndex === -1 ? 0 : newCurrentIndex
    updateCurrentQueueIndex(adjustedIndex)
  }

  const clearQueue = () => {
    if (queueLocked) return
    setQueue([])
    updateCurrentQueueIndex(0)
    saveQueueToLocalStorage([])
  }

  const enterQueueEditMode = () => {
    setEditQueueSnapshot([...queue])
    setQueueEditMode(true)
  }

  const saveQueueEdits = () => {
    saveQueueToLocalStorage(queue)
    setQueueEditMode(false)
    setEditQueueSnapshot(null)
  }

  const discardQueueEdits = () => {
    if (editQueueSnapshot) {
      setQueue(editQueueSnapshot)
    }
    setQueueEditMode(false)
    setEditQueueSnapshot(null)
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">Deep Work</p>
        <h1>Focus</h1>
        <p className="lede">Select a task and stay focused with timed work sessions.</p>
      </header>

      <div className="focus-layout">
        <FocusQueue
          queue={queue}
          currentQueueIndex={currentQueueIndex}
          queueExpanded={queueExpanded}
          queueLocked={queueLocked}
          queuePinned={queuePinned}
          onTogglePin={() => {
            const newPinned = !queuePinned
            setQueuePinned(newPinned)
            saveQueuePinnedToLocalStorage(newPinned)
          }}
          onClearQueue={clearQueue}
          queueHoverRef={queueHoverRef}
          onStartItem={startQueueItem}
          onMoveItem={moveQueueItem}
          onRemoveItem={removeQueueItem}
          getTimeAllocationDisplay={getTimeAllocationDisplay}
          formatTarget={formatTarget}
          timerState={timerState}
          taskCompletedMap={taskCompletedMap}
          queueEditMode={queueEditMode}
          onEnterEditMode={enterQueueEditMode}
          onSaveEdits={saveQueueEdits}
          onDiscardEdits={discardQueueEdits}
          onStartFromQueue={startFocusSessionFromQueue}
        />

        <div className="focus-layout__main">
          <section className="panels">
            {timerState === 'idle' && (
              <div className="panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
                  <div className="panel__title">Select a Task</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.95rem', color: 'var(--muted)' }}>
                      <span>Sort</span>
                      <select
                        className="todo-edit-input"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        style={{ width: '180px', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.04)' }}
                      >
                        <option value="default">Default order</option>
                        <option value="priority">Priority (High → Low)</option>
                        <option value="due">Due date</option>
                        <option value="time">Time allocated</option>
                        <option value="title">Title A → Z</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="pill--utility"
                      onClick={() => setSortDirection((prev) => prev === 'asc' ? 'desc' : 'asc')}
                      title="Reverse sort order"
                      style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}
                    >
                      Reverse
                    </button>
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
                </div>
                <p className="panel__copy">
                  {queue.length > 0
                    ? 'Start the next queued task or pick a different one below.'
                    : 'Choose a task with allocated time to begin a focus session.'}
                </p>

                {sortedTasks.length === 0 ? (
                  <p className="panel__copy" style={{ marginTop: '1rem' }}>
                    No tasks with allocated time found. Add tasks with time allocations in the Tasks page.
                  </p>
                ) : (
                  <div style={{ marginTop: '1rem' }}>
                    {sortedTasks.map((task) => {
                      const inQueue = isTaskInQueue(task.id)
                      return (
                        <div
                          key={task.id}
                          className="insight"
                          style={{
                            marginBottom: '0.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div
                              className="insight__label"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', lineHeight: '1.1' }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--heading)' }}>{task.title}</span>
                              {task.priority && task.priority !== 'None' && (
                                <>
                                  <span style={{ opacity: 0.5 }}>|</span>
                                  <span style={{ color: { High: '#ff6b3d', Medium: '#e0a200', Low: '#4aa3ff' }[task.priority] || 'inherit' }}>
                                    {task.priority} priority
                                  </span>
                                </>
                              )}
                              {Number.isFinite(task.timeAllocated) && (
                                <>
                                  <span style={{ opacity: 0.5 }}>|</span>
                                  <span style={{ color: '#9aa7ba' }}>{task.timeAllocated} min</span>
                                </>
                              )}
                            </div>
                            <div
                              className="insight__meta"
                              style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                            >
                              {formatTarget(task.objective) && <span className="pill pill--filled">{formatTarget(task.objective)}</span>}
                              {task.tags && task.tags.length > 0 && task.tags.map((tag) => (
                                <span key={tag} className="pill pill--tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            className={`action ${inQueue ? 'ghost' : 'primary'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (inQueue) {
                                removeTaskFromQueue(task.id)
                              } else {
                                addTaskToQueue(task)
                              }
                            }}
                            disabled={queueLocked}
                            style={{ cursor: 'pointer' }}
                          >
                            {inQueue ? 'Remove from Queue' : 'Add to Queue'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {(timerState === 'running' || timerState === 'paused') && selectedTask && (
              <div className="panel">
                <div className="panel__title">{getWorkBlockLabel(selectedTask)}</div>
                {formatTarget(selectedTask.objective) && (
                  <div className="panel__copy" style={{ marginTop: '0.4rem' }}>
                    <span
                      className="pill pill--filled"
                      style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--heading)',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      Objective: {formatTarget(selectedTask.objective)}
                    </span>
                  </div>
                )}
                <p className="panel__copy">Stay focused on your task.</p>

                <div
                  style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    margin: '2rem 0',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--heading)'
                  }}
                >
                  {formatTime(timeRemaining)}
                </div>

                {checkInMessage && (
                  <div className="insight" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <p className="insight__label" style={{ marginBottom: '1rem' }}>{checkInMessage}</p>
                    <button className="action primary" onClick={continueFromCheckIn}>
                      Continue
                    </button>
                  </div>
                )}

                <div className="actions" style={{ justifyContent: 'center' }}>
                  {timerState === 'running' && !checkInMessage && (
                    <button className="action ghost" onClick={handlePauseTimer}>
                      Pause
                    </button>
                  )}
                  {timerState === 'paused' && !checkInMessage && (
                    <button className="action primary" onClick={handleResumeTimer}>
                      Resume
                    </button>
                  )}
                  {timerState === 'paused' && !checkInMessage && (
                    <button
                      className="action ghost"
                      onClick={() => {
                        const taskId = selectedTask?.id
                        const savedMinutes = Math.max(0, Math.ceil(timeRemaining / 60))
                        if (taskId && savedMinutes > 0) {
                          updateAdjustments(taskId, 0, savedMinutes)
                        }
                        setTimerState('completed')
                        setTimeRemaining(0)
                      }}
                    >
                      Finish Early
                    </button>
                  )}
                  {timerState === 'paused' && (
                    <button className="action danger" onClick={confirmStopSession}>
                      End Session
                    </button>
                  )}
                </div>

                <div className="panel__copy" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <div>Allocated: {activeSessionMinutes ?? selectedTask.timeAllocated} minutes</div>
                </div>
              </div>
            )}

            {timerState === 'completed' && selectedTask && (
              <div className="panel">
                <div className="panel__title">Work Block Complete! 🎉</div>
                <p className="panel__copy">Great work on "{selectedTask.title}"!</p>
                {formatTarget(selectedTask.objective) && (
                  <p className="panel__copy" style={{ marginTop: '0.6rem' }}>
                    <span
                      className="pill pill--filled"
                      style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--heading)',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      Objective: {formatTarget(selectedTask.objective)}
                    </span>
                  </p>
                )}
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    if (typeof customSessionMinutes === 'number' && customSessionMinutes > 0) {
                      startAnotherSession(customSessionMinutes)
                    }
                  }}
                  style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--heading)', marginBottom: '0.5rem' }}>Did you complete your goal for this work block?</div>
                    <div className="actions" style={{ justifyContent: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                      <button
                        ref={markCompleteButtonRef}
                        type="button"
                        className={`action ${markCompletedBefore ? 'primary' : 'primary'}`}
                        onClick={handleMarkTaskComplete}
                        style={{ position: 'relative', paddingLeft: '2.2rem' }}
                      >
                        <span style={{ position: 'absolute', left: '0.5rem' }}>
                          {markCompletedBefore ? '✓' : '☐'}
                        </span>
                        Mark Complete
                      </button>
                      <button type="button" className="action secondary" onClick={handleNextTaskClick}>
                        Next Task
                      </button>
                      {focusSettings.enableBreaks && (
                        <button type="button" className="action secondary" onClick={handleTakeBreakClick}>
                          Take a Break
                        </button>
                      )}
                      <button
                        type="button"
                        className="action danger"
                        onClick={confirmStopSession}
                      >
                        End Session
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <label htmlFor="customSessionMinutes" style={{ fontWeight: 500, color: 'var(--muted)', marginRight: 8 }}>
                      Or continue this task:
                    </label>
                    <input
                      id="customSessionMinutes"
                      type="number"
                      min={1}
                      value={customSessionMinutes}
                      onChange={e => setCustomSessionMinutes(Number(e.target.value))}
                      style={{ width: 50, marginRight: 8, padding: '0.3rem 0.5rem', borderRadius: 6, border: '1px solid var(--sidebar-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--heading)' }}
                    />
                    <span style={{ color: 'var(--muted)' }}>minutes</span>
                    <button type="submit" className="action secondary" style={{ marginLeft: 12 }}>
                      Start Work Block
                    </button>
                  </div>
                </form>
              </div>
            )}

            {timerState === 'break' && (
              <div className="panel">
                <div className="panel__title">Break Time 🧘</div>
                <p className="panel__copy">Rest and recharge.</p>

                <div
                  style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    margin: '2rem 0',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--heading)'
                  }}
                >
                  {formatTime(breakTimeRemaining)}
                </div>

                <div className="actions" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                  {!breakPaused ? (
                    <button className="action secondary" onClick={pauseBreak}>
                      Pause
                    </button>
                  ) : breakTimeRemaining > 0 ? (
                    <>
                      <button className="action secondary" onClick={resumeBreak}>
                        Resume
                      </button>
                      <button className="action ghost" onClick={endBreakAndShowOptions}>
                        End Break
                      </button>
                    </>
                  ) : null}
                </div>

                {breakPaused && breakTimeRemaining === 0 && (
                  <div className="actions" style={{ justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="action primary" onClick={continueToNextTaskAfterBreak}>
                      Next Task
                    </button>
                    <button className="action danger" onClick={handleEndSessionAfterBreak}>
                      End Session
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="panel">
              <div className="panel__title">Focus Settings</div>
              <p className="panel__copy">
                Work duration: {focusSettings.workDuration} minutes · Break duration: {focusSettings.breakDuration} minutes · Breaks: {focusSettings.enableBreaks ? 'Enabled' : 'Disabled'}
              </p>
              <p className="panel__copy" style={{ marginTop: '0.5rem' }}>
                Adjust these settings in the General section of Settings.
              </p>
            </div>
          </section>
        </div>

      </div>

      {showSkipModal && selectedTask && (
        <>
          <div className="sidebar-overlay" onClick={closeSkipModal} />
          <div className="tag-manager-modal">
            <div className="tag-manager-header">
              <h2>Task not marked complete</h2>
              <button className="action link" onClick={closeSkipModal} style={{ fontSize: '1.5rem', padding: '0.25rem 0.5rem' }}>
                ×
              </button>
            </div>
            <div className="tag-manager-content">
              <p style={{ color: 'var(--sidebar-text)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                What would you like to do with "{selectedTask.title}"?
              </p>

              {/* First choice selection - Task action */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Task Action
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem', borderRadius: '6px', background: skipModalChoice === 'mark-complete' ? 'rgba(123, 168, 240, 0.1)' : 'transparent', border: '1px solid ' + (skipModalChoice === 'mark-complete' ? 'rgba(123, 168, 240, 0.3)' : 'transparent'), transition: 'all 200ms' }}>
                    <input 
                      type="radio" 
                      name="task-action" 
                      value="mark-complete" 
                      checked={skipModalChoice === 'mark-complete'}
                      onChange={(e) => setSkipModalChoice(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--heading)', fontWeight: 500 }}>Mark task as complete</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem', borderRadius: '6px', background: skipModalChoice === 'move-after' ? 'rgba(123, 168, 240, 0.1)' : 'transparent', border: '1px solid ' + (skipModalChoice === 'move-after' ? 'rgba(123, 168, 240, 0.3)' : 'transparent'), transition: 'all 200ms' }}>
                    <input 
                      type="radio" 
                      name="task-action" 
                      value="move-after" 
                      checked={skipModalChoice === 'move-after'}
                      onChange={(e) => setSkipModalChoice(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--heading)', fontWeight: 500 }}>Move task to after next task</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem', borderRadius: '6px', background: skipModalChoice === 'move-end' ? 'rgba(123, 168, 240, 0.1)' : 'transparent', border: '1px solid ' + (skipModalChoice === 'move-end' ? 'rgba(123, 168, 240, 0.3)' : 'transparent'), transition: 'all 200ms' }}>
                    <input 
                      type="radio" 
                      name="task-action" 
                      value="move-end" 
                      checked={skipModalChoice === 'move-end'}
                      onChange={(e) => setSkipModalChoice(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--heading)', fontWeight: 500 }}>Move task to end of queue</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem', borderRadius: '6px', background: skipModalChoice === 'skip-task' ? 'rgba(123, 168, 240, 0.1)' : 'transparent', border: '1px solid ' + (skipModalChoice === 'skip-task' ? 'rgba(123, 168, 240, 0.3)' : 'transparent'), transition: 'all 200ms' }}>
                    <input 
                      type="radio" 
                      name="task-action" 
                      value="skip-task" 
                      checked={skipModalChoice === 'skip-task'}
                      onChange={(e) => setSkipModalChoice(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--heading)', fontWeight: 500 }}>Skip task</span>
                  </label>
                </div>
              </div>

              {/* Second choice selection - Next action */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  What Next?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem', borderRadius: '6px', background: skipModalAction === 'next-task' ? 'rgba(123, 168, 240, 0.1)' : 'transparent', border: '1px solid ' + (skipModalAction === 'next-task' ? 'rgba(123, 168, 240, 0.3)' : 'transparent'), transition: 'all 200ms' }}>
                    <input 
                      type="radio" 
                      name="next-action" 
                      value="next-task" 
                      checked={skipModalAction === 'next-task'}
                      onChange={(e) => setSkipModalAction(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'var(--heading)', fontWeight: 500 }}>Move to next task</span>
                  </label>
                  {focusSettings.enableBreaks && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.6rem', borderRadius: '6px', background: skipModalAction === 'take-break' ? 'rgba(123, 168, 240, 0.1)' : 'transparent', border: '1px solid ' + (skipModalAction === 'take-break' ? 'rgba(123, 168, 240, 0.3)' : 'transparent'), transition: 'all 200ms' }}>
                      <input 
                        type="radio" 
                        name="next-action" 
                        value="take-break" 
                        checked={skipModalAction === 'take-break'}
                        onChange={(e) => setSkipModalAction(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: 'var(--heading)', fontWeight: 500 }}>Take a break</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="action ghost" onClick={closeSkipModal}>
                  Close
                </button>
                <button 
                  className="action primary" 
                  onClick={handleSkipModalSubmit}
                  disabled={!skipModalChoice || !skipModalAction}
                  style={{ opacity: (!skipModalChoice || !skipModalAction) ? 0.5 : 1, cursor: (!skipModalChoice || !skipModalAction) ? 'not-allowed' : 'pointer' }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showStartTransition && pendingQueue && pendingTaskIndex !== null && pendingQueue[pendingTaskIndex] && (
        <>
          <div className="sidebar-overlay" onClick={cancelStartSession} />
          <div className="tag-manager-modal">
            <div className="tag-manager-header">
              <h2>Ready to Focus?</h2>
              <button className="action link" onClick={cancelStartSession} style={{ fontSize: '1.5rem', padding: '0.25rem 0.5rem' }}>
                ×
              </button>
            </div>
            <div className="tag-manager-content">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Task
                </div>
                <div style={{ color: 'var(--heading)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                  {pendingQueue[pendingTaskIndex].title}
                </div>
                
                {formatTarget(pendingQueue[pendingTaskIndex].objective) && (
                  <>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Objective
                    </div>
                    <div style={{ color: 'var(--sidebar-text)', fontSize: '1rem', marginBottom: '1rem' }}>
                      {formatTarget(pendingQueue[pendingTaskIndex].objective)}
                    </div>
                  </>
                )}
                
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Time Allocated
                </div>
                <div style={{ color: 'var(--heading)', fontSize: '2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {pendingQueue[pendingTaskIndex].timeAllocated} minutes
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="action ghost" onClick={cancelStartSession}>
                  Cancel
                </button>
                <button className="action primary" onClick={confirmStartSession}>
                  Start Focus Session
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showTooltip && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowTooltip(false)} />
          <div className="tag-manager-modal">
            <div className="tag-manager-header">
              <h2>Don't see the task you want to work on?</h2>
              <button className="action link" onClick={() => setShowTooltip(false)} style={{ fontSize: '1.5rem', padding: '0.25rem 0.5rem' }}>
                ×
              </button>
            </div>
            <div className="tag-manager-content">
              <p style={{ color: 'var(--sidebar-text)', lineHeight: '1.6', marginBottom: '1rem' }}>
                For a task to appear in the Focus page, it must meet these requirements:
              </p>
              <ul style={{ color: 'var(--sidebar-text)', lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                <li>The task must be in <strong style={{ color: 'var(--heading)' }}>Today</strong></li>
                <li>The task must have <strong style={{ color: 'var(--heading)' }}>time allocated</strong> to it</li>
                <li>The task must <strong style={{ color: 'var(--heading)' }}>not be completed</strong></li>
              </ul>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                You can change these properties by editing your task in the Today or Tasks page.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="action ghost" onClick={() => setShowTooltip(false)}>
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
