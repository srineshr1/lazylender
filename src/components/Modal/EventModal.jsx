import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useEventStore } from '../../store/useEventStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { validateEvent, sanitizeString } from '../../lib/validation'
import { createFocusTrap, KEYS, announce } from '../../lib/accessibility'
import LoadingSpinner from '../LoadingSpinner'

const COLORS = [
  { key: 'pink',  bg: '#dba8ef', border: '#c992e0', label: 'Pink' },
  { key: 'green', bg: '#86d9a8', border: '#6bc48e', label: 'Green' },
  { key: 'blue',  bg: '#90bbec', border: '#70a6db', label: 'Blue' },
  { key: 'amber', bg: '#ecc96a', border: '#ddb84d', label: 'Amber' },
  { key: 'gray',  bg: '#a0a0a0', border: '#888888', label: 'Gray' },
]

const RECURRENCE = ['none', 'daily', 'weekly', 'monthly']

export default function EventModal({ isOpen, onClose, editEvent: editTarget, defaultDate, defaultTime }) {
  const { addEvent, editEvent, deleteEvent, isLoading } = useEventStore()
  const { defaultEventDuration, defaultEventColor } = useSettingsStore()
  const [form, setForm] = useState({
    title: '', date: '', time: '09:00', 
    duration: defaultEventDuration || 60,
    sub: '', color: defaultEventColor || 'blue', 
    recurrence: 'none', recurrenceEnd: ''
  })
  const [showRecurringPrompt, setShowRecurringPrompt] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [selectedColorIndex, setSelectedColorIndex] = useState(2) // Default to blue
  
  const modalRef = useRef(null)
  const titleInputRef = useRef(null)
  const previousFocusRef = useRef(null)

  const isEditing = !!editTarget

  // Store previous focus and set up focus trap
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      
      // Focus title input after modal animation
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 50)
      
      // Create focus trap
      const cleanup = createFocusTrap(modalRef.current)
      
      return () => {
        clearTimeout(timer)
        cleanup()
      }
    } else {
      // Restore focus when modal closes
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e) => {
      if (e.key === KEYS.ESCAPE && !isSaving) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isSaving])

  // Handle color selection with keyboard
  const handleColorKeyDown = useCallback((e, index) => {
    if (e.key === KEYS.ARROW_LEFT || e.key === KEYS.ARROW_RIGHT) {
      e.preventDefault()
      const newIndex = e.key === KEYS.ARROW_LEFT
        ? (index - 1 + COLORS.length) % COLORS.length
        : (index + 1) % COLORS.length
      setSelectedColorIndex(newIndex)
      setForm(f => ({ ...f, color: COLORS[newIndex].key }))
      // Focus the new color button
      const buttons = modalRef.current?.querySelectorAll('[data-color-button]')
      buttons?.[newIndex]?.focus()
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    // Clear validation errors when modal opens
    setValidationErrors({})
    if (editTarget) {
      setForm({ ...editTarget })
      const colorIndex = COLORS.findIndex(c => c.key === editTarget.color)
      setSelectedColorIndex(colorIndex >= 0 ? colorIndex : 2)
    } else {
      // Use default values from settings for new events
      setForm({
        title: '',
        date: defaultDate || new Date().toISOString().split('T')[0],
        time: defaultTime || '09:00',
        duration: defaultEventDuration || 60,
        sub: '',
        color: defaultEventColor || 'blue',
        recurrence: 'none',
        recurrenceEnd: '',
      })
      const colorIndex = COLORS.findIndex(c => c.key === (defaultEventColor || 'blue'))
      setSelectedColorIndex(colorIndex >= 0 ? colorIndex : 2)
    }
  }, [isOpen, editTarget, defaultDate, defaultTime, defaultEventDuration, defaultEventColor])

  if (!isOpen) return null

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }))
    // Clear validation error for this field when user starts typing
    if (validationErrors[key]) {
      setValidationErrors((errors) => {
        const newErrors = { ...errors }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  // Sanitize title/sub on input change for immediate feedback
  const handleInputChange = (key, value) => {
    const sanitizedValue = (key === 'title' || key === 'sub') 
      ? sanitizeString(value) 
      : value
    set(key, sanitizedValue)
  }

  const handleSave = async () => {
    // Clear previous errors
    setValidationErrors({})
    setIsSaving(true)
    
    try {
      // Sanitize user inputs before validation
      const sanitizedForm = {
        ...form,
        title: sanitizeString(form.title),
        sub: sanitizeString(form.sub),
      }
      
      // Validate the form
      const validation = validateEvent(sanitizedForm)
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        setIsSaving(false)
        // Announce validation errors to screen readers
        const errorMessages = Object.values(validation.errors).join('. ')
        announce(`Validation error: ${errorMessages}`, 'assertive')
        return
      }

      // Handle recurring event editing
      if (isEditing) {
        if (editTarget.recurrence && editTarget.recurrence !== 'none') {
          setShowRecurringPrompt(true)
          setIsSaving(false)
          return
        }
        editEvent(editTarget.id, sanitizedForm)
        announce('Event updated successfully', 'polite')
      } else {
        addEvent(sanitizedForm)
        announce('Event created successfully', 'polite')
      }
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      setIsSaving(false)
      onClose()
    } catch (error) {
      setValidationErrors({ general: error.message || 'Failed to save event' })
      setIsSaving(false)
      announce(`Error: ${error.message || 'Failed to save event'}`, 'assertive')
    }
  }

  const handleRecurringChoice = async (editAll) => {
    setIsSaving(true)
    try {
      editEvent(editTarget.id, form, editAll)
      await new Promise(resolve => setTimeout(resolve, 300))
      setShowRecurringPrompt(false)
      setIsSaving(false)
      announce(editAll ? 'All occurrences updated' : 'This occurrence updated', 'polite')
      onClose()
    } catch (error) {
      setValidationErrors({ general: error.message || 'Failed to save event' })
      setIsSaving(false)
      announce(`Error: ${error.message || 'Failed to save event'}`, 'assertive')
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    try {
      if (editTarget) deleteEvent(editTarget.id)
      await new Promise(resolve => setTimeout(resolve, 300))
      setIsSaving(false)
      announce('Event deleted', 'polite')
      onClose()
    } catch (error) {
      setValidationErrors({ general: error.message || 'Failed to delete event' })
      setIsSaving(false)
      announce(`Error: ${error.message || 'Failed to delete event'}`, 'assertive')
    }
  }

  const modalTitle = isEditing ? 'Edit Event' : 'Add Event'
  const modalTitleId = 'event-modal-title'

  return (
    <div
      className="fixed inset-0 glass-backdrop z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div 
        ref={modalRef}
        className="rounded-2xl p-6 w-[420px] max-h-[90vh] overflow-y-auto shadow-2xl animate-modalIn glass-panel glass-modal"
        role="document"
      >
        {showRecurringPrompt ? (
          <>
            <h3 id={modalTitleId} className="text-base font-semibold theme-text-primary mb-2">Edit recurring event</h3>
            <p className="text-sm theme-text-secondary mb-5">This is a recurring event. What would you like to edit?</p>
            {validationErrors.general && (
              <p className="text-xs text-red-500 mb-3 text-center" role="alert">{validationErrors.general}</p>
            )}
            <div className="flex flex-col gap-2" role="group" aria-label="Edit options">
              <button 
                onClick={() => handleRecurringChoice(false)}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border theme-control text-sm theme-text-primary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSaving && <LoadingSpinner size="sm" />}
                This event only
              </button>
              <button 
                onClick={() => handleRecurringChoice(true)}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border theme-control text-sm theme-text-primary transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSaving && <LoadingSpinner size="sm" />}
                All future occurrences
              </button>
              <button 
                onClick={() => setShowRecurringPrompt(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm theme-text-secondary theme-hover-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 id={modalTitleId} className="text-lg font-bold theme-text-primary mb-5">
              {modalTitle}
            </h3>

            {/* Title */}
            <div className="mb-4">
              <label htmlFor="event-title" className="block text-sm font-semibold theme-text-primary mb-2">Title</label>
              <input
                ref={titleInputRef}
                id="event-title"
                type="text"
                className={`w-full glass-field ${validationErrors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} rounded-xl px-4 py-3 text-sm outline-none transition-all font-sans theme-text-primary`}
                placeholder="Event title…"
                value={form.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                aria-required="true"
                aria-invalid={!!validationErrors.title}
                aria-describedby={validationErrors.title ? 'title-error' : undefined}
              />
              {validationErrors.title && (
                <p id="title-error" className="text-xs text-red-500 mt-1.5" role="alert">{validationErrors.title}</p>
              )}
            </div>

            {/* Date + Time */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label htmlFor="event-date" className="block text-sm font-semibold theme-text-primary mb-2">Date</label>
                <input 
                  type="date"
                  id="event-date"
                  className={`w-full glass-field ${validationErrors.date ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} rounded-xl px-4 py-3 text-sm outline-none transition-all font-sans theme-text-primary`}
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!validationErrors.date}
                  aria-describedby={validationErrors.date ? 'date-error' : undefined}
                />
                {validationErrors.date && (
                  <p id="date-error" className="text-xs text-red-500 mt-1.5" role="alert">{validationErrors.date}</p>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="event-time" className="block text-sm font-semibold theme-text-primary mb-2">Time</label>
                <input 
                  type="time"
                  id="event-time"
                  className={`w-full glass-field ${validationErrors.time ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} rounded-xl px-4 py-3 text-sm outline-none transition-all font-sans theme-text-primary`}
                  value={form.time}
                  onChange={(e) => set('time', e.target.value)}
                  aria-required="true"
                  aria-invalid={!!validationErrors.time}
                  aria-describedby={validationErrors.time ? 'time-error' : undefined}
                />
                {validationErrors.time && (
                  <p id="time-error" className="text-xs text-red-500 mt-1.5" role="alert">{validationErrors.time}</p>
                )}
              </div>
            </div>

            {/* Duration + Sub */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label htmlFor="event-duration" className="block text-sm font-semibold theme-text-primary mb-2">Duration (min)</label>
                <input 
                  type="number"
                  id="event-duration"
                  className={`w-full glass-field ${validationErrors.duration ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} rounded-xl px-4 py-3 text-sm outline-none transition-all font-sans theme-text-primary`}
                  value={form.duration} 
                  min={15} 
                  step={15}
                  onChange={(e) => set('duration', parseInt(e.target.value) || 60)}
                  aria-describedby={validationErrors.duration ? 'duration-error' : undefined}
                />
                {validationErrors.duration && (
                  <p id="duration-error" className="text-xs text-red-500 mt-1.5" role="alert">{validationErrors.duration}</p>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="event-location" className="block text-sm font-semibold theme-text-primary mb-2">Location</label>
                <input
                  id="event-location"
                  type="text"
                  className="w-full glass-field rounded-xl px-4 py-3 text-sm outline-none transition-all font-sans theme-text-primary"
                  placeholder="e.g. Zoom, Office…"
                  value={form.sub}
                  onChange={(e) => handleInputChange('sub', e.target.value)}
                />
              </div>
            </div>

            {/* Recurrence */}
            <div className="mb-5">
              <label htmlFor="event-recurrence" className="block text-sm font-semibold theme-text-primary mb-2">Repeats</label>
              <select
                id="event-recurrence"
                className={`w-full glass-field ${validationErrors.recurrence ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} rounded-xl px-4 py-3 text-sm outline-none transition-all font-sans theme-text-primary`}
                value={form.recurrence}
                onChange={(e) => set('recurrence', e.target.value)}
              >
                {RECURRENCE.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              {validationErrors.recurrence && (
                <p className="text-xs text-red-500 mt-1.5" role="alert">{validationErrors.recurrence}</p>
              )}
            </div>

            {/* Color */}
            <div className="mb-6">
              <span id="color-label" className="block text-sm font-semibold theme-text-primary mb-2.5">Color</span>
              <div 
                className="flex gap-3" 
                role="radiogroup" 
                aria-labelledby="color-label"
              >
                {COLORS.map((c, index) => (
                  <button
                    key={c.key}
                    data-color-button
                    onClick={() => {
                      set('color', c.key)
                      setSelectedColorIndex(index)
                    }}
                    onKeyDown={(e) => handleColorKeyDown(e, index)}
                    style={{ 
                      background: c.bg,
                      borderColor: form.color === c.key ? 'var(--color-accent)' : c.border
                    }}
                    className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg ${form.color === c.key ? 'ring-4 ring-accent/20 shadow-lg scale-105' : ''}`}
                    role="radio"
                    aria-checked={form.color === c.key}
                    aria-label={c.label}
                    tabIndex={form.color === c.key ? 0 : -1}
                  >
                    {form.color === c.key && (
                      <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="sr-only">{c.label}</span>
                  </button>
                ))}
              </div>
              {validationErrors.color && (
                <p className="text-xs text-red-500 mt-1.5" role="alert">{validationErrors.color}</p>
              )}
            </div>

            {/* Buttons */}
            {validationErrors.general && (
              <p className="text-xs text-red-500 mb-3 text-center" role="alert">{validationErrors.general}</p>
            )}
            <div className="flex items-center gap-3 justify-end pt-2">
              {isEditing && (
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-sm font-medium transition-all mr-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  aria-label="Delete event"
                >
                  {isSaving ? <LoadingSpinner size="sm" /> : 'Delete'}
                </button>
              )}
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border theme-control theme-text-primary text-sm font-medium transition-all hover:bg-[color:var(--theme-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <LoadingSpinner size="sm" />}
                {isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
