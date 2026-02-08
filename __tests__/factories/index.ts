/**
 * Test Data Factories
 *
 * Utilities for generating test data with sensible defaults.
 * Based on the Factory pattern for consistent, reusable test data.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Base Factory Types
// ============================================================================

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

let sequenceCounters: Record<string, number> = {};

export function sequence(name: string): number {
  if (!sequenceCounters[name]) {
    sequenceCounters[name] = 1;
  }
  return sequenceCounters[name]++;
}

export function resetSequences(): void {
  sequenceCounters = {};
}

// ============================================================================
// User Factory
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin' | 'instructor';
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export function createUser(overrides: DeepPartial<TestUser> = {}): TestUser {
  const seq = sequence('user');
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    email: `user${seq}@test.com`,
    full_name: `Test User ${seq}`,
    role: 'user',
    created_at: now,
    updated_at: now,
    avatar_url: null,
    bio: null,
    ...overrides,
  };
}

export function createAdmin(overrides: DeepPartial<TestUser> = {}): TestUser {
  return createUser({
    role: 'admin',
    full_name: `Admin User ${sequence('admin')}`,
    ...overrides,
  });
}

export function createInstructor(overrides: DeepPartial<TestUser> = {}): TestUser {
  return createUser({
    role: 'instructor',
    full_name: `Instructor ${sequence('instructor')}`,
    ...overrides,
  });
}

// ============================================================================
// Course Factory
// ============================================================================

export interface TestCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  hero_image_url: string | null;
  price_cents: number;
  stripe_price_id: string | null;
  status: 'draft' | 'published';
  visibility: 'public' | 'private' | 'unlisted';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function createCourse(overrides: DeepPartial<TestCourse> = {}): TestCourse {
  const seq = sequence('course');
  const now = new Date().toISOString();
  const title = overrides.title || `Test Course ${seq}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString(36)}`;

  return {
    id: randomUUID(),
    title,
    slug,
    description: `Description for ${title}`,
    hero_image_url: null,
    price_cents: 9900,
    stripe_price_id: null,
    status: 'published',
    visibility: 'public',
    created_at: now,
    updated_at: now,
    created_by: randomUUID(),
    ...overrides,
  };
}

export function createDraftCourse(overrides: DeepPartial<TestCourse> = {}): TestCourse {
  return createCourse({
    status: 'draft',
    ...overrides,
  });
}

export function createPrivateCourse(overrides: DeepPartial<TestCourse> = {}): TestCourse {
  return createCourse({
    visibility: 'private',
    ...overrides,
  });
}

export function createFreeCourse(overrides: DeepPartial<TestCourse> = {}): TestCourse {
  return createCourse({
    price_cents: 0,
    ...overrides,
  });
}

// ============================================================================
// Chapter (Module) Factory
// ============================================================================

export interface TestChapter {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function createChapter(overrides: DeepPartial<TestChapter> = {}): TestChapter {
  const seq = sequence('chapter');
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    course_id: randomUUID(),
    title: `Chapter ${seq}`,
    description: `Description for Chapter ${seq}`,
    position: seq * 1000,
    is_published: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============================================================================
// Lesson Factory
// ============================================================================

export interface TestLesson {
  id: string;
  chapter_id: string;
  module_id: string;
  title: string;
  lesson_type: 'video' | 'text' | 'quiz' | 'multimedia' | 'assignment';
  position: number;
  content_doc: Record<string, any>;
  content_html: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  is_published: boolean;
  is_preview: boolean;
  drip_type: 'immediate' | 'days_after_enrollment' | 'specific_date';
  drip_value: number | null;
  created_at: string;
  updated_at: string;
}

export function createLesson(overrides: DeepPartial<TestLesson> = {}): TestLesson {
  const seq = sequence('lesson');
  const now = new Date().toISOString();
  const chapterId = overrides.chapter_id || randomUUID();

  return {
    id: randomUUID(),
    chapter_id: chapterId,
    module_id: chapterId, // backward compat
    title: `Lesson ${seq}`,
    lesson_type: 'multimedia',
    position: seq * 1000,
    content_doc: {},
    content_html: `<p>Content for lesson ${seq}</p>`,
    video_url: null,
    duration_minutes: 15,
    is_published: true,
    is_preview: false,
    drip_type: 'immediate',
    drip_value: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createVideoLesson(overrides: DeepPartial<TestLesson> = {}): TestLesson {
  return createLesson({
    lesson_type: 'video',
    video_url: 'https://stream.mux.com/test-playback-id',
    duration_minutes: 20,
    ...overrides,
  });
}

export function createPreviewLesson(overrides: DeepPartial<TestLesson> = {}): TestLesson {
  return createLesson({
    is_preview: true,
    ...overrides,
  });
}

// ============================================================================
// Order Factory
// ============================================================================

export interface TestOrder {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function createOrder(overrides: DeepPartial<TestOrder> = {}): TestOrder {
  const seq = sequence('order');
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    user_id: randomUUID(),
    email: `buyer${seq}@test.com`,
    status: 'completed',
    amount: 9900,
    currency: 'usd',
    stripe_payment_intent_id: `pi_test_${randomUUID().substring(0, 24)}`,
    stripe_customer_id: `cus_test_${randomUUID().substring(0, 18)}`,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createPendingOrder(overrides: DeepPartial<TestOrder> = {}): TestOrder {
  return createOrder({
    status: 'pending',
    stripe_payment_intent_id: null,
    ...overrides,
  });
}

export function createRefundedOrder(overrides: DeepPartial<TestOrder> = {}): TestOrder {
  return createOrder({
    status: 'refunded',
    ...overrides,
  });
}

// ============================================================================
// Order Item Factory
// ============================================================================

export interface TestOrderItem {
  id: string;
  order_id: string;
  product_type: 'course' | 'membership' | 'bundle';
  product_id: string;
  product_name: string;
  price_cents: number;
  quantity: number;
  created_at: string;
}

export function createOrderItem(overrides: DeepPartial<TestOrderItem> = {}): TestOrderItem {
  const seq = sequence('order_item');
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    order_id: randomUUID(),
    product_type: 'course',
    product_id: randomUUID(),
    product_name: `Product ${seq}`,
    price_cents: 9900,
    quantity: 1,
    created_at: now,
    ...overrides,
  };
}

// ============================================================================
// Entitlement Factory
// ============================================================================

export interface TestEntitlement {
  id: string;
  user_id: string;
  course_id: string;
  access_type: 'lifetime' | 'subscription' | 'trial';
  granted_at: string;
  expires_at: string | null;
  order_id: string | null;
  created_at: string;
}

export function createEntitlement(overrides: DeepPartial<TestEntitlement> = {}): TestEntitlement {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    user_id: randomUUID(),
    course_id: randomUUID(),
    access_type: 'lifetime',
    granted_at: now,
    expires_at: null,
    order_id: randomUUID(),
    created_at: now,
    ...overrides,
  };
}

export function createTrialEntitlement(overrides: DeepPartial<TestEntitlement> = {}): TestEntitlement {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  return createEntitlement({
    access_type: 'trial',
    expires_at: expiresAt.toISOString(),
    order_id: null,
    ...overrides,
  });
}

// ============================================================================
// Email Program Factory
// ============================================================================

export interface TestEmailProgram {
  id: string;
  name: string;
  description: string | null;
  type: 'broadcast' | 'trigger';
  status: 'draft' | 'active' | 'paused';
  schedule_text: string | null;
  schedule_cron: string | null;
  timezone: string;
  audience_type: 'all' | 'segment';
  audience_filter_json: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function createEmailProgram(overrides: DeepPartial<TestEmailProgram> = {}): TestEmailProgram {
  const seq = sequence('email_program');
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    name: `Email Program ${seq}`,
    description: `Description for program ${seq}`,
    type: 'broadcast',
    status: 'draft',
    schedule_text: 'every Monday at 9am',
    schedule_cron: '0 9 * * 1',
    timezone: 'America/New_York',
    audience_type: 'all',
    audience_filter_json: {},
    created_by: randomUUID(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============================================================================
// Email Automation Factory
// ============================================================================

export interface TestEmailAutomation {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_filter_json: Record<string, any>;
  status: 'draft' | 'active' | 'paused';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function createEmailAutomation(overrides: DeepPartial<TestEmailAutomation> = {}): TestEmailAutomation {
  const seq = sequence('email_automation');
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    name: `Email Automation ${seq}`,
    description: `Description for automation ${seq}`,
    trigger_event: 'user.signup',
    trigger_filter_json: {},
    status: 'draft',
    created_by: randomUUID(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============================================================================
// Batch Factories
// ============================================================================

export function createUsers(count: number, overrides: DeepPartial<TestUser> = {}): TestUser[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

export function createCourses(count: number, overrides: DeepPartial<TestCourse> = {}): TestCourse[] {
  return Array.from({ length: count }, () => createCourse(overrides));
}

export function createOrders(count: number, overrides: DeepPartial<TestOrder> = {}): TestOrder[] {
  return Array.from({ length: count }, () => createOrder(overrides));
}

export function createLessons(count: number, overrides: DeepPartial<TestLesson> = {}): TestLesson[] {
  return Array.from({ length: count }, () => createLesson(overrides));
}

// ============================================================================
// Complex Scenarios
// ============================================================================

/**
 * Creates a complete course with chapters and lessons
 */
