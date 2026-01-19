import { useSupabaseSync } from './useSupabaseSync'
import {
  fetchConversationsForUser,
  saveConversation,
  deleteConversation as deleteConversationDb,
  updateConversationMessages,
  updateConversationTitle,
} from '../utils/supabaseConversations'
import {
  loadConversations,
  saveConversations,
  getCurrentConversationId,
  setCurrentConversationId,
} from '../components/ConversationManager'

export const useSupabaseConversations = (conversations, currentConversationId) => {
  return useSupabaseSync({
    fetchFromSupabase: fetchConversationsForUser,
    saveToSupabase: async (supabase, userId, data) => {
      // Save all conversations
      for (const conv of data) {
        await saveConversation(supabase, userId, conv)
      }
    },
    loadFromLocalStorage: loadConversations,
    saveToLocalStorage: saveConversations,
    data: conversations,
    debounceMs: 1000,
    enabled: true,
  })
}

// Helper functions for conversation operations with Supabase sync
export const useConversationHelpers = (supabase, user) => {
  const updateMessages = async (conversationId, messages) => {
    if (supabase && user) {
      try {
        await updateConversationMessages(supabase, user.id, conversationId, messages)
      } catch (error) {
        console.error('Failed to update conversation messages:', error)
      }
    }
  }

  const updateTitle = async (conversationId, title) => {
    if (supabase && user) {
      try {
        await updateConversationTitle(supabase, user.id, conversationId, title)
      } catch (error) {
        console.error('Failed to update conversation title:', error)
      }
    }
  }

  const deleteConversation = async (conversationId) => {
    if (supabase && user) {
      try {
        await deleteConversationDb(supabase, user.id, conversationId)
      } catch (error) {
        console.error('Failed to delete conversation:', error)
      }
    }
  }

  return { updateMessages, updateTitle, deleteConversation }
}
