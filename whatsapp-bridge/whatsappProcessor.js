const axios = require('axios')
const { extractEvents } = require('./extractor')
const { readUserFile, writeUserFile } = require('./utils/userData')

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
// Note: Groq doesn't have vision models - for image analysis, we use Claude or Gemini as fallback
const VISION_MODEL = process.env.GROQ_VISION_MODEL || null

const KEYWORDS = [
  'exam', 'test', 'quiz', 'assignment', 'submission', 'deadline', 'class', 'lecture',
  'lab', 'practical', 'workshop', 'seminar', 'viva', 'project', 'mid', 'semester',
  'schedule', 'timetable', 'rescheduled', 'postponed', 'cancelled', 'tomorrow',
  'today', 'next week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
]

function isPotentialEventMessage(text = '') {
  if (!text || typeof text !== 'string') return false
  const lower = text.toLowerCase()
  return KEYWORDS.some((keyword) => lower.includes(keyword))
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function isUpcoming(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return date >= today
}

function dedupeEvents(events) {
  const seen = new Set()
  return events.filter((event) => {
    const key = `${event.title}::${event.date}::${event.time || '09:00'}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function llmPrompt(content, groupName) {
  return `You are an assistant that extracts upcoming academic events from WhatsApp messages.

Today is ${todayISO()}.
Group: ${groupName}

Return ONLY a JSON array. No markdown and no explanation.
If no valid upcoming events are present, return [].

Each event object shape:
{
  "title": "short clear title",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "duration": 60,
  "sub": "subject/location/details",
  "type": "exam|class|lab|assignment|holiday|other",
  "color": "pink|blue|green|amber|gray"
}

Message content:
${content}`
}

async function callGroq(messages, model) {
  if (!GROQ_API_KEY) return ''

  const res = await axios.post(
    GROQ_API_URL,
    {
      model,
      messages,
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    },
    {
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return res.data?.choices?.[0]?.message?.content || ''
}

async function analyzeTextWithGroq(text, groupName) {
  if (!text || !isPotentialEventMessage(text)) return []

  try {
    const raw = await callGroq(
      [
        { role: 'system', content: 'Extract upcoming events only. Return strict JSON object: {"events": [...] }.' },
        { role: 'user', content: llmPrompt(text, groupName) },
      ],
      TEXT_MODEL
    )

    if (!raw) return []
    const parsed = JSON.parse(raw)
    const events = extractEvents(JSON.stringify(parsed.events || []), groupName)
    return dedupeEvents(events).filter((event) => isUpcoming(event.date))
  } catch (err) {
    console.error(`[Processor] Text analysis failed: ${err.message}`)
    const fallback = extractEvents(text, groupName)
    return dedupeEvents(fallback).filter((event) => isUpcoming(event.date))
  }
}

async function analyzeImageWithGroq(media, groupName, caption = '') {
  // Guard: Return empty array if no vision model configured or no media
  if (!media?.buffer || !VISION_MODEL) {
    if (!VISION_MODEL) {
      console.log('[Processor] Skipping image analysis - no vision model configured')
    }
    return []
  }

  try {
    const dataUrl = `data:${media.mimeType || 'image/jpeg'};base64,${media.buffer.toString('base64')}`
    const prompt = `${llmPrompt(caption || 'Analyze this shared schedule image for upcoming events.', groupName)}\nRead details from the image.`

    const raw = await callGroq(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      VISION_MODEL
    )

    if (!raw) return []
    const parsed = JSON.parse(raw)
    const events = extractEvents(JSON.stringify(parsed.events || []), groupName)
    return dedupeEvents(events).filter((event) => isUpcoming(event.date))
  } catch (err) {
    console.error(`[Processor] Image analysis failed: ${err.message}`)
    return []
  }
}

async function analyzePdfWithGroq(media, groupName, caption = '') {
  if (!media?.buffer) return []

  try {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(media.buffer)
    const text = data.text?.slice(0, 12000) || ''
    if (!text.trim()) return []
    return analyzeTextWithGroq(`${caption}\n\n${text}`, groupName)
  } catch (err) {
    console.error(`[Processor] PDF analysis failed: ${err.message}`)
    return []
  }
}

function saveIncomingMessage(userId, message) {
  const existing = readUserFile(userId, 'incoming-messages.json') || []
  const withoutCurrent = existing.filter((item) => item.id !== message.id)
  withoutCurrent.unshift(message)
  writeUserFile(userId, 'incoming-messages.json', withoutCurrent.slice(0, 300))
}

function pushEvents(userId, events) {
  if (!events.length) return
  const existing = readUserFile(userId, 'events.json') || []
  writeUserFile(userId, 'events.json', [...existing, ...events])
}

async function processIncomingMessage(userId, incomingMessage) {
  const groupName = incomingMessage.groupName || 'WhatsApp Group'
  const preview = (incomingMessage.text || '').slice(0, 240)

  const record = {
    id: incomingMessage.id || `${Date.now()}`,
    groupId: incomingMessage.groupId,
    groupName,
    messageType: incomingMessage.messageType,
    text: preview,
    timestamp: incomingMessage.timestamp || Date.now(),
    hasEventIntent: isPotentialEventMessage(incomingMessage.text || ''),
    isValidUpcomingEvent: false,
    extractedEvents: 0,
  }

  saveIncomingMessage(userId, record)

  let events = []

  if (incomingMessage.messageType === 'conversation' || incomingMessage.messageType === 'extendedTextMessage') {
    events = await analyzeTextWithGroq(incomingMessage.text || '', groupName)
  }

  if (incomingMessage.messageType === 'imageMessage') {
    events = await analyzeImageWithGroq(incomingMessage.media, groupName, incomingMessage.text || '')
  }

  if (incomingMessage.messageType === 'documentMessage') {
    const mime = incomingMessage.media?.mimeType || ''
    if (mime.includes('pdf') || (incomingMessage.media?.fileName || '').toLowerCase().endsWith('.pdf')) {
      events = await analyzePdfWithGroq(incomingMessage.media, groupName, incomingMessage.text || '')
    }
  }

  if (events.length) {
    pushEvents(userId, events)
    record.isValidUpcomingEvent = true
    record.extractedEvents = events.length
    saveIncomingMessage(userId, record)
    console.log(`[Processor] Added ${events.length} upcoming event(s) for ${userId} from ${groupName}`)
  }
}

module.exports = {
  processIncomingMessage,
  isPotentialEventMessage,
}
