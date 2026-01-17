import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate a unique session ID for this browser session
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('wf_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('wf_session_id', sessionId);
  }
  return sessionId;
};

// Track page views for analytics
export const usePageTracking = () => {
  const location = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const trackPageView = async () => {
      const path = location.pathname;
      
      // Don't track app routes (protected areas) or duplicate views
      if (path.startsWith('/app') || path === lastTrackedPath.current) {
        return;
      }

      lastTrackedPath.current = path;

      try {
        const sessionId = getSessionId();
        
        await supabase.from('page_views').insert({
          page_path: path,
          page_title: document.title,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          session_id: sessionId,
        });
      } catch (error) {
        // Silent fail - don't disrupt user experience
        console.debug('Page tracking error:', error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};

// Track blog post views
export const trackBlogView = async (postId: string) => {
  if (!postId) {
    console.error('[BlogTracking] No postId provided');
    return;
  }

  try {
    const sessionId = getSessionId();
    
    // Check if we already tracked this post in this session
    const viewedPosts = sessionStorage.getItem('wf_viewed_posts');
    const viewedSet = new Set(viewedPosts ? JSON.parse(viewedPosts) : []);
    
    if (viewedSet.has(postId)) {
      console.debug('[BlogTracking] Already tracked post:', postId);
      return;
    }
    
    const { error } = await supabase.from('blog_views').insert({
      post_id: postId,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: sessionId,
    });

    if (error) {
      console.error('[BlogTracking] Failed to insert view:', error.message, error.details);
      return;
    }

    // Mark as tracked
    viewedSet.add(postId);
    sessionStorage.setItem('wf_viewed_posts', JSON.stringify([...viewedSet]));
    console.debug('[BlogTracking] View recorded for post:', postId);
  } catch (error) {
    console.error('[BlogTracking] Unexpected error:', error);
  }
};
