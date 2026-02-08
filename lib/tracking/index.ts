/**
 * Portal28 Event Tracking SDK
 *
 * Tracks user events across acquisition, activation, core value, monetization, and retention.
 * Based on PRD_EVENT_TRACKING.md
 */

export interface TrackingEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

export interface UserIdentification {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  metadata?: Record<string, any>;
}

/**
 * Event categories based on PRD
 */
export const EventCategory = {
  ACQUISITION: 'acquisition',
  ACTIVATION: 'activation',
  CORE_VALUE: 'core_value',
  MONETIZATION: 'monetization',
  RETENTION: 'retention',
  RELIABILITY: 'reliability',
} as const;

/**
 * Event names from PRD
 */
export const Events = {
  // Acquisition
  LANDING_VIEW: 'landing_view',
  CTA_CLICK: 'cta_click',
  PRICING_VIEW: 'pricing_view',
  COURSE_PREVIEW: 'course_preview',

  // Activation
  SIGNUP_START: 'signup_start',
  LOGIN_SUCCESS: 'login_success',
  ACTIVATION_COMPLETE: 'activation_complete',
  FIRST_COURSE_CREATED: 'first_course_created',

  // Core Value
  COURSE_CREATED: 'course_created',
  LESSON_ADDED: 'lesson_added',
  COURSE_PUBLISHED: 'course_published',
  ENROLLMENT_COMPLETED: 'enrollment_completed',
  LESSON_COMPLETED: 'lesson_completed',
  CERTIFICATE_ISSUED: 'certificate_issued',
  // TRACK-004: Product-specific value events
  PRODUCT_CREATED: 'product_created',
  PRODUCT_COMPLETED: 'product_completed',
  PRODUCT_DOWNLOADED: 'product_downloaded',
  TEMPLATE_DOWNLOADED: 'template_downloaded',
  RESOURCE_DOWNLOADED: 'resource_downloaded',
  CERTIFICATE_DOWNLOADED: 'certificate_downloaded',

  // Monetization
  CHECKOUT_STARTED: 'checkout_started',
  PURCHASE_COMPLETED: 'purchase_completed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  COURSE_SOLD: 'course_sold',

  // Retention
  RETURN_SESSION: 'return_session',
  LESSON_STREAK: 'lesson_streak',
  COURSE_COMPLETION_RATE: 'course_completion_rate',

  // Reliability
  ERROR_SHOWN: 'error_shown',
  VIDEO_UPLOAD_FAILED: 'video_upload_failed',
  ENROLLMENT_FAILED: 'enrollment_failed',
  // TRACK-007: Performance tracking
  WEB_VITALS: 'web_vitals',
  API_ERROR: 'api_error',
} as const;

class TrackingSDK {
  private initialized = false;
  private userId: string | null = null;
  private userMetadata: Record<string, any> = {};
  private queue: TrackingEvent[] = [];

  /**
   * Initialize the tracking SDK
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[Tracking] SDK already initialized');
      return;
    }

    this.initialized = true;

    // Flush any queued events
    this.flush();

    if (typeof window !== 'undefined') {
      // Track page views
      this.trackPageView();

      // Track return sessions
      this.trackReturnSession();
    }
  }

  /**
   * Identify a user
   */
  identify(identification: UserIdentification): void {
    this.userId = identification.userId;
    this.userMetadata = {
      email: identification.email,
      name: identification.name,
      role: identification.role,
      ...identification.metadata,
    };

    // GDP-009: PostHog Identity Stitching
    // Identify user with PostHog using person_id from database
    import('@/lib/posthog/client')
      .then(({ identifyUser }) => {
        identifyUser(identification.userId, this.userMetadata);
      })
      .catch(() => {
        // Silently fail if PostHog not available
      });

    // Send identify call to backend
    this.sendEvent({
      event: '_identify',
      userId: identification.userId,
      properties: this.userMetadata,
    });
  }

  /**
   * Track an event
   */
  track(event: string, properties?: Record<string, any>): void {
    const trackingEvent: TrackingEvent = {
      event,
      properties: {
        ...properties,
        ...this.userMetadata,
      },
      userId: this.userId ?? undefined,
      timestamp: new Date().toISOString(),
    };

    if (!this.initialized) {
      // Queue event if not initialized
      this.queue.push(trackingEvent);
      return;
    }

    this.sendEvent(trackingEvent);
  }

  /**
   * Track a page view
   */
  trackPageView(page?: string): void {
    if (typeof window === 'undefined') return;

    const pagePath = page || window.location.pathname;

    this.track('page_view', {
      page: pagePath,
      url: window.location.href,
      referrer: document.referrer,
    });
  }

