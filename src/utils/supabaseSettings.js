const TABLE = 'user_settings'

export const fetchSettingsForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('settings')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No settings found, return empty object
      return {}
    }
    throw error
  }
  
  return data?.settings || {}
}

export const saveSettingsForUser = async (supabase, userId, settings) => {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  
  if (error) throw error
}

export const updateSettingsForUser = async (supabase, userId, partialSettings) => {
  // Fetch existing settings first
  const existingSettings = await fetchSettingsForUser(supabase, userId)
  
  // Merge with new settings
  const mergedSettings = { ...existingSettings, ...partialSettings }
  
  // Save merged settings
  await saveSettingsForUser(supabase, userId, mergedSettings)
}
