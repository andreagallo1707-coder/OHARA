import { useState, useRef, useCallback, useEffect } from 'react';
import { askOharaStream, FileData } from '../services/gemini';
import { Message } from './useChatHistory';

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<any>(null);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    history: { role: 'user' | 'model'; parts: any[] }[],
    fileData?: FileData,
    onChunk?: (text: string, citations: any[], done: boolean) => void
  ) => {
    cancelRequest();
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 60s Timeout
    timeoutRef.current = setTimeout(() => {
      controller.abort();
      setError("Timeout della richiesta. Riprova?");
      setIsLoading(false);
    }, 60000);

    try {
      const stream = askOharaStream(content, history, fileData);
      
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        
        // Reset timeout on each chunk to keep connection alive if streaming
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            controller.abort();
            setError("Connessione interrotta. Riprova?");
            setIsLoading(false);
          }, 15000); // Shorter timeout between chunks
        }

        if (onChunk) {
          onChunk(chunk.text, chunk.citations, chunk.done || false);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Handled by timeout or manual cancel
      } else {
        console.error("Chat Error:", err);
        setError("Impossibile rispondere. Riprova?");
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [cancelRequest]);

  // Background detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && error && error.includes("Connessione")) {
        // Optional: auto-retry or just leave the error for the user to click
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [error]);

  return {
    sendMessage,
    cancelRequest,
    isLoading,
    error,
    setError
  };
}
