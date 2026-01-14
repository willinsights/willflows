import { createContext, useContext, ReactNode } from 'react';

// Feature flag for beta mode - set to false for public access with free trial
const BETA_MODE = false;

interface BetaContextType {
  isBetaMode: boolean;
}

const BetaContext = createContext<BetaContextType | undefined>(undefined);

export function BetaProvider({ children }: { children: ReactNode }) {
  return (
    <BetaContext.Provider value={{ isBetaMode: BETA_MODE }}>
      {children}
    </BetaContext.Provider>
  );
}

export function useBeta() {
  const context = useContext(BetaContext);
  if (context === undefined) {
    throw new Error('useBeta must be used within a BetaProvider');
  }
  return context;
}

// Hook to check beta mode without context (for components outside provider)
export function isBetaModeEnabled(): boolean {
  return BETA_MODE;
}
