const TABLE = 'user_tags'

export const fetchTagsForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('tag')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return Array.isArray(data) ? data.map(row => row.tag) : []
}

export const addTagForUser = async (supabase, userId, tag) => {
  const { error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      tag: tag,
    })
  
  if (error) {
    // Ignore duplicate key errors
    if (error.code !== '23505') {
      throw error
    }
  }
}

export const deleteTagForUser = async (supabase, userId, tag) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('tag', tag)
  
  if (error) throw error
}

export const renameTagForUser = async (supabase, userId, oldTag, newTag) => {
  // Delete old tag
  await deleteTagForUser(supabase, userId, oldTag)
  
  // Add new tag
  await addTagForUser(supabase, userId, newTag)
}

export const saveTagsForUser = async (supabase, userId, tags = []) => {
  if (!Array.isArray(tags)) return
  
  // Delete all existing tags for user
  await supabase.from(TABLE).delete().eq('user_id', userId)
  
  // Insert new tags if any
  if (tags.length > 0) {
    const uniqueTags = [...new Set(tags)]
    const dbTags = uniqueTags.map(tag => ({
      user_id: userId,
      tag: tag,
    }))
    
    const { error } = await supabase.from(TABLE).insert(dbTags)
    if (error) throw error
  }
}
