import { Button } from '@/components/ui/button';
import { Twitter, Linkedin, Facebook, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareTwitter = () => {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  const shareLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`;
    window.open(shareUrl, '_blank', 'width=600,height=600,noopener,noreferrer');
  };

  const shareFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
    window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  const copyLink = async () => {
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
