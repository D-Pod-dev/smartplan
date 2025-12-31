import { getCurrentDate } from './dateUtils'

/**
 * Calculate the next occurrence date for a recurring task
 * @param {Object} recurrence - The recurrence configuration
 * @param {string} currentDueDate - The current due date in YYYY-MM-DD format
 * @returns {string} - The next occurrence date in YYYY-MM-DD format
 */
export const calculateNextOccurrence = (recurrence, currentDueDate) => {
  if (!recurrence || recurrence.type === 'None') return null

  const current = currentDueDate ? new Date(`${currentDueDate}T00:00:00`) : getCurrentDate()
  const next = new Date(current)

  switch (recurrence.type) {
    case 'Daily':
      next.setDate(next.getDate() + 1)
      break

    case 'Weekly':
      // Find the next occurrence based on selected days
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        next.setDate(next.getDate() + 1) // Start from tomorrow
        const nextDate = findNextWeeklyOccurrence(next, recurrence.daysOfWeek)
        return formatDate(nextDate)
      }
      // Fallback: just add 7 days
      next.setDate(next.getDate() + 7)
      break

    case 'Monthly':
      next.setMonth(next.getMonth() + 1)
      break

    case 'Custom':
      if (!recurrence.interval || recurrence.interval < 1) return null
      
      switch (recurrence.unit) {
        case 'day':
          next.setDate(next.getDate() + recurrence.interval)
          break
        case 'week':
          if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
            // For custom weekly with specific days, find next occurrence
            const weeksToAdd = recurrence.interval
            const tempDate = new Date(current)
            tempDate.setDate(tempDate.getDate() + 1) // Start from tomorrow
            
            // Try to find the next day within the same week cycle first
            const nextInCycle = findNextWeeklyOccurrence(tempDate, recurrence.daysOfWeek)
            
            // If the next occurrence is within one week, use it
            const daysUntilNext = Math.ceil((nextInCycle - current) / (1000 * 60 * 60 * 24))
            if (daysUntilNext <= 7) {
              return formatDate(nextInCycle)
            }
            
            // Otherwise, jump by the full interval
            next.setDate(next.getDate() + (weeksToAdd * 7))
            return formatDate(findNextWeeklyOccurrence(next, recurrence.daysOfWeek))
          }
          next.setDate(next.getDate() + (recurrence.interval * 7))
          break
        case 'month':
          next.setMonth(next.getMonth() + recurrence.interval)
          break
      }
      break

    default:
      return null
  }

  return formatDate(next)
}

/**
 * Calculate the first occurrence date for a newly created recurring task
 * @param {Object} recurrence - The recurrence configuration
 * @param {string} baseDueDate - The base due date in YYYY-MM-DD format (optional)
 * @returns {string} - The first occurrence date in YYYY-MM-DD format
 */
export const calculateFirstOccurrence = (recurrence, baseDueDate = null) => {
  if (!recurrence || recurrence.type === 'None') return baseDueDate

  const today = getCurrentDate()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatDate(today)

  // If a base due date is provided and it's today or in the future, use it
  if (baseDueDate && baseDueDate >= todayStr) {
    return baseDueDate
  }

  // For non-weekly recurrences, use today or the base date
  if (recurrence.type !== 'Weekly' && recurrence.type !== 'Custom') {
    return baseDueDate || todayStr
  }

  // For weekly/custom-weekly with specific days
  if ((recurrence.type === 'Weekly' || (recurrence.type === 'Custom' && recurrence.unit === 'week')) 
      && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    
    // Check if today matches one of the selected days
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayName = dayMap[today.getDay()]
    
    if (recurrence.daysOfWeek.includes(todayName)) {
      return todayStr
    }
    
    // Otherwise, find the next matching day
    const nextDate = findNextWeeklyOccurrence(today, recurrence.daysOfWeek)
    return formatDate(nextDate)
  }

  // Default to today
  return baseDueDate || todayStr
}

/**
 * Find the next date that matches one of the specified days of the week
 * @param {Date} fromDate - The starting date (not included in search)
 * @param {string[]} daysOfWeek - Array of day names (e.g., ['Mon', 'Wed', 'Fri'])
 * @returns {Date} - The next matching date
 */
const findNextWeeklyOccurrence = (fromDate, daysOfWeek) => {
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const targetDays = daysOfWeek.map(day => dayMap[day]).sort((a, b) => a - b)
  
  const current = new Date(fromDate)
  const currentDay = current.getDay()
  
  // Find the next matching day
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7
    if (targetDays.includes(checkDay)) {
      const result = new Date(current)
      result.setDate(result.getDate() + i)
      return result
    }
  }
  
  // Fallback (should never reach here)
  return current
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if a task is a recurring task
 * @param {Object} task
 * @returns {boolean}
 */
export const isRecurringTask = (task) => {
  return task?.recurrence?.type && task.recurrence.type !== 'None'
}
