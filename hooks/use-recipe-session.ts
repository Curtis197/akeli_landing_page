'use client';

import { useEffect, useRef } from 'react';
import { trackOpen, trackClose } from '@/lib/tracking/tracking-client';
import type { TrackingSource } from '@/lib/tracking/types';

export function useRecipeSession(recipeId: string, source: TrackingSource) {
  const openIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const openedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    const open = async () => {
      openedAtRef.current = new Date();
      const session = await trackOpen({ recipe_id: recipeId, source });
      if (mounted && session) {
        openIdRef.current = session.id;
        tokenRef.current = session.token;
      }
    };

    open();

    const handleUnload = () => {
      if (openIdRef.current && tokenRef.current && openedAtRef.current) {
        trackClose(openIdRef.current, tokenRef.current, openedAtRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [recipeId, source]);
}
