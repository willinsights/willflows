// Single source of truth alias for privacy mode.
// Underlying state is provided by HideValuesContext (useHideValues).
import { useHideValues } from '@/contexts/HideValuesContext';

export function usePrivacyMode() {
  const { hideValues, toggleHideValues } = useHideValues();
  return {
    isPrivacyMode: hideValues,
    togglePrivacyMode: toggleHideValues,
  };
}
