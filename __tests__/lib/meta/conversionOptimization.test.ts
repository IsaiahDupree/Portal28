/**
 * Conversion Optimization Tests
 * META-008: Test conversion value calculations and tracking utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculatePredictedLTV,
  calculateOrderValue,
  calculateConversionRate,
  calculateROAS,
  validateConversionEvent,
  ConversionEvents,
} from '@/lib/meta/conversionOptimization';

describe('Conversion Optimization - META-008', () => {
  describe('calculatePredictedLTV', () => {
    it('META-008.1: Should calculate LTV for monthly subscription', () => {
      const ltv = calculatePredictedLTV({
        subscriptionAmount: 2900, // $29/month in cents
        interval: 'monthly',
        averageRetentionMonths: 12,
      });

      // $29 * 12 months = $348
      expect(ltv).toBe(348);
    });

    it('META-008.2: Should calculate LTV for yearly subscription', () => {
      const ltv = calculatePredictedLTV({
        subscriptionAmount: 29000, // $290/year in cents
        interval: 'yearly',
        averageRetentionMonths: 24,
      });

      // ($290 / 12 months) * 24 months = $580
      expect(ltv).toBe(580);
    });

    it('META-008.3: Should use default retention of 12 months', () => {
      const ltv = calculatePredictedLTV({
        subscriptionAmount: 5000, // $50/month
        interval: 'monthly',
      });

      // $50 * 12 = $600
      expect(ltv).toBe(600);
    });
  });

  describe('calculateOrderValue', () => {
    it('META-008.4: Should calculate base order value without upsells', () => {
      const result = calculateOrderValue({
        baseAmount: 9900, // $99
      });

      expect(result.value).toBe(99);
      expect(result.currency).toBe('USD');
      expect(result.breakdown.base).toBe(99);
      expect(result.breakdown.bumps).toBe(0);
      expect(result.breakdown.upsells).toBe(0);
      expect(result.breakdown.total).toBe(99);
    });

    it('META-008.5: Should calculate order value with order bumps', () => {
      const result = calculateOrderValue({
        baseAmount: 9900, // $99
        orderBumps: [{ amount: 1900 }, { amount: 2900 }], // $19 + $29
      });

      expect(result.value).toBe(147); // $99 + $19 + $29
      expect(result.breakdown.bumps).toBe(48);
      expect(result.breakdown.total).toBe(147);
    });

    it('META-008.6: Should calculate order value with upsells', () => {
      const result = calculateOrderValue({
        baseAmount: 9900, // $99
        upsells: [{ amount: 4900 }], // $49
      });

      expect(result.value).toBe(148); // $99 + $49
      expect(result.breakdown.upsells).toBe(49);
      expect(result.breakdown.total).toBe(148);
    });

    it('META-008.7: Should calculate complete order with all components', () => {
      const result = calculateOrderValue({
        baseAmount: 9900,
        orderBumps: [{ amount: 1900 }],
        upsells: [{ amount: 2900 }],
        currency: 'EUR',
      });

      expect(result.value).toBe(147); // $99 + $19 + $29
      expect(result.currency).toBe('EUR');
      expect(result.breakdown.base).toBe(99);
      expect(result.breakdown.bumps).toBe(19);
      expect(result.breakdown.upsells).toBe(29);
    });
  });

  describe('calculateConversionRate', () => {
    it('META-008.8: Should calculate conversion rate percentage', () => {
      const rate = calculateConversionRate(1000, 250);

      expect(rate).toBe(25); // 25%
    });

    it('META-008.9: Should handle zero start count', () => {
      const rate = calculateConversionRate(0, 0);

      expect(rate).toBe(0);
    });

    it('META-008.10: Should round to 2 decimal places', () => {
      const rate = calculateConversionRate(999, 333);

      expect(rate).toBe(33.33);
    });
  });

  describe('calculateROAS', () => {
    it('META-008.11: Should calculate ROAS correctly', () => {
      const result = calculateROAS({
        revenue: 5000, // $5000 revenue
        adSpend: 1000, // $1000 ad spend
      });

      expect(result.roas).toBe(5); // 5x return
      expect(result.roi).toBe(400); // 400% ROI
      expect(result.profit).toBe(4000); // $4000 profit
    });

    it('META-008.12: Should handle zero ad spend', () => {
      const result = calculateROAS({
        revenue: 1000,
        adSpend: 0,
      });

      expect(result.roas).toBe(0);
      expect(result.roi).toBe(0);
      expect(result.profit).toBe(1000);
    });

    it('META-008.13: Should handle negative ROI', () => {
      const result = calculateROAS({
        revenue: 500,
        adSpend: 1000,
      });

      expect(result.roas).toBe(0.5); // 0.5x return
      expect(result.roi).toBe(-50); // -50% ROI (loss)
      expect(result.profit).toBe(-500); // $500 loss
    });

    it('META-008.14: Should round values to 2 decimals', () => {
      const result = calculateROAS({
        revenue: 333.33,
        adSpend: 100,
      });

      expect(result.roas).toBe(3.33);
      expect(result.roi).toBe(233.33);
      expect(result.profit).toBe(233.33);
    });
  });

  describe('validateConversionEvent', () => {
    it('META-008.15: Should validate Purchase event requires value', () => {
      const result = validateConversionEvent('Purchase', {
        content_ids: ['course-1'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('value');
    });

    it('META-008.16: Should validate Purchase event with value passes', () => {
      const result = validateConversionEvent('Purchase', {
        value: 99,
        currency: 'USD',
        content_ids: ['course-1'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('META-008.17: Should warn about missing currency', () => {
      const result = validateConversionEvent('Purchase', {
        value: 99,
        content_ids: ['course-1'],
      });

      expect(result.valid).toBe(true); // Valid but has warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('currency');
    });

    it('META-008.18: Should warn about missing content_ids', () => {
      const result = validateConversionEvent('Purchase', {
        value: 99,
        currency: 'USD',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('content_ids');
    });

    it('META-008.19: Should validate ViewContent does not require value', () => {
      const result = validateConversionEvent('ViewContent', {
        content_ids: ['course-1'],
      });

      // ViewContent is not monetized, so value not required
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Conversion Event Constants', () => {
    it('META-008.20: Should have Purchase event defined', () => {
      expect(ConversionEvents.PURCHASE.name).toBe('Purchase');
      expect(ConversionEvents.PURCHASE.isMonetized).toBe(true);
      expect(ConversionEvents.PURCHASE.category).toBe('transaction');
    });

    it('META-008.21: Should have Subscribe event defined', () => {
      expect(ConversionEvents.SUBSCRIBE.name).toBe('Subscribe');
      expect(ConversionEvents.SUBSCRIBE.isMonetized).toBe(true);
    });

    it('META-008.22: Should have InitiateCheckout event defined', () => {
      expect(ConversionEvents.INITIATE_CHECKOUT.name).toBe('InitiateCheckout');
      expect(ConversionEvents.INITIATE_CHECKOUT.isMonetized).toBe(false);
      expect(ConversionEvents.INITIATE_CHECKOUT.category).toBe('consideration');
    });

    it('META-008.23: Should have ViewContent event defined', () => {
      expect(ConversionEvents.VIEW_CONTENT.name).toBe('ViewContent');
      expect(ConversionEvents.VIEW_CONTENT.category).toBe('awareness');
    });
  });
});

/**
 * Test Summary for META-008: Conversion Optimization
 *
 * Coverage:
 * - LTV calculation (monthly/yearly subscriptions) [3 tests]
 * - Order value calculation (with bumps/upsells) [4 tests]
 * - Conversion rate calculation [3 tests]
 * - ROAS calculation [4 tests]
 * - Event validation [5 tests]
 * - Conversion event constants [4 tests]
 *
 * Total: 23 tests
 *
 * All tests validate the acceptance criteria:
 * ✓ LTV prediction for subscriptions
 * ✓ Order value tracking with upsells
 * ✓ ROAS calculation
 * ✓ Conversion rate tracking
 * ✓ Event validation for optimization
 */
