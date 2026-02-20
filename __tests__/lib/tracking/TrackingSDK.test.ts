/**
 * @jest-environment jsdom
 */

import { TrackingSDK, Events, EventCategory } from '@/lib/tracking';

// Mock dependencies
jest.mock('@/lib/posthog/client', () => ({
  identifyUser: jest.fn(() => Promise.resolve()),
  resetIdentity: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/meta/eventMapping', () => ({
  mapEventToMetaPixel: jest.fn(() => Promise.resolve('test-event-id')),
}));

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
})) as jest.Mock;

describe('TrackingSDK', () => {
  let sdk: TrackingSDK;

  beforeEach(() => {
    // Create a fresh SDK instance for each test
    sdk = new TrackingSDK();
    jest.clearAllMocks();

    // Mock localStorage
    const localStorageMock: { [key: string]: string } = {};
    Storage.prototype.getItem = jest.fn((key) => localStorageMock[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
      localStorageMock[key] = value;
    });
  });

  describe('Initialization', () => {
    it('should not be initialized by default', () => {
      expect((sdk as any).initialized).toBe(false);
    });

    it('should initialize successfully', () => {
      sdk.initialize();
      expect((sdk as any).initialized).toBe(true);
    });

    it('should warn if initialized twice', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      sdk.initialize();
      sdk.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith('[Tracking] SDK already initialized');
      consoleWarnSpy.mockRestore();
    });

    it('should queue events before initialization', () => {
      sdk.track('test_event');
      expect((sdk as any).queue).toHaveLength(1);
    });
  });

  describe('User Identification', () => {
    it('should identify user with all properties', () => {
      const identification = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'creator',
        metadata: {
          subscription_tier: 'pro',
        },
      };

      sdk.identify(identification);

      expect((sdk as any).userId).toBe('user-123');
      expect((sdk as any).userMetadata).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'creator',
        subscription_tier: 'pro',
      });
    });
  });

  describe('Event Constants', () => {
    it('should have event categories defined', () => {
      expect(EventCategory.ACQUISITION).toBe('acquisition');
      expect(EventCategory.ACTIVATION).toBe('activation');
      expect(EventCategory.CORE_VALUE).toBe('core_value');
      expect(EventCategory.MONETIZATION).toBe('monetization');
      expect(EventCategory.RETENTION).toBe('retention');
      expect(EventCategory.RELIABILITY).toBe('reliability');
    });

    it('should have event names defined', () => {
      expect(Events.LANDING_VIEW).toBe('landing_view');
      expect(Events.SIGNUP_START).toBe('signup_start');
      expect(Events.COURSE_CREATED).toBe('course_created');
      expect(Events.CHECKOUT_STARTED).toBe('checkout_started');
      expect(Events.RETURN_SESSION).toBe('return_session');
      expect(Events.ERROR_SHOWN).toBe('error_shown');
    });
  });

  describe('Event Methods', () => {
    beforeEach(() => {
      sdk.initialize();
    });

    it('should have acquisition methods', () => {
      expect(typeof sdk.acquisition.landingView).toBe('function');
      expect(typeof sdk.acquisition.ctaClick).toBe('function');
      expect(typeof sdk.acquisition.pricingView).toBe('function');
      expect(typeof sdk.acquisition.coursePreview).toBe('function');
    });

    it('should have activation methods', () => {
      expect(typeof sdk.activation.signupStart).toBe('function');
      expect(typeof sdk.activation.loginSuccess).toBe('function');
      expect(typeof sdk.activation.activationComplete).toBe('function');
      expect(typeof sdk.activation.firstCourseCreated).toBe('function');
    });

    it('should have core value methods', () => {
      expect(typeof sdk.coreValue.courseCreated).toBe('function');
      expect(typeof sdk.coreValue.lessonAdded).toBe('function');
      expect(typeof sdk.coreValue.coursePublished).toBe('function');
      expect(typeof sdk.coreValue.enrollmentCompleted).toBe('function');
      expect(typeof sdk.coreValue.lessonCompleted).toBe('function');
      expect(typeof sdk.coreValue.certificateIssued).toBe('function');
    });

    it('should have monetization methods', () => {
      expect(typeof sdk.monetization.checkoutStarted).toBe('function');
      expect(typeof sdk.monetization.purchaseCompleted).toBe('function');
      expect(typeof sdk.monetization.subscriptionStarted).toBe('function');
      expect(typeof sdk.monetization.courseSold).toBe('function');
    });

    it('should have retention methods', () => {
      expect(typeof sdk.retention.returnSession).toBe('function');
      expect(typeof sdk.retention.lessonStreak).toBe('function');
      expect(typeof sdk.retention.courseCompletionRate).toBe('function');
    });

    it('should have reliability methods', () => {
      expect(typeof sdk.reliability.errorShown).toBe('function');
      expect(typeof sdk.reliability.videoUploadFailed).toBe('function');
      expect(typeof sdk.reliability.enrollmentFailed).toBe('function');
      expect(typeof sdk.reliability.webVitals).toBe('function');
      expect(typeof sdk.reliability.apiError).toBe('function');
    });
  });

  describe('Reset', () => {
    it('should reset user data', () => {
      sdk.identify({
        userId: 'user-123',
        email: 'test@example.com',
      });

      sdk.reset();

      expect((sdk as any).userId).toBe(null);
      expect((sdk as any).userMetadata).toEqual({});
    });

    it('should reset initialization state', () => {
      sdk.initialize();
      sdk.reset();
      expect((sdk as any).initialized).toBe(false);
    });

    it('should clear event queue', () => {
      sdk.track('test_event');
      expect((sdk as any).queue).toHaveLength(1);

      sdk.reset();
      expect((sdk as any).queue).toHaveLength(0);
    });
  });
});
