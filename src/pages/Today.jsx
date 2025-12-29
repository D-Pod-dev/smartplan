import { useEffect, useMemo, useRef, useState } from 'react'
import '../App.css'
import DayStrip from '../components/DayStrip'

const seedTasks = [
  {
    id: 1,
    title: 'Outline launch checklist',
    due: { date: '2025-12-29', time: '11:00' },
    tags: ['Launch'],
    priority: 'High',
    completed: false,
    timeAllocated: 90,
    recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
  },
  {
    id: 2,
    title: 'Reply to customer threads',
    due: { date: '2025-12-29', time: '13:00' },
    tags: ['CX'],
    priority: 'Medium',
    completed: false,
    timeAllocated: 45,
    recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
  },
  {
    id: 3,
    title: 'Draft sprint goals',
    due: { date: '2025-12-29', time: '16:00' },
    tags: ['Product'],
    priority: 'High',
    completed: false,
    timeAllocated: 75,
    recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
  },
  {
    id: 4,
    title: 'Share hiring scorecards',
    due: { date: '2025-12-29', time: '17:30' },
    tags: ['People'],
    priority: 'Low',
    completed: false,
    timeAllocated: 50,
    recurrence: { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
  },
]

const emptyDraft = () => ({
  title: '',
  dueDate: '',
  dueTime: '',
  priority: 'None',
  tags: [],
  timeAllocated: '',
  recurrenceType: 'None',
  recurrenceInterval: '',
  recurrenceUnit: 'day',
  recurrenceDaysOfWeek: [],
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
  const recurrence = normalizeRecurrence(task?.recurrence)

  return {
    id: task?.id ?? Date.now(),
    title: task?.title ?? 'Untitled task',
    due: parsedDue,
    tags: normalizedTags,
    priority: task?.priority ?? 'None',
    completed: Boolean(task?.completed),
    timeAllocated: Number.isFinite(timeAllocated) ? timeAllocated : null,
    recurrence,
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

const formatTimeForDisplay = (time) => {
  if (!time) return ''
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours)
    date.setMinutes(minutes)
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
  }
  return time
}

const formatDue = (due) => {
  if (!due?.date && !due?.time) return ''
  const dateLabel = due.date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${due.date}T00:00:00`)) : ''
  const timeLabel = formatTimeForDisplay(due.time)
  return [dateLabel, timeLabel].filter(Boolean).join(' · ')
}

const formatRecurrence = (recurrence) => {
  const normalized = normalizeRecurrence(recurrence)
  if (normalized.type === 'None') return 'Not recurring'

  if (normalized.type === 'Weekly') {
    if (!normalized.daysOfWeek || normalized.daysOfWeek.length === 0) return 'Weekly'
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const dayMap = { Mon: 'Mo', Tue: 'Tu', Wed: 'We', Thu: 'Th', Fri: 'Fr', Sat: 'Sa', Sun: 'Su' }
    const uniqueDays = Array.from(new Set(normalized.daysOfWeek))
    const sortedDays = uniqueDays.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    const dayAbbrevs = sortedDays.map((d) => dayMap[d] || d).join(', ')
    return `Weekly (${dayAbbrevs})`
  }

  if (normalized.type === 'Custom') {
    if (!normalized.interval) return 'Custom cadence'
    const unitLabel = normalized.interval === 1 ? normalized.unit : `${normalized.unit}s`
    const base = `Every ${normalized.interval} ${unitLabel}`

    if (normalized.unit === 'week' && normalized.daysOfWeek.length) {
      const dayMap = { Mon: 'Mo', Tue: 'Tu', Wed: 'We', Thu: 'Th', Fri: 'Fr', Sat: 'Sa', Sun: 'Su' }
      const dayAbbrevs = normalized.daysOfWeek.map((d) => dayMap[d] || d).join(', ')
      return `${base} (${dayAbbrevs})`
    }

    return base
  }

  return normalized.type
}

export default function Today() {
  const initialData = useMemo(() => {
    const initialTasks = deriveInitialTasks()
    return { tasks: initialTasks, tags: deriveInitialTags(initialTasks) }
  }, [])

  const [tasks, setTasks] = useState(initialData.tasks)
  const [tags, setTags] = useState(initialData.tags)
  const [editingId, setEditingId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(() => emptyDraft())
  const [composerDraft, setComposerDraft] = useState(() => emptyDraft())
  const [composerTagInput, setComposerTagInput] = useState('')
  const [editingTagInput, setEditingTagInput] = useState('')
  const [composerTagInputOpen, setComposerTagInputOpen] = useState(false)
  const [editingTagInputOpen, setEditingTagInputOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [tagManagerEditId, setTagManagerEditId] = useState(null)
  const [tagManagerEditValue, setTagManagerEditValue] = useState('')
  const [tagManagerOpener, setTagManagerOpener] = useState(null)
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [originalTags, setOriginalTags] = useState([])
  const composerRef = useRef(null)
  const composerTagInputRef = useRef(null)
  const editingTagInputRef = useRef(null)
  const tagManagerEditRef = useRef(null)
  const tagManagerCloseRef = useRef(null)
  const composerSettingsRef = useRef(null)
  const editingSettingsRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('smartplan.tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem('smartplan.tags', JSON.stringify(tags))
  }, [tags])

  useEffect(() => {
    const tagsFromTasks = tasks.flatMap((t) => t.tags || [])
    setTags((prev) => {
      const merged = Array.from(new Set([...prev, ...tagsFromTasks]))
      return merged.length === prev.length && merged.every((tag, index) => tag === prev[index]) ? prev : merged
    })
  }, [tasks])

  useEffect(() => {
    if (composerTagInputOpen) {
      composerTagInputRef.current?.focus()
    }
  }, [composerTagInputOpen])

  useEffect(() => {
    if (editingTagInputOpen) {
      editingTagInputRef.current?.focus()
    }
  }, [editingTagInputOpen])

  useEffect(() => {
    if (tagManagerOpen) {
      tagManagerCloseRef.current?.focus()
    } else if (tagManagerOpener) {
      // Return focus to the settings button that opened the modal
      if (tagManagerOpener === 'composer') {
        composerSettingsRef.current?.focus()
      } else if (tagManagerOpener === 'editing') {
        editingSettingsRef.current?.focus()
      }
      setTagManagerOpener(null)
    }
  }, [tagManagerOpen, tagManagerOpener])

  const focusAdd = () => composerRef.current?.focus()

  const addTagToPool = (label) => {
    const tag = label.trim()
    if (!tag) return ''
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    return tag
  }

  const toggleComposerTagInput = () => {
    setComposerTagInputOpen((prev) => {
      if (prev) {
        setComposerTagInput('')
      }
      return !prev
    })
  }

  const toggleEditingTagInput = () => {
    setEditingTagInputOpen((prev) => {
      if (prev) {
        setEditingTagInput('')
      }
      return !prev
    })
  }

  const toggleTagSelection = (tag, target) => {
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => {
      const exists = prev.tags.includes(tag)
      const nextTags = exists ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
      return { ...prev, tags: nextTags }
    })
  }

  const attachNewTag = (input, target) => {
    const normalized = addTagToPool(input)
    if (!normalized) return
    const setter = target === 'edit' ? setEditingDraft : setComposerDraft
    setter((prev) => (prev.tags.includes(normalized) ? prev : { ...prev, tags: [...prev.tags, normalized] }))
    if (target === 'edit') {
      setEditingTagInput('')
      setEditingTagInputOpen(false)
    } else {
      setComposerTagInput('')
      setComposerTagInputOpen(false)
    }
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

  const buildRecurrenceFromDraft = (draft) => normalizeRecurrence({
    type: draft.recurrenceType || 'None',
    interval: draft.recurrenceType === 'Custom' ? draft.recurrenceInterval : null,
    unit: draft.recurrenceUnit || 'day',
    daysOfWeek: draft.recurrenceType === 'Weekly' || (draft.recurrenceType === 'Custom' && draft.recurrenceUnit === 'week')
      ? draft.recurrenceDaysOfWeek
      : [],
  })

  const shouldShowDayStrip = (draft) => draft.recurrenceType === 'Weekly' || (draft.recurrenceType === 'Custom' && draft.recurrenceUnit === 'week')

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
    setComposerTagInput('')
    setComposerTagInputOpen(false)
    focusAdd()
  }

  const addTask = () => {
    const title = composerDraft.title.trim()
    if (!title) return
    const normalizedTags = Array.from(new Set(composerDraft.tags.map((tag) => tag.trim()).filter(Boolean)))
    const parsedTime = composerDraft.timeAllocated === '' ? null : Number(composerDraft.timeAllocated)
    const timeAllocated = Number.isFinite(parsedTime) ? parsedTime : null

    const newTask = {
      id: Date.now(),
      title,
      due: { date: composerDraft.dueDate, time: composerDraft.dueTime },
      priority: composerDraft.priority || 'None',
      tags: normalizedTags,
      completed: false,
      timeAllocated,
      recurrence: buildRecurrenceFromDraft(composerDraft),
    }

    setTasks((prev) => [newTask, ...prev])
    setTags((prev) => Array.from(new Set([...prev, ...normalizedTags])))
    resetComposer()
  }

  const toggleTask = (id) => {
    if (editingId) return
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
      recurrenceType: task.recurrence?.type || 'None',
      recurrenceInterval: task.recurrence?.interval ?? '',
      recurrenceUnit: task.recurrence?.unit || 'day',
      recurrenceDaysOfWeek: task.recurrence?.daysOfWeek || [],
    })
    setEditingTagInput('')
    setEditingTagInputOpen(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDraft(emptyDraft())
    setEditingTagInput('')
  }

  const saveEdit = (id) => {
    const title = editingDraft.title.trim()
    if (!title) return

    const normalizedTags = Array.from(new Set(editingDraft.tags.map((tag) => tag.trim()).filter(Boolean)))
    const parsedTime = editingDraft.timeAllocated === '' ? null : Number(editingDraft.timeAllocated)
    const timeAllocated = Number.isFinite(parsedTime) ? parsedTime : null

    setTasks((prev) => prev.map((t) => (t.id === id
      ? {
          ...t,
          title,
          due: { date: editingDraft.dueDate, time: editingDraft.dueTime },
          priority: editingDraft.priority || 'None',
          tags: normalizedTags,
          timeAllocated,
          recurrence: buildRecurrenceFromDraft(editingDraft),
        }
      : t)))

    setTags((prev) => {
      const merged = Array.from(new Set([...prev, ...normalizedTags]))
      return merged.length === prev.length && merged.every((tag, index) => tag === prev[index]) ? prev : merged
    })

    cancelEdit()
  }

  const deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id)
    const confirmed = window.confirm(`Delete "${task?.title ?? 'this task'}"?`)
    if (!confirmed) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (editingId === id) {
      cancelEdit()
    }
  }

  const deleteTag = (tag) => {
    const confirmed = window.confirm(`Delete tag "${tag}"? Tasks with this tag will keep it.`)
    if (!confirmed) return
    setTags((prev) => prev.filter((t) => t !== tag))
    
    // Remove tag from current draft if the tag manager is open
    if (tagManagerOpener === 'composer') {
      setComposerDraft((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag)
      }))
    } else if (tagManagerOpener === 'editing') {
      setEditingDraft((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag)
      }))
    }
  }

  const startEditTag = (tag) => {
    setTagManagerEditId(tag)
    setTagManagerEditValue(tag)
  }

  const cancelEditTag = () => {
    setTagManagerEditId(null)
    setTagManagerEditValue('')
  }

  const saveEditTag = () => {
    const newName = tagManagerEditValue.trim()
    if (!newName || newName === tagManagerEditId) {
      cancelEditTag()
      return
    }
    if (tags.includes(newName)) {
      alert('A tag with this name already exists')
      return
    }
    setTags((prev) => prev.map((t) => (t === tagManagerEditId ? newName : t)))
    setTasks((prev) => prev.map((task) => ({
      ...task,
      tags: task.tags.map((t) => (t === tagManagerEditId ? newName : t)),
    })))
    cancelEditTag()
  }

  const renderTags = (taskTags) => {
    if (!taskTags?.length) {
      return <span className="pill pill--subtle">No tags</span>
    }
    return taskTags.map((tag) => (
      <span key={tag} className="pill pill--tag">{tag}</span>
    ))
  }

  return (
    <>
      <header className="page__header">
        <p className="eyebrow">SmartPlan</p>
        <h1>Today</h1>
        <p className="lede">Focus first, meetings second—SmartPlan keeps you flowing.</p>
        <div className="actions">
          <button className="action primary" type="button">Ask SmartPlan</button>
          <button className="action ghost" type="button" onClick={focusAdd}>Add task</button>
          <button className="action link" type="button">View backlog</button>
        </div>
      </header>

      <section className="panels panels--grid">
        <div className="panel panel--focus">
          <div className="panel__title">Today&apos;s tasks</div>

          <div className="list__item todo-row todo-row--compose">
            <button
              className="todo-checkbox todo-checkbox--add"
              type="button"
              aria-label="Add task"
              onClick={addTask}
            >
              +
            </button>
            <div className="todo-main">
              <label className="todo-field" style={{ flex: '0 1 420px', maxWidth: '420px' }}>
                <span>Task name</span>
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
              </label>
                <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '150px' }}>
                  <span>Due date</span>
                  <input
                    className="todo-edit-input"
                    type="date"
                    value={composerDraft.dueDate}
                    onChange={(e) => updateDraft('compose', 'dueDate', e.target.value)}
                  />
                </label>
                <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                  <span>Due time</span>
                  <input
                    className="todo-edit-input"
                    type="time"
                    value={composerDraft.dueTime}
                    onChange={(e) => updateDraft('compose', 'dueTime', e.target.value)}
                  />
                </label>
                <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                  <span>Priority</span>
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
                </label>
                <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '140px' }}>
                  <span>Time allotted (min)</span>
                  <input
                    className="todo-edit-input"
                    type="number"
                    min="0"
                    step="5"
                    value={composerDraft.timeAllocated}
                    onChange={(e) => updateDraft('compose', 'timeAllocated', e.target.value)}
                  />
                </label>
                <div className="todo-field" style={{ flex: '0 1 auto' }}>
                  <span>Tags</span>
                  <div className="tag-picker">
                    <div className="tag-options">
                      {composerDraft.tags.length === 0 ? (
                        <span 
                          className="pill pill--subtle" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setOriginalTags([...composerDraft.tags])
                            setTagManagerOpener('composer')
                            setTagManagerOpen(true)
                          }}
                        >
                          No tags
                        </span>
                      ) : (
                        composerDraft.tags.map((tag) => (
                          <span 
                            key={tag} 
                            className="pill pill--tag"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setOriginalTags([...composerDraft.tags])
                              setTagManagerOpener('composer')
                              setTagManagerOpen(true)
                            }}
                          >
                            {tag}
                          </span>
                        ))
                      )}
                      <button
                        type="button"
                        className="pill pill--tag pill--add-tag"
                        title="Manage tags"
                        onClick={() => {
                          setOriginalTags([...composerDraft.tags])
                          setTagManagerOpener('composer')
                          setTagManagerOpen(true)
                        }}
                        ref={composerSettingsRef}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '0 1 auto' }}>
                <label className="todo-field">
                  <span>Recurrence</span>
                  <select
                    className="todo-edit-input"
                    value={composerDraft.recurrenceType}
                    onChange={(e) => updateDraft('compose', 'recurrenceType', e.target.value)}
                  >
                    <option value="None">None</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Custom">Custom</option>
                  </select>
                </label>

                {composerDraft.recurrenceType === 'Custom' && (
                  <>
                    <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '100px' }}>
                      <span>Every</span>
                      <input
                        className="todo-edit-input"
                        type="number"
                        min="1"
                        value={composerDraft.recurrenceInterval}
                        onChange={(e) => updateDraft('compose', 'recurrenceInterval', e.target.value)}
                      />
                    </label>
                    <label className="todo-field">
                      <span>Unit</span>
                      <select
                        className="todo-edit-input"
                        value={composerDraft.recurrenceUnit}
                        onChange={(e) => updateDraft('compose', 'recurrenceUnit', e.target.value)}
                      >
                        <option value="day">days</option>
                        <option value="week">weeks</option>
                        <option value="month">months</option>
                      </select>
                    </label>
                  </>
                )}

                {shouldShowDayStrip(composerDraft) && (
                  <div className="todo-field">
                    <span>Days</span>
                    <DayStrip
                      selectedDays={composerDraft.recurrenceDaysOfWeek}
                      onToggleDay={(day) => toggleDayOfWeek(day, 'compose')}
                      onSelectWeekdays={() => setWeekdays('compose')}
                      onSelectWeekends={() => setWeekends('compose')}
                      onClear={() => clearDaysOfWeek('compose')}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="todo-actions">
              <button className="action link" type="button" onClick={resetComposer}>Clear</button>
              <button className="action primary" type="button" onClick={addTask}>Add</button>
            </div>
          </div>

          <ul className="list list--focus">
            {tasks.map((task) => {
              const isEditing = editingId === task.id
              return (
                <li key={task.id} className="list__item">
                  <div className={`todo-row ${isEditing ? 'is-editing' : ''}`}>
                    <input
                      type="checkbox"
                      className="todo-checkbox"
                      aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      disabled={Boolean(editingId)}
                    />

                    <div className="todo-main">
                      {isEditing ? (
                        <>
                          <label className="todo-field" style={{ flex: '0 1 420px', maxWidth: '420px' }}>
                            <span>Task name</span>
                            <input
                              className="todo-edit-input"
                              type="text"
                              value={editingDraft.title}
                              onChange={(e) => updateDraft('edit', 'title', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(task.id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              autoFocus
                            />
                          </label>
                            <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '150px' }}>
                              <span>Due date</span>
                              <input
                                className="todo-edit-input"
                                type="date"
                                value={editingDraft.dueDate}
                                onChange={(e) => updateDraft('edit', 'dueDate', e.target.value)}
                              />
                            </label>
                            <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                              <span>Due time</span>
                              <input
                                className="todo-edit-input"
                                type="time"
                                value={editingDraft.dueTime}
                                onChange={(e) => updateDraft('edit', 'dueTime', e.target.value)}
                              />
                            </label>
                            <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '120px' }}>
                              <span>Priority</span>
                              <select
                                className="todo-edit-input"
                                value={editingDraft.priority}
                                onChange={(e) => updateDraft('edit', 'priority', e.target.value)}
                              >
                                <option value="None">None</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </label>
                            <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '140px' }}>
                              <span>Time allotted (min)</span>
                              <input
                                className="todo-edit-input"
                                type="number"
                                min="0"
                                step="5"
                                value={editingDraft.timeAllocated}
                                onChange={(e) => updateDraft('edit', 'timeAllocated', e.target.value)}
                              />
                            </label>
                            <div className="todo-field" style={{ flex: '0 1 auto' }}>
                              <span>Tags</span>
                              <div className="tag-picker">
                                <div className="tag-options day-strip">
                                  {editingDraft.tags.length === 0 ? (
                                    <span 
                                      className="pill pill--subtle" 
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        setOriginalTags([...editingDraft.tags])
                                        setTagManagerOpener('editing')
                                        setTagManagerOpen(true)
                                      }}
                                    >
                                      No tags
                                    </span>
                                  ) : (
                                    editingDraft.tags.map((tag) => (
                                      <span 
                                        key={tag} 
                                        className="pill pill--tag"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                          setOriginalTags([...editingDraft.tags])
                                          setTagManagerOpener('editing')
                                          setTagManagerOpen(true)
                                        }}
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  )}
                                  <button
                                    type="button"
                                    className="pill pill--tag pill--add-tag"
                                    title="Manage tags"
                                    onClick={() => {
                                      setOriginalTags([...editingDraft.tags])
                                      setTagManagerOpener('editing')
                                      setTagManagerOpen(true)
                                    }}
                                    ref={editingSettingsRef}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '0 1 auto' }}>
                            <label className="todo-field">
                              <span>Recurrence</span>
                              <select
                                className="todo-edit-input"
                                value={editingDraft.recurrenceType}
                                onChange={(e) => updateDraft('edit', 'recurrenceType', e.target.value)}
                              >
                                <option value="None">None</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Custom">Custom</option>
                              </select>
                            </label>

                          {editingDraft.recurrenceType === 'Custom' && (
                            <>
                              <label className="todo-field" style={{ flex: '0 1 auto', maxWidth: '100px' }}>
                                <span>Every</span>
                                <input
                                  className="todo-edit-input"
                                  type="number"
                                  min="1"
                                  value={editingDraft.recurrenceInterval}
                                  onChange={(e) => updateDraft('edit', 'recurrenceInterval', e.target.value)}
                                />
                              </label>
                              <label className="todo-field">
                                <span>Unit</span>
                                <select
                                  className="todo-edit-input"
                                  value={editingDraft.recurrenceUnit}
                                  onChange={(e) => updateDraft('edit', 'recurrenceUnit', e.target.value)}
                                >
                                  <option value="day">days</option>
                                  <option value="week">weeks</option>
                                  <option value="month">months</option>
                                </select>
                              </label>
                            </>
                          )}

                          {shouldShowDayStrip(editingDraft) && (
                            <div className="todo-field">
                              <span>Days</span>
                              <DayStrip
                                selectedDays={editingDraft.recurrenceDaysOfWeek}
                                onToggleDay={(day) => toggleDayOfWeek(day, 'edit')}
                                onSelectWeekdays={() => setWeekdays('edit')}
                                onSelectWeekends={() => setWeekends('edit')}
                                onClear={() => clearDaysOfWeek('edit')}
                              />
                            </div>
                          )}
                          </div>
                        </>
                      ) : (
                        <div className="todo-display">
                          <div className={`list__title todo-title ${task.completed ? 'is-completed' : ''}`}>{task.title}</div>
                          <div className="list__meta todo-meta">
                            <span className="pill pill--subtle">{formatDue(task.due) || 'No due date'}</span>
                            <span className="pill pill--subtle">{task.timeAllocated ? `${task.timeAllocated} min` : 'No estimate'}</span>
                            <span className="pill pill--subtle">{task.priority === 'None' ? 'No priority' : `${task.priority} priority`}</span>
                            <span className="pill pill--subtle">{formatRecurrence(task.recurrence)}</span>
                            {renderTags(task.tags)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`todo-actions ${isEditing ? 'is-editing' : ''}`}>
                      {isEditing ? (
                        <>
                          <button className="action link" type="button" onClick={cancelEdit}>Cancel</button>
                          <button className="action ghost" type="button" onClick={() => saveEdit(task.id)}>Save</button>
                        </>
                      ) : (
                        <>
                          <button className="action link" type="button" onClick={() => startEdit(task)}>Edit</button>
                          <button className="action link" type="button" onClick={() => deleteTask(task.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <button className="action ghost" type="button">Auto-prioritize with SmartPlan</button>
        </div>
      </section>

      {tagManagerOpen && (
        <>
          <div
            className="sidebar-overlay"
            onClick={() => setTagManagerOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setTagManagerOpen(false)
            }}
            role="button"
            tabIndex={0}
          />
          <div className="tag-manager-modal">
            <div className="tag-manager-header">
              <h2>Manage Tags</h2>
              <button
                ref={tagManagerCloseRef}
                type="button"
                className="action link"
                onClick={() => {
                  setTagManagerOpen(false)
                  setTagSearchQuery('')
                  setNewTagInput('')
                }}
              >
                ✕
              </button>
            </div>
            <div className="tag-manager-content">
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="todo-edit-input"
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              
              {(() => {
                const currentTags = tagManagerOpener === 'composer' ? composerDraft.tags : editingDraft.tags
                const filteredTags = tags.filter(tag => 
                  tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
                )
                
                return filteredTags.length === 0 && !tagSearchQuery ? (
                  <p className="tag-manager-empty">No tags yet. Create one below!</p>
                ) : filteredTags.length === 0 ? (
                  <p className="tag-manager-empty">No tags match your search.</p>
                ) : (
                  <ul className="tag-manager-list">
                    {filteredTags.map((tag) => (
                      <li key={tag} className="tag-manager-item">
                        {tagManagerEditId === tag ? (
                          <div className="tag-manager-edit">
                            <input
                              ref={tagManagerEditRef}
                              type="text"
                              className="todo-edit-input"
                              value={tagManagerEditValue}
                              onChange={(e) => setTagManagerEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditTag()
                                if (e.key === 'Escape') cancelEditTag()
                              }}
                              autoFocus
                            />
                            <div className="tag-manager-actions">
                              <button
                                type="button"
                                className="action ghost"
                                onClick={saveEditTag}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="action link"
                                onClick={cancelEditTag}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`pill pill--tag ${currentTags.includes(tag) ? 'is-selected' : ''}`}
                              onClick={() => toggleTagSelection(tag, tagManagerOpener === 'composer' ? 'compose' : 'edit')}
                              style={{ cursor: 'pointer' }}
                            >
                              {tag}
                            </button>
                            <div className="tag-manager-actions">
                              <button
                                type="button"
                                className="action link"
                                onClick={() => startEditTag(tag)}
                                title="Edit tag"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="action link"
                                onClick={() => deleteTag(tag)}
                                title="Delete tag"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              })()}
              
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  Create new tag
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="todo-edit-input"
                    placeholder="Tag name"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagInput.trim()) {
                        e.preventDefault()
                        const normalized = addTagToPool(newTagInput)
                        if (normalized) {
                          toggleTagSelection(normalized, tagManagerOpener === 'composer' ? 'compose' : 'edit')
                          setNewTagInput('')
                        }
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="action ghost"
                    onClick={() => {
                      if (newTagInput.trim()) {
                        const normalized = addTagToPool(newTagInput)
                        if (normalized) {
                          toggleTagSelection(normalized, tagManagerOpener === 'composer' ? 'compose' : 'edit')
                          setNewTagInput('')
                        }
                      }
                    }}
                    disabled={!newTagInput.trim()}
                  >
                    Create & Add
                  </button>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--sidebar-border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="action link"
                  style={{ marginRight: '0.35rem' }}
                  onClick={() => {
                    if (tagManagerOpener === 'composer') {
                      setComposerDraft((prev) => ({ ...prev, tags: [] }))
                    } else if (tagManagerOpener === 'editing') {
                      setEditingDraft((prev) => ({ ...prev, tags: [] }))
                    }
                  }}
                >
                  Clear tags
                </button>
                <button
                  type="button"
                  className="action ghost"
                  onClick={() => {
                    if (tagManagerOpener === 'composer') {
                      setComposerDraft((prev) => ({ ...prev, tags: originalTags }))
                    } else if (tagManagerOpener === 'editing') {
                      setEditingDraft((prev) => ({ ...prev, tags: originalTags }))
                    }
                    setTagManagerOpen(false)
                    setTagSearchQuery('')
                    setNewTagInput('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action primary"
                  onClick={() => {
                    setTagManagerOpen(false)
                    setTagSearchQuery('')
                    setNewTagInput('')
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

