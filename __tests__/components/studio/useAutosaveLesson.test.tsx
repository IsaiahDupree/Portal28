/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutosaveLesson, useAutosave } from '@/components/studio/useAutosaveLesson';
import { updateLessonContent } from '@/app/actions/studio';

// Mock server action
jest.mock('@/app/actions/studio', () => ({
  updateLessonContent: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useAutosaveLesson', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      expect(result.current.saving).toBe(false);
      expect(result.current.savedAt).toBe(null);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.save).toBe('function');
    });
  });

  describe('Saving Behavior', () => {
    it('should save document after debounce delay', async () => {
      (updateLessonContent as jest.Mock).mockResolvedValue({
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      const mockDoc = { type: 'doc', content: [] };

      act(() => {
        result.current.save(mockDoc);
      });

      // Should not save immediately
      expect(result.current.saving).toBe(false);
      expect(updateLessonContent).not.toHaveBeenCalled();

      // Advance timer by debounce delay (600ms)
      await act(async () => {
        jest.advanceTimersByTime(600);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(updateLessonContent).toHaveBeenCalledWith('lesson-123', mockDoc);
        expect(result.current.savedAt).toBe('2024-01-01T00:00:00Z');
        expect(result.current.saving).toBe(false);
      });
    });

    it('should set saving state during save operation', async () => {
      let resolveUpdate: any;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      (updateLessonContent as jest.Mock).mockReturnValue(updatePromise);

      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      act(() => {
        result.current.save({ type: 'doc' });
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
        await Promise.resolve(); // Allow async operations to start
      });

      // Should be saving
      expect(result.current.saving).toBe(true);

      // Resolve the update
      await act(async () => {
        resolveUpdate({ updatedAt: '2024-01-01T00:00:00Z' });
        await updatePromise;
      });

      // Should no longer be saving
      expect(result.current.saving).toBe(false);
    });

    it('should debounce multiple rapid saves', async () => {
      (updateLessonContent as jest.Mock).mockResolvedValue({
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      // Simulate rapid saves
      act(() => {
        result.current.save({ content: 'v1' });
      });

      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      act(() => {
        result.current.save({ content: 'v2' });
      });

      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      act(() => {
        result.current.save({ content: 'v3' });
      });

      // Only the last save should trigger after debounce
      await act(async () => {
        jest.advanceTimersByTime(600);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(updateLessonContent).toHaveBeenCalledTimes(1);
        expect(updateLessonContent).toHaveBeenCalledWith('lesson-123', { content: 'v3' });
      });
    });

    it('should handle save errors', async () => {
      const errorMessage = 'Network error';
      (updateLessonContent as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      act(() => {
        result.current.save({ type: 'doc' });
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.saving).toBe(false);
      });
    });

    it('should clear error on new save attempt', async () => {
      (updateLessonContent as jest.Mock).mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      // First save - fails
      act(() => {
        result.current.save({ content: 'v1' });
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Error');
      });

      // Second save - should clear error
      (updateLessonContent as jest.Mock).mockResolvedValue({
        updatedAt: '2024-01-01T00:00:00Z',
      });

      act(() => {
        result.current.save({ content: 'v2' });
      });

      // Error should be cleared immediately
      expect(result.current.error).toBe(null);
    });

    it('should handle non-Error exceptions', async () => {
      (updateLessonContent as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() => useAutosaveLesson('lesson-123'));

      act(() => {
        result.current.save({ type: 'doc' });
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to save');
      });
    });
  });
});

describe('useAutosave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return initial value and state', () => {
      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial Title')
      );

      expect(result.current.value).toBe('Initial Title');
      expect(result.current.saving).toBe(false);
      expect(result.current.savedAt).toBe(null);
      expect(typeof result.current.setValue).toBe('function');
    });
  });

  describe('Autosave Behavior', () => {
    it('should autosave after delay when value changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ saved_at: '2024-01-01T00:00:00Z' }),
      });

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial Title', 1000)
      );

      act(() => {
        result.current.setValue('Updated Title');
      });

      expect(result.current.value).toBe('Updated Title');

      // Should not save immediately
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance timer by delay
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/studio/lessons/lesson-123',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Updated Title' }),
          })
        );
      });
    });

    it('should not autosave when value equals initial value', async () => {
      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial Title')
      );

      act(() => {
        result.current.setValue('Initial Title');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should set saving state during save', async () => {
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial Title')
      );

      act(() => {
        result.current.setValue('Updated');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should be saving
      expect(result.current.saving).toBe(true);

      // Resolve fetch
      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ saved_at: '2024-01-01T00:00:00Z' }),
        });
        await fetchPromise;
      });

      // Should no longer be saving
      expect(result.current.saving).toBe(false);
    });

    it('should update savedAt timestamp on successful save', async () => {
      const savedTime = '2024-01-01T12:00:00Z';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ saved_at: savedTime }),
      });

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial Title')
      );

      act(() => {
        result.current.setValue('Updated');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.savedAt).toEqual(new Date(savedTime));
      });
    });

    it('should debounce multiple value changes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ saved_at: '2024-01-01T00:00:00Z' }),
      });

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial', 1000)
      );

      // Simulate rapid typing
      act(() => {
        result.current.setValue('A');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.setValue('AB');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.setValue('ABC');
      });

      // Complete debounce
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      // Should only save once with final value
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/studio/lessons/lesson-123',
          expect.objectContaining({
            body: JSON.stringify({ title: 'ABC' }),
          })
        );
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial')
      );

      act(() => {
        result.current.setValue('Updated');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Autosave failed:',
          expect.any(Error)
        );
        expect(result.current.saving).toBe(false);
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle failed response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial')
      );

      act(() => {
        result.current.setValue('Updated');
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.saving).toBe(false);
      });

      consoleErrorSpy.mockRestore();
    });

    it('should use custom delay', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ saved_at: '2024-01-01T00:00:00Z' }),
      });

      const { result } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial', 2000)
      );

      act(() => {
        result.current.setValue('Updated');
      });

      // Should not save after 1000ms
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(global.fetch).not.toHaveBeenCalled();

      // Should save after 2000ms total
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() =>
        useAutosave('lesson-123', 'title', 'Initial')
      );

      act(() => {
        result.current.setValue('Updated');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});
