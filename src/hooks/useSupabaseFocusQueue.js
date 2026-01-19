import { useSupabaseSync } from './useSupabaseSync'
import { fetchFocusQueueForUser, saveFocusQueueForUser } from '../utils/supabaseFocusQueue'

const QUEUE_STORAGE_KEY = 'smartplan.focusQueue'
const INDEX_STORAGE_KEY = 'smartplan.focusQueueIndex'

const loadFocusQueueFromLocalStorage = () => {
  if (typeof localStorage === 'undefined') return { queue: [], currentIndex: 0 }
  try {
    const savedQueue = localStorage.getItem(QUEUE_STORAGE_KEY)
    const savedIndex = localStorage.getItem(INDEX_STORAGE_KEY)
    
    const queue = savedQueue ? JSON.parse(savedQueue) : []
    const currentIndex = savedIndex ? parseInt(savedIndex, 10) : 0
    
    return { 
      queue: Array.isArray(queue) ? queue : [],
      currentIndex: isNaN(currentIndex) ? 0 : currentIndex,
    }
  } catch {}
  return { queue: [], currentIndex: 0 }
}

const saveFocusQueueToLocalStorage = (data) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(data.queue || []))
  localStorage.setItem(INDEX_STORAGE_KEY, String(data.currentIndex || 0))
}

export const useSupabaseFocusQueue = (queue, currentIndex) => {
  return useSupabaseSync({
    fetchFromSupabase: fetchFocusQueueForUser,
    saveToSupabase: (supabase, userId, data) => 
      saveFocusQueueForUser(supabase, userId, data.queue, data.currentIndex),
    loadFromLocalStorage: loadFocusQueueFromLocalStorage,
    saveToLocalStorage: saveFocusQueueToLocalStorage,
    data: { queue, currentIndex },
    debounceMs: 1000,
    enabled: true,
  })
}
