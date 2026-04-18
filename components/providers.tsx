'use client';

import { useEffect } from 'react';
import { WishlistEventsProvider } from '@/lib/wishlist-events';
import { NotificationProvider } from '@/components/notification-provider';
import { setCspNonce } from '@/lib/csp-nonce';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const metaTag = document.querySelector('meta[name="csp-nonce"]');
    if (metaTag) {
      setCspNonce(metaTag.getAttribute('content') || undefined);
    }
  }, []);

  return (
    <WishlistEventsProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </WishlistEventsProvider>
  );
}