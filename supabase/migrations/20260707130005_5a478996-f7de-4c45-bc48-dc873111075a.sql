
-- feedback: remove legacy workspace-admin policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;

-- blog_posts: remove legacy workspace-admin policy
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;

-- beta_invite_tokens: remove legacy workspace-admin policies
DROP POLICY IF EXISTS "Only admins can view all tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Admins can insert beta invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Admins can update beta invite tokens" ON public.beta_invite_tokens;
DROP POLICY IF EXISTS "Admins can delete beta invite tokens" ON public.beta_invite_tokens;

-- beta_waitlist: remove legacy workspace-admin policies
DROP POLICY IF EXISTS "Admins can view beta waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Admins can update beta waitlist" ON public.beta_waitlist;
DROP POLICY IF EXISTS "Admins can delete from beta waitlist" ON public.beta_waitlist;
