import { useEffect } from 'react';

import { logger } from '@/lib/logger';
/**
 * Hook to manage PWA app badge (unread notification count on app icon)
 * Uses the Navigator Badge API when available
 */
export function usePWABadge(count: number) {
  useEffect(() => {
    // Check if Badge API is supported
    if (!('setAppBadge' in navigator)) {
      return;
    }

    const updateBadge = async () => {
      try {
        if (count > 0) {
          // Set badge with count
          await (navigator as any).setAppBadge(count);
        } else {
          // Clear badge
          await (navigator as any).clearAppBadge();
        }
      } catch (error) {
        // Badge API might fail if permission not granted
        logger.debug('[PWA Badge] Could not update badge:', error);
      }
    };

    updateBadge();
  }, [count]);
}

/**
 * Utility to check if Badge API is supported
 */
export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}

/**
 * Manually set badge count
 */
export async function setAppBadge(count: number): Promise<void> {
  if (!('setAppBadge' in navigator)) {
    return;
  }

  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count);
    } else {
      await (navigator as any).clearAppBadge();
    }
  } catch (error) {
    logger.debug('[PWA Badge] Could not set badge:', error);
  }
}

/**
 * Clear the app badge
 */
export async function clearAppBadge(): Promise<void> {
  if (!('clearAppBadge' in navigator)) {
    return;
  }

  try {
    await (navigator as any).clearAppBadge();
  } catch (error) {
    logger.debug('[PWA Badge] Could not clear badge:', error);
  }
}
