/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import {
  useLessonMediaRealtime,
  getMuxPlaybackUrl,
  getMuxEmbedUrl,
  LessonMedia,
} from '@/components/studio/useLessonMediaRealtime';
import { createBrowserClient } from '@supabase/ssr';

// Mock Supabase client
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

const mockMedia: LessonMedia = {
  id: 'media-123',
  lesson_id: 'lesson-123',
  source: 'mux',
  provider: 'mux',
  source_url: 'https://example.com/video.mp4',
  asset_id: 'asset-123',
  upload_id: 'upload-123',
  playback_id: 'playback-123',
  status: 'ready',
  duration_seconds: 120,
  thumbnail_url: 'https://example.com/thumb.jpg',
  metadata: { quality: 'hd' },
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useLessonMediaRealtime', () => {
  let mockSupabase: any;
  let mockChannel: any;
  let realtimeCallback: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockMedia }),
          })),
        })),
      })),
      channel: jest.fn((name: string) => {
        mockChannel.on = jest.fn((event, config, callback) => {
          realtimeCallback = callback;
          return mockChannel;
        });
        return mockChannel;
      }),
      removeChannel: jest.fn(),
    };

    (createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      expect(result.current.loading).toBe(true);
      expect(result.current.media).toBe(null);
    });

    it('should fetch initial media data', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.media).toEqual(mockMedia);
      expect(mockSupabase.from).toHaveBeenCalledWith('lesson_media');
    });

    it('should handle no media found', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          })),
        })),
      }));

      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.media).toBe(null);
    });

    it('should query with correct lesson ID', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const eqMock = mockSupabase.from().select().eq;
      expect(eqMock).toHaveBeenCalledWith('lesson_id', 'lesson-456');
    });
  });

  describe('Realtime Subscriptions', () => {
    it('should setup realtime subscription', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSupabase.channel).toHaveBeenCalledWith('lesson-media-lesson-123');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_media',
          filter: 'lesson_id=eq.lesson-123',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should update media on INSERT event', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newMedia = {
        ...mockMedia,
        id: 'media-456',
        status: 'uploading' as const,
      };

      // Simulate realtime INSERT event
      realtimeCallback({
        eventType: 'INSERT',
        new: newMedia,
      });

      await waitFor(() => {
        expect(result.current.media).toEqual(newMedia);
      });
    });

    it('should update media on UPDATE event', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedMedia = {
        ...mockMedia,
        status: 'processing' as const,
      };

      // Simulate realtime UPDATE event
      realtimeCallback({
        eventType: 'UPDATE',
        new: updatedMedia,
      });

      await waitFor(() => {
        expect(result.current.media).toEqual(updatedMedia);
      });
    });

    it('should set media to null on DELETE event', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.media).toEqual(mockMedia);

      // Simulate realtime DELETE event
      realtimeCallback({
        eventType: 'DELETE',
        old: mockMedia,
      });

      await waitFor(() => {
        expect(result.current.media).toBe(null);
      });
    });
  });

  describe('Status Updates', () => {
    it('should track upload status changes', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Uploading
      realtimeCallback({
        eventType: 'UPDATE',
        new: { ...mockMedia, status: 'uploading' },
      });

      await waitFor(() => {
        expect(result.current.media?.status).toBe('uploading');
      });

      // Processing
      realtimeCallback({
        eventType: 'UPDATE',
        new: { ...mockMedia, status: 'processing' },
      });

      await waitFor(() => {
        expect(result.current.media?.status).toBe('processing');
      });

      // Ready
      realtimeCallback({
        eventType: 'UPDATE',
        new: { ...mockMedia, status: 'ready' },
      });

      await waitFor(() => {
        expect(result.current.media?.status).toBe('ready');
      });
    });

    it('should handle failed status', async () => {
      const { result } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      realtimeCallback({
        eventType: 'UPDATE',
        new: { ...mockMedia, status: 'failed' },
      });

      await waitFor(() => {
        expect(result.current.media?.status).toBe('failed');
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from channel on unmount', async () => {
      const { unmount } = renderHook(() => useLessonMediaRealtime('lesson-123'));

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useLessonMediaRealtime('lesson-123')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialMedia = result.current.media;

      unmount();

      // Try to trigger update after unmount
      realtimeCallback({
        eventType: 'UPDATE',
        new: { ...mockMedia, status: 'processing' },
      });

      // Media should not have changed
      expect(result.current.media).toEqual(initialMedia);
    });
  });

  describe('Lesson ID Changes', () => {
    it('should refetch data when lesson ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ lessonId }) => useLessonMediaRealtime(lessonId),
        {
          initialProps: { lessonId: 'lesson-123' },
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mock to track new calls
      jest.clearAllMocks();

      // Change lesson ID
      rerender({ lessonId: 'lesson-456' });

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lesson_media');
      });

      const eqMock = mockSupabase.from().select().eq;
      expect(eqMock).toHaveBeenCalledWith('lesson_id', 'lesson-456');
    });
  });
});

describe('Mux Helper Functions', () => {
  describe('getMuxPlaybackUrl', () => {
    it('should return video playback URL', () => {
      const url = getMuxPlaybackUrl('test-playback-id');
      expect(url).toBe('https://stream.mux.com/test-playback-id.m3u8');
    });

    it('should return video playback URL when type is video', () => {
      const url = getMuxPlaybackUrl('test-playback-id', 'video');
      expect(url).toBe('https://stream.mux.com/test-playback-id.m3u8');
    });

    it('should return thumbnail URL when type is thumbnail', () => {
      const url = getMuxPlaybackUrl('test-playback-id', 'thumbnail');
      expect(url).toBe('https://image.mux.com/test-playback-id/thumbnail.jpg');
    });
  });

  describe('getMuxEmbedUrl', () => {
    it('should return embed URL', () => {
      const url = getMuxEmbedUrl('test-playback-id');
      expect(url).toBe('https://stream.mux.com/test-playback-id');
    });

    it('should handle different playback IDs', () => {
      const url1 = getMuxEmbedUrl('abc123');
      const url2 = getMuxEmbedUrl('xyz789');

      expect(url1).toBe('https://stream.mux.com/abc123');
      expect(url2).toBe('https://stream.mux.com/xyz789');
    });
  });
});
