import React, { useState } from 'react'
import { useWhatsAppSettings } from '../../store/useWhatsAppSettings'
import { useDarkStore } from '../../store/useDarkStore'
import { Icon } from '../Icons'

export default function WhatsAppSettings({ isOpen, onClose }) {
  const { isDark } = useDarkStore()
  const { 
    enabled, 
    toggleEnabled, 
    selectedGroups, 
    addGroup, 
    removeGroup 
  } = useWhatsAppSettings()
  
  const [newName, setNewName] = useState('')
  const [newNumber, setNewNumber] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  if (!isOpen) return null

  const handleAdd = () => {
    if (newName.trim()) {
      addGroup(newName, newNumber)
      setNewName('')
      setNewNumber('')
      setShowAddForm(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[420px] rounded-2xl p-6 shadow-2xl animate-modalIn glass-panel">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold theme-text-primary">
                WhatsApp Sync
              </h3>
              <p className="text-xs theme-text-secondary">
                Auto-add calendar events from groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors theme-icon-btn"
          >
            <Icon name="xMark" className="w-5 h-5" />
          </button>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl mb-4 glass-subtle">
          <div>
            <p className="font-medium theme-text-primary">
              Enable WhatsApp Sync
            </p>
            <p className="text-xs mt-0.5 theme-text-secondary">
              Process messages from selected groups
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              enabled ? 'bg-[#25D366]' : isDark ? 'bg-gray-600' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Groups Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium theme-text-primary">
                Selected Groups
              </h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs text-[#25D366] hover:text-[#1da851] font-medium transition-colors"
            >
              {showAddForm ? 'Cancel' : '+ Add Group'}
            </button>
          </div>

          {/* Add Group Form */}
          {showAddForm && (
            <div className="p-4 rounded-xl mb-3 glass-subtle">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1 theme-text-secondary">
                    Group Display Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Family Group"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors theme-control"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 theme-text-secondary">
                    Group Number (optional)
                  </label>
                  <input
                    type="text"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., +91XXXXXXXXXX"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors theme-control"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="w-full py-2 bg-[#25D366] hover:bg-[#1da851] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Add Group
                </button>
              </div>
            </div>
          )}

          {/* Group List */}
          <div className="rounded-xl overflow-hidden glass-subtle">
            {selectedGroups.length === 0 ? (
              <div className="p-6 text-center theme-text-secondary">
                <p className="text-sm">No groups selected</p>
                <p className="text-xs mt-1">Add groups to sync calendar events</p>
              </div>
            ) : (
              selectedGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 border-b border-[color:var(--theme-border)] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center glass-subtle">
                      <svg className="w-4 h-4 theme-text-secondary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium theme-text-primary">
                        {group.name}
                      </p>
                      {group.number && (
                        <p className="text-xs theme-text-secondary">
                          {group.number}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeGroup(group.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-red-500/15 text-red-500"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 rounded-xl text-xs glass-subtle theme-text-secondary">
          <p>• Messages from selected groups will be processed by AI</p>
          <p>• Calendar events will be auto-extracted</p>
          <p>• Messages are not stored after processing</p>
        </div>
      </div>
    </div>
  )
}
