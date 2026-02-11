import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../api';
import type { Schedule, Cell, Member, Study, ScheduleForm } from '../../types';
import {
  Plus, Pencil, Trash2, Calendar, Clock, MapPin, User, Users, X, Save, Eye, CalendarDays,
} from 'lucide-react';

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>({ cell_id: '', title: '', date: '', time: '', location: '', leader_id: '', study_id: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [a, b, c, d] = await Promise.all([api.getSchedules(), api.getCells(), api.getMembers(), api.getStudies()]);
      setSchedules(a); setCells(b); setMembers(c); setStudies(d);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = () => { setForm({ cell_id: '', title: '', date: '', time: '', location: '', leader_id: '', study_id: '', notes: '' }); setEditingId(null); setShowForm(false); };

  const openEdit = (s: Schedule) => {
    setForm({ cell_id: s.cell_id?.toString() || '', title: s.title, date: s.date, time: s.time, location: s.location, leader_id: s.leader_id?.toString() || '', study_id: s.study_id?.toString() || '', notes: s.notes || '' });
    setEditingId(s.id); setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...form, cell_id: form.cell_id || null, leader_id: form.leader_id || null, study_id: form.study_id || null };
      if (editingId) await api.updateSchedule(editingId, data);
      else await api.createSchedule(data);
      resetForm(); loadData();
    } catch (err) { alert((err as Error).message); }
  };

  const handleDelete = async (id: number) => { if (!confirm('Deseja excluir esta reunião?')) return; try { await api.deleteSchedule(id); loadData(); } catch (err) { alert((err as Error).message); } };

  const viewAttendees = async (id: number) => { try { setViewingSchedule(await api.getSchedule(id)); } catch (err) { console.error(err); } };

  const formatDate = (d: string) => { const datePart = typeof d === 'string' ? d.split('T')[0] : d; return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR'); };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-2"><CalendarDays className="w-6 h-6 text-gold-500" />Cronogramas</h1>
          <p className="page-subtitle">Gerencie as reuniões de célula</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nova Reunião</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-gradient mb-6 animate-fade-in-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-dark-50">{editingId ? 'Editar Reunião' : 'Nova Reunião'}</h3>
            <button onClick={resetForm} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Título *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required placeholder="Ex: Célula de Quarta" /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Célula</label><select value={form.cell_id} onChange={(e) => setForm({ ...form, cell_id: e.target.value })} className="input-field"><option value="">Selecione...</option>{cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Data *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Horário *</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Local *</label><input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" required placeholder="Ex: Casa do João" /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Líder</label><select value={form.leader_id} onChange={(e) => setForm({ ...form, leader_id: e.target.value })} className="input-field"><option value="">Selecione...</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Estudo vinculado</label><select value={form.study_id} onChange={(e) => setForm({ ...form, study_id: e.target.value })} className="input-field"><option value="">Nenhum</option>{studies.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Observações</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} placeholder="Anotações..." /></div>
            <div className="flex gap-2"><button type="submit" className="btn-primary"><Save className="w-4 h-4" />{editingId ? 'Atualizar' : 'Criar'}</button><button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button></div>
          </form>
        </div>
      )}

      {/* List */}
      {schedules.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in"><Calendar className="w-14 h-14 text-dark-700 mx-auto mb-4" /><p className="text-dark-500 text-lg">Nenhuma reunião cadastrada</p></div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className="card-hover stagger-item" style={{ animationFillMode: 'both' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-dark-50">{s.title}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gold-600" />{formatDate(s.date)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gold-600" />{s.time}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold-600" />{s.location}</span>
                    {s.leader_name && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gold-600" />{s.leader_name}</span>}
                    {s.cell_name && <span className="badge-gold text-[10px]">{s.cell_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                  <button onClick={() => viewAttendees(s.id)} className="p-2 hover:bg-dark-850 rounded-lg text-dark-500 hover:text-gold-400 transition-all" title="Ver presenças"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(s)} className="p-2 hover:bg-dark-850 rounded-lg text-dark-500 hover:text-blue-400 transition-all" title="Editar"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-dark-850 rounded-lg text-dark-500 hover:text-red-400 transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-dark-600"><Users className="w-3.5 h-3.5" />{s.confirmed_count} confirmado{s.confirmed_count !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Attendees */}
      {viewingSchedule && (
        <div className="modal-overlay" onClick={() => setViewingSchedule(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-dark-50">Presenças Confirmadas</h3>
                <button onClick={() => setViewingSchedule(null)} className="p-2 hover:bg-dark-850 rounded-xl text-dark-500"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-dark-500 mb-4">{viewingSchedule.title} - {formatDate(viewingSchedule.date)}</p>
              {viewingSchedule.attendees?.length === 0 ? (
                <p className="text-center text-dark-600 py-8">Nenhuma presença confirmada</p>
              ) : (
                <div className="space-y-2">
                  {viewingSchedule.attendees?.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-dark-850/50 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.15)]">
                      <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-[#812B8C] rounded-xl flex items-center justify-center shadow-gold">
                        <span className="text-xs font-bold text-white">{a.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-50">{a.name}</p>
                        <p className="text-xs text-dark-500">{a.phone || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
