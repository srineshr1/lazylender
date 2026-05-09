import React, { useRef, useEffect, useState, useId, useCallback } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { useLLM } from './useLLM'
import { useIsMobile } from '../../hooks/useMediaQuery'

const ACCEPTED_FILE_TYPES = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf'
const MAX_FILE_SIZE = 10 * 1024 * 1024

const SUGGESTIONS = [
  { text: "What's on my schedule today?", icon: '📅' },
  { text: 'Create a new event for tomorrow', icon: '✨' },
  { text: 'Find free time this week', icon: '🔍' },
  { text: 'Upload a timetable to import', icon: '📎' },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5" role="status" aria-label="AI is typing">
      <span className="w-1.5 h-1.5 rounded-full theme-text-secondary opacity-60 animate-bounce" aria-hidden="true" />
      <span className="w-1.5 h-1.5 rounded-full theme-text-secondary opacity-60 animate-bounce" style={{ animationDelay: '0.15s' }} aria-hidden="true" />
      <span className="w-1.5 h-1.5 rounded-full theme-text-secondary opacity-60 animate-bounce" style={{ animationDelay: '0.3s' }} aria-hidden="true" />
    </div>
  )
}

function FileAttachment({ attachment }) {
  const [imgError, setImgError] = useState(false)

  if (attachment.type === 'image' && !imgError) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden max-w-[200px]">
        <img 
          src={attachment.url} 
          alt={attachment.name || 'Attached image'} 
          className="w-full h-auto object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 max-w-[200px]">
      <svg className="w-4 h-4 text-accent/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span className="text-xs theme-text-secondary truncate">{attachment.name || 'File'}</span>
    </div>
  )
}

