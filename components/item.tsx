import { Card, CardHeader, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Info, RefreshCw, Calendar, Book, User, Layers, AlertTriangle, Hash, Palette, Ruler } from 'lucide-react';
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
} from "@/components/ui/dialog";

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
};

type ItemProps = {
  name: string;
  url: string;
  image: string;
};

export function Item({ name, url, image }: ItemProps) {
  const [comicData, setComicData] = useState<ComicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getComicNumber = useCallback(() => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const comicPart = pathParts.find(part => /^\d+/.test(part));
      if (comicPart) {
        return comicPart.split('-')[0];
      }
      
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('-')) {
        const parts = lastPart.split('-');
        for (const part of parts) {
          if (/^\d+$/.test(part)) {
            return part;
          }
        }
      }
      
      return null;
    } catch (e) {
      console.error("Error extracting comic number:", e);
      return null;
    }
  }, [url]);

  const fetchComicData = useCallback(async (force = false, isBackground = false) => {
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Don't fetch if already loading and not forcing
    if (loading && !force) return;
    
    // Only show loading state if not a background fetch
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    
    // Create a new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    
    try {
      const comicNumber = getComicNumber();
      let apiUrl = '/api/get_comic_data?';
      
      if (comicNumber) {
        apiUrl += `number=${comicNumber}&`;
      }
      
      apiUrl += `url=${encodeURIComponent(url)}`;
      
      // Add force_refresh parameter if force is true or it's a background fetch
      if (force || isBackground) {
        apiUrl += `&force_refresh=true`;
      }
      
      console.log(`Fetching comic data from: ${apiUrl}${isBackground ? ' (background)' : ''}`);
      const response = await fetch(apiUrl, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comic data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received comic data:", data);
      
      if (data.data) {
        const comicDataWithMeta = {
          ...data.data,
          fromCache: data.fromCache || false,
          fallback: data.fallback || false
        };
        
        // Add cache age if available
        if (data.cacheAge) {
          comicDataWithMeta.cacheAge = data.cacheAge;
        }
        
        setComicData(comicDataWithMeta);
        
        console.log(
          "Comic data set successfully", 
          data.fromCache ? "(from cache)" : data.fallback ? "(fallback data)" : "(from backend)",
          comicDataWithMeta
        );

        // If we got cached data and this wasn't a background fetch, trigger a background refresh
        if (data.fromCache && !isBackground) {
          console.log("Got cached data, triggering background refresh");
          setTimeout(() => fetchComicData(true, true), 100);
        }
      } else {
        throw new Error("Invalid data format received");
      }
      
      setRetryCount(0);
    } catch (err) {
      // Only set error if not aborted and not a background fetch
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error("Error fetching comic data:", err);
        if (!isBackground) {
          setError(err instanceof Error ? err.message : String(err));
          
          if (retryCount < 2) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              if (!comicData) {
                fetchComicData(true);
              }
            }, 3000);
          }
        }
      }
    } finally {
      // Always update loading state
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [url, getComicNumber, retryCount, comicData, loading]);

  // Cleanup function to abort any ongoing fetch when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchComicData(true);
    };
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      console.log("Initial fetch for comic data:", name);
      // Force the initial fetch to ensure we get data
      fetchComicData(true);
    }
  }, [fetchComicData, name]);

  // Set up periodic background refresh
  useEffect(() => {
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    const refreshInterval = setInterval(() => {
      if (comicData && !loading) {
        console.log("Performing periodic background refresh");
        fetchComicData(true, true);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [fetchComicData, comicData, loading]);

  return (
    <div className="relative">
      <Card className="group w-full max-w-xs min-h-[24rem] rounded-lg overflow-hidden bg-gray-800 shadow-md transition-transform transform hover:scale-105 hover:shadow-2xl">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <CardHeader className="w-full h-2/5 p-0">
          <img
            src={image}
              alt={displayName}
            className="w-full h-full object-cover rounded-t-lg transition-transform group-hover:scale-105"
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
              {displayName}
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
                      onClick={() => fetchComicData(true)}
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
                <Badge variant="secondary" className={`${comicData.fallback ? 'bg-gray-700' : 'bg-indigo-700 hover:bg-indigo-600'} text-white`}>
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
              
              <div className="flex justify-center mt-1 gap-2">
                {comicData.fromCache && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="bg-yellow-900/30 text-yellow-400 border-yellow-700 text-xs cursor-help"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchComicData(true);
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Zwischengespeicherte Daten
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{comicData.cacheAge ? `Daten sind ${comicData.cacheAge} alt. Klicken Sie, um zu aktualisieren.` : 'Verwenden von zwischengespeicherten Daten. Klicken Sie, um zu aktualisieren.'}</p>
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
                  if (error || !comicData) {
                    fetchComicData(true);
                  }
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
                <DialogTitle className="text-xl font-bold text-gray-100">{displayName}</DialogTitle>
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
                  <Button 
                    variant="outline" 
                    className="mt-2 w-full"
                    onClick={() => fetchComicData(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Erneut versuchen
                  </Button>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-2 bg-orange-900/30 hover:bg-orange-800/40 border-orange-800"
                            onClick={() => fetchComicData(true)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Erneut versuchen
                          </Button>
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
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="ml-auto bg-gray-700 hover:bg-gray-600 border-gray-600"
                      onClick={() => fetchComicData(true)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Aktualisieren
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-gray-400 mb-4">Keine Comic-Informationen verfügbar</p>
                  <Button 
                    variant="default" 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => fetchComicData(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Comic-Informationen laden
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