export function createCourseWithContent(config: {
  courseOverrides?: DeepPartial<TestCourse>;
  chapterCount?: number;
  lessonsPerChapter?: number;
}): {
  course: TestCourse;
  chapters: TestChapter[];
  lessons: TestLesson[];
} {
  const { courseOverrides = {}, chapterCount = 3, lessonsPerChapter = 5 } = config;

  const course = createCourse(courseOverrides);
  const chapters: TestChapter[] = [];
  const lessons: TestLesson[] = [];

  for (let i = 0; i < chapterCount; i++) {
    const chapter = createChapter({
      course_id: course.id,
      position: (i + 1) * 1000,
    });
    chapters.push(chapter);

    for (let j = 0; j < lessonsPerChapter; j++) {
      const lesson = createLesson({
        chapter_id: chapter.id,
        module_id: course.id,
        position: (j + 1) * 1000,
      });
      lessons.push(lesson);
    }
  }

  return { course, chapters, lessons };
}

/**
 * Creates a user with a completed purchase and entitlement
 */
export function createUserWithPurchase(config: {
  userOverrides?: DeepPartial<TestUser>;
  courseOverrides?: DeepPartial<TestCourse>;
  orderOverrides?: DeepPartial<TestOrder>;
}): {
  user: TestUser;
  course: TestCourse;
  order: TestOrder;
  orderItem: TestOrderItem;
  entitlement: TestEntitlement;
} {
  const { userOverrides = {}, courseOverrides = {}, orderOverrides = {} } = config;

  const user = createUser(userOverrides);
  const course = createCourse(courseOverrides);
  const order = createOrder({
    user_id: user.id,
    email: user.email,
    ...orderOverrides,
  });
  const orderItem = createOrderItem({
    order_id: order.id,
    product_id: course.id,
    product_name: course.title,
    price_cents: course.price_cents,
  });
  const entitlement = createEntitlement({
    user_id: user.id,
    course_id: course.id,
    order_id: order.id,
  });

  return { user, course, order, orderItem, entitlement };
}
