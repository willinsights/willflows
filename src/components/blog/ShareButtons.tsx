import { Button } from '@/components/ui/button';
import { Twitter, Linkedin, Facebook, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface ShareButtonsProps {
  url: string;
  title: string;
  postId?: string;
}

export function ShareButtons({ url, title, postId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const trackShare = async (platform: 'twitter' | 'linkedin' | 'facebook' | 'copy_link') => {
    if (!postId) return;
    
    try {
      await supabase.from('blog_share_analytics').insert({
        post_id: postId,
        platform,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null
      });
    } catch (error) {
      logger.error('Failed to track share:', error);
    }
  };

  const shareTwitter = () => {
    trackShare('twitter');
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const shareLinkedIn = () => {
    trackShare('linkedin');
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const shareFacebook = () => {
    trackShare('facebook');
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const copyLink = async () => {
    trackShare('copy_link');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={shareTwitter}
        className="h-9 w-9 rounded-full"
        title="Partilhar no X (Twitter)"
      >
        <Twitter className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={shareLinkedIn}
        className="h-9 w-9 rounded-full"
        title="Partilhar no LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={shareFacebook}
        className="h-9 w-9 rounded-full"
        title="Partilhar no Facebook"
      >
        <Facebook className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={copyLink}
        className="h-9 w-9 rounded-full"
        title="Copiar link"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}
