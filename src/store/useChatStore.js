import { create } from 'zustand'

export const useChatStore = create((set) => ({
  messages: [
    { id: 'm0', role: 'system', text: 'Chat with your calendar. Try: "Add a meeting on Friday at 2pm" or "What do I have tomorrow?"' }
  ],
  isTyping: false,
  isOnline: null, // null = unknown, true = connected, false = error
  model: 'llama3',

  setModel: (model) => set({ model }),
  setOnline: (v) => set({ isOnline: v }),
  setTyping: (v) => set({ isTyping: v }),

  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { id: 'm' + Date.now() + Math.random(), ...msg }]
  })),

  clearMessages: () => set({
    messages: [
      { id: 'm0', role: 'system', text: 'Chat with your calendar. Try: "Add a meeting on Friday at 2pm" or "What do I have tomorrow?"' }
    ]
  }),
}))
