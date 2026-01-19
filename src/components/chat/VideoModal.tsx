import { useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoModalProps {
  src: string;
  name: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function VideoModal({ src, name, onClose, onDownload }: VideoModalProps) {
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

      {/* Video Container */}
      <div className="relative max-w-[90vw] max-h-[90vh] w-full max-w-4xl animate-in zoom-in-95 duration-200">
        <video
          src={src}
          controls
          autoPlay
          className="w-full max-h-[80vh] rounded-lg shadow-2xl bg-black"
        />
        
        {/* Video Info */}
        <div className="mt-3 text-center">
          <p className="text-white text-sm px-4 py-2 bg-black/60 rounded-full inline-block backdrop-blur-sm">
            {name}
          </p>
        </div>
      </div>
    </div>
  );
}
