-- =============================================
-- MULTI-TENANT WHATSAPP BRIDGE SCHEMA
-- =============================================

-- Create bridge API keys table
CREATE TABLE IF NOT EXISTS public.bridge_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.bridge_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own API key"
  ON public.bridge_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API key"
  ON public.bridge_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API key"
  ON public.bridge_api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bridge_api_keys_user_id ON public.bridge_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_bridge_api_keys_api_key ON public.bridge_api_keys(api_key);

-- Auto-generate API key function
CREATE OR REPLACE FUNCTION generate_bridge_api_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key IS NULL OR NEW.api_key = '' THEN
    NEW.api_key := 'wa_bridge_' || encode(gen_random_bytes(24), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS generate_api_key_trigger ON public.bridge_api_keys;
CREATE TRIGGER generate_api_key_trigger
  BEFORE INSERT ON public.bridge_api_keys
  FOR EACH ROW EXECUTE FUNCTION generate_bridge_api_key();

-- Helper function for frontend
CREATE OR REPLACE FUNCTION get_or_create_bridge_api_key()
RETURNS TABLE(api_key VARCHAR) AS $$
DECLARE
  existing_key VARCHAR;
  new_key VARCHAR;
BEGIN
  SELECT bridge_api_keys.api_key INTO existing_key
  FROM public.bridge_api_keys
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF existing_key IS NOT NULL THEN
    UPDATE public.bridge_api_keys
    SET last_used_at = NOW()
    WHERE user_id = auth.uid();
    RETURN QUERY SELECT existing_key;
  ELSE
    INSERT INTO public.bridge_api_keys (user_id)
    VALUES (auth.uid())
    RETURNING bridge_api_keys.api_key INTO new_key;
    RETURN QUERY SELECT new_key;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add WhatsApp columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bridge_user_id UUID,
  ADD COLUMN IF NOT EXISTS has_whatsapp_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ;

-- Grant execute on function to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_bridge_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_bridge_api_key() TO anon;

-- =============================================
-- VERIFICATION QUERIES (Run these to confirm setup)
-- =============================================

-- Check if table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'bridge_api_keys';

-- Check if columns added to profiles
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('bridge_user_id', 'has_whatsapp_connected', 'whatsapp_connected_at');
