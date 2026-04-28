import React, { useState, useEffect } from 'react';
import { Maximize2, X, Table as TableIcon, Download, Search, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TableData {
  title?: string;
  headers: string[];
  rows: any[][];
  summary?: string;
}

export const TableRenderer = React.memo(({ content }: { content: string }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: number; direction: 'asc' | 'desc' } | null>(null);

  const [showSource, setShowSource] = useState(false);

  const [modalReady, setModalReady] = useState(false);

  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => setModalReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
      setModalReady(false);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMaximized]);

  const sanitizeJson = (str: string) => {
    try {
      // Remove markdown code blocks if present
      let cleaned = str.replace(/```(?:json|table)?\n?|```/g, '').trim();
      
      // If it's not starting with { or [, it might have preamble text
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const firstBrace = cleaned.indexOf('{');
        const firstBracket = cleaned.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        if (start !== -1) {
          cleaned = cleaned.substring(start);
        }
      }
      
      // If it has trailing text after the last } or ]
      if (cleaned.endsWith('}') || cleaned.endsWith(']')) {
        // Already clean enough at the end
      } else {
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);
        if (end !== -1) {
          cleaned = cleaned.substring(0, end + 1);
        }
      }

      // Remove comments
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove trailing commas in arrays and objects
      cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');
      // Fix unquoted keys (common AI mistake)
      cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
      // Fix single quotes to double quotes (but be careful with quotes inside strings)
      // A simple replace might be too risky, but let's try to fix basic cases
      cleaned = cleaned.replace(/'([^']*)':/g, '"$1":'); // Fix keys
      cleaned = cleaned.replace(/: '([^']*)'/g, ': "$1"'); // Fix values
      
      return cleaned;
    } catch (e) {
      return str;
    }
  };

  const copyToClipboard = () => {
    try {
      const sanitizedContent = sanitizeJson(content);
      const config: TableData = JSON.parse(sanitizedContent);
      const csv = [
        config.headers.join(','),
        ...config.rows.map(row => row.join(','))
      ].join('\n');
      navigator.clipboard.writeText(csv);
      alert('Dati copiati in formato CSV');
    } catch (e) {
      alert('Impossibile copiare i dati');
    }
  };

  try {
    const sanitizedContent = sanitizeJson(content);
    const config: TableData = JSON.parse(sanitizedContent);

    if (!config.headers || !config.rows || !Array.isArray(config.headers) || !Array.isArray(config.rows)) {
      throw new Error("Dati della tabella mancanti o non validi.");
    }

    const sortedRows = [...config.rows].sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      const valA = a[key];
      const valB = b[key];
      
      if (valA === valB) return 0;
      const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? comparison : -comparison;
    });

    const filteredRows = sortedRows.filter(row => 
      row.some(cell => 
        String(cell).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    const handleSort = (index: number) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === index && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key: index, direction });
    };

    const renderTable = (isModal = false) => (
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10">
              {config.headers.map((header, i) => (
                <th 
                  key={i} 
                  onClick={() => handleSort(i)}
                  className={`p-4 text-[10px] lg:text-xs font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap bg-zinc-900/50 cursor-pointer hover:bg-zinc-800/80 transition-colors relative group/header`}
                >
                  <div className="flex items-center gap-2">
                    {header}
                    {sortConfig?.key === i && (
                      <span className="text-ohara-red-vivid">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(isModal ? filteredRows : sortedRows.slice(0, 5)).map((row, i) => (
              <tr 
                key={i} 
                className="hover:bg-white/[0.02] transition-colors group"
              >
                {row.map((cell, j) => (
                  <td 
                    key={j} 
                    className={`p-4 text-xs lg:text-sm text-zinc-300 font-medium ${isModal ? '' : 'max-w-[200px] truncate'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!isModal && config.rows.length > 5 && (
          <div className="p-4 text-center border-t border-white/5 bg-zinc-900/20">
            <button 
              onClick={() => setIsMaximized(true)}
              className="text-[10px] font-bold text-ohara-red-vivid hover:text-white transition-all uppercase tracking-widest"
            >
              Mostra altre {config.rows.length - 5} righe
            </button>
          </div>
        )}
      </div>
    );

    return (
      <>
        <div className="group relative my-8 bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-ohara-red-vivid/30">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ohara-red-vivid/10 rounded-xl">
                <TableIcon size={16} className="text-ohara-red-vivid" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">
                {config.title || 'Tabella Dati'}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={copyToClipboard}
                className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
                title="Copia dati CSV"
              >
                <Download size={16} />
              </button>
              <button 
                onClick={() => setIsMaximized(true)}
                className="p-2 bg-ohara-red-vivid/10 hover:bg-ohara-red-vivid/20 text-ohara-red-vivid rounded-xl transition-all border border-ohara-red-vivid/20"
                title="Ingrandisci tabella"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="w-full">
            {renderTable(false)}
          </div>

          {config.summary && (
            <div className="p-4 bg-black/20 border-t border-white/5 text-[10px] text-zinc-500 italic leading-relaxed">
              {config.summary}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isMaximized && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-12 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsMaximized(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-6xl h-full bg-zinc-900 border border-white/10 rounded-2xl lg:rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 lg:p-10 border-b border-white/5 bg-zinc-900/50">
                  <div className="min-w-0">
                    <h3 className="text-lg lg:text-2xl font-bold text-white truncate">{config.title || 'Analisi Tabellare'}</h3>
                    <p className="text-[10px] lg:text-sm text-zinc-500 font-mono uppercase tracking-widest">Database Dettagliato • {config.rows.length} record</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus-within:border-ohara-red-vivid/50 transition-all">
                      <Search size={16} className="text-zinc-500 mr-3" />
                      <input 
                        type="text"
                        placeholder="Cerca nella tabella..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none text-sm text-white placeholder-zinc-600 focus:ring-0 w-48"
                      />
                    </div>
                    <button 
                      onClick={() => setIsMaximized(false)}
                      className="p-2 lg:p-3 bg-ohara-red-vivid/10 hover:bg-ohara-red-vivid/20 text-ohara-red-vivid rounded-xl lg:rounded-2xl transition-all flex-shrink-0 border border-ohara-red-vivid/20"
                    >
                      <X className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-0 lg:p-4 bg-black/20">
                  {modalReady ? (
                    <div className="min-w-full inline-block align-middle">
                      {renderTable(true)}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-ohara-red-vivid border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {config.summary && (
                  <div className="p-6 bg-zinc-900/50 border-t border-white/5 text-xs text-zinc-400 italic">
                    <strong>Nota:</strong> {config.summary}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  } catch (e) {
    return (
      <div className="my-4 p-6 bg-ohara-card border border-ohara-red-vivid/20 rounded-3xl text-center space-y-4">
        <div className="w-12 h-12 bg-ohara-red-dark/10 rounded-2xl flex items-center justify-center mx-auto text-ohara-red-vivid">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-1">Errore di Visualizzazione</h4>
          <p className="text-xs text-zinc-500">{e instanceof Error ? e.message : 'JSON non valido'}</p>
        </div>
        <button 
          onClick={() => setShowSource(!showSource)}
          className="px-4 py-2 bg-zinc-900 border border-ohara-border text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-all"
        >
          {showSource ? 'Nascondi Sorgente' : 'Mostra Sorgente JSON'}
        </button>
        {showSource && (
          <pre className="mt-4 p-4 bg-black/40 rounded-xl text-[10px] text-left overflow-x-auto font-mono text-zinc-500 border border-ohara-border">
            {content}
          </pre>
        )}
      </div>
    );
  }
});
