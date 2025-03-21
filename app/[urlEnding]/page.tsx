'use client';

import { useEffect, useState, use } from 'react';
import { Item } from '@/components/item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { Loader2, ChevronDown, Filter, XCircle, SlidersHorizontal, Star, StickyNote } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoginButton } from '@/components/loginButton';

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
  articleNumber?: string;
  format?: string;
  color?: string;
  name: string;
  fromCache?: boolean;
  fallback?: boolean;
  priority?: number;
  hasNote?: boolean;
  hasDependency?: boolean;
  dependencyUrl?: string;
};

type EnhancedWishlistItem = {
  link: string;
  name: string;
  image: string;
  comicData: ComicData;
};

type FilterOption = {
  field: string;
  operator: 'contains' | 'equals' | 'greaterThan' | 'lessThan';
  value: string;
};

export default function Page({ params }: { params: Promise<{ urlEnding: string }> }) {
  const [wishlistData, setWishlistData] = useState<Array<EnhancedWishlistItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newFilter, setNewFilter] = useState<FilterOption>({
    field: 'name',
    operator: 'contains',
    value: ''
  });
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [hasPriorityItems, setHasPriorityItems] = useState(false);
  const [notes, setNotes] = useState<Record<string, boolean>>({});
  const [hasNotes, setHasNotes] = useState(false);
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);

  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  const [dependencies, setDependencies] = useState<Record<string, string>>({});
  const [hasDependencies, setHasDependencies] = useState(false);

  const resolvedParams = use(params);
  const { urlEnding } = resolvedParams;

  useEffect(() => {
    fetchPriorities();
    if (isLoggedIn) {
      fetchNotes();
    }
  }, [urlEnding, lastReloadTime, isLoggedIn]);

  const fetchPriorities = async () => {
    try {
      const response = await fetch(`/api/get_priorities?urlEnding=${urlEnding}`);
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
        
        if (hasItems && !priorities || Object.keys(priorities).length === 0) {
          setSortField('priority');
          setSortDirection('asc');
        }
      }
    } catch (error) {
      console.error('Error fetching priorities:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      if (!isLoggedIn) return;
      
      const response = await fetch(`/api/get_all_notes?urlEnding=${urlEnding}`);
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
      console.error('Error fetching notes:', error);
    }
  };

  const fetchDependencies = async (items?: EnhancedWishlistItem[]) => {
    try {
      const itemsToProcess = items || wishlistData;
      if (!itemsToProcess) return;
      
      const dependencyPromises = itemsToProcess.map(async (item) => {
        const response = await fetch(`/api/get_dependencies?urlEnding=${urlEnding}&url=${encodeURIComponent(item.link)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.dependencies && data.dependencies.length > 0) {
            return { url: item.link, dependencyUrl: data.dependencies[0].dependencyUrl };
          }
        }
        return null;
      });

      const results = await Promise.all(dependencyPromises);
      const validResults = results.filter((result): result is { url: string; dependencyUrl: string } => result !== null);
      const dependencyMap: Record<string, string> = {};
      validResults.forEach(result => {
        dependencyMap[result.url] = result.dependencyUrl;
      });
      setDependencies(dependencyMap);
      setHasDependencies(validResults.length > 0);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  useEffect(() => {
    const handlePriorityUpdate = () => {
      fetchPriorities();
    };
    
    const handleFirstPriorityAdded = () => {
      fetchPriorities();
      setHasPriorityItems(true);
      if (sortField === 'name') {
        setSortField('priority');
        setSortDirection('asc');
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'loginSession') {
        setLastReloadTime(Date.now());
      }
    };
    
    window.addEventListener('prioritiesUpdated', handlePriorityUpdate);
    window.addEventListener('firstPriorityAdded', handleFirstPriorityAdded);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('prioritiesUpdated', handlePriorityUpdate);
      window.removeEventListener('firstPriorityAdded', handleFirstPriorityAdded);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [sortField]);

  useEffect(() => {
    const checkLoginStatus = () => {
      const savedSession = localStorage.getItem('loginSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (session.isLoggedIn && session.urlEnding === urlEnding) {
            if (!isLoggedIn) {
              setIsLoggedIn(true);
              fetchPriorities();
            }
          } else {
            if (isLoggedIn) {
              setIsLoggedIn(false);
            }
          }
        } catch (error) {
          console.error('Error parsing login session:', error);
          localStorage.removeItem('loginSession');
          if (isLoggedIn) {
            setIsLoggedIn(false);
          }
        }
      } else {
        if (isLoggedIn) {
          setIsLoggedIn(false);
        }
      }
    };
    
    checkLoginStatus();
    
    window.addEventListener('storage', checkLoginStatus);
    
    return () => {
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, [urlEnding, isLoggedIn]);

  useEffect(() => {
    const handleNoteUpdate = () => {
      fetchNotes();
    };
    
    window.addEventListener('notesUpdated', handleNoteUpdate);
    
    return () => {
      window.removeEventListener('notesUpdated', handleNoteUpdate);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const handleDependencyUpdate = () => {
      fetchDependencies();
    };
    
    window.addEventListener('dependenciesUpdated', handleDependencyUpdate);
    
    return () => {
      window.removeEventListener('dependenciesUpdated', handleDependencyUpdate);
    };
  }, [wishlistData]);

  const getValueByField = (item: EnhancedWishlistItem, field: string): any => {
    if (field === 'name') return item.name;
    
    if (field === 'priority') {
      return priorities[item.link] || 999;
    }
    
    if (field === 'hasNote') {
      return notes[item.link] || false;
    }
    
    if (field.startsWith('comicData.')) {
      const nestedField = field.replace('comicData.', '');
      return item.comicData[nestedField as keyof ComicData];
    }
    
    return item.comicData[field as keyof ComicData];
  };

  const handlePriorityChange = (url: string, priority: number) => {
    setPriorities(prev => {
      const updated = { ...prev, [url]: priority };
      setHasPriorityItems(true);
      return updated;
    });
  };

  const filteredAndSortedData = wishlistData 
    ? [...wishlistData]
        .filter(item => {
          if (showOnlyWithNotes && !notes[item.link]) {
            return false;
          }
          
          if (filters.length === 0) return true;
          
          return filters.every(filter => {
            const itemValue = getValueByField(item, filter.field);
            const stringValue = String(itemValue).toLowerCase();
            const filterValue = filter.value.toLowerCase();
            
            switch (filter.operator) {
              case 'contains':
                return stringValue.includes(filterValue);
              case 'equals':
                return stringValue === filterValue;
              case 'greaterThan':
                if (filter.field === 'comicData.price' || filter.field === 'comicData.pageAmount') {
                  const numValue = parseFloat(String(itemValue).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
                  const numFilterValue = parseFloat(filterValue) || 0;
                  return numValue > numFilterValue;
                }
                return stringValue > filterValue;
              case 'lessThan':
                if (filter.field === 'comicData.price' || filter.field === 'comicData.pageAmount') {
                  const numValue = parseFloat(String(itemValue).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
                  const numFilterValue = parseFloat(filterValue) || 0;
                  return numValue < numFilterValue;
                }
                return stringValue < filterValue;
              default:
                return true;
            }
          });
        })
        .map(item => {
          const enrichedItem = { ...item };
          
          if (priorities[item.link]) {
            enrichedItem.comicData = {
              ...enrichedItem.comicData,
              priority: priorities[item.link]
            };
          }
          
          if (notes[item.link]) {
            enrichedItem.comicData = {
              ...enrichedItem.comicData,
              hasNote: true
            };
          }

          if (dependencies[item.link]) {
            enrichedItem.comicData = {
              ...enrichedItem.comicData,
              hasDependency: true,
              dependencyUrl: dependencies[item.link]
            };
          }
          
          return enrichedItem;
        })
        .sort((a, b) => {
          // Helper function to get the full dependency chain for an item
          const getDependencyChain = (item: EnhancedWishlistItem, visited: Set<string> = new Set()): string[] => {
            if (visited.has(item.link)) return [];
            visited.add(item.link);
            
            const chain = [item.link];
            const dependencyUrl = dependencies[item.link];
            
            if (dependencyUrl) {
              const dependencyItem = wishlistData?.find(i => i.link === dependencyUrl);
              if (dependencyItem) {
                chain.unshift(...getDependencyChain(dependencyItem, visited));
              }
            }
            
            return chain;
          };

          // Get dependency chains for both items
          const chainA = getDependencyChain(a);
          const chainB = getDependencyChain(b);

          // If either chain includes the other item, sort based on dependency
          if (chainA.includes(b.link)) return 1;
          if (chainB.includes(a.link)) return -1;

          // If items are in different chains, compare their root dependencies
          const rootA = chainA[0];
          const rootB = chainB[0];
          
          if (rootA !== rootB) {
            // Get priorities of root items
            const rootItemA = wishlistData?.find(i => i.link === rootA);
            const rootItemB = wishlistData?.find(i => i.link === rootB);
            const rootPriorityA = rootItemA ? (priorities[rootItemA.link] || 999) : 999;
            const rootPriorityB = rootItemB ? (priorities[rootItemB.link] || 999) : 999;
            
            if (rootPriorityA !== rootPriorityB) {
              return rootPriorityA - rootPriorityB;
            }
            
            // If root priorities are equal, sort by chain position
            const rootCompare = rootA.localeCompare(rootB);
            if (rootCompare !== 0) return rootCompare;
          }

          // If in same chain or no dependencies, sort by priority
          const priorityA = priorities[a.link] || 999;
          const priorityB = priorities[b.link] || 999;

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // If priorities are equal, use the regular sorting
          let valueA, valueB;
          
          if (sortField === 'name') {
            valueA = a.name;
            valueB = b.name;
          } else if (sortField === 'price') {
            valueA = parseFloat(a.comicData.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            valueB = parseFloat(b.comicData.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
          } else if (sortField === 'pageAmount') {
            valueA = parseInt(a.comicData.pageAmount?.replace(/[^0-9]/g, '') || '0');
            valueB = parseInt(b.comicData.pageAmount?.replace(/[^0-9]/g, '') || '0');
          } else if (sortField === 'priority') {
            return sortDirection === 'asc' 
              ? priorityA - priorityB 
              : priorityB - priorityA;
          } else if (sortField === 'hasNote') {
            valueA = notes[a.link] ? 1 : 0;
            valueB = notes[b.link] ? 1 : 0;
            
            return sortDirection === 'asc' 
              ? valueA - valueB 
              : valueB - valueA;
          } else if (sortField === 'hasDependency') {
            valueA = dependencies[a.link] ? 1 : 0;
            valueB = dependencies[b.link] ? 1 : 0;
            
            return sortDirection === 'asc' 
              ? valueA - valueB 
              : valueB - valueA;
          } else {
            valueA = a.comicData[sortField as keyof ComicData] || '';
            valueB = b.comicData[sortField as keyof ComicData] || '';
          }
          
          let comparison;
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            comparison = valueA - valueB;
          } else {
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
            comparison = valueA.localeCompare(valueB);
          }
          
          return sortField === 'priority'
            ? comparison
            : sortDirection === 'asc' ? comparison : -comparison;
        })
    : null;

  const handleSortChange = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const addFilter = () => {
    if (newFilter.value.trim() === '') return;
    
    setFilters(prev => [...prev, { ...newFilter }]);
    setNewFilter({
      field: 'name',
      operator: 'contains',
      value: ''
    });
    setShowFilterDialog(false);
  };

  const removeFilter = (index: number) => {
    setFilters(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const getFilterDescription = (filter: FilterOption): string => {
    const fieldMap: Record<string, string> = {
      'name': 'Name',
      'comicData.price': 'Preis',
      'comicData.author': 'Autor',
      'comicData.drawer': 'Zeichner',
      'comicData.release': 'Erscheinungsdatum',
      'comicData.type': 'Typ',
      'comicData.pageAmount': 'Seitenzahl',
      'comicData.binding': 'Bindung',
      'comicData.ISBN': 'ISBN',
    };

    const operatorMap: Record<string, string> = {
      'contains': 'enthält',
      'equals': 'ist gleich',
      'greaterThan': 'größer als',
      'lessThan': 'kleiner als'
    };

    const fieldName = fieldMap[filter.field] || filter.field;
    const operatorSymbol = operatorMap[filter.operator] || filter.operator;

    return `${fieldName} ${operatorSymbol} ${filter.value}`;
  };

  const clearAllFilters = () => {
    setFilters([]);
  };

  useEffect(() => {
    const fetchCashedWishlist = async () => {
      try {
        const response = await fetch(`/api/get_cashed_wishlist?urlEnding=${urlEnding}`);
        if (response.ok) {
          const data = await response.json();
          let parsedData;
          if (typeof data.cash === 'string') {
            parsedData = JSON.parse(data.cash);
          } else {
            parsedData = data.cash;
          }
          
          const basicWishlistData = parsedData.data.map((item: any) => ({
            link: item.link,
            name: item.name,
            image: item.image
          }));
          
          await fetchBulkComicData(basicWishlistData);
          
          toast.info('Lade die neuesten Wunschlistendaten...', {
            position: "bottom-left",
            autoClose: 5000,
          });
          
          fetchWishlist();
        } else {
          throw new Error('Cached wishlist not found');
        }
      } catch (err) {
        fetchWishlist();
      }
    };

    const fetchWishlist = async () => {
      try {
        const response = await fetch(`/api/get_wishlist?urlEnding=${urlEnding}`);
        const data = await response.json();
        const result = JSON.parse(data.responseData.result)
        
        const basicWishlistData = result.data.map((item: any) => ({
          link: item.link,
          name: item.name,
          image: item.image
        }));
        
        await fetchBulkComicData(basicWishlistData);
        
        toast.success('Wunschliste mit den neuesten Daten aktualisiert', {
          position: "bottom-left",
          autoClose: 3000,
        });
      } catch (err: any) {
        setError(err.message);
        toast.error('Fehler beim Laden der neuesten Wunschlistendaten', {
          position: "bottom-left",
          autoClose: 5000,
        });
        setLoading(false);
      }
    };
    
    const fetchBulkComicData = async (basicItems: Array<{ link: string, name: string, image: string }>) => {
      try {
        
        if (!basicItems || !Array.isArray(basicItems) || basicItems.length === 0) {
          console.error("No items to fetch or invalid items array:", basicItems);
          throw new Error("No items to fetch or invalid items array");
        }
        
        const validItems = basicItems.filter(item => {
          if (!item || typeof item !== 'object') {
            console.error("Invalid item (not an object):", item);
            return false;
          }
          if (!item.link || typeof item.link !== 'string') {
            console.error("Item missing link or link is not a string:", item);
            return false;
          }
          return true;
        });

        if (validItems.length === 0) {
          console.error("No valid items after filtering");
          throw new Error("No valid items to fetch");
        }

        const normalizedItems = validItems.map(item => ({
          url: item.link,
          name: (item.name && typeof item.name === 'string') ? item.name : '',
          image: (item.image && typeof item.image === 'string') ? item.image : ''
        }));

        const urlsOnly = normalizedItems.map(item => item.url);
        
        if (urlsOnly.length === 0) {
          console.error("No URLs extracted from normalized items");
          throw new Error("No valid URLs to send");
        }
        
        const response = await fetch('/api/get_bulk_comic_data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls: urlsOnly }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Bulk comic data fetch failed:", response.status, errorText);
          throw new Error(`Failed to fetch comic data: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.data || typeof data.data !== 'object') {
          console.error("Invalid response format - data missing or not an object:", data);
          throw new Error('Invalid response format: data property is missing or not an object');
        }
        
        const comicEntries = Object.entries(data.data);
        const transformedData = comicEntries.map(([url, comicData]: [string, any], index: number) => {
          if (!comicData || typeof comicData !== 'object') {
            console.error(`Comic data ${index} is not an object:`, comicData);
            return createFallbackItem(validItems[index] || { link: '', name: '', image: '' });
          }
          
          const originalItem = normalizedItems.find(item => item.url === url) || 
                              { url, name: '', image: '' };
          
          const resultData = comicData.result || comicData;
          
          const backendName = resultData.name || resultData.title; 
          
          return {
            link: url,
            name: backendName || originalItem.name || 'Unknown Comic',
            image: originalItem.image || '',
            comicData: {
              price: resultData.price || 'Price unavailable',
              author: resultData.Autor || resultData.author || 'Unknown author',
              drawer: resultData.Zeichner || resultData.drawer || 'Unknown artist',
              release: resultData.Erscheinungsdatum || resultData["Erscheint am"] || resultData.release || 'Unknown release date',
              type: resultData.Produktart || resultData.type || 'Comic',
              pageAmount: resultData.Seitenzahl || resultData.pageAmount || 'Unknown',
              storys: resultData.Storys || resultData.storys || '',
              binding: resultData.Bindung || resultData.binding || '',
              ISBN: resultData.ISBN || resultData.isbn || '',
              deliverableTo: resultData['Lieferbar in folgende Länder'] || resultData.deliverableTo || 'Check website for availability',
              deliveryFrom: resultData['Versand von'] || resultData.deliveryFrom || '',
              name: backendName || originalItem.name || 'Unknown Comic',
              needsUpdate: comicData.needsUpdate || false
            }
          };
        });
        
        setWishlistData(transformedData);
        
        setLoading(false);
        fetchDependencies(transformedData);
      } catch (err) {
        console.error('Error fetching bulk comic data:', err);
        const fallbackData = basicItems.map(item => createFallbackItem(item));
        setWishlistData(fallbackData);
        setLoading(false);
      }
    };

    const createFallbackItem = (item: { link: string, name: string, image: string }) => ({
      link: item.link || '',
      name: item.name || 'Unknown Comic',
      image: item.image || '',
      comicData: {
        price: "Price unavailable",
        author: "Unknown author",
        drawer: "Unknown artist",
        release: "Release date unavailable",
        type: "Comic",
        pageAmount: "Unknown",
        storys: "",
        binding: "",
        ISBN: "",
        deliverableTo: "Check website for availability",
        deliveryFrom: "",
        name: item.name || 'Unknown Comic',
        fallback: true
      }
    });

    fetchCashedWishlist();
  }, [urlEnding]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 px-6 py-10">
      <Card className="w-full max-w-7xl shadow-xl border border-gray-800 rounded-3xl bg-gray-900 text-white p-6 md:p-8">
        <CardHeader className="text-center mb-6 relative">
          <div className="absolute top-0 right-0">
            <LoginButton currentUrlEnding={urlEnding} />
          </div>
          <CardTitle className="text-4xl font-extrabold text-gray-100">
            Wunschliste von <span className="text-indigo-600">{urlEnding}</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading && !wishlistData ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
              <p className="text-xl text-gray-400">Lade Wunschliste...</p>
            </div>
          ) : error && !wishlistData ? (
            <div className="text-center py-10">
              <div className="text-xl text-red-500 mb-4">Fehler: {error}</div>
              <button 
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
              >
                Erneut versuchen
              </button>
            </div>
          ) : wishlistData && wishlistData.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Sortieren nach: {sortField === 'priority' ? 'Priorität' : 
                                       sortField === 'name' ? 'Name' :
                                       sortField === 'price' ? 'Preis' :
                                       sortField === 'release' ? 'Erscheinungsdatum' :
                                       sortField === 'author' ? 'Autor' :
                                       sortField === 'type' ? 'Typ' :
                                       sortField === 'pageAmount' ? 'Seitenzahl' :
                                       sortField === 'binding' ? 'Bindung' :
                                       sortField === 'hasNote' ? 'Notizen' :
                                       sortField === 'hasDependency' ? 'Abhängigkeiten' :
                                       sortField.charAt(0).toUpperCase() + sortField.slice(1)} {sortDirection === 'asc' ? '↑' : '↓'}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700 w-56 shadow-lg shadow-black/50">
                      <DropdownMenuLabel className="text-gray-300 font-bold">Sortieroptionen</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      
                      {hasPriorityItems && (
                        <>
                          <button 
                            className={`w-full text-left px-2 py-2 ${sortField === 'priority' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                            onClick={() => handleSortChange('priority')}
                          >
                            <Star className="h-4 w-4 mr-2" /> 
                            Priorität {sortField === 'priority' && 
                                  <span className="ml-auto">{sortDirection === 'asc' ? '(1→10)' : '(10→1)'}</span>}
                          </button>
                          <div className="px-2 py-1 text-xs text-gray-400 border-t border-gray-700 mt-1">
                            Prioritätsskala: 1 (Höchste) bis 10 (Niedrigste)
                          </div>
                        </>
                      )}
                      
                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'name' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('name')}
                      >
                        Name {sortField === 'name' && 
                              <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                      
                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'price' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('price')}
                      >
                        Preis {sortField === 'price' && 
                               <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                      
                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'release' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('release')}
                      >
                        Erscheinungsdatum {sortField === 'release' && 
                                     <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                      
                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'author' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('author')}
                      >
                        Autor {sortField === 'author' && 
                                <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                      
                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'type' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('type')}
                      >
                        Typ {sortField === 'type' && 
                              <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                      
                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'pageAmount' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('pageAmount')}
                      >
                        Seitenzahl {sortField === 'pageAmount' && 
                                   <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>

                      <button 
                        className={`w-full text-left px-2 py-2 ${sortField === 'binding' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                        onClick={() => handleSortChange('binding')}
                      >
                        Bindung {sortField === 'binding' && 
                                <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>

                      {hasNotes && (
                        <button 
                          className={`w-full text-left px-2 py-2 ${sortField === 'hasNote' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                          onClick={() => handleSortChange('hasNote')}
                        >
                          <StickyNote className="h-4 w-4 mr-2" />
                          Notizen {sortField === 'hasNote' && 
                                   <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                      )}

                      {hasDependencies && (
                        <button 
                          className={`w-full text-left px-2 py-2 ${sortField === 'hasDependency' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer font-medium flex items-center`}
                          onClick={() => handleSortChange('hasDependency')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                          </svg>
                          Abhängigkeiten {sortField === 'hasDependency' && 
                                       <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  {isLoggedIn && hasNotes && (
                    <Button 
                      variant={showOnlyWithNotes ? "default" : "outline"}
                      className={showOnlyWithNotes 
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
                      }
                      onClick={() => setShowOnlyWithNotes(!showOnlyWithNotes)}
                    >
                      <StickyNote className="h-4 w-4 mr-2" />
                      {showOnlyWithNotes ? "Alle anzeigen" : "Nur mit Notizen"}
                    </Button>
                  )}
                  
                  <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter hinzufügen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-gray-100 border-gray-700 shadow-lg shadow-black/50">
                      <DialogHeader>
                        <DialogTitle className="text-gray-100 font-bold">Filter hinzufügen</DialogTitle>
                        <DialogDescription className="text-gray-300">
                          Erstellen Sie einen Filter, um Ihre Wunschliste einzugrenzen.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="field" className="text-right text-gray-200">
                            Feld
                          </Label>
                          <select
                            id="field"
                            value={newFilter.field}
                            onChange={(e) => setNewFilter({...newFilter, field: e.target.value})}
                            className="col-span-3 bg-gray-700 border-gray-600 rounded-md p-2 text-white"
                          >
                            <option value="name">Name</option>
                            <option value="comicData.price">Preis</option>
                            <option value="comicData.author">Autor</option>
                            <option value="comicData.drawer">Zeichner</option>
                            <option value="comicData.release">Erscheinungsdatum</option>
                            <option value="comicData.type">Typ</option>
                            <option value="comicData.pageAmount">Seitenzahl</option>
                            <option value="comicData.binding">Bindung</option>
                            <option value="comicData.ISBN">ISBN</option>
                            {hasNotes && (
                              <option value="hasNote">Notizen</option>
                            )}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="operator" className="text-right text-gray-200">
                            Operator
                          </Label>
                          <select
                            id="operator"
                            value={newFilter.operator}
                            onChange={(e) => setNewFilter({...newFilter, operator: e.target.value as any})}
                            className="col-span-3 bg-gray-700 border-gray-600 rounded-md p-2 text-white"
                          >
                            <option value="contains">Enthält</option>
                            <option value="equals">Ist gleich</option>
                            <option value="greaterThan">Größer als</option>
                            <option value="lessThan">Kleiner als</option>
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="value" className="text-right text-gray-200">
                            Wert
                          </Label>
                          <Input
                            id="value"
                            placeholder="Filterwert..."
                            value={newFilter.value}
                            onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
                            className="col-span-3 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          onClick={addFilter}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          disabled={!newFilter.value.trim()}
                        >
                          Filter hinzufügen
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {filters.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      {filters.map((filter, index) => (
                        <Badge 
                          key={`filter-${index}`} 
                          variant="secondary"
                          className="bg-purple-900/50 text-purple-200 flex items-center gap-1"
                        >
                          {getFilterDescription(filter)}
                          <XCircle 
                            className="h-3 w-3 ml-1 cursor-pointer" 
                            onClick={() => removeFilter(index)}
                          />
                        </Badge>
                      ))}
                      
                      {filters.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={clearAllFilters}
                        >
                          Alle löschen
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {filters.length > 0 && filteredAndSortedData && (
                <div className="mb-4 text-sm text-gray-400">
                  Zeige {filteredAndSortedData.length} von {wishlistData.length} Comics
                </div>
              )}
              
              {filteredAndSortedData && filteredAndSortedData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                  {filteredAndSortedData.map((item, index) => (
                    <Item
                      key={index}
                      name={item.name}
                      url={item.link}
                      image={item.image}
                      comicData={item.comicData}
                      isLoggedIn={isLoggedIn}
                      urlEnding={urlEnding}
                      onPriorityChange={handlePriorityChange}
                      wishlistItems={wishlistData?.map(item => ({
                        name: item.name,
                        url: item.link
                      })) || []}
                    />
                  ))}
                </div>
              ) : showOnlyWithNotes ? (
                <div className="text-center py-10 text-xl text-gray-500">
                  Keine Comics mit Notizen gefunden
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOnlyWithNotes(false)}
                      className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      Alle anzeigen
                    </Button>
                  </div>
                </div>
              ) : filters.length > 0 ? (
                <div className="text-center py-10 text-xl text-gray-500">
                  Keine Comics entsprechen den aktuellen Filtern
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={clearAllFilters}
                      className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      Filter löschen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xl text-gray-500">Keine Comics in der Wunschliste gefunden</div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-xl text-gray-500">Keine Comics in der Wunschliste gefunden</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
