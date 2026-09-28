import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce hook', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces value updates until the timer fires', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ val, delay }) => useDebounce(val, delay),
      { initialProps: { val: 'first', delay: 300 } }
    );

    expect(result.current).toBe('first');

    // Update prop
    rerender({ val: 'second', delay: 300 });

    // Should still be 'first' before timer expires
    expect(result.current).toBe('first');

    // Fast-forward 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first');

    // Fast-forward another 100ms (total 300ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second');

    vi.useRealTimers();
  });
});
