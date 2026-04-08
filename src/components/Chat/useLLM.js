import { useState, useCallback, useRef } from 'react'
import { useChatStore } from '../../store/useChatStore'
import { useEventStore } from '../../store/useEventStore'
import { fmtDate, getWorkWeekDays } from '../../lib/dateUtils'
import { toast } from '../../store/useToastStore'
import { generateText, extractTextFromPDF, fileToDataUrl, GroqError } from '../../api/groqClient'
import { getHolidaysInRange, formatHolidaysForDisplay } from '../../lib/holidayApi'
import {
  WIZARD_STEPS,
  getExtractionPrompt,
  getDateRangeParsePrompt,
  getHolidayParsePrompt,
  formatClassesForDisplay,
  formatConfirmationSummary,
  calculateTotalEvents,
  generateEventsFromClasses,
  getInitialWizardState,
} from './timetablePrompts'

const MODEL = 'llama-3.3-70b-versatile'

function getWeekDates() {
  const today = new Date()
  const monday = getWorkWeekDays(today)
  return monday.map(d => fmtDate(d))
}

function extractJSON(raw) {
  // Try direct parse (handles both single object and array)
  try { return JSON.parse(raw) } catch {}
  
  // Strip markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  
  // Try parsing as array of JSON objects (one per line)
  const lines = cleaned.split('\n').filter(line => line.trim())
  const jsonObjects = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    const match = trimmed.match(/\{[^}]*\}/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        jsonObjects.push(parsed)
      } catch {
        try {
          const parsed = JSON.parse(trimmed)
          jsonObjects.push(parsed)
        } catch {}
      }
    }
  }
  
  if (jsonObjects.length === 1) return jsonObjects[0]
  if (jsonObjects.length > 1) return jsonObjects
  return null
}

