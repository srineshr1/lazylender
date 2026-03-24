import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSkeleton } from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading, authEnabled } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-light-bg dark:bg-sidebar-deep">
        <div className="w-full max-w-6xl">
          <div className="mb-6 h-8 w-48 bg-light-card dark:bg-gray-800 rounded animate-pulse" />
          <LoadingSkeleton rows={8} />
        </div>
      </div>
    )
  }

  // If auth is not enabled (dev mode), allow access
  if (!authEnabled) {
    return children
  }

  // If auth is enabled but user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User is authenticated, render the protected content
  return children
}
