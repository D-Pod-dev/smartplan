const TABLE = 'user_insights'

export const toDbInsights = (insights, userId) => ({
  user_id: userId,
  flow_score: insights.flowScore ?? 0,
  flow_score_trend: insights.flowScoreTrend ?? 0,
  tasks_completed_today: insights.tasksCompletedToday ?? 0,
  tasks_completed_this_week: insights.tasksCompletedThisWeek ?? 0,
  time_saved_hours: insights.timeSavedHours ?? 0,
  time_saved_tasks: insights.timeSavedTasks ?? 0,
  focus_ratio: insights.focusRatio ?? 0,
  focus_ratio_date: insights.focusRatioDate || null,
  streak_days: insights.streakDays ?? 0,
  last_completion_date: insights.lastCompletionDate || null,
  total_tasks_created: insights.totalTasksCreated ?? 0,
  ai_assisted_tasks: insights.aiAssistedTasks ?? 0,
})

export const fromDbInsights = (row = {}) => ({
  flowScore: row.flow_score ?? 0,
  flowScoreTrend: row.flow_score_trend ?? 0,
  tasksCompletedToday: row.tasks_completed_today ?? 0,
  tasksCompletedThisWeek: row.tasks_completed_this_week ?? 0,
  timeSavedHours: row.time_saved_hours ?? 0,
  timeSavedTasks: row.time_saved_tasks ?? 0,
  focusRatio: row.focus_ratio ?? 0,
  focusRatioDate: row.focus_ratio_date || null,
  streakDays: row.streak_days ?? 0,
  lastCompletionDate: row.last_completion_date || null,
  totalTasksCreated: row.total_tasks_created ?? 0,
  aiAssistedTasks: row.ai_assisted_tasks ?? 0,
})

export const fetchInsightsForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No insights found, return defaults
      return fromDbInsights({})
    }
    throw error
  }
  
  return fromDbInsights(data)
}

export const saveInsightsForUser = async (supabase, userId, insights) => {
  const dbInsights = toDbInsights(insights, userId)
  
  const { error } = await supabase
    .from(TABLE)
    .upsert(dbInsights, { onConflict: 'user_id' })
  
  if (error) throw error
}

export const updateInsightsForUser = async (supabase, userId, partialInsights) => {
  // Fetch existing insights first
  const existingInsights = await fetchInsightsForUser(supabase, userId)
  
  // Merge with new insights
  const mergedInsights = { ...existingInsights, ...partialInsights }
  
  // Save merged insights
  await saveInsightsForUser(supabase, userId, mergedInsights)
}
