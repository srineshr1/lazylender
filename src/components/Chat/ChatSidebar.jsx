import React, { useRef, useEffect, useState, useId } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { useDarkStore } from '../../store/useDarkStore'
import { useLLM } from './useLLM'

function TypingDots() {
  return (
    <div className="flex gap-1 py-1" role="status" aria-label="AI is typing">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dot-bounce" aria-hidden="true" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dot-bounce-2" aria-hidden="true" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dot-bounce-3" aria-hidden="true" />
    </div>
  )
}

function ChatMessage({ msg, isDark }) {
  if (msg.role === 'system') {
    return (
      <div 
        className={`py-3 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-200'}`}
        role="status"
        aria-live="polite"
      >
        <div className={`text-center text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {msg.text}
        </div>
      </div>
    )
  }
  
  if (msg.role === 'user') {
    return (
      <article 
        className={`py-3 border-b animate-fadeUp ${isDark ? 'border-white/[0.05]' : 'border-gray-200'}`}
        aria-label="Your message"
      >
            <div className="flex flex-col items-end">
          <div className="max-w-[85%] border-l-2 border-accent/40 pl-3">
            <div className={`text-[13px] leading-relaxed font-sans ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {msg.text}
            </div>
          </div>
        </div>
      </article>
    )
  }
  
  return (
    <article 
      className={`py-3 border-b animate-fadeUp ${isDark ? 'border-white/[0.05]' : 'border-gray-200'}`}
      aria-label="AI response"
    >
      <div className="flex flex-col">
        <div className="text-[9.5px] font-semibold text-accent uppercase tracking-widest mb-1.5" aria-hidden="true">AI</div>
        <div className={`text-[13px] leading-relaxed font-sans ${isDark ? 'text-gray-200' : 'text-gray-700'}`} style={{ whiteSpace: 'pre-wrap' }}>
          {msg.text}
        </div>
      </div>
    </article>
  )
}

export default function ChatSidebar() {
  const { messages, isTyping, isOnline, model, setModel } = useChatStore()
  const { isDark } = useDarkStore()
  const { send } = useLLM()
  const [input, setInput] = useState('')
  const [modelDraft, setModelDraft] = useState(model)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const modelInputId = useId()
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
      className={`w-80 min-w-[320px] flex-shrink-0 border-l flex flex-col ${
        isDark ? 'bg-chat border-white/[0.07]' : 'bg-white border-gray-200'
      }`}
      role="complementary"
      aria-label="AI chat assistant"
    >
      {/* Header */}
      <header className={`px-4 pt-7 pb-4 border-b flex-shrink-0 ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-4">
          <span 
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${onlineDot}`} 
            role="status"
            aria-label={`AI assistant status: ${onlineStatus}`}
          />
          <span className={`font-display text-[22px] tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ai.assistant</span>
        </div>
        <div className="flex gap-2">
          <label htmlFor={modelInputId} className="sr-only">AI model name</label>
          <input
            id={modelInputId}
            className={`flex-1 border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-accent/50 transition-colors ${
              isDark ? 'bg-white/[0.07] border-white/10 text-gray-200' : 'bg-gray-100 border-gray-200 text-gray-700'
            }`}
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            placeholder="model name…"
            aria-describedby={`${modelInputId}-hint`}
          />
          <span id={`${modelInputId}-hint`} className="sr-only">Enter the name of the AI model to use</span>
          <button
            className="bg-accent hover:bg-accent/90 transition-all text-white text-xs rounded-lg px-3.5 py-1.5 font-medium shadow-sm"
            onClick={() => setModel(modelDraft)}
            aria-label="Apply model change"
          >
            Apply
          </button>
        </div>
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
        {messages.map((m) => <ChatMessage key={m.id} msg={m} isDark={isDark} />)}
        {isTyping && (
          <div className={`py-3 border-b animate-fadeUp ${isDark ? 'border-white/[0.05]' : 'border-gray-200'}`}>
            <div className="text-[9.5px] font-semibold text-accent uppercase tracking-widest mb-1.5" aria-hidden="true">AI</div>
            <TypingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 focus-within:border-accent/50 transition-colors ${
          isDark ? 'bg-white/[0.07] border-white/10' : 'bg-gray-100 border-gray-200'
        }`}>
          <label htmlFor="chat-input" className="sr-only">Message to AI assistant</label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            className={`flex-1 bg-transparent border-none outline-none text-[13px] placeholder-gray-400 resize-none min-h-[20px] max-h-24 leading-relaxed font-sans ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}
            placeholder="Ask about your calendar…"
            value={input}
            onChange={handleTextarea}
            onKeyDown={handleKey}
            rows={1}
            aria-describedby="chat-input-hint"
          />
          <button
            className={`hover:text-accent disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 text-lg ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label={sending ? 'Sending message...' : 'Send message'}
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
        <p id="chat-input-hint" className={`text-[10.5px] text-center mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Enter to send · Shift+Enter for new line</p>
      </div>
    </aside>
  )
}
