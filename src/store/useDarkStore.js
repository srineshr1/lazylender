import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDarkStore = create(
  persist(
    (set) => ({
      isDark: true,
      toggle: () => set((s) => ({ isDark: !s.isDark })),
    }),
    { name: 'cal_dark' }
  )
)