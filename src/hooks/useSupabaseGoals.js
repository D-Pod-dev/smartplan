import { useSupabaseSync } from './useSupabaseSync'
import { fetchGoalsForUser, saveGoalsForUser } from '../utils/supabaseGoals'

const GOALS_STORAGE_KEY = 'smartplan.goals'

const loadGoalsFromLocalStorage = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    const saved = localStorage.getItem(GOALS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

const saveGoalsToLocalStorage = (goals) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

export const useSupabaseGoals = (goals) => {
  return useSupabaseSync({
    fetchFromSupabase: fetchGoalsForUser,
    saveToSupabase: saveGoalsForUser,
    loadFromLocalStorage: loadGoalsFromLocalStorage,
    saveToLocalStorage: saveGoalsToLocalStorage,
    data: goals,
    debounceMs: 1000,
    enabled: true,
  })
}
