const TABLE = 'goals'

export const toDbGoal = (goal, userId) => ({
  id: goal.id,
  user_id: userId,
  title: goal.title || 'Untitled Goal',
  due_date: goal.dueDate || null,
  target: goal.target || '',
  target_unit: goal.targetUnit || 'pages',
  custom_unit: goal.customUnit || '',
  progress: goal.progress || '0',
  priority: goal.priority || 'none',
  tags: Array.isArray(goal.tags) ? goal.tags : [],
})

export const fromDbGoal = (row = {}) => ({
  id: row.id,
  title: row.title || 'Untitled Goal',
  dueDate: row.due_date || '',
  target: row.target || '',
  targetUnit: row.target_unit || 'pages',
  customUnit: row.custom_unit || '',
  progress: row.progress || '0',
  priority: row.priority || 'none',
  tags: Array.isArray(row.tags) ? row.tags : [],
})

export const fetchGoalsForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return Array.isArray(data) ? data.map(fromDbGoal) : []
}

export const saveGoalsForUser = async (supabase, userId, goals = []) => {
  if (!Array.isArray(goals)) return
  
  // Delete all existing goals for user
  await supabase.from(TABLE).delete().eq('user_id', userId)
  
  // Insert new goals if any
  if (goals.length > 0) {
    const dbGoals = goals.map(goal => toDbGoal(goal, userId))
    const { error } = await supabase.from(TABLE).insert(dbGoals)
    if (error) throw error
  }
}

export const saveGoal = async (supabase, userId, goal) => {
  const dbGoal = toDbGoal(goal, userId)
  
  const { error } = await supabase
    .from(TABLE)
    .upsert(dbGoal, { onConflict: 'id' })
  
  if (error) throw error
}

export const deleteGoal = async (supabase, userId, goalId) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId)
  
  if (error) throw error
}

export const updateGoalProgress = async (supabase, userId, goalId, progress) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId)
  
  if (error) throw error
}
