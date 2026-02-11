import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Church, Eye, EyeOff, LogIn, Sparkles, Sun, Moon, Phone, ArrowRight, User } from 'lucide-react';

type LoginMode = 'phone' | 'email' | 'name';

export default function Login() {
  const { user, login, phoneLogin, phoneRegister } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<LoginMode>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/cronograma" replace />;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError('');
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Digite um número válido com DDD');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await phoneLogin(phone);
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (message === 'Número não cadastrado') {
        setMode('name');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Digite seu nome');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await phoneRegister(name.trim(), phone);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Theme Toggle - top right */}
      <button onClick={toggleTheme} className="theme-toggle absolute top-5 right-5 z-20" aria-label="Alternar tema">
        <Sun className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'opacity-30 text-dark-600' : 'opacity-100 text-amber-500'}`} />
        <Moon className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'opacity-100 text-gold-400' : 'opacity-30 text-dark-600'}`} />
        <span className="theme-toggle-dot" data-dark={isDark ? 'true' : 'false'} />
      </button>

      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#812B8C]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/4 left-0 w-[300px] h-[300px] bg-gold-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(191,36,122,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(191,36,122,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 shadow-[0_4px_30px_rgba(191,36,122,0.25)] animate-float"
            style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.15), rgba(217,115,26,0.1))', backdropFilter: 'blur(12px)', border: '1px solid rgba(191,36,122,0.15)' }}>
            <Church className="w-9 h-9 text-gold-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-gradient">Células</h1>
          <p className="text-dark-500 mt-1 text-sm">Sistema de Gestão de Células</p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl p-7 sm:p-9" style={{
          background: 'rgba(var(--dark-900), 0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: 'var(--modal-shadow), var(--inset-highlight)',
        }}>
          {/* Gradient border accent */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(191,36,122,0.3), rgba(217,115,26,0.2), transparent 60%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }} />
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/5 rounded-xl text-sm text-red-400 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)] animate-fade-in-down">
              {error}
            </div>
          )}

          {mode === 'phone' ? (
            <>
              <div className="flex items-center gap-2 mb-5">
                <Phone className="w-4 h-4 text-accent-500" />
                <h2 className="text-lg font-bold text-dark-50">Entrar com celular</h2>
              </div>

              <form onSubmit={handlePhoneSubmit}>
                <label className="block text-sm font-medium text-dark-300 mb-2">Número de celular</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="input-field mb-4"
                  placeholder="(00) 00000-0000"
                  autoFocus
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                  {loading ? <div className="spinner w-5 h-5" /> : <><ArrowRight className="w-4 h-4" />Continuar</>}
                </button>
              </form>

              <div className="divider-gold my-5" />

              <button
                onClick={() => { setMode('email'); setError(''); }}
                className="text-sm text-dark-500 hover:text-dark-300 transition-colors w-full text-center"
              >
                Admin
              </button>
            </>
          ) : mode === 'name' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-accent-500" />
                <h2 className="text-lg font-bold text-dark-50">Qual é o seu nome?</h2>
              </div>
              <p className="text-sm text-dark-500 mb-5">
                O número <span className="text-dark-300 font-medium">{phone}</span> ainda não está cadastrado.
              </p>

              <form onSubmit={handleNameSubmit}>
                <label className="block text-sm font-medium text-dark-300 mb-2">Seu nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  className="input-field mb-4"
                  placeholder="Digite seu nome completo"
                  autoFocus
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                  {loading ? <div className="spinner w-5 h-5" /> : <><ArrowRight className="w-4 h-4" />Cadastrar e entrar</>}
                </button>
              </form>

              <button
                onClick={() => { setMode('phone'); setError(''); }}
                className="mt-4 text-sm text-dark-500 hover:text-dark-300 transition-colors w-full text-center"
              >
                ← Voltar
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-accent-500" />
                <h2 className="text-lg font-bold text-dark-50">Entrar como Admin</h2>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="seu@email.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Senha</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-11" placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-gold-500 transition-colors duration-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                  {loading ? <div className="spinner w-5 h-5" /> : <><LogIn className="w-4 h-4" />Entrar</>}
                </button>
              </form>

              <div className="divider-gold my-5" />

              <button
                onClick={() => { setMode('phone'); setError(''); }}
                className="text-sm text-dark-500 hover:text-dark-300 transition-colors w-full text-center"
              >
                ← Voltar para login com celular
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
