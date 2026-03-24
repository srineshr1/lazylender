/**
 * Supabase Query Helpers
 * Reusable functions for common database operations
 */

import getSupabaseClient from './supabase'

/**
 * Get the current user's profile
 */
export async function getUserProfile() {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * Update the current user's profile settings
 */
export async function updateProfileSettings(settings) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .update({ settings, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch all events for the current user
 */
export async function fetchEvents() {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Insert a new event
 */
export async function insertEvent(event) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('events')
    .insert([{ ...event, user_id: user.id }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing event
 */
export async function updateEvent(id, changes) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('events')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an event
 */
export async function deleteEvent(id) {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

/**
 * Fetch all chat messages for the current user
 */
export async function fetchChatMessages() {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Insert a new chat message
 */
export async function insertChatMessage(message) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ ...message, user_id: user.id }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete all chat messages for the current user
 */
export async function clearChatMessages() {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id)

  if (error) throw error
  return true
}

/**
 * Subscribe to real-time changes for events
 */
export function subscribeToEvents(callback) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const subscription = supabase
    .channel('events_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
      },
      callback
    )
    .subscribe()

  return subscription
}

/**
 * Subscribe to real-time changes for chat messages
 */
export function subscribeToChatMessages(callback) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const subscription = supabase
    .channel('chat_messages_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
      },
      callback
    )
    .subscribe()

  return subscription
}
