const TABLE = 'tasks'

export const toDbTask = (task, userId) => {
  const dueDate = task?.due?.date || null
  const dueTime = task?.due?.time || null
  return {
    id: task.id,
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
  id: row.id,
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
  if (!tasks.length) {
    await supabase.from(TABLE).delete().eq('user_id', userId)
    return
  }

  const payload = tasks.map((t) => toDbTask(t, userId))
  const ids = tasks.map((t) => t.id)
  const { error: upsertError } = await supabase.from(TABLE).upsert(payload, { onConflict: 'user_id,id' })
  if (upsertError) throw upsertError

  // Delete tasks that are no longer in the local list
  const { error: deleteError } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .not('id', 'in', `(${ids.join(',')})`)
  if (deleteError) throw deleteError
}

export default {
  fetchTasksForUser,
  saveTasksForUser,
  toDbTask,
  fromDbTask,
}
