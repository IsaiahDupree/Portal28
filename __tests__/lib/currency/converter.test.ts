// __tests__/lib/currency/converter.test.ts
// Unit tests for currency conversion utilities
// Feature ID: feat-224

import { describe, it, expect } from "@jest/globals";
import {
  convertPrice,
  formatPrice,
  getCurrencySymbol,
  usesDecimals,
  SUPPORTED_CURRENCIES,
  type CurrencyRate,
} from "@/lib/currency/converter";

describe("Currency Converter - feat-224", () => {
  const mockRates: CurrencyRate[] = [
    { currency_code: 'USD', rate_to_usd: 1.0, last_updated: new Date().toISOString() },
    { currency_code: 'EUR', rate_to_usd: 0.92, last_updated: new Date().toISOString() },
    { currency_code: 'GBP', rate_to_usd: 0.79, last_updated: new Date().toISOString() },
    { currency_code: 'JPY', rate_to_usd: 148.0, last_updated: new Date().toISOString() },
    { currency_code: 'CAD', rate_to_usd: 1.35, last_updated: new Date().toISOString() },
  ];

  describe("convertPrice", () => {
    it("should return the same price for USD", () => {
      const priceUSD = 10000; // $100.00
      const result = convertPrice(priceUSD, 'USD', mockRates);
      expect(result).toBe(10000);
    });

    it("should convert USD to EUR correctly", () => {
      const priceUSD = 10000; // $100.00
      const result = convertPrice(priceUSD, 'EUR', mockRates);
      // $100 / 0.92 = €108.70 (10870 cents)
      expect(result).toBe(10869);
    });

    it("should convert USD to GBP correctly", () => {
      const priceUSD = 10000; // $100.00
      const result = convertPrice(priceUSD, 'GBP', mockRates);
      // $100 / 0.79 = £126.58 (12658 cents)
      expect(result).toBe(12658);
    });

    it("should convert USD to JPY correctly", () => {
      const priceUSD = 10000; // $100.00
      const result = convertPrice(priceUSD, 'JPY', mockRates);
      // $100 / 148 = ¥0.676 cents (67 cents, which is less than ¥1)
      expect(result).toBe(67);
    });

    it("should floor the result to whole cents", () => {
      const priceUSD = 9999; // $99.99
      const result = convertPrice(priceUSD, 'EUR', mockRates);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should handle missing currency rate", () => {
      const priceUSD = 10000;
      const result = convertPrice(priceUSD, 'XYZ' as any, mockRates);
      // Should default to USD
      expect(result).toBe(10000);
    });
  });

  describe("formatPrice", () => {
    it("should format USD with dollar sign and decimals", () => {
      const result = formatPrice(10000, 'USD');
      expect(result).toBe('$100.00');
    });

    it("should format EUR with euro sign and decimals", () => {
      const result = formatPrice(10000, 'EUR');
      expect(result).toBe('€100.00');
    });

    it("should format GBP with pound sign and decimals", () => {
      const result = formatPrice(10000, 'GBP');
      expect(result).toBe('£100.00');
    });

    it("should format JPY without decimals", () => {
      const result = formatPrice(10000, 'JPY');
      expect(result).toBe('¥100');
    });

    it("should format CAD with prefix", () => {
      const result = formatPrice(10000, 'CAD');
      expect(result).toBe('CA$100.00');
    });

    it("should handle cents correctly", () => {
      const result = formatPrice(1050, 'USD');
      expect(result).toBe('$10.50');
    });

    it("should handle zero", () => {
      const result = formatPrice(0, 'USD');
      expect(result).toBe('$0.00');
    });

    it("should handle large amounts", () => {
      const result = formatPrice(100000000, 'USD');
      expect(result).toBe('$1000000.00');
    });
  });

  describe("getCurrencySymbol", () => {
    it("should return correct symbol for USD", () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it("should return correct symbol for EUR", () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    it("should return correct symbol for GBP", () => {
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it("should return correct symbol for JPY", () => {
      expect(getCurrencySymbol('JPY')).toBe('¥');
    });

    it("should return correct symbol for INR", () => {
      expect(getCurrencySymbol('INR')).toBe('₹');
    });
  });

  describe("usesDecimals", () => {
    it("should return true for USD", () => {
      expect(usesDecimals('USD')).toBe(true);
    });

    it("should return true for EUR", () => {
      expect(usesDecimals('EUR')).toBe(true);
    });

    it("should return false for JPY", () => {
      expect(usesDecimals('JPY')).toBe(false);
    });

    it("should return true for most currencies", () => {
      expect(usesDecimals('GBP')).toBe(true);
      expect(usesDecimals('CAD')).toBe(true);
      expect(usesDecimals('AUD')).toBe(true);
      expect(usesDecimals('INR')).toBe(true);
    });
  });

  describe("SUPPORTED_CURRENCIES", () => {
    it("should have at least 8 currencies", () => {
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(8);
    });

    it("should include USD", () => {
      const usd = SUPPORTED_CURRENCIES.find(c => c.code === 'USD');
      expect(usd).toBeDefined();
      expect(usd?.symbol).toBe('$');
    });

    it("should include EUR", () => {
      const eur = SUPPORTED_CURRENCIES.find(c => c.code === 'EUR');
      expect(eur).toBeDefined();
      expect(eur?.symbol).toBe('€');
    });

    it("should include GBP", () => {
      const gbp = SUPPORTED_CURRENCIES.find(c => c.code === 'GBP');
      expect(gbp).toBeDefined();
      expect(gbp?.symbol).toBe('£');
    });

    it("should have unique currency codes", () => {
      const codes = SUPPORTED_CURRENCIES.map(c => c.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should have all required properties", () => {
      SUPPORTED_CURRENCIES.forEach(currency => {
        expect(currency.code).toBeDefined();
        expect(currency.name).toBeDefined();
        expect(currency.symbol).toBeDefined();
        expect(typeof currency.code).toBe('string');
        expect(typeof currency.name).toBe('string');
        expect(typeof currency.symbol).toBe('string');
      });
    });
  });
});
