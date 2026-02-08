/**
 * Maps Portal28 tracking events to Meta Pixel standard events
 * META-003: Map app events to Meta standard events (Purchase, Lead, etc.)
 */

import { track } from './pixel';
import { Events } from '@/lib/tracking';

// Meta Pixel Standard Events:
// - ViewContent
// - Search
// - AddToCart
// - AddToWishlist
// - InitiateCheckout
// - AddPaymentInfo
// - Purchase
// - Lead
// - CompleteRegistration

/**
 * Map Portal28 event to Meta Pixel event
 */
export function mapEventToMetaPixel(
  eventName: string,
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined') return;

  switch (eventName) {
    // CompleteRegistration: When user successfully logs in/signs up
    case Events.LOGIN_SUCCESS:
    case Events.ACTIVATION_COMPLETE:
      track('CompleteRegistration', {
        status: 'success',
        method: properties.method || 'email',
      });
      break;

    case Events.SIGNUP_START:
      track('Lead', {
        content_name: 'Signup Started',
        content_category: 'activation',
      });
      break;

    // ViewContent: When viewing course/product pages
    case Events.COURSE_PREVIEW:
    case Events.PRICING_VIEW:
      track('ViewContent', {
        content_ids: properties.course_id ? [properties.course_id] : [],
        content_type: 'product',
        content_name: properties.title || properties.course_id,
      });
      break;

    // InitiateCheckout: When starting checkout process
    case Events.CHECKOUT_STARTED:
      track('InitiateCheckout', {
        content_ids: properties.course_id ? [properties.course_id] : [],
        value: properties.amount ? properties.amount / 100 : 0,
        currency: properties.currency || 'USD',
      });
      break;

    // Purchase: When purchase is completed
    case Events.PURCHASE_COMPLETED:
      track('Purchase', {
        content_ids: properties.course_id
          ? [properties.course_id]
          : properties.product_id
            ? [properties.product_id]
            : [],
        value: properties.amount ? properties.amount / 100 : 0,
        currency: properties.currency || 'USD',
        content_type: 'product',
      });
      break;

    // Lead: Newsletter signups, contact forms
    case Events.LANDING_VIEW:
      // Only track as Lead if there are UTM parameters (from ad campaign)
      if (properties.utm_source || properties.utm_campaign) {
        track('Lead', {
          content_name: 'Landing Page Visit',
          content_category: 'acquisition',
          source: properties.utm_source,
          campaign: properties.utm_campaign,
        });
      }
      break;

    // Track major value events as custom conversions
    case Events.LESSON_COMPLETED:
      track('CompleteRegistration', {
        status: 'lesson_completed',
        content_name: properties.lesson_id,
      });
      break;

    case Events.COURSE_PUBLISHED:
      track('Lead', {
        content_name: 'Course Published',
        content_category: 'core_value',
        course_id: properties.course_id,
      });
      break;

    case Events.SUBSCRIPTION_STARTED:
      track('Subscribe', {
        value: properties.amount ? properties.amount / 100 : 0,
        currency: 'USD',
        predicted_ltv: (properties.amount ? properties.amount / 100 : 0) * 12,
      });
      break;

    // Default: Don't track non-mapped events
    default:
      // Optionally log unmapped events in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Meta Pixel] No mapping for event:', eventName);
      }
  }
}
