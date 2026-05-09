const axios = require('axios')
const { extractEvents } = require('./extractor')
const { getSupabase } = require('./supabaseClient')

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.GROQ_API_KEY
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const VISION_MODEL = process.env.GROQ_VISION_MODEL || null

const KEYWORDS = [
  'exam', 'test', 'quiz', 'assignment', 'submission', 'deadline', 'class', 'lecture',
  'lab', 'practical', 'workshop', 'seminar', 'viva', 'project', 'mid', 'semester',
  'schedule', 'timetable', 'rescheduled', 'postponed', 'cancelled', 'tomorrow',
  'today', 'next week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
]

const VALID_COLORS = new Set(['pink', 'green', 'blue', 'amber', 'gray'])

function isPotentialEventMessage(text = '') {
  if (!text || typeof text !== 'string') return false
  const lower = text.toLowerCase()
  return KEYWORDS.some((k) => lower.includes(k))
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

function dedupe(events) {
  const seen = new Set()
  return events.filter((e) => {
    const key = `${e.title}::${e.date}::${e.time || '09:00'}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function llmPrompt(content, groupName) {
  return `You are an assistant that extracts upcoming academic events from WhatsApp messages.

Today is ${todayISO()}.
Group: ${groupName}

Return ONLY a JSON object: {"events": [...]}. No markdown, no explanation.
If no valid upcoming events, return {"events": []}.

Each event:
{ "title": "short clear title", "date": "YYYY-MM-DD", "time": "HH:MM",
  "duration": 60, "sub": "subject/location", "type": "exam|class|lab|assignment|holiday|other",
  "color": "pink|blue|green|amber|gray" }

Message:
${content}`
}

async function callGroq(messages, model) {
  if (!GROQ_API_KEY) return ''
  const res = await axios.post(GROQ_API_URL, {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  }, {
    timeout: 30000,
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
  })
  return res.data?.choices?.[0]?.message?.content || ''
}

async function analyzeText(text, groupName) {
  if (!text || !isPotentialEventMessage(text)) return []
  try {
    const raw = await callGroq([
      { role: 'system', content: 'Extract upcoming events only. Return JSON {"events":[...]}. No markdown.' },
      { role: 'user', content: llmPrompt(text, groupName) },
    ], TEXT_MODEL)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : (parsed.events ?? [])
    const events = extractEvents(JSON.stringify(arr), groupName)
    return dedupe(events).filter((e) => isUpcoming(e.date))
  } catch (err) {
    console.error(`[Processor] text analysis failed: ${err.message}`)
    const fallback = extractEvents(text, groupName)
    return dedupe(fallback).filter((e) => isUpcoming(e.date))
  }
}

async function analyzeImage(media, groupName, caption = '') {
  if (!media?.buffer || !VISION_MODEL) return []
  try {
    const dataUrl = `data:${media.mimeType || 'image/jpeg'};base64,${media.buffer.toString('base64')}`
    const prompt = `${llmPrompt(caption || 'Analyze this shared schedule image for upcoming events.', groupName)}\nRead details from the image.`
    const raw = await callGroq([{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }], VISION_MODEL)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : (parsed.events ?? [])
    const events = extractEvents(JSON.stringify(arr), groupName)
    return dedupe(events).filter((e) => isUpcoming(e.date))
  } catch (err) {
    console.error(`[Processor] image analysis failed: ${err.message}`)
    return []
  }
}

async function analyzePdf(media, groupName, caption = '') {
  if (!media?.buffer) return []
  try {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(media.buffer)
    const text = data.text?.slice(0, 12000) || ''
    if (!text.trim()) return []
    return analyzeText(`${caption}\n\n${text}`, groupName)
  } catch (err) {
    console.error(`[Processor] pdf analysis failed: ${err.message}`)
    return []
  }
}

async function pushEvents(userId, sourceMsgId, events) {
  if (!events.length) return
  const supabase = getSupabase()
  const rows = events.map((e) => ({
    user_id: userId,
    title: String(e.title).slice(0, 200),
    date: e.date,
    time: e.time || '09:00',
    duration: Math.min(Math.max(parseInt(e.duration) || 60, 15), 1440),
    group_name: (e.group || e.sub || 'WhatsApp').slice(0, 100),
    color: VALID_COLORS.has(e.color) ? e.color : 'blue',
    source_message_id: sourceMsgId || null,
  }))
  const { error } = await supabase.from('whatsapp_events').insert(rows)
  if (error) console.error(`[Processor] insert events failed for ${userId}:`, error.message)
  else console.log(`[Processor] queued ${rows.length} event(s) for ${userId}`)
}

async function processIncomingMessage(userId, msg) {
  const groupName = msg.groupName || 'WhatsApp Group'
  const preview = (msg.text || '').slice(0, 80)
  console.log(`[Processor] ${userId} <- ${groupName}: "${preview}" (${msg.messageType})`)

  let events = []
  if (['chat', 'conversation', 'extendedTextMessage'].includes(msg.messageType)) {
    events = await analyzeText(msg.text || '', groupName)
  } else if (msg.messageType === 'image') {
    events = await analyzeImage(msg.media, groupName, msg.text || '')
  } else if (msg.messageType === 'document') {
    const mime = msg.media?.mimeType || ''
    const fname = (msg.media?.fileName || '').toLowerCase()
    if (mime.includes('pdf') || fname.endsWith('.pdf')) {
      events = await analyzePdf(msg.media, groupName, msg.text || '')
    }
  }

  if (events.length) await pushEvents(userId, msg.id, events)
}

module.exports = { processIncomingMessage, isPotentialEventMessage }
