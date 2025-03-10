'use client';

import { useEffect, useState, use } from 'react';
import { Item } from '@/components/item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Page({ params }: { params: Promise<{ urlEnding: string }> }) {
  const [wishlistData, setWishlistData] = useState<Array<{ link: string, name: string, image: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCached, setIsUsingCached] = useState(false);

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
          setIsUsingCached(true);
          toast.info('The current wishlist is cached and might be outdated. Please wait a few seconds while the latest wishlist is fetched.', {
            position: "bottom-left",
            autoClose: 5000,
          });
        } else {
          throw new Error('Cached wishlist not found');
        }
      } catch (err) {
        console.log('Cached data failed, falling back to regular wishlist.');
        fetchWishlist();
      } finally {
        setLoading(false);
      }
    };

    const fetchWishlist = async () => {
      try {
        const response = await fetch(`/api/get_wishlist?urlEnding=${urlEnding}`);
        const data = await response.json();
        setWishlistData(data.result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCashedWishlist();
  }, [urlEnding]);

  if (loading) return <div className="text-center py-10 text-xl text-gray-700">Loading...</div>;
  if (error) return <div className="text-center py-10 text-xl text-red-500">Error: {error}</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 px-6">
      <Card className="w-full max-w-6xl shadow-xl border border-gray-800 rounded-3xl bg-gray-900 text-white p-8">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-extrabold text-gray-100">
            Wishlist for <span className="text-indigo-600">{urlEnding}</span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {wishlistData && wishlistData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
