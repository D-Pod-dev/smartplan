import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import ComposerRow from '../components/ComposerRow'
import RecurrenceSelector from '../components/RecurrenceSelector'
import TagManager from '../components/TagManager'
import TaskDisplay from '../components/TaskDisplay'
import TodoItem from '../components/TodoItem'
import { getCurrentDate } from '../utils/dateUtils'

const seedTasks = [
  {
    id: 1,
    title: 'Outline launch checklist',
    due: { date: '2025-12-29', time: '11:00' },
    tags: ['Launch'],
    priority: 'High',
    completed: false,
    timeAllocated: 90,
    objective: null,
    goalId: null,
    recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
    inToday: false,
  },
  {
    id: 2,
    title: 'Reply to customer threads',
    due: { date: '2025-12-29', time: '13:00' },
    tags: ['CX'],
    priority: 'Medium',
    completed: false,
    timeAllocated: 45,
    objective: null,
    goalId: null,
    recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
    inToday: false,
  },
]

const emptyDraft = () => ({
  title: '',
  dueDate: '',
  dueTime: '',
  priority: 'None',
  tags: [],
  timeAllocated: '',
  objective: '',
  recurrenceType: 'None',
  recurrenceInterval: '',
  recurrenceUnit: 'day',
  recurrenceDaysOfWeek: [],
  inToday: false,
})

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '')

const normalizeRecurrence = (recurrence) => {
  const defaultRecurrence = { type: 'None', interval: null, unit: 'day', daysOfWeek: [] }
  if (!recurrence) return defaultRecurrence
  if (typeof recurrence === 'string') return { ...defaultRecurrence, type: recurrence }

  const type = recurrence.type || 'None'
  const unit = recurrence.unit || 'day'
  const intervalRaw = recurrence.interval
  const parsedInterval = intervalRaw === null || intervalRaw === undefined || intervalRaw === '' ? null : Number(intervalRaw)
  const interval = Number.isFinite(parsedInterval) ? parsedInterval : null
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const rawDays = Array.isArray(recurrence.daysOfWeek) ? recurrence.daysOfWeek.filter(Boolean) : []
  const uniqueDays = Array.from(new Set(rawDays))
  const sortedDays = uniqueDays
    .filter((d) => weekdayOrder.includes(d))
    .sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b))

  const keepDays = type === 'Weekly' || (type === 'Custom' && unit === 'week')

  return {
    type,
    interval: type === 'Custom' ? interval : null,
    unit,
    daysOfWeek: keepDays ? sortedDays : [],
  }
}

const normalizeTask = (task) => {
  const parsedDue = (() => {
    if (task && typeof task.due === 'object' && task.due !== null) {
      return { date: task.due.date || '', time: task.due.time || '' }
    }
    if (typeof task?.due === 'string') {
      const pieces = task.due.split('·').map((part) => part.trim()).filter(Boolean)
      const [first, second] = pieces
      const date = isIsoDate(first) ? first : ''
      const time = pieces.length > 1 ? second : (!date && first && /\d/.test(first) ? first : '')
      return { date, time: time || '' }
    }
    return { date: '', time: '' }
  })()

  const normalizedTags = Array.isArray(task?.tags)
    ? task.tags.filter(Boolean)
    : task?.tag
      ? [task.tag]
      : []

  const rawTime = task?.timeAllocated
  const timeAllocated = rawTime === null || rawTime === undefined || rawTime === '' ? null : Number(rawTime)
  const rawObjective = task?.objective
  // Keep objective as string if it contains non-numeric characters (e.g., "10 pages"), otherwise convert to number
  const objective = rawObjective === null || rawObjective === undefined || rawObjective === '' 
    ? null 
    : typeof rawObjective === 'string' && isNaN(Number(rawObjective))
      ? rawObjective
      : Number(rawObjective)
  const recurrence = normalizeRecurrence(task?.recurrence)

  return {
    id: task?.id ?? Date.now(),
    title: task?.title ?? 'Untitled task',
    due: parsedDue,
    tags: normalizedTags,
    priority: task?.priority ?? 'None',
    completed: Boolean(task?.completed),
    timeAllocated: Number.isFinite(timeAllocated) ? timeAllocated : null,
    objective: objective === null ? null : (Number.isFinite(objective) ? objective : String(objective)),
    goalId: task?.goalId ?? null,
    recurrence,
    inToday: Boolean(task?.inToday),
  }
}

