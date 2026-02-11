import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import type { Cell, Member } from '../../types';
import {
  Plus, Pencil, Trash2, X, Save, Search, Home, Users,
  Phone, ChevronRight, UserPlus, UserMinus, ArrowLeft,
  Shield, Calendar, CheckCircle2, MapPin, Clock,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
];

const getDayLabel = (day: number | null | undefined) => DAYS_OF_WEEK.find(d => d.value === day)?.label || '';
const getFreqLabel = (freq: string | undefined) => FREQUENCIES.find(f => f.value === freq)?.label || '';

interface CellForm {
  name: string;
  description: string;
  address: string;
  day_of_week: string;
  meeting_time: string;
  frequency: string;
  next_date: string;
}

interface MemberFormType {
  name: string;
  phone: string;
}

export default function AdminCells() {
  const { isAdmin, isLeader } = useAuth();
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Cell form
  const [showCellForm, setShowCellForm] = useState(false);
  const [editingCellId, setEditingCellId] = useState<number | null>(null);
  const [cellForm, setCellForm] = useState<CellForm>({ name: '', description: '', address: '', day_of_week: '', meeting_time: '', frequency: 'weekly', next_date: '' });

  // Selected cell (detail view)
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberFormType>({ name: '', phone: '' });

  // Member detail
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loadingMemberDetail, setLoadingMemberDetail] = useState(false);

  useEffect(() => { loadCells(); }, []);

  // Se for líder, auto-selecionar a célula dele
  useEffect(() => {
    if (isLeader && cells.length === 1 && !selectedCell) {
      selectCell(cells[0]);
    }
  }, [cells, isLeader]);

  const loadCells = async () => {
    try {
      setLoading(true);
      setCells(await api.getCells());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetCellForm = () => {
    setCellForm({ name: '', description: '', address: '', day_of_week: '', meeting_time: '', frequency: 'weekly', next_date: '' });
    setEditingCellId(null);
    setShowCellForm(false);
  };

  const openEditCell = (c: Cell) => {
    setCellForm({
      name: c.name,
      description: c.description || '',
      address: c.address || '',
      day_of_week: c.day_of_week != null ? String(c.day_of_week) : '',
      meeting_time: c.meeting_time || '',
      frequency: c.frequency || 'weekly',
      next_date: c.next_date ? String(c.next_date).split('T')[0] : '',
    });
    setEditingCellId(c.id);
    setShowCellForm(true);
  };

  const handleCellSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: cellForm.name,
        description: cellForm.description,
        address: cellForm.address,
        day_of_week: cellForm.day_of_week !== '' ? Number(cellForm.day_of_week) : null,
        meeting_time: cellForm.meeting_time || null,
        frequency: cellForm.frequency,
        next_date: cellForm.next_date || null,
      };
      if (editingCellId) {
        await api.updateCell(editingCellId, payload);
        // Atualizar selectedCell se estiver na detail view
        if (selectedCell?.id === editingCellId) {
          const updated = await api.getCells();
          setSelectedCell(updated.find(c => c.id === editingCellId) || null);
        }
      } else {
        await api.createCell(payload);
      }
      resetCellForm();
      loadCells();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteCell = async (id: number) => {
    if (!confirm('Excluir esta célula? Os membros serão desassociados.')) return;
    try {
      await api.deleteCell(id);
      if (selectedCell?.id === id) {
        setSelectedCell(null);
        setMembers([]);
      }
      loadCells();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // --- Members ---
  const selectCell = async (cell: Cell) => {
    setSelectedCell(cell);
    setSelectedMember(null);
    setShowMemberForm(false);
    setMemberSearch('');
    await loadMembers(cell.id);
  };

  const loadMembers = async (cellId: number) => {
    try {
      setLoadingMembers(true);
      setMembers(await api.getCellMembers(cellId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleMemberSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    try {
      await api.addCellMember(selectedCell.id, memberForm);
      setMemberForm({ name: '', phone: '' });
      setShowMemberForm(false);
      loadMembers(selectedCell.id);
      loadCells(); // refresh count
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedCell) return;
    if (!confirm('Remover este membro da célula?')) return;
    try {
      await api.removeCellMember(selectedCell.id, userId);
      if (selectedMember?.id === userId) setSelectedMember(null);
      loadMembers(selectedCell.id);
      loadCells();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const viewMemberDetail = async (id: number) => {
    try {
      setLoadingMemberDetail(true);
      const detail = await api.getMember(id);
      setSelectedMember(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMemberDetail(false);
    }
  };

  const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  const filteredCells = cells.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.phone || '').includes(memberSearch)
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  // ========== DETAIL VIEW (cell selected) ==========
  if (selectedCell) {
    return (
      <div>
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          {/* Líder não tem botão voltar, já que só tem uma célula */}
          {isAdmin && (
            <button onClick={() => { setSelectedCell(null); setSelectedMember(null); }} className="flex items-center gap-2 text-sm text-dark-500 hover:text-dark-300 transition-colors mb-3">
              <ArrowLeft className="w-4 h-4" />Voltar para células
            </button>
          )}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title flex items-center gap-2">
                <Home className="w-6 h-6 text-gold-500" />{selectedCell.name}
              </h1>
              {selectedCell.description && <p className="page-subtitle">{selectedCell.description}</p>}
              {selectedCell.address && (
                <p className="text-sm text-dark-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold-600" />{selectedCell.address}</p>
              )}
              {selectedCell.day_of_week != null && (
                <p className="text-sm text-dark-500 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gold-600" />
                  {getDayLabel(selectedCell.day_of_week)}
                  {selectedCell.meeting_time && ` às ${selectedCell.meeting_time}`}
                  {selectedCell.frequency && ` • ${getFreqLabel(selectedCell.frequency)}`}
                </p>
              )}
              {selectedCell.next_date && (
                <p className="text-sm text-dark-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-600" />
                  Próxima: {new Date(String(selectedCell.next_date).split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
              <p className="text-sm text-dark-500 mt-1">{members.length} membro{members.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => openEditCell(selectedCell)} className="btn-secondary text-sm"><Pencil className="w-3.5 h-3.5" />Editar</button>
            </div>
          </div>
        </div>

        {/* Edit cell form */}
        {showCellForm && editingCellId && (
          <div className="card-gradient mb-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-dark-50">Editar Célula</h3>
              <button onClick={resetCellForm} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCellSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                <input type="text" value={cellForm.name} onChange={(e) => setCellForm({ ...cellForm, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Descrição</label>
                <textarea value={cellForm.description} onChange={(e) => setCellForm({ ...cellForm, description: e.target.value })} className="input-field min-h-[80px] resize-y" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Endereço</label>
                <input type="text" value={cellForm.address} onChange={(e) => setCellForm({ ...cellForm, address: e.target.value })} className="input-field" placeholder="Ex: Rua das Flores, 123 - Centro" />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Dia da semana</label>
                  <select value={cellForm.day_of_week} onChange={(e) => setCellForm({ ...cellForm, day_of_week: e.target.value })} className="input-field">
                    <option value="">Selecione...</option>
                    {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Horário</label>
                  <input type="time" value={cellForm.meeting_time} onChange={(e) => setCellForm({ ...cellForm, meeting_time: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Frequência</label>
                  <select value={cellForm.frequency} onChange={(e) => setCellForm({ ...cellForm, frequency: e.target.value })} className="input-field">
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Próxima reunião</label>
                <input type="date" value={cellForm.next_date} onChange={(e) => setCellForm({ ...cellForm, next_date: e.target.value })} className="input-field" />
                <p className="text-xs text-dark-600 mt-1">Define a data da próxima reunião. As seguintes serão geradas a partir desta data conforme a frequência.</p>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm"><Save className="w-4 h-4" />Salvar</button>
                <button type="button" onClick={resetCellForm} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-down">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Buscar membro..."
              className="input-field pl-10"
            />
          </div>
          <button onClick={() => { setShowMemberForm(true); setMemberForm({ name: '', phone: '' }); }} className="btn-primary">
            <UserPlus className="w-4 h-4" />Adicionar Membro
          </button>
        </div>

        {/* Add member form */}
        {showMemberForm && (
          <div className="card-gradient mb-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-dark-50">Novo Membro</h3>
              <button onClick={() => setShowMemberForm(false)} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                  <input type="text" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="input-field" placeholder="Nome completo" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Celular</label>
                  <input
                    type="tel"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: formatPhone(e.target.value) })}
                    className="input-field"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-dark-600">Se o número já estiver cadastrado, o membro será apenas associado a esta célula.</p>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm"><Save className="w-4 h-4" />Adicionar</button>
                <button type="button" onClick={() => setShowMemberForm(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Members list */}
          <div className="flex-1">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-16"><div className="spinner w-6 h-6" /></div>
            ) : filteredMembers.length === 0 ? (
              <div className="card text-center py-16 animate-fade-in">
                <Users className="w-14 h-14 text-dark-700 mx-auto mb-4" />
                <p className="text-dark-500 text-lg">Nenhum membro nesta célula</p>
                <p className="text-sm text-dark-600 mt-1">Adicione membros para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className={`card-hover cursor-pointer ${selectedMember?.id === m.id ? 'shadow-[0_4px_20px_rgba(217,115,26,0.15)]' : ''}`}
                    onClick={() => viewMemberDetail(m.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-[#812B8C] rounded-xl flex items-center justify-center flex-shrink-0 shadow-gold">
                        <span className="text-sm font-bold text-white">{m.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-dark-50 text-sm truncate">{m.name}</span>
                          {m.role === 'admin' && <span className="badge-gold text-[10px]"><Shield className="w-2.5 h-2.5 mr-0.5" />Admin</span>}
                          {m.role === 'leader' && <span className="badge-gold text-[10px]"><Shield className="w-2.5 h-2.5 mr-0.5" />Líder</span>}
                        </div>
                        <p className="text-xs text-dark-500 truncate">{m.phone || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-dark-600 hidden sm:block">{m.total_attendance || 0} presenças</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.id); }}
                          className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-red-400 transition-all"
                          title="Remover da célula"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-dark-700 hidden sm:block" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member detail panel */}
          {selectedMember && (
            <div className="lg:w-80 xl:w-96 animate-slide-in-right">
              <div className="card lg:sticky lg:top-4">
                {loadingMemberDetail ? (
                  <div className="flex items-center justify-center py-12"><div className="spinner w-6 h-6" /></div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-dark-50">Detalhes</h3>
                      <button onClick={() => setSelectedMember(null)} className="p-1.5 hover:bg-dark-850 rounded-lg lg:hidden text-dark-500"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="text-center mb-5 -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 px-4 pt-6 pb-5 sm:px-5 rounded-t-2xl"
                      style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.12) 0%, rgba(217,115,26,0.08) 100%)' }}>
                      <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-[#812B8C] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-gold-lg">
                        <span className="text-2xl font-extrabold text-white">{selectedMember.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <h4 className="font-bold text-dark-50 text-lg">{selectedMember.name}</h4>
                      <p className="text-sm text-dark-500">
                        {selectedMember.role === 'admin' ? '✦ Administrador' : selectedMember.role === 'leader' ? '✦ Líder' : 'Membro'}
                      </p>
                    </div>

                    <div className="space-y-2.5 mb-6">
                      <div className="flex items-center gap-2.5 text-sm text-dark-400"><Phone className="w-4 h-4 text-gold-600" /><span>{selectedMember.phone || '—'}</span></div>
                      <div className="flex items-center gap-2.5 text-sm text-dark-400"><Calendar className="w-4 h-4 text-gold-600" /><span>Desde {fmtDate(selectedMember.created_at)}</span></div>
                    </div>

                    {selectedMember.stats && (
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {[
                          { v: selectedMember.stats.total, l: 'Total' },
                          { v: selectedMember.stats.last_30_days, l: '30 dias' },
                          { v: selectedMember.stats.last_90_days, l: '90 dias' },
                        ].map((s) => (
                          <div key={s.l} className="text-center p-2.5 bg-dark-850/50 rounded-xl shadow-[inset_0_1px_4px_rgba(0,0,0,0.2)]">
                            <p className="text-lg font-extrabold text-gold-400">{s.v}</p>
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider">{s.l}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-dark-400 mb-3">Histórico de Presenças</h4>
                      {selectedMember.attendanceHistory?.length === 0 ? (
                        <p className="text-sm text-dark-600 text-center py-4">Nenhuma presença registrada</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {selectedMember.attendanceHistory?.map((a, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2.5 bg-dark-850/30 rounded-xl text-sm shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-dark-300 truncate">{a.title}</p>
                                <p className="text-xs text-dark-600">{fmtDate(a.date)} • {a.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== LIST VIEW (no cell selected) ==========
  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2"><Home className="w-6 h-6 text-gold-500" />Células</h1>
        <p className="page-subtitle">{cells.length} célula{cells.length !== 1 ? 's' : ''} cadastrada{cells.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-down">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar célula..."
            className="input-field pl-10"
          />
        </div>
        {isAdmin && (
          <button onClick={() => { resetCellForm(); setShowCellForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />Nova Célula
          </button>
        )}
      </div>

      {/* Cell form - apenas admin pode criar */}
      {showCellForm && isAdmin && (
        <div className="card-gradient mb-6 animate-scale-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-dark-50">{editingCellId ? 'Editar Célula' : 'Nova Célula'}</h3>
            <button onClick={resetCellForm} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleCellSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Nome da Célula</label>
              <input type="text" value={cellForm.name} onChange={(e) => setCellForm({ ...cellForm, name: e.target.value })} className="input-field" placeholder="Ex: Célula Central" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Descrição</label>
              <textarea value={cellForm.description} onChange={(e) => setCellForm({ ...cellForm, description: e.target.value })} className="input-field min-h-[80px] resize-y" placeholder="Descrição da célula (opcional)" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Endereço</label>
              <input type="text" value={cellForm.address} onChange={(e) => setCellForm({ ...cellForm, address: e.target.value })} className="input-field" placeholder="Ex: Rua das Flores, 123 - Centro" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Dia da semana</label>
                <select value={cellForm.day_of_week} onChange={(e) => setCellForm({ ...cellForm, day_of_week: e.target.value })} className="input-field">
                  <option value="">Selecione...</option>
                  {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Horário</label>
                <input type="time" value={cellForm.meeting_time} onChange={(e) => setCellForm({ ...cellForm, meeting_time: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Frequência</label>
                <select value={cellForm.frequency} onChange={(e) => setCellForm({ ...cellForm, frequency: e.target.value })} className="input-field">
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Próxima reunião</label>
              <input type="date" value={cellForm.next_date} onChange={(e) => setCellForm({ ...cellForm, next_date: e.target.value })} className="input-field" />
              <p className="text-xs text-dark-600 mt-1">Define a data da próxima reunião. As seguintes serão geradas a partir desta data conforme a frequência.</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm"><Save className="w-4 h-4" />{editingCellId ? 'Salvar' : 'Criar'}</button>
              <button type="button" onClick={resetCellForm} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {filteredCells.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <Home className="w-14 h-14 text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-lg">Nenhuma célula encontrada</p>
          <p className="text-sm text-dark-600 mt-1">Crie uma nova célula para começar</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCells.map((c) => (
            <div
              key={c.id}
              className="card-hover group cursor-pointer"
              onClick={() => selectCell(c)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-[#812B8C] rounded-xl flex items-center justify-center flex-shrink-0 shadow-gold">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-dark-50 text-sm truncate group-hover:text-gold-400 transition-colors">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-dark-500 mt-1 line-clamp-2">{c.description}</p>
                    )}
                    {c.address && (
                      <p className="text-xs text-dark-600 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{c.address}</span></p>
                    )}
                    {c.day_of_week != null && (
                      <p className="text-xs text-dark-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{getDayLabel(c.day_of_week)}{c.meeting_time ? ` ${c.meeting_time}` : ''} • {getFreqLabel(c.frequency)}</span>
                      </p>
                    )}
                    {c.next_date && (
                      <p className="text-xs text-dark-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>Próxima: {new Date(String(c.next_date).split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Users className="w-3 h-3 text-dark-600" />
                      <span className="text-xs text-dark-500">{c.member_count || 0} membro{(c.member_count || 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditCell(c); }}
                        className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-blue-400 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCell(c.id); }}
                        className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-dark-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
