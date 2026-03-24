import { create } from 'zustand'

const SYSTEM_MESSAGE = {
  id: 'm0',
  role: 'system',
  text: 'Chat with your calendar. Try: "Add a meeting on Friday at 2pm" or "What do I have tomorrow?"'
}

export const useChatStore = create((set, get) => ({
      messages: [SYSTEM_MESSAGE],
      isTyping: false,
      isOnline: null,
      model: 'llama-3.3-70b-versatile',
      supabase: null,
      userId: null,

      setModel: (model) => set({ model }),
      setOnline: (v) => set({ isOnline: v }),
      setTyping: (v) => set({ isTyping: v }),

      initializeChat: async (supabase, userId) => {
        if (!supabase || !userId) return

        set({ supabase, userId })

        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: true })

          if (error) throw error

          if (data && data.length > 0) {
            const formattedMessages = data.map(msg => ({
              id: msg.id,
              role: msg.role === 'assistant' ? 'ai' : msg.role, // Map 'assistant' back to 'ai' for UI
              text: msg.content,
              timestamp: msg.timestamp
            }))
            set({ messages: [SYSTEM_MESSAGE, ...formattedMessages] })
          }
          
          console.log(`[Chat] Loaded ${data?.length || 0} messages from Supabase`)
        } catch (error) {
          console.error('Failed to load chat from Supabase:', error)
        }
      },

      subscribeToMessages: (supabase, userId) => {
        if (!supabase || !userId) return

        const subscription = supabase
          .channel('chat_messages_changes')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `user_id=eq.${userId}`
          }, (payload) => {
            console.log('[Chat] Real-time message received:', payload.new?.role)
            const newMessage = payload.new
            const formattedMessage = {
              id: newMessage.id,
              role: newMessage.role === 'assistant' ? 'ai' : newMessage.role, // Map 'assistant' back to 'ai' for UI
              text: newMessage.content,
              timestamp: newMessage.timestamp
            }
            
            // Prevent duplicates - only add if message doesn't already exist
            set((s) => {
              const exists = s.messages.some(m => m.id === newMessage.id)
              if (exists) {
                console.log('[Chat] Message already exists, skipping duplicate:', newMessage.id)
                return {} // No state change
              }
              console.log('[Chat] Adding real-time message:', newMessage.id)
              return { messages: [...s.messages, formattedMessage] }
            })
          })
          .subscribe((status) => {
            console.log('[Chat] Subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time chat subscription active')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Chat subscription failed')
            }
          })

        return subscription
      },

      unsubscribeFromMessages: (subscription) => {
        if (subscription) {
          subscription.unsubscribe()
          console.log('[Chat] Unsubscribed from messages')
        }
      },

      addMessage: async (msg) => {
        const { supabase, userId } = get()
        
        // Create temporary ID for optimistic UI update
        const tempId = 'temp_' + Date.now() + Math.random().toString(36).slice(2, 9)
        
        const newMessage = {
          id: tempId,
          ...msg
        }

        // Optimistically add to UI immediately
        set((s) => ({
          messages: [...s.messages, newMessage]
        }))

        // Don't persist system messages to database
        if (supabase && userId && msg.role !== 'system') {
          try {
            // Map 'ai' role to 'assistant' for database compatibility
            const dbRole = msg.role === 'ai' ? 'assistant' : msg.role
            
            const { data, error } = await supabase
              .from('chat_messages')
              .insert([{
                // Don't include 'id' - let Supabase generate UUID
                role: dbRole, // Use 'assistant' instead of 'ai' for database
                content: msg.text,
                timestamp: msg.timestamp || new Date().toISOString(),
                user_id: userId
              }])
              .select()
              .single()

            if (error) throw error

            // Replace temporary ID with database-generated UUID
            console.log('[Chat] Message saved to Supabase with UUID:', data.id)
            set((s) => ({
              messages: s.messages.map(m => 
                m.id === tempId ? { ...m, id: data.id } : m
              )
            }))
          } catch (error) {
            console.error('[Chat] Failed to persist message:', error)
            // Keep the temp ID on error - message is still visible locally
          }
        }
      },

      clearMessages: async () => {
        const { supabase, userId } = get()
        
        set({
          messages: [SYSTEM_MESSAGE]
        })

        if (supabase && userId) {
          try {
            await supabase
              .from('chat_messages')
              .delete()
              .eq('user_id', userId)
            console.log('[Chat] Messages cleared from Supabase')
          } catch (error) {
            console.error('Failed to clear chat in Supabase:', error)
          }
        }
      },
    })
)
