import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import createSupabaseClient from '../utils/supabaseClient'

const SupabaseContext = createContext({
  supabase: null,
  session: null,
  user: null,
  authReady: false,
  authError: null,
  signInWithOtp: async () => {},
  signInAnonymously: async () => {},
  signOut: async () => {},
})

export const SupabaseProvider = ({ children }) => {
  const [supabase] = useState(() => createSupabaseClient())
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return undefined
    }

    let cancelled = false

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setAuthError(error)
        setSession(data?.session ?? null)
        setAuthReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        setAuthError(err)
        setAuthReady(true)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      cancelled = true
      listener?.subscription?.unsubscribe()
    }
  }, [supabase])

  const signInWithOtp = async (email) => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    const trimmed = String(email || '').trim()
    if (!trimmed) throw new Error('Email is required')
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const signInAnonymously = async () => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const value = useMemo(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      authReady,
      authError,
      signInWithOtp,
      signInAnonymously,
      signOut,
    }),
    [supabase, session, authReady, authError]
  )

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

export const useSupabase = () => useContext(SupabaseContext)

export default SupabaseProvider
