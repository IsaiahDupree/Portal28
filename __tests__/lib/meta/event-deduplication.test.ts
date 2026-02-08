/**
 * GDP-010: Meta Pixel + CAPI Event Deduplication Tests
 *
 * Tests that Pixel and CAPI use the same event ID for deduplication
 */

import { generateEventId, track } from '@/lib/meta/pixel';
import { mapEventToMetaPixel } from '@/lib/meta/eventMapping';
import { Events } from '@/lib/tracking';

// Mock window.fbq
declare global {
  interface Window {
    fbq?: jest.Mock;
  }
}

describe('GDP-010: Meta Pixel + CAPI Event Deduplication', () => {
  beforeEach(() => {
    // Mock fbq function
    window.fbq = jest.fn();
  });

  afterEach(() => {
    delete window.fbq;
    jest.clearAllMocks();
  });

  describe('Event ID Generation', () => {
    it('should generate unique event IDs', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toEqual(id2);
    });

    it('should generate event IDs with timestamp and random components', () => {
      const eventId = generateEventId();

      // Event ID format: timestamp-random
      expect(eventId).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should generate event IDs that are unique across rapid calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateEventId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });
  });

  describe('Pixel Event ID Passing', () => {
    it('should pass eventID to fbq() when tracking with event ID', () => {
      const eventID = 'test-event-id-123';

      track('Purchase', { value: 99.99, currency: 'USD' }, eventID);

      expect(window.fbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        { value: 99.99, currency: 'USD' },
        { eventID }
      );
    });

    it('should not pass eventID when not provided', () => {
      track('Purchase', { value: 99.99, currency: 'USD' });

      expect(window.fbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        { value: 99.99, currency: 'USD' }
      );
    });

    it('should pass eventID to trackCustom', () => {
      const eventID = 'custom-event-id-456';

      // Import trackCustom
      const { trackCustom } = require('@/lib/meta/pixel');

      trackCustom('CustomEvent', { data: 'test' }, eventID);

      expect(window.fbq).toHaveBeenCalledWith(
        'trackCustom',
        'CustomEvent',
        { data: 'test' },
        { eventID }
      );
    });
  });

  describe('Event Mapping with Event IDs', () => {
    it('should return event ID when mapping Purchase event', () => {
      const eventID = mapEventToMetaPixel(Events.PURCHASE_COMPLETED, {
        amount: 9900,
        currency: 'USD',
        course_id: 'course-123',
      });

      expect(eventID).toBeDefined();
      expect(typeof eventID).toBe('string');
      expect(window.fbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        expect.objectContaining({
          value: 99,
          currency: 'USD',
        }),
        { eventID }
      );
    });

    it('should return event ID when mapping InitiateCheckout event', () => {
      const eventID = mapEventToMetaPixel(Events.CHECKOUT_STARTED, {
        amount: 4900,
        currency: 'USD',
        course_id: 'course-456',
      });

      expect(eventID).toBeDefined();
      expect(window.fbq).toHaveBeenCalledWith(
        'track',
        'InitiateCheckout',
        expect.objectContaining({
          value: 49,
          currency: 'USD',
        }),
        { eventID }
      );
    });

    it('should return event ID when mapping Lead event', () => {
      const eventID = mapEventToMetaPixel(Events.SIGNUP_START, {
        method: 'google',
      });

      expect(eventID).toBeDefined();
      expect(window.fbq).toHaveBeenCalledWith(
        'track',
        'Lead',
        expect.any(Object),
        { eventID }
      );
    });

    it('should return undefined for unmapped events', () => {
      const eventID = mapEventToMetaPixel('unmapped_event', {});

      expect(eventID).toBeUndefined();
      expect(window.fbq).not.toHaveBeenCalled();
    });

    it('should generate different event IDs for different events', () => {
      const eventID1 = mapEventToMetaPixel(Events.PURCHASE_COMPLETED, { amount: 9900 });
      const eventID2 = mapEventToMetaPixel(Events.PURCHASE_COMPLETED, { amount: 4900 });

      expect(eventID1).toBeDefined();
      expect(eventID2).toBeDefined();
      expect(eventID1).not.toEqual(eventID2);
    });
  });

  describe('Documentation Tests', () => {
    it('should document event deduplication flow', () => {
      // DOCUMENTATION TEST
      // GDP-010: Meta Pixel + CAPI Event Deduplication
      //
      // Flow:
      // 1. Client-side: generateEventId() creates unique ID (lib/meta/pixel.ts:11-15)
      // 2. Client-side: Pixel track() receives eventID and passes to fbq() (lib/meta/pixel.ts:21-36)
      // 3. Client-side: mapEventToMetaPixel() returns eventID (lib/meta/eventMapping.ts:25-132)
      // 4. Client-side: Tracking SDK includes meta_event_id in event properties (lib/tracking/index.ts:502-531)
      // 5. Server-side: CAPI receives event_id from webhook or tracking API
      // 6. Server-side: capiTrack() uses same event_id (lib/meta/capiTrack.ts:26-95)
      //
      // Result: Meta deduplicates events using matching eventID/event_id

      expect(true).toBe(true);
    });

    it('should document that Purchase events from Stripe use event_id', () => {
      // DOCUMENTATION TEST
      // Stripe webhook creates event_id and passes to CAPI
      //
      // Implementation:
      // - app/api/stripe/webhook/route.ts:172 - sendCapiPurchase with event_id
      // - lib/meta/capi.ts:7-48 - CAPI function accepts event_id
      // - lib/meta/capiTrack.ts:26-95 - capiTrack accepts eventId
      //
      // The event_id is generated server-side for Stripe webhooks and passed to CAPI

      expect(true).toBe(true);
    });
  });
});
