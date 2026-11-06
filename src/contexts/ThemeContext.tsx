import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    // One-time switch to the new dark premium default
    if (!localStorage.getItem('willflow-theme-v2')) {
      localStorage.setItem('willflow-theme-v2', '1');
      localStorage.setItem('willflow-theme', 'dark');
    }
    const stored = localStorage.getItem('willflow-theme') as Theme;
    if (stored) return stored;
    // Dark premium is the default theme
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('willflow-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    // Add transition class for smooth theme change
    document.documentElement.classList.add('theme-transition');
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
