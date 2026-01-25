-- Create system_settings table for global configuration
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only system admins can view settings
CREATE POLICY "System admins can view settings"
ON public.system_settings
FOR SELECT
USING (public.is_system_admin());

-- Only system admins can update settings
CREATE POLICY "System admins can update settings"
ON public.system_settings
FOR UPDATE
USING (public.is_system_admin());

-- Only system admins can insert settings
CREATE POLICY "System admins can insert settings"
ON public.system_settings
FOR INSERT
WITH CHECK (public.is_system_admin());

-- Insert default trial settings
INSERT INTO public.system_settings (key, value) 
VALUES ('trial', '{"default_days": 30, "warning_days": 2}'::jsonb)
ON CONFLICT (key) DO NOTHING;