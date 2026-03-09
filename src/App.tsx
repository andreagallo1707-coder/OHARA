import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ChatComponent } from './components/ChatComponent';
import { ShareView } from './components/ShareView';
import { ResearchBoard } from './components/ResearchBoard';
import { useChatHistory } from './hooks/useChatHistory';
import { useGlossary } from './hooks/useGlossary';
import { useSavedItems } from './hooks/useSavedItems';
import { useChat } from './hooks/useChat';
import { extractGlossaryTerms, FileData } from './services/gemini';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { LayoutGrid, MessageSquare, Sparkles, Bookmark, Settings, User as UserIcon, Palette, Shield, Bell, Search, RefreshCw, X, ExternalLink, BookOpen, Paperclip, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const THEMES = {
  Crimson: { dark: '#8b0000', vivid: '#dc143c' },
  Emerald: { dark: '#064e3b', vivid: '#10b981' },
  Indigo: { dark: '#312e81', vivid: '#6366f1' },
  Amber: { dark: '#78350f', vivid: '#f59e0b' },
};

function MainApp() {
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('ohara_autosave');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem('ohara_theme') || 'Crimson';
  });

  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    addMessage,
    updateLastMessage,
    deleteSession,
  } = useChatHistory(autoSave);

  useEffect(() => {
    localStorage.setItem('ohara_autosave', JSON.stringify(autoSave));
  }, [autoSave]);

  useEffect(() => {
    localStorage.setItem('ohara_theme', themeColor);
    const theme = THEMES[themeColor as keyof typeof THEMES] || THEMES.Crimson;
    document.documentElement.style.setProperty('--accent-dark', theme.dark);
    document.documentElement.style.setProperty('--accent-vivid', theme.vivid);
  }, [themeColor]);

  const { glossary, addTerms } = useGlossary();
  const { savedItems, saveItem, removeItem, isSaved } = useSavedItems();
  const { sendMessage, cancelRequest, isLoading, error, setError } = useChat();

  const [view, setView] = useState<'chat' | 'news' | 'settings'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSendMessage = async (content: string, fileData?: FileData, forceNewChat = false) => {
    setView('chat');
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

    try {
      // If it's a new chat, history should be empty. Otherwise use the session's messages.
      const lastMessages = forceNewChat ? [] : (currentSession?.messages.slice(-10) || []);
      
      // 1. Map messages to Gemini format and filter out empty parts
      const mappedHistory = lastMessages.map((m, idx) => {
        const isRecent = idx >= lastMessages.length - 3;
        const parts: any[] = [];
        if (m.content && m.content.trim() !== "") {
          parts.push({ text: m.content });
        }
        if (m.attachments && isRecent) {
          m.attachments.forEach(att => {
            if (att.data) {
              parts.push({
                inlineData: {
                  mimeType: att.mimeType,
                  data: att.data
                }
              });
            }
          });
        }
        return { role: m.role as 'user' | 'model', parts };
      }).filter(m => m.parts.length > 0);

      // 2. Ensure alternating roles (User -> Model -> User -> Model) and starts with 'user'
      const history: any[] = [];
      let lastRole: string | null = null;
      for (const msg of mappedHistory) {
        if (history.length === 0 && msg.role !== 'user') continue;
        
        if (msg.role !== lastRole) {
          history.push(msg);
          lastRole = msg.role;
        } else if (msg.role === 'user') {
          // If two user messages in a row, merge their parts
          const lastMsg = history[history.length - 1];
          lastMsg.parts = [...lastMsg.parts, ...msg.parts];
        }
        // If two model messages in a row, we just keep the first one
      }

      addMessage(sessionId, { role: 'model', content: "" });

      await sendMessage(content, history, fileData, (text, citations, done) => {
        updateLastMessage(sessionId!, { content: text, citations });
        if (done) {
          extractGlossaryTerms(text).then(terms => {
            if (terms.length > 0) addTerms(terms);
          });
        }
      });
    } catch (err) {
      console.error("SendMessage Error:", err);
    }
  };

  const handleSelectSavedItem = (item: any) => {
    const sessionId = createNewSession();
    addMessage(sessionId, { role: 'model', content: item.content, citations: item.citations });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ohara-bg flex-col lg:flex-row">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => { setView('chat'); setCurrentSessionId(id); setIsSidebarOpen(false); }}
        onNewChat={() => { setView('chat'); createNewSession(); setIsSidebarOpen(false); }}
        onDeleteSession={deleteSession}
        savedItems={savedItems}
        onSelectSavedItem={(item) => { setView('chat'); handleSelectSavedItem(item); setIsSidebarOpen(false); }}
        onRemoveSavedItem={removeItem}
      />
      
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-ohara-border bg-ohara-bg/80 backdrop-blur-md z-20 flex-shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-ohara-card border border-ohara-border rounded-lg text-ohara-red-vivid"
          >
            <MessageSquare size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ohara-red-dark rounded flex items-center justify-center border border-ohara-red-vivid">
              <span className="text-white font-mono font-bold text-sm">Ω</span>
            </div>
            <span className="font-mono font-bold text-ohara-red-vivid">OHARA</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col min-h-0 pb-20 lg:pb-0">
          {view === 'chat' && (
            <ChatComponent
              messages={currentSession?.messages || []}
              onSendMessage={handleSendMessage}
              onCancel={cancelRequest}
              onDeleteSession={() => currentSessionId && deleteSession(currentSessionId)}
              isLoading={isLoading}
              error={error}
              onRetry={() => {
                const lastUserMsg = currentSession?.messages.filter(m => m.role === 'user').pop();
                if (lastUserMsg) {
                  // Remove the last error message if it exists
                  if (currentSession?.messages[currentSession.messages.length - 1].role === 'model' && 
                      currentSession?.messages[currentSession.messages.length - 1].content === "") {
                    // It's the empty model message we added before error
                  }
                  handleSendMessage(lastUserMsg.content);
                }
              }}
              glossary={glossary}
              onSaveItem={(title, content, citations) => saveItem({ title, content, citations })}
              isSaved={isSaved}
              sessionTitle={currentSession?.title}
            />
          )}

          {view === 'news' && (
            <ResearchBoard onChatWithAI={(msg) => handleSendMessage(msg, undefined, true)} />
          )}

          {view === 'settings' && (
            <div className="flex-1 overflow-y-auto p-6 lg:p-12 bg-ohara-bg">
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
                      <Palette size={20} className="text-ohara-red-vivid" />
                      Layout & Colore
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.keys(THEMES).map(color => (
                        <button 
                          key={color} 
                          onClick={() => setThemeColor(color)}
                          className={`flex flex-col items-center gap-2 p-4 bg-zinc-900/50 rounded-2xl border transition-all group ${themeColor === color ? 'border-ohara-red-vivid' : 'border-ohara-border hover:border-ohara-red-vivid/50'}`}
                        >
                          <div 
                            className="w-8 h-8 rounded-full" 
                            style={{ backgroundColor: THEMES[color as keyof typeof THEMES].vivid }}
                          />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${themeColor === color ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                            {color}
                          </span>
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
                          className={`w-10 h-5 rounded-full relative transition-colors ${autoSave ? 'bg-ohara-red-vivid' : 'bg-zinc-700'}`}
                        >
                          <motion.div 
                            animate={{ x: autoSave ? 20 : 4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-3 h-3 bg-white rounded-full" 
                          />
                        </button>
                      </div>
                      <div className="pt-4 border-t border-ohara-border">
                        <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed uppercase tracking-widest">
                          I tuoi dati sono salvati esclusivamente nella memoria locale del tuo browser. Nessuno, tranne te su questo dispositivo, può vederli.
                        </p>
                        <button 
                          onClick={() => {
                            if (confirm("Sei sicuro di voler cancellare definitivamente tutta la cronologia, le ricerche salvate e il glossario? Questa azione non è reversibile.")) {
                              localStorage.clear();
                              window.location.reload();
                            }
                          }}
                          className="w-full py-3 bg-zinc-900 border border-ohara-red-dark/50 text-ohara-red-vivid text-[10px] font-bold rounded-xl hover:bg-ohara-red-dark hover:text-white transition-all uppercase tracking-widest"
                        >
                          CANCELLA TUTTI I DATI LOCALI
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 lg:left-80 h-20 bg-ohara-bg/80 backdrop-blur-xl border-t border-ohara-border z-50 flex items-center justify-around px-6">
          <button 
            onClick={() => setView('chat')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'chat' ? 'text-ohara-red-vivid scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <MessageSquare size={24} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Chat</span>
          </button>
          <button 
            onClick={() => setView('news')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'news' ? 'text-ohara-red-vivid scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Newspaper size={24} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Bacheca</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'settings' ? 'text-ohara-red-vivid scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings size={24} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Impostazioni</span>
          </button>
        </div>
      </main>
    </div>
  );
}

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