export function useLLM() {
  const { addMessage, setTyping, setOnline, setError } = useChatStore()
  const { events, addEvent, editEvent, deleteEvent } = useEventStore()
  
  // Wizard state for timetable import
  const [wizardState, setWizardState] = useState(getInitialWizardState())
  const wizardRef = useRef(wizardState)
  wizardRef.current = wizardState

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setWizardState(getInitialWizardState())
  }, [])

  // Check if we're in wizard mode
  const isInWizard = wizardState.step !== WIZARD_STEPS.IDLE

  // Process timetable file (image or PDF)
  const processFileForTimetable = useCallback(async (file) => {
    const isImage = file.type.startsWith('image/')
    const isPDF = file.type === 'application/pdf'
    
    if (!isImage && !isPDF) {
      throw new Error('Unsupported file type. Please upload an image (PNG, JPG) or PDF.')
    }

    let attachments = []
    let extractedText = ''

    if (isImage) {
      const dataUrl = await fileToDataUrl(file)
      attachments = [{ type: 'image', url: dataUrl, name: file.name }]
    } else if (isPDF) {
      extractedText = await extractTextFromPDF(file)
      if (!extractedText.trim()) {
        throw new Error('Could not extract text from PDF. It may be a scanned document or empty.')
      }
    }

    return { attachments, extractedText, isImage, isPDF }
  }, [])

  // Handle wizard flow based on current step
  const handleWizardStep = useCallback(async (userText, attachments = []) => {
    const state = wizardRef.current
    
    switch (state.step) {
      case WIZARD_STEPS.ASK_DATE_RANGE: {
        // Parse user's date range response
        setTyping(true)
        try {
          const result = await generateText({
            model: MODEL,
            messages: [
              { role: 'system', content: getDateRangeParsePrompt() },
              { role: 'user', content: userText }
            ],
            temperature: 0.1,
            maxTokens: 500
          })
          
          const parsed = extractJSON(result.response)
          
          if (!parsed?.success || !parsed.startDate || !parsed.endDate) {
            addMessage({ 
              role: 'ai', 
              text: `I couldn't understand those dates. Please try again with a format like "April 8 to June 15" or "next 3 months".`
            })
            setTyping(false)
            return
          }
          
          // Fetch holidays for the date range
          addMessage({ role: 'ai', text: `Got it! Checking for holidays between ${parsed.startDate} and ${parsed.endDate}...` })
          
          const holidays = await getHolidaysInRange(parsed.startDate, parsed.endDate)
          
          setWizardState(prev => ({
            ...prev,
            step: WIZARD_STEPS.ASK_HOLIDAYS,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            holidays,
          }))
          
          if (holidays.length > 0) {
            addMessage({
              role: 'ai',
              text: `I found these public holidays in your date range:\n\n${formatHolidaysForDisplay(holidays)}\n\nShould I exclude these dates from your timetable? (yes/no/or specify which ones to exclude)`
            })
          } else {
            // No holidays, skip to confirmation
            const totalEvents = calculateTotalEvents(
              state.extractedClasses,
              parsed.startDate,
              parsed.endDate,
              []
            )
            
            setWizardState(prev => ({
              ...prev,
              step: WIZARD_STEPS.CONFIRM,
              excludedDates: [],
            }))
            
            addMessage({
              role: 'ai',
              text: `No public holidays found in this period.\n\n${formatConfirmationSummary(
                state.extractedClasses,
                parsed.startDate,
                parsed.endDate,
                [],
                totalEvents
              )}`
            })
          }
        } catch (err) {
          console.error('Date parsing error:', err)
          addMessage({ role: 'ai', text: `Error processing dates: ${err.message}. Please try again.` })
        }
        setTyping(false)
        break
      }
      
      case WIZARD_STEPS.ASK_HOLIDAYS: {
        setTyping(true)
        try {
          const result = await generateText({
            model: MODEL,
            messages: [
              { role: 'system', content: getHolidayParsePrompt(state.holidays) },
              { role: 'user', content: userText }
            ],
            temperature: 0.1,
            maxTokens: 500
          })
          
          const parsed = extractJSON(result.response)
          
          let excludedDates = []
          if (parsed?.excludeAll) {
            excludedDates = state.holidays.map(h => h.date)
          } else if (parsed?.excludeDates?.length > 0) {
            excludedDates = parsed.excludeDates
          }
          // If includeAll or neither, excludedDates stays empty
          
          const totalEvents = calculateTotalEvents(
            state.extractedClasses,
            state.startDate,
            state.endDate,
            excludedDates
          )
          
          setWizardState(prev => ({
            ...prev,
            step: WIZARD_STEPS.CONFIRM,
            excludedDates,
          }))
          
          const excludeNote = excludedDates.length > 0 
            ? `Excluding ${excludedDates.length} date(s).`
            : 'Including all dates (no exclusions).'
          
          addMessage({
            role: 'ai',
            text: `${excludeNote}\n\n${formatConfirmationSummary(
              state.extractedClasses,
              state.startDate,
              state.endDate,
              excludedDates,
              totalEvents
            )}`
          })
        } catch (err) {
          console.error('Holiday parsing error:', err)
          addMessage({ role: 'ai', text: `Error processing response: ${err.message}. Please try "yes", "no", or specify dates.` })
        }
        setTyping(false)
        break
      }
      
      case WIZARD_STEPS.CONFIRM: {
        const lowerText = userText.toLowerCase().trim()
        
        if (lowerText === 'confirm' || lowerText === 'yes' || lowerText === 'ok' || lowerText === 'add' || lowerText === 'add all') {
          setTyping(true)
          setWizardState(prev => ({ ...prev, step: WIZARD_STEPS.ADDING }))
          
          try {
            const eventsToAdd = generateEventsFromClasses(
              state.extractedClasses,
              state.startDate,
              state.endDate,
              state.excludedDates
            )
            
            addMessage({ role: 'ai', text: `Adding ${eventsToAdd.length} events to your calendar...` })
            
            // Add events in batches to avoid overwhelming the UI
            let addedCount = 0
            const batchSize = 10
            
            for (let i = 0; i < eventsToAdd.length; i += batchSize) {
              const batch = eventsToAdd.slice(i, i + batchSize)
              for (const event of batch) {
                try {
                  await addEvent(event)
                  addedCount++
                } catch (err) {
                  console.error('Failed to add event:', event.title, err)
                }
              }
              // Small delay between batches for UI responsiveness
              if (i + batchSize < eventsToAdd.length) {
                await new Promise(r => setTimeout(r, 100))
              }
            }
            
            setWizardState(prev => ({ ...prev, step: WIZARD_STEPS.COMPLETE }))
            
            addMessage({
              role: 'ai',
              text: `✅ Successfully added ${addedCount} events to your calendar!\n\nYou can view them in the Week or Month view. Each class has been color-coded for easy identification.`
            })
            
            toast.success(`Added ${addedCount} events from timetable`, 'Timetable Imported')
            
            // Reset wizard after completion
            setTimeout(() => resetWizard(), 1000)
            
          } catch (err) {
            console.error('Error adding events:', err)
            addMessage({ role: 'ai', text: `Error adding events: ${err.message}` })
            setWizardState(prev => ({ ...prev, step: WIZARD_STEPS.ERROR, error: err.message }))
          }
          setTyping(false)
        } else if (lowerText === 'cancel' || lowerText === 'no' || lowerText === 'abort') {
          addMessage({ role: 'ai', text: 'Timetable import cancelled. No events were added.' })
          resetWizard()
        } else {
          addMessage({ role: 'ai', text: 'Please type "confirm" to add the events, or "cancel" to abort.' })
        }
        break
      }
      
      default:
        // Not in wizard mode, shouldn't reach here
        break
    }
  }, [addMessage, setTyping, addEvent, resetWizard])

  // Start timetable extraction from file
  const startTimetableImport = useCallback(async (file) => {
    setTyping(true)
    
    try {
      // Add user message showing they uploaded a file
      addMessage({ 
        role: 'user', 
        text: `Import timetable from: ${file.name}`,
        attachments: [{ type: file.type.startsWith('image/') ? 'image' : 'pdf', name: file.name }]
      })
      
      addMessage({ role: 'ai', text: `Analyzing your timetable...` })
      
      const { attachments, extractedText, isImage, isPDF } = await processFileForTimetable(file)
      
      // Call AI to extract timetable
      let result
      if (isImage) {
        result = await generateText({
          messages: [
            { role: 'system', content: getExtractionPrompt() },
            { role: 'user', content: 'Extract all classes and events from this timetable image.' }
          ],
          attachments,
          temperature: 0.1,
          maxTokens: 2000
        })
      } else {
        // PDF - send extracted text
        result = await generateText({
          model: MODEL,
          messages: [
            { role: 'system', content: getExtractionPrompt() },
            { role: 'user', content: `Extract all classes and events from this timetable:\n\n${extractedText}` }
          ],
          temperature: 0.1,
          maxTokens: 2000
        })
      }
      
      const parsed = extractJSON(result.response)
      
      if (!parsed?.success || !parsed.classes || parsed.classes.length === 0) {
        const errorMsg = parsed?.error || 'Could not identify any classes in the timetable.'
        addMessage({ role: 'ai', text: `❌ ${errorMsg}\n\nPlease make sure the image clearly shows class names, days, and times.` })
        resetWizard()
        setTyping(false)
        return
      }
      
      // Successfully extracted classes
      setWizardState(prev => ({
        ...prev,
        step: WIZARD_STEPS.ASK_DATE_RANGE,
        extractedClasses: parsed.classes,
      }))
      
      const classesDisplay = formatClassesForDisplay(parsed.classes)
      
      addMessage({
        role: 'ai',
        text: `I found ${parsed.classes.length} classes in your timetable:\n\n${classesDisplay}\n\n${parsed.notes ? `Note: ${parsed.notes}\n\n` : ''}What date range should I add these recurring events? For example: "April 8 to June 15" or "this semester" or "next 3 months"`
      })
      
      setOnline(true)
    } catch (err) {
      console.error('Timetable extraction error:', err)
      addMessage({ role: 'ai', text: `❌ Error analyzing timetable: ${err.message}` })
      resetWizard()
    }
    
    setTyping(false)
  }, [addMessage, setTyping, setOnline, processFileForTimetable, resetWizard])

  // Main send function
  const send = async (userText, files = []) => {
    // If files are provided and we're not in wizard mode, start timetable import
    if (files.length > 0 && !isInWizard) {
      await startTimetableImport(files[0])
      return
    }
    
    // If in wizard mode, handle wizard flow
    if (isInWizard) {
      await handleWizardStep(userText)
      return
    }
    
    // Normal chat flow
    addMessage({ role: 'user', text: userText })
    setTyping(true)

    const todayStr = fmtDate(new Date())
    const weekDates = getWeekDates()
    
    const compactEvents = events.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      sub: e.sub || '',
      done: e.done || false,
    }))
    
    const todayEvents = events.filter(e => e.date === todayStr)
    const todaySummary = todayEvents.length > 0
      ? `Today's events: ${todayEvents.map(e => `${e.title} at ${e.time}`).join(', ')}`
      : 'No events scheduled for today.'

    const systemPrompt = `CRITICAL: You must ALWAYS respond with ONLY a single valid JSON object. Never return raw event arrays or data structures. Never explain yourself or add commentary outside the JSON.

You are an AI calendar assistant. Today is ${todayStr}.
This week's dates: ${JSON.stringify(weekDates)}
This week's days: Mon=${weekDates[0]}, Tue=${weekDates[1]}, Wed=${weekDates[2]}, Thu=${weekDates[3]}, Fri=${weekDates[4]}

${todaySummary}

Current events (compact):
${JSON.stringify(compactEvents, null, 2)}

RESPONSE FORMAT - respond ONLY with a raw JSON object (no markdown, no fences, no explanation):
- Add:    {"action":"add","event":{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","duration":60,"sub":"...","color":"pink|green|blue|amber|gray","recurrence":"none|daily|weekly|monthly"}}
- Edit:   {"action":"edit","id":"existing_id","changes":{"title":"...","date":"...","time":"..."}}
- Delete: {"action":"delete","id":"existing_id"}
- Chat:   {"action":"none","reply":"your response here"}

TIMETABLE IMPORT: If user wants to import a timetable, schedule, or class roster, respond with:
{"action":"none","reply":"To import a timetable, please click the 📎 attachment button and upload an image or PDF of your timetable. I'll extract the classes and help you add them to your calendar!"}

EXAMPLES:

User: "What do I have today?"
RIGHT: {"action":"none","reply":"You have 2 events today: Stand-up at 9:00 AM and Design Review at 2:00 PM."}

User: "Add lunch at 1pm tomorrow"
RIGHT: {"action":"add","event":{"title":"Lunch","date":"2026-03-19","time":"13:00","duration":60,"sub":"","color":"amber","recurrence":"none"}}

User: "Import my timetable" or "Add my class schedule"
RIGHT: {"action":"none","reply":"To import a timetable, please click the 📎 attachment button and upload an image or PDF of your timetable. I'll extract the classes and help you add them to your calendar!"}

CRITICAL RULES:
- For ANY question about events, schedule, or "what do I have", ALWAYS use {"action":"none","reply":"..."}
- NEVER return raw event arrays like [{"id":...}] or the full events object
- ALWAYS summarize events in natural language inside the reply field
- NEVER delete events based on vague commands like "clear tasks", "remove all", "clear everything"
- ONLY delete when user specifies a SPECIFIC event by name
- When user says "this week", "every day this week", generate MULTIPLE {"action":"add"} objects
- Infer dates from context (e.g. "Friday" = next Friday from today ${todayStr})
- Color options: pink, green, blue, amber, gray
- Always return valid JSON only, nothing else`

    try {
      const data = await generateText({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.1,
        maxTokens: 1000
      })

      const raw = (data.response || '').trim()

      if (!raw) {
        throw new Error('AI returned an empty response')
      }

      setOnline(true)
      setTyping(false)
      setError(null)

      const parsed = extractJSON(raw)

      const processAction = (actionObj) => {
        if (actionObj?.action === 'add' && actionObj.event) {
          if (!actionObj.event.title || !actionObj.event.date || !actionObj.event.time) {
            return { success: false, message: '⚠ Cannot add event without title, date, and time.' }
          }

          const newEv = { 
            done: false, 
            recurrenceEnd: '', 
            ...actionObj.event 
          }
          if (!newEv.duration) newEv.duration = 60
          if (!newEv.color) newEv.color = 'blue'
          if (!newEv.recurrence) newEv.recurrence = 'none'
          
          try {
            addEvent(newEv)
            return { success: true, message: `✓ Added "${newEv.title}" on ${newEv.date} at ${newEv.time}.` }
          } catch (addErr) {
            return { success: false, message: `⚠ Failed to add "${newEv.title}": ${addErr.message}` }
          }
        } else if (actionObj?.action === 'edit' && actionObj.id) {
          const target = events.find((e) => e.id === actionObj.id)
          if (!target) {
            return { success: false, message: '⚠ Event not found. It may have been deleted.' }
          }
          
          try {
            editEvent(actionObj.id, actionObj.changes)
            return { success: true, message: `✓ Updated "${target.title}".` }
          } catch (editErr) {
            return { success: false, message: `⚠ Failed to update event: ${editErr.message}` }
          }
        } else if (actionObj?.action === 'delete' && actionObj.id) {
          const target = events.find((e) => e.id === actionObj.id)
          if (!target) {
            return { success: false, message: '⚠ Event not found. It may have already been deleted.' }
          }
          
          try {
            deleteEvent(actionObj.id)
            return { success: true, message: `✓ Deleted "${target.title}".` }
          } catch (delErr) {
            return { success: false, message: `⚠ Failed to delete event: ${delErr.message}` }
          }
        } else if (actionObj?.action === 'none' && actionObj.reply) {
          return { success: true, message: actionObj.reply, isReply: true }
        }
        return null
      }

      if (Array.isArray(parsed)) {
        const results = []
        for (const actionObj of parsed) {
          const result = processAction(actionObj)
          if (result) results.push(result)
        }
        
        if (results.length > 0) {
          const failCount = results.filter(r => !r.success).length
          let summary = results.map(r => r.message).join('\n')
          if (failCount > 0) {
            summary += `\n\n⚠ ${failCount} operation(s) failed.`
          }
          addMessage({ role: 'ai', text: summary })
        } else {
          addMessage({ role: 'ai', text: '⚠ Could not understand AI response. Please try again.' })
        }
      } else if (parsed) {
        const result = processAction(parsed)
        if (result) {
          addMessage({ role: 'ai', text: result.message })
        } else {
          addMessage({ role: 'ai', text: raw || '(empty response)' })
        }
      } else {
        addMessage({ role: 'ai', text: raw || '(empty response)' })
      }
    } catch (err) {
      setOnline(false)
      setTyping(false)
      
      let userMessage = ''
      
      if (err instanceof GroqError) {
        if (err.status === 401) {
          userMessage = 'Cannot connect to AI assistant. Please check your API configuration.'
          if (!sessionStorage.getItem('groq_auth_error_shown')) {
            toast.error('AI authentication failed. Check your settings.', 'Connection Error')
            sessionStorage.setItem('groq_auth_error_shown', 'true')
          }
        } else if (err.status === 429) {
          userMessage = 'AI is rate limited. Please wait a moment and try again.'
        } else if (err.status === 400) {
          userMessage = 'Invalid request. Please rephrase your message and try again.'
        } else if (err.message.includes('timeout')) {
          userMessage = 'Request timed out. Please try again.'
        } else if (err.message.includes('Failed to connect')) {
          userMessage = 'No internet connection. Check your network and try again.'
        } else {
          userMessage = 'Something went wrong with the AI assistant. Please try again.'
        }
      } else {
        userMessage = 'An unexpected error occurred. Please try again.'
      }
      
      setError(userMessage)
      console.error('Groq API error:', err)
    }
  }

  return { 
    send, 
    isInWizard,
    wizardStep: wizardState.step,
    resetWizard,
    startTimetableImport,
  }
}
