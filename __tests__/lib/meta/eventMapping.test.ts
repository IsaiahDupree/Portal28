/**
 * Tests for Meta Pixel Event Mapping (META-003)
 */

import { mapEventToMetaPixel } from '@/lib/meta/eventMapping';
import { Events } from '@/lib/tracking';
import * as pixel from '@/lib/meta/pixel';

// Mock the pixel module
jest.mock('@/lib/meta/pixel');

describe('Meta Pixel Event Mapping (META-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should map LOGIN_SUCCESS to CompleteRegistration', () => {
    mapEventToMetaPixel(Events.LOGIN_SUCCESS, { method: 'magic-link' });

    expect(pixel.track).toHaveBeenCalledWith('CompleteRegistration', {
      status: 'success',
      method: 'magic-link',
    });
  });

  it('should map ACTIVATION_COMPLETE to CompleteRegistration', () => {
    mapEventToMetaPixel(Events.ACTIVATION_COMPLETE, {});

    expect(pixel.track).toHaveBeenCalledWith('CompleteRegistration', {
      status: 'success',
      method: 'email',
    });
  });

  it('should map SIGNUP_START to Lead', () => {
    mapEventToMetaPixel(Events.SIGNUP_START, { method: 'google' });

    expect(pixel.track).toHaveBeenCalledWith('Lead', {
      content_name: 'Signup Started',
      content_category: 'activation',
    });
  });

  it('should map COURSE_PREVIEW to ViewContent', () => {
    mapEventToMetaPixel(Events.COURSE_PREVIEW, {
      course_id: 'course-123',
      title: 'Test Course',
    });

    expect(pixel.track).toHaveBeenCalledWith('ViewContent', {
      content_ids: ['course-123'],
      content_type: 'product',
      content_name: 'Test Course',
    });
  });

  it('should map PRICING_VIEW to ViewContent', () => {
    mapEventToMetaPixel(Events.PRICING_VIEW, {});

    expect(pixel.track).toHaveBeenCalledWith('ViewContent', {
      content_ids: [],
      content_type: 'product',
      content_name: undefined,
    });
  });

  it('should map CHECKOUT_STARTED to InitiateCheckout', () => {
    mapEventToMetaPixel(Events.CHECKOUT_STARTED, {
      course_id: 'course-123',
      amount: 9900,
      currency: 'USD',
    });

    expect(pixel.track).toHaveBeenCalledWith('InitiateCheckout', {
      content_ids: ['course-123'],
      value: 99,
      currency: 'USD',
    });
  });

  it('should map PURCHASE_COMPLETED to Purchase', () => {
    mapEventToMetaPixel(Events.PURCHASE_COMPLETED, {
      course_id: 'course-123',
      amount: 9900,
      currency: 'USD',
    });

    expect(pixel.track).toHaveBeenCalledWith('Purchase', {
      content_ids: ['course-123'],
      value: 99,
      currency: 'USD',
      content_type: 'product',
    });
  });

  it('should map LANDING_VIEW with UTM to Lead', () => {
    mapEventToMetaPixel(Events.LANDING_VIEW, {
      utm_source: 'facebook',
      utm_campaign: 'spring-sale',
    });

    expect(pixel.track).toHaveBeenCalledWith('Lead', {
      content_name: 'Landing Page Visit',
      content_category: 'acquisition',
      source: 'facebook',
      campaign: 'spring-sale',
    });
  });

  it('should not track LANDING_VIEW without UTM parameters', () => {
    mapEventToMetaPixel(Events.LANDING_VIEW, {});

    expect(pixel.track).not.toHaveBeenCalled();
  });

  it('should map SUBSCRIPTION_STARTED to Subscribe', () => {
    mapEventToMetaPixel(Events.SUBSCRIPTION_STARTED, {
      amount: 2900,
      interval: 'month',
    });

    expect(pixel.track).toHaveBeenCalledWith('Subscribe', {
      value: 29,
      currency: 'USD',
      predicted_ltv: 348, // 29 * 12
    });
  });

  it('should not track unmapped events', () => {
    mapEventToMetaPixel('some_random_event', {});

    expect(pixel.track).not.toHaveBeenCalled();
  });

  it('should handle product_id instead of course_id for purchases', () => {
    mapEventToMetaPixel(Events.PURCHASE_COMPLETED, {
      product_id: 'prod-456',
      amount: 4900,
      currency: 'USD',
    });

    expect(pixel.track).toHaveBeenCalledWith('Purchase', {
      content_ids: ['prod-456'],
      value: 49,
      currency: 'USD',
      content_type: 'product',
    });
  });
});
