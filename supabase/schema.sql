-- =============================================
-- AI Calendar - Supabase Database Schema
-- =============================================
-- Execute this SQL in your Supabase SQL Editor
-- This sets up all tables, RLS policies, and triggers

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
-- Stores user profile information and settings
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{
    "accentColor": "#3b82f6",
    "fontSize": "medium",
    "compactMode": false,
    "defaultView": "week",
    "weekStart": "monday",
    "timeFormat": "24h",
    "firstDayOfWeek": 1,
    "workingHours": {"start": 9, "end": 17},
    "showWeekNumbers": false,
    "enableNotifications": true,
    "notificationSound": true,
    "notificationTime": 15
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 2. EVENTS TABLE
-- =============================================
-- Stores calendar events for each user
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  sub TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  color TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE NOT NULL,
  cancelled BOOLEAN DEFAULT FALSE NOT NULL,
  recurrence TEXT DEFAULT 'none' NOT NULL,
  recurrence_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events(date);
CREATE INDEX IF NOT EXISTS events_user_date_idx ON public.events(user_id, date);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own events
CREATE POLICY "Users can view own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own events
CREATE POLICY "Users can insert own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own events
CREATE POLICY "Users can update own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 3. CHAT MESSAGES TABLE
-- =============================================
-- Stores AI chat conversation history for each user
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_timestamp_idx ON public.chat_messages(timestamp);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own messages
CREATE POLICY "Users can view own messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own messages
CREATE POLICY "Users can insert own messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 4. FUNCTIONS & TRIGGERS
-- =============================================

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update updated_at on events
DROP TRIGGER IF EXISTS on_event_updated ON public.events;
CREATE TRIGGER on_event_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 5. REALTIME CONFIGURATION
-- =============================================
-- Enable realtime for tables (execute in Supabase dashboard)
-- This allows real-time subscriptions to table changes

-- Note: Execute these commands in the Supabase Dashboard under "Database" > "Replication"
-- or via SQL:

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- =============================================
-- 4. WHATSAPP BRIDGE API KEYS TABLE
-- =============================================
-- Stores WhatsApp bridge API keys for multi-tenant isolation
CREATE TABLE IF NOT EXISTS public.bridge_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id)  -- One API key per user
);

-- Enable Row Level Security
ALTER TABLE public.bridge_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own API key
CREATE POLICY "Users can view own API key"
  ON public.bridge_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own API key
CREATE POLICY "Users can insert own API key"
  ON public.bridge_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own API key
CREATE POLICY "Users can update own API key"
  ON public.bridge_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_bridge_api_keys_user_id ON public.bridge_api_keys(user_id);
CREATE INDEX idx_bridge_api_keys_api_key ON public.bridge_api_keys(api_key);

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_bridge_api_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key IS NULL OR NEW.api_key = '' THEN
    NEW.api_key := 'wa_bridge_' || encode(gen_random_bytes(24), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate API key
CREATE TRIGGER generate_api_key_trigger
  BEFORE INSERT ON public.bridge_api_keys
  FOR EACH ROW EXECUTE FUNCTION generate_bridge_api_key();

-- Function to create API key for user (can be called from frontend)
CREATE OR REPLACE FUNCTION get_or_create_bridge_api_key()
RETURNS TABLE(api_key VARCHAR) AS $$
DECLARE
  existing_key VARCHAR;
  new_key VARCHAR;
BEGIN
  -- Check if user already has an API key
  SELECT bridge_api_keys.api_key INTO existing_key
  FROM public.bridge_api_keys
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF existing_key IS NOT NULL THEN
    -- Update last_used_at
    UPDATE public.bridge_api_keys
    SET last_used_at = NOW()
    WHERE user_id = auth.uid();
    
    RETURN QUERY SELECT existing_key;
  ELSE
    -- Create new API key
    INSERT INTO public.bridge_api_keys (user_id)
    VALUES (auth.uid())
    RETURNING bridge_api_keys.api_key INTO new_key;
    
    RETURN QUERY SELECT new_key;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add WhatsApp bridge columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bridge_user_id UUID,
  ADD COLUMN IF NOT EXISTS has_whatsapp_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ;

-- =============================================
-- SETUP COMPLETE
-- =============================================
-- Your database is now ready for the AI Calendar application!
-- 
-- Next steps:
-- 1. Copy your Supabase project URL and anon key to your .env file
-- 2. Configure Google OAuth in Supabase Auth settings
-- 3. Test the authentication flow
-- 4. Register with WhatsApp bridge to get API key
