import { create } from 'zustand'

const DEFAULT_SETTINGS = {
  accentColor: '#3b82f6',
  themePreset: 'royal',
  fontSize: 'medium',
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
  blurEnabled: true,        // User preference toggle for blur effects
  blurOverride: null,       // Manual override: null (auto) | 'none' | 'reduced' | 'full'
  dragDropEnabled: true,    // Enable/disable drag and drop for event rescheduling
}

export const useSettingsStore = create((set, get) => ({
      ...DEFAULT_SETTINGS,
      hasUnsavedChanges: false,
      isLoaded: false,
      savingKeys: {},
      supabase: null,
      userId: null,
      realtimeSubscription: null,
      deviceBlurLevel: 'full',  // Auto-detected device capability: 'none' | 'reduced' | 'full'

      updateSetting: (key, value) => {
        const { supabase, userId } = get()
        set({ [key]: value })

        if (supabase && userId) {
          const settings = { ...get(), [key]: value }
          delete settings.hasUnsavedChanges
          delete settings.isLoaded
          delete settings.savingKeys
          delete settings.supabase
          delete settings.userId

          set((state) => ({
            savingKeys: {
              ...state.savingKeys,
              [key]: true,
            },
          }))

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
            .finally(() => {
              set((state) => ({
                savingKeys: {
                  ...state.savingKeys,
                  [key]: false,
                },
              }))
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
          delete settings.savingKeys
          delete settings.supabase
          delete settings.userId

          set((state) => {
            const nextSavingKeys = { ...state.savingKeys }
            Object.keys(updates).forEach((key) => {
              nextSavingKeys[key] = true
            })
            return { savingKeys: nextSavingKeys }
          })

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
            .finally(() => {
              set((state) => {
                const nextSavingKeys = { ...state.savingKeys }
                Object.keys(updates).forEach((key) => {
                  nextSavingKeys[key] = false
                })
                return { savingKeys: nextSavingKeys }
              })
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

        const { realtimeSubscription } = get()
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe()
        }

        const channelName = `settings_changes_${userId}_${Date.now()}`

        const subscription = supabase
          .channel(channelName)
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

        set({ realtimeSubscription: subscription })
        return subscription
      },

      unsubscribeFromSettings: (subscription) => {
        const activeSub = subscription || get().realtimeSubscription
        if (!activeSub) return
        activeSub.unsubscribe()
        set({ realtimeSubscription: null })
        console.log('[Settings] Unsubscribed from settings')
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

      /**
       * Initialize blur settings based on detected device capability
       * @param {string} detectedLevel - 'none' | 'reduced' | 'full'
       */
      initializeBlurSettings: (detectedLevel) => {
        set({ deviceBlurLevel: detectedLevel })
        console.log('[Settings] Device blur level set to:', detectedLevel)
      },

      /**
       * Get the effective blur level considering user preferences and device capability
       * @returns {string} 'none' | 'reduced' | 'full'
       */
      getEffectiveBlurLevel: () => {
        const { blurEnabled, blurOverride, deviceBlurLevel } = get()
        
        // If blur is disabled by user, return 'none'
        if (!blurEnabled) return 'none'
        
        // If user has set a manual override, use that
        if (blurOverride) return blurOverride
        
        // Otherwise use auto-detected level
        return deviceBlurLevel
      },

      validate: () => {
        return { valid: true, errors: {} }
      },
    })
)
