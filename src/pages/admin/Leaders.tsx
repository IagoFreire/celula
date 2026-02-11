import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../api';
import type { Leader, Cell } from '../../types';
import {
  Plus, Trash2, X, Save, Users2, Mail, Lock, Home, Shield,
} from 'lucide-react';

interface LeaderForm {
  email: string;
  password: string;
  cell_id: string;
}

export default function AdminLeaders() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LeaderForm>({ email: '', password: '', cell_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [l, c] = await Promise.all([api.getLeaders(), api.getCells()]);
      setLeaders(l); setCells(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ email: '', password: '', cell_id: '' });
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.cell_id) return;
    try {
      setSubmitting(true);
      await api.createLeader({
        email: form.email,
        password: form.password,
        cell_id: Number(form.cell_id),
      });
      resetForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este líder? Ele perderá acesso ao sistema.')) return;
    try {
      await api.deleteLeader(id);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  // Células que ainda não têm líder
  const leaderCellIds = new Set(leaders.map(l => l.cell_id));
  const availableCells = cells.filter(c => !leaderCellIds.has(c.id));

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users2 className="w-6 h-6 text-gold-500" />
            Líderes de Célula
          </h1>
          <p className="page-subtitle">Gerencie os líderes que terão acesso à administração da sua célula</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Líder</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-gradient mb-6 animate-fade-in-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-dark-50">Cadastrar Líder</h3>
            <button onClick={resetForm} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-400 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field pl-10"
                    placeholder="lider@email.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-400 mb-1.5">Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pl-10"
                    placeholder="Senha inicial"
                    required
                    minLength={4}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-400 mb-1.5">Célula *</label>
                <select
                  value={form.cell_id}
                  onChange={(e) => setForm({ ...form, cell_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Selecione a célula...</option>
                  {availableCells.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-dark-600">
              O líder poderá fazer login com email e senha, e terá acesso à administração apenas da célula vinculada. 
              Ele poderá alterar a senha depois.
            </p>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? <div className="spinner w-4 h-4" /> : <Save className="w-4 h-4" />}
                Cadastrar
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {leaders.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <Users2 className="w-14 h-14 text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-lg">Nenhum líder cadastrado</p>
          <p className="text-sm text-dark-600 mt-1">Cadastre líderes para que eles possam administrar suas células</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaders.map((l) => (
            <div key={l.id} className="card-hover stagger-item" style={{ animationFillMode: 'both' }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gradient-to-br from-accent-500 to-[#812B8C] rounded-xl flex items-center justify-center flex-shrink-0 shadow-gold">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-dark-50">{l.name}</span>
                    <span className="badge-gold text-[10px]">
                      <Home className="w-2.5 h-2.5 mr-0.5" />{l.cell_name || 'Sem célula'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-dark-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />{l.email}
                    </span>
                    <span className="text-xs text-dark-600">Desde {fmtDate(l.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="p-2 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-red-400 transition-all flex-shrink-0"
                  title="Excluir líder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
