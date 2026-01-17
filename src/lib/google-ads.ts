/**
 * Google Ads Conversion Tracking Utilities
 * 
 * Use these functions to track conversions in Google Ads.
 * The gtag script is already installed in index.html.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Google Ads Account ID
const GOOGLE_ADS_ID = 'AW-10883570283';

// Conversion IDs for different events
export const CONVERSION_IDS = {
  PAGE_VIEW: `${GOOGLE_ADS_ID}/4K9lCJrR8OYbEOu02MUo`,
  CHECKOUT_SUCCESS: `${GOOGLE_ADS_ID}/4K9lCJrR8OYbEOu02MUo`,
  TRIAL_STARTED: `${GOOGLE_ADS_ID}/4K9lCJrR8OYbEOu02MUo`,
  SIGNUP: `${GOOGLE_ADS_ID}/4K9lCJrR8OYbEOu02MUo`,
  WAITLIST: `${GOOGLE_ADS_ID}/4K9lCJrR8OYbEOu02MUo`,
} as const;

// Plan values for conversion tracking (in EUR)
export const PLAN_VALUES: Record<string, number> = {
  essencial: 19,
  pro: 39,
  studio: 79,
};

/**
 * Track a conversion event in Google Ads
 * 
 * @param conversionId - The conversion ID (e.g., 'AW-10883570283/4K9lCJrR8OYbEOu02MUo')
 * @param value - The monetary value of the conversion
 * @param currency - The currency code (default: 'EUR')
 */
export function trackConversion(
  conversionId: string,
  value: number = 1.0,
  currency: string = 'EUR'
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('[Google Ads] gtag not available');
    return;
  }

  try {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value: value,
      currency: currency,
    });
    console.log(`[Google Ads] Conversion tracked: ${conversionId}, value: ${value} ${currency}`);
  } catch (error) {
    console.error('[Google Ads] Error tracking conversion:', error);
  }
}

/**
 * Track a checkout success conversion
 * 
 * @param plan - The subscription plan (essencial, pro, studio)
 * @param currency - The currency code
 */
export function trackCheckoutSuccess(plan: string, currency: string = 'EUR'): void {
  const value = PLAN_VALUES[plan] || PLAN_VALUES.essencial;
  trackConversion(CONVERSION_IDS.CHECKOUT_SUCCESS, value, currency);
}

/**
 * Track a trial started conversion
 */
export function trackTrialStarted(): void {
  trackConversion(CONVERSION_IDS.TRIAL_STARTED, 1.0, 'EUR');
}

/**
 * Track a signup conversion
 */
export function trackSignup(): void {
  trackConversion(CONVERSION_IDS.SIGNUP, 0.5, 'EUR');
}

/**
 * Track a waitlist signup conversion
 */
export function trackWaitlistSignup(): void {
  trackConversion(CONVERSION_IDS.WAITLIST, 0.1, 'EUR');
}
