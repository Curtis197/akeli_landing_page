'use client';

import { useEffect, useRef } from 'react';
import { trackImpression } from '@/lib/tracking/tracking-client';
import type { TrackingSource } from '@/lib/tracking/types';

interface UseRecipeImpressionOptions {
  recipeId: string;
  source: TrackingSource;
  threshold?: number;
  delay?: number;
}

export function useRecipeImpression(
  ref: React.RefObject<HTMLElement>,
  { recipeId, source, threshold = 0.5, delay = 1000 }: UseRecipeImpressionOptions
) {
  const logged = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold && !logged.current) {
          timer.current = setTimeout(() => {
            if (!logged.current) {
              logged.current = true;
              trackImpression({ recipe_id: recipeId, source });
            }
          }, delay);
        } else {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [recipeId, source, threshold, delay, ref]);
}