function ChatMessage({ msg }) {
  if (msg.role === 'user') {
    return (
      <article className="py-2.5 animate-fadeUp" aria-label="Your message">
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-xl px-4 py-2.5 chat-user-bubble">
            <div className="text-[13px] leading-relaxed font-sans theme-text-primary break-words whitespace-pre-wrap">
              {msg.text}
            </div>
            {msg.attachments?.map((attachment, idx) => (
              <FileAttachment key={idx} attachment={attachment} />
            ))}
          </div>
        </div>
      </article>
    )
  }
  
  return (
    <article className="py-2.5 animate-fadeUp" aria-label="AI response">
      <div className="flex gap-3 items-start">
        <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-[13px] leading-relaxed font-sans theme-text-primary break-words whitespace-pre-wrap">
            {msg.text}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function ChatSidebar({ onClose, initialMessage }) {
  const { messages, isTyping, isOnline, error, clearError } = useChatStore()
  const { send, isInWizard, resetWizard, startTimetableImport } = useLLM()
  const isMobile = useIsMobile()
  const [input, setInput] = useState(initialMessage || '')
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const chatRegionId = useId()
  const prevMessageCountRef = useRef(0)
  const prevTypingRef = useRef(false)
  const isInitialMountRef = useRef(true)

  useEffect(() => {
    if (initialMessage) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [])

  const handleFileSelect = useCallback((file) => {
    if (!file) return
    const validTypes = ACCEPTED_FILE_TYPES.split(',')
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (PNG, JPG, WebP) or PDF file.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be less than 10MB.')
      return
    }
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }, [])

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }, [])
  const handleDragOver = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
  }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  useEffect(() => {
    const currentMessageCount = messages.length
    const messageAdded = currentMessageCount > prevMessageCountRef.current
    const typingStarted = isTyping && !prevTypingRef.current
    if (isInitialMountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isInitialMountRef.current = false
    } else if (messageAdded || typingStarted) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = currentMessageCount
    prevTypingRef.current = isTyping
  }, [messages, isTyping])

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !selectedFile) return
    if (sending) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setSending(true)
    try {
      if (selectedFile) {
        await startTimetableImport(selectedFile)
        clearSelectedFile()
      } else {
        await send(text)
      }
    } finally {
      setSending(false)
    }
  }

  const handleSuggestionClick = useCallback((text) => {
    if (text === 'Upload a timetable to import') {
      fileInputRef.current?.click()
    } else {
      setInput(text)
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(text.length, text.length)
      }, 50)
    }
  }, [])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleTextarea = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const onlineDot = isOnline === true
    ? 'bg-green-400 shadow-[0_0_6px_rgba(111,207,151,0.4)]'
    : isOnline === false
    ? 'bg-gray-400'
    : 'bg-yellow-400'

  const containerStyle = isMobile
    ? { height: '100%', width: '100%' }
    : { height: '560px', width: '380px', maxHeight: '80vh', maxWidth: '90vw' }

  const showSuggestions = messages.length === 0 && !isInWizard

  return (
    <aside 
      className={`flex-shrink-0 flex flex-col overflow-hidden ${
        isMobile 
          ? 'h-full w-full' 
          : 'border rounded-2xl shadow-xl chat-panel'
      }`}
      role="complementary"
      aria-label="AI chat assistant"
      style={containerStyle}
    >
      {/* Header */}
      <header
        className="px-4 py-3 border-b flex-shrink-0 flex items-center justify-between"
        style={{ borderColor: 'color-mix(in srgb, var(--theme-border) 50%, transparent)', background: 'var(--theme-panel)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm theme-text-primary">AI Assistant</div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${onlineDot}`} />
              <span className="text-[10px] theme-text-secondary">
                {isOnline === true ? 'Online' : isOnline === false ? 'Offline' : 'Connecting'}
              </span>
            </div>
          </div>
          {isInWizard && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium border border-accent/20">
              Importing
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isInWizard && (
            <button
              onClick={() => { resetWizard(); clearSelectedFile() }}
              className="text-[11px] px-2 py-1 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Cancel timetable import"
            >
              Cancel
            </button>
          )}
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
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 animate-fadeUp">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-red-400 leading-relaxed flex-1">{error}</p>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 p-1" aria-label="Dismiss error">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Messages */}
      <div 
        id={chatRegionId}
        className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col relative custom-scrollbar ${isDragging ? 'bg-accent/5' : ''}`}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-accent/5 border-2 border-dashed border-accent/30 rounded-lg z-10 pointer-events-none">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-accent font-medium">Drop timetable here</p>
              <p className="text-xs theme-text-secondary mt-1">Image or PDF</p>
            </div>
          </div>
        )}

        {/* Empty state with suggestions */}
        {showSuggestions && (
          <div className="flex-1 flex flex-col items-center justify-center px-2">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4" aria-hidden="true">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <p className="text-sm font-medium theme-text-primary mb-0.5">How can I help you?</p>
            <p className="text-xs theme-text-secondary mb-5">Ask me about your schedule or upload a timetable</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s.text)}
                  className="suggestion-chip group flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-left"
                  style={{ borderColor: 'color-mix(in srgb, var(--theme-border) 60%, transparent)' }}
                >
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-[12px] theme-text-secondary group-hover:theme-text-primary transition-colors leading-tight">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
        {isTyping && (
          <div className="py-2.5">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div className="pt-1.5">
                <TypingDots />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-4 pt-2 flex-shrink-0 ${isMobile ? 'pb-20' : 'pb-4'}`}
        style={isMobile ? { paddingBottom: 'max(80px, calc(64px + env(safe-area-inset-bottom)))' } : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {selectedFile && (
          <div className="mb-2.5 p-2.5 rounded-xl border flex items-center gap-2.5 animate-fadeUp"
            style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 30%, var(--theme-border) 70%)', background: 'color-mix(in srgb, var(--color-accent) 6%, var(--theme-panel) 94%)' }}
          >
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border" style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 30%, var(--theme-border) 70%)' }} />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs theme-text-primary truncate">{selectedFile.name}</p>
              <p className="text-[10px] theme-text-secondary">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearSelectedFile} className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors" aria-label="Remove file">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors"
          style={{ borderColor: 'color-mix(in srgb, var(--theme-border) 55%, transparent)', background: 'var(--theme-panel)' }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 rounded-lg hover:text-accent hover:bg-accent/10 transition-colors flex items-center justify-center flex-shrink-0 theme-text-secondary disabled:opacity-40"
            disabled={sending || isInWizard}
            aria-label="Attach timetable image or PDF"
            title="Upload timetable"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <label htmlFor="chat-input" className="sr-only">Message to AI assistant</label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="flex-1 bg-transparent border-none outline-none text-[13px] theme-text-primary placeholder:text-[color:var(--theme-text-secondary)] resize-none min-h-[20px] max-h-28 leading-relaxed font-sans"
            placeholder={selectedFile ? "Press send to import timetable..." : "Message AI Assistant..."}
            value={input}
            onChange={handleTextarea}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            className="h-8 w-8 rounded-lg transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              color: (sending || (!input.trim() && !selectedFile)) ? 'var(--theme-text-secondary)' : '#fff',
              background: (input.trim() || selectedFile) ? 'var(--color-accent)' : 'transparent',
            }}
            onClick={handleSend}
            disabled={sending || (!input.trim() && !selectedFile)}
            aria-label={sending ? 'Sending...' : selectedFile ? 'Import timetable' : 'Send message'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center mt-1.5 theme-text-secondary opacity-50">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </aside>
  )
}
