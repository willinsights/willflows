import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const HIDE_VALUES_KEY = 'wf_hide_financial_values';

interface HideValuesContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
}

const HideValuesContext = createContext<HideValuesContextType | undefined>(undefined);

export function HideValuesProvider({ children }: { children: ReactNode }) {
  const [hideValues, setHideValues] = useState(() => {
    try {
      return localStorage.getItem(HIDE_VALUES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideValues = useCallback(() => {
    setHideValues(prev => {
      const newValue = !prev;
      localStorage.setItem(HIDE_VALUES_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return (
    <HideValuesContext.Provider value={{ hideValues, toggleHideValues }}>
      {children}
    </HideValuesContext.Provider>
  );
}

export function useHideValues() {
  const context = useContext(HideValuesContext);
  if (context === undefined) {
    throw new Error('useHideValues must be used within a HideValuesProvider');
  }
  return context;
}
