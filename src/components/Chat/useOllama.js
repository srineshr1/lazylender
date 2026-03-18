import { useChatStore } from '../../store/useChatStore'
import { useEventStore } from '../../store/useEventStore'
import { fmtDate } from '../../lib/dateUtils'

const genId = () => 'e' + Date.now() + Math.random().toString(36).slice(2, 6)

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

export function useOllama() {
  const { model, addMessage, setTyping, setOnline } = useChatStore()
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

CRITICAL RULES:
- For ANY question about events, schedule, or "what do I have", ALWAYS use {"action":"none","reply":"..."}
- NEVER return raw event arrays like [{"id":...}] or the full events object
- ALWAYS summarize events in natural language inside the reply field
- Infer dates from context (e.g. "Friday" = next Friday from today ${todayStr})
- Color options: pink, green, blue, amber, gray
- Always return valid JSON only, nothing else`

    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model, 
          prompt: `${systemPrompt}\n\nUser: ${userText}`,
          stream: false,
          options: { temperature: 0.1 }
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const raw = (data.response || '').trim()

      setOnline(true)
      setTyping(false)

      const parsed = extractJSON(raw)

      if (parsed?.action === 'add' && parsed.event) {
        const newEv = { id: genId(), done: false, recurrenceEnd: '', ...parsed.event }
        if (!newEv.duration) newEv.duration = 60
        if (!newEv.color) newEv.color = 'blue'
        if (!newEv.recurrence) newEv.recurrence = 'none'
        addEvent(newEv)
        addMessage({ role: 'ai', text: `✓ Added "${newEv.title}" on ${newEv.date} at ${newEv.time}.` })
      } else if (parsed?.action === 'edit' && parsed.id) {
        const target = events.find((e) => e.id === parsed.id)
        editEvent(parsed.id, parsed.changes)
        addMessage({ role: 'ai', text: `✓ Updated "${target?.title || 'event'}".` })
      } else if (parsed?.action === 'delete' && parsed.id) {
        const target = events.find((e) => e.id === parsed.id)
        deleteEvent(parsed.id)
        addMessage({ role: 'ai', text: `✓ Deleted "${target?.title || 'event'}".` })
      } else if (parsed?.action === 'none' && parsed.reply) {
        addMessage({ role: 'ai', text: parsed.reply })
      } else {
        // fallback: show raw
        addMessage({ role: 'ai', text: raw || '(empty response)' })
      }
    } catch (err) {
      setOnline(false)
      setTyping(false)
      addMessage({
        role: 'ai',
        text: `⚠ Could not reach Ollama.\n\nMake sure it's running:\n  ollama serve\n  ollama pull ${model}\n\nError: ${err.message}`,
      })
    }
  }

  return { send }
}
