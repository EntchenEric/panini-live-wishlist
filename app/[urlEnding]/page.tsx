'use client';

import { useEffect, useState, use } from 'react';
import { Item } from '@/components/item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

export default function Page({ params }: { params: Promise<{ urlEnding: string }> }) {
  const [wishlistData, setWishlistData] = useState<Array<{ link: string, name: string, image: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedParams = use(params);
  const { urlEnding } = resolvedParams;

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
          setWishlistData(parsedData.data);
          toast.info('Loading the latest wishlist data...', {
            position: "bottom-left",
            autoClose: 5000,
          });
          fetchWishlist();
        } else {
          throw new Error('Cached wishlist not found');
        }
      } catch (err) {
        console.log('Cached data failed, falling back to regular wishlist.');
        fetchWishlist();
      }
    };

    const fetchWishlist = async () => {
      console.log("Fetching new wishlist data...")
      try {
        const response = await fetch(`/api/get_wishlist?urlEnding=${urlEnding}`);
        const data = await response.json();
        console.log("data: ", data)
        const result = JSON.parse(data.responseData.result)
        console.log("result: ", result);
        setWishlistData(result.data);
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
      } finally {
        setLoading(false);
      }
    };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {wishlistData.map((item: { name: string; link: string; image: string }, index: number) => (
                <Item key={index} name={item.name} url={item.link} image={item.image} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xl text-gray-500">No items found in the wishlist</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
