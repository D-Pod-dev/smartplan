// Date utility that allows overriding the current date for debugging
let debugDateOverride = null

export const setDebugDate = (isoDate) => {
  debugDateOverride = isoDate
  if (typeof localStorage !== 'undefined') {
    if (isoDate) {
      localStorage.setItem('smartplan.debug.date', isoDate)
    } else {
      localStorage.removeItem('smartplan.debug.date')
    }
  }
}

export const getDebugDate = () => {
  if (debugDateOverride) return debugDateOverride
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('smartplan.debug.date')
    if (saved) {
      debugDateOverride = saved
      return saved
    }
  }
  return null
}

export const getCurrentDate = () => {
  const override = getDebugDate()
  if (override) {
    return new Date(`${override}T00:00:00`)
  }
  return new Date()
}

export const clearDebugDate = () => {
  debugDateOverride = null
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('smartplan.debug.date')
  }
}

/**
 * Determines if a task should be marked as "inToday" based on its due date
 * Returns true if the task is: overdue, due today, or due tomorrow
 * @param {string} dueDateIso - Due date in YYYY-MM-DD format
 * @returns {boolean} - Whether the task should be in today's list
 */
export const shouldTaskBeInToday = (dueDateIso) => {
  if (!dueDateIso || typeof dueDateIso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDateIso)) {
    return false
  }

  const now = getCurrentDate()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dueDate = new Date(`${dueDateIso}T00:00:00`)
  if (Number.isNaN(dueDate.getTime())) {
    return false
  }

  const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

  // Task should be in today if it's overdue, due today, or due tomorrow
  return taskDate <= tomorrow
}
