/**
 * Offer validity for public structured data: always 31 December of the
 * following year, so no page ever publishes an expired offer (F13).
 */
export function offerValidUntil(now: Date = new Date()): string {
  return `${now.getUTCFullYear() + 1}-12-31`;
}
