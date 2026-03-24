import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkStore } from '../store/useDarkStore'
import getSupabaseClient from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { isDark } = useDarkStore()
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseClient()
      
      if (!supabase) {
        setError('Supabase not initialized')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError(error.message)
          setTimeout(() => navigate('/login', { replace: true }), 3000)
        } else if (data.session) {
          navigate('/', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError(err.message)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-sidebar-deep' : 'bg-gray-50'}`}>
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <p className="text-red-500 text-lg mb-2">Authentication Failed</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {error}
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Completing sign in...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
