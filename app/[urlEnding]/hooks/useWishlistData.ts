import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { ComicData, EnhancedWishlistItem } from '@/lib/types';
import { mapBackendDataToExpectedFormat, BackendComicData } from '@/lib/comic-utils';

export type { ComicData, EnhancedWishlistItem };

function createFallbackItem(item: { link: string; name: string; image: string }): EnhancedWishlistItem {
  return {
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
      stories: "",
      binding: "",
      ISBN: "",
      deliverableTo: "Check website for availability",
      deliveryFrom: "",
      name: item.name || 'Unknown Comic',
      fallback: true
    }
  };
}

export function useWishlistData(urlEnding: string) {
  const [wishlistData, setWishlistData] = useState<Array<EnhancedWishlistItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchCachedWishlist = async () => {
      try {
        const response = await fetch(`/api/get_cashed_wishlist?urlEnding=${urlEnding}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          let parsedData;
          const cachedData = data.cash;
          if (typeof cachedData === 'string') {
            parsedData = JSON.parse(cachedData);
          } else {
            parsedData = cachedData;
          }

          const basicWishlistData = parsedData.data.map((item: { link: string; name: string; image: string }) => ({
            link: item.link, name: item.name, image: item.image
          }));

          await fetchBulkComicData(basicWishlistData);
          toast.info('Lade die neuesten Wunschlistendaten...', { position: "bottom-left", autoClose: 5000 });
          fetchWishlist();
        } else {
          throw new Error('Cached wishlist not found');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        fetchWishlist();
      }
    };

    const fetchWishlist = async () => {
      try {
        const response = await fetch(`/api/get_wishlist?urlEnding=${urlEnding}`, { signal: controller.signal });
        const data = await response.json();
        const result = JSON.parse(data.responseData.result);

        const basicWishlistData = result.data.map((item: { link: string; name: string; image: string }) => ({
          link: item.link, name: item.name, image: item.image
        }));

        await fetchBulkComicData(basicWishlistData);
        toast.success('Wunschliste mit den neuesten Daten aktualisiert', { position: "bottom-left", autoClose: 3000 });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error('Fehler beim Laden der neuesten Wunschlistendaten', { position: "bottom-left", autoClose: 5000 });
        setLoading(false);
      }
    };

    const fetchBulkComicData = async (basicItems: Array<{ link: string; name: string; image: string }>) => {
      try {
        if (!basicItems || !Array.isArray(basicItems) || basicItems.length === 0) {
          throw new Error("No items to fetch or invalid items array");
        }

        const validItems = basicItems.filter(item => item && typeof item === 'object' && item.link && typeof item.link === 'string');
        if (validItems.length === 0) throw new Error("No valid items to fetch");

        const normalizedItems = validItems.map(item => ({
          url: item.link,
          name: (item.name && typeof item.name === 'string') ? item.name : '',
          image: (item.image && typeof item.image === 'string') ? item.image : ''
        }));

        const urlsOnly = normalizedItems.map(item => item.url);
        if (urlsOnly.length === 0) throw new Error("No valid URLs to send");

        const response = await fetch('/api/get_bulk_comic_data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: urlsOnly }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Failed to fetch comic data: ${response.status}`);

        const data = await response.json();
        if (!data.data || typeof data.data !== 'object') throw new Error('Invalid response format');

        const comicEntries = Object.entries(data.data);
        const transformedData = comicEntries.map(([url, comicData]: [string, unknown], index: number) => {
          if (!comicData || typeof comicData !== 'object') {
            return createFallbackItem(validItems[index] || { link: '', name: '', image: '' });
          }

          const comicObj = comicData as Record<string, unknown>;
          const originalItem = normalizedItems.find(item => item.url === url) || { url, name: '', image: '' };
          const resultData = (comicObj.result || comicObj) as BackendComicData;
          const mapped = mapBackendDataToExpectedFormat(resultData);

          return {
            link: url,
            name: mapped.name || originalItem.name || 'Unknown Comic',
            image: originalItem.image || '',
            comicData: {
              ...mapped,
              needsUpdate: comicObj.needsUpdate as boolean || false
            }
          };
        });

        setWishlistData(transformedData);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error fetching bulk comic data:', err);
        const fallbackData = basicItems.map(item => createFallbackItem(item));
        setWishlistData(fallbackData);
        setLoading(false);
      }
    };

    fetchCachedWishlist();

    return () => {
      controller.abort();
    };
  }, [urlEnding]);

  return { wishlistData, setWishlistData, loading, setLoading, error, setError };
}