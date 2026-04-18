import { useState } from 'react';
import { ComicData } from './PriorityBadge';
import { useWishlistEvents } from '@/lib/wishlist-events';

export function useDependencyManager(urlEnding: string, url: string, isLoggedIn: boolean, comicData: ComicData, wishlistItems: Array<{ name: string; url: string }>) {
  const [dependencyUrl, setDependencyUrl] = useState('');
  const [isSavingDependency, setIsSavingDependency] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredItems, setFilteredItems] = useState<Array<{ name: string; url: string }>>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const { emit } = useWishlistEvents();

  const saveDependency = async () => {
    if (!isLoggedIn) return;
    setIsSavingDependency(true);
    setDependencyError(null);

    try {
      const response = await fetch('/api/save_dependency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlEnding, url, dependencyUrl }),
      });

      if (response.ok) {
        setDependencyDialogOpen(false);
        emit('dependenciesUpdated');
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

  const hasDependencyChanges = dependencyUrl !== comicData.dependencyUrl;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setHighlightedIndex(-1);
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
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchResults || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleItemSelect(filteredItems[highlightedIndex].url);
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      setHighlightedIndex(-1);
    }
  };

  return {
    dependencyUrl, setDependencyUrl, isSavingDependency, dependencyError,
    searchQuery, handleSearch, showSearchResults, filteredItems, handleItemSelect,
    highlightedIndex, handleSearchKeyDown,
    dependencyDialogOpen, setDependencyDialogOpen, saveDependency, hasDependencyChanges,
  };
}