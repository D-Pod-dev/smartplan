// Insight tracking utility for SmartPlan
// Tracks metrics like flow score, time saved, focus ratio, etc.

const INSIGHT_STORAGE_KEY = 'smartplan.insights'

export const getDefaultInsights = () => ({
  flowScore: 0,
  flowScoreTrend: 0,
  tasksCompletedToday: 0,
  tasksCompletedThisWeek: 0,
  timeSavedHours: 0,
  timeSavedTasks: 0,
  focusRatio: 0,
  focusRatioDate: null,
  streakDays: 0,
  lastCompletionDate: null,
  totalTasksCreated: 0,
  aiAssistedTasks: 0,
})

export const loadInsights = () => {
  if (typeof localStorage === 'undefined') return getDefaultInsights()
  try {
    const saved = localStorage.getItem(INSIGHT_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...getDefaultInsights(), ...parsed }
    }
  } catch (err) {
    console.warn('Failed to load insights:', err)
  }
  return getDefaultInsights()
}

export const saveInsights = (insights) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(INSIGHT_STORAGE_KEY, JSON.stringify(insights))
  } catch (err) {
    console.warn('Failed to save insights:', err)
  }
}

export const calculateFlowScore = (tasks = []) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0

  // Flow score based on:
  // - Completion rate (40%)
  // - Task consistency (30%)
  // - Time allocation accuracy (20%)
  // - Priority balance (10%)

  const today = new Date().toISOString().split('T')[0]
  const completed = tasks.filter((t) => t.completed && t.completedDate === today).length
  const total = tasks.filter((t) => t.inToday).length
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  // Priority balance (prefer Medium and High)
  const prioritized = tasks.filter((t) => ['High', 'Medium'].includes(t.priority) && t.inToday).length
  const priorityBalance = total > 0 ? (prioritized / total) * 100 : 0

  // Time allocation accuracy (tasks with timeAllocated are more intentional)
  const timed = tasks.filter((t) => t.timeAllocated && t.inToday).length
  const timeBalance = total > 0 ? (timed / total) * 50 : 0

  const score = Math.min(100, Math.round(completionRate * 0.4 + priorityBalance * 0.1 + timeBalance * 0.2 + 30))
  return score
}

export const calculateTimeSaved = (tasks = [], insights = {}) => {
  if (!Array.isArray(tasks)) return { hours: 0, taskCount: 0 }

  const completed = tasks.filter((t) => t.completed && t.timeAllocated).length
  const totalMinutes = tasks
    .filter((t) => t.completed && t.timeAllocated)
    .reduce((sum, t) => sum + (t.timeAllocated || 0), 0)

  // Only count AI-assisted tasks toward time saved
  const aiAssisted = insights.aiAssistedTasks || 0
  const hours = Math.round((totalMinutes / 60) * 10) / 10
  const taskCount = Math.min(completed, aiAssisted)

  return { hours, taskCount }
}

export const calculateFocusRatio = (tasks = []) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const todaysTasks = tasks.filter((t) => t.inToday && t.due?.date === today)

  if (todaysTasks.length === 0) return 0

  // Deep work = high priority tasks without meetings tag
  const deepWork = todaysTasks.filter(
    (t) => t.priority === 'High' && !t.tags?.includes('Meetings')
  ).length

  const focusRatio = (deepWork / todaysTasks.length) * 100
  return Math.round(focusRatio)
}

export const updateInsightsFromTasks = (tasks = [], insights = getDefaultInsights()) => {
  const today = new Date().toISOString().split('T')[0]
  const updated = { ...insights }

  // Tasks completed today
  const completedToday = tasks.filter((t) => t.completed && t.completedDate === today).length
  updated.tasksCompletedToday = completedToday

  // Tasks completed this week
  const weekAgo = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
  const completedThisWeek = tasks.filter(
    (t) => t.completed && t.completedDate >= weekAgo
  ).length
  updated.tasksCompletedThisWeek = completedThisWeek

  // Flow score with trend
  const newFlowScore = calculateFlowScore(tasks)
  updated.flowScoreTrend = newFlowScore - (updated.flowScore || 0)
  updated.flowScore = newFlowScore

  // Time saved
  const timeSaved = calculateTimeSaved(tasks, updated)
  updated.timeSavedHours = timeSaved.hours
  updated.timeSavedTasks = timeSaved.taskCount

  // Focus ratio
  updated.focusRatio = calculateFocusRatio(tasks)
  updated.focusRatioDate = today

  // Streak calculation
  if (completedToday > 0) {
    const lastCompletion = updated.lastCompletionDate || today
    const lastDate = new Date(lastCompletion)
    const currentDate = new Date(today)
    const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24))

    if (daysDiff === 0) {
      // Same day, keep streak
      updated.streakDays = updated.streakDays || 1
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      updated.streakDays = (updated.streakDays || 1) + 1
    } else {
      // Gap in streak, reset
      updated.streakDays = 1
    }
    updated.lastCompletionDate = today
  }

  return updated
}

export const incrementAiAssistedTasks = (insights = getDefaultInsights()) => {
  return {
    ...insights,
    aiAssistedTasks: (insights.aiAssistedTasks || 0) + 1,
  }
}

export const incrementTotalTasksCreated = (insights = getDefaultInsights()) => {
  return {
    ...insights,
    totalTasksCreated: (insights.totalTasksCreated || 0) + 1,
  }
}

export const getInsightFormatted = (key, value) => {
  const formatters = {
    flowScore: (v) => `${Math.round(v)}`,
    timeSavedHours: (v) => `${v}h`,
    focusRatio: (v) => `${Math.round(v)}%`,
    tasksCompletedToday: (v) => `${v} completed`,
    tasksCompletedThisWeek: (v) => `${v} this week`,
    streakDays: (v) => `${v} day${v !== 1 ? 's' : ''}`,
    aiAssistedTasks: (v) => `${v} assisted`,
  }
  return formatters[key] ? formatters[key](value) : String(value)
}

export default {
  loadInsights,
  saveInsights,
  calculateFlowScore,
  calculateTimeSaved,
  calculateFocusRatio,
  updateInsightsFromTasks,
  incrementAiAssistedTasks,
  incrementTotalTasksCreated,
  getInsightFormatted,
}
