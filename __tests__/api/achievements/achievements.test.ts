import { GET } from '@/app/api/achievements/route';
import { GET as GET_STATS } from '@/app/api/achievements/stats/route';
import { POST as CHECK_ACHIEVEMENTS } from '@/app/api/achievements/check/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Achievement API Routes', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      rpc: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabase as any);
  });

  describe('GET /api/achievements', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user achievements with progress', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockAchievements = [
        {
          achievement_id: 'ach-1',
          achievement_key: 'first_lesson',
          achievement_name: 'First Steps',
          description: 'Complete your first lesson',
          icon: '🎯',
          category: 'learning',
          points: 10,
          tier: 'bronze',
          is_unlocked: true,
          unlocked_at: '2026-01-01T00:00:00Z',
          current_progress: 1,
          target_value: 1,
          progress_percentage: 100,
        },
        {
          achievement_id: 'ach-2',
          achievement_key: 'lessons_10',
          achievement_name: 'Getting Started',
          description: 'Complete 10 lessons',
          icon: '📚',
          category: 'learning',
          points: 50,
          tier: 'bronze',
          is_unlocked: false,
          unlocked_at: null,
          current_progress: 5,
          target_value: 10,
          progress_percentage: 50,
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: mockAchievements,
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.achievements).toEqual(mockAchievements);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_achievements', {
        p_user_id: mockUser.id,
      });
    });

    it('should return 500 if database error occurs', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch achievements');
    });
  });

  describe('GET /api/achievements/stats', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const response = await GET_STATS();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user achievement statistics', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockStats = {
        total_points: 150,
        achievements_unlocked: 3,
        achievements_total: 16,
        completion_percentage: 18,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [mockStats],
        error: null,
      });

      const response = await GET_STATS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toEqual(mockStats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_achievement_stats', {
        p_user_id: mockUser.id,
      });
    });

    it('should return empty stats if no data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await GET_STATS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toEqual({});
    });
  });

  describe('POST /api/achievements/check', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const mockRequest = new Request('http://localhost/api/achievements/check', {
        method: 'POST',
      });

      const response = await CHECK_ACHIEVEMENTS(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should check achievements and return newly unlocked ones', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockNewlyUnlocked = [
        {
          achievement_id: 'ach-1',
          achievement_key: 'first_lesson',
          achievement_name: 'First Steps',
          newly_unlocked: true,
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: mockNewlyUnlocked,
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/achievements/check', {
        method: 'POST',
      });

      const response = await CHECK_ACHIEVEMENTS(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checked).toBe(true);
      expect(data.newlyUnlocked).toEqual(mockNewlyUnlocked);
      expect(data.count).toBe(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_and_unlock_achievements', {
        p_user_id: mockUser.id,
        p_category: null,
      });
    });

    it('should check all categories if no category provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/achievements/check', {
        method: 'POST',
      });

      const response = await CHECK_ACHIEVEMENTS(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checked).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_and_unlock_achievements', {
        p_user_id: mockUser.id,
        p_category: null,
      });
    });

    it('should handle no newly unlocked achievements', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/achievements/check', {
        method: 'POST',
      });

      const response = await CHECK_ACHIEVEMENTS(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checked).toBe(true);
      expect(data.newlyUnlocked).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should return 500 if database error occurs', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const mockRequest = new Request('http://localhost/api/achievements/check', {
        method: 'POST',
      });

      const response = await CHECK_ACHIEVEMENTS(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to check achievements');
    });
  });
});
