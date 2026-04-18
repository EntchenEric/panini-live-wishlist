import { useEffect, useState, useRef } from 'react';

export function useLoginStatus(urlEnding: string) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const response = await fetch('/api/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(data.authenticated && data.urlEnding === urlEnding);
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkLoginStatus();

    const handleStorageChange = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [urlEnding]);

  return { isLoggedIn, setIsLoggedIn };
}