/**
 * Environment Configuration Validator
 * Ensures required environment variables are present and valid
 */

const isDev = import.meta.env.DEV

// Check if authentication is required
export const isAuthRequired = () => {
  // In production, auth is always required
  if (!isDev) return true
  
  // In dev, check the VITE_REQUIRE_AUTH flag
  return import.meta.env.VITE_REQUIRE_AUTH === 'true'
}

// Validate Supabase configuration
export const validateSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  // Only validate if auth is required
  if (!isAuthRequired()) {
    return { url, key, valid: true }
  }
  
  if (!url || url === 'your_supabase_project_url') {
    throw new Error(
      'Missing VITE_SUPABASE_URL. Please add it to your .env file. ' +
      'Get this from your Supabase project settings at https://app.supabase.com'
    )
  }
  
  if (!key || key === 'your_supabase_anon_key') {
    throw new Error(
      'Missing VITE_SUPABASE_ANON_KEY. Please add it to your .env file. ' +
      'Get this from your Supabase project settings at https://app.supabase.com'
    )
  }
  
  return { url, key, valid: true }
}

// Get all environment configuration
export const getEnvConfig = () => {
  const config = {
    isDev,
    isAuthRequired: isAuthRequired(),
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    ollama: {
      url: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
    },
    bridge: {
      url: import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001',
      pollInterval: parseInt(import.meta.env.VITE_POLL_INTERVAL || '3000', 10),
    },
  }
  
  return config
}

// Log environment info (dev only)
if (isDev) {
  console.log('[EnvConfig] Environment:', {
    mode: isDev ? 'development' : 'production',
    authRequired: isAuthRequired(),
    hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  })
}
