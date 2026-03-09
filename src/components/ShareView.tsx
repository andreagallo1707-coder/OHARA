import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ExternalLink, Quote, ArrowLeft, Sparkles } from 'lucide-react';
import LZString from 'lz-string';

export const ShareView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dataParam = searchParams.get('d');

  if (!dataParam) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-ohara-bg text-zinc-400 p-8">
        <h1 className="text-2xl font-mono text-ohara-red-vivid mb-4">Link non valido</h1>
        <Link to="/" className="flex items-center gap-2 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Torna alla Home
        </Link>
      </div>
    );
  }

  let data: any = null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
    data = JSON.parse(decompressed || '{}');
  } catch (e) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-ohara-bg text-zinc-400 p-8">
        <h1 className="text-2xl font-mono text-ohara-red-vivid mb-4">Errore caricamento dati</h1>
        <Link to="/" className="flex items-center gap-2 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Torna alla Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ohara-bg text-zinc-300 p-4 lg:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-ohara-red-dark rounded-lg flex items-center justify-center border border-ohara-red-vivid">
              <span className="text-white font-mono font-bold text-xl">Ω</span>
            </div>
            <h1 className="text-2xl font-mono font-bold tracking-tighter text-ohara-red-vivid group-hover:text-white transition-colors">OHARA</h1>
          </Link>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            <Sparkles size={12} className="text-ohara-red-vivid" />
            Shared Research
          </div>
        </div>

        <div className="bg-ohara-card border border-ohara-border rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ohara-red-dark/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="markdown-body relative z-10">
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
            >
              {data.content}
            </ReactMarkdown>
          </div>

          {data.citations && data.citations.length > 0 && (
            <div className="mt-12 pt-8 border-t border-ohara-border relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Quote size={16} className="text-ohara-red-vivid" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Fonti Scientifiche</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.citations.map((cite: any, i: number) => (
                  <a
                    key={i}
                    href={cite.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-zinc-900 border border-ohara-border rounded-2xl hover:border-ohara-red-dark transition-all group"
                  >
                    <span className="text-sm text-zinc-400 group-hover:text-white truncate pr-4">{cite.title}</span>
                    <ExternalLink size={14} className="text-zinc-600 group-hover:text-ohara-red-vivid" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-zinc-600 text-sm mb-6">Vuoi approfondire questa ricerca?</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-ohara-red-dark hover:bg-ohara-red-vivid text-white font-bold rounded-2xl transition-all shadow-lg shadow-ohara-red-dark/20"
          >
            Inizia una nuova chat con OHARA
          </Link>
        </div>
      </div>
    </div>
  );
};
