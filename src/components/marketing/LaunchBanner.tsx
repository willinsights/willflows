import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Launch promotion ends on March 31, 2025
const PROMO_END_DATE = new Date('2025-03-31T23:59:59');
const BANNER_DISMISSED_KEY = 'launch_banner_dismissed';

function calculateTimeLeft(): TimeLeft {
  const difference = PROMO_END_DATE.getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

interface LaunchBannerProps {
  variant?: 'floating' | 'inline';
}

export function LaunchBanner({ variant = 'floating' }: LaunchBannerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }
    
    // Show banner after a small delay for better UX
    const showTimer = setTimeout(() => setIsVisible(true), 1000);
    
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    }, 300);
  };

  // Don't show if promotion has ended or dismissed
  if (isDismissed || timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return null;
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className="text-lg sm:text-xl font-bold text-white tabular-nums">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  if (variant === 'inline') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">🎉 Bónus de Lançamento</h3>
              <p className="text-sm text-muted-foreground">
                30 dias grátis para novos utilizadores!
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Termina em {timeLeft.days}d {timeLeft.hours}h</span>
            </div>
            <Link to="/auth?trial=true">
              <Button size="sm" className="gradient-primary">
                Começar grátis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 md:max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary via-primary/90 to-[hsl(280,80%,50%)] p-4 md:p-5 shadow-2xl shadow-primary/30">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse delay-1000" />
            </div>
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              aria-label="Fechar banner"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="relative">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-yellow-300" />
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wide">
                  Bónus de Lançamento
                </span>
              </div>
              
              {/* Main message */}
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                🎉 30 dias grátis!
              </h3>
              <p className="text-sm text-white/80 mb-4">
                Experimenta o WillFlow sem compromisso. Oferta por tempo limitado!
              </p>
              
              {/* Countdown */}
              <div className="flex items-center gap-1 mb-4 p-3 rounded-xl bg-black/20 backdrop-blur-sm">
                <span className="text-xs text-white/60 mr-2">Termina em:</span>
                <TimeBlock value={timeLeft.days} label="dias" />
                <span className="text-white/40 mx-1">:</span>
                <TimeBlock value={timeLeft.hours} label="hrs" />
                <span className="text-white/40 mx-1">:</span>
                <TimeBlock value={timeLeft.minutes} label="min" />
                <span className="text-white/40 mx-1 hidden sm:inline">:</span>
                <div className="hidden sm:block">
                  <TimeBlock value={timeLeft.seconds} label="seg" />
                </div>
              </div>
              
              {/* CTA */}
              <Link to="/auth?trial=true" className="block">
                <Button 
                  className="w-full bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
                  size="lg"
                >
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
