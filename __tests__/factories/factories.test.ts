/**
 * Test Data Factories - Unit Tests
 * Test ID: TEST-FAC-001
 *
 * Validates that factories generate valid test data.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createUser,
  createAdmin,
  createInstructor,
  createCourse,
  createDraftCourse,
  createFreeCourse,
  createChapter,
  createLesson,
  createVideoLesson,
  createOrder,
  createPendingOrder,
  createOrderItem,
  createEntitlement,
  createEmailProgram,
  createEmailAutomation,
  createUsers,
  createCourses,
  createCourseWithContent,
  createUserWithPurchase,
  resetSequences,
} from './index';

describe('Test Data Factories', () => {
  beforeEach(() => {
    resetSequences();
  });

  describe('User Factories', () => {
    it('should create user with default values', () => {
      const user = createUser();

      expect(user.id).toBeTruthy();
      expect(user.email).toMatch(/user\d+@test\.com/);
      expect(user.full_name).toMatch(/Test User \d+/);
      expect(user.role).toBe('user');
      expect(user.created_at).toBeTruthy();
      expect(user.updated_at).toBeTruthy();
    });

    it('should create user with overrides', () => {
      const user = createUser({
        email: 'custom@example.com',
        full_name: 'Custom Name',
        role: 'instructor',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.full_name).toBe('Custom Name');
      expect(user.role).toBe('instructor');
    });

    it('should create admin user', () => {
      const admin = createAdmin();

      expect(admin.role).toBe('admin');
      expect(admin.full_name).toMatch(/Admin User \d+/);
    });

    it('should create instructor user', () => {
      const instructor = createInstructor();

      expect(instructor.role).toBe('instructor');
      expect(instructor.full_name).toMatch(/Instructor \d+/);
    });

    it('should generate unique emails for multiple users', () => {
      const users = createUsers(3);

      expect(users[0].email).not.toBe(users[1].email);
      expect(users[1].email).not.toBe(users[2].email);
    });

    it('should increment sequence for each user', () => {
      const user1 = createUser();
      const user2 = createUser();

      expect(user1.email).toBe('user1@test.com');
      expect(user2.email).toBe('user2@test.com');
    });
  });

  describe('Course Factories', () => {
    it('should create course with default values', () => {
      const course = createCourse();

      expect(course.id).toBeTruthy();
      expect(course.title).toMatch(/Test Course \d+/);
      expect(course.slug).toBeTruthy();
      expect(course.price_cents).toBe(9900);
      expect(course.status).toBe('published');
      expect(course.visibility).toBe('public');
    });

    it('should generate slug from title', () => {
      const course = createCourse({ title: 'My Test Course' });

      expect(course.slug).toMatch(/^my-test-course-[a-z0-9]+$/);
    });

    it('should create draft course', () => {
      const course = createDraftCourse();

      expect(course.status).toBe('draft');
    });

    it('should create free course', () => {
      const course = createFreeCourse();

      expect(course.price_cents).toBe(0);
    });

    it('should allow overriding any field', () => {
      const course = createCourse({
        title: 'Custom Course',
        price_cents: 4900,
        status: 'draft',
      });

      expect(course.title).toBe('Custom Course');
      expect(course.price_cents).toBe(4900);
      expect(course.status).toBe('draft');
    });

    it('should create multiple courses with unique IDs', () => {
      const courses = createCourses(3);

      expect(courses[0].id).not.toBe(courses[1].id);
      expect(courses[1].id).not.toBe(courses[2].id);
    });
  });

  describe('Chapter Factories', () => {
    it('should create chapter with default values', () => {
      const chapter = createChapter();

      expect(chapter.id).toBeTruthy();
      expect(chapter.course_id).toBeTruthy();
      expect(chapter.title).toMatch(/Chapter \d+/);
      expect(chapter.position).toBeGreaterThan(0);
      expect(chapter.is_published).toBe(true);
    });

    it('should increment position for each chapter', () => {
      const chapter1 = createChapter();
      const chapter2 = createChapter();

      expect(chapter2.position).toBeGreaterThan(chapter1.position);
    });

    it('should associate chapter with course', () => {
      const course = createCourse();
      const chapter = createChapter({ course_id: course.id });

      expect(chapter.course_id).toBe(course.id);
    });
  });

  describe('Lesson Factories', () => {
    it('should create lesson with default values', () => {
      const lesson = createLesson();

      expect(lesson.id).toBeTruthy();
      expect(lesson.chapter_id).toBeTruthy();
      expect(lesson.title).toMatch(/Lesson \d+/);
      expect(lesson.lesson_type).toBe('multimedia');
      expect(lesson.position).toBeGreaterThan(0);
      expect(lesson.drip_type).toBe('immediate');
    });

    it('should create video lesson', () => {
      const lesson = createVideoLesson();

      expect(lesson.lesson_type).toBe('video');
      expect(lesson.video_url).toBeTruthy();
      expect(lesson.duration_minutes).toBe(20);
    });

    it('should set module_id same as chapter_id for backward compat', () => {
      const lesson = createLesson();

      expect(lesson.module_id).toBe(lesson.chapter_id);
    });

    it('should increment position for each lesson', () => {
      const lesson1 = createLesson();
      const lesson2 = createLesson();

      expect(lesson2.position).toBeGreaterThan(lesson1.position);
    });
  });

  describe('Order Factories', () => {
    it('should create order with default values', () => {
      const order = createOrder();

      expect(order.id).toBeTruthy();
      expect(order.user_id).toBeTruthy();
      expect(order.email).toMatch(/buyer\d+@test\.com/);
      expect(order.status).toBe('completed');
      expect(order.amount).toBe(9900);
      expect(order.currency).toBe('usd');
      expect(order.stripe_payment_intent_id).toBeTruthy();
    });

    it('should create pending order', () => {
      const order = createPendingOrder();

      expect(order.status).toBe('pending');
      expect(order.stripe_payment_intent_id).toBeNull();
    });

    it('should generate valid Stripe IDs', () => {
      const order = createOrder();

      expect(order.stripe_payment_intent_id).toMatch(/^pi_test_/);
      expect(order.stripe_customer_id).toMatch(/^cus_test_/);
    });
  });

  describe('Order Item Factories', () => {
    it('should create order item with default values', () => {
      const item = createOrderItem();

      expect(item.id).toBeTruthy();
      expect(item.order_id).toBeTruthy();
      expect(item.product_type).toBe('course');
      expect(item.price_cents).toBe(9900);
      expect(item.quantity).toBe(1);
    });

    it('should link to order', () => {
      const order = createOrder();
      const item = createOrderItem({ order_id: order.id });

      expect(item.order_id).toBe(order.id);
    });
  });

  describe('Entitlement Factories', () => {
    it('should create entitlement with default values', () => {
      const entitlement = createEntitlement();

      expect(entitlement.id).toBeTruthy();
      expect(entitlement.user_id).toBeTruthy();
      expect(entitlement.course_id).toBeTruthy();
      expect(entitlement.access_type).toBe('lifetime');
      expect(entitlement.expires_at).toBeNull();
    });

    it('should link user, course, and order', () => {
      const user = createUser();
      const course = createCourse();
      const order = createOrder();

      const entitlement = createEntitlement({
        user_id: user.id,
        course_id: course.id,
        order_id: order.id,
      });

      expect(entitlement.user_id).toBe(user.id);
      expect(entitlement.course_id).toBe(course.id);
      expect(entitlement.order_id).toBe(order.id);
    });
  });

  describe('Email Program Factories', () => {
    it('should create email program with default values', () => {
      const program = createEmailProgram();

      expect(program.id).toBeTruthy();
      expect(program.name).toMatch(/Email Program \d+/);
      expect(program.type).toBe('broadcast');
      expect(program.status).toBe('draft');
      expect(program.schedule_cron).toBe('0 9 * * 1');
      expect(program.timezone).toBe('America/New_York');
    });
  });

  describe('Email Automation Factories', () => {
    it('should create email automation with default values', () => {
      const automation = createEmailAutomation();

      expect(automation.id).toBeTruthy();
      expect(automation.name).toMatch(/Email Automation \d+/);
      expect(automation.trigger_event).toBe('user.signup');
      expect(automation.status).toBe('draft');
    });
  });

  describe('Complex Scenarios', () => {
    it('should create course with chapters and lessons', () => {
      const { course, chapters, lessons } = createCourseWithContent({
        chapterCount: 2,
        lessonsPerChapter: 3,
      });

      expect(course).toBeTruthy();
      expect(chapters).toHaveLength(2);
      expect(lessons).toHaveLength(6); // 2 chapters * 3 lessons

      // Verify relationships
      expect(chapters[0].course_id).toBe(course.id);
      expect(lessons[0].chapter_id).toBe(chapters[0].id);
      expect(lessons[3].chapter_id).toBe(chapters[1].id);
    });

    it('should create user with completed purchase', () => {
      const { user, course, order, orderItem, entitlement } = createUserWithPurchase({});

      // Verify all entities created
      expect(user).toBeTruthy();
      expect(course).toBeTruthy();
      expect(order).toBeTruthy();
      expect(orderItem).toBeTruthy();
      expect(entitlement).toBeTruthy();

      // Verify relationships
      expect(order.user_id).toBe(user.id);
      expect(order.email).toBe(user.email);
      expect(orderItem.order_id).toBe(order.id);
      expect(orderItem.product_id).toBe(course.id);
      expect(entitlement.user_id).toBe(user.id);
      expect(entitlement.course_id).toBe(course.id);
      expect(entitlement.order_id).toBe(order.id);
    });
  });

  describe('Sequence Management', () => {
    it('should reset sequences', () => {
      const user1 = createUser();
      expect(user1.email).toBe('user1@test.com');

      const user2 = createUser();
      expect(user2.email).toBe('user2@test.com');

      resetSequences();

      const user3 = createUser();
      expect(user3.email).toBe('user1@test.com');
    });

    it('should maintain independent sequences for different types', () => {
      const user = createUser();
      const course = createCourse();

      expect(user.email).toBe('user1@test.com');
      expect(course.title).toBe('Test Course 1');

      const user2 = createUser();
      const course2 = createCourse();

      expect(user2.email).toBe('user2@test.com');
      expect(course2.title).toBe('Test Course 2');
    });
  });

  describe('Data Validity', () => {
    it('should generate valid UUIDs', () => {
      const user = createUser();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(user.id).toMatch(uuidRegex);
    });

    it('should generate valid ISO timestamps', () => {
      const user = createUser();

      expect(new Date(user.created_at).toISOString()).toBe(user.created_at);
      expect(new Date(user.updated_at).toISOString()).toBe(user.updated_at);
    });

    it('should generate valid email addresses', () => {
      const user = createUser();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(user.email).toMatch(emailRegex);
    });

    it('should generate valid slugs', () => {
      const course = createCourse();
      const slugRegex = /^[a-z0-9-]+$/;

      expect(course.slug).toMatch(slugRegex);
      expect(course.slug).not.toMatch(/^-/); // no leading hyphen
      expect(course.slug).not.toMatch(/-$/); // no trailing hyphen
    });
  });
});
