import { describe, it, expect } from 'vitest'
import { sanitizeString, validateEvent } from '../../src/lib/validation.js'

describe('Security: Input Sanitization', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")')
      expect(sanitizeString('<script src="evil.js"></script>')).toBe('')
    })

    it('should remove onerror handlers', () => {
      expect(sanitizeString('<img src=x onerror=alert(1)>')).toBe('')
      expect(sanitizeString('<div onmouseover="alert(1)">')).toBe('')
    })

    it('should remove javascript: URLs', () => {
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")')
      expect(sanitizeString('JAVASCRIPT:void(0)')).toBe('void(0)')
    })

    it('should remove HTML tags', () => {
      expect(sanitizeString('<h1>Meeting</h1>')).toBe('Meeting')
      expect(sanitizeString('<p>Event at <b>3pm</b></p>')).toBe('Event at 3pm')
    })

    it('should preserve safe text', () => {
      expect(sanitizeString('Team Standup')).toBe('Team Standup')
      expect(sanitizeString('Lunch with John & Jane')).toBe('Lunch with John & Jane')
    })

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('')
      expect(sanitizeString(null)).toBe('')
      expect(sanitizeString(undefined)).toBe('')
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  Meeting  ')).toBe('Meeting')
    })
  })

  describe('XSS Prevention in validateEvent', () => {
    it('should reject titles with HTML tags', () => {
      const result = validateEvent({
        title: '<script>alert(1)</script>',
        date: '2026-03-25',
        time: '14:00',
        duration: 60,
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.title).toBe('Title cannot contain HTML tags')
    })

    it('should accept sanitized titles', () => {
      const result = validateEvent({
        title: sanitizeString('<script>alert(1)</script>'),
        date: '2026-03-25',
        time: '14:00',
        duration: 60,
      })
      expect(result.isValid).toBe(true)
    })
  })
})
