import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDarkStore } from '../store/useDarkStore'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { resetPassword } = useAuth()
  const { isDark } = useDarkStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
      console.error('Password reset error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-sidebar-deep' : 'bg-gray-50'} px-4`}>
      <div className={`max-w-md w-full space-y-8 p-8 rounded-lg ${isDark ? 'bg-[#1a1a2e]' : 'bg-white'} shadow-lg`}>
        <div>
          <h2 className={`text-center text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reset your password
          </h2>
          <p className={`mt-2 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-accent hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/40 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700/40 text-green-400 px-4 py-3 rounded">
            <p className="font-medium">Check your email!</p>
            <p className="text-sm mt-1">
              We've sent you a password reset link. Click the link in the email to reset your password.
            </p>
          </div>
        )}

        {!success && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent sm:text-sm ${
                  isDark
                    ? 'bg-sidebar-deep border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="you@example.com"
              />
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {success && (
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-accent hover:opacity-80"
            >
              Return to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
