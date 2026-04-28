import { useState, useEffect, useCallback, useMemo } from 'react';

export interface Attachment {
  name: string;
  mimeType: string;
  data: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  citations?: { title: string; uri: string }[];
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

const STORAGE_KEY = 'ohara_chat_history';
const MAX_SESSIONS = 10;

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export interface ChatSessionMeta {
  id: string;
  title: string;
  lastUpdated: number;
}

export function useChatHistory(config: { autoSave: boolean } = { autoSave: true }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (!config.autoSave) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ohara_current_session_id');
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('ohara_current_session_id', currentSessionId);
    } else {
      localStorage.removeItem('ohara_current_session_id');
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (sessions.length > 0) {
      if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
        setCurrentSessionId(sessions[0].id);
      }
    }
  }, [sessions, currentSessionId]);

  // Debounced save to localStorage
  useEffect(() => {
    if (!config.autoSave || sessions.length === 0) return;
    
    const timer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(sessions.slice(0, MAX_SESSIONS));
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (e) {
        if (e instanceof Error && e.name === 'QuotaExceededError' || e.toString().includes('quota')) {
          console.warn("LocalStorage quota exceeded, attempting to save a slim version of history...");
          try {
            // Fallback: Save history without the heavy attachment data
            const slimSessions = sessions.slice(0, MAX_SESSIONS).map(session => ({
              ...session,
              messages: session.messages.map(msg => ({
                ...msg,
                attachments: msg.attachments?.map(att => ({
                  ...att,
                  data: "" // Strip the base64 data to save space
                }))
              }))
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(slimSessions));
            console.log("Slim history saved successfully.");
          } catch (fallbackError) {
            console.error("Failed even to save slim sessions", fallbackError);
          }
        } else {
          console.error("Failed to save sessions to localStorage", e);
        }
      }
    }, 1000); // Save at most once per second

    return () => clearTimeout(timer);
  }, [sessions, config.autoSave]);

  const saveSessions = useCallback((newSessions: ChatSession[]) => {
    const limited = newSessions.slice(0, MAX_SESSIONS);
    setSessions(limited);
  }, []);

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      lastUpdated: Date.now(),
    };
    setSessions(prev => [newSession, ...prev].slice(0, MAX_SESSIONS));
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, []);

  const addMessage = useCallback((sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          const updatedMessages = [...s.messages, newMessage];
          let newTitle = s.title;
          if (s.title === 'New Chat' && message.role === 'user') {
            newTitle = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
          }
          return { ...s, messages: updatedMessages, title: newTitle, lastUpdated: Date.now() };
        }
        return s;
      });
      return [...updated].sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, MAX_SESSIONS);
    });
    
    return newMessage.id;
  }, []);

  const updateLastMessage = useCallback((sessionId: string, updates: Partial<Message>) => {
    setSessions(prev => {
      return prev.map(s => {
        if (s.id === sessionId && s.messages.length > 0) {
          const lastMsg = s.messages[s.messages.length - 1];
          const updatedMessages = [...s.messages.slice(0, -1), { ...lastMsg, ...updates }];
          return { ...s, messages: updatedMessages, lastUpdated: Date.now() };
        }
        return s;
      });
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
      }
      return newSessions;
    });
  }, [currentSessionId]);

  const deleteMessage = useCallback((sessionId: string, messageId: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          const updatedMessages = s.messages.filter(m => m.id !== messageId);
          return { ...s, messages: updatedMessages, lastUpdated: Date.now() };
        }
        return s;
      });
      return updated;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('ohara_current_session_id');
  }, []);

  const currentSession = useMemo(() => sessions.find(s => s.id === currentSessionId) || null, [sessions, currentSessionId]);
  
  const sessionMetas = useMemo(() => sessions.map(s => ({
    id: s.id,
    title: s.title,
    lastUpdated: s.lastUpdated
  })), [sessions]);

  return {
    sessions,
    sessionMetas,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    addMessage,
    updateLastMessage,
    deleteSession,
    deleteMessage,
    clearAllHistory,
  };
}
