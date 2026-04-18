import { useState, useEffect, useRef, useCallback } from 'react';
import { useWishlistEvents } from '@/lib/wishlist-events';
import { toast } from 'react-toastify';

export function usePriorities(urlEnding: string, isLoggedIn: boolean, lastReloadTime: number) {
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [hasPriorityItems, setHasPriorityItems] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { lastEvent } = useWishlistEvents();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPriorities = useCallback(async () => {
    try {
      setLoading(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`/api/get_priorities?urlEnding=${urlEnding}`, { signal: controller.signal });
      if (response.ok) {
        const data = await response.json();
        const priorityMap: Record<string, number> = {};
        let hasItems = false;

        if (data.priorities && Array.isArray(data.priorities)) {
          data.priorities.forEach((item: { url: string; priority: number }) => {
            priorityMap[item.url] = item.priority;
            hasItems = true;
          });
        }

        setPriorities(priorityMap);
        setHasPriorityItems(hasItems);

        if (hasItems && Object.keys(priorities).length === 0) {
          setSortField('priority');
          setSortDirection('asc');
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error fetching priorities:', error);
      toast.error('Fehler beim Laden der Prioritäten', { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlEnding]);

  useEffect(() => {
    fetchPriorities();
  }, [urlEnding, lastReloadTime, isLoggedIn, fetchPriorities]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'prioritiesUpdated') fetchPriorities();
    if (lastEvent.type === 'firstPriorityAdded') {
      fetchPriorities();
      setHasPriorityItems(true);
      if (sortField === 'name') {
        setSortField('priority');
        setSortDirection('asc');
      }
    }
  }, [lastEvent, fetchPriorities, sortField]);

  return { priorities, setPriorities, hasPriorityItems, setHasPriorityItems, loading, sortField, setSortField, sortDirection, setSortDirection, fetchPriorities };
}