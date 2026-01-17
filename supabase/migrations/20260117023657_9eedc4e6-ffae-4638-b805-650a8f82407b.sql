-- Create blog auto settings table for scheduling
CREATE TABLE public.blog_auto_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  articles_per_day integer DEFAULT 1 CHECK (articles_per_day >= 1 AND articles_per_day <= 5),
  auto_publish boolean DEFAULT false,
  preferred_topics text[] DEFAULT ARRAY['fotografia', 'video', 'produção audiovisual', 'gestão de projetos'],
  preferred_categories text[] DEFAULT ARRAY['novidades', 'dicas', 'tutorial'],
  schedule_hour integer DEFAULT 9 CHECK (schedule_hour >= 0 AND schedule_hour <= 23),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one row allowed (singleton config)
CREATE UNIQUE INDEX blog_auto_settings_singleton ON public.blog_auto_settings ((true));

-- Enable RLS
ALTER TABLE public.blog_auto_settings ENABLE ROW LEVEL SECURITY;

-- Super admin policy (only willdesign7@gmail.com can manage)
CREATE POLICY "Super admins can view auto settings"
  ON public.blog_auto_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can insert auto settings"
  ON public.blog_auto_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can update auto settings"
  ON public.blog_auto_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Insert default settings
INSERT INTO public.blog_auto_settings (is_enabled, articles_per_day, auto_publish, schedule_hour)
VALUES (false, 1, false, 9);

-- Trigger to update updated_at
CREATE TRIGGER update_blog_auto_settings_updated_at
  BEFORE UPDATE ON public.blog_auto_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();