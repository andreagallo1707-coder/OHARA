import React from 'react';
import { Search, Menu, X, Plus, BookOpen, History, Trash2, Bookmark, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatSession } from '../hooks/useChatHistory';
import { SavedItem } from '../hooks/useSavedItems';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  savedItems: SavedItem[];
  onSelectSavedItem: (item: SavedItem) => void;
  onRemoveSavedItem: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  savedItems,
  onSelectSavedItem,
  onRemoveSavedItem
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'history' | 'saved'>('history');

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        className={`fixed lg:static inset-y-0 left-0 z-40 w-80 bg-ohara-bg border-r border-ohara-border flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-6 border-b border-ohara-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ohara-red-dark rounded-lg flex items-center justify-center border border-ohara-red-vivid">
              <span className="text-white font-mono font-bold text-xl">Ω</span>
            </div>
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tighter text-ohara-red-vivid">OHARA</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">Scientific Intelligence</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-ohara-red-dark/20 hover:bg-ohara-red-dark/40 border border-ohara-red-dark/50 rounded-xl text-ohara-red-vivid font-medium transition-all group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Nuova Ricerca
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-ohara-border">
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'border-ohara-red-vivid text-white' : 'border-transparent text-zinc-500'}`}
          >
            History
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold transition-colors border-b-2 ${activeTab === 'saved' ? 'border-ohara-red-vivid text-white' : 'border-transparent text-zinc-500'}`}
          >
            Saved ({savedItems.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-8 pt-4">
          {activeTab === 'history' ? (
            <div>
              <div className="flex items-center gap-2 mb-4 px-2">
                <History size={14} className="text-zinc-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cronologia</h2>
              </div>
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={`session-${session.id}`}
                    className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      currentSessionId === session.id 
                        ? 'bg-ohara-card border border-ohara-border text-white' 
                        : 'text-zinc-400 hover:bg-zinc-900/50'
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${currentSessionId === session.id ? 'bg-ohara-red-vivid' : 'bg-transparent'}`} />
                    <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-ohara-red-vivid transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4 px-2">
                <Bookmark size={14} className="text-zinc-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Salvati</h2>
              </div>
              <div className="space-y-2">
                {savedItems.map((item) => (
                  <div
                    key={`saved-${item.id}`}
                    className="group relative flex flex-col p-3 rounded-xl bg-ohara-card border border-ohara-border hover:border-ohara-red-dark/50 transition-all cursor-pointer"
                    onClick={() => onSelectSavedItem(item)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-200 truncate pr-6">{item.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSavedItem(item.id);
                        }}
                        className="p-1 hover:text-ohara-red-vivid transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
                {savedItems.length === 0 && (
                  <p className="text-xs text-zinc-600 px-2 italic">Nessun elemento salvato</p>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-ohara-border bg-ohara-bg/80 backdrop-blur-sm">
          {user && (
            <div className="flex items-center gap-3 p-3 mb-4 bg-zinc-900/50 rounded-2xl border border-ohara-border">
              <div className="w-10 h-10 bg-ohara-red-dark rounded-xl flex items-center justify-center border border-ohara-red-vivid text-white font-bold">
                {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.displayName || 'Ricercatore'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 text-center">
            OHARA Intelligence v1.1<br/>
            Powered by Gemini 3.1 Pro
          </p>
        </div>
      </motion.aside>
    </>
  );
};
