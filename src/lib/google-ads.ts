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
  CTA_CLICK: `${GOOGLE_ADS_ID}/4K9lCJrR8OYbEOu02MUo`,
} as const;

// Plan values for conversion tracking
export const PLAN_VALUES: Record<string, { EUR: number; BRL: number }> = {
  essencial: { EUR: 19, BRL: 95 },
  pro: { EUR: 39, BRL: 195 },
  studio: { EUR: 79, BRL: 395 },
};

/**
 * Get currency based on country/region
 */
export function getCurrencyByCountry(country?: string): 'EUR' | 'BRL' {
  return country === 'BR' ? 'BRL' : 'EUR';
}

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
 * @param country - The country code (PT or BR)
 */
export function trackCheckoutSuccess(plan: string, country?: string): void {
  const currency = getCurrencyByCountry(country);
  const planValues = PLAN_VALUES[plan] || PLAN_VALUES.essencial;
  const value = planValues[currency];
  trackConversion(CONVERSION_IDS.CHECKOUT_SUCCESS, value, currency);
}

/**
 * Track a trial started conversion
 * @param country - The country code (PT or BR)
 */
export function trackTrialStarted(country?: string): void {
  const currency = getCurrencyByCountry(country);
  const value = currency === 'BRL' ? 5.0 : 1.0;
  trackConversion(CONVERSION_IDS.TRIAL_STARTED, value, currency);
}

/**
 * Track a signup conversion
 * @param country - The country code (PT or BR)
 */
export function trackSignup(country?: string): void {
  const currency = getCurrencyByCountry(country);
  const value = currency === 'BRL' ? 2.5 : 0.5;
  trackConversion(CONVERSION_IDS.SIGNUP, value, currency);
}

/**
 * Track a waitlist signup conversion
 * @param country - The country code (PT or BR)
 */
export function trackWaitlistSignup(country?: string): void {
  const currency = getCurrencyByCountry(country);
  const value = currency === 'BRL' ? 0.5 : 0.1;
  trackConversion(CONVERSION_IDS.WAITLIST, value, currency);
}

/**
 * Track a CTA click conversion (e.g., "Começar Grátis" button)
 * @param ctaLocation - Where the CTA was clicked (hero, header, banner, footer)
 */
export function trackCtaClick(ctaLocation: string = 'unknown'): void {
  // Track as a micro-conversion with low value
  trackConversion(CONVERSION_IDS.CTA_CLICK, 0.05, 'EUR');
  console.log(`[Google Ads] CTA click tracked from: ${ctaLocation}`);
}
