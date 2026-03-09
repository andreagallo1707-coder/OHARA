import { useState, useEffect } from 'react';

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

export function useChatHistory(autoSave: boolean = true) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        setCurrentSessionId(null);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveSessions = (newSessions: ChatSession[]) => {
    const limited = newSessions.slice(0, MAX_SESSIONS);
    setSessions(limited);
    if (autoSave) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      } catch (e) {
        console.warn("Storage full, removing oldest session");
        if (limited.length > 1) {
          saveSessions(limited.slice(0, -1));
        }
      }
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      lastUpdated: Date.now(),
    };
    const newSessions = [newSession, ...sessions];
    saveSessions(newSessions);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  const addMessage = (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
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
      const sorted = [...updated].sort((a, b) => b.lastUpdated - a.lastUpdated);
      if (autoSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, MAX_SESSIONS)));
      }
      return sorted.slice(0, MAX_SESSIONS);
    });
    
    return newMessage.id;
  };

  const updateLastMessage = (sessionId: string, updates: Partial<Message>) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId && s.messages.length > 0) {
          const lastMsg = s.messages[s.messages.length - 1];
          const updatedMessages = [...s.messages.slice(0, -1), { ...lastMsg, ...updates }];
          return { ...s, messages: updatedMessages, lastUpdated: Date.now() };
        }
        return s;
      });
      if (autoSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const deleteSession = (sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(newSessions);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const deleteMessage = (sessionId: string, messageId: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          const updatedMessages = s.messages.filter(m => m.id !== messageId);
          return { ...s, messages: updatedMessages, lastUpdated: Date.now() };
        }
        return s;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  return {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    addMessage,
    updateLastMessage,
    deleteSession,
    deleteMessage,
  };
}
