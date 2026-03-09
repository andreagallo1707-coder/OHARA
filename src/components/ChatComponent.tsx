import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Send, Bot, User, Loader2, ExternalLink, Sparkles, Quote, 
  Bookmark, Share2, Check, Paperclip, X, Image as ImageIcon, 
  FileText, MoreVertical, Trash2, AlertCircle, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../hooks/useChatHistory';
import { GlossaryTermHighlight } from './Glossary';
import { GlossaryTerm } from '../hooks/useGlossary';
import { FileData } from '../services/gemini';
import LZString from 'lz-string';

interface ChatComponentProps {
  messages: Message[];
  onSendMessage: (content: string, fileData?: FileData) => void;
  onCancel: () => void;
  onDeleteSession: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  glossary: Record<string, GlossaryTerm>;
  onSaveItem: (title: string, content: string, citations: any[]) => void;
  isSaved: (title: string) => boolean;
  sessionTitle?: string;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({ 
  messages, 
  onSendMessage, 
  onCancel,
  onDeleteSession,
  isLoading, 
  error,
  onRetry,
  glossary,
  onSaveItem,
  isSaved,
  sessionTitle
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string; mimeType: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // FIXED STREAMING: No auto-scroll to bottom during streaming
  // We only scroll to bottom when a NEW message from the user is added
  const lastMessageCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user' && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    lastMessageCount.current = messages.length;
  }, [messages.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 4000000) { // 4MB max
      alert('File troppo grande (max 4MB)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1024; // Increased for better analysis
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = (height / width) * MAX_DIM;
              width = MAX_DIM;
            } else {
              width = (width / height) * MAX_DIM;
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
          setSelectedFile({ file, base64: compressedBase64, mimeType: 'image/jpeg' });
          setImagePreview(canvas.toDataURL('image/jpeg', 0.7));
          textareaRef.current?.focus();
        };
        img.src = result;
      } else {
        const base64 = result.split(',')[1];
        setSelectedFile({ file, base64, mimeType: file.type });
        setImagePreview(result);
        textareaRef.current?.focus();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedFile) && !isLoading) {
      const fileData = selectedFile ? {
        mimeType: selectedFile.mimeType,
        data: selectedFile.base64,
        name: selectedFile.file.name
      } : undefined;

      onSendMessage(input || (selectedFile ? `Analizza questo file: ${selectedFile.file.name}` : ''), fileData);
      setInput('');
      setSelectedFile(null);
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShare = (msg: Message) => {
    const data = {
      title: msg.content.split('\n')[0].replace('#', '').trim() || 'OHARA Research',
      content: msg.content,
      citations: msg.citations || []
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}/share?d=${compressed}`;
    navigator.clipboard.writeText(url);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const highlightTerms = (text: string) => {
    if (typeof text !== 'string') return text;
    const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
    if (terms.length === 0) return text;
    const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();
      if (glossary[lowerPart]) {
        return (
          <GlossaryTermHighlight 
            key={i} 
            term={glossary[lowerPart].term} 
            definition={glossary[lowerPart].definition}
          >
            <span className="font-bold border-b border-ohara-red-vivid/30 cursor-help">{part}</span>
          </GlossaryTermHighlight>
        );
      }
      return part;
    });
  };

  const components = {
    p: ({ children }: any) => {
      return <p>{React.Children.map(children, child => typeof child === 'string' ? highlightTerms(child) : child)}</p>;
    },
    li: ({ children }: any) => {
      return <li>{React.Children.map(children, child => typeof child === 'string' ? highlightTerms(child) : child)}</li>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ohara-bg relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-ohara-red-dark/10 blur-[120px] pointer-events-none" />

      {/* Chat Header with Menu */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ohara-border bg-ohara-bg/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-ohara-red-vivid animate-pulse" />
          <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[200px] lg:max-w-md">
            {sessionTitle || 'Nuova Ricerca'}
          </h2>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
          >
            <MoreVertical size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-ohara-card border border-ohara-border rounded-xl shadow-2xl z-30 overflow-hidden"
                >
                  <button 
                    onClick={() => { onDeleteSession(); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ohara-red-vivid hover:bg-ohara-red-dark/10 transition-colors"
                  >
                    <Trash2 size={16} />
                    Elimina Conversazione
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth"
      >
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
            <div className="w-20 h-20 bg-ohara-red-dark/20 rounded-full flex items-center justify-center border border-ohara-red-dark/40 animate-pulse">
              <Sparkles className="text-ohara-red-vivid" size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-mono font-bold text-white tracking-tight">Come posso aiutarti oggi?</h2>
              <p className="text-zinc-500 text-lg">
                Chiedimi della relatività generale, meccanica quantistica o sintesi organica.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8">
              {[
                "Spiegami l'equazione di Schrödinger",
                "Cos'è l'effetto bystander?",
                "Meccanismo della reazione di Diels-Alder",
                "Ultimi paper su arXiv sulla materia oscura"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSendMessage(suggestion)}
                  className="p-4 bg-ohara-card border border-ohara-border rounded-2xl text-sm text-zinc-400 hover:border-ohara-red-vivid hover:text-white transition-all text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 lg:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
              msg.role === 'user' 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400' 
                : 'bg-ohara-red-dark/20 border-ohara-red-dark/40 text-ohara-red-vivid'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div className={`flex-1 min-w-0 max-w-3xl space-y-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`group relative block sm:inline-block p-5 lg:p-6 rounded-3xl text-left ${
                msg.role === 'user' 
                  ? 'bg-ohara-card border border-ohara-border text-zinc-200' 
                  : 'bg-transparent text-zinc-300'
              }`}>
                {msg.role === 'model' && msg.content && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onSaveItem(msg.content.split('\n')[0].replace('#', '').trim() || 'Research', msg.content, msg.citations || [])}
                      className={`p-2 rounded-lg border transition-all ${isSaved(msg.content.split('\n')[0].replace('#', '').trim()) ? 'bg-ohara-red-vivid border-ohara-red-vivid text-white' : 'bg-ohara-card border-ohara-border text-zinc-500 hover:text-white hover:border-ohara-red-vivid'}`}
                    >
                      <Bookmark size={14} />
                    </button>
                    <button 
                      onClick={() => handleShare(msg)}
                      className="p-2 bg-ohara-card border border-ohara-border text-zinc-500 hover:text-white hover:border-ohara-red-vivid rounded-lg transition-all"
                    >
                      {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                    </button>
                  </div>
                )}

