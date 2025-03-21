import { Card, CardHeader, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Info, RefreshCw, Calendar, Book, User, Layers, AlertTriangle, Hash, Palette, Ruler, Pencil, Save, StickyNote, Link } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { PrioritySelector } from './PrioritySelector';
import { Input } from "@/components/ui/input";

type ComicData = {
  price: string;
  author: string;
  drawer: string;
  release: string;
  type: string;
  pageAmount: string;
  storys: string;
  binding: string;
  ISBN: string;
  deliverableTo: string;
  deliveryFrom: string;
  fromCache?: boolean;
  fallback?: boolean;
  name?: string;
  articleNumber?: string;
  format?: string;
  color?: string;
  cacheAge?: string;
  priority?: number;
  hasDependency?: boolean;
  dependencyUrl?: string;
};

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

export function Item({ name, url, image, comicData, isLoggedIn = false, urlEnding, onPriorityChange, wishlistItems = [] }: ItemProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState<string>('');
  const [originalNote, setOriginalNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [hasNote, setHasNote] = useState(false);
  const [notePreview, setNotePreview] = useState<string>('');
  const [dependencyUrl, setDependencyUrl] = useState<string>('');
  const [isEditingDependency, setIsEditingDependency] = useState(false);
  const [isSavingDependency, setIsSavingDependency] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredItems, setFilteredItems] = useState<Array<{ name: string; url: string }>>([]);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [currentPriority, setCurrentPriority] = useState<number | undefined>(comicData.priority);

  useEffect(() => {
    const loadData = async () => {
      if (isLoggedIn) {
        try {
          const [noteResponse, dependencyResponse] = await Promise.all([
            fetch(`/api/get_note?urlEnding=${urlEnding}&url=${encodeURIComponent(url)}`),
            fetch(`/api/get_dependencies?urlEnding=${urlEnding}&url=${encodeURIComponent(url)}`)
          ]);

          // Handle note data
          if (noteResponse.ok) {
            const noteData = await noteResponse.json();
            const hasNoteContent = !!noteData.note;
            setHasNote(hasNoteContent);
            
            if (hasNoteContent) {
              const fullNote = noteData.note;
              const preview = fullNote.length > 60 
                ? fullNote.substring(0, 60) + '...' 
                : fullNote;
              setNotePreview(preview);
            }
          }

          // Handle dependency data
          if (dependencyResponse.ok) {
            const dependencyData = await dependencyResponse.json();
            if (dependencyData.dependencies && dependencyData.dependencies.length > 0) {
              setDependencyUrl(dependencyData.dependencies[0].dependencyUrl);
            }
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadData();
  }, [isLoggedIn, urlEnding, url]);

  useEffect(() => {
    setCurrentPriority(comicData.priority);
  }, [comicData.priority]);

  const saveNote = async () => {
    if (!isLoggedIn) return;
    
    setIsSavingNote(true);
    setNoteError(null);
    
    try {
      const response = await fetch('/api/save_note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urlEnding,
          url,
          note
        }),
      });
      
      if (response.ok) {
        setOriginalNote(note);
        setIsEditingNote(false);
        setHasNote(!!note);
        
        if (note) {
          const preview = note.length > 60 
            ? note.substring(0, 60) + '...' 
            : note;
          setNotePreview(preview);
        } else {
          setNotePreview('');
        }
        
        window.dispatchEvent(new CustomEvent('notesUpdated'));
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

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  };

  const hasNoteChanges = note !== originalNote;

  const handlePriorityChange = (priority: number) => {
    setCurrentPriority(priority);
    if (onPriorityChange) {
      onPriorityChange(url, priority);
    }
  };

  const getPriorityStyle = () => {
    if (!currentPriority) return "";
    
    if (currentPriority <= 3) {
      return "ring-2 ring-green-500/30 shadow-lg shadow-green-900/20 bg-gradient-to-b from-gray-800 to-green-950/30";
    } else if (currentPriority <= 6) {
      return "ring-2 ring-yellow-500/30 shadow-lg shadow-yellow-900/20 bg-gradient-to-b from-gray-800 to-yellow-950/30";
    } else {
      return "ring-2 ring-red-500/30 shadow-lg shadow-red-900/20 bg-gradient-to-b from-gray-800 to-red-950/30";
    }
  };

  const saveDependency = async () => {
    if (!isLoggedIn) return;
    
    setIsSavingDependency(true);
    setDependencyError(null);
    
    try {
      const response = await fetch('/api/save_dependency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urlEnding,
          url,
          dependencyUrl
        }),
      });
      
      if (response.ok) {
        setIsEditingDependency(false);
        setDependencyDialogOpen(false);
        window.dispatchEvent(new CustomEvent('dependenciesUpdated'));
      } else {
        const errorText = await response.text();
        setDependencyError('Failed to save dependency: ' + errorText);
      }
    } catch (error) {
      setDependencyError('Error saving dependency: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSavingDependency(false);
    }
  };

  const handleDependencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDependencyUrl(e.target.value);
  };

  const hasDependencyChanges = dependencyUrl !== comicData.dependencyUrl;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = wishlistItems.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.url.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowSearchResults(true);
    } else {
      setFilteredItems([]);
      setShowSearchResults(false);
    }
  };

  const handleItemSelect = (selectedUrl: string) => {
    const selectedItem = wishlistItems.find(item => item.url === selectedUrl);
    setDependencyUrl(selectedUrl);
    setSearchQuery(selectedItem?.name || selectedUrl);
    setShowSearchResults(false);
    setFilteredItems([]);
  };

  return (
    <div className="relative">
      <Card className={`group w-full max-w-xs min-h-[24rem] rounded-lg overflow-hidden bg-gray-800 shadow-md transition-transform transform hover:scale-105 hover:shadow-2xl ${getPriorityStyle()} pt-0`}>
        {currentPriority && (
          <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: currentPriority <= 3 ? '#065f46' : 
                            currentPriority <= 6 ? '#854d0e' : '#7f1d1d',
              color: 'white',
              boxShadow: '0 0 8px rgba(0,0,0,0.5)',
            }}
          >
            {currentPriority}
          </div>
        )}
        
        {comicData.hasDependency && (
          <div className="absolute top-2 left-2 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-900/30 border border-indigo-400/20 backdrop-blur-sm transform transition-all duration-200 hover:scale-110"
                    style={{
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Link />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dieser Comic hat Abhängigkeiten</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <CardHeader className="w-full h-2/5 p-0">
          <img
            src={image}
              alt={comicData.name}
            className="w-full h-full object-cover rounded-t-lg transition-transform"
          />
        </CardHeader>
        </a>
        
        <CardContent className="p-4 text-gray-200">
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <h3 className="font-semibold group-hover:text-blue-400 transition-colors duration-300 
                        text-center 
                        text-[clamp(1rem, 5vw, 1.25rem)] 
                        line-clamp-2 
                          h-[4rem]">
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
                    <Badge 
                      variant="destructive" 
                      className="bg-red-700 hover:bg-red-600 text-xs cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Erneut versuchen, Daten zu laden
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fehler beim Laden der Comic-Daten. Klicken Sie, um es erneut zu versuchen.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : comicData ? (
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="default">
                  {comicData.price}
                </Badge>
                {comicData.type && (
                  <Badge variant="outline" className="border-gray-600 text-gray-300">
                    {comicData.type}
                  </Badge>
                )}
              </div>
              
              {comicData.release && (
                <div className="flex items-center text-gray-400">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <span className="truncate">{comicData.release}</span>
                </div>
              )}
              
              {comicData.author && (
                <div className="flex items-center text-gray-400">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  <span className="truncate">{comicData.author}</span>
                </div>
              )}
              
              {comicData.pageAmount && (
                <div className="flex items-center text-gray-400">
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  <span>{comicData.pageAmount}</span>
                </div>
              )}
              
              <div className="flex items-center justify-center mt-1 gap-2 flex-wrap">
                <PrioritySelector 
                  url={url}
                  urlEnding={urlEnding}
                  initialPriority={currentPriority}
                  isLoggedIn={isLoggedIn}
                  onPriorityChange={handlePriorityChange}
                />
                
                {isLoggedIn ? (
                  <>
                    {hasNote && notePreview ? (
                      <div 
                        className="w-full mt-2 p-2 bg-indigo-900/30 rounded-md border border-indigo-800/50 text-gray-300 text-xs cursor-pointer hover:bg-indigo-900/50"
                        onClick={() => setDialogOpen(true)}
                      >
                        <div className="flex items-start gap-1.5">
                          <StickyNote className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <p className="line-clamp-2 whitespace-pre-wrap">{notePreview}</p>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-full mt-2 flex justify-center"
                        onClick={() => {
                          setDialogOpen(true);
                          setIsEditingNote(true);
                        }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-gray-700 hover:bg-indigo-800 border-none text-gray-300 text-xs py-1 h-7"
                        >
                          <StickyNote className="h-3 w-3 mr-1.5" />
                          Notiz hinzufügen
                        </Button>
                      </div>
                    )}
                  </>
                ) : null}

                {comicData.hasDependency ? (
                  <div 
                    className={`w-full mt-2 p-2 bg-blue-900/30 rounded-md border border-blue-800/50 text-gray-300 text-xs ${isLoggedIn ? 'cursor-pointer hover:bg-blue-900/50' : ''}`}
                    onClick={() => isLoggedIn && setDependencyDialogOpen(true)}
                  >
                    <div className="flex items-start gap-1.5">
                      <Link className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex items-center gap-1">
                        <span>Dieser Comic basiert auf:
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-blue-400 hover:text-blue-300">
                                {wishlistItems.find(item => item.url === comicData.dependencyUrl)?.name || comicData.dependencyUrl}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isLoggedIn ? 'Klicken Sie, um die Abhängigkeit zu bearbeiten' : 'Abhängiges Comic'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : isLoggedIn && (
                  <div 
                    className="w-full mt-2 flex justify-center"
                    onClick={() => {
                      setDependencyDialogOpen(true);
                    }}
                  >
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-gray-700 hover:bg-blue-800 border-none text-gray-300 text-xs py-1 h-7"
                    >
                      <Link className="h-3 w-3 mr-1.5" />
                      Abhängigkeit hinzufügen
                    </Button>
                  </div>
                )}
                
                {comicData.fromCache && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="bg-yellow-900/30 text-yellow-400 border-yellow-700 text-xs cursor-help"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Zwischengespeicherte Daten
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{comicData.cacheAge ? `Daten sind ${comicData.cacheAge} alt.` : 'Verwenden von zwischengespeicherten Daten.'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {comicData.fallback && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="bg-orange-900/30 text-orange-400 border-orange-700 text-xs cursor-help">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Begrenzte Daten
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Verwendung von Ersatzdaten. Einige Informationen sind möglicherweise nicht verfügbar.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Daten werden geladen...</span>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-3 pt-0 flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-gray-700 hover:bg-gray-600 border-none text-gray-200"
                onClick={() => {
                  setDialogOpen(true);
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Info className="h-4 w-4 mr-1" />
                )}
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-100">{comicData.name}</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Comic-Details und Informationen
                </DialogDescription>
              </DialogHeader>
              
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <span className="ml-2 text-gray-300">Comic-Informationen werden geladen...</span>
                </div>
              ) : error ? (
                <div className="text-red-400 py-4">
                  <p className="mb-2">Fehler beim Laden der Comic-Daten: {error}</p>
                </div>
              ) : comicData ? (
                <div className="space-y-4 py-2">
                  {comicData.fallback && (
                    <div className="bg-orange-900/20 border border-orange-800 rounded-md p-3 mb-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-orange-400 mr-2 mt-0.5" />
                        <div>
                          <h4 className="text-orange-400 font-medium">Begrenzte Informationen</h4>
                          <p className="text-sm text-gray-300">
                            Wir konnten keine vollständigen Informationen für diesen Comic abrufen. 
                            Einige Details sind möglicherweise nicht verfügbar oder unvollständig.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Preis</h4>
                      <p className={`text-lg font-bold ${comicData.fallback ? 'text-gray-400' : 'text-indigo-400'}`}>
                        {comicData.price}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Veröffentlichungsdatum</h4>
                      <p>{comicData.release}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Autor</h4>
                    <p>{comicData.author}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Künstler</h4>
                    <p>{comicData.drawer}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Typ</h4>
                      <p>{comicData.type}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Seiten</h4>
                      <p>{comicData.pageAmount}</p>
                    </div>
                  </div>
                  
                  {comicData.articleNumber && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Artikelnummer</h4>
                      <div className="flex items-center">
                        <Hash className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        <p>{comicData.articleNumber}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    {comicData.format && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400">Format</h4>
                        <div className="flex items-center">
                          <Ruler className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          <p>{comicData.format}</p>
                        </div>
                      </div>
                    )}
                    
                    {comicData.color && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400">Farbe</h4>
                        <div className="flex items-center">
                          <Palette className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          <p>{comicData.color}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Bindung</h4>
                    <p>{comicData.binding || "Nicht angegeben"}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">ISBN</h4>
                    <p>{comicData.ISBN || "Nicht verfügbar"}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Geschichten</h4>
                    <p>{comicData.storys || "Nicht angegeben"}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-400">Verfügbarkeit</h4>
                    <p>{comicData.deliverableTo}</p>
                  </div>
                  
                  {comicData.deliveryFrom && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Versand von</h4>
                      <p>{comicData.deliveryFrom}</p>
                    </div>
                  )}
                  
                  {isLoggedIn && (
                    <div className="space-y-2 mt-4 border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center">
                          <StickyNote className="h-4 w-4 mr-1.5 text-indigo-400" />
                          Notizen
                        </h4>
                        {!isEditingNote ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditingNote(true)}
                            className="h-7 text-indigo-400 hover:text-indigo-300 hover:bg-gray-700"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Bearbeiten
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setNote(originalNote);
                                setIsEditingNote(false);
                              }}
                              className="h-7 text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                              disabled={isSavingNote}
                            >
                              Abbrechen
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={saveNote}
                              className="h-7 bg-indigo-600 hover:bg-indigo-500 text-white"
                              disabled={isSavingNote || !hasNoteChanges}
                            >
                              {isSavingNote ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <Save className="h-3.5 w-3.5 mr-1" />
                              )}
                              Speichern
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {isEditingNote ? (
                        <div>
                          <textarea
                            value={note}
                            onChange={handleNoteChange}
                            className="w-full rounded-md bg-gray-900 border border-gray-700 text-gray-200 p-2 min-h-[100px]"
                            placeholder="Fügen Sie hier Ihre Notizen hinzu..."
                            disabled={isSavingNote}
                          />
                          {noteError && (
                            <p className="text-xs text-red-400 mt-1">{noteError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-900 rounded-md p-3 min-h-[60px]">
                          {note ? (
                            <p className="text-gray-300 whitespace-pre-wrap">{note}</p>
                          ) : (
                            <p className="text-gray-500 italic text-sm">Keine Notizen vorhanden. Klicken Sie auf "Bearbeiten", um Notizen hinzuzufügen.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {comicData.fromCache && (
                      <Badge variant="outline" className="bg-yellow-900/30 text-yellow-400 border-yellow-700">
                        {comicData.cacheAge ? `Zwischengespeicherte Daten (${comicData.cacheAge})` : 'Zwischengespeicherte Daten'}
                      </Badge>
                    )}
                    
                    {!comicData.fallback && !comicData.fromCache && (
                      <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700">
                        Live-Daten
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-gray-400 mb-4">Keine Comic-Informationen verfügbar</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-100">Abhängigkeiten verwalten</DialogTitle>
            <DialogDescription className="text-gray-300">
              Abhängigkeiten für {comicData.name} hinzufügen oder bearbeiten
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Comic als Abhängigkeit suchen..."
                className="w-full bg-gray-900 border-gray-700 text-gray-200"
                disabled={isSavingDependency}
              />
              {showSearchResults && filteredItems.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredItems.map((item, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                      onClick={() => handleItemSelect(item.url)}
                    >
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-blue-400 hover:text-blue-300 cursor-help">
                          {wishlistItems.find(item => item.url === comicData.dependencyUrl)?.name || comicData.dependencyUrl}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Klicken Sie, um das abhängige Comic zu öffnen</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}

            {dependencyError && (
              <p className="text-xs text-red-400">{dependencyError}</p>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setDependencyUrl(comicData.dependencyUrl || '');
                setDependencyDialogOpen(false);
              }}
              className="text-gray-400 hover:text-gray-300 hover:bg-gray-700"
              disabled={isSavingDependency}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={saveDependency}
              className="bg-blue-600 hover:bg-blue-500 text-white"
              disabled={isSavingDependency || !hasDependencyChanges}
            >
              {isSavingDependency ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
