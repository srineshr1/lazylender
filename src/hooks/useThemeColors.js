import { useMemo } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { useDarkStore } from '../store/useDarkStore'

/**
 * Theme preset definitions for event colors
 * Matches the presets in App.jsx
 */
const THEME_PRESETS = {
  royal: {
    light: {
      pink: { bg: '#f8e9f0', border: '#cc6b95', text: '#4f2238' },
      green: { bg: '#e8f4ec', border: '#47906b', text: '#1d4b35' },
      blue: { bg: '#e8edf8', border: '#4f72c7', text: '#1f3569' },
      amber: { bg: '#f8f0e2', border: '#b9853f', text: '#5b3a12' },
      gray: { bg: '#ececf0', border: '#7e8093', text: '#2a2c34' },
    },
    dark: {
      pink: { bg: '#3f2733', border: '#d18daf', text: '#ffe7f1' },
      green: { bg: '#1f3a30', border: '#66b18a', text: '#d8ffec' },
      blue: { bg: '#1e2f4d', border: '#7ca2f0', text: '#deebff' },
      amber: { bg: '#41321d', border: '#d3a866', text: '#ffefd9' },
      gray: { bg: '#2a2b35', border: '#a5a8bd', text: '#f0f2ff' },
    },
  },
  emerald: {
    light: {
      pink: { bg: '#f8ecef', border: '#c57f92', text: '#4f2a34' },
      green: { bg: '#e5f6ec', border: '#3f9968', text: '#165035' },
      blue: { bg: '#e6f1f7', border: '#4f88b7', text: '#17384f' },
      amber: { bg: '#f7f2df', border: '#b79344', text: '#564312' },
      gray: { bg: '#edf1ec', border: '#7b8a7d', text: '#2a332d' },
    },
    dark: {
      pink: { bg: '#3f2831', border: '#cb8a9e', text: '#ffe7ee' },
      green: { bg: '#1f3f32', border: '#6fca9d', text: '#ddffee' },
      blue: { bg: '#1d3742', border: '#79b2d6', text: '#d9f2ff' },
      amber: { bg: '#40361f', border: '#d6b477', text: '#fff1d8' },
      gray: { bg: '#2a3630', border: '#a0b4a8', text: '#ecfff2' },
    },
  },
  rose: {
    light: {
      pink: { bg: '#fde9f0', border: '#c9668f', text: '#5c223a' },
      green: { bg: '#edf5ef', border: '#5a8f6b', text: '#224731' },
      blue: { bg: '#eceff8', border: '#667fbe', text: '#28365f' },
      amber: { bg: '#f9efdf', border: '#bf8a3e', text: '#633d10' },
      gray: { bg: '#f1ecee', border: '#93808a', text: '#362c31' },
    },
    dark: {
      pink: { bg: '#4b2737', border: '#e18db0', text: '#ffe6f0' },
      green: { bg: '#263830', border: '#84bf9b', text: '#e1fff0' },
      blue: { bg: '#293246', border: '#94aee8', text: '#e7eeff' },
      amber: { bg: '#453222', border: '#d5a569', text: '#ffefd9' },
      gray: { bg: '#3a2f36', border: '#b6a2aa', text: '#fff0f5' },
    },
  },
  ocean: {
    light: {
      pink: { bg: '#f8eaf0', border: '#c47d98', text: '#4d2a3a' },
      green: { bg: '#e8f3ef', border: '#4d9178', text: '#1e4a3a' },
      blue: { bg: '#e4f2f8', border: '#4e8eb5', text: '#1a4358' },
      amber: { bg: '#f7f1e1', border: '#ba9544', text: '#56420f' },
      gray: { bg: '#e8eef2', border: '#748b99', text: '#25323b' },
    },
    dark: {
      pink: { bg: '#412a35', border: '#cf8aa4', text: '#ffe8f1' },
      green: { bg: '#1f3a34', border: '#71b79f', text: '#dcfff2' },
      blue: { bg: '#1f3c4a', border: '#7bc4e7', text: '#def4ff' },
      amber: { bg: '#3d3523', border: '#d5b274', text: '#fff0da' },
      gray: { bg: '#2a3942', border: '#9eb8c7', text: '#edf8ff' },
    },
  },
}

const COLOR_KEYS = ['pink', 'green', 'blue', 'amber', 'gray']
const DEFAULT_KEY = 'gray'

/**
 * Hook that provides reactive event colors based on current theme
 * Colors update automatically when theme preset or dark mode changes
 */
export function useThemeColors() {
  const themePreset = useSettingsStore((s) => s.themePreset)
  const isDark = useDarkStore((s) => s.isDark)

  const eventColors = useMemo(() => {
    const preset = THEME_PRESETS[themePreset] || THEME_PRESETS.royal
    const palette = isDark ? preset.dark : preset.light
    return palette
  }, [themePreset, isDark])

  /**
   * Get full color scheme for an event color key
   * @param {string} color - Event color (pink, green, blue, amber, gray)
   * @returns {{ bg: string, border: string, text: string }}
   */
  const getEventColor = useMemo(() => {
    return (color) => {
      const key = COLOR_KEYS.includes(color) ? color : DEFAULT_KEY
      return eventColors[key]
    }
  }, [eventColors])

  /**
   * Get specific tone (bg, border, or text) for an event color
   * @param {string} color - Event color
   * @param {'bg' | 'border' | 'text'} part - Which part of the color scheme
   * @returns {string}
   */
  const getEventTone = useMemo(() => {
    return (color, part) => {
      const key = COLOR_KEYS.includes(color) ? color : DEFAULT_KEY
      return eventColors[key]?.[part] || ''
    }
  }, [eventColors])

  /**
   * Get border color for event dots (used in MonthView, DayPreviewPopup)
   * @param {string} color - Event color
   * @returns {string}
   */
  const getEventDotColor = useMemo(() => {
    return (color) => {
      const key = COLOR_KEYS.includes(color) ? color : 'blue'
      return eventColors[key]?.border || '#4f72c7'
    }
  }, [eventColors])

  return {
    eventColors,
    getEventColor,
    getEventTone,
    getEventDotColor,
    themePreset,
    isDark,
  }
}
