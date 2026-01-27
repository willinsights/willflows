import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'willflow_cookie_consent';

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

const defaultPreferences: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  timestamp: '',
};

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const prefsWithTimestamp = {
      ...prefs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefsWithTimestamp));
    setShowBanner(false);
    setShowSettings(false);
    
    if (prefs.analytics) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }
  };

  const enableAnalytics = () => {
    // Update Google Consent Mode v2 to granted
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'analytics_storage': 'granted'
      });
    }
  };

  const disableAnalytics = () => {
    // Update Google Consent Mode v2 to denied
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied'
      });
    }
    
    // Clean up existing cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gcl')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.willflow.app`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      functional: true,
      analytics: true,
      timestamp: '',
    });
  };

  const rejectNonEssential = () => {
    savePreferences({
      essential: true,
      functional: false,
      analytics: false,
      timestamp: '',
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-4 right-4 left-4 md:left-auto z-50"
        >
          <div className="bg-background/95 backdrop-blur-md border border-border/60 rounded-xl shadow-lg p-4 md:max-w-md">
            {!showSettings ? (
              // Compact main banner
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Cookie className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    Usamos cookies para melhorar a experiência.{' '}
                    <Link to="/cookies" className="text-primary hover:underline">
                      Saiba mais
                    </Link>
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="h-8 px-2"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectNonEssential}
                    className="h-8 text-xs"
                  >
                    Essenciais
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="h-8 text-xs"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Aceitar
                  </Button>
                </div>
              </div>
            ) : (
              // Compact settings panel
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Preferências de Cookies</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Essential */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Essenciais</p>
                      <p className="text-xs text-muted-foreground">Necessários</p>
                    </div>
                    <Switch checked disabled />
                  </div>

                  {/* Functional */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Funcionais</p>
                      <p className="text-xs text-muted-foreground">Preferências</p>
                    </div>
                    <Switch
                      checked={preferences.functional}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({ ...prev, functional: checked }))
                      }
                    />
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Analytics</p>
                      <p className="text-xs text-muted-foreground">Estatísticas</p>
                    </div>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({ ...prev, analytics: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="flex-1 h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveCustomPreferences}
                    className="flex-1 h-8 text-xs"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to check cookie consent
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  const hasConsent = (type: keyof Omit<CookiePreferences, 'timestamp'>) => {
    return consent?.[type] ?? false;
  };

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.location.reload();
  };

  return { consent, hasConsent, resetConsent };
}
