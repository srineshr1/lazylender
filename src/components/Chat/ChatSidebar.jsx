import React, { useRef, useEffect, useState } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { useOllama } from './useOllama'

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dot-bounce" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dot-bounce-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dot-bounce-3" />
    </div>
  )
}

function ChatMessage({ msg }) {
  if (msg.role === 'system') {
    return (
      <div className="py-3 border-b border-white/[0.05]">
        <div className="text-center text-xs text-gray-500 leading-relaxed">
          {msg.text}
        </div>
      </div>
    )
  }
  
  if (msg.role === 'user') {
    return (
      <div className="py-3 border-b border-white/[0.05] animate-fadeUp">
            <div className="flex flex-col items-end">
          <div className="max-w-[85%] border-l-2 border-accent/40 pl-3">
            <div className="text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed font-sans">
              {msg.text}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="py-3 border-b border-white/[0.05] animate-fadeUp">
      <div className="flex flex-col">
        <div className="text-[9.5px] font-semibold text-accent uppercase tracking-widest mb-1.5">AI</div>
        <div className="text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed font-sans" style={{ whiteSpace: 'pre-wrap' }}>
          {msg.text}
        </div>
      </div>
    </div>
  )
}

export default function ChatSidebar() {
  const { messages, isTyping, isOnline, model, setModel } = useChatStore()
  const { send } = useOllama()
  const [input, setInput] = useState('')
  const [modelDraft, setModelDraft] = useState(model)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

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

  return (
    <aside className="w-80 min-w-[320px] flex-shrink-0 bg-chat border-l border-white/[0.07] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-7 pb-4 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${onlineDot}`} />
          <span className="font-display text-[22px] text-gray-100 tracking-tight">ai.assistant</span>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/[0.07] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 font-mono outline-none focus:border-accent/50 transition-colors"
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            placeholder="model name…"
          />
          <button
            className="bg-white hover:bg-white/90 transition-all text-gray-800 text-xs rounded-lg px-3.5 py-1.5 font-medium shadow-sm"
            onClick={() => setModel(modelDraft)}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col">
        {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
        {isTyping && (
          <div className="py-3 border-b border-white/[0.05] animate-fadeUp">
            <div className="text-[9.5px] font-semibold text-accent uppercase tracking-widest mb-1.5">AI</div>
            <TypingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-accent/50 transition-colors">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none min-h-[20px] max-h-24 leading-relaxed font-sans"
            placeholder="Ask about your calendar…"
            value={input}
            onChange={handleTextarea}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            className="text-gray-400 hover:text-accent disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 text-lg"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            ↑
          </button>
        </div>
        <p className="text-[10.5px] text-gray-600 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </aside>
  )
}