const deriveInitialTasks = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeTask)
        }
      } catch {}
    }
  }
  return seedTasks.map(normalizeTask)
}

const deriveInitialTags = (tasks) => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.tags')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map((t) => String(t).trim()).filter(Boolean)))
        }
      } catch {}
    }
  }
  return Array.from(new Set(tasks.flatMap((task) => task.tags || [])))
}

export default function Tasks({ tags = [], goals = [], setGoals = () => {}, onAddTag, onRenameTag, onDeleteTag, onRegisterDeleteTasksByGoalId }) {
  const navigate = useNavigate()
  const initialTasks = useMemo(() => deriveInitialTasks(), [])
  const [tasks, setTasks] = useState(initialTasks)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(() => emptyDraft())
  const [composerDraft, setComposerDraft] = useState(() => emptyDraft())
  const [sortOption, setSortOption] = useState('default')
  const [sortDirection, setSortDirection] = useState('asc')
  const [composerOpen, setComposerOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [tagManagerContext, setTagManagerContext] = useState('composer')
  const [originalTags, setOriginalTags] = useState([])
  const composerRef = useRef(null)
  const composerSettingsRef = useRef(null)
  const editingSettingsRef = useRef(null)
  const [currentDateKey, setCurrentDateKey] = useState(() => getCurrentDate().toISOString().split('T')[0])
  const [goalTaskRefreshTrigger, setGoalTaskRefreshTrigger] = useState(0)

  const sortTasksForDisplay = (list, option, direction = 'asc') => {
    const priorityRank = { High: 0, Medium: 1, Low: 2, None: 3 }
    const copy = [...list]
    if (option === 'priority') {
      copy.sort((a, b) => (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4))
      return direction === 'desc' ? copy.reverse() : copy
    }
    if (option === 'due') {
      const toDateValue = (task) => {
        if (!task.due?.date) return Number.POSITIVE_INFINITY
        const base = new Date(`${task.due.date}T${task.due.time || '00:00'}`).getTime()
        return Number.isFinite(base) ? base : Number.POSITIVE_INFINITY
      }
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

  const sortedTasks = useMemo(() => sortTasksForDisplay(tasks, sortOption, sortDirection), [tasks, sortOption, sortDirection])

  // Check for date changes every minute to trigger re-render
  useEffect(() => {
    const interval = setInterval(() => {
      const newDateKey = getCurrentDate().toISOString().split('T')[0]
      if (newDateKey !== currentDateKey) {
        setCurrentDateKey(newDateKey)
      }
    }, 60000) // Check every minute
    
    // Listen for debug date changes and immediately update
    const handleDebugDateChange = () => {
      const newDateKey = getCurrentDate().toISOString().split('T')[0]
      setCurrentDateKey(newDateKey)
      setGoalTaskRefreshTrigger(prev => prev + 1)
    }
    window.addEventListener('debugDateChanged', handleDebugDateChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('debugDateChanged', handleDebugDateChange)
    }
  }, [currentDateKey])

  // Register callback for deleting tasks by goalId
  useEffect(() => {
    if (onRegisterDeleteTasksByGoalId) {
      onRegisterDeleteTasksByGoalId(() => deleteTasksByGoalId)
    }
  }, [onRegisterDeleteTasksByGoalId])

  // Generate daily tasks from goals
  useEffect(() => {
    const today = getCurrentDate()
    today.setHours(0, 0, 0, 0)
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    goals.forEach((goal) => {
      if (goal.completed) return

      const dueDate = goal.dueDate ? new Date(`${goal.dueDate}T00:00:00`) : null
      if (!dueDate) return

      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 0) return

      const progress = goal.progress ?? 0
      const remaining = goal.target - progress
      const perDay = Math.ceil(remaining / daysLeft)

      if (perDay > 0) {
        // Use functional update to check latest state
        setTasks((prevTasks) => {
          // Check if a task for this goal already exists (any date)
          const existingTask = prevTasks.find(
            (t) => t.goalId === goal.id
          )

          const goalTags = goal.tags || []
          const tagsWithGoal = goalTags.includes('Goal') ? goalTags : [...goalTags, 'Goal']
          
          // If goal uses minutes as unit, set timeAllocated instead of target
          const isMinutesBased = goal.targetUnit.toLowerCase() === 'minutes' || goal.targetUnit.toLowerCase() === 'mins'

          if (existingTask) {
            // Update existing task with new goal data and new date
            return prevTasks.map((t) => 
              t.id === existingTask.id
                ? {
                    ...t,
                    title: `Work on '${goal.title}'`,
                    due: { date: todayStr, time: t.due?.time || '' },
                    timeAllocated: isMinutesBased ? perDay : t.timeAllocated,
                    target: isMinutesBased ? t.target : `${perDay} ${goal.targetUnit}`,
                    tags: tagsWithGoal,
                    priority: goal.priority === 'none' ? 'None' : goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1),
                  }
                : t
            )
          }
          
          const newTask = {
            id: Date.now() + Math.random(),
            title: `Work on '${goal.title}'`,
            due: { date: todayStr, time: '' },
            priority: goal.priority === 'none' ? 'None' : goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1),
            tags: tagsWithGoal,
            completed: false,
            timeAllocated: isMinutesBased ? perDay : null,
            target: isMinutesBased ? null : `${perDay} ${goal.targetUnit}`,
            goalId: goal.id,
            recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
            inToday: true,
          }
          return [newTask, ...prevTasks]
        })
      }
    })
  }, [goals, currentDateKey, goalTaskRefreshTrigger]) // Depend on date changes to regenerate goal tasks

  // Cleanup tasks with goalId that don't have a matching goal
  useEffect(() => {
    const goalIds = new Set(goals.map(g => g.id))
    setTasks((prevTasks) => 
      prevTasks.filter(task => !task.goalId || goalIds.has(task.goalId))
    )
  }, [goals])

  useEffect(() => {
    localStorage.setItem('smartplan.tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    const tagsFromTasks = tasks.flatMap((t) => t.tags || [])
    tagsFromTasks.forEach((tag) => onAddTag(tag))
  }, [tasks, onAddTag])

  useEffect(() => {
    if (!tagManagerOpen && tagManagerContext === 'composer') {
      composerSettingsRef.current?.focus()
    }
    if (!tagManagerOpen && tagManagerContext === 'editing') {
      editingSettingsRef.current?.focus()
    }
  }, [tagManagerOpen, tagManagerContext])

  const focusAdd = () => composerRef.current?.focus()

  const addTagToPool = (label) => {
    const tag = label.trim()
    if (!tag) return ''
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    return tag
  }

  const updateDraft = (target, field, value) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    if (field === 'recurrenceType') {
      setter((prev) => {
        const next = { ...prev, [field]: value }
        if (value === 'Weekly') {
          const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const today = weekdayMap[new Date().getDay()]
          if (!Array.isArray(prev.recurrenceDaysOfWeek) || prev.recurrenceDaysOfWeek.length === 0) {
            next.recurrenceDaysOfWeek = [today]
          }
        }
        return next
      })
      return
    }

    setter((prev) => ({ ...prev, [field]: value }))
  }

  const buildRecurrenceFromDraft = (draft) => {
    const type = draft.recurrenceType || 'None'
    const isWeeklyBased = type === 'Weekly' || (type === 'Custom' && draft.recurrenceUnit === 'week')
    const daysOfWeek = isWeeklyBased ? draft.recurrenceDaysOfWeek : []
    
    // If weekly/custom-weekly but no days selected, treat as no recurrence
    if (isWeeklyBased && daysOfWeek.length === 0) {
      return normalizeRecurrence({ type: 'None', interval: null, unit: 'day', daysOfWeek: [] })
    }
    
    return normalizeRecurrence({
      type,
      interval: type === 'Custom' ? draft.recurrenceInterval : null,
      unit: draft.recurrenceUnit || 'day',
      daysOfWeek,
    })
  }

  const toggleDayOfWeek = (day, target) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => {
      const exists = prev.recurrenceDaysOfWeek.includes(day)
      const nextDays = exists
        ? prev.recurrenceDaysOfWeek.filter((d) => d !== day)
        : [...prev.recurrenceDaysOfWeek, day]
      return { ...prev, recurrenceDaysOfWeek: nextDays }
    })
  }

  const setWeekdays = (target) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => {
      const allWeekdaysSelected = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(day => prev.recurrenceDaysOfWeek.includes(day))
      const weekends = prev.recurrenceDaysOfWeek.filter(d => ['Sat', 'Sun'].includes(d))
      return {
        ...prev,
        recurrenceDaysOfWeek: allWeekdaysSelected ? weekends : [...weekends, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      }
    })
  }

  const setWeekends = (target) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => {
      const allWeekendsSelected = ['Sat', 'Sun'].every(day => prev.recurrenceDaysOfWeek.includes(day))
      const weekdays = prev.recurrenceDaysOfWeek.filter(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d))
      return {
        ...prev,
        recurrenceDaysOfWeek: allWeekendsSelected ? weekdays : [...weekdays, 'Sat', 'Sun'],
      }
    })
  }

  const clearDaysOfWeek = (target) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => ({
      ...prev,
      recurrenceDaysOfWeek: [],
    }))
  }

  const resetComposer = () => {
    setComposerDraft(emptyDraft())
    focusAdd()
  }

  const addTask = () => {
    const title = composerDraft.title.trim()
    if (!title) return
    const normalizedTags = Array.from(new Set(composerDraft.tags.map((tag) => tag.trim()).filter(Boolean)))
    normalizedTags.forEach((tag) => onAddTag(tag))
    const parsedTime = composerDraft.timeAllocated === '' ? null : Number(composerDraft.timeAllocated)
    const timeAllocated = Number.isFinite(parsedTime) ? parsedTime : null
    const parsedTarget = composerDraft.target === '' ? null : Number(composerDraft.target)
    const target = Number.isFinite(parsedTarget) ? parsedTarget : null

    const newTask = {
      id: Date.now(),
      title,
      due: { date: composerDraft.dueDate, time: composerDraft.dueTime },
      priority: composerDraft.priority || 'None',
      tags: normalizedTags,
      completed: false,
      timeAllocated,
      target,
      goalId: null,
      recurrence: buildRecurrenceFromDraft(composerDraft),
      inToday: composerDraft.inToday,
    }

    setTasks((prev) => [newTask, ...prev])
    resetComposer()
    setComposerOpen(false)
  }

  const toggleTask = (id) => {
    if (editingId) return
    
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    // If task is being completed and has a goalId, update the goal's progress
    if (!task.completed && task.goalId && task.objective) {
      // Parse numeric value from objective (e.g., "10 pages" -> 10)
      const objectiveValue = typeof task.objective === 'string' ? parseFloat(task.objective) : task.objective
      if (Number.isFinite(objectiveValue)) {
        setGoals((prev) =>
          prev.map((goal) =>
            goal.id === task.goalId
              ? {
                  ...goal,
                  progress: (goal.progress ?? 0) + objectiveValue,
                }
              : goal
          )
        )
      }
    }

    // If task is being uncompleted and has a goalId, decrease the goal's progress
    if (task.completed && task.goalId && task.objective) {
      // Parse numeric value from objective (e.g., "10 pages" -> 10)
      const objectiveValue = typeof task.objective === 'string' ? parseFloat(task.objective) : task.objective
      if (Number.isFinite(objectiveValue)) {
        setGoals((prev) =>
          prev.map((goal) =>
            goal.id === task.goalId
              ? {
                  ...goal,
                  progress: Math.max(0, (goal.progress ?? 0) - objectiveValue),
                }
              : goal
          )
        )
      }
    }

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const startEdit = (task) => {
    setEditingId(task.id)
    setEditingDraft({
      title: task.title,
      dueDate: task.due?.date || '',
      dueTime: task.due?.time || '',
      priority: task.priority || 'None',
      tags: task.tags || [],
      timeAllocated: task.timeAllocated ?? '',
      objective: task.objective ?? '',
      recurrenceType: task.recurrence?.type || 'None',
      recurrenceInterval: task.recurrence?.interval ?? '',
      recurrenceUnit: task.recurrence?.unit || 'day',
      recurrenceDaysOfWeek: task.recurrence?.daysOfWeek || [],
      inToday: task.inToday ?? false,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDraft(emptyDraft())
  }

  const saveEdit = (id) => {
    const title = editingDraft.title.trim()
    if (!title) return

    const normalizedTags = Array.from(new Set(editingDraft.tags.map((tag) => tag.trim()).filter(Boolean)))
    const parsedTime = editingDraft.timeAllocated === '' || editingDraft.timeAllocated === '0' ? null : Number(editingDraft.timeAllocated)
    const timeAllocated = Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null
    // Keep target as string if it contains non-numeric characters, otherwise convert to number
    const target = editingDraft.target === '' 
      ? null 
      : typeof editingDraft.target === 'string' && isNaN(Number(editingDraft.target))
        ? editingDraft.target
        : Number(editingDraft.target)

    setTasks((prev) => prev.map((t) => (t.id === id
      ? {
          ...t,
          title,
          due: { date: editingDraft.dueDate, time: editingDraft.dueTime },
          priority: editingDraft.priority || 'None',
          tags: normalizedTags,
          timeAllocated,
          target,
          recurrence: buildRecurrenceFromDraft(editingDraft),
          inToday: editingDraft.inToday,
        }
      : t)))

    normalizedTags.forEach((tag) => onAddTag(tag))
    cancelEdit()
  }

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (editingId === id) {
      cancelEdit()
    }
  }

  const deleteTasksByGoalId = (goalId) => {
    setTasks((prev) => prev.filter((t) => t.goalId !== goalId))
  }

  const renameTag = (oldName, newName) => {
    setTasks((prev) => prev.map((task) => ({
      ...task,
      tags: task.tags.map((t) => (t === oldName ? newName : t)),
    })))
    setComposerDraft((prev) => ({
      ...prev,
      tags: prev.tags.map((t) => (t === oldName ? newName : t)),
    }))
    setEditingDraft((prev) => ({
      ...prev,
      tags: prev.tags.map((t) => (t === oldName ? newName : t)),
    }))
    onRenameTag(oldName, newName)
  }

  const deleteTag = (tag) => {
    const confirmed = window.confirm(`Delete tag "${tag}"? Tasks with this tag will keep it.`)
    if (!confirmed) return
    setComposerDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
    setEditingDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
    onDeleteTag(tag)
  }

  const composerFields = [
    {
      key: 'title',
      label: 'New task',
      node: (
        <input
          ref={composerRef}
          className="todo-edit-input"
          type="text"
          placeholder="Task name"
          value={composerDraft.title}
          onChange={(e) => updateDraft('compose', 'title', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask()
          }}
        />
      ),
      style: { flex: '0 1 420px', maxWidth: '420px' },
    },
    {
      key: 'dueDate',
      label: 'Due date',
      node: (
        <input
          className="todo-edit-input"
          type="date"
          value={composerDraft.dueDate}
          onChange={(e) => updateDraft('compose', 'dueDate', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '150px' },
    },
    {
      key: 'dueTime',
      label: 'Due time',
      node: (
        <input
          className="todo-edit-input"
          type="time"
          value={composerDraft.dueTime}
          onChange={(e) => updateDraft('compose', 'dueTime', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '120px' },
    },
    {
      key: 'priority',
      label: 'Priority',
      node: (
        <select
          className="todo-edit-input"
          value={composerDraft.priority}
          onChange={(e) => updateDraft('compose', 'priority', e.target.value)}
        >
          <option value="None">None</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      ),
      style: { flex: '0 1 auto', maxWidth: '120px' },
    },
    {
      key: 'inToday',
      label: 'In Today',
      node: (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={composerDraft.inToday}
            onChange={(e) => updateDraft('compose', 'inToday', e.target.checked)}
          />
          <span>In Today</span>
        </label>
      ),
      style: { flex: '0 1 auto', maxWidth: '120px' },
    },
    {
      key: 'timeAllocated',
      label: 'Time allotted (min)',
      node: (
        <input
          className="todo-edit-input"
          type="number"
          min="0"
          step="5"
          value={composerDraft.timeAllocated}
          onChange={(e) => updateDraft('compose', 'timeAllocated', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '140px' },
    },
    {
      key: 'target',
      label: 'Target',
      node: (
        <input
          className="todo-edit-input"
          type="text"
          placeholder="Optional"
          value={composerDraft.target}
          onChange={(e) => updateDraft('compose', 'target', e.target.value)}
        />
      ),
      style: { flex: '0 1 auto', maxWidth: '120px' },
    },
    {
      key: 'recurrence',
      label: 'Recurrence',
      as: 'div',
      hideLabel: true,
      node: (
        <RecurrenceSelector
          recurrenceType={composerDraft.recurrenceType}
          recurrenceInterval={composerDraft.recurrenceInterval}
          recurrenceUnit={composerDraft.recurrenceUnit}
          selectedDays={composerDraft.recurrenceDaysOfWeek}
          onChangeType={(value) => updateDraft('compose', 'recurrenceType', value)}
          onChangeInterval={(value) => updateDraft('compose', 'recurrenceInterval', value)}
          onChangeUnit={(value) => updateDraft('compose', 'recurrenceUnit', value)}
          onToggleDay={(day) => toggleDayOfWeek(day, 'compose')}
          onSelectWeekdays={() => setWeekdays('compose')}
          onSelectWeekends={() => setWeekends('compose')}
          onClearDays={() => clearDaysOfWeek('compose')}
        />
      ),
    },
  ]

  const composerTagsSection = {
    label: 'Tags',
    tags: composerDraft.tags,
    onManage: () => {
      setOriginalTags([...composerDraft.tags])
      setTagManagerContext('composer')
      setTagManagerOpen(true)
    },
    manageButtonRef: composerSettingsRef,
    emptyLabel: 'No tags',
    style: { flex: '0 1 auto' },
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">SmartPlan</p>
        <h1>Tasks</h1>
        <p className="lede">View and manage all your tasks.</p>
        <div className="actions">
          <button className="action primary" type="button" onClick={() => setComposerOpen(!composerOpen)}>Add task</button>
          <button className="action ghost" type="button">Ask SmartPlan</button>
        </div>
      </header>

      <section className="panels panels--grid">
        <div className="panel panel--focus">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: composerOpen ? '0.9rem' : '0' }}>
            <div className="panel__title">All tasks</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
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
            </div>
          </div>

          {composerOpen && (
            <ComposerRow
              addButtonAria="Add task"
              onSubmit={addTask}
              onClear={() => { setComposerOpen(false); resetComposer() }}
              submitDisabled={!composerDraft.title.trim()}
              fields={composerFields}
              tagsSection={composerTagsSection}
            />
          )}

          <ul className="list list--focus">
            {sortedTasks.map((task) => {
              const isEditing = editingId === task.id
              return (
                <TodoItem
                  key={task.id}
                  item={task}
                  isEditing={isEditing}
                  onToggleCompletion={toggleTask}
                  onEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onDelete={deleteTask}
                  renderDisplay={() => <TaskDisplay task={task} />}
                  renderEditFields={() => {
                    const relatedGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null
                    return (
                    <>
                      <label className="todo-field" style={{ flex: '0 1 420px', maxWidth: '420px' }}>
                        <span>Task name</span>
                        <input
                          className="todo-edit-input"
                          type="text"
                          value={editingDraft?.title || ''}
                          onChange={(e) => updateDraft('edit', 'title', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(task.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          autoFocus
                          disabled={Boolean(task.goalId)}
                          style={task.goalId ? { cursor: 'not-allowed' } : {}}
                        />
                      </label>
                      <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '150px' }}>
                        <span>Due date</span>
                        <input
                          className="todo-edit-input"
                          type="date"
                          value={editingDraft?.dueDate || ''}
                          onChange={(e) => updateDraft('edit', 'dueDate', e.target.value)}
                          disabled={Boolean(task.goalId)}
                          style={task.goalId ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                        />
                      </label>
                      <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                        <span>Due time</span>
                        <input
                          className="todo-edit-input"
                          type="time"
                          value={editingDraft?.dueTime || ''}
                          onChange={(e) => updateDraft('edit', 'dueTime', e.target.value)}
                        />
                      </label>
                      <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                        <span>Priority</span>
                        <select
                          className="todo-edit-input"
                          value={editingDraft?.priority || 'None'}
                          onChange={(e) => updateDraft('edit', 'priority', e.target.value)}
                          disabled={Boolean(task.goalId)}
                          style={task.goalId ? { cursor: 'not-allowed' } : {}}
                        >
                          <option value="None">None</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </label>
                      <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                        <span>In Today</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editingDraft?.inToday || false}
                            onChange={(e) => updateDraft('edit', 'inToday', e.target.checked)}
                          />
                          <span>In Today</span>
                        </label>
                      </label>
                      <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '140px' }}>
                        <span>Time allotted (min)</span>
                        <input
                          className="todo-edit-input"
                          type="number"
                          min="0"
                          step="5"
                          value={editingDraft?.timeAllocated || ''}
                          onChange={(e) => updateDraft('edit', 'timeAllocated', e.target.value)}
                          disabled={Boolean(task.goalId && relatedGoal && (relatedGoal.targetUnit.toLowerCase() === 'minutes' || relatedGoal.targetUnit.toLowerCase() === 'mins'))}
                          style={task.goalId && relatedGoal && (relatedGoal.targetUnit.toLowerCase() === 'minutes' || relatedGoal.targetUnit.toLowerCase() === 'mins') ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                        />
                      </label>
                      <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                        <span>Target</span>
                        <input
                          className="todo-edit-input"
                          type="text"
                          placeholder="Optional"
                          value={editingDraft?.target || ''}
                          onChange={(e) => updateDraft('edit', 'target', e.target.value)}
                          disabled={Boolean(task.goalId && relatedGoal && relatedGoal.targetUnit.toLowerCase() !== 'minutes' && relatedGoal.targetUnit.toLowerCase() !== 'mins')}
                          style={task.goalId && relatedGoal && relatedGoal.targetUnit.toLowerCase() !== 'minutes' && relatedGoal.targetUnit.toLowerCase() !== 'mins' ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
                        />
                      </label>
                      <div className="todo-field" style={{ flex: '0 1 auto' }}>
                        <span>Tags</span>
                        <div className="tag-picker">
                          <div className="tag-options">
                            {editingDraft?.tags?.length === 0 ? (
                              <span 
                                className="pill pill--empty" 
                                style={{ cursor: task.goalId ? 'default' : 'pointer' }}
                                onClick={() => {
                                  if (task.goalId) return
                                  setOriginalTags([...(editingDraft?.tags || [])])
                                  setTagManagerContext('editing')
                                  setTagManagerOpen(true)
                                }}
                              >
                                No tags
                              </span>
                            ) : (
                              editingDraft?.tags?.map((tag) => (
                                <span 
                                  key={tag} 
                                  className="pill pill--tag"
                                  style={{ cursor: task.goalId ? 'default' : 'pointer' }}
                                  onClick={() => {
                                    if (task.goalId) return
                                    setOriginalTags([...(editingDraft?.tags || [])])
                                    setTagManagerContext('editing')
                                    setTagManagerOpen(true)
                                  }}
                                >
                                  {tag}
                                </span>
                              ))
                            )}
                            {!task.goalId && (
                              <button
                                type="button"
                                className="pill pill--tag pill--add-tag"
                                title="Manage tags"
                                onClick={() => {
                                  setOriginalTags([...(editingDraft?.tags || [])])
                                  setTagManagerContext('editing')
                                  setTagManagerOpen(true)
                                }}
                                ref={editingSettingsRef}
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <RecurrenceSelector
                        recurrenceType={editingDraft?.recurrenceType || 'None'}
                        recurrenceInterval={editingDraft?.recurrenceInterval || ''}
                        recurrenceUnit={editingDraft?.recurrenceUnit || 'day'}
                        selectedDays={editingDraft?.recurrenceDaysOfWeek || []}
                        onChangeType={(value) => updateDraft('edit', 'recurrenceType', value)}
                        onChangeInterval={(value) => updateDraft('edit', 'recurrenceInterval', value)}
                        onChangeUnit={(value) => updateDraft('edit', 'recurrenceUnit', value)}
                        onToggleDay={(day) => toggleDayOfWeek(day, 'edit')}
                        onSelectWeekdays={() => setWeekdays('edit')}
                        onSelectWeekends={() => setWeekends('edit')}
                        onClearDays={() => clearDaysOfWeek('edit')}
                        disabled={Boolean(task.goalId)}
                      />
                      
                      {task.goalId && relatedGoal && (
                        <div style={{
                          backgroundColor: '#2a2a2a',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#aaa'
                        }}>
                          This task is managed by the goal{' '}
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('scrollToGoalId', task.goalId)
                              navigate('/goals')
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#4a9eff',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              font: 'inherit'
                            }}
                          >
                            "{relatedGoal.title}"
                          </button>
                          . To fully edit or delete this task, modify the goal.
                        </div>
                      )}
                    </>
                  )}}
                />
              )
            })}
          </ul>

          <button className="action ghost" type="button">Auto-prioritize with SmartPlan</button>
        </div>
      </section>

      <TagManager
        isOpen={tagManagerOpen}
        tags={tags}
        selectedTags={tagManagerContext === 'composer' ? composerDraft.tags : editingDraft.tags}
        onChangeSelected={(next) => {
          if (tagManagerContext === 'composer') {
            setComposerDraft((prev) => ({ ...prev, tags: next }))
          } else {
            setEditingDraft((prev) => ({ ...prev, tags: next }))
          }
        }}
        onCreateTag={(label) => onAddTag(label)}
        onRenameTag={renameTag}
        onDeleteTag={deleteTag}
        onClearSelected={() => {
          if (tagManagerContext === 'composer') {
            setComposerDraft((prev) => ({ ...prev, tags: [] }))
          } else {
            setEditingDraft((prev) => ({ ...prev, tags: [] }))
          }
        }}
        onCancel={() => {
          if (tagManagerContext === 'composer') {
            setComposerDraft((prev) => ({ ...prev, tags: originalTags }))
          } else {
            setEditingDraft((prev) => ({ ...prev, tags: originalTags }))
          }
          setTagManagerOpen(false)
        }}
        onDone={() => {
          setTagManagerOpen(false)
        }}
      />
    </>
  )
}
