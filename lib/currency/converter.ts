// lib/currency/converter.ts
// Currency conversion utilities for feat-224

export interface CurrencyRate {
  currency_code: string;
  rate_to_usd: number;
  last_updated: string;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

/**
 * Convert price from USD cents to target currency
 */
export function convertPrice(
  priceInCentsUSD: number,
  targetCurrency: CurrencyCode,
  rates: CurrencyRate[]
): number {
  if (targetCurrency === 'USD') {
    return priceInCentsUSD;
  }

  const rate = rates.find(r => r.currency_code === targetCurrency);
  if (!rate) {
    console.warn(`Currency rate not found for ${targetCurrency}, defaulting to USD`);
    return priceInCentsUSD;
  }

  // Convert USD to target currency: price_usd / rate_to_usd
  return Math.floor(priceInCentsUSD / rate.rate_to_usd);
}

/**
 * Format price with currency symbol
 */
export function formatPrice(
  priceInCents: number,
  currencyCode: CurrencyCode
): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;

  // JPY doesn't use decimal places
  if (currencyCode === 'JPY') {
    return `${symbol}${Math.floor(priceInCents / 100)}`;
  }

  const amount = (priceInCents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * Check if currency uses decimal places
 */
export function usesDecimals(currencyCode: CurrencyCode): boolean {
  // Currencies that don't use decimal places
  const noDecimalCurrencies = ['JPY'];
  return !noDecimalCurrencies.includes(currencyCode);
}