                <div className="markdown-body">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
                          {att.mimeType.startsWith('image/') ? (
                            <img 
                              src={`data:${att.mimeType};base64,${att.data}`} 
                              alt={att.name} 
                              className="w-16 h-16 object-cover rounded-xl border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-ohara-red-dark/20 rounded-xl flex items-center justify-center text-ohara-red-vivid">
                              <FileText size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{att.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{(att.data.length * 0.75 / 1024).toFixed(1)} KB • {att.mimeType}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={components}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-ohara-border">
                    <div className="flex items-center gap-2 mb-4">
                      <Quote size={14} className="text-ohara-red-vivid" />
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Fonti Grounding</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((cite, i) => (
                        <a
                          key={i}
                          href={cite.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-ohara-border rounded-lg text-[11px] text-zinc-400 hover:text-ohara-red-vivid hover:border-ohara-red-dark transition-all"
                        >
                          <span className="truncate max-w-[200px]">{cite.title}</span>
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 lg:gap-6"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ohara-red-dark/20 border border-ohara-red-dark/40 flex items-center justify-center text-ohara-red-vivid">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="flex-1 max-w-3xl">
              <div className="p-6 rounded-3xl bg-ohara-card/30 border border-ohara-border relative group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-ohara-red-vivid rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-ohara-red-vivid rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-ohara-red-vivid rounded-full animate-bounce" />
                  </div>
                  <button 
                    onClick={onCancel}
                    className="flex items-center gap-2 px-3 py-1.5 bg-ohara-red-dark/20 border border-ohara-red-dark/40 rounded-lg text-[10px] font-bold text-ohara-red-vivid hover:bg-ohara-red-dark hover:text-white transition-all uppercase tracking-widest"
                  >
                    <X size={12} />
                    Annulla
                  </button>
                </div>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Elaborando risposta scientifica...</p>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 lg:gap-6"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ohara-red-dark/10 border border-ohara-red-dark/20 flex items-center justify-center text-ohara-red-vivid">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 max-w-3xl">
              <div className="p-6 rounded-3xl bg-ohara-red-dark/5 border border-ohara-red-dark/20">
                <p className="text-sm text-ohara-red-vivid font-medium mb-4">{error}</p>
                <button 
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-ohara-red-dark text-white rounded-xl text-xs font-bold hover:bg-ohara-red-vivid transition-all uppercase tracking-widest"
                >
                  <RotateCcw size={14} />
                  Riprova
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 lg:p-8 border-t border-ohara-border bg-ohara-bg/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {selectedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-3 p-2 bg-ohara-red-dark/10 border border-ohara-red-dark/20 rounded-2xl w-fit max-w-full"
            >
              {imagePreview && selectedFile.mimeType.startsWith('image/') ? (
                <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-ohara-red-vivid/40" />
              ) : (
                <div className="w-10 h-10 bg-ohara-red-dark/20 rounded-lg flex items-center justify-center text-ohara-red-vivid">
                  <FileText size={18} />
                </div>
              )}
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] font-bold text-ohara-red-vivid uppercase tracking-widest truncate max-w-[150px]">
                  {selectedFile.file.name}
                </span>
                <span className="text-[9px] text-zinc-500">{(selectedFile.file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setImagePreview('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 hover:bg-ohara-red-dark/20 rounded-full text-zinc-500 hover:text-ohara-red-vivid transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}

          <div className="relative flex items-end gap-2 bg-ohara-card border border-ohara-border rounded-2xl p-2 focus-within:border-ohara-red-vivid focus-within:ring-1 focus-within:ring-ohara-red-vivid/30 transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-3 text-zinc-500 hover:text-ohara-red-vivid transition-colors disabled:opacity-50"
              title="Allega file"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,application/pdf,text/*"
            />
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Allow Enter for new lines, only send via dedicated button
              }}
              placeholder={selectedFile ? "Aggiungi un commento..." : "Interroga OHARA... (es. 'Meccanica Quantistica')"}
              disabled={isLoading}
              className="flex-1 bg-transparent py-3 px-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none disabled:opacity-50 min-h-[44px] max-h-[200px] overflow-y-auto"
            />
            <button
              type="submit"
              disabled={(!input.trim() && !selectedFile) || isLoading}
              className="p-3 bg-ohara-red-dark text-white rounded-xl hover:bg-ohara-red-vivid transition-colors disabled:opacity-50 disabled:bg-zinc-800"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
        <p className="text-[10px] text-center text-zinc-600 mt-4 uppercase tracking-widest">
          OHARA può commettere errori. Verifica sempre le fonti originali.
        </p>
      </div>
    </div>
  );
};
