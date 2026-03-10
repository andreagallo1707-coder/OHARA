import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, ExternalLink, Newspaper, AlertCircle, TrendingUp, BookOpen, Globe, Zap, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini for Discovery
const API_KEY = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: API_KEY || '' });

const hardcodedAPS = [
  {title: 'Quantum entanglement in macroscopic systems', summary: 'Researchers have demonstrated entanglement between due mechanical oscillators, pushing the boundaries of quantum mechanics.', link: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.121.223604', source: 'APS'},
  {title: 'Black hole mergers and gravitational waves', summary: 'LIGO and Virgo collaborations report new detections of binary black hole mergers with unprecedented precision.', link: 'https://journals.aps.org/prd/abstract/10.1103/PhysRevD.100.064003', source: 'APS'},
  {title: 'Superconductivity in twisted bilayer graphene', summary: 'A new study reveals the complex phase diagram of moiré materials, showing tunable superconducting states.', link: 'https://journals.aps.org/prb/abstract/10.1103/PhysRevB.98.220504', source: 'APS'},
  {title: 'Topological insulators and quantum computing', summary: 'Discovery of new topological phases could lead to more stable qubits for future quantum computers.', link: 'https://journals.aps.org/prx/abstract/10.1103/PhysRevX.9.011010', source: 'APS'},
  {title: 'Dark matter search with liquid xenon detectors', summary: 'The latest results from the LUX-ZEPLIN experiment set new limits on WIMP-nucleon cross sections.', link: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.122.131301', source: 'APS'},
  {title: 'Neural networks for fluid dynamics', summary: 'Machine learning models are now capable of simulating complex turbulent flows with high fidelity.', link: 'https://journals.aps.org/prfluids/abstract/10.1103/PhysRevFluids.4.100501', source: 'APS'},
  {title: 'Quantum thermodynamics of small systems', summary: 'Experimental verification of fluctuation theorems in single-molecule junctions.', link: 'https://journals.aps.org/pre/abstract/10.1103/PhysRevE.99.042101', source: 'APS'},
  {title: 'High-energy neutrino astronomy', summary: 'IceCube observatory identifies a new source of extragalactic neutrinos associated with a blazar.', link: 'https://journals.aps.org/prd/abstract/10.1103/PhysRevD.99.063007', source: 'APS'},
  {title: 'Photonics in 2D materials', summary: 'Integration of transition metal dichalcogenides with silicon photonics for ultra-fast communication.', link: 'https://journals.aps.org/prapplied/abstract/10.1103/PhysRevApplied.11.044001', source: 'APS'},
  {title: 'Muon g-2 experiment results', summary: 'New measurements of the muon magnetic moment continue to show tension with the Standard Model.', link: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.126.141801', source: 'APS'},
  {title: 'JWST reveals early galaxy formation', summary: 'The James Webb Space Telescope has identified galaxies that formed just 300 million years after the Big Bang.', link: 'https://www.nasa.gov/mission_pages/webb/main/index.html', source: 'NASA'},
  {title: 'CRISPR gene editing for rare diseases', summary: 'New clinical trials show promising results for treating sickle cell anemia using CRISPR-Cas9 technology.', link: 'https://www.nature.com/articles/d41586-023-03303-z', source: 'Nature'},
  {title: 'Fusion energy breakthrough at NIF', summary: 'Scientists achieve net energy gain in a fusion reaction for the second time, improving efficiency.', link: 'https://www.scientificamerican.com/article/nuclear-fusion-breakthrough-what-does-it-mean/', source: 'Scientific American'},
  {title: 'AI models surpassing human benchmarks', summary: 'Large language models are now outperforming humans in complex reasoning and creative writing tasks.', link: 'https://technologyreview.com', source: 'MIT Tech Review'},
  {title: 'Microplastics found in human blood', summary: 'A groundbreaking study detects microplastic particles in the human bloodstream for the first time.', link: 'https://www.theguardian.com/environment/2022/mar/24/microplastics-found-in-human-blood-for-first-time', source: 'The Guardian Science'}
];

const parseArxiv = (xml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  return Array.from(doc.querySelectorAll('entry')).map(e => {
    const title = e.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const summary = e.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    
    // arXiv links: rel="alternate" is the abstract page, type="text/html" is also good
    const links = Array.from(e.querySelectorAll('link'));
    let absLink = links.find(l => l.getAttribute('rel') === 'alternate')?.getAttribute('href') || 
                  links.find(l => l.getAttribute('type') === 'text/html')?.getAttribute('href') ||
                  links[0]?.getAttribute('href') || '';
    
    // Ensure it's an absolute URL
    if (absLink && absLink.startsWith('/')) {
      absLink = `https://arxiv.org${absLink}`;
    }

    return {
      id: 'arxiv-' + Math.random().toString(36).substr(2, 9),
      title,
      summary: summary.length > 400 ? summary.slice(0, 400) + '...' : summary,
      link: absLink,
      source: 'arXiv',
      published: e.querySelector('published')?.textContent || new Date().toISOString()
    };
  }).filter(a => a.title && a.summary && a.link && a.link !== '#');
};

const parseRSS = (xml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  return Array.from(doc.querySelectorAll('item')).map(e => {
    const title = e.querySelector('title')?.textContent || '';
    const summary = e.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || '';
    const link = e.querySelector('link')?.textContent || e.querySelector('link')?.getAttribute('href') || '';
    
    return {
      id: 'focus-' + Math.random().toString(36).substr(2, 9),
      title,
      summary: summary.length > 300 ? summary.slice(0, 300) + '...' : summary,
      link,
      source: 'Focus.it',
      published: e.querySelector('pubDate')?.textContent || new Date().toISOString()
    };
  }).filter(a => a.title && a.summary && a.link);
};

interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  link: string;
  published?: string;
}

interface ResearchBoardProps {
  onChatWithAI?: (message: string) => void;
}

export const ResearchBoard: React.FC<ResearchBoardProps> = ({ onChatWithAI }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'discovery' | 'search'>('discovery');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);

  const loadArticles = useCallback(async () => {
    setIsSearching(true);
    setError(null);
    setViewMode('discovery');
    
    const API_KEY = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

    try {
      // Parallelize fetches for speed
      const fetchPromises = [
        // 1. arXiv - Fetch more results for better variety
        (async () => {
          try {
            const cats = ['physics', 'astro-ph', 'cs.AI', 'q-bio', 'math', 'quant-ph', 'stat.ML'];
            const randomCat = cats[Math.floor(Math.random() * cats.length)];
            const res = await fetch(`https://export.arxiv.org/api/query?search_query=cat:${randomCat}&max_results=20&sortBy=submittedDate&sortOrder=descending`);
            if (!res.ok) return [];
            const xml = await res.text();
            return parseArxiv(xml);
          } catch (e) { return []; }
        })(),

        // 2. NASA APOD
        (async () => {
          try {
            const res = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
            if (!res.ok) return [];
            const data = await res.json();
            return [{
              id: 'nasa-' + Date.now(),
              title: data.title || '',
              summary: data.explanation || '',
              link: data.hdurl || data.url || '',
              source: 'NASA',
              published: data.date
            }].filter(a => a.title && a.summary && a.link);
          } catch (e) { return []; }
        })(),

        // 3. Focus.it RSS
        (async () => {
          try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.focus.it/rss/scienza.xml')}`);
            if (!res.ok) return [];
            const data = await res.json();
            return parseRSS(data.contents);
          } catch (e) { return []; }
        })(),

        // 4. APS Physics & Curated - Always include some from the curated list
        Promise.resolve(
          hardcodedAPS
            .sort(() => Math.random() - 0.5)
            .slice(0, 8)
            .map(a => ({ ...a, id: 'curated-' + Math.random().toString(36).substr(2, 9), published: new Date().toISOString() }))
        ),

        // 5. Gemini Discovery - Targeted prompt for high quality
        (async () => {
          if (!API_KEY) {
            console.warn("Gemini API Key missing for Discovery");
            return [];
          }
          try {
            const model = "gemini-3-flash-preview";
            const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
            const prompt = `Genera 10 articoli scientifici RECENTISSIMI (fino a oggi, ${today}) e REALI.
            Fonti obbligatorie: Nature, Science, MIT Technology Review, Scientific American.
            REQUISITI:
            - Titoli e riassunti accurati in ITALIANO.
            - URL REALI e FUNZIONANTI (non inventati).
            - Argomenti vari: Fisica, AI, Spazio, Biologia, Medicina.
            Restituisci un array JSON di oggetti con: id, title, summary, source, link, published.`;
            
            const genAIResponse = await genAI.models.generateContent({
              model,
              contents: prompt,
              config: { responseMimeType: "application/json" }
            });
            const results = JSON.parse(genAIResponse.text);
            const items = Array.isArray(results) ? results : (results.articles || results.results || []);
            return items
              .filter((a: any) => a.title && a.summary && a.link)
              .map((a: any, i: number) => ({
                ...a,
                id: `discovery-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`
              }));
          } catch (e) { return []; }
        })()
      ];

      const results = await Promise.allSettled(fetchPromises);
      const allArticles = results
        .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // Deduplicate by title and filter out any malformed entries
      const uniqueArticles = Array.from(new Map(
        allArticles
          .filter(a => {
            const hasTitle = a.title && a.title.trim().length > 0;
            const hasSummary = a.summary && a.summary.trim().length > 0;
            const hasValidLink = a.link && a.link.startsWith('http') && a.link !== '#';
            return hasTitle && hasSummary && hasValidLink;
          })
          .map(a => [a.title.toLowerCase().trim(), a])
      ).values());

      const combined = uniqueArticles.sort(() => Math.random() - 0.5);
      
      if (combined.length === 0) {
        const fallback = hardcodedAPS.map(a => ({ ...a, id: `fallback-${Math.random().toString(36).substr(2, 9)}` }));
        setArticles(fallback);
      } else {
        setArticles(combined);
        const now = Date.now();
        setLastRefreshTime(now);
        // Persist for auto-refresh logic
        localStorage.setItem('ohara_cached_articles', JSON.stringify(combined));
        localStorage.setItem('ohara_last_refresh', now.toString());
      }
    } catch (err) {
      console.error("Load articles error:", err);
      setError("Errore nel caricamento delle fonti.");
    } finally {
      setIsSearching(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const lastRefresh = localStorage.getItem('ohara_last_refresh');
    const cachedArticles = localStorage.getItem('ohara_cached_articles');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (!lastRefresh || !cachedArticles || (now - parseInt(lastRefresh)) > twentyFourHours) {
      loadArticles();
    } else {
      try {
        setArticles(JSON.parse(cachedArticles));
        setLastRefreshTime(parseInt(lastRefresh));
        setIsInitialLoading(false);
      } catch (e) {
        loadArticles();
      }
    }

    // Auto-refresh check every hour
    const interval = setInterval(() => {
      const currentLastRefresh = localStorage.getItem('ohara_last_refresh');
      const currentTime = Date.now();
      if (currentLastRefresh && (currentTime - parseInt(currentLastRefresh)) > twentyFourHours) {
        console.log("Auto-refreshing articles (24h limit reached)");
        loadArticles();
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadArticles]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      loadArticles();
      return;
    }
    
    setIsSearching(true);
    setViewMode('search');
    setError(null);
    
    try {
      const model = "gemini-3-flash-preview";
      const prompt = `Cerca articoli scientifici, news e paper riguardanti: "${query}". 
      Includi risultati da Nature, Science, arXiv, NASA e altre fonti accademiche.
      Traduci titoli e riassunti in italiano.
      Restituisci un array JSON di oggetti con: id, title, summary, source, link, published.`;

      let genAIResponse;
      try {
        genAIResponse = await genAI.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json"
          }
        });
      } catch (toolError: any) {
        console.warn("Search failed with tools, retrying without:", toolError);
        genAIResponse = await genAI.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
      }

      const results = JSON.parse(genAIResponse.text);
      const searchResults = (Array.isArray(results) ? results : (results.articles || results.results || []))
        .filter((a: any) => a.title && a.summary && a.link && a.link !== '#')
        .map((a: any, i: number) => ({
          ...a,
          id: `search-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`
        }));
      
      if (searchResults.length === 0) {
        setError("Nessun risultato trovato per questa ricerca.");
      } else {
        setArticles(searchResults);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Errore durante la ricerca. Riprova tra poco.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = () => {
    setSearchQuery('');
    loadArticles();
  };

  const displayArticles = articles;

  if (isInitialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <RefreshCw size={48} className="text-ohara-red-vivid animate-spin" />
            <div className="absolute inset-0 blur-xl bg-ohara-red-vivid/20 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-ohara-red-vivid font-mono text-sm uppercase tracking-[0.4em] font-black">OHARA DISCOVERY</p>
            <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Sincronizzazione fonti globali...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black overflow-hidden font-sans">
      {/* Search Header - Perplexity Style */}
      <div className="px-6 pt-12 pb-8 border-b border-white/5 bg-gradient-to-b from-zinc-950 to-black sticky top-0 z-30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-ohara-red-vivid rounded-lg flex items-center justify-center shadow-lg shadow-ohara-red-vivid/20">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Discovery</h1>
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-ohara-red-vivid/5 blur-2xl group-focus-within:bg-ohara-red-vivid/10 transition-all rounded-3xl" />
            <div className="relative flex items-center bg-zinc-900/80 border border-white/10 rounded-2xl p-1 focus-within:border-ohara-red-vivid/40 transition-all backdrop-blur-xl">
              <Search className="ml-4 text-zinc-500" size={20} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chiedi qualsiasi cosa sulla scienza o cerca articoli..."
                className="flex-1 bg-transparent border-none py-4 px-4 text-white placeholder-zinc-600 focus:ring-0 text-lg"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="mr-1 px-6 py-3 bg-ohara-red-vivid hover:bg-ohara-red-dark text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? <RefreshCw size={18} className="animate-spin" /> : <TrendingUp size={18} />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Content Feed */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              {viewMode === 'discovery' ? (
                <>
                  <TrendingUp size={16} className="text-ohara-red-vivid" />
                  <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">In Evidenza Oggi</h2>
                </>
              ) : (
                <>
                  <Search size={16} className="text-ohara-red-vivid" />
                  <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Risultati Ricerca</h2>
                </>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={handleRefresh}
                className="text-[10px] font-bold text-zinc-600 hover:text-ohara-red-vivid transition-colors uppercase tracking-widest flex items-center gap-2"
              >
                <RefreshCw size={12} className={isSearching ? 'animate-spin' : ''} />
                Aggiorna Feed
              </button>
              {lastRefreshTime && (
                <span className="text-[9px] text-zinc-700 uppercase tracking-tighter">
                  Ultimo aggiornamento: {new Date(lastRefreshTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-ohara-red-vivid/10 border border-ohara-red-vivid/20 rounded-2xl flex items-center gap-3 text-ohara-red-vivid"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}

            {isSearching ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-6"
              >
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-zinc-900/50 rounded-3xl animate-pulse border border-white/5" />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 gap-6"
              >
                {displayArticles.length > 0 ? (
                  displayArticles.map((article, idx) => (
                    <motion.div 
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group bg-zinc-900/30 border border-white/5 rounded-3xl p-6 hover:border-ohara-red-vivid/30 hover:bg-zinc-900/60 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                            {article.source.toLowerCase().includes('nature') ? <Globe size={12} className="text-emerald-400" /> : 
                             article.source.toLowerCase().includes('science') ? <Zap size={12} className="text-blue-400" /> :
                             <BookOpen size={12} className="text-ohara-red-vivid" />}
                          </div>
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{article.source}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {article.published ? new Date(article.published).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : 'Recente'}
                          </span>
                        </div>
                        <a 
                          href={article.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-zinc-950 border border-white/5 rounded-xl text-zinc-500 hover:text-white hover:border-ohara-red-vivid transition-all"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-3 group-hover:text-ohara-red-vivid transition-colors leading-snug">
                        {article.title}
                      </h3>
                      
                      <p className="text-zinc-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                        {article.summary}
                      </p>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setSelectedArticle(article)}
                          className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-white/5"
                        >
                          Leggi Abstract
                        </button>
                        <button 
                          onClick={() => onChatWithAI?.(`Parlami di questo articolo: "${article.title}". Fonte: ${article.source}. Riassunto: ${article.summary}`)}
                          className="px-4 py-2.5 bg-ohara-red-vivid/10 hover:bg-ohara-red-vivid/20 text-ohara-red-vivid text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border border-ohara-red-vivid/20 flex items-center gap-2"
                        >
                          <MessageSquare size={14} />
                          Chiedi a Ohara
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-24 bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
                    <AlertCircle size={32} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-bold">Nessun articolo trovato.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Abstract Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ohara-red-vivid flex items-center justify-center">
                    <BookOpen size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Abstract Articolo</h2>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{selectedArticle.source}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <h3 className="text-2xl font-bold text-white mb-6 leading-tight">
                  {selectedArticle.title}
                </h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-zinc-300 leading-relaxed text-lg whitespace-pre-wrap">
                    {selectedArticle.summary}
                  </p>
                </div>
                
                {selectedArticle.published && (
                  <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4 text-zinc-500 text-xs font-mono">
                    <span className="uppercase tracking-widest">Pubblicato:</span>
                    <span>{new Date(selectedArticle.published).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-zinc-950 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    onChatWithAI?.(`Analizza questo articolo scientifico: "${selectedArticle.title}". Riassunto: ${selectedArticle.summary}. Fonte: ${selectedArticle.source}. Quali sono le implicazioni principali?`);
                    setSelectedArticle(null);
                  }}
                  className="flex-1 py-4 bg-ohara-red-vivid hover:bg-ohara-red-dark text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-ohara-red-vivid/20"
                >
                  <MessageSquare size={20} />
                  Approfondisci con Ohara
                </button>
                <a 
                  href={selectedArticle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 border border-white/5"
                >
                  <ExternalLink size={20} />
                  Fonte Originale
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
