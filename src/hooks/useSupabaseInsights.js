import { useSupabaseSync } from './useSupabaseSync'
import { fetchInsightsForUser, saveInsightsForUser } from '../utils/supabaseInsights'
import { loadInsights, saveInsights } from '../utils/insightTracker'

export const useSupabaseInsights = (insights) => {
  return useSupabaseSync({
    fetchFromSupabase: fetchInsightsForUser,
    saveToSupabase: saveInsightsForUser,
    loadFromLocalStorage: loadInsights,
    saveToLocalStorage: saveInsights,
    data: insights,
    debounceMs: 2000,
    enabled: true,
  })
}
