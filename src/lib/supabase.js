import { createClient } from '@supabase/supabase-js'
import { validateSupabaseConfig, isAuthRequired } from './envConfig'

let supabase = null

/**
 * Get or create the Supabase client singleton
 * Returns null if auth is not required and credentials are missing
 */
export const getSupabaseClient = () => {
  // If client already exists, return it
  if (supabase) return supabase
  
  try {
    const { url, key } = validateSupabaseConfig()
    
    if (!url || !key) {
      if (!isAuthRequired()) {
        console.warn('[Supabase] Running in dev mode without authentication')
        return null
      }
      throw new Error('Supabase credentials missing')
    }
    
    supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'ai-calendar-auth',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
    
    console.log('[Supabase] Client initialized')
    return supabase
    
  } catch (error) {
    console.error('[Supabase] Initialization failed:', error.message)
    
    // If auth is required, throw the error
    if (isAuthRequired()) {
      throw error
    }
    
    // Otherwise, warn and return null (dev mode)
    console.warn('[Supabase] Running in dev mode without authentication')
    return null
  }
}

// Export the client getter as default
export default getSupabaseClient
