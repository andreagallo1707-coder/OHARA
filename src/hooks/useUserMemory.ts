import { useState, useEffect, useCallback } from 'react';

export interface UserFact {
  id: string;
  content: string;
  timestamp: number;
}

export function useUserMemory() {
  const [facts, setFacts] = useState<UserFact[]>([]);

  useEffect(() => {
    const savedFacts = localStorage.getItem('ohara_user_memory');
    if (savedFacts) {
      try {
        setFacts(JSON.parse(savedFacts));
      } catch (e) {
        console.error("Failed to parse user memory", e);
      }
    }
  }, []);

  const saveFact = useCallback((content: string) => {
    setFacts(prev => {
      const newFact: UserFact = {
        id: Math.random().toString(36).substr(2, 9),
        content,
        timestamp: Date.now()
      };
      const updated = [...prev, newFact];
      localStorage.setItem('ohara_user_memory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFact = useCallback((id: string) => {
    setFacts(prev => {
      const updated = prev.filter(f => f.id !== id);
      localStorage.setItem('ohara_user_memory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearMemory = useCallback(() => {
    setFacts([]);
    localStorage.removeItem('ohara_user_memory');
  }, []);

  return { facts, saveFact, removeFact, clearMemory };
}
