'use client';

import { createContext, useContext, useCallback, useState } from 'react';

type EventTypes = 'prioritiesUpdated' | 'notesUpdated' | 'dependenciesUpdated' | 'firstPriorityAdded';

type WishlistEventsContextType = {
  emit: (event: EventTypes) => void;
  lastEvent: { type: EventTypes; timestamp: number } | null;
};

const WishlistEventsContext = createContext<WishlistEventsContextType>({
  emit: () => {},
  lastEvent: null,
});

export function WishlistEventsProvider({ children }: { children: React.ReactNode }) {
  const [lastEvent, setLastEvent] = useState<{ type: EventTypes; timestamp: number } | null>(null);

  const emit = useCallback((type: EventTypes) => {
    setLastEvent({ type, timestamp: Date.now() });
  }, []);

  return (
    <WishlistEventsContext.Provider value={{ emit, lastEvent }}>
      {children}
    </WishlistEventsContext.Provider>
  );
}

export function useWishlistEvents() {
  return useContext(WishlistEventsContext);
}