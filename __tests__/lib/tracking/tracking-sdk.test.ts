/**
 * Tests for Tracking SDK
 */

import { TrackingSDK, Events, EventCategory } from '@/lib/tracking';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ success: true }),
  } as Response)
);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Tracking SDK', () => {
  let sdk: TrackingSDK;

  beforeEach(() => {
    sdk = new TrackingSDK();
    (global.fetch as jest.Mock).mockClear();
    localStorageMock.clear();
  });

  afterEach(() => {
    sdk.reset();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      sdk.initialize();

      // Should track page view on init
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not initialize twice', () => {
      sdk.initialize();
      const callCountAfterFirstInit = (global.fetch as jest.Mock).mock.calls.length;

      sdk.initialize();

      // Should not make additional calls on second init
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callCountAfterFirstInit);
    });

    it('should flush queued events on initialization', () => {
      // Track event before initialization
      sdk.track('test_event', { foo: 'bar' });

      // Event should be queued
      expect(global.fetch).not.toHaveBeenCalled();

      // Initialize
      sdk.initialize();

      // Queued event should be sent
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tracking/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test_event'),
        })
      );
    });
  });

  describe('User Identification', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should identify a user', () => {
      sdk.identify({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tracking/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('_identify'),
        })
      );

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.userId).toBe('user-123');
      expect(callBody.properties.email).toBe('test@example.com');
    });

    it('should include user metadata in subsequent events', () => {
      sdk.identify({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'instructor',
      });

      (global.fetch as jest.Mock).mockClear();

      sdk.track('course_created', { course_id: 'course-1' });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.userId).toBe('user-123');
      expect(callBody.properties.email).toBe('test@example.com');
      expect(callBody.properties.role).toBe('instructor');
    });
  });

  describe('Event Tracking', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track a basic event', () => {
      sdk.track('test_event', { prop1: 'value1' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tracking/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe('test_event');
      expect(callBody.properties.prop1).toBe('value1');
      expect(callBody.timestamp).toBeDefined();
    });

    it('should track page views', () => {
      sdk.trackPageView('/test-page');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe('page_view');
      expect(callBody.properties.page).toBe('/test-page');
    });
  });

  describe('Acquisition Events', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track landing view', () => {
      sdk.acquisition.landingView({ source: 'google' });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.LANDING_VIEW);
      expect(callBody.properties.source).toBe('google');
    });

    // TRACK-002: Landing view with UTM parameters
    it('should track landing view with UTM parameters', () => {
      sdk.acquisition.landingView({
        utm_source: 'facebook',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale',
        utm_content: 'ad_variant_a',
        utm_term: 'brand_strategy',
        landing_page: '/',
        referrer: 'https://facebook.com',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.LANDING_VIEW);
      expect(callBody.properties.utm_source).toBe('facebook');
      expect(callBody.properties.utm_medium).toBe('cpc');
      expect(callBody.properties.utm_campaign).toBe('summer_sale');
      expect(callBody.properties.utm_content).toBe('ad_variant_a');
      expect(callBody.properties.utm_term).toBe('brand_strategy');
      expect(callBody.properties.landing_page).toBe('/');
      expect(callBody.properties.referrer).toBe('https://facebook.com');
    });

    // TRACK-002: CTA click with location tracking
    it('should track CTA click', () => {
      sdk.acquisition.ctaClick('hero-signup', { position: 'top' });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.CTA_CLICK);
      expect(callBody.properties.cta_name).toBe('hero-signup');
      expect(callBody.properties.position).toBe('top');
    });

    // TRACK-002: CTA click with multiple properties
    it('should track CTA click with location and context', () => {
      sdk.acquisition.ctaClick('hero_enter_the_room', {
        location: 'hero',
        href: '/courses',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.CTA_CLICK);
      expect(callBody.properties.cta_name).toBe('hero_enter_the_room');
      expect(callBody.properties.location).toBe('hero');
      expect(callBody.properties.href).toBe('/courses');
    });

    // TRACK-002: Pricing view with page context
    it('should track pricing view', () => {
      sdk.acquisition.pricingView({ plan: 'pro' });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.PRICING_VIEW);
    });

    // TRACK-002: Pricing view with URL and referrer
    it('should track pricing view with page context', () => {
      sdk.acquisition.pricingView({
        page: '/courses',
        url: 'http://localhost:2828/courses',
        referrer: 'http://localhost:2828/',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.PRICING_VIEW);
      expect(callBody.properties.page).toBe('/courses');
      expect(callBody.properties.url).toBe('http://localhost:2828/courses');
      expect(callBody.properties.referrer).toBe('http://localhost:2828/');
    });

    it('should track course preview', () => {
      sdk.acquisition.coursePreview('course-123');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.COURSE_PREVIEW);
      expect(callBody.properties.course_id).toBe('course-123');
    });
  });

  describe('Activation Events', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track signup start', () => {
      sdk.activation.signupStart('email');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.SIGNUP_START);
      expect(callBody.properties.method).toBe('email');
    });

    it('should track login success', () => {
      sdk.activation.loginSuccess('magic-link');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.LOGIN_SUCCESS);
    });

    it('should track activation complete', () => {
      sdk.activation.activationComplete();

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.ACTIVATION_COMPLETE);
    });

    it('should track first course created', () => {
      sdk.activation.firstCourseCreated('course-123');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.FIRST_COURSE_CREATED);
      expect(callBody.properties.course_id).toBe('course-123');
    });
  });

  describe('Core Value Events', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track course created', () => {
      sdk.coreValue.courseCreated({
        courseId: 'course-123',
        title: 'Test Course',
        lessonCount: 10,
        category: 'programming',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.COURSE_CREATED);
      expect(callBody.properties.course_id).toBe('course-123');
      expect(callBody.properties.title).toBe('Test Course');
      expect(callBody.properties.lesson_count).toBe(10);
    });

    it('should track lesson added', () => {
      sdk.coreValue.lessonAdded('course-123', 'lesson-456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.LESSON_ADDED);
      expect(callBody.properties.course_id).toBe('course-123');
      expect(callBody.properties.lesson_id).toBe('lesson-456');
    });

    it('should track course published', () => {
      sdk.coreValue.coursePublished('course-123', 'My Course');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.COURSE_PUBLISHED);
    });

    it('should track enrollment completed', () => {
      sdk.coreValue.enrollmentCompleted({
        courseId: 'course-123',
        studentId: 'student-456',
        price: 99.99,
        couponUsed: 'SAVE20',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.ENROLLMENT_COMPLETED);
      expect(callBody.properties.price).toBe(99.99);
      expect(callBody.properties.coupon_used).toBe('SAVE20');
    });

    it('should track lesson completed', () => {
      sdk.coreValue.lessonCompleted('course-123', 'lesson-456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.LESSON_COMPLETED);
    });

    it('should track certificate issued', () => {
      sdk.coreValue.certificateIssued('course-123', 'cert-789');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.CERTIFICATE_ISSUED);
    });

    // TRACK-004: Product-specific value events
    it('should track product created', () => {
      sdk.coreValue.productCreated({
        productId: 'product-123',
        productType: 'template',
        title: 'My Template',
        category: 'design',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.PRODUCT_CREATED);
      expect(callBody.properties.product_id).toBe('product-123');
      expect(callBody.properties.product_type).toBe('template');
      expect(callBody.properties.title).toBe('My Template');
      expect(callBody.properties.category).toBe('design');
    });

    it('should track product completed', () => {
      sdk.coreValue.productCompleted({
        productId: 'product-123',
        productType: 'membership',
        userId: 'user-456',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.PRODUCT_COMPLETED);
      expect(callBody.properties.product_id).toBe('product-123');
      expect(callBody.properties.product_type).toBe('membership');
      expect(callBody.properties.user_id).toBe('user-456');
    });

    it('should track product downloaded', () => {
      sdk.coreValue.productDownloaded({
        productId: 'product-123',
        productType: 'digital_product',
        fileName: 'ebook.pdf',
        fileSize: 1024000,
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.PRODUCT_DOWNLOADED);
      expect(callBody.properties.product_id).toBe('product-123');
      expect(callBody.properties.product_type).toBe('digital_product');
      expect(callBody.properties.file_name).toBe('ebook.pdf');
      expect(callBody.properties.file_size).toBe(1024000);
    });

    it('should track template downloaded', () => {
      sdk.coreValue.templateDownloaded('template-123', 'template.zip');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.TEMPLATE_DOWNLOADED);
      expect(callBody.properties.template_id).toBe('template-123');
      expect(callBody.properties.file_name).toBe('template.zip');
    });

    it('should track resource downloaded', () => {
      sdk.coreValue.resourceDownloaded('resource-123', 'worksheet.pdf', 512000);

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.RESOURCE_DOWNLOADED);
      expect(callBody.properties.resource_id).toBe('resource-123');
      expect(callBody.properties.file_name).toBe('worksheet.pdf');
      expect(callBody.properties.file_size).toBe(512000);
    });

    it('should track certificate downloaded', () => {
      sdk.coreValue.certificateDownloaded('cert-123', 'course-456');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.CERTIFICATE_DOWNLOADED);
      expect(callBody.properties.certificate_id).toBe('cert-123');
      expect(callBody.properties.course_id).toBe('course-456');
    });
  });

  describe('Monetization Events', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track checkout started', () => {
      sdk.monetization.checkoutStarted({
        courseId: 'course-123',
        amount: 99.99,
        currency: 'USD',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.CHECKOUT_STARTED);
      expect(callBody.properties.amount).toBe(99.99);
    });

    it('should track purchase completed', () => {
      sdk.monetization.purchaseCompleted({
        courseId: 'course-123',
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'card',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.PURCHASE_COMPLETED);
    });

    it('should track subscription started', () => {
      sdk.monetization.subscriptionStarted({
        planId: 'plan-pro',
        amount: 29.99,
        interval: 'month',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.SUBSCRIPTION_STARTED);
      expect(callBody.properties.interval).toBe('month');
    });

    it('should track course sold', () => {
      sdk.monetization.courseSold({
        courseId: 'course-123',
        studentId: 'student-456',
        amount: 99.99,
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.COURSE_SOLD);
    });
  });

  describe('Retention Events', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track return session', () => {
      sdk.retention.returnSession(3);

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.RETURN_SESSION);
      expect(callBody.properties.days_since_last_session).toBe(3);
    });

    it('should track lesson streak', () => {
      sdk.retention.lessonStreak(7);

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.LESSON_STREAK);
      expect(callBody.properties.streak_days).toBe(7);
    });

    it('should track course completion rate', () => {
      sdk.retention.courseCompletionRate('course-123', 75);

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.COURSE_COMPLETION_RATE);
      expect(callBody.properties.completion_rate).toBe(75);
    });
  });

  describe('Reliability Events', () => {
    beforeEach(() => {
      sdk.initialize();
      (global.fetch as jest.Mock).mockClear();
    });

    it('should track error shown', () => {
      sdk.reliability.errorShown({
        message: 'Failed to load course',
        code: 'ERR_NETWORK',
        page: '/courses/123',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.ERROR_SHOWN);
      expect(callBody.properties.error_message).toBe('Failed to load course');
    });

    it('should track video upload failed', () => {
      sdk.reliability.videoUploadFailed('File too large');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.VIDEO_UPLOAD_FAILED);
    });

    it('should track enrollment failed', () => {
      sdk.reliability.enrollmentFailed('course-123', 'Payment declined');

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.event).toBe(Events.ENROLLMENT_FAILED);
    });
  });

  describe('Return Session Tracking', () => {
    it('should track first session', () => {
      sdk.initialize();

      // Should set last session in localStorage
      expect(localStorageMock.getItem('portal28_last_session')).toBeTruthy();
    });

    it('should track return after time gap', () => {
      // Set last session to 3 days ago
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      localStorageMock.setItem('portal28_last_session', threeDaysAgo.toString());

      sdk.initialize();

      // Should track return_session event
      const calls = (global.fetch as jest.Mock).mock.calls;
      const returnSessionCall = calls.find((call) => {
        const body = JSON.parse(call[1].body);
        return body.event === Events.RETURN_SESSION;
      });

      expect(returnSessionCall).toBeDefined();
    });
  });
});
