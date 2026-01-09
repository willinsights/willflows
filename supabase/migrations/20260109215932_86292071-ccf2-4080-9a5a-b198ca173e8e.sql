-- Remove the old redundant policy since the new one covers it
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;