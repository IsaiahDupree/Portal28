// Quiz API Tests
// feat-040: Quizzes

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.unstable_mockModule('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

describe('Quiz API - PLT-QIZ Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PLT-QIZ-001: Create quiz', () => {
    it('should create a quiz and return record', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        lesson_id: 'lesson-1',
        title: 'Test Quiz',
        passing_score: 70,
        allow_retakes: true,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { is_admin: true },
          error: null,
        }),
        insert: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockFrom);

      // First call for admin check
      mockFrom.single.mockResolvedValueOnce({
        data: { is_admin: true },
        error: null,
      });

      // Second call for lesson check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'lesson-1' },
        error: null,
      });

      // Third call for insert
      mockFrom.single.mockResolvedValueOnce({
        data: mockQuiz,
        error: null,
      });

      const { POST } = await import('@/app/api/admin/quizzes/route');

      const request = new Request('http://localhost/api/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          lesson_id: 'lesson-1',
          title: 'Test Quiz',
          passing_score: 70,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.quiz).toBeDefined();
      expect(data.quiz.title).toBe('Test Quiz');
    });

    it('should reject non-admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { is_admin: false },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockFrom);

      const { POST } = await import('@/app/api/admin/quizzes/route');

      const request = new Request('http://localhost/api/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          lesson_id: 'lesson-1',
          title: 'Test Quiz',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  describe('PLT-QIZ-002: Add question', () => {
    it('should add question and return Q', async () => {
      const mockQuestion = {
        id: 'question-1',
        quiz_id: 'quiz-1',
        question_text: 'What is 2+2?',
        points: 1,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockFrom);

      // Admin check
      mockFrom.single.mockResolvedValueOnce({
        data: { is_admin: true },
        error: null,
      });

      // Quiz check
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'quiz-1' },
        error: null,
      });

      // Question insert
      mockFrom.single.mockResolvedValueOnce({
        data: mockQuestion,
        error: null,
      });

      const { POST } = await import('@/app/api/admin/quizzes/[id]/questions/route');

      const request = new Request('http://localhost/api/admin/quizzes/quiz-1/questions', {
        method: 'POST',
        body: JSON.stringify({
          question_text: 'What is 2+2?',
          points: 1,
          answers: [
            { answer_text: '4', is_correct: true, sort_order: 0 },
            { answer_text: '5', is_correct: false, sort_order: 1 },
          ],
        }),
      });

      const response = await POST(request, { params: { id: 'quiz-1' } });

      expect(response.status).toBe(201);
    });
  });

  describe('PLT-QIZ-003: Submit answers', () => {
    it('should submit answers and return score', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        quiz_id: 'quiz-1',
        user_id: 'user-1',
        started_at: new Date().toISOString(),
        submitted_at: null,
        quizzes: {
          passing_score: 70,
          show_correct_answers: true,
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockFrom);

      // Attempt fetch
      mockFrom.single.mockResolvedValueOnce({
        data: mockAttempt,
        error: null,
      });

      // Questions fetch
      mockFrom.eq.mockResolvedValueOnce({
        data: [
          {
            id: 'q1',
            points: 1,
            quiz_answers: [
              { id: 'a1', is_correct: true },
              { id: 'a2', is_correct: false },
            ],
          },
        ],
        error: null,
      });

      // Mock RPC for score calculation
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: 100,
        error: null,
      });

      // Update attempt
      mockFrom.single.mockResolvedValueOnce({
        data: {
          ...mockAttempt,
          submitted_at: new Date().toISOString(),
          score: 100,
          passed: true,
        },
        error: null,
      });

      const { POST } = await import('@/app/api/quizzes/attempts/[attemptId]/submit/route');

      const request = new Request('http://localhost/api/quizzes/attempts/attempt-1/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: [
            { question_id: 'q1', selected_answer_id: 'a1' },
          ],
        }),
      });

      const response = await POST(request, { params: { attemptId: 'attempt-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.attempt.score).toBeDefined();
      expect(data.attempt.passed).toBeDefined();
    });
  });
});
