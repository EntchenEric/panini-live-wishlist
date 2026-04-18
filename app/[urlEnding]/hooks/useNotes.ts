import { useState, useEffect, useRef, useCallback } from 'react';
import { useWishlistEvents } from '@/lib/wishlist-events';
import { toast } from 'react-toastify';

export function useNotes(urlEnding: string, isLoggedIn: boolean) {
  const [notes, setNotes] = useState<Record<string, boolean>>({});
  const [hasNotes, setHasNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const { lastEvent } = useWishlistEvents();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      if (!isLoggedIn) return;
      setLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`/api/get_all_notes?urlEnding=${urlEnding}`, { signal: controller.signal });
      if (response.ok) {
        const data = await response.json();
        const noteMap: Record<string, boolean> = {};
        let hasAnyNotes = false;

        if (data.notes && Array.isArray(data.notes)) {
          data.notes.forEach((item: { url: string; note: string }) => {
            noteMap[item.url] = true;
            hasAnyNotes = true;
          });
        }

        setNotes(noteMap);
        setHasNotes(hasAnyNotes);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error fetching notes:', error);
      toast.error('Fehler beim Laden der Notizen', { autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  }, [urlEnding, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) fetchNotes();
  }, [urlEnding, isLoggedIn, fetchNotes]);

  useEffect(() => {
    if (lastEvent?.type === 'notesUpdated') fetchNotes();
  }, [lastEvent, fetchNotes]);

  return { notes, hasNotes, loading, showOnlyWithNotes, setShowOnlyWithNotes };
}