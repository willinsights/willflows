import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShareAnalytics {
  post_id: string;
  post_title: string;
  twitter: number;
  linkedin: number;
  facebook: number;
  copy_link: number;
  total: number;
}

interface PlatformTotals {
  twitter: number;
  linkedin: number;
  facebook: number;
  copy_link: number;
  total: number;
}

export function useBlogShareAnalytics() {
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['blog-share-analytics'],
    queryFn: async () => {
      // Get all shares with post info
      const { data: shares, error } = await supabase
        .from('blog_share_analytics')
        .select(`
          post_id,
          platform,
          blog_posts!inner(title)
        `);

      if (error) throw error;

      // Aggregate by post
      const postMap = new Map<string, ShareAnalytics>();
      
      shares?.forEach((share: any) => {
        const postId = share.post_id;
        const platform = share.platform as keyof Omit<ShareAnalytics, 'post_id' | 'post_title' | 'total'>;
        
        if (!postMap.has(postId)) {
          postMap.set(postId, {
            post_id: postId,
            post_title: share.blog_posts?.title || 'Unknown',
            twitter: 0,
            linkedin: 0,
            facebook: 0,
            copy_link: 0,
            total: 0
          });
        }
        
        const entry = postMap.get(postId)!;
        entry[platform]++;
        entry.total++;
      });

      return Array.from(postMap.values()).sort((a, b) => b.total - a.total);
    }
  });

  const { data: platformTotals } = useQuery({
    queryKey: ['blog-share-platform-totals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_share_analytics')
        .select('platform');

      if (error) throw error;

      const totals: PlatformTotals = {
        twitter: 0,
        linkedin: 0,
        facebook: 0,
        copy_link: 0,
        total: 0
      };

      data?.forEach((share) => {
        const platform = share.platform as keyof Omit<PlatformTotals, 'total'>;
        totals[platform]++;
        totals.total++;
      });

      return totals;
    }
  });

  return {
    analytics: analytics || [],
    platformTotals: platformTotals || { twitter: 0, linkedin: 0, facebook: 0, copy_link: 0, total: 0 },
    isLoading,
    error,
    refetch
  };
}
