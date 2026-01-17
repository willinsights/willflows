import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const COOKIE_CONSENT_KEY = 'willflow_cookie_consent';

interface CookiePreferences {
  essential: boolean; // Always true
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
    // Check if user has already made a choice
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      // Small delay to avoid flash on page load
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
    
    // Apply preferences (e.g., enable/disable analytics)
    if (prefs.analytics) {
      // Enable analytics cookies
      enableAnalytics();
    } else {
      // Disable analytics cookies
      disableAnalytics();
    }
  };

  const enableAnalytics = () => {
    // Initialize Google Analytics or other analytics tools
    // This is where you'd enable tracking
    console.log('Analytics enabled');
  };

  const disableAnalytics = () => {
    // Disable Google Analytics or other analytics tools
    // Remove existing analytics cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('_ga') || name.startsWith('_gid')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
    console.log('Analytics disabled');
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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="container mx-auto max-w-4xl">
            <div className="glass-card border border-border/50 shadow-2xl p-6 md:p-8">
              {!showSettings ? (
                // Main banner
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Cookie className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">
                        Utilizamos cookies 🍪
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Usamos cookies para melhorar a sua experiência. Cookies essenciais são necessários 
                        para o funcionamento do site. Pode aceitar todos os cookies ou personalizar as suas preferências.{' '}
                        <Link to="/cookies" className="text-primary hover:underline">
                          Saiba mais
                        </Link>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="order-3 sm:order-1"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Personalizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={rejectNonEssential}
                      className="order-2"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Apenas essenciais
                    </Button>
                    <Button
                      size="sm"
                      onClick={acceptAll}
                      className="gradient-primary order-1 sm:order-3"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aceitar todos
                    </Button>
                  </div>
                </div>
              ) : (
                // Settings panel
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Preferências de Cookies</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Essential Cookies */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label className="font-medium">Cookies Essenciais</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Necessários para o funcionamento básico do site. Não podem ser desativados.
                        </p>
                      </div>
                      <Switch checked disabled className="opacity-50" />
                    </div>

                    {/* Functional Cookies */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label htmlFor="functional" className="font-medium cursor-pointer">
                          Cookies Funcionais
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Permitem funcionalidades adicionais como preferências e personalização.
                        </p>
                      </div>
                      <Switch
                        id="functional"
                        checked={preferences.functional}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({ ...prev, functional: checked }))
                        }
                      />
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label htmlFor="analytics" className="font-medium cursor-pointer">
                          Cookies Analíticos
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ajudam-nos a entender como os utilizadores interagem com o site.
                        </p>
                      </div>
                      <Switch
                        id="analytics"
                        checked={preferences.analytics}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({ ...prev, analytics: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={rejectNonEssential}
                    >
                      Rejeitar todos
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveCustomPreferences}
                      className="gradient-primary"
                    >
                      Guardar preferências
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Utility hook to check cookie consent
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
    if (!consent) return false;
    return consent[type];
  };

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    setConsent(null);
    window.location.reload();
  };

  return { consent, hasConsent, resetConsent };
}
