import '../App.css'
import { getCurrentDate } from '../utils/dateUtils'

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

const getDateOnly = (dateString) => {
  if (!dateString) return null
  const parsed = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

const getDueStatus = (due) => {
  const dueDate = getDateOnly(due?.date)
  if (!dueDate) return null

  const now = getCurrentDate()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (dueDate.getTime() === today.getTime()) return 'today'
  if (dueDate < today) return 'overdue'
  return null
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

const priorityStyles = {
  High: {
    background: 'rgba(255, 107, 61, 0.16)',
    borderColor: 'rgba(255, 107, 61, 0.45)',
    color: '#ff8a62',
  },
  Medium: {
    background: 'rgba(224, 162, 0, 0.18)',
    borderColor: 'rgba(224, 162, 0, 0.42)',
    color: '#f4c74a',
  },
  Low: {
    background: 'rgba(74, 163, 255, 0.16)',
    borderColor: 'rgba(74, 163, 255, 0.42)',
    color: '#8cc7ff',
  },
}

const renderTags = (taskTags) => {
  if (!taskTags?.length) {
    return <span className="pill pill--empty">No tags</span>
  }
  return taskTags.map((tag) => (
    <span key={tag} className="pill pill--tag">{tag}</span>
  ))
}

export default function TaskDisplay({ task }) {
  const hasDueDate = Boolean(task?.due?.date || task?.due?.time)
  const dueStatus = getDueStatus(task.due)

  return (
    <div className="todo-display">
      <div className={`list__title todo-title ${task.completed ? 'is-completed' : ''}`}>
        {task.title}
        {task.objective && <span className="pill pill--filled" style={{ marginLeft: '0.5rem' }}>{task.objective}</span>}
        {(task.timeAllocated && task.timeAllocated > 0) && <span className="pill pill--filled" style={{ marginLeft: '0.5rem' }}>{task.timeAllocated} min</span>}
      </div>
      <div className="list__meta todo-meta">
        <span
          className={[
            'pill',
            hasDueDate ? 'pill--filled' : 'pill--empty',
            dueStatus === 'today' ? 'pill--today' : '',
            dueStatus === 'overdue' ? 'pill--overdue' : '',
          ].filter(Boolean).join(' ')}
        >
          {formatDue(task.due) || 'No due date'}
        </span>
        <span
          className={`pill ${task.priority === 'None' ? 'pill--empty' : 'pill--filled'}`}
          style={task.priority && task.priority !== 'None' ? priorityStyles[task.priority] : undefined}
        >
          {task.priority === 'None' ? 'No priority' : `${task.priority} priority`}
        </span>
        {formatRecurrence(task.recurrence) !== 'Not recurring' && (
          <span className="pill pill--filled">{formatRecurrence(task.recurrence)}</span>
        )}
        {renderTags(task.tags)}
      </div>
    </div>
  )
}
