import { useEffect, useCallback } from 'react';
import { X, Download, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function ImageLightbox({ src, alt, onClose, onDownload }: ImageLightboxProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Download Button */}
      {onDownload && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-16 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          <Download className="h-5 w-5" />
        </Button>
      )}

      {/* Image Container */}
      <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          className={cn(
            'max-w-full max-h-[90vh] object-contain rounded-lg',
            'shadow-2xl animate-in zoom-in-95 duration-200'
          )}
        />
        
        {/* Image Info */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full text-white text-sm backdrop-blur-sm">
          {alt}
        </div>
      </div>
    </div>
  );
}
