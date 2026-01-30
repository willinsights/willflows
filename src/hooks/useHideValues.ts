import { useState, useCallback } from 'react';

const HIDE_VALUES_KEY = 'wf_hide_financial_values';

export function useHideValues() {
  const [hideValues, setHideValuesState] = useState(() => {
    try {
      return localStorage.getItem(HIDE_VALUES_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideValues = useCallback(() => {
    setHideValuesState(prev => {
      const newValue = !prev;
      localStorage.setItem(HIDE_VALUES_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return { hideValues, toggleHideValues };
}
