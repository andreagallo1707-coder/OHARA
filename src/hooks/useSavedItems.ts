import { useState, useEffect } from 'react';

export interface SavedItem {
  id: string;
  title: string;
  content: string;
  citations: { title: string; uri: string }[];
  timestamp: number;
}

const STORAGE_KEY = 'ohara_saved_items';

export function useSavedItems() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSavedItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved items", e);
      }
    }
  }, []);

  const saveItem = (item: Omit<SavedItem, 'id' | 'timestamp'>) => {
    const newItem: SavedItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    const updated = [newItem, ...savedItems];
    setSavedItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newItem.id;
  };

  const removeItem = (id: string) => {
    const updated = savedItems.filter(i => i.id !== id);
    setSavedItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isSaved = (title: string) => {
    return savedItems.some(i => i.title === title);
  };

  return { savedItems, saveItem, removeItem, isSaved };
}
