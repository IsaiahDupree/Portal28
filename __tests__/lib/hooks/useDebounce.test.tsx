/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/lib/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should handle different data types', () => {
      const { result: stringResult } = renderHook(() => useDebounce('test', 500));
      const { result: numberResult } = renderHook(() => useDebounce(42, 500));
      const { result: boolResult } = renderHook(() => useDebounce(true, 500));
      const { result: objectResult } = renderHook(() =>
        useDebounce({ key: 'value' }, 500)
      );

      expect(stringResult.current).toBe('test');
      expect(numberResult.current).toBe(42);
      expect(boolResult.current).toBe(true);
      expect(objectResult.current).toEqual({ key: 'value' });
    });
  });

  describe('Debouncing Behavior', () => {
    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated' });

      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Fast-forward time by 499ms (just before delay)
      act(() => {
        jest.advanceTimersByTime(499);
      });

      // Value should still be initial
      expect(result.current).toBe('initial');

      // Fast-forward time by 1ms (reaching delay)
      act(() => {
        jest.advanceTimersByTime(1);
      });

      // Now value should be updated
      expect(result.current).toBe('updated');
    });

    it('should reset timer on value change', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // Change value to 'first'
      rerender({ value: 'first' });

      // Advance time by 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Change value to 'second' before first debounce completes
      rerender({ value: 'second' });

      // Advance time by 300ms (total 600ms from first change, but only 300ms from second)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Value should still be initial because timer was reset
      expect(result.current).toBe('initial');

      // Advance time by another 200ms (500ms from second change)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Now value should be 'second'
      expect(result.current).toBe('second');
    });

    it('should handle multiple rapid value changes', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // Simulate typing - multiple rapid changes
      rerender({ value: 'a' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'ab' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'abc' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'abcd' });

      // Value should still be initial (only 300ms passed)
      expect(result.current).toBe('initial');

      // Advance time to complete debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should have the final value
      expect(result.current).toBe('abcd');
    });
  });

  describe('Delay Changes', () => {
    it('should use new delay when delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        }
      );

      // Change delay
      rerender({ value: 'initial', delay: 1000 });

      // Change value
      rerender({ value: 'updated', delay: 1000 });

      // Advance by 500ms (old delay)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Value should still be initial (new delay is 1000ms)
      expect(result.current).toBe('initial');

      // Advance by another 500ms (total 1000ms)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Now value should be updated
      expect(result.current).toBe('updated');
    });
  });

  describe('Cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      unmount();

      // Should have called clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should not update value after unmount', () => {
      const { result, unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        {
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      const currentValue = result.current;

      unmount();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Value should not have changed after unmount
      expect(result.current).toBe(currentValue);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle null values', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: null },
      });

      expect(result.current).toBe(null);

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle undefined values', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: undefined },
      });

      expect(result.current).toBe(undefined);

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'same' },
      });

      rerender({ value: 'same' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('same');
    });
  });
});
