-- Tighten table privileges to prevent anonymous reads
REVOKE ALL ON TABLE public.system_admins FROM anon;

-- Ensure authenticated users can still read (RLS will restrict to system admins only)
GRANT SELECT ON TABLE public.system_admins TO authenticated;

-- Service role keeps full access for backend operations
GRANT ALL ON TABLE public.system_admins TO service_role;