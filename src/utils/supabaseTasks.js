const TABLE = 'tasks'

export const toDbTask = (task, userId) => {
  const dueDate = task?.due?.date || null
  const dueTime = task?.due?.time || null
  return {
    id: String(task.id),
    user_id: userId,
    title: task.title || 'Untitled task',
    due_date: dueDate || null,
    due_time: dueTime || null,
    priority: task.priority || 'None',
    tags: Array.isArray(task.tags) ? task.tags : [],
    completed: Boolean(task.completed),
    completed_date: task?.completedDate || null,
    time_allocated: task?.timeAllocated ?? null,
    objective: task?.objective ?? null,
    goal_id: task?.goalId ?? null,
    recurrence: task?.recurrence || { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
    in_today: Boolean(task?.inToday),
  }
}

export const fromDbTask = (row = {}) => ({
  id: Number(row.id) || row.id,
  title: row.title || 'Untitled task',
  due: { date: row.due_date || '', time: row.due_time || '' },
  priority: row.priority || 'None',
  tags: Array.isArray(row.tags) ? row.tags : [],
  completed: Boolean(row.completed),
  completedDate: row.completed_date || null,
  timeAllocated: row.time_allocated ?? null,
  objective: row.objective ?? null,
  goalId: row.goal_id ?? null,
  recurrence: row.recurrence || { type: 'None', interval: null, unit: 'day', daysOfWeek: [] },
  inToday: Boolean(row.in_today),
})

export const fetchTasksForUser = async (supabase, userId) => {
  const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId)
  if (error) throw error
  return Array.isArray(data) ? data.map(fromDbTask) : []
}

export const saveTasksForUser = async (supabase, userId, tasks = []) => {
  if (!Array.isArray(tasks)) return
  
  // Clear all old tasks for this user first (prevents duplicates)
  const { error: deleteAllError } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
  
  if (deleteAllError) throw deleteAllError
  
  // If no tasks, we're done
  if (!tasks.length) return
  
  // Insert all tasks fresh (this is safer than upsert)
  const payload = tasks.map((t) => toDbTask(t, userId))
  const { error: insertError } = await supabase
    .from(TABLE)
    .insert(payload)
  
  if (insertError) throw insertError
}

export default {
  fetchTasksForUser,
  saveTasksForUser,
  toDbTask,
  fromDbTask,
}
