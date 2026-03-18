import React, { useEffect, useState } from 'react'
import { useEventStore } from '../../store/useEventStore'

const COLORS = [
  { key: 'pink',  bg: '#f0e8f5', label: '🌸' },
  { key: 'green', bg: '#e8f5ee', label: '🌿' },
  { key: 'blue',  bg: '#e8eef5', label: '💧' },
  { key: 'amber', bg: '#f5f0e8', label: '☀️' },
  { key: 'gray',  bg: '#f2f2f2', label: '◻' },
]

const RECURRENCE = ['none', 'daily', 'weekly', 'monthly']

const empty = {
  title: '', date: '', time: '09:00', duration: 60,
  sub: '', color: 'pink', recurrence: 'none', recurrenceEnd: '',
}

export default function EventModal({ isOpen, onClose, editEvent: editTarget, defaultDate, defaultTime }) {
  const { addEvent, editEvent, deleteEvent } = useEventStore()
  const [form, setForm] = useState(empty)
  const [showRecurringPrompt, setShowRecurringPrompt] = useState(false)

  const isEditing = !!editTarget

  useEffect(() => {
    if (!isOpen) return
    if (editTarget) {
      setForm({ ...empty, ...editTarget })
    } else {
      setForm({
        ...empty,
        date: defaultDate || new Date().toISOString().split('T')[0],
        time: defaultTime || '09:00',
      })
    }
  }, [isOpen, editTarget, defaultDate, defaultTime])

  if (!isOpen) return null

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = () => {
    if (!form.title.trim()) return
    if (isEditing) {
      if (editTarget.recurrence && editTarget.recurrence !== 'none') {
        setShowRecurringPrompt(true)
        return
      }
      editEvent(editTarget.id, form)
    } else {
      addEvent(form)
    }
    onClose()
  }

  const handleRecurringChoice = (editAll) => {
    editEvent(editTarget.id, form, editAll)
    setShowRecurringPrompt(false)
    onClose()
  }

  const handleDelete = () => {
    if (editTarget) deleteEvent(editTarget.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-[#1f1d30] rounded-2xl p-6 w-[400px] shadow-2xl animate-modalIn">
        {showRecurringPrompt ? (
          <>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Edit recurring event</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This is a recurring event. What would you like to edit?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleRecurringChoice(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
                This event only
              </button>
              <button onClick={() => handleRecurringChoice(true)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left">
                All future occurrences
              </button>
              <button onClick={() => setShowRecurringPrompt(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {isEditing ? 'Edit Event' : 'Add Event'}
            </h3>

            {/* Title */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Title</label>
              <input
                autoFocus
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-[#252340] rounded-xl px-3 py-2 text-[13.5px] text-gray-800 dark:text-gray-200 outline-none focus:border-accent transition-colors font-sans"
                placeholder="Event title…"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            {/* Date + Time */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
                <input type="date"
                  className="w-full border border-gray-200 dark:border-white/10 dark:bg-[#252340] rounded-xl px-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:border-accent transition-colors font-sans"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Time</label>
                <input type="time"
                  className="w-full border border-gray-200 dark:border-white/10 dark:bg-[#252340] rounded-xl px-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:border-accent transition-colors font-sans"
                  value={form.time}
                  onChange={(e) => set('time', e.target.value)}
                />
              </div>
            </div>

            {/* Duration + Sub */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Duration (min)</label>
                <input type="number"
                  className="w-full border border-gray-200 dark:border-white/10 dark:bg-[#252340] rounded-xl px-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:border-accent transition-colors font-sans"
                  value={form.duration} min={15} step={15}
                  onChange={(e) => set('duration', parseInt(e.target.value) || 60)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Location</label>
                <input
                  className="w-full border border-gray-200 dark:border-white/10 dark:bg-[#252340] rounded-xl px-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:border-accent transition-colors font-sans"
                  placeholder="e.g. Zoom, Office…"
                  value={form.sub}
                  onChange={(e) => set('sub', e.target.value)}
                />
              </div>
            </div>

            {/* Recurrence */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Repeats</label>
              <select
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-[#252340] rounded-xl px-3 py-2 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-accent transition-colors bg-white font-sans"
                value={form.recurrence}
                onChange={(e) => set('recurrence', e.target.value)}
              >
                {RECURRENCE.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => set('color', c.key)}
                    style={{ background: c.bg }}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all hover:scale-110 ${form.color === c.key ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 justify-end">
              {isEditing && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-[13px] transition-colors mr-auto"
                >
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-sidebar-deep text-white text-[13px] font-medium hover:bg-sidebar transition-colors"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