  /**
   * Track acquisition events
   */
  acquisition = {
    landingView: (properties?: Record<string, any>) => {
      this.track(Events.LANDING_VIEW, properties);
    },
    ctaClick: (ctaName: string, properties?: Record<string, any>) => {
      this.track(Events.CTA_CLICK, { cta_name: ctaName, ...properties });
    },
    pricingView: (properties?: Record<string, any>) => {
      this.track(Events.PRICING_VIEW, properties);
    },
    coursePreview: (courseId: string, properties?: Record<string, any>) => {
      this.track(Events.COURSE_PREVIEW, { course_id: courseId, ...properties });
    },
  };

  /**
   * Track activation events
   */
  activation = {
    signupStart: (method?: string) => {
      this.track(Events.SIGNUP_START, { method });
    },
    loginSuccess: (method?: string) => {
      this.track(Events.LOGIN_SUCCESS, { method });
    },
    activationComplete: () => {
      this.track(Events.ACTIVATION_COMPLETE);
    },
    firstCourseCreated: (courseId: string) => {
      this.track(Events.FIRST_COURSE_CREATED, { course_id: courseId });
    },
  };

  /**
   * Track core value events
   */
  coreValue = {
    courseCreated: (course: {
      courseId: string;
      title: string;
      lessonCount?: number;
      category?: string;
    }) => {
      this.track(Events.COURSE_CREATED, {
        course_id: course.courseId,
        title: course.title,
        lesson_count: course.lessonCount ?? 0,
        category: course.category,
      });
    },
    lessonAdded: (courseId: string, lessonId: string) => {
      this.track(Events.LESSON_ADDED, {
        course_id: courseId,
        lesson_id: lessonId,
      });
    },
    coursePublished: (courseId: string, title: string) => {
      this.track(Events.COURSE_PUBLISHED, {
        course_id: courseId,
        title,
      });
    },
    enrollmentCompleted: (enrollment: {
      courseId: string;
      studentId: string;
      price?: number;
      couponUsed?: string;
    }) => {
      this.track(Events.ENROLLMENT_COMPLETED, {
        course_id: enrollment.courseId,
        student_id: enrollment.studentId,
        price: enrollment.price,
        coupon_used: enrollment.couponUsed,
      });
    },
    lessonCompleted: (courseId: string, lessonId: string) => {
      this.track(Events.LESSON_COMPLETED, {
        course_id: courseId,
        lesson_id: lessonId,
      });
    },
    certificateIssued: (courseId: string, certificateId: string) => {
      this.track(Events.CERTIFICATE_ISSUED, {
        course_id: courseId,
        certificate_id: certificateId,
      });
    },
    // TRACK-004: Product-specific value events
    productCreated: (product: {
      productId: string;
      productType: string;
      title: string;
      category?: string;
    }) => {
      this.track(Events.PRODUCT_CREATED, {
        product_id: product.productId,
        product_type: product.productType,
        title: product.title,
        category: product.category,
      });
    },
    productCompleted: (product: {
      productId: string;
      productType: string;
      userId?: string;
    }) => {
      this.track(Events.PRODUCT_COMPLETED, {
        product_id: product.productId,
        product_type: product.productType,
        user_id: product.userId,
      });
    },
    productDownloaded: (product: {
      productId: string;
      productType: string;
      fileName?: string;
      fileSize?: number;
    }) => {
      this.track(Events.PRODUCT_DOWNLOADED, {
        product_id: product.productId,
        product_type: product.productType,
        file_name: product.fileName,
        file_size: product.fileSize,
      });
    },
    templateDownloaded: (templateId: string, fileName: string) => {
      this.track(Events.TEMPLATE_DOWNLOADED, {
        template_id: templateId,
        file_name: fileName,
      });
    },
    resourceDownloaded: (resourceId: string, fileName: string, fileSize?: number) => {
      this.track(Events.RESOURCE_DOWNLOADED, {
        resource_id: resourceId,
        file_name: fileName,
        file_size: fileSize,
      });
    },
    certificateDownloaded: (certificateId: string, courseId: string) => {
      this.track(Events.CERTIFICATE_DOWNLOADED, {
        certificate_id: certificateId,
        course_id: courseId,
      });
    },
  };

