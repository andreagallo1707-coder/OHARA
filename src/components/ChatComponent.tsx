import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { 
  ArrowDown, Send, Bot, User, Loader2, ExternalLink, Sparkles, Quote, 
  Bookmark, Share2, Check, Paperclip, X, Image as ImageIcon, 
  FileText, MoreVertical, Trash2, AlertCircle, RotateCcw, Copy, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../hooks/useChatHistory';
import { FileData } from '../services/gemini';
import { ChartRenderer } from './ChartRenderer';
import { TableRenderer } from './TableRenderer';
import LZString from 'lz-string';

// Memoized Message Item to prevent re-rendering all messages during streaming
const MessageItem = React.memo(({ 
  msg, 
  onSaveItem, 
  isSaved, 
  handleShare, 
  handleCopy, 
  copiedId, 
  components 
}: { 
  msg: Message, 
  onSaveItem: any, 
  isSaved: any, 
  handleShare: any, 
  handleCopy: any, 
  copiedId: string | null,
  components: any
}) => {
  // Try to parse content if it looks like a JSON object (common AI error)
  const displayContent = React.useMemo(() => {
    let text = msg.content;

    // 1. Check if the entire message is a JSON object
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.text) text = parsed.text;
        else if (parsed.analysis) text = parsed.analysis;
        else if (parsed.message) text = parsed.message;
        else if (parsed.answer) text = parsed.answer;
        else if (parsed.result) text = parsed.result;
        else if (parsed.solution) text = parsed.solution;
        else if (parsed.explanation) text = parsed.explanation;
        else if (parsed.content) text = parsed.content;
      } catch (e) {
        // Not valid JSON, continue with original text
      }
    }

    // 2. Clean up common artifacts and "strange codes"
    // Only replace literal \n if it's not inside a code block or math block
    // This is tricky, but we can at least avoid replacing double backslashes for LaTeX
    text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    
    // Remove potential JSON fragments that are not in code blocks
    // This is a bit aggressive, but helps with "strange codes"
    text = text.replace(/\{"type":"[^"]+","content":"[^"]+"\}/g, '');
    text = text.replace(/\{"type":"[^"]+","title":"[^"]+",.*?\}/g, '');
    
    // Remove common internal markers
    text = text.replace(/\[INTERNAL_METADATA:.*?\]/g, '');
    
    return text;
  }, [msg.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 lg:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
        msg.role === 'user' 
          ? 'bg-zinc-800 border-zinc-700 text-zinc-400' 
          : 'bg-ohara-red-dark/20 border-ohara-red-dark/40 text-ohara-red-vivid'
      }`}>
        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
      </div>
      
      <div className={`flex-1 min-w-0 max-w-3xl space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
        <div className={`group relative block sm:inline-block p-3 lg:p-4 rounded-2xl text-left ${
          msg.role === 'user' 
            ? 'bg-ohara-card border border-ohara-border text-zinc-200' 
            : 'bg-transparent text-zinc-300'
        }`}>
          {msg.role === 'model' && msg.content && (
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onSaveItem(displayContent.split('\n')[0].replace('#', '').trim() || 'Research', msg.content, msg.citations || [])}
                title="Salva ricerca"
                className={`p-2 rounded-lg border transition-all ${isSaved(displayContent.split('\n')[0].replace('#', '').trim()) ? 'bg-ohara-red-vivid border-ohara-red-vivid text-white' : 'bg-ohara-card border-ohara-border text-zinc-500 hover:text-white hover:border-ohara-red-vivid'}`}
              >
                <Bookmark size={14} />
              </button>
              <button 
                onClick={() => handleShare(msg)}
                title="Condividi link"
                className="p-2 bg-ohara-card border border-ohara-border text-zinc-500 hover:text-white hover:border-ohara-red-vivid rounded-lg transition-all"
              >
                {copiedId === `share-${msg.id}` ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
              </button>
            </div>
          )}

          <div className="markdown-body">
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mb-4 space-y-2">
                {msg.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-white/5 rounded-xl">
                    {att.mimeType.startsWith('image/') ? (
                      <img 
                        src={`data:${att.mimeType};base64,${att.data}`} 
                        alt={att.name} 
                        className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    ) : att.mimeType.startsWith('video/') ? (
                      <div className="w-12 h-12 bg-ohara-red-dark/20 rounded-lg flex items-center justify-center text-ohara-red-vivid">
                        <Video size={20} />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-ohara-red-dark/20 rounded-lg flex items-center justify-center text-ohara-red-vivid">
                        <FileText size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{att.name}</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{(att.data.length * 0.75 / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ReactMarkdown 
              remarkPlugins={[remarkMath, remarkGfm]} 
              rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
              components={components}
            >
              {displayContent}
            </ReactMarkdown>
          </div>

          {msg.citations && msg.citations.length > 0 && (
            <div className="mt-6 pt-4 border-t border-ohara-border">
              <div className="flex items-center gap-2 mb-3">
                <Quote size={12} className="text-ohara-red-vivid" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fonti Grounding</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {msg.citations.map((cite, i) => (
                  <a
                    key={i}
                    href={cite.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-ohara-border rounded-lg text-[10px] text-zinc-400 hover:text-ohara-red-vivid hover:border-ohara-red-dark transition-all"
                  >
                    <span className="truncate max-w-[150px]">{cite.title}</span>
                    <ExternalLink size={8} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Copy Button with Text */}
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mt-1`}>
          <button
            onClick={() => handleCopy(msg)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-ohara-red-vivid hover:bg-ohara-red-dark/10 transition-all"
          >
            {copiedId === `copy-${msg.id}` ? (
              <>
                <Check size={12} className="text-emerald-500" />
                <span className="text-emerald-500">Copiato</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

interface ChatComponentProps {
  messages: Message[];
  onSendMessage: (content: string, fileData?: FileData) => void;
  onCancel: () => void;
  onDeleteSession: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSaveItem: (title: string, content: string, citations: any[]) => void;
  isSaved: (title: string) => boolean;
  sessionTitle?: string;
}

export const ChatComponent = React.memo(({ 
  messages, 
  onSendMessage, 
  onCancel,
  onDeleteSession,
  isLoading, 
  error,
  onRetry,
  onSaveItem,
  isSaved,
  sessionTitle
}: ChatComponentProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle scroll visibility for "Scroll to Bottom" button
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Show button if we are more than 300px away from bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      setShowScrollBottom(!isNearBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll to bottom only when a NEW message from the user is added
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

  const handleCopy = React.useCallback((msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(`copy-${msg.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleShare = React.useCallback((msg: Message) => {
    const data = {
      title: msg.content.split('\n')[0].replace('#', '').trim() || 'OHARA Research',
      content: msg.content,
      citations: msg.citations || []
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}/share?d=${compressed}`;
    navigator.clipboard.writeText(url);
    setCopiedId(`share-${msg.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const components = React.useMemo(() => ({
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      
      if (!inline && language === 'recharts') {
        return <ChartRenderer content={String(children).replace(/\n$/, '')} />;
      }
      
      if (!inline && language === 'table') {
        return <TableRenderer content={String(children).replace(/\n$/, '')} />;
      }
      
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  }), []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-ohara-bg relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-ohara-red-dark/10 blur-[120px] pointer-events-none" />

      {/* Chat Header with Menu */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ohara-border bg-ohara-bg/40 backdrop-blur-md z-10">
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
        className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-6 relative min-h-0"
      >
        {/* Scroll to Bottom Button - Moved higher to avoid overlap with input */}
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={scrollToBottom}
              className="fixed bottom-44 right-10 z-20 p-3 bg-ohara-red-vivid text-white rounded-full shadow-2xl hover:bg-ohara-red-dark transition-all border border-white/20"
              title="Torna in fondo"
            >
              <ArrowDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        {messages.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 py-8">
            <div className="relative">
              <div className="w-16 h-16 bg-ohara-red-dark/10 rounded-2xl flex items-center justify-center border border-ohara-red-vivid/20 rotate-12 animate-pulse" />
              <div className="absolute inset-0 w-16 h-16 bg-ohara-red-dark/20 rounded-2xl flex items-center justify-center border border-ohara-red-vivid/40 -rotate-6 flex-shrink-0">
                <Bot className="text-ohara-red-vivid" size={28} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-mono font-bold text-white tracking-tighter">SISTEMA OHARA ATTIVO</h2>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                Pronto per l'analisi scientifica avanzata. <br/>
                Inserisci un quesito o carica un dataset per iniziare.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {[
                "Spiegami l'equazione di Schrödinger",
                "Cos'è l'effetto bystander?",
                "Meccanismo della reazione di Diels-Alder",
                "Ultimi paper su arXiv sulla materia oscura"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSendMessage(suggestion)}
                  className="p-3 bg-ohara-card border border-ohara-border rounded-xl text-xs text-zinc-400 hover:border-ohara-red-vivid hover:text-white transition-all text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageItem 
            key={msg.id}
            msg={msg}
            onSaveItem={onSaveItem}
            isSaved={isSaved}
            handleShare={handleShare}
            handleCopy={handleCopy}
            copiedId={copiedId}
            components={components}
          />
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

      <div className="p-3 lg:p-4 landscape:p-2 border-t border-ohara-border bg-ohara-bg z-10">
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
        <p className="text-[9px] text-center text-zinc-600 mt-2 uppercase tracking-widest landscape:hidden">
          OHARA può commettere errori. Verifica sempre le fonti originali.
        </p>
      </div>
    </div>
  );
});

// Optimized Input Component to prevent re-rendering the whole chat on every keystroke
const ChatInput = React.memo(({ onSendMessage, isLoading }: { onSendMessage: (content: string, fileData?: FileData) => void, isLoading: boolean }) => {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };
    requestAnimationFrame(resize);
  }, [input]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20000000) {
      console.warn('File troppo grande (max 20MB)');
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
          const MAX_DIM = 1024;
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

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      {selectedFile && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-3 p-2 bg-ohara-red-dark/10 border border-ohara-red-dark/20 rounded-2xl w-fit max-w-full"
        >
          {imagePreview && selectedFile.mimeType.startsWith('image/') ? (
            <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-ohara-red-vivid/40" />
          ) : selectedFile.mimeType.startsWith('video/') ? (
            <div className="w-10 h-10 bg-ohara-red-dark/20 rounded-lg flex items-center justify-center text-ohara-red-vivid">
              <Video size={18} />
            </div>
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

      <div className="relative flex items-end gap-2 bg-ohara-card border border-ohara-border rounded-xl p-1.5 focus-within:border-ohara-red-vivid focus-within:ring-1 focus-within:ring-ohara-red-vivid/30 transition-all">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-2 text-zinc-500 hover:text-ohara-red-vivid transition-colors disabled:opacity-50"
          title="Allega file"
        >
          <Paperclip size={18} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,application/pdf,text/*,video/*"
        />
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (!isLoading && (input.trim() || selectedFile)) {
                handleSubmit(e as any);
              }
            }
          }}
          placeholder={selectedFile ? "Aggiungi un commento..." : "Interroga OHARA... (Cmd+Invio per inviare)"}
          disabled={isLoading}
          className="flex-1 bg-transparent py-2 px-1 text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none disabled:opacity-50 min-h-[38px] max-h-[150px] overflow-y-auto text-sm"
        />
        <button
          type="submit"
          disabled={(!input.trim() && !selectedFile) || isLoading}
          className="p-2 bg-ohara-red-dark text-white rounded-lg hover:bg-ohara-red-vivid transition-colors disabled:opacity-50 disabled:bg-zinc-800"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
});
