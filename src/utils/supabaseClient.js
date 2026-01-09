import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.REACT_APP_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.REACT_APP_SUPABASE_ANON_KEY

export const createSupabaseClient = () => {
  if (!url || !anonKey) return null
  return createClient(url, anonKey)
}

export default createSupabaseClient
