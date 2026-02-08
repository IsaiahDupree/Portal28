import { GET } from '@/app/api/leaderboard/route';
import { GET as GET_RANK } from '@/app/api/leaderboard/rank/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Leaderboard API Routes', () => {
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

  describe('GET /api/leaderboard', () => {
    it('should return leaderboard with default parameters', async () => {
      const mockLeaderboard = [
        {
          user_id: 'user-1',
          display_name: 'John Doe',
          avatar_url: null,
          rank: 1,
          points: 1000,
          achievements_count: 10,
          current_streak: 15,
          lessons_completed: 50,
        },
        {
          user_id: 'user-2',
          display_name: 'Jane Smith',
          avatar_url: null,
          rank: 2,
          points: 800,
          achievements_count: 8,
          current_streak: 10,
          lessons_completed: 40,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockLeaderboard,
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/leaderboard');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toEqual(mockLeaderboard);
      expect(data.period).toBe('overall');
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_leaderboard', {
        p_period: 'overall',
        p_limit: 50,
        p_offset: 0,
      });
    });

    it('should return weekly leaderboard when period=weekly', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/leaderboard?period=weekly');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe('weekly');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_leaderboard', {
        p_period: 'weekly',
        p_limit: 50,
        p_offset: 0,
      });
    });

    it('should return monthly leaderboard when period=monthly', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/leaderboard?period=monthly');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe('monthly');
    });

    it('should respect custom limit and offset', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request(
        'http://localhost/api/leaderboard?limit=10&offset=20'
      );
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_leaderboard', {
        p_period: 'overall',
        p_limit: 10,
        p_offset: 20,
      });
    });

    it('should return 400 for invalid period', async () => {
      const mockRequest = new Request('http://localhost/api/leaderboard?period=invalid');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid period');
    });

    it('should return 400 for invalid limit', async () => {
      const mockRequest = new Request('http://localhost/api/leaderboard?limit=200');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Limit must be between');
    });

    it('should return 500 if database error occurs', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const mockRequest = new Request('http://localhost/api/leaderboard');
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch leaderboard');
    });
  });

  describe('GET /api/leaderboard/rank', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const mockRequest = new Request('http://localhost/api/leaderboard/rank');
      const response = await GET_RANK(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user rank data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockRankData = {
        user_rank: 5,
        total_users: 100,
        points: 500,
        above_user_id: 'user-4',
        above_user_name: 'Top User',
        above_user_points: 550,
        below_user_id: 'user-6',
        below_user_name: 'Next User',
        below_user_points: 450,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [mockRankData],
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/leaderboard/rank');
      const response = await GET_RANK(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rank).toEqual(mockRankData);
      expect(data.period).toBe('overall');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_rank', {
        p_user_id: mockUser.id,
        p_period: 'overall',
      });
    });

    it('should support different periods', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request(
        'http://localhost/api/leaderboard/rank?period=weekly'
      );
      const response = await GET_RANK(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe('weekly');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_rank', {
        p_user_id: mockUser.id,
        p_period: 'weekly',
      });
    });

    it('should return 400 for invalid period', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = new Request(
        'http://localhost/api/leaderboard/rank?period=invalid'
      );
      const response = await GET_RANK(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid period');
    });

    it('should return null rank if user not in leaderboard', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockRequest = new Request('http://localhost/api/leaderboard/rank');
      const response = await GET_RANK(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rank).toBeNull();
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

      const mockRequest = new Request('http://localhost/api/leaderboard/rank');
      const response = await GET_RANK(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch user rank');
    });
  });
});
