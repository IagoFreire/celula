import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Church,
  Calendar,
  MapPin,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';


interface PublicSchedule {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  cell_name?: string;
  confirmed_count: number;
}

export default function Landing() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [schedules, setSchedules] = useState<PublicSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  useEffect(() => {
    if (!user) {
      fetch('/api/schedules/public')
        .then((r) => {
          if (!r.ok) throw new Error('Erro');
          return r.json();
        })
        .then((data) => {
          if (Array.isArray(data)) setSchedules(data);
        })
        .catch(() => {})
        .finally(() => setLoadingSchedules(false));
    }
  }, [user]);

  if (user) return <Navigate to="/cronograma" replace />;

  const formatDate = (dateStr: string) => {
    const datePart = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
    const date = new Date(datePart + 'T00:00:00');
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return { dayName: days[date.getDay()], day: date.getDate(), month: months[date.getMonth()] };
  };

  return (
    <div className="min-h-screen bg-dark-950 transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 h-14 flex items-center justify-between" style={{
        background: 'rgba(var(--dark-950), 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'var(--header-shadow), var(--inset-highlight)',
      }}>
        <div className="flex items-center gap-2">
          <Church className="w-5 h-5 text-gold-500" />
          <span className="font-bold text-dark-50">Células</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-primary !px-4 !py-2 !text-sm">
            Entrar
          </Link>
        </div>
      </header>

      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#812B8C]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-gold-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(191,36,122,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(191,36,122,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Cronogramas */}
      <section className="relative z-10 px-4 pt-20 sm:pt-24 pb-12 sm:pb-16 flex-1 flex flex-col justify-center">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gold-500" />
              <span className="text-sm font-semibold text-gold-400 uppercase tracking-wider">Próximas Reuniões</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-dark-50">Cronograma da Célula</h2>
            <p className="text-dark-500 mt-2">Confira os próximos encontros e participe</p>
          </div>

          {loadingSchedules ? (
            <div className="flex items-center justify-center py-16">
              <div className="spinner w-8 h-8" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="card text-center py-16 max-w-md mx-auto" style={{ border: '1px solid rgba(217,115,26,0.1)' }}>
              <Calendar className="w-14 h-14 text-dark-700 mx-auto mb-4" />
              <p className="text-dark-500 text-lg mb-2">Nenhuma reunião agendada</p>
              <p className="text-sm text-dark-600">Entre para ficar por dentro quando novas reuniões forem marcadas.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.slice(0, 6).map((schedule) => {
                const { dayName, day, month } = formatDate(schedule.date);
                return (
                  <div
                    key={schedule.id}
                    className="card-hover group"
                    style={{ border: '1px solid rgba(217,115,26,0.1)' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 text-center">
                        <div className="rounded-xl p-2 shadow-[0_2px_12px_rgba(217,115,26,0.12)]"
                          style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.1), rgba(217,115,26,0.08))' }}>
                          <p className="text-[10px] font-bold text-gold-400 uppercase">{dayName.slice(0, 3)}</p>
                          <p className="text-2xl font-extrabold text-dark-50 leading-none mt-0.5">{day}</p>
                          <p className="text-[10px] font-semibold text-dark-500 uppercase mt-0.5">{month}</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-dark-50 truncate group-hover:text-gold-400 transition-colors">{schedule.title}</h3>
                        <div className="mt-2 space-y-1.5">
                          <p className="flex items-center gap-1.5 text-sm text-dark-400">
                            <Clock className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
                            {schedule.time}
                          </p>
                          <p className="flex items-center gap-1.5 text-sm text-dark-400">
                            <MapPin className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
                            <span className="truncate">{schedule.location}</span>
                          </p>
                        </div>
                        {schedule.cell_name && (
                          <span className="badge-gold mt-2 text-[10px]">{schedule.cell_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-8 mt-8">
        <div className="divider-gold mb-8" />
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Church className="w-5 h-5 text-gold-500" />
              <span className="font-bold text-dark-100">Células</span>
            </div>
            <p className="text-xs text-dark-600">Sistema de Gestão de Células • Conectando vidas através da comunhão</p>
          </div>
          <button onClick={toggleTheme} className="theme-toggle flex-shrink-0" aria-label="Alternar tema">
            <Sun className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'opacity-30 text-dark-600' : 'opacity-100 text-amber-500'}`} />
            <Moon className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'opacity-100 text-gold-400' : 'opacity-30 text-dark-600'}`} />
            <span className="theme-toggle-dot" data-dark={isDark ? 'true' : 'false'} />
          </button>
        </div>
      </footer>
    </div>
  );
}
