import { useChatStore } from '../../store/useChatStore'
import { useEventStore } from '../../store/useEventStore'
import { fmtDate, getWorkWeekDays } from '../../lib/dateUtils'
import { toast } from '../../store/useToastStore'
import { generateText, GroqError } from '../../api/groqClient'

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
    
    // Try to find and parse a JSON object in this line
    const match = trimmed.match(/\{[^}]*\}/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        jsonObjects.push(parsed)
      } catch {
        // Try with the full line
        try {
          const parsed = JSON.parse(trimmed)
          jsonObjects.push(parsed)
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  }
  
  if (jsonObjects.length === 1) {
    return jsonObjects[0]
  }
  
  if (jsonObjects.length > 1) {
    return jsonObjects
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
    const weekDates = getWeekDates()
    
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
- When user says "this week", "every day this week", "all week", or "gym this week", you MUST add events for EACH weekday (Mon, Tue, Wed, Thu, Fri) - generate MULTIPLE {"action":"add"} objects, one per day. Example: {"action":"add","event":{"title":"Gym","date":"${weekDates[0]}","time":"06:00",...}} followed by one for ${weekDates[1]}, ${weekDates[2]}, ${weekDates[3]}, ${weekDates[4]}
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

      // Helper function to process a single action
      const processAction = (actionObj) => {
        if (actionObj?.action === 'add' && actionObj.event) {
          // Validate required fields
          if (!actionObj.event.title) {
            addMessage({ role: 'ai', text: '⚠ Cannot add event without a title.' })
            return false
          }
          if (!actionObj.event.date) {
            addMessage({ role: 'ai', text: '⚠ Cannot add event without a date.' })
            return false
          }
          if (!actionObj.event.time) {
            addMessage({ role: 'ai', text: '⚠ Cannot add event without a time.' })
            return false
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

      // Handle different action types with validation
      if (Array.isArray(parsed)) {
        // Process multiple actions
        const results = []
        for (const actionObj of parsed) {
          const result = processAction(actionObj)
          if (result) results.push(result)
        }
        
        if (results.length > 0) {
          const successCount = results.filter(r => r.success).length
          const failCount = results.filter(r => !r.success).length
          const messages = results.map(r => r.message)
          
          let summary = messages.join('\n')
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
