import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OHARA ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-8 p-10 bg-zinc-900/50 border border-ohara-red-vivid/20 rounded-[32px] backdrop-blur-xl">
            <div className="w-20 h-20 bg-ohara-red-vivid/10 rounded-3xl flex items-center justify-center mx-auto text-ohara-red-vivid animate-pulse">
              <AlertCircle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white uppercase tracking-tighter">Errore di Sistema</h1>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                Si è verificato un errore imprevisto durante il rendering. 
                OHARA ha isolato il problema per prevenire un crash totale.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-ohara-red-vivid/70 uppercase tracking-widest mb-2 font-bold">Dettagli Tecnici</p>
                <p className="text-[11px] font-mono text-zinc-400 break-words leading-relaxed">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-ohara-red-vivid hover:bg-ohara-red-vivid/90 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-ohara-red-vivid/20"
            >
              <RefreshCw size={16} />
              Riavvia OHARA
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
