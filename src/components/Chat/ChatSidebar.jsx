import React, { useRef, useEffect, useState, useId } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { useLLM } from './useLLM'

function TypingDots() {
  return (
    <div className="flex gap-1 py-1" role="status" aria-label="AI is typing">
      <span className="w-1.5 h-1.5 rounded-full theme-text-secondary dot-bounce" aria-hidden="true" />
      <span className="w-1.5 h-1.5 rounded-full theme-text-secondary dot-bounce-2" aria-hidden="true" />
      <span className="w-1.5 h-1.5 rounded-full theme-text-secondary dot-bounce-3" aria-hidden="true" />
    </div>
  )
}

function ChatMessage({ msg }) {
  if (msg.role === 'system') {
    return (
      <div 
        className="py-3 border-b border-[color:var(--theme-border)]"
        role="status"
        aria-live="polite"
      >
        <div className="text-center text-xs leading-relaxed theme-text-secondary">
          {msg.text}
        </div>
      </div>
    )
  }
  
  if (msg.role === 'user') {
    return (
      <article 
        className="py-3 border-b border-[color:var(--theme-border)] animate-fadeUp"
        aria-label="Your message"
      >
            <div className="flex flex-col items-end">
          <div className="max-w-[85%] border-l-2 border-accent/40 pl-3">
            <div className="text-[13px] leading-relaxed font-sans theme-text-primary">
              {msg.text}
            </div>
          </div>
        </div>
      </article>
    )
  }
  
  return (
    <article 
      className="py-3 border-b border-[color:var(--theme-border)] animate-fadeUp"
      aria-label="AI response"
    >
      <div className="flex flex-col">
        <div className="text-[9.5px] font-semibold text-accent uppercase tracking-widest mb-1.5" aria-hidden="true">AI</div>
        <div className="text-[13px] leading-relaxed font-sans theme-text-primary" style={{ whiteSpace: 'pre-wrap' }}>
          {msg.text}
        </div>
      </div>
    </article>
  )
}

export default function ChatSidebar({ onClose }) {
  const { messages, isTyping, isOnline } = useChatStore()
  const { send } = useLLM()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const chatRegionId = useId()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    setSending(true)
    await send(text)
    setSending(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleTextarea = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const onlineDot = isOnline === true
    ? 'bg-green-400 shadow-[0_0_4px_rgba(111,207,151,0.5)]'
    : isOnline === false
    ? 'bg-gray-500'
    : 'bg-yellow-400'

  const onlineStatus = isOnline === true ? 'Online' : isOnline === false ? 'Offline' : 'Connecting'

  return (
    <aside 
      className="w-80 min-w-[320px] h-[600px] max-h-[85vh] flex-shrink-0 border flex flex-col rounded-2xl shadow-2xl overflow-hidden glass-panel"
      role="complementary"
      aria-label="AI chat assistant"
    >
      {/* Header */}
      <header className="px-4 pt-4 pb-3 border-b border-[color:var(--theme-border)] flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span 
            className={`w-2 h-2 rounded-full flex-shrink-0 ${onlineDot}`} 
            role="status"
            aria-label={`AI assistant status: ${onlineStatus}`}
          />
          <span className="font-display text-[18px] tracking-tight theme-text-primary">AI</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-icon-btn"
            aria-label="Close chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </header>

      {/* Messages */}
      <div 
        id={chatRegionId}
        className="flex-1 overflow-y-auto px-4 py-2 flex flex-col"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
        {isTyping && (
          <div className="py-3 border-b border-[color:var(--theme-border)] animate-fadeUp">
            <div className="text-[9.5px] font-semibold text-accent uppercase tracking-widest mb-1.5" aria-hidden="true">AI</div>
            <TypingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 focus-within:border-accent/50 transition-colors glass-subtle">
          <label htmlFor="chat-input" className="sr-only">Message to AI assistant</label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="flex-1 bg-transparent border-none outline-none text-[13px] theme-text-primary placeholder:text-[color:var(--theme-text-secondary)] resize-none min-h-[20px] max-h-24 leading-relaxed font-sans"
            placeholder="Ask about your calendar…"
            value={input}
            onChange={handleTextarea}
            onKeyDown={handleKey}
            rows={1}
            aria-describedby="chat-input-hint"
          />
          <button
            className="hover:text-accent disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 text-lg theme-text-secondary"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label={sending ? 'Sending message...' : 'Send message'}
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
        <p id="chat-input-hint" className="text-[10.5px] text-center mt-1.5 theme-text-secondary">Enter to send · Shift+Enter for new line</p>
      </div>
    </aside>
  )
}
