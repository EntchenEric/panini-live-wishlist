import { useState } from 'react';
import { useWishlistEvents } from '@/lib/wishlist-events';

export function useNoteEditor(urlEnding: string, url: string, isLoggedIn: boolean, initialHasNote: boolean, initialNotePreview: string) {
  const [note, setNote] = useState('');
  const [originalNote, setOriginalNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [hasNote, setHasNote] = useState(initialHasNote);
  const [notePreview, setNotePreview] = useState(initialNotePreview);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { emit } = useWishlistEvents();

  const saveNote = async () => {
    if (!isLoggedIn) return;
    setIsSavingNote(true);
    setNoteError(null);

    try {
      const response = await fetch('/api/save_note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlEnding, url, note }),
      });

      if (response.ok) {
        setOriginalNote(note);
        setIsEditingNote(false);
        setHasNote(!!note);
        setNotePreview(note ? (note.length > 60 ? note.substring(0, 60) + '...' : note) : '');
        emit('notesUpdated');
      } else {
        const errorText = await response.text();
        setNoteError('Failed to save note: ' + errorText);
      }
    } catch (error) {
      setNoteError('Error saving note: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSavingNote(false);
    }
  };

  const hasNoteChanges = note !== originalNote;

  return {
    note, setNote, originalNote, isEditingNote, setIsEditingNote, isSavingNote,
    noteError, hasNote, notePreview, dialogOpen, setDialogOpen, saveNote, hasNoteChanges,
  };
}