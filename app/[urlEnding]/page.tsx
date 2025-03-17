'use client';

import { useEffect, useState, use } from 'react';
import { Item } from '@/components/item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { Loader2, ChevronDown, Filter, XCircle, SlidersHorizontal, Check, ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

  const resolvedParams = use(params);
  const { urlEnding } = resolvedParams;

  const getValueByField = (item: EnhancedWishlistItem, field: string): any => {
    if (field === 'name') return item.name;
    
    if (field.startsWith('comicData.')) {
      const nestedField = field.replace('comicData.', '');
      return item.comicData[nestedField as keyof ComicData];
    }
    
    return item.comicData[field as keyof ComicData];
  };

  const filteredAndSortedData = wishlistData 
    ? [...wishlistData]
        .filter(item => {
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
        .sort((a, b) => {
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
          
          return sortDirection === 'asc' ? comparison : -comparison;
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
      'comicData.price': 'Price',
      'comicData.author': 'Author',
      'comicData.drawer': 'Artist',
      'comicData.release': 'Release Date',
      'comicData.type': 'Type',
      'comicData.pageAmount': 'Pages',
      'comicData.binding': 'Binding',
      'comicData.ISBN': 'ISBN',
    };

    const operatorMap: Record<string, string> = {
      'contains': 'contains',
      'equals': 'equals',
      'greaterThan': '>',
      'lessThan': '<'
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
          
          toast.info('Loading the latest wishlist data...', {
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
        
        toast.success('Wishlist updated with the latest data', {
          position: "bottom-left",
          autoClose: 3000,
        });
      } catch (err: any) {
        setError(err.message);
        toast.error('Failed to fetch the latest wishlist data', {
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
        <CardHeader className="text-center mb-6">
          <CardTitle className="text-4xl font-extrabold text-gray-100">
            Wishlist for <span className="text-indigo-600">{urlEnding}</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading && !wishlistData ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
              <p className="text-xl text-gray-400">Loading wishlist data...</p>
            </div>
          ) : error && !wishlistData ? (
            <div className="text-center py-10">
              <div className="text-xl text-red-500 mb-4">Error: {error}</div>
              <button 
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
              >
                Retry
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
                        Sort by: {sortField.charAt(0).toUpperCase() + sortField.slice(1)} {sortDirection === 'asc' ? '↑' : '↓'}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700 w-56 shadow-lg shadow-black/50">
                      <DropdownMenuLabel className="text-gray-300 font-bold">Sort Options</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      
                      <DropdownMenuItem 
                        className={`${sortField === 'name' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('name')}
                      >
                        Name {sortField === 'name' && 
                              <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        className={`${sortField === 'price' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('price')}
                      >
                        Price {sortField === 'price' && 
                               <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        className={`${sortField === 'release' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('release')}
                      >
                        Release Date {sortField === 'release' && 
                                     <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        className={`${sortField === 'author' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('author')}
                      >
                        Author {sortField === 'author' && 
                                <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        className={`${sortField === 'type' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('type')}
                      >
                        Type {sortField === 'type' && 
                              <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        className={`${sortField === 'pageAmount' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('pageAmount')}
                      >
                        Page Count {sortField === 'pageAmount' && 
                                   <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>

                      <DropdownMenuItem 
                        className={`${sortField === 'binding' ? 'bg-indigo-700' : ''} hover:bg-indigo-600 hover:text-white cursor-pointer py-2 font-medium`}
                        onClick={() => handleSortChange('binding')}
                      >
                        Binding {sortField === 'binding' && 
                                <span className="ml-auto">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                        <Filter className="h-4 w-4 mr-2" />
                        Add Filter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 text-gray-100 border-gray-700 shadow-lg shadow-black/50">
                      <DialogHeader>
                        <DialogTitle className="text-gray-100 font-bold">Add Filter</DialogTitle>
                        <DialogDescription className="text-gray-300">
                          Create a filter to narrow down your wishlist items.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="field" className="text-right text-gray-200">
                            Field
                          </Label>
                          <select
                            id="field"
                            value={newFilter.field}
                            onChange={(e) => setNewFilter({...newFilter, field: e.target.value})}
                            className="col-span-3 bg-gray-700 border-gray-600 rounded-md p-2 text-white"
                          >
                            <option value="name">Name</option>
                            <option value="comicData.price">Price</option>
                            <option value="comicData.author">Author</option>
                            <option value="comicData.drawer">Artist</option>
                            <option value="comicData.release">Release Date</option>
                            <option value="comicData.type">Type</option>
                            <option value="comicData.pageAmount">Page Count</option>
                            <option value="comicData.binding">Binding</option>
                            <option value="comicData.ISBN">ISBN</option>
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
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            <option value="greaterThan">Greater Than</option>
                            <option value="lessThan">Less Than</option>
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="value" className="text-right text-gray-200">
                            Value
                          </Label>
                          <Input
                            id="value"
                            placeholder="Filter value..."
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
                          Add Filter
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
                          Clear All
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {filters.length > 0 && filteredAndSortedData && (
                <div className="mb-4 text-sm text-gray-400">
                  Showing {filteredAndSortedData.length} of {wishlistData.length} items
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
                    />
                  ))}
                </div>
              ) : filters.length > 0 ? (
                <div className="text-center py-10 text-xl text-gray-500">
                  No items match your current filters
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={clearAllFilters}
                      className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xl text-gray-500">No items found in the wishlist</div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-xl text-gray-500">No items found in the wishlist</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
