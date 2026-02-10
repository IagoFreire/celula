import { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Plus, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Wallet, X, Save,
  Filter, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';

const INCOME_CATEGORIES = ['Oferta', 'Dízimo', 'Doação', 'Evento', 'Outros'];
const EXPENSE_CATEGORIES = ['Aluguel', 'Material', 'Alimentação', 'Transporte', 'Manutenção', 'Outros'];

export default function AdminFinances() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ cell_id: '', type: '', start_date: '', end_date: '' });
  const [form, setForm] = useState({ cell_id: '', type: 'income', category: '', amount: '', description: '', date: '' });

  useEffect(() => { loadData(); }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const [t, s, c] = await Promise.all([api.getFinances(params), api.getFinanceSummary(params), api.getCells()]);
      setTransactions(t); setSummary(s); setCells(c);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = () => { setForm({ cell_id: '', type: 'income', category: '', amount: '', description: '', date: '' }); setEditingId(null); setShowForm(false); };
  const openEdit = (t) => { setForm({ cell_id: t.cell_id || '', type: t.type, category: t.category, amount: t.amount, description: t.description || '', date: t.date }); setEditingId(t.id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, cell_id: form.cell_id || null, amount: parseFloat(form.amount) };
      if (editingId) await api.updateFinance(editingId, data); else await api.createFinance(data);
      resetForm(); loadData();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => { if (!confirm('Excluir transação?')) return; try { await api.deleteFinance(id); loadData(); } catch (err) { alert(err.message); } };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (loading && !summary) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-2"><DollarSign className="w-6 h-6 text-gold-500" />Finanças</h1>
          <p className="page-subtitle">Controle financeiro das células</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nova Transação</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card stat-gradient-green text-center">
          <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-lg sm:text-xl font-extrabold text-emerald-400">{fmt(summary?.income)}</p>
          <p className="text-xs text-dark-500 mt-0.5">Entradas</p>
        </div>
        <div className="card stat-gradient-red text-center">
          <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <p className="text-lg sm:text-xl font-extrabold text-red-400">{fmt(summary?.expense)}</p>
          <p className="text-xs text-dark-500 mt-0.5">Saídas</p>
        </div>
        <div className="card stat-gradient-gold text-center">
          <Wallet className="w-5 h-5 text-gold-400 mx-auto mb-2" />
          <p className={`text-lg sm:text-xl font-extrabold ${summary?.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(summary?.balance)}</p>
          <p className="text-xs text-dark-500 mt-0.5">Saldo</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-gold-600" /><span className="text-sm font-semibold text-dark-400">Filtros</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="input-field text-sm"><option value="">Todos os tipos</option><option value="income">Entradas</option><option value="expense">Saídas</option></select>
          <select value={filters.cell_id} onChange={(e) => setFilters({ ...filters, cell_id: e.target.value })} className="input-field text-sm"><option value="">Todas células</option>{cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="input-field text-sm" />
          <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="input-field text-sm" />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-gradient mb-6 animate-fade-in-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-dark-50">{editingId ? 'Editar Transação' : 'Nova Transação'}</h3>
            <button onClick={resetForm} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Tipo *</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: '' })} className="input-field" required><option value="income">Entrada</option><option value="expense">Saída</option></select></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Categoria *</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" required><option value="">Selecione...</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Valor (R$) *</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" required placeholder="0,00" /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Data *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Célula</label><select value={form.cell_id} onChange={(e) => setForm({ ...form, cell_id: e.target.value })} className="input-field"><option value="">Geral</option>{cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Descrição</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Detalhes..." /></div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn-primary"><Save className="w-4 h-4" />{editingId ? 'Atualizar' : 'Registrar'}</button><button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button></div>
          </form>
        </div>
      )}

      {/* Transactions */}
      {transactions.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in"><DollarSign className="w-14 h-14 text-dark-700 mx-auto mb-4" /><p className="text-dark-500 text-lg">Nenhuma transação encontrada</p></div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="card-hover flex items-center gap-3 stagger-item" style={{ animationFillMode: 'both' }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10 shadow-[0_2px_8px_rgba(16,185,129,0.12)]' : 'bg-red-500/10 shadow-[0_2px_8px_rgba(239,68,68,0.12)]'}`}>
                {t.type === 'income' ? <ArrowUpCircle className="w-5 h-5 text-emerald-400" /> : <ArrowDownCircle className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark-50 text-sm truncate">{t.category}</span>
                  {t.cell_name && <span className="badge-gold text-[10px]">{t.cell_name}</span>}
                </div>
                {t.description && <p className="text-xs text-dark-600 truncate">{t.description}</p>}
                <p className="text-xs text-dark-600">{fmtDate(t.date)}</p>
              </div>
              <p className={`font-bold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
              </p>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-blue-400 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* By Category */}
      {summary?.byCategory?.length > 0 && (
        <div className="card mt-6 animate-fade-in-up">
          <h3 className="font-bold text-dark-50 mb-4">Resumo por Categoria</h3>
          <div className="space-y-2">
            {summary.byCategory.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5" style={{ boxShadow: 'var(--inset-highlight)' }}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${item.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-dark-300">{item.category}</span>
                  <span className="text-xs text-dark-600">({item.count}x)</span>
                </div>
                <span className={`text-sm font-semibold ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
