import { useSupabaseSync } from './useSupabaseSync'
import { fetchTagsForUser, saveTagsForUser } from '../utils/supabaseTags'

const TAGS_STORAGE_KEY = 'smartplan.tags'

const loadTagsFromLocalStorage = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    const saved = localStorage.getItem(TAGS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

const saveTagsToLocalStorage = (tags) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
}

export const useSupabaseTags = (tags) => {
  return useSupabaseSync({
    fetchFromSupabase: fetchTagsForUser,
    saveToSupabase: saveTagsForUser,
    loadFromLocalStorage: loadTagsFromLocalStorage,
    saveToLocalStorage: saveTagsToLocalStorage,
    data: tags,
    debounceMs: 1000,
    enabled: true,
  })
}
