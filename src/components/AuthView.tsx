import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Chrome, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthView: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, isConfigured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Errore durante l'autenticazione");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Errore con Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ohara-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-ohara-red-dark/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-ohara-card border border-ohara-border p-8 lg:p-10 rounded-[2.5rem] shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-ohara-red-dark rounded-2xl flex items-center justify-center mx-auto border border-ohara-red-vivid mb-6 shadow-lg shadow-ohara-red-dark/20">
            <span className="text-white font-mono font-bold text-3xl">Ω</span>
          </div>
          <h1 className="text-3xl font-mono font-bold text-white tracking-tighter mb-2">OHARA RESEARCH</h1>
          <p className="text-zinc-500 uppercase tracking-[0.3em] text-[10px] font-bold">Accedi al database scientifico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  type="text" 
                  placeholder="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-ohara-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-ohara-red-vivid focus:ring-1 focus:ring-ohara-red-vivid outline-none transition-all"
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input 
              type="email" 
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-ohara-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-ohara-red-vivid focus:ring-1 focus:ring-ohara-red-vivid outline-none transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-ohara-border rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-ohara-red-vivid focus:ring-1 focus:ring-ohara-red-vivid outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-ohara-red-dark/10 border border-ohara-red-dark/30 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-ohara-red-vivid shrink-0" size={18} />
              <p className="text-xs text-ohara-red-vivid leading-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-ohara-red-dark hover:bg-ohara-red-vivid text-white font-bold rounded-2xl transition-all shadow-lg shadow-ohara-red-dark/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isRegister ? 'REGISTRATI' : 'ACCEDI'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-ohara-border" />
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Oppure</span>
          <div className="flex-1 h-px bg-ohara-border" />
        </div>

        <button 
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-4 bg-white text-black font-bold rounded-2xl transition-all hover:bg-zinc-200 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <Chrome size={20} />
          ACCEDI CON GOOGLE
        </button>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-zinc-500 hover:text-ohara-red-vivid transition-colors"
          >
            {isRegister ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
