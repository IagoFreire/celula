import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import {
  Users,
  Calendar,
  DollarSign,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Wallet,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [members, schedules, finances, studies] = await Promise.all([
        api.getMembers(), api.getSchedules(), api.getFinanceSummary(), api.getStudies(),
      ]);
      const today = new Date().toISOString().split('T')[0];
      setStats({
        totalMembers: members.length,
        upcomingSchedules: schedules.filter((s) => s.date >= today).length,
        totalStudies: studies.length,
        income: finances.income,
        expense: finances.expense,
        balance: finances.balance,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;
  }

  const cards = [
    { title: 'Membros', value: stats?.totalMembers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', shadow: 'shadow-[0_2px_10px_rgba(59,130,246,0.12)]', link: '/admin/membros', gradient: 'stat-gradient-blue', borderColor: 'rgba(59,130,246,0.15)' },
    { title: 'Próximas Reuniões', value: stats?.upcomingSchedules || 0, icon: Calendar, color: 'text-gold-400', bg: 'bg-gold-500/10', shadow: 'shadow-[0_2px_10px_rgba(217,115,26,0.12)]', link: '/admin/cronogramas', gradient: 'stat-gradient-gold', borderColor: 'rgba(217,115,26,0.15)' },
    { title: 'Estudos', value: stats?.totalStudies || 0, icon: BookOpen, color: 'text-accent-400', bg: 'bg-accent-500/10', shadow: 'shadow-[0_2px_10px_rgba(191,36,122,0.12)]', link: '/admin/estudos', gradient: 'stat-gradient-accent', borderColor: 'rgba(191,36,122,0.15)' },
    { title: 'Saldo', value: formatCurrency(stats?.balance), icon: Wallet, color: stats?.balance >= 0 ? 'text-emerald-400' : 'text-red-400', bg: stats?.balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', shadow: stats?.balance >= 0 ? 'shadow-[0_2px_10px_rgba(16,185,129,0.12)]' : 'shadow-[0_2px_10px_rgba(239,68,68,0.12)]', link: '/admin/financas', gradient: stats?.balance >= 0 ? 'stat-gradient-green' : 'stat-gradient-red', borderColor: stats?.balance >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' },
  ];

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent-500" />
          Dashboard
        </h1>
        <p className="page-subtitle">Visão geral da gestão</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <Link
            key={card.title}
            to={card.link}
            className={`card-hover group stagger-item ${card.gradient}`}
            style={{ animationFillMode: 'both', border: `1px solid ${card.borderColor}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg} ${card.shadow}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-dark-600 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <p className="text-2xl font-extrabold text-dark-50">{card.value}</p>
            <p className="text-sm text-dark-500 mt-0.5">{card.title}</p>
          </Link>
        ))}
      </div>

      {/* Resumo Financeiro */}
      <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <div className="card stat-gradient-green" style={{ border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shadow-[0_2px_10px_rgba(16,185,129,0.12)]">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Entradas</p>
              <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(stats?.income)}</p>
            </div>
          </div>
        </div>

        <div className="card stat-gradient-red" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shadow-[0_2px_10px_rgba(239,68,68,0.12)]">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500">Total Saídas</p>
              <p className="text-2xl font-extrabold text-red-400">{formatCurrency(stats?.expense)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
