const TABLE = 'focus_queue'

export const fetchFocusQueueForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('queue, current_index')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No queue found, return defaults
      return { queue: [], currentIndex: 0 }
    }
    throw error
  }
  
  return {
    queue: Array.isArray(data?.queue) ? data.queue : [],
    currentIndex: data?.current_index ?? 0,
  }
}

export const saveFocusQueueForUser = async (supabase, userId, queue, currentIndex = 0) => {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        queue: Array.isArray(queue) ? queue : [],
        current_index: currentIndex,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  
  if (error) throw error
}

export const updateFocusQueueIndex = async (supabase, userId, currentIndex) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ 
      current_index: currentIndex,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  
  if (error) throw error
}
