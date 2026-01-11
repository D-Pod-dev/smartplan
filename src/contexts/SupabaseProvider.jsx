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
  signInWithCode: async () => {},
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

  const generateSignInCode = () => {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const signInAnonymously = async () => {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    
    // Generate and store a sign-in code in user metadata
    const signInCode = generateSignInCode()
    const { error: updateError } = await supabase.auth.updateUser({
      data: { sign_in_code: signInCode }
    })
    if (updateError) {
      console.warn('Could not store sign-in code:', updateError)
    }
  }

  const signInWithCode = async (code) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const trimmed = String(code || '').trim().toUpperCase()
    if (!trimmed) throw new Error('Code is required')
    if (trimmed.length !== 6) throw new Error('Code must be 6 characters')
    
    try {
      // Call the RPC function to look up the user by code
      const { data, error: lookupError } = await supabase.rpc('lookup_user_by_sign_in_code', {
        code: trimmed
      })
      
      if (lookupError || !data) {
        throw new Error('Invalid or expired sign-in code')
      }
      
      // Create a new anonymous session
      const { error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError) throw anonError
      
      // Store the target user_id in metadata
      await supabase.auth.updateUser({ 
        data: { 
          linked_user_id: data,
          sign_in_code: trimmed 
        } 
      })
      
    } catch (err) {
      throw new Error(err?.message || 'Unable to verify sign-in code')
    }
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
      signInWithCode,
      signOut,
    }),
    [supabase, session, authReady, authError]
  )

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

export const useSupabase = () => useContext(SupabaseContext)

export default SupabaseProvider
