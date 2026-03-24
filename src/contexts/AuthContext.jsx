import React, { createContext, useContext, useEffect, useState } from 'react'
import getSupabaseClient from '../lib/supabase'
import { isAuthRequired } from '../lib/envConfig'
import { registerWithBridge, setBridgeCredentials } from '../api/whatsappClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authEnabled, setAuthEnabled] = useState(isAuthRequired())
  
  const supabase = getSupabaseClient()

  /**
   * Register user with WhatsApp bridge and get API key
   * This ensures every user has bridge credentials
   */
  const ensureBridgeRegistration = async (userId) => {
    try {
      console.log('[Auth] Registering user with WhatsApp bridge:', userId)
      const result = await registerWithBridge(userId)
      console.log('[Auth] Bridge registration successful')
      return result
    } catch (error) {
      console.error('[Auth] Failed to register with bridge:', error.message)
      // Don't throw - bridge connection is optional
      // User can still use calendar without WhatsApp integration
    }
  }

  useEffect(() => {
    // If auth is not required and supabase is not initialized, skip auth
    if (!authEnabled || !supabase) {
      setLoading(false)
      setUser(null)
      setSession(null)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Register with bridge if user is logged in
      if (session?.user) {
        await ensureBridgeRegistration(session.user.id)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Register with bridge when user signs in
      if (session?.user && _event === 'SIGNED_IN') {
        await ensureBridgeRegistration(session.user.id)
      }
      
      // Clear bridge credentials on sign out
      if (_event === 'SIGNED_OUT') {
        setBridgeCredentials(null, null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [authEnabled, supabase])

  const signUp = async (email, password, metadata = {}) => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    
    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (!supabase) return
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email) => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) throw error
    return data
  }

  const updatePassword = async (newPassword) => {
    if (!supabase) throw new Error('Supabase not initialized')
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    
    if (error) throw error
    return data
  }

  const value = {
    user,
    session,
    loading,
    authEnabled,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
