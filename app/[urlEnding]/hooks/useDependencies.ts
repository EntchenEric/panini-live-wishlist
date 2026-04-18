import { useState, useEffect, useRef, useCallback } from 'react';
import { EnhancedWishlistItem } from '@/lib/types';
import { useWishlistEvents } from '@/lib/wishlist-events';
import { toast } from 'react-toastify';

export function useDependencies(urlEnding: string, wishlistData: Array<EnhancedWishlistItem> | null) {
  const [dependencies, setDependencies] = useState<Record<string, string>>({});
  const [hasDependencies, setHasDependencies] = useState(false);
  const [loading, setLoading] = useState(false);
  const { lastEvent } = useWishlistEvents();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDependencies = useCallback(async () => {
    try {
      if (!wishlistData) return;
      setLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/get_all_dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlEnding }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        const grouped: Record<string, string[]> = data.dependencies || {};
        const dependencyMap: Record<string, string> = {};
        let hasAny = false;

        for (const [url, depUrls] of Object.entries(grouped)) {
          if ((depUrls as string[]).length > 0) {
            dependencyMap[url] = (depUrls as string[])[0];
            hasAny = true;
          }
        }

        setDependencies(dependencyMap);
        setHasDependencies(hasAny);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error fetching dependencies:', error);
      toast.error('Fehler beim Laden der Abhängigkeiten', { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  }, [urlEnding, wishlistData]);

  useEffect(() => {
    if (wishlistData && wishlistData.length > 0) fetchDependencies();
  }, [wishlistData, fetchDependencies]);

  useEffect(() => {
    if (lastEvent?.type === 'dependenciesUpdated') fetchDependencies();
  }, [lastEvent, fetchDependencies]);

  return { dependencies, hasDependencies, loading, fetchDependencies };
}