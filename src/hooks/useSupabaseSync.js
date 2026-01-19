import { useEffect, useRef, useState } from 'react'
import { useSupabase } from '../contexts/SupabaseProvider'

/**
 * Generic hook for syncing data with Supabase
 * @param {Object} options
 * @param {Function} options.fetchFromSupabase - Async function to fetch data from Supabase
 * @param {Function} options.saveToSupabase - Async function to save data to Supabase
 * @param {Function} options.loadFromLocalStorage - Function to load data from localStorage
 * @param {Function} options.saveToLocalStorage - Function to save data to localStorage
 * @param {*} options.data - Current data to sync
 * @param {number} options.debounceMs - Debounce time in milliseconds (default: 1000)
 * @param {boolean} options.enabled - Whether syncing is enabled (default: true)
 */
export const useSupabaseSync = ({
  fetchFromSupabase,
  saveToSupabase,
  loadFromLocalStorage,
  saveToLocalStorage,
  data,
  debounceMs = 1000,
  enabled = true,
}) => {
  const { supabase, user, authReady } = useSupabase()
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle', 'loading', 'syncing', 'error'
  const [syncError, setSyncError] = useState(null)
  const saveTimeoutRef = useRef(null)
  const initialLoadRef = useRef(false)

  // Initial load from Supabase when user is authenticated
  useEffect(() => {
    if (!enabled || !authReady || !supabase || !user || initialLoadRef.current) return

    const loadFromSupabase = async () => {
      setSyncStatus('loading')
      setSyncError(null)
      
      try {
        const supabaseData = await fetchFromSupabase(supabase, user.id)
        
        // If Supabase has data, use it; otherwise use localStorage
        if (supabaseData && (Array.isArray(supabaseData) ? supabaseData.length > 0 : Object.keys(supabaseData).length > 0)) {
          saveToLocalStorage(supabaseData)
        } else {
          // Upload localStorage data to Supabase if it exists
          const localData = loadFromLocalStorage()
          if (localData && (Array.isArray(localData) ? localData.length > 0 : Object.keys(localData).length > 0)) {
            await saveToSupabase(supabase, user.id, localData)
          }
        }
        
        setSyncStatus('idle')
        initialLoadRef.current = true
      } catch (error) {
        console.error('Failed to load from Supabase:', error)
        setSyncError(error.message)
        setSyncStatus('error')
        initialLoadRef.current = true
      }
    }

    loadFromSupabase()
  }, [enabled, authReady, supabase, user])

  // Debounced save to Supabase whenever data changes
  useEffect(() => {
    if (!enabled || !supabase || !user || !initialLoadRef.current) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      setSyncStatus('syncing')
      setSyncError(null)
      
      try {
        await saveToSupabase(supabase, user.id, data)
        saveToLocalStorage(data)
        setSyncStatus('idle')
      } catch (error) {
        console.error('Failed to sync to Supabase:', error)
        setSyncError(error.message)
        setSyncStatus('error')
        // Still save to localStorage as fallback
        saveToLocalStorage(data)
      }
    }, debounceMs)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [enabled, supabase, user, data, debounceMs])

  return { syncStatus, syncError }
}
