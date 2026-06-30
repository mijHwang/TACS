import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePageSize } from './usePageSize';

describe('usePageSize', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to 10 when nothing is stored', () => {
    const { result } = renderHook(() => usePageSize());
    expect(result.current.pageSize).toBe(10);
    expect(result.current.options).toEqual([10, 20, 50, 100]);
  });

  it('persists the chosen size to localStorage', () => {
    const { result } = renderHook(() => usePageSize());
    act(() => result.current.setPageSize(50));
    expect(result.current.pageSize).toBe(50);
    expect(localStorage.getItem('tacs.pageSize')).toBe('50');
  });

  it('re-reads the persisted size on a fresh mount', () => {
    localStorage.setItem('tacs.pageSize', '20');
    const { result } = renderHook(() => usePageSize());
    expect(result.current.pageSize).toBe(20);
  });

  it('ignores an invalid stored value and falls back to 10', () => {
    localStorage.setItem('tacs.pageSize', '7');
    const { result } = renderHook(() => usePageSize());
    expect(result.current.pageSize).toBe(10);
  });
});
