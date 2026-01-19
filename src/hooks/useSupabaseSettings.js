import { useSupabaseSync } from './useSupabaseSync'
import { fetchSettingsForUser, saveSettingsForUser } from '../utils/supabaseSettings'

const SETTINGS_STORAGE_KEY = 'smartplan.settings'

const loadSettingsFromLocalStorage = () => {
  if (typeof localStorage === 'undefined') return {}
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed === 'object') return parsed
    }
  } catch {}
  return {}
}

const saveSettingsToLocalStorage = (settings) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export const useSupabaseSettings = (settings) => {
  return useSupabaseSync({
    fetchFromSupabase: fetchSettingsForUser,
    saveToSupabase: saveSettingsForUser,
    loadFromLocalStorage: loadSettingsFromLocalStorage,
    saveToLocalStorage: saveSettingsToLocalStorage,
    data: settings,
    debounceMs: 1500,
    enabled: true,
  })
}
