import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    getRedirectResult(auth).catch(() => {});
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Force account selection every time
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any cached data
      try {
        // Clear all Firebase-related items from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("firebase:") || key.startsWith("trainai_"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // Clear sessionStorage too
        sessionStorage.clear();

        // Clear indexed DB Firebase stores
        const dbs = await indexedDB.databases?.();
        if (dbs) {
          dbs.forEach((db) => {
            if (db.name && (db.name.includes("firebase") || db.name.includes("firestore"))) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        }
      } catch (cleanupErr) {
        console.warn("Cleanup error (non-critical):", cleanupErr);
      }

      // Force page reload to clear all in-memory state
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
      // Force reload even if signOut fails
      window.location.reload();
    }
  };

  const value = { user, loading, signInWithGoogle, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