  /**
   * Track monetization events
   */
  monetization = {
    checkoutStarted: (checkout: {
      courseId?: string;
      productId?: string;
      amount: number;
      currency?: string;
    }) => {
      this.track(Events.CHECKOUT_STARTED, {
        course_id: checkout.courseId,
        product_id: checkout.productId,
        amount: checkout.amount,
        currency: checkout.currency ?? 'USD',
      });
    },
    purchaseCompleted: (purchase: {
      courseId?: string;
      productId?: string;
      amount: number;
      currency?: string;
      paymentMethod?: string;
    }) => {
      this.track(Events.PURCHASE_COMPLETED, {
        course_id: purchase.courseId,
        product_id: purchase.productId,
        amount: purchase.amount,
        currency: purchase.currency ?? 'USD',
        payment_method: purchase.paymentMethod,
      });
    },
    subscriptionStarted: (subscription: {
      planId: string;
      amount: number;
      interval: string;
    }) => {
      this.track(Events.SUBSCRIPTION_STARTED, {
        plan_id: subscription.planId,
        amount: subscription.amount,
        interval: subscription.interval,
      });
    },
    courseSold: (sale: {
      courseId: string;
      studentId: string;
      amount: number;
    }) => {
      this.track(Events.COURSE_SOLD, {
        course_id: sale.courseId,
        student_id: sale.studentId,
        amount: sale.amount,
      });
    },
  };

  /**
   * Track retention events
   */
  retention = {
    returnSession: (daysSinceLastSession?: number) => {
      this.track(Events.RETURN_SESSION, {
        days_since_last_session: daysSinceLastSession,
      });
    },
    lessonStreak: (streakDays: number) => {
      this.track(Events.LESSON_STREAK, {
        streak_days: streakDays,
      });
    },
    courseCompletionRate: (courseId: string, completionRate: number) => {
      this.track(Events.COURSE_COMPLETION_RATE, {
        course_id: courseId,
        completion_rate: completionRate,
      });
    },
  };

  /**
   * Track reliability/error events
   */
  reliability = {
    errorShown: (error: {
      message: string;
      code?: string;
      page?: string;
    }) => {
      this.track(Events.ERROR_SHOWN, {
        error_message: error.message,
        error_code: error.code,
        page: error.page,
      });
    },
    videoUploadFailed: (error: string) => {
      this.track(Events.VIDEO_UPLOAD_FAILED, {
        error_message: error,
      });
    },
    enrollmentFailed: (courseId: string, error: string) => {
      this.track(Events.ENROLLMENT_FAILED, {
        course_id: courseId,
        error_message: error,
      });
    },
    // TRACK-007: Performance and API error tracking
    webVitals: (metric: {
      name: string;
      value: number;
      rating?: string;
      id?: string;
    }) => {
      this.track(Events.WEB_VITALS, {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: metric.rating,
        metric_id: metric.id,
      });
    },
    apiError: (error: {
      endpoint: string;
      method: string;
      status?: number;
      message?: string;
    }) => {
      this.track(Events.API_ERROR, {
        api_endpoint: error.endpoint,
        api_method: error.method,
        status_code: error.status,
        error_message: error.message,
      });
    },
  };

  /**
   * Track return session based on localStorage
   */
  private trackReturnSession(): void {
    if (typeof window === 'undefined') return;

    const lastSessionKey = 'portal28_last_session';
    const lastSession = localStorage.getItem(lastSessionKey);
    const now = Date.now();

    if (lastSession) {
      const lastTime = parseInt(lastSession, 10);
      const daysSince = Math.floor((now - lastTime) / (1000 * 60 * 60 * 24));

      if (daysSince > 0) {
        this.retention.returnSession(daysSince);
      }
    }

    localStorage.setItem(lastSessionKey, now.toString());
  }

  /**
   * Flush queued events
   */
  private flush(): void {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  }

  /**
   * Send event to backend
   */
  private sendEvent(event: TrackingEvent): void {
    if (typeof window === 'undefined') return;

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Tracking]', event.event, event.properties);
    }

    // META-003: Map event to Meta Pixel standard events
    // Dynamic import to avoid circular dependencies
    import('@/lib/meta/eventMapping')
      .then(({ mapEventToMetaPixel }) => {
        mapEventToMetaPixel(event.event, event.properties);
      })
      .catch(() => {
        // Silently fail if Meta Pixel mapping not available
      });

    // Send to API endpoint
    fetch('/api/tracking/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
      keepalive: true, // Ensure event is sent even if page unloads
    }).catch((error) => {
      console.error('[Tracking] Failed to send event:', error);
    });
  }

  /**
   * Reset the SDK (for testing and logout)
   */
  reset(): void {
    this.userId = null;
    this.userMetadata = {};
    this.queue = [];
    this.initialized = false;

    // GDP-009: Reset PostHog identity on logout
    import('@/lib/posthog/client')
      .then(({ resetIdentity }) => {
        resetIdentity();
      })
      .catch(() => {
        // Silently fail if PostHog not available
      });
  }
}

// Export singleton instance
export const tracking = new TrackingSDK();

// Auto-initialize on client
if (typeof window !== 'undefined') {
  tracking.initialize();
}

// Export for testing
export { TrackingSDK };
