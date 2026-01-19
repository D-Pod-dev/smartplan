/**
 * Migration helper to manually sync localStorage data to Supabase
 * This can be used for manual migrations or troubleshooting
 */

import { createSupabaseClient } from './supabaseClient'
import { saveTasksForUser } from './supabaseTasks'
import { saveConversation } from './supabaseConversations'
import { saveSettingsForUser } from './supabaseSettings'
import { saveGoalsForUser } from './supabaseGoals'
import { saveTagsForUser } from './supabaseTags'
import { saveInsightsForUser } from './supabaseInsights'
import { saveFocusQueueForUser } from './supabaseFocusQueue'
import { loadConversations } from '../components/ConversationManager'
import { loadInsights } from './insightTracker'
import { normalizeTodo } from './groq'

export const migrateLocalStorageToSupabase = async (userId) => {
  const supabase = createSupabaseClient()
  if (!supabase || !userId) {
    console.error('Supabase client not initialized or no user ID provided')
    return { success: false, error: 'No Supabase client or user ID' }
  }

  const results = {
    tasks: { success: false, count: 0 },
    conversations: { success: false, count: 0 },
    settings: { success: false },
    goals: { success: false, count: 0 },
    tags: { success: false, count: 0 },
    insights: { success: false },
    focusQueue: { success: false, count: 0 },
  }

  try {
    // Migrate tasks
    try {
      const tasksStr = localStorage.getItem('smartplan.tasks')
      if (tasksStr) {
        const tasks = JSON.parse(tasksStr)
        const normalizedTasks = Array.isArray(tasks) ? tasks.map(normalizeTodo) : []
        await saveTasksForUser(supabase, userId, normalizedTasks)
        results.tasks = { success: true, count: normalizedTasks.length }
      }
    } catch (err) {
      console.error('Failed to migrate tasks:', err)
      results.tasks.error = err.message
    }

    // Migrate conversations
    try {
      const conversations = loadConversations()
      for (const conv of conversations) {
        await saveConversation(supabase, userId, conv)
      }
      results.conversations = { success: true, count: conversations.length }
    } catch (err) {
      console.error('Failed to migrate conversations:', err)
      results.conversations.error = err.message
    }

    // Migrate settings
    try {
      const settings = {}
      
      // Focus settings
      const focusStr = localStorage.getItem('smartplan.settings.focus')
      if (focusStr) {
        settings.focus = JSON.parse(focusStr)
      }
      
      // Dev panel settings
      const devPanelStr = localStorage.getItem('smartplan.settings.devPanel')
      if (devPanelStr) {
        settings.devPanel = JSON.parse(devPanelStr)
      }
      
      await saveSettingsForUser(supabase, userId, settings)
      results.settings = { success: true }
    } catch (err) {
      console.error('Failed to migrate settings:', err)
      results.settings.error = err.message
    }

    // Migrate goals
    try {
      const goalsStr = localStorage.getItem('smartplan.goals')
      if (goalsStr) {
        const goals = JSON.parse(goalsStr)
        const goalsArray = Array.isArray(goals) ? goals : []
        await saveGoalsForUser(supabase, userId, goalsArray)
        results.goals = { success: true, count: goalsArray.length }
      }
    } catch (err) {
      console.error('Failed to migrate goals:', err)
      results.goals.error = err.message
    }

    // Migrate tags
    try {
      const tagsStr = localStorage.getItem('smartplan.tags')
      if (tagsStr) {
        const tags = JSON.parse(tagsStr)
        const tagsArray = Array.isArray(tags) ? tags : []
        await saveTagsForUser(supabase, userId, tagsArray)
        results.tags = { success: true, count: tagsArray.length }
      }
    } catch (err) {
      console.error('Failed to migrate tags:', err)
      results.tags.error = err.message
    }

    // Migrate insights
    try {
      const insights = loadInsights()
      await saveInsightsForUser(supabase, userId, insights)
      results.insights = { success: true }
    } catch (err) {
      console.error('Failed to migrate insights:', err)
      results.insights.error = err.message
    }

    // Migrate focus queue
    try {
      const queueStr = localStorage.getItem('smartplan.focusQueue')
      const indexStr = localStorage.getItem('smartplan.focusQueueIndex')
      
      const queue = queueStr ? JSON.parse(queueStr) : []
      const currentIndex = indexStr ? parseInt(indexStr, 10) : 0
      
      await saveFocusQueueForUser(supabase, userId, queue, currentIndex)
      results.focusQueue = { success: true, count: queue.length }
    } catch (err) {
      console.error('Failed to migrate focus queue:', err)
      results.focusQueue.error = err.message
    }

    return { success: true, results }
  } catch (err) {
    console.error('Migration failed:', err)
    return { success: false, error: err.message, results }
  }
}

export const downloadLocalStorageBackup = () => {
  const backup = {
    timestamp: new Date().toISOString(),
    data: {
      tasks: localStorage.getItem('smartplan.tasks'),
      conversations: localStorage.getItem('smartplan.conversations'),
      currentConversation: localStorage.getItem('smartplan.currentConversation'),
      settings: {
        focus: localStorage.getItem('smartplan.settings.focus'),
        devPanel: localStorage.getItem('smartplan.settings.devPanel'),
      },
      goals: localStorage.getItem('smartplan.goals'),
      tags: localStorage.getItem('smartplan.tags'),
      insights: localStorage.getItem('smartplan.insights'),
      focusQueue: localStorage.getItem('smartplan.focusQueue'),
      focusQueueIndex: localStorage.getItem('smartplan.focusQueueIndex'),
    },
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `smartplan-backup-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
