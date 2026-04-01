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
        className="py-3"
        role="status"
        aria-live="polite"
      >
        <div className="flex justify-center">
          <div className="px-3 py-1.5 rounded-full glass-subtle text-center text-xs leading-relaxed theme-text-secondary">
            {msg.text}
          </div>
        </div>
      </div>
    )
  }
  
  if (msg.role === 'user') {
    return (
      <article 
        className="py-2"
        aria-label="Your message"
      >
        <div className="flex flex-col items-end">
          <div className="max-w-[82%] rounded-2xl px-4 py-2.5 glass-subtle border border-accent/30 bg-accent/5 shadow-sm">
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
      className="py-2"
      aria-label="AI response"
    >
      <div className="flex gap-2.5 items-start">
        {/* AI Avatar */}
        <div 
          className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        {/* Message Bubble */}
        <div className="flex-1 max-w-[82%] rounded-2xl px-4 py-2.5 glass-subtle shadow-sm">
          <div className="text-[13px] leading-relaxed font-sans theme-text-primary" style={{ whiteSpace: 'pre-wrap' }}>
            {msg.text}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function ChatSidebar({ onClose }) {
  const { messages, isTyping, isOnline, error, clearError } = useChatStore()
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
  const prevMessageCountRef = useRef(0)
  const prevTypingRef = useRef(false)
  const isInitialMountRef = useRef(true)

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
    // Scroll to bottom on mount (instant) or when new messages arrive (smooth)
    const currentMessageCount = messages.length
    const messageAdded = currentMessageCount > prevMessageCountRef.current
    const typingStarted = isTyping && !prevTypingRef.current
    
    if (isInitialMountRef.current) {
      // On initial mount, scroll instantly to bottom without animation
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isInitialMountRef.current = false
    } else if (messageAdded || typingStarted) {
      // For new messages, use smooth scroll
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    
    prevMessageCountRef.current = currentMessageCount
    prevTypingRef.current = isTyping
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

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 animate-fadeUp">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-red-400 leading-relaxed flex-1">{error}</p>
          <button 
            onClick={clearError} 
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 p-1"
            aria-label="Dismiss error"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
          <div className="py-2">
            <div className="flex gap-2.5 items-start">
              {/* AI Avatar */}
              <div 
                className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              {/* Typing indicator */}
              <div className="rounded-2xl px-4 py-2.5 glass-subtle shadow-sm">
                <TypingDots />
              </div>
            </div>
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
