import React from 'react';
import { Search, Menu, X, Plus, BookOpen, History, Trash2, Bookmark, Share2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatSessionMeta } from '../hooks/useChatHistory';
import { SavedItem } from '../hooks/useSavedItems';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSessionMeta[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  savedItems: SavedItem[];
  onSelectSavedItem: (item: SavedItem) => void;
  onRemoveSavedItem: (id: string) => void;
}

const SessionItem = React.memo(({ 
  session, 
  currentSessionId, 
  onSelectSession, 
  onDeleteSession,
  openMenuId,
  setOpenMenuId
}: { 
  session: ChatSessionMeta, 
  currentSessionId: string | null, 
  onSelectSession: (id: string) => void, 
  onDeleteSession: (id: string) => void,
  openMenuId: string | null,
  setOpenMenuId: (id: string | null) => void
}) => (
  <div
    className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
      currentSessionId === session.id 
        ? 'bg-ohara-card border border-ohara-border text-white' 
        : 'text-zinc-400 hover:bg-zinc-900/50'
    }`}
    onClick={() => onSelectSession(session.id)}
  >
    <div className={`w-1.5 h-1.5 rounded-full ${currentSessionId === session.id ? 'bg-ohara-red-vivid' : 'bg-transparent'}`} />
    <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(openMenuId === session.id ? null : session.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-ohara-red-vivid transition-opacity"
      >
        <MoreVertical size={14} />
      </button>
      
      <AnimatePresence>
        {openMenuId === session.id && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
              }} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-1 w-40 bg-ohara-card border border-ohara-border rounded-xl shadow-2xl z-20 overflow-hidden"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ohara-red-vivid hover:bg-ohara-red-dark/10 transition-colors"
              >
                <Trash2 size={12} />
                Elimina
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  </div>
));

export const Sidebar = React.memo(({
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
}: SidebarProps) => {
  const [activeTab, setActiveTab] = React.useState<'history' | 'saved'>('history');
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

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
        animate={{ 
          x: isOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -300 : 0),
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed lg:static inset-y-0 left-0 z-40 w-72 bg-ohara-bg border-r border-ohara-border flex flex-col"
      >
        <div className="p-4 border-b border-ohara-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ohara-red-dark rounded-lg flex items-center justify-center border border-ohara-red-vivid">
              <span className="text-white font-mono font-bold text-lg">Ω</span>
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold tracking-tighter text-ohara-red-vivid leading-none">OHARA</h1>
              <p className="text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-medium">Scientific Intelligence</p>
            </div>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-ohara-red-dark/20 hover:bg-ohara-red-dark/40 border border-ohara-red-dark/50 rounded-xl text-ohara-red-vivid font-medium transition-all group text-sm"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            Nuova Ricerca
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-3 border-b border-ohara-border">
          <button 
            onClick={() => { setActiveTab('history'); setOpenMenuId(null); }}
            className={`flex-1 py-2.5 text-[9px] uppercase tracking-widest font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'border-ohara-red-vivid text-white' : 'border-transparent text-zinc-500'}`}
          >
            History
          </button>
          <button 
            onClick={() => { setActiveTab('saved'); setOpenMenuId(null); }}
            className={`flex-1 py-2.5 text-[9px] uppercase tracking-widest font-bold transition-colors border-b-2 ${activeTab === 'saved' ? 'border-ohara-red-vivid text-white' : 'border-transparent text-zinc-500'}`}
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
                  <SessionItem
                    key={`session-${session.id}`}
                    session={session}
                    currentSessionId={currentSessionId}
                    onSelectSession={onSelectSession}
                    onDeleteSession={onDeleteSession}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                  />
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
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                          }}
                          className="p-1 hover:text-ohara-red-vivid transition-colors"
                        >
                          <MoreVertical size={12} />
                        </button>

                        <AnimatePresence>
                          {openMenuId === item.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                }} 
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-1 w-40 bg-ohara-card border border-ohara-border rounded-xl shadow-2xl z-20 overflow-hidden"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveSavedItem(item.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ohara-red-vivid hover:bg-ohara-red-dark/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                  Rimuovi
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
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

        <div className="p-3 border-t border-ohara-border bg-ohara-bg/80 backdrop-blur-sm">
          <p className="text-[9px] text-zinc-600 text-center">
            OHARA Intelligence v1.1<br/>
            Powered by Gemini 3 Flash
          </p>
        </div>
      </motion.aside>
    </>
  );
});
