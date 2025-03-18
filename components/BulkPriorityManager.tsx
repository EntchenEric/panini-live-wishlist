'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WishlistItem = {
  name: string;
  url: string;
  image: string;
  priority?: number;
};

type BulkPriorityManagerProps = {
  urlEnding: string;
  onPrioritiesChanged: () => void;
};

export function BulkPriorityManager({ urlEnding, onPrioritiesChanged }: BulkPriorityManagerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorities, setPriorities] = useState<Record<string, number>>({});
  const [initialPriorityCount, setInitialPriorityCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialPrioritiesRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    if (open) {
      fetchWishlistItems();
    }
  }, [open]);
  
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems(items);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      setFilteredItems(
        items.filter(item => 
          item.name.toLowerCase().includes(lowercasedSearch)
        )
      );
    }
  }, [searchTerm, items]);
  
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (open && hasUnsavedChanges) {
        const message = 'You have unsaved priority changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [open, hasUnsavedChanges]);
  
  useEffect(() => {
    if (open) {
      checkForUnsavedChanges();
    }
  }, [priorities, open]);
  
  const fetchWishlistItems = async () => {
    setLoading(true);
    try {
      const wishlistResponse = await fetch(`/api/get_cashed_wishlist?urlEnding=${urlEnding}`);
      if (!wishlistResponse.ok) {
        throw new Error('Failed to fetch wishlist');
      }
      
      const wishlistData = await wishlistResponse.json();
      let parsedWishlist;
      if (typeof wishlistData.cash === 'string') {
        parsedWishlist = JSON.parse(wishlistData.cash);
      } else {
        parsedWishlist = wishlistData.cash;
      }
      
      const prioritiesResponse = await fetch(`/api/get_priorities?urlEnding=${urlEnding}`);
      if (!prioritiesResponse.ok) {
        throw new Error('Failed to fetch priorities');
      }
      
      const prioritiesData = await prioritiesResponse.json();
      const priorityMap: Record<string, number> = {};
      
      if (prioritiesData.priorities && Array.isArray(prioritiesData.priorities)) {
        prioritiesData.priorities.forEach((item: { url: string; priority: number }) => {
          priorityMap[item.url] = item.priority;
        });
      }
      
      setPriorities(priorityMap);
      initialPrioritiesRef.current = { ...priorityMap };
      setInitialPriorityCount(Object.keys(priorityMap).length);
      setHasUnsavedChanges(false);
      
      const mappedItems = parsedWishlist.data.map((item: any) => ({
        url: item.link,
        name: item.name,
        image: item.image,
        priority: priorityMap[item.link]
      }));
      
      setItems(mappedItems);
      setFilteredItems(mappedItems);
    } catch (error) {
      console.error('Error fetching wishlist items:', error);
      toast.error('Failed to load wishlist items', {
        position: "bottom-left"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePriorityChange = (url: string, value: number | null) => {
    setPriorities(prev => {
      const updated = { ...prev };
      
      if (value === null) {
        delete updated[url];
      } else {
        updated[url] = value;
      }
      
      return updated;
    });
  };
  
  const checkForUnsavedChanges = () => {
    const initialKeys = Object.keys(initialPrioritiesRef.current);
    const currentKeys = Object.keys(priorities);
    
    if (initialKeys.length !== currentKeys.length) {
      setHasUnsavedChanges(true);
      return;
    }
    
    for (const key of initialKeys) {
      if (initialPrioritiesRef.current[key] !== priorities[key]) {
        setHasUnsavedChanges(true);
        return;
      }
    }
    
    for (const key of currentKeys) {
      if (!initialKeys.includes(key)) {
        setHasUnsavedChanges(true);
        return;
      }
    }
    
    setHasUnsavedChanges(false);
  };
  
  const handleDialogChange = (newOpen: boolean) => {
    if (open && !newOpen && hasUnsavedChanges) {
      if (confirm('You have unsaved priority changes. Are you sure you want to close?')) {
        setOpen(false);
        setPriorities({ ...initialPrioritiesRef.current });
        setHasUnsavedChanges(false);
      }
    } else {
      setOpen(newOpen);
    }
  };
  
  const saveAllPriorities = async () => {
    setSaving(true);
    let successCount = 0;
    let failCount = 0;
    const currentPriorityCount = Object.keys(priorities).length;
    const isFirstTimePriority = initialPriorityCount === 0 && currentPriorityCount > 0;
    
    try {
      for (const [url, priority] of Object.entries(priorities)) {
        try {
          const response = await fetch('/api/set_priority', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              urlEnding,
              url,
              priority
            }),
          });
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error setting priority for ${url}:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        const successMessage = isFirstTimePriority 
          ? "Successfully added priorities! Your items can now be sorted by priority."
          : `Successfully updated ${successCount} priorities`;
        
        toast.success(successMessage, {
          position: "bottom-right",
          autoClose: 4000,
        });
        
        onPrioritiesChanged();
        
        if (isFirstTimePriority) {
          window.dispatchEvent(new CustomEvent('firstPriorityAdded'));
        }
        
        initialPrioritiesRef.current = { ...priorities };
        setHasUnsavedChanges(false);
        
        setOpen(false);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to update ${failCount} priorities`, {
          position: "bottom-right"
        });
      }
    } catch (error) {
      console.error('Error saving priorities:', error);
      toast.error('An error occurred while saving priorities', {
        position: "bottom-right"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const clearPriority = (url: string) => {
    handlePriorityChange(url, null);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white border-none">
          <Star className="h-4 w-4 mr-2" />
          Manage Priorities
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">Bulk Priority Management</DialogTitle>
          <DialogDescription className="text-gray-300">
            Set priorities for multiple wishlist items at once. Items with higher priority will be highlighted in your list.
            <div className="text-xs text-gray-400 mt-1">
              Priority scale: 1 (Highest) to 10 (Lowest)
            </div>
            {initialPriorityCount === 0 && (
              <div className="mt-2 p-2 bg-indigo-900/30 border border-indigo-800 rounded-md text-indigo-300">
                <Star className="h-4 w-4 inline-block mr-1" /> 
                You haven't set any priorities yet. Adding priorities will enable sorting by priority in your wishlist.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative my-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search items..."
            className="pl-8 bg-gray-700 border-gray-600 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1.5 h-6 w-6 p-0 text-gray-400"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-2" />
            <span>Loading wishlist items...</span>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-gray-700 overflow-hidden">
              <Table className="bg-gray-800 divide-y divide-gray-700">
                <TableHeader className="bg-gray-900">
                  <TableRow>
                    <TableHead className="w-12 text-gray-300 font-medium">#</TableHead>
                    <TableHead className="text-gray-300 font-medium">Item Name</TableHead>
                    <TableHead className="w-28 text-gray-300 font-medium">
                      Priority
                      <span className="text-xs ml-1 text-gray-500">(1=High, 10=Low)</span>
                    </TableHead>
                    <TableHead className="w-20 text-gray-300 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-700">
                  {filteredItems.map((item, index) => (
                    <TableRow key={item.url} className="hover:bg-gray-750">
                      <TableCell className="text-gray-400">{index + 1}</TableCell>
                      <TableCell className="py-2 font-medium text-gray-200">
                        <div className="flex items-center">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-8 h-12 object-cover rounded-sm mr-3 bg-gray-700"
                            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/80x120?text=No+Image")}
                          />
                          <div className="truncate max-w-[280px]">{item.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={priorities[item.url] || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            handlePriorityChange(item.url, value ? parseInt(value) : null);
                          }}
                          className="w-full px-2 py-1 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Not set</option>
                          <optgroup label="High Priority">
                            <option value="1">1 - Highest</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </optgroup>
                          <optgroup label="Medium Priority">
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                          </optgroup>
                          <optgroup label="Low Priority">
                            <option value="7">7</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                            <option value="10">10 - Lowest</option>
                          </optgroup>
                        </select>
                      </TableCell>
                      <TableCell>
                        {priorities[item.url] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => clearPriority(item.url)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredItems.length === 0 && !loading && (
              <div className="py-8 text-center text-gray-400">
                No items found matching your search
              </div>
            )}
          </>
        )}
        
        <DialogFooter className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {Object.keys(priorities).length} items with priority set
            {hasUnsavedChanges && (
              <span className="ml-2 text-yellow-400">
                (unsaved changes)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-gray-300 bg-gray-700 hover:bg-gray-600 border-gray-600"
              onClick={() => handleDialogChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={saveAllPriorities}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save All Priorities'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 