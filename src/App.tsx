import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatComponent } from './components/ChatComponent';
import { ShareView } from './components/ShareView';
import { ResearchBoard } from './components/ResearchBoard';
import { useChatHistory } from './hooks/useChatHistory';
import { useSavedItems } from './hooks/useSavedItems';
import { useChat } from './hooks/useChat';
import { useUserMemory } from './hooks/useUserMemory';
import { extractUserFacts, FileData } from './services/gemini';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { LayoutGrid, MessageSquare, Sparkles, Bookmark, Settings, User as UserIcon, Palette, Shield, Bell, Search, RefreshCw, X, ExternalLink, BookOpen, Paperclip, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MainApp = React.memo(() => {
  const [themeColor, setThemeColor] = useState<string>(() => {
    try {
      return localStorage.getItem('ohara_theme_color') || 'Crimson';
    } catch (e) {
      return 'Crimson';
    }
  });
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ohara_auto_save');
      return saved === null ? true : saved === 'true';
    } catch (e) {
      return true;
    }
  });
  const [citationStyle, setCitationStyle] = useState<string>(() => {
    try {
      return localStorage.getItem('ohara_citation_style') || 'APA';
    } catch (e) {
      return 'APA';
    }
  });

  const chatHistoryConfig = React.useMemo(() => ({ autoSave }), [autoSave]);

  const {
    sessions,
    sessionMetas,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    addMessage,
    updateLastMessage,
    deleteSession,
  } = useChatHistory(chatHistoryConfig);

  const { savedItems, saveItem, removeItem, isSaved } = useSavedItems();
  const { sendMessage, cancelRequest, isLoading, error, setError } = useChat();
  const { facts, saveFact, removeFact, clearMemory: clearUserMemory } = useUserMemory();

  const [view, setView] = useState<'chat' | 'news' | 'settings'>(() => {
    try {
      return (localStorage.getItem('ohara_view') as any) || 'chat';
    } catch (e) {
      return 'chat';
    }
  });

  // Wrapper for setView with logging to debug unexpected jumps
  const handleSetView = React.useCallback((newView: 'chat' | 'news' | 'settings') => {
    if (newView !== view) {
      console.log(`[OHARA] View transition: ${view} -> ${newView}`);
      // console.trace('View transition trace'); // Uncomment if debugging in browser console
      setView(newView);
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('ohara_view', view);
    } catch (e) {}
  }, [view]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const initRef = React.useRef(false);
  // Ensure a new session is created on startup
  React.useLayoutEffect(() => {
    if (initRef.current) return;
    const hasInitialized = sessionStorage.getItem('ohara_initialized');
    if (!hasInitialized) {
      const isFreshSession = currentSession && currentSession.messages.length === 0;
      if (!isFreshSession) {
        createNewSession();
      }
      setView('chat');
      sessionStorage.setItem('ohara_initialized', 'true');
    }
    initRef.current = true;
  }, [createNewSession, currentSession]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
    try {
      localStorage.setItem('ohara_theme_color', themeColor);
    } catch (e) {}
  }, [themeColor]);

  useEffect(() => {
    try {
      localStorage.setItem('ohara_auto_save', String(autoSave));
    } catch (e) {}
  }, [autoSave]);

  useEffect(() => {
    try {
      localStorage.setItem('ohara_citation_style', citationStyle);
    } catch (e) {}
  }, [citationStyle]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const currentSessionRef = React.useRef(currentSession);
  React.useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  const isSendingRef = React.useRef(false);

  const handleSendMessage = React.useCallback(async (content: string, fileData?: FileData, forceNewChat = false) => {
    if ((!content.trim() && !fileData) || isSendingRef.current) return;
    
    isSendingRef.current = true;
    handleSetView('chat');
    
    try {
      let sessionId = forceNewChat ? createNewSession() : currentSessionId;
      if (!sessionId) {
        sessionId = createNewSession();
      }

      addMessage(sessionId, { 
        role: 'user', 
        content,
        attachments: fileData ? [{
          name: fileData.name || 'File',
          mimeType: fileData.mimeType,
          data: fileData.data
        }] : undefined
      });

      const lastMessages = forceNewChat ? [] : (currentSessionRef.current?.messages.slice(-10) || []);
      
      const mappedHistory = lastMessages.map((m) => {
        const parts: any[] = [];
        if (m.content && m.content.trim() !== "") {
          parts.push({ text: m.content });
        }
        // Attachments are no longer sent in the history to save quota.
        // The AI will only see the file if it's attached to the current message.
        return { role: m.role as 'user' | 'model', parts };
      }).filter(m => m.parts.length > 0);

      const history: any[] = [];
      let lastRole: string | null = null;
      for (const msg of mappedHistory) {
        if (history.length === 0 && msg.role !== 'user') continue;
        
        if (msg.role !== lastRole) {
          history.push(msg);
          lastRole = msg.role;
        } else {
          // Merge parts for consecutive messages of the same role
          const lastMsg = history[history.length - 1];
          lastMsg.parts = [...lastMsg.parts, ...msg.parts];
        }
      }

      addMessage(sessionId, { role: 'model', content: "" });

      const memoryStrings = facts.map(f => f.content);

      console.log(`[OHARA] Sending message. History length: ${history.length}. File: ${!!fileData}`);
      
      await sendMessage(content, history, fileData, memoryStrings, citationStyle, (text, citations, done) => {
        updateLastMessage(sessionId!, { content: text, citations });
        if (done) {
          const lowerContent = content.toLowerCase();
          const isMemoryRequest = lowerContent.includes("ricorda") || 
                                 lowerContent.includes("memorizza") || 
                                 lowerContent.includes("remember") || 
                                 lowerContent.includes("fissa");
          
          if (isMemoryRequest) {
            extractUserFacts(content).then(newFacts => {
              newFacts.forEach(fact => saveFact(fact));
            });
          }
        }
      });
    } catch (err) {
      console.error("SendMessage Error:", err);
    } finally {
      isSendingRef.current = false;
    }
  }, [currentSessionId, createNewSession, addMessage, sendMessage, updateLastMessage, facts, handleSetView]);

  const handleRetry = React.useCallback(() => {
    const lastUserMsg = currentSession?.messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  }, [currentSession?.messages, handleSendMessage]);

  const handleSaveItem = React.useCallback((title: string, content: string, citations: any[]) => {
    saveItem({ title, content, citations });
  }, [saveItem]);

  const handleDeleteCurrentSession = React.useCallback(() => {
    if (currentSessionId) deleteSession(currentSessionId);
  }, [currentSessionId, deleteSession]);

  const handleSelectSavedItem = React.useCallback((item: any) => {
    const sessionId = createNewSession();
    addMessage(sessionId, { role: 'model', content: item.content, citations: item.citations });
  }, [createNewSession, addMessage]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-ohara-bg flex-col lg:flex-row">
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-ohara-card border border-ohara-border rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Conferma Cancellazione</h3>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Sei sicuro di voler cancellare definitivamente tutta la cronologia, le ricerche salvate e il glossario? Questa azione non è reversibile.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="flex-1 py-3 bg-ohara-red-vivid hover:bg-ohara-red-dark text-white font-bold rounded-xl transition-all"
                >
                  Cancella Tutto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessionMetas}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => { handleSetView('chat'); setCurrentSessionId(id); setIsSidebarOpen(false); }}
        onNewChat={() => { handleSetView('chat'); createNewSession(); setIsSidebarOpen(false); }}
        onDeleteSession={deleteSession}
        savedItems={savedItems}
        onSelectSavedItem={(item) => { handleSetView('chat'); handleSelectSavedItem(item); setIsSidebarOpen(false); }}
        onRemoveSavedItem={removeItem}
      />
      
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <div className="lg:hidden flex items-center justify-between p-4 landscape:p-1 border-b border-ohara-border bg-ohara-bg/80 backdrop-blur-md z-20 flex-shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-ohara-card border border-ohara-border rounded-lg text-ohara-red-vivid landscape:p-1"
          >
            <MessageSquare size={20} className="landscape:w-4 landscape:h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 landscape:w-5 landscape:h-5 bg-ohara-red-dark rounded flex items-center justify-center border border-ohara-red-vivid">
              <span className="text-white font-mono font-bold text-sm landscape:text-[10px]">Ω</span>
            </div>
            <span className="font-mono font-bold text-ohara-red-vivid landscape:hidden">OHARA</span>
          </div>
          <div className="w-10 landscape:w-8" />
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {view === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 flex flex-col min-h-0"
              >
                <ChatComponent
                  messages={currentSession?.messages || []}
                  onSendMessage={handleSendMessage}
                  onCancel={cancelRequest}
                  onDeleteSession={handleDeleteCurrentSession}
                  isLoading={isLoading}
                  error={error}
                  onRetry={handleRetry}
                  onSaveItem={handleSaveItem}
                  isSaved={isSaved}
                  sessionTitle={currentSession?.title}
                />
              </motion.div>
            )}

            {view === 'news' && (
              <motion.div 
                key="news"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 flex flex-col min-h-0"
              >
                <ResearchBoard onChatWithAI={(msg) => handleSendMessage(msg, undefined, true)} />
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 overflow-y-auto p-6 lg:p-12 bg-ohara-bg"
              >
                <div className="max-w-3xl mx-auto space-y-12">
                  <header>
                    <h2 className="text-3xl lg:text-4xl font-mono font-bold text-white tracking-tighter mb-2">IMPOSTAZIONI</h2>
                    <p className="text-zinc-500 uppercase tracking-[0.3em] text-[10px] font-bold">Personalizza la tua esperienza scientifica</p>
                  </header>

                  <div className="space-y-8">
                    <section className="bg-ohara-card border border-ohara-border rounded-3xl p-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <UserIcon size={20} className="text-ohara-red-vivid" />
                        Account
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-ohara-border">
                          <div>
                            <div className="text-sm font-bold text-white">Status Account</div>
                            <div className="text-xs text-zinc-500">Ricercatore Ospite</div>
                          </div>
                          <button className="px-4 py-2 bg-ohara-red-dark text-white text-xs font-bold rounded-lg hover:bg-ohara-red-vivid transition-colors">LOGIN</button>
                        </div>
                      </div>
                    </section>

                    <section className="bg-ohara-card border border-ohara-border rounded-3xl p-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <BookOpen size={20} className="text-ohara-red-vivid" />
                        Stile Citazioni
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {['APA', 'MLA', 'Chicago', 'Harvard'].map(style => (
                          <button 
                            key={style} 
                            onClick={() => setCitationStyle(style)}
                            className={`flex flex-col items-center gap-2 p-4 bg-zinc-900/50 rounded-2xl border transition-all group ${citationStyle === style ? 'border-ohara-red-vivid' : 'border-ohara-border hover:border-ohara-red-vivid/50'}`}
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${citationStyle === style ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{style}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed uppercase tracking-widest">
                        Lo stile selezionato verrà applicato a tutte le citazioni scientifiche generate da OHARA.
                      </p>
                    </section>

                    <section className="bg-ohara-card border border-ohara-border rounded-3xl p-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Palette size={20} className="text-ohara-red-vivid" />
                        Layout & Colore
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {['Crimson', 'Emerald', 'Indigo', 'Amber'].map(color => (
                          <button 
                            key={color} 
                            onClick={() => setThemeColor(color)}
                            className={`flex flex-col items-center gap-2 p-4 bg-zinc-900/50 rounded-2xl border transition-all group ${themeColor === color ? 'border-ohara-red-vivid' : 'border-ohara-border hover:border-ohara-red-vivid/50'}`}
                          >
                            <div className={`w-8 h-8 rounded-full ${
                              color === 'Crimson' ? 'bg-[#dc143c]' : 
                              color === 'Emerald' ? 'bg-[#10b981]' : 
                              color === 'Indigo' ? 'bg-[#6366f1]' : 
                              'bg-[#f59e0b]'
                            }`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${themeColor === color ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{color}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="bg-ohara-card border border-ohara-border rounded-3xl p-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Shield size={20} className="text-ohara-red-vivid" />
                        Privacy & Sicurezza
                      </h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">Salva cronologia locale</span>
                          <button 
                            onClick={() => setAutoSave(!autoSave)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${autoSave ? 'bg-ohara-red-vivid' : 'bg-zinc-800'}`}
                          >
                            <motion.div 
                              animate={{ x: autoSave ? 22 : 4 }}
                              className="absolute top-1 w-3 h-3 bg-white rounded-full" 
                            />
                          </button>
                        </div>
                        <div className="pt-4 border-t border-ohara-border">
                          <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed uppercase tracking-widest">
                            I tuoi dati sono salvati esclusivamente nella memoria locale del tuo browser. Nessuno, tranne te su questo dispositivo, può vederli.
                          </p>
                          <button 
                            onClick={() => setShowClearConfirm(true)}
                            className="w-full py-3 bg-zinc-900 border border-ohara-border text-ohara-red-vivid text-[10px] font-bold rounded-xl hover:bg-ohara-red-dark hover:text-white transition-all uppercase tracking-widest"
                          >
                            CANCELLA TUTTI I DATI LOCALI
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="bg-ohara-card border border-ohara-border rounded-3xl p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                          <Sparkles size={20} className="text-ohara-red-vivid" />
                          Memoria Selettiva
                        </h3>
                        <button 
                          onClick={clearUserMemory}
                          className="text-[10px] font-bold text-zinc-500 hover:text-ohara-red-vivid uppercase tracking-widest transition-colors"
                        >
                          Svuota Memoria
                        </button>
                      </div>
                      
                      <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                        OHARA ricorderà questi fatti su di te in ogni conversazione. Puoi aggiungere nuove informazioni chiedendole direttamente in chat (es. "Ricorda che sono un biologo").
                      </p>

                      <div className="space-y-3">
                        {facts.length === 0 ? (
                          <div className="p-4 bg-black/20 border border-dashed border-ohara-border rounded-xl text-center">
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Nessun fatto memorizzato</p>
                          </div>
                        ) : (
                          facts.map(fact => (
                            <div key={fact.id} className="group flex items-center justify-between p-3 bg-zinc-900/50 border border-ohara-border rounded-xl hover:border-ohara-red-vivid/30 transition-all">
                              <span className="text-xs text-zinc-300">{fact.content}</span>
                              <button 
                                onClick={() => removeFact(fact.id)}
                                className="p-1 text-zinc-600 hover:text-ohara-red-vivid opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="h-20 landscape:h-10 bg-ohara-bg border-t border-ohara-border flex items-center justify-around px-6 flex-shrink-0 z-20">
          <button 
            onClick={() => handleSetView('chat')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'chat' ? 'text-ohara-red-vivid scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <MessageSquare size={24} className="landscape:w-4 landscape:h-4" />
            <span className="text-[9px] font-bold uppercase tracking-widest landscape:hidden">Chat</span>
          </button>
          <button 
            onClick={() => handleSetView('news')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'news' ? 'text-ohara-red-vivid scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Newspaper size={24} className="landscape:w-4 landscape:h-4" />
            <span className="text-[9px] font-bold uppercase tracking-widest landscape:hidden">Bacheca</span>
          </button>
          <button 
            onClick={() => handleSetView('settings')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'settings' ? 'text-ohara-red-vivid scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings size={24} className="landscape:w-4 landscape:h-4" />
            <span className="text-[9px] font-bold uppercase tracking-widest landscape:hidden">Impostazioni</span>
          </button>
        </div>
      </main>
    </div>
  );
});


export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/share" element={<ShareView />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}
