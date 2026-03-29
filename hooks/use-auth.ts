import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<(User & { isGuest?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState<number>(0);

  const loginAsGuest = () => {
    const guestUser = {
      uid: 'guest-' + Math.random().toString(36).substr(2, 9),
      displayName: 'Guest User',
      email: 'guest@example.com',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
      isGuest: true,
    } as any;
    setUser(guestUser);
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
  };

  const logoutGuest = () => {
    setUser(null);
    localStorage.removeItem('guestUser');
  };

  useEffect(() => {
    const savedGuest = localStorage.getItem('guestUser');
    if (savedGuest) {
      setUser(JSON.parse(savedGuest));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Ensure user document exists
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email || '',
              role: 'user',
              storageUsed: 0,
              createdAt: serverTimestamp(),
            });
            setStorageUsed(0);
          } else {
            setStorageUsed(userSnap.data().storageUsed || 0);
          }
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, storageUsed, setStorageUsed, loginAsGuest, logoutGuest };
}
