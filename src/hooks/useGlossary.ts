import { useState, useEffect } from 'react';

export interface GlossaryTerm {
  term: string;
  definition: string;
  lastSeen: number;
}

const STORAGE_KEY = 'ohara_glossary';

export function useGlossary() {
  const [glossary, setGlossary] = useState<Record<string, GlossaryTerm>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGlossary(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load glossary", e);
      }
    }
  }, []);

  const addTerms = (terms: { term: string; definition: string }[]) => {
    setGlossary(prev => {
      const next = { ...prev };
      terms.forEach(({ term, definition }) => {
        const key = term.toLowerCase();
        // Only add if not exists or update if definition is significantly different/better
        if (!next[key]) {
          next[key] = { term, definition, lastSeen: Date.now() };
        } else {
          next[key].lastSeen = Date.now();
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { glossary, addTerms };
}
