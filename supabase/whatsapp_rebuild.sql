-- =============================================
-- WhatsApp Bridge Rebuild — Supabase as single source of truth
-- =============================================
-- Run in Supabase SQL Editor. Idempotent.
-- Drops the old file-backed bridge state in favor of these tables.
--
-- Tables added:
--   whatsapp_status         per-user connection state (realtime)
--   whatsapp_chats          groups + 1:1 contacts list
--   whatsapp_watched_groups which chats are monitored for events
--   whatsapp_events         extracted events queue (realtime; deleted after consumed)

-- ----------------------------------------------------------------------------
-- whatsapp_status: one row per user, mutable
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DISCONNECTED'
    CHECK (status IN ('DISCONNECTED','CONNECTING','QR_READY','AUTHENTICATING','CONNECTED','FAILED')),
  qr TEXT,
  message TEXT,
  connected BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own status" ON public.whatsapp_status;
CREATE POLICY "select own status" ON public.whatsapp_status
  FOR SELECT USING (auth.uid() = user_id);

-- Bridge writes via service role; clients only read.

-- ----------------------------------------------------------------------------
-- whatsapp_chats: group + contact directory per user
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  participant_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, chat_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_chats_user_idx ON public.whatsapp_chats(user_id);

ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own chats" ON public.whatsapp_chats;
CREATE POLICY "select own chats" ON public.whatsapp_chats
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- whatsapp_watched_groups: which chats are monitored
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_watched_groups (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, chat_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_watched_user_idx ON public.whatsapp_watched_groups(user_id);

ALTER TABLE public.whatsapp_watched_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own watched" ON public.whatsapp_watched_groups;
CREATE POLICY "select own watched" ON public.whatsapp_watched_groups
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert own watched" ON public.whatsapp_watched_groups;
CREATE POLICY "insert own watched" ON public.whatsapp_watched_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete own watched" ON public.whatsapp_watched_groups;
CREATE POLICY "delete own watched" ON public.whatsapp_watched_groups
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- whatsapp_events: extracted events queue (realtime)
-- Bridge inserts; frontend selects + deletes after consuming.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL DEFAULT '09:00',
  duration INTEGER NOT NULL DEFAULT 60,
  group_name TEXT,
  color TEXT NOT NULL DEFAULT 'blue',
  source_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_events_user_idx ON public.whatsapp_events(user_id, created_at);

ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own pending events" ON public.whatsapp_events;
CREATE POLICY "select own pending events" ON public.whatsapp_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete own pending events" ON public.whatsapp_events;
CREATE POLICY "delete own pending events" ON public.whatsapp_events
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Realtime publication
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_status;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_watched_groups;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
