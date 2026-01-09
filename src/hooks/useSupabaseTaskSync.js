import { useEffect, useState } from 'react'
import { useSupabase } from '../contexts/SupabaseProvider'
import { fetchTasksForUser, saveTasksForUser } from '../utils/supabaseTasks'

export const useSupabaseTaskSync = ({ tasks, setTasks, normalizeTask, storageKey = 'smartplan.tasks' }) => {
  const { supabase, user, authReady } = useSupabase()
  const [syncStatus, setSyncStatus] = useState('idle')
  const [syncError, setSyncError] = useState(null)
  const [remoteLoadedFor, setRemoteLoadedFor] = useState(null)

  // Load tasks from Supabase after auth is ready
  useEffect(() => {
    if (!authReady) return
    if (!user || !supabase) {
      setRemoteLoadedFor(null)
      return
    }
    if (remoteLoadedFor === user.id) return

    let cancelled = false
    setSyncStatus('loading')
    console.log('[Supabase Sync] Loading tasks for user:', user.id)
    fetchTasksForUser(supabase, user.id)
      .then((remoteTasks) => {
        if (cancelled) return
        console.log('[Supabase Sync] Loaded', remoteTasks.length, 'tasks from remote')
        if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
          const next = normalizeTask ? remoteTasks.map(normalizeTask) : remoteTasks
          setTasks(next)
        }
        setRemoteLoadedFor(user.id)
        setSyncError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Supabase Sync] Load error:', err.message || err)
        console.error('[Supabase Sync] Load error details:', err)
        setSyncError(err)
      })
      .finally(() => {
        if (cancelled) return
        setSyncStatus('idle')
      })

    return () => {
      cancelled = true
    }
  }, [authReady, user, supabase, remoteLoadedFor, setTasks, normalizeTask])

  // Persist to localStorage and Supabase when tasks change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks))
    } catch (err) {
      console.warn('Unable to persist tasks locally', err)
    }

    if (!authReady || !user || !supabase || remoteLoadedFor !== user?.id) {
      console.log('[Supabase Sync] Skip save - not ready or not logged in')
      return
    }

    let cancelled = false
    setSyncStatus('saving')
    console.log('[Supabase Sync] Saving', tasks.length, 'tasks for user:', user.id)
    saveTasksForUser(supabase, user.id, tasks)
      .then(() => {
        if (!cancelled) {
          console.log('[Supabase Sync] Save successful')
          setSyncError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[Supabase Sync] Save error:', err.message || err)
          console.error('[Supabase Sync] Save error details:', err)
          setSyncError(err)
        }
      })
      .finally(() => {
        if (!cancelled) setSyncStatus('idle')
      })

    return () => {
      cancelled = true
    }
  }, [tasks, authReady, user, supabase, remoteLoadedFor, storageKey])

  return { syncStatus, syncError, user }
}

export default useSupabaseTaskSync
