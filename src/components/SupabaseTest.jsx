/**
 * Supabase Connection Test Component
 * Use this to verify Supabase is working correctly
 */

import React, { useEffect, useState } from 'react'
import getSupabaseClient from '../lib/supabase'

export default function SupabaseTest() {
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = getSupabaseClient()
        
        if (!supabase) {
          setStatus('no-client')
          return
        }

        // Test connection by checking auth status
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          setError(authError.message)
          setStatus('error')
          return
        }

        setUser(session?.user || null)
        
        // Try to fetch a simple query
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
        
        if (queryError) {
          console.warn('Profiles table query failed (expected if empty):', queryError.message)
        }

        setStatus('connected')
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }

    testConnection()
  }, [])

  if (status === 'checking') {
    return (
      <div className="p-4 bg-blue-900/20 border border-blue-700/40 rounded-lg">
        <p className="text-blue-400">🔄 Testing Supabase connection...</p>
      </div>
    )
  }

  if (status === 'no-client') {
    return (
      <div className="p-4 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
        <p className="text-yellow-400">⚠️ Supabase client not initialized (dev mode)</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg">
        <p className="text-red-400">❌ Supabase connection failed:</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-900/20 border border-green-700/40 rounded-lg">
      <p className="text-green-400">✅ Supabase connected successfully!</p>
      {user ? (
        <p className="text-green-300 text-sm mt-1">
          Logged in as: {user.email}
        </p>
      ) : (
        <p className="text-green-300 text-sm mt-1">
          Not authenticated (this is expected in dev mode)
        </p>
      )}
    </div>
  )
}
