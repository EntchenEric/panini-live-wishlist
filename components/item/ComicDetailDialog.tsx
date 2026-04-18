import { Hash, Palette, Ruler, AlertTriangle, StickyNote, Pencil, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComicData } from './PriorityBadge';

type NoteState = {
  note: string;
  originalNote: string;
  isEditingNote: boolean;
  setIsEditingNote: (v: boolean) => void;
  isSavingNote: boolean;
  noteError: string | null;
  setNote: (v: string) => void;
  saveNote: () => Promise<void>;
  hasNoteChanges: boolean;
};

type ComicDetailDialogProps = {
  comicData: ComicData;
  isLoggedIn: boolean;
  noteState: NoteState;
};

export function ComicDetailDialog({ comicData, isLoggedIn, noteState }: ComicDetailDialogProps) {
  const { note, originalNote, isEditingNote, setIsEditingNote, isSavingNote, noteError, setNote, saveNote, hasNoteChanges } = noteState;

  return (
    <div className="space-y-4 py-2">
      {comicData.fallback && (
        <div className="bg-orange-900/20 border border-orange-800 rounded-md p-3 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-400 mr-2 mt-0.5" />
            <div>
              <h4 className="text-orange-400 font-medium">Begrenzte Informationen</h4>
              <p className="text-sm text-gray-300">Wir konnten keine vollständigen Informationen für diesen Comic abrufen. Einige Details sind möglicherweise nicht verfügbar oder unvollständig.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Preis</h4><p className={`text-lg font-bold ${comicData.fallback ? 'text-gray-400' : 'text-indigo-400'}`}>{comicData.price}</p></div>
        <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Veröffentlichungsdatum</h4><p>{comicData.release}</p></div>
      </div>
      <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Autor</h4><p>{comicData.author}</p></div>
      <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Künstler</h4><p>{comicData.drawer}</p></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Typ</h4><p>{comicData.type}</p></div>
        <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Seiten</h4><p>{comicData.pageAmount}</p></div>
      </div>
      {comicData.articleNumber && (
        <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Artikelnummer</h4><div className="flex items-center"><Hash className="h-3.5 w-3.5 mr-1.5 text-gray-500" /><p>{comicData.articleNumber}</p></div></div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {comicData.format && (<div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Format</h4><div className="flex items-center"><Ruler className="h-3.5 w-3.5 mr-1.5 text-gray-500" /><p>{comicData.format}</p></div></div>)}
        {comicData.color && (<div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Farbe</h4><div className="flex items-center"><Palette className="h-3.5 w-3.5 mr-1.5 text-gray-500" /><p>{comicData.color}</p></div></div>)}
      </div>
      <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Bindung</h4><p>{comicData.binding || "Nicht angegeben"}</p></div>
      <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">ISBN</h4><p>{comicData.ISBN || "Nicht verfügbar"}</p></div>
      <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Geschichten</h4><p>{comicData.stories || "Nicht angegeben"}</p></div>
      <div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Verfügbarkeit</h4><p>{comicData.deliverableTo}</p></div>
      {comicData.deliveryFrom && (<div className="space-y-2"><h4 className="text-sm font-medium text-gray-400">Versand von</h4><p>{comicData.deliveryFrom}</p></div>)}

      {isLoggedIn && (
        <div className="space-y-2 mt-4 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-400 flex items-center"><StickyNote className="h-4 w-4 mr-1.5 text-indigo-400" />Notizen</h4>
            {!isEditingNote ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingNote(true)} className="h-7 text-indigo-400 hover:text-indigo-300 hover:bg-gray-700"><Pencil className="h-3.5 w-3.5 mr-1" />Bearbeiten</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setNote(originalNote); setIsEditingNote(false); }} className="h-7 text-gray-400 hover:text-gray-300 hover:bg-gray-700" disabled={isSavingNote}>Abbrechen</Button>
                <Button variant="default" size="sm" onClick={saveNote} className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSavingNote || !hasNoteChanges}>
                  {isSavingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}Speichern
                </Button>
              </div>
            )}
          </div>
          {isEditingNote ? (
            <div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 text-gray-200 p-2 min-h-[100px]" placeholder="Fügen Sie hier Ihre Notizen hinzu..." disabled={isSavingNote} />
              {noteError && <p className="text-xs text-red-400 mt-1">{noteError}</p>}
            </div>
          ) : (
            <div className="bg-gray-900 rounded-md p-3 min-h-[60px]">
              {note ? <p className="text-gray-300 whitespace-pre-wrap">{note}</p> : <p className="text-gray-500 italic text-sm">Keine Notizen vorhanden. Klicken Sie auf "Bearbeiten", um Notizen hinzuzufügen.</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {comicData.fromCache && (<Badge variant="outline" className="bg-yellow-900/30 text-yellow-400 border-yellow-700">{comicData.cacheAge ? `Zwischengespeicherte Daten (${comicData.cacheAge})` : 'Zwischengespeicherte Daten'}</Badge>)}
        {!comicData.fallback && !comicData.fromCache && (<Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700">Live-Daten</Badge>)}
      </div>
    </div>
  );
}