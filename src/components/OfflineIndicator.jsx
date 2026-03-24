import React from 'react'
import { useEventStore } from '../store/useEventStore'

export default function OfflineIndicator() {
  const { isOnline, pendingSync } = useEventStore()

  if (isOnline && pendingSync.length === 0) {
    return null
  }

  const pendingCount = pendingSync.length

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            {!isOnline && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            )}
          </div>
          
          <div>
            {!isOnline ? (
              <p className="text-sm font-medium">
                Database Offline
              </p>
            ) : (
              <p className="text-sm font-medium">
                Syncing changes...
              </p>
            )}
            <p className="text-xs opacity-90">
              {!isOnline 
                ? `Changes saved locally (${pendingCount} pending)` 
                : `${pendingCount} changes syncing`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs opacity-90">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Will sync automatically when online</span>
        </div>
      </div>
    </div>
  )
}
