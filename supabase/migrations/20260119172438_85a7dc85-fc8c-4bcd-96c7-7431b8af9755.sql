-- Create table for user push notification preferences
CREATE TABLE public.user_push_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  push_enabled BOOLEAN DEFAULT false,
  events_enabled BOOLEAN DEFAULT true,
  deadlines_enabled BOOLEAN DEFAULT true,
  advance_hours INTEGER DEFAULT 24,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_push_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own preferences"
ON public.user_push_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_push_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_push_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_push_preferences_updated_at
BEFORE UPDATE ON public.user_push_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();