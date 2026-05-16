import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Same logic as backend: everything before the first hyphen, trimmed
export function extractPrefix(filenameOrPath: string): string {
  // Extract just the filename from a path
  const basename = filenameOrPath.split('/').pop() || filenameOrPath;
  const nameWithoutExt = basename.replace(/\.[^/.]+$/, '');
  const hyphenIndex = nameWithoutExt.indexOf('-');
  if (hyphenIndex !== -1) {
    return nameWithoutExt.substring(0, hyphenIndex).trim();
  }
  return nameWithoutExt.trim();
}

// --- API functions ---

export async function fetchFavoritePrefixes(): Promise<Record<string, 'favorite' | 'oldfav'>> {
  const response = await fetch('/api/favorites/prefixes');
  if (!response.ok) throw new Error('Failed to fetch favorite prefixes');
  const data = await response.json();
  return data.prefixes ?? {};
}

async function postFavorite(action: string, prefix: string): Promise<void> {
  const response = await fetch(`/api/favorites/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix }),
  });
  if (!response.ok) throw new Error(`Failed to ${action} favorite`);
}

export const addFavoritePrefix = (prefix: string) => postFavorite('add', prefix);
export const removeFavoritePrefix = (prefix: string) => postFavorite('remove', prefix);
export const reactivateFavoritePrefix = (prefix: string) => postFavorite('reactivate', prefix);

// --- Context ---

interface FavoritesContextValue {
  prefixStates: Record<string, 'favorite' | 'oldfav'>;
  loading: boolean;
  refreshKey: number;
  addFavorite: (prefix: string) => void;
  removeFavorite: (prefix: string) => void;
  reactivateFavorite: (prefix: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  prefixStates: {},
  loading: true,
  refreshKey: 0,
  addFavorite: () => {},
  removeFavorite: () => {},
  reactivateFavorite: () => {},
});

export function useFavorites(): FavoritesContextValue {
  return useContext(FavoritesContext);
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [prefixStates, setPrefixStates] = useState<Record<string, 'favorite' | 'oldfav'>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchFavoritePrefixes()
      .then(setPrefixStates)
      .catch((err) => console.error('Failed to load favorites:', err))
      .finally(() => setLoading(false));
  }, []);

  const updateStates = useCallback((prefix: string, state: 'favorite' | 'oldfav') => {
    setPrefixStates((prev) => ({ ...prev, [prefix]: state }));
    setRefreshKey((k) => k + 1);
  }, []);

  const addFavorite = useCallback((prefix: string) => {
    updateStates(prefix, 'favorite');
    addFavoritePrefix(prefix).catch((err) => console.error('addFavorite failed:', err));
  }, [updateStates]);

  const removeFavorite = useCallback((prefix: string) => {
    updateStates(prefix, 'oldfav');
    removeFavoritePrefix(prefix).catch((err) => console.error('removeFavorite failed:', err));
  }, [updateStates]);

  const reactivateFavorite = useCallback((prefix: string) => {
    updateStates(prefix, 'favorite');
    reactivateFavoritePrefix(prefix).catch((err) => console.error('reactivateFavorite failed:', err));
  }, [updateStates]);

  return (
    <FavoritesContext.Provider
      value={{ prefixStates, loading, refreshKey, addFavorite, removeFavorite, reactivateFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}
