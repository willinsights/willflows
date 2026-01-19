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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {/* Top Actions Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {/* Zoom Hint */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs backdrop-blur-sm">
          <ZoomIn className="h-3.5 w-3.5" />
          <span>Clique para fechar</span>
        </div>

        {/* Download Button */}
        {onDownload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="h-5 w-5" />
          </Button>
        )}

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Image Container */}
      <div 
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        style={{ animation: 'scaleIn 0.25s ease-out' }}
      >
        <img
          src={src}
          alt={alt}
          className={cn(
            'max-w-full max-h-[90vh] object-contain rounded-lg',
            'shadow-2xl'
          )}
        />
        
        {/* Image Info */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full text-white text-sm backdrop-blur-sm max-w-[80%] truncate">
          {alt}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
