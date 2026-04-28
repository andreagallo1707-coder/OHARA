import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Label
} from 'recharts';
import { Maximize2, X, AlertCircle, Download, LineChart as LineIcon, BarChart as BarIcon, AreaChart as AreaIcon, PieChart as PieIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChartData {
  type: 'line' | 'bar' | 'area' | 'pie';
  title?: string;
  data: any[];
  xAxis?: string;
  xLabel?: string;
  yLabel?: string;
  keys: string[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ChartRenderer = React.memo(({ content }: { content: string }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [activeType, setActiveType] = useState<'line' | 'bar' | 'area' | 'pie' | null>(null);

  const downloadData = (config: ChartData) => {
    try {
      const headers = [config.xAxis || 'name', ...config.keys];
      const csv = [
        headers.join(','),
        ...config.data.map(row => headers.map(h => row[h]).join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `${config.title || 'chart-data'}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Impossibile scaricare i dati');
    }
  };

  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
      // Small delay to allow modal animation to start and container to have dimensions
      const timer = setTimeout(() => setModalReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
      setModalReady(false);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMaximized]);

  const [showSource, setShowSource] = useState(false);

  const sanitizeJson = (str: string) => {
    try {
      // Remove markdown code blocks if present
      let cleaned = str.replace(/```(?:json|recharts)?\n?|```/g, '').trim();
      
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
      // Fix single quotes to double quotes
      cleaned = cleaned.replace(/'([^']*)':/g, '"$1":'); // Fix keys
      cleaned = cleaned.replace(/: '([^']*)'/g, ': "$1"'); // Fix values
      // Fix common typos in keys
      cleaned = cleaned.replace(/"xAxis"/g, '"xAxis"').replace(/"xAxies"/g, '"xAxis"');
      cleaned = cleaned.replace(/"yAxis"/g, '"yAxis"').replace(/"yAxies"/g, '"yAxis"');
      
      return cleaned;
    } catch (e) {
      return str;
    }
  };

  try {
    const sanitizedContent = sanitizeJson(content);
    const config: ChartData = JSON.parse(sanitizedContent);
    
    if (!config.data || !Array.isArray(config.data) || config.data.length === 0) {
      throw new Error("Dati del grafico mancanti o vuoti.");
    }

    if (!config.keys || !Array.isArray(config.keys)) {
      throw new Error("Configurazione chiavi non valida.");
    }
    
    const currentType = activeType || config.type;

    const renderChart = (isModal = false) => {
      const commonProps = {
        data: config.data,
        margin: { 
          top: 20, 
          right: isModal ? 40 : 30, 
          left: isModal ? 80 : 60, 
          bottom: isModal ? 80 : 60 
        }
      };

      const renderXAxis = () => (
        <XAxis 
          dataKey={config.xAxis} 
          stroke="#9ca3af" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          height={60}
          dy={10}
        >
          {config.xLabel && (
            <Label 
              value={config.xLabel} 
              offset={-10} 
              position="insideBottom" 
              fill="#9ca3af" 
              fontSize={isModal ? 14 : 11} 
              fontWeight="bold" 
              style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
            />
          )}
        </XAxis>
      );

      const renderYAxis = () => (
        <YAxis 
          stroke="#9ca3af" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          width={isModal ? 100 : 70}
          dx={-10}
        >
          {config.yLabel && (
            <Label 
              value={config.yLabel} 
              angle={-90} 
              position="insideLeft" 
              offset={-10}
              style={{ textAnchor: 'middle', fill: '#9ca3af', fontSize: isModal ? 14 : 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
            />
          )}
        </YAxis>
      );

      const renderTooltip = () => (
        <Tooltip 
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          itemStyle={{ color: '#fff', fontSize: '12px' }}
          cursor={{ stroke: '#374151', strokeWidth: 1 }}
        />
      );

      switch (currentType) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              <Legend verticalAlign="top" height={36} />
              {config.keys.map((key, index) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[index % COLORS.length]} 
                  strokeWidth={isModal ? 3 : 2}
                  dot={{ r: isModal ? 5 : 3, fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: isModal ? 8 : 6, strokeWidth: 0 }}
                  animationDuration={500}
                  isAnimationActive={true}
                />
              ))}
            </LineChart>
          );
        case 'bar':
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              <Legend verticalAlign="top" height={36} />
              {config.keys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} animationDuration={500} isAnimationActive={true} />
              ))}
            </BarChart>
          );
        case 'area':
          return (
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              {renderXAxis()}
              {renderYAxis()}
              {renderTooltip()}
              <Legend verticalAlign="top" height={36} />
              {config.keys.map((key, index) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[index % COLORS.length]} 
                  fill={COLORS[index % COLORS.length]} 
                  fillOpacity={0.2} 
                  strokeWidth={2}
                  animationDuration={500}
                  isAnimationActive={true}
                />
              ))}
            </AreaChart>
          );
        case 'pie':
          return (
            <PieChart>
              <Pie
                data={config.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={isModal ? 150 : 80}
                fill="#8884d8"
                dataKey={config.keys[0]}
                animationDuration={500}
                isAnimationActive={true}
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {renderTooltip()}
              <Legend />
            </PieChart>
          );
        default:
          return <div className="text-red-400">Tipo di grafico non supportato: {currentType}</div>;
      }
    };

    return (
      <>
        <div className="group relative my-8 p-6 bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden transition-all hover:border-ohara-red-vivid/30">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">
              {config.title || 'Visualizzazione Dati'}
            </h4>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => downloadData(config)}
                className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
                title="Scarica dati CSV"
              >
                <Download size={16} />
              </button>
              <button 
                onClick={() => setIsMaximized(true)}
                className="p-2 bg-white/5 hover:bg-ohara-red-vivid/20 text-zinc-400 hover:text-ohara-red-vivid rounded-xl transition-all"
                title="Ingrandisci grafico"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="h-[320px] w-full cursor-pointer overflow-x-auto" onClick={() => setIsMaximized(true)}>
            <div className="min-w-[400px] h-full">
              <ResponsiveContainer width="100%" height="100%" key={`minimized-${content.length}`}>
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>

          {(config.xLabel || config.yLabel) && (
            <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {config.xLabel && <span>X: {config.xLabel}</span>}
              {config.yLabel && <span>Y: {config.yLabel}</span>}
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
                className="relative w-full max-w-6xl h-full lg:aspect-video bg-zinc-900 border border-white/10 rounded-2xl lg:rounded-[32px] p-3 lg:p-12 shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2 lg:mb-8">
                  <div className="min-w-0">
                    <h3 className="text-lg lg:text-2xl font-bold text-white truncate">{config.title || 'Analisi Dati'}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-[10px] lg:text-sm text-zinc-500 font-mono uppercase tracking-widest">Visualizzazione Dettagliata</p>
                      <div className="hidden sm:flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                        <button 
                          onClick={() => setActiveType('line')}
                          className={`p-1.5 rounded-md transition-all ${currentType === 'line' ? 'bg-ohara-red-vivid text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Linea"
                        >
                          <LineIcon size={14} />
                        </button>
                        <button 
                          onClick={() => setActiveType('bar')}
                          className={`p-1.5 rounded-md transition-all ${currentType === 'bar' ? 'bg-ohara-red-vivid text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Istogramma"
                        >
                          <BarIcon size={14} />
                        </button>
                        <button 
                          onClick={() => setActiveType('area')}
                          className={`p-1.5 rounded-md transition-all ${currentType === 'area' ? 'bg-ohara-red-vivid text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Area"
                        >
                          <AreaIcon size={14} />
                        </button>
                        <button 
                          onClick={() => setActiveType('pie')}
                          className={`p-1.5 rounded-md transition-all ${currentType === 'pie' ? 'bg-ohara-red-vivid text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Torta"
                        >
                          <PieIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => downloadData(config)}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-white/10"
                    >
                      <Download size={14} />
                      Export CSV
                    </button>
                    <button 
                      onClick={() => setIsMaximized(false)}
                      className="p-2 lg:p-3 bg-ohara-red-vivid/10 hover:bg-ohara-red-vivid/20 text-ohara-red-vivid rounded-xl lg:rounded-2xl transition-all flex-shrink-0 border border-ohara-red-vivid/20"
                    >
                      <X className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-0 bg-black/20 rounded-2xl p-4 overflow-x-auto">
                  {modalReady ? (
                    <div className="min-w-[800px] h-full">
                      <ResponsiveContainer width="100%" height="100%" key="maximized-chart">
                        {renderChart(true)}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 border-4 border-ohara-red-vivid border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
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
