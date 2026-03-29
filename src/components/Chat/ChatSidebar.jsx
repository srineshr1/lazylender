import React, { useRef, useEffect, useState, useId } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { useLLM } from './useLLM'

const RESIZE_EDGE_THRESHOLD = 6

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
  const [height, setHeight] = useState(600)
  const [width, setWidth] = useState(320)
  const [nearEdge, setNearEdge] = useState(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeEdge, setResizeEdge] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const chatRegionId = useId()
  const sidebarRef = useRef(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startWidth = useRef(0)
  const startHeight = useRef(0)

  const handleMouseMove = (e) => {
    if (isResizing) return
    const sidebar = sidebarRef.current
    if (!sidebar) return
    const rect = sidebar.getBoundingClientRect()
    const distanceFromLeft = e.clientX - rect.left
    const distanceFromTop = e.clientY - rect.top

    const isNearLeft = distanceFromLeft <= RESIZE_EDGE_THRESHOLD
    const isNearTop = distanceFromTop <= RESIZE_EDGE_THRESHOLD

    if (isNearLeft && isNearTop) {
      setNearEdge('corner')
    } else if (isNearLeft) {
      setNearEdge('left')
    } else if (isNearTop) {
      setNearEdge('top')
    } else {
      setNearEdge(null)
    }
  }

  const handleMouseDown = (e, edge) => {
    e.preventDefault()
    setIsResizing(true)
    setResizeEdge(edge)
    startX.current = e.clientX
    startY.current = e.clientY
    startWidth.current = width
    startHeight.current = height
  }

  useEffect(() => {
    if (!isResizing) return

    const onMouseMove = (e) => {
      if (resizeEdge === 'left' || resizeEdge === 'corner') {
        const delta = startX.current - e.clientX
        const newWidth = Math.min(Math.max(280, startWidth.current + delta), 600)
        setWidth(newWidth)
      }
      if (resizeEdge === 'top' || resizeEdge === 'corner') {
        const delta = startY.current - e.clientY
        const newHeight = Math.min(Math.max(300, startHeight.current + delta), window.innerHeight * 0.85)
        setHeight(newHeight)
      }
    }

    const onMouseUp = () => {
      setIsResizing(false)
      setResizeEdge(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isResizing, resizeEdge])

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

  const cursorStyle = isResizing
    ? (resizeEdge === 'corner' ? 'nwse-resize' : resizeEdge === 'left' ? 'ew-resize' : resizeEdge === 'top' ? 'ns-resize' : 'default')
    : nearEdge === 'corner'
    ? 'nwse-resize'
    : nearEdge === 'left'
    ? 'ew-resize'
    : nearEdge === 'top'
    ? 'ns-resize'
    : undefined

  return (
    <aside 
      ref={sidebarRef}
      className={`flex-shrink-0 border flex flex-col rounded-2xl shadow-2xl overflow-hidden glass-panel ${isResizing ? 'select-none' : ''}`}
      role="complementary"
      aria-label="AI chat assistant"
      style={{ 
        height: `${height}px`,
        width: `${width}px`,
        minWidth: '280px',
        maxWidth: '600px',
        maxHeight: '85vh',
        cursor: cursorStyle,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setNearEdge(null)}
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

      {/* Left edge resize zone */}
      <div
        className="absolute top-0 bottom-0 left-0 w-6 -ml-3"
        onMouseDown={(e) => handleMouseDown(e, 'left')}
      />

      {/* Top edge resize zone */}
      <div
        className="absolute top-0 left-0 right-0 h-6 -mt-3"
        onMouseDown={(e) => handleMouseDown(e, 'top')}
      />

      {/* Top-left corner resize zone */}
      <div
        className="absolute top-0 left-0 w-6 h-6 -ml-3 -mt-3 cursor-nwse-resize"
        onMouseDown={(e) => handleMouseDown(e, 'corner')}
      />
    </aside>
  )
}
