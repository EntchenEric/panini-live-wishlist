import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Info, RefreshCw, Calendar, User, Layers, AlertTriangle, Link, StickyNote, Save } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PrioritySelector } from './PrioritySelector';
import { PriorityBadge, getPriorityStyle, ComicData } from './item/PriorityBadge';
import { ComicDetailDialog } from './item/ComicDetailDialog';
import { useNoteEditor } from './item/useNoteEditor';
import { useDependencyManager } from './item/useDependencyManager';

type ItemProps = {
  name: string;
  url: string;
  image: string;
  comicData: ComicData;
  isLoggedIn?: boolean;
  urlEnding: string;
  onPriorityChange?: (url: string, priority: number) => void;
  wishlistItems?: Array<{ name: string; url: string }>;
};

export function Item({ name: _name, url, image, comicData, isLoggedIn = false, urlEnding, onPriorityChange, wishlistItems = [] }: ItemProps) {
  const [loading, _setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_dialogOpen, _setDialogOpen] = useState(false);
  const [hasNote, setHasNote] = useState(false);
  const [notePreview, setNotePreview] = useState('');
  const [currentPriority, setCurrentPriority] = useState<number | undefined>(comicData.priority);
  const abortControllerRef = useRef<AbortController | null>(null);

  const note = useNoteEditor(urlEnding, url, isLoggedIn, hasNote, notePreview);
  const dep = useDependencyManager(urlEnding, url, isLoggedIn, comicData, wishlistItems);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadData = async () => {
      if (isLoggedIn) {
        try {
          const noteResponse = await fetch(`/api/get_note?urlEnding=${urlEnding}&url=${encodeURIComponent(url)}`, { signal: controller.signal });
          if (noteResponse.ok) {
            const noteData = await noteResponse.json();
            const hasNoteContent = !!noteData.note;
            setHasNote(hasNoteContent);
            if (hasNoteContent) {
              const fullNote = noteData.note;
              setNotePreview(fullNote.length > 60 ? fullNote.substring(0, 60) + '...' : fullNote);
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Error loading data:', error);
        }
      }
    };
    loadData();

    return () => controller.abort();
  }, [isLoggedIn, urlEnding, url]);

  useEffect(() => {
    setCurrentPriority(comicData.priority);
  }, [comicData.priority]);

  const handlePriorityChange = (priority: number) => {
    setCurrentPriority(priority);
    if (onPriorityChange) onPriorityChange(url, priority);
  };

  return (
    <div className="relative">
      <Card className={`group w-full max-w-xs min-h-[24rem] rounded-lg overflow-hidden bg-gray-800 shadow-md transition-transform transform hover:scale-105 hover:shadow-2xl ${getPriorityStyle(currentPriority)} pt-0`}>
        <PriorityBadge priority={currentPriority} />

        {comicData.hasDependency && (
          <div className="absolute top-2 left-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-900/30 border border-indigo-400/20 backdrop-blur-sm transform transition-all duration-200 hover:scale-110"
                    style={{ backdropFilter: 'blur(8px)' }}
                  >
                    <Link />
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Dieser Comic hat Abhängigkeiten</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <CardHeader className="w-full h-2/5 p-0">
            <img src={image} alt={comicData.name} className="w-full h-full object-cover rounded-t-lg transition-transform" />
          </CardHeader>
        </a>

        <CardContent className="p-4 text-gray-200">
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
            <h3 className="font-semibold group-hover:text-blue-400 transition-colors duration-300 text-center text-[clamp(1rem, 5vw, 1.25rem)] line-clamp-2 h-[4rem]">
              {comicData.name}
            </h3>
          </a>

          {loading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Daten werden geladen...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center rounded-md bg-red-700 hover:bg-red-600 px-2 py-1 text-xs text-white cursor-pointer" onClick={() => setError(null)}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Erneut versuchen
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p>Fehler beim Laden der Comic-Daten. Klicken Sie, um es erneut zu versuchen.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : comicData ? (
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="default">{comicData.price}</Badge>
                {comicData.type && <Badge variant="outline" className="border-gray-600 text-gray-300">{comicData.type}</Badge>}
              </div>
              {comicData.release && <div className="flex items-center text-gray-400"><Calendar className="h-3.5 w-3.5 mr-1.5" /><span className="truncate">{comicData.release}</span></div>}
              {comicData.author && <div className="flex items-center text-gray-400"><User className="h-3.5 w-3.5 mr-1.5" /><span className="truncate">{comicData.author}</span></div>}
              {comicData.pageAmount && <div className="flex items-center text-gray-400"><Layers className="h-3.5 w-3.5 mr-1.5" /><span>{comicData.pageAmount}</span></div>}

              <div className="flex items-center justify-center mt-1 gap-2 flex-wrap">
                <PrioritySelector url={url} urlEnding={urlEnding} initialPriority={currentPriority} isLoggedIn={isLoggedIn} onPriorityChange={handlePriorityChange} />

                {isLoggedIn && (note.hasNote && note.notePreview ? (
                  <div className="w-full mt-2 p-2 bg-indigo-900/30 rounded-md border border-indigo-800/50 text-gray-300 text-xs cursor-pointer hover:bg-indigo-900/50" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') note.setDialogOpen(true); }} onClick={() => note.setDialogOpen(true)} aria-label="Notiz anzeigen">
                    <div className="flex items-start gap-1.5"><StickyNote className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" /><p className="line-clamp-2 whitespace-pre-wrap">{note.notePreview}</p></div>
                  </div>
                ) : isLoggedIn && (
                  <div className="w-full mt-2 flex justify-center" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { note.setDialogOpen(true); note.setIsEditingNote(true); } }} onClick={() => { note.setDialogOpen(true); note.setIsEditingNote(true); }} aria-label="Notiz hinzufügen">
                    <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-indigo-800 border-none text-gray-300 text-xs py-1 h-7"><StickyNote className="h-3 w-3 mr-1.5" />Notiz hinzufügen</Button>
                  </div>
                ))}

                {comicData.hasDependency ? (
                  <div className={`w-full mt-2 p-2 bg-blue-900/30 rounded-md border border-blue-800/50 text-gray-300 text-xs ${isLoggedIn ? 'cursor-pointer hover:bg-blue-900/50' : ''}`} role="button" tabIndex={isLoggedIn ? 0 : undefined} onKeyDown={isLoggedIn ? (e) => { if (e.key === 'Enter' || e.key === ' ') dep.setDependencyDialogOpen(true); } : undefined} onClick={() => isLoggedIn && dep.setDependencyDialogOpen(true)} aria-label={`Abhängigkeit: ${wishlistItems.find(item => item.url === comicData.dependencyUrl)?.name || comicData.dependencyUrl}`}>
                    <div className="flex items-start gap-1.5"><Link className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" /><span>Dieser Comic basiert auf: {wishlistItems.find(item => item.url === comicData.dependencyUrl)?.name || comicData.dependencyUrl}</span></div>
                  </div>
                ) : isLoggedIn && (
                  <div className="w-full mt-2 flex justify-center" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dep.setDependencyDialogOpen(true); }} onClick={() => dep.setDependencyDialogOpen(true)} aria-label="Abhängigkeit hinzufügen">
                    <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-blue-800 border-none text-gray-300 text-xs py-1 h-7"><Link className="h-3 w-3 mr-1.5" />Abhängigkeit hinzufügen</Button>
                  </div>
                )}

                {comicData.fromCache && (
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><Badge variant="outline" className="bg-yellow-900/30 text-yellow-400 border-yellow-700 text-xs cursor-help"><RefreshCw className="h-3 w-3 mr-1" /> Zwischengespeicherte Daten</Badge></TooltipTrigger><TooltipContent><p>{comicData.cacheAge ? `Daten sind ${comicData.cacheAge} alt.` : 'Verwenden von zwischengespeicherten Daten.'}</p></TooltipContent></Tooltip></TooltipProvider>
                )}
                {comicData.fallback && (
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><Badge variant="outline" className="bg-orange-900/30 text-orange-400 border-orange-700 text-xs cursor-help"><AlertTriangle className="h-3 w-3 mr-1" /> Begrenzte Daten</Badge></TooltipTrigger><TooltipContent><p>Verwendung von Ersatzdaten. Einige Informationen sind möglicherweise nicht verfügbar.</p></TooltipContent></Tooltip></TooltipProvider>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /><span className="ml-2 text-sm text-gray-400">Daten werden geladen...</span></div>
          )}
        </CardContent>

        <CardFooter className="p-3 pt-0 flex justify-end">
          <Dialog open={note.dialogOpen} onOpenChange={note.setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-gray-600 border-none text-gray-200" onClick={() => note.setDialogOpen(true)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Info className="h-4 w-4 mr-1" />}
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-100">{comicData.name}</DialogTitle>
                <DialogDescription className="text-gray-300">Comic-Details und Informationen</DialogDescription>
              </DialogHeader>
              <ComicDetailDialog comicData={comicData} isLoggedIn={isLoggedIn} noteState={note} />
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      <Dialog open={dep.dependencyDialogOpen} onOpenChange={dep.setDependencyDialogOpen}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-100">Abhängigkeiten verwalten</DialogTitle>
            <DialogDescription className="text-gray-300">Abhängigkeiten für {comicData.name} hinzufügen oder bearbeiten</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Input value={dep.searchQuery} onChange={(e) => dep.handleSearch(e.target.value)} onKeyDown={dep.handleSearchKeyDown} placeholder="Comic als Abhängigkeit suchen..." className="w-full bg-gray-900 border-gray-700 text-gray-200" disabled={dep.isSavingDependency} aria-label="Search comics for dependency" />
              {dep.showSearchResults && dep.filteredItems.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto" role="listbox" aria-label="Search results">
                  {dep.filteredItems.map((item, index) => (
                    <div key={index} className={`px-3 py-2 hover:bg-gray-800 cursor-pointer text-sm ${dep.highlightedIndex === index ? 'bg-gray-800' : ''}`} onClick={() => dep.handleItemSelect(item.url)} role="option" aria-selected={dep.highlightedIndex === index}>
                      <div className="font-medium text-gray-200">{item.name}</div>
                      <div className="text-xs text-gray-400 truncate">{item.url}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {comicData.dependencyUrl && (
              <div className="bg-gray-900 rounded-md p-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">Aktuelle Abhängigkeit:</span>
                  <span className="text-blue-400">{wishlistItems.find(item => item.url === comicData.dependencyUrl)?.name || comicData.dependencyUrl}</span>
                </div>
              </div>
            )}
            {dep.dependencyError && <p className="text-xs text-red-400">{dep.dependencyError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { dep.setDependencyUrl(comicData.dependencyUrl || ''); dep.setDependencyDialogOpen(false); }} className="text-gray-400 hover:text-gray-300 hover:bg-gray-700" disabled={dep.isSavingDependency}>Abbrechen</Button>
            <Button onClick={dep.saveDependency} className="bg-blue-600 hover:bg-blue-500 text-white" disabled={dep.isSavingDependency || !dep.hasDependencyChanges}>
              {dep.isSavingDependency ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}