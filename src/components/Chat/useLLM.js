import { useChatStore } from '../../store/useChatStore'
import { useEventStore } from '../../store/useEventStore'
import { fmtDate } from '../../lib/dateUtils'
import { toast } from '../../store/useToastStore'
import { generateText, GroqError } from '../../api/groqClient'

const MODEL = 'llama-3.3-70b-versatile'

function extractJSON(raw) {
  // Try direct parse
  try { return JSON.parse(raw) } catch {}
  
  // Strip markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  
  // Find first { } block
  const match = raw.match(/\{[^]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  
  return null
}

export function useLLM() {
  const { addMessage, setTyping, setOnline } = useChatStore()
  const { events, addEvent, editEvent, deleteEvent } = useEventStore()

  const send = async (userText) => {
    addMessage({ role: 'user', text: userText })
    setTyping(true)

    const todayStr = fmtDate(new Date())
    
    // Compact events for context
    const compactEvents = events.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      sub: e.sub || '',
      done: e.done || false,
    }))
    
    // Today's events summary
    const todayEvents = events.filter(e => e.date === todayStr)
    const todaySummary = todayEvents.length > 0
      ? `Today's events: ${todayEvents.map(e => `${e.title} at ${e.time}`).join(', ')}`
      : 'No events scheduled for today.'

    const systemPrompt = `CRITICAL: You must ALWAYS respond with ONLY a single valid JSON object. Never return raw event arrays or data structures. Never explain yourself or add commentary outside the JSON.

You are an AI calendar assistant. Today is ${todayStr}.

${todaySummary}

Current events (compact):
${JSON.stringify(compactEvents, null, 2)}

RESPONSE FORMAT - respond ONLY with a raw JSON object (no markdown, no fences, no explanation):
- Add:    {"action":"add","event":{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","duration":60,"sub":"...","color":"pink|green|blue|amber|gray","recurrence":"none|daily|weekly|monthly"}}
- Edit:   {"action":"edit","id":"existing_id","changes":{"title":"...","date":"...","time":"..."}}
- Delete: {"action":"delete","id":"existing_id"}
- Chat:   {"action":"none","reply":"your response here"}

EXAMPLES:

User: "What do I have today?"
WRONG: [{"id":"e1","title":"Stand-up"...}]
RIGHT: {"action":"none","reply":"You have 2 events today: Stand-up at 9:00 AM and Design Review at 2:00 PM."}

User: "Show me my schedule"
WRONG: ${JSON.stringify(compactEvents)}
RIGHT: {"action":"none","reply":"This week you have 5 events. Tomorrow you have Lunch at 1pm and Team Meeting at 3pm."}

User: "Add lunch at 1pm tomorrow"
RIGHT: {"action":"add","event":{"title":"Lunch","date":"2026-03-19","time":"13:00","duration":60,"sub":"","color":"amber","recurrence":"none"}}

User: "What's happening on Friday?"
RIGHT: {"action":"none","reply":"On Friday you have Client Review at 10am and Happy Hour at 5pm."}

User: "Clear all tasks" or "Clear all the tasks"
WRONG: {"action":"delete","id":"e1234567890"}
RIGHT: {"action":"none","reply":"I'm a calendar assistant. I can only delete specific calendar events by name. Did you mean to clear specific events? Please tell me which event you'd like to remove, or if you meant something else, I can help you with your calendar!"}

User: "Remove all events"
WRONG: {"action":"delete","id":"e1234567890"}
RIGHT: {"action":"none","reply":"I can't delete all events at once as a safety measure. Please tell me which specific event you'd like to remove (e.g., 'Delete the Design Review' or 'Remove lunch on Tuesday')."}

CRITICAL RULES:
- For ANY question about events, schedule, or "what do I have", ALWAYS use {"action":"none","reply":"..."}
- NEVER return raw event arrays like [{"id":...}] or the full events object
- ALWAYS summarize events in natural language inside the reply field
- NEVER delete events based on vague commands like "clear tasks", "remove all", "clear everything"
- ONLY delete when user specifies a SPECIFIC event by name (e.g., "delete lunch", "remove the design review")
- If user says "tasks" but you only manage calendar events, clarify: "I manage calendar events. Did you mean to delete a specific event?"
- Infer dates from context (e.g. "Friday" = next Friday from today ${todayStr})
- Color options: pink, green, blue, amber, gray
- Always return valid JSON only, nothing else`

    try {
      // Use Groq API with messages format
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

      // If response is empty
      if (!raw) {
        throw new Error('AI returned an empty response')
      }

      setOnline(true)
      setTyping(false)

      const parsed = extractJSON(raw)

      // Handle different action types with validation
      if (parsed?.action === 'add' && parsed.event) {
        // Validate required fields
        if (!parsed.event.title) {
          addMessage({ role: 'ai', text: '⚠ Cannot add event without a title.' })
          return
        }
        if (!parsed.event.date) {
          addMessage({ role: 'ai', text: '⚠ Cannot add event without a date.' })
          return
        }
        if (!parsed.event.time) {
          addMessage({ role: 'ai', text: '⚠ Cannot add event without a time.' })
          return
        }

        // Don't generate ID - let database do it
        const newEv = { 
          done: false, 
          recurrenceEnd: '', 
          ...parsed.event 
        }
        if (!newEv.duration) newEv.duration = 60
        if (!newEv.color) newEv.color = 'blue'
        if (!newEv.recurrence) newEv.recurrence = 'none'
        
        try {
          addEvent(newEv)
          addMessage({ role: 'ai', text: `✓ Added "${newEv.title}" on ${newEv.date} at ${newEv.time}.` })
        } catch (addErr) {
          addMessage({ role: 'ai', text: `⚠ Failed to add event: ${addErr.message}` })
        }
      } else if (parsed?.action === 'edit' && parsed.id) {
        const target = events.find((e) => e.id === parsed.id)
        if (!target) {
          addMessage({ role: 'ai', text: '⚠ Event not found. It may have been deleted.' })
          return
        }
        
        try {
          editEvent(parsed.id, parsed.changes)
          addMessage({ role: 'ai', text: `✓ Updated "${target.title}".` })
        } catch (editErr) {
          addMessage({ role: 'ai', text: `⚠ Failed to update event: ${editErr.message}` })
        }
      } else if (parsed?.action === 'delete' && parsed.id) {
        const target = events.find((e) => e.id === parsed.id)
        if (!target) {
          addMessage({ role: 'ai', text: '⚠ Event not found. It may have already been deleted.' })
          return
        }
        
        try {
          deleteEvent(parsed.id)
          addMessage({ role: 'ai', text: `✓ Deleted "${target.title}".` })
        } catch (delErr) {
          addMessage({ role: 'ai', text: `⚠ Failed to delete event: ${delErr.message}` })
        }
      } else if (parsed?.action === 'none' && parsed.reply) {
        addMessage({ role: 'ai', text: parsed.reply })
      } else {
        // fallback: show raw if JSON parsing failed but we got a response
        addMessage({ role: 'ai', text: raw || '(empty response)' })
      }
    } catch (err) {
      setOnline(false)
      setTyping(false)
      
      // Handle GroqError with specific messages
      let errorMessage = '⚠ Could not reach AI assistant.\n\n'
      
      if (err instanceof GroqError) {
        errorMessage += err.message
        
        // Show appropriate toast notification
        if (err.status === 401) {
          toast.error('Invalid Groq API key. Check your .env configuration.', 'Authentication Error')
        } else if (err.status === 429) {
          toast.error('Rate limit exceeded. Please try again in a moment.', 'API Limit')
        } else if (err.status === 400) {
          toast.error('Invalid request. Check your parameters.', 'API Error')
        } else if (err.message.includes('timeout')) {
          toast.error('Request timed out. Please try again.', 'Timeout')
        } else if (err.message.includes('Failed to connect')) {
          toast.error('Cannot connect to Groq API. Check your internet connection.', 'Connection Error')
        } else {
          toast.error(err.message || 'Something went wrong with the AI assistant', 'AI Error')
        }
      } else {
        // Fallback for non-GroqError exceptions
        errorMessage += `Error: ${err.message}\n\nPlease try again or check your API configuration.`
        toast.error(err.message || 'Something went wrong with the AI assistant', 'AI Error')
      }
      
      addMessage({ role: 'ai', text: errorMessage })
      
      // Log to console for debugging
      console.error('Groq API error:', err)
    }
  }

  return { send }
}
