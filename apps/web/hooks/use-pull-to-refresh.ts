'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    // Read current pullDistance from DOM to avoid stale closure
    const currentDistance = pullDistance;
    if (currentDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, refreshing, pullDistance };
}
