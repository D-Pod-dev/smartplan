const TABLE = 'conversations'

export const toDbConversation = (conversation, userId) => ({
  id: conversation.id,
  user_id: userId,
  title: conversation.title || 'Untitled Conversation',
  messages: conversation.messages || [],
  created_at: conversation.createdAt || new Date().toISOString(),
})

export const fromDbConversation = (row = {}) => ({
  id: row.id,
  title: row.title || 'Untitled Conversation',
  messages: Array.isArray(row.messages) ? row.messages : [],
  createdAt: row.created_at || new Date().toISOString(),
})

export const fetchConversationsForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return Array.isArray(data) ? data.map(fromDbConversation) : []
}

export const saveConversation = async (supabase, userId, conversation) => {
  const dbConversation = toDbConversation(conversation, userId)
  
  const { error } = await supabase
    .from(TABLE)
    .upsert(dbConversation, { onConflict: 'id' })
  
  if (error) throw error
}

export const deleteConversation = async (supabase, userId, conversationId) => {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)
  
  if (error) throw error
}

export const updateConversationMessages = async (supabase, userId, conversationId, messages) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId)
  
  if (error) throw error
}

export const updateConversationTitle = async (supabase, userId, conversationId, title) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId)
  
  if (error) throw error
}
