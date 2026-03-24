import { create } from 'zustand'

const DEFAULT_SETTINGS = {
  accentColor: '#3b82f6',
  compactMode: false,
  showWeekends: true,
  defaultView: 'week',
  defaultEventDuration: 60,
  defaultEventColor: 'blue',
  awakeStart: 6,
  awakeEnd: 24,
  showPastEvents: true,
  notificationsEnabled: true,
  reminderTime: 15,
  whatsappPollInterval: 30,
  whatsappAutoAdd: true,
}

export const useSettingsStore = create((set, get) => ({
      ...DEFAULT_SETTINGS,
      hasUnsavedChanges: false,
      isLoaded: false,
      supabase: null,
      userId: null,

      updateSetting: (key, value) => {
        const { supabase, userId } = get()
        set({ [key]: value })

        if (supabase && userId) {
          const settings = { ...get(), [key]: value }
          delete settings.hasUnsavedChanges
          delete settings.isLoaded
          delete settings.supabase
          delete settings.userId

          supabase
            .from('profiles')
            .update({ settings })
            .eq('id', userId)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to sync setting to Supabase:', error)
              } else {
                console.log('[Settings] Setting synced:', key)
              }
            })
        }
      },

      updateMultiple: (updates) => {
        const { supabase, userId } = get()
        set(updates)

        if (supabase && userId) {
          const settings = { ...get(), ...updates }
          delete settings.hasUnsavedChanges
          delete settings.isLoaded
          delete settings.supabase
          delete settings.userId

          supabase
            .from('profiles')
            .update({ settings })
            .eq('id', userId)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to sync settings to Supabase:', error)
              } else {
                console.log('[Settings] Multiple settings synced')
              }
            })
        }
      },

      initializeSettings: async (supabase, userId) => {
        if (!supabase || !userId) return

        set({ supabase, userId })

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', userId)
            .single()

          if (error) throw error

          if (data && data.settings) {
            set({ ...DEFAULT_SETTINGS, ...data.settings, isLoaded: true, supabase, userId })
            console.log('[Settings] Loaded from Supabase')
          } else {
            set({ isLoaded: true })
          }
        } catch (error) {
          console.error('Failed to load settings from Supabase:', error)
          set({ isLoaded: true })
        }
      },

      subscribeToSettings: (supabase, userId) => {
        if (!supabase || !userId) return

        const subscription = supabase
          .channel('settings_changes')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          }, (payload) => {
            console.log('[Settings] Real-time update received')
            const newSettings = payload.new.settings
            if (newSettings) {
              set({ ...DEFAULT_SETTINGS, ...newSettings })
              console.log('✅ Settings synced from other device')
            }
          })
          .subscribe((status) => {
            console.log('[Settings] Subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time settings subscription active')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Settings subscription failed')
            }
          })

        return subscription
      },

      unsubscribeFromSettings: (subscription) => {
        if (subscription) {
          subscription.unsubscribe()
          console.log('[Settings] Unsubscribed from settings')
        }
      },

      saveChanges: () => {
        set({ hasUnsavedChanges: false })
      },

      discardChanges: () => {
        // Reload from Supabase instead of localStorage
        const { supabase, userId } = get()
        if (supabase && userId) {
          get().initializeSettings(supabase, userId)
        }
      },

      resetToDefaults: () => {
        const { supabase, userId } = get()
        set(DEFAULT_SETTINGS)

        if (supabase && userId) {
          supabase
            .from('profiles')
            .update({ settings: DEFAULT_SETTINGS })
            .eq('id', userId)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to reset settings in Supabase:', error)
              } else {
                console.log('[Settings] Reset to defaults')
              }
            })
        }
      },

      validate: () => {
        return { valid: true, errors: {} }
      },
    })
)
