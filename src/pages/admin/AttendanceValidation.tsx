import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import type { Cell } from '../../types';
import {
  ClipboardCheck, Calendar, Check, X, Users, UserPlus, ChevronLeft,
  ChevronDown, ChevronUp, History, Eye, CheckCircle2, XCircle, UserCheck,
  Search,
} from 'lucide-react';

interface MeetingItem {
  cell_id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  cell_name: string;
  validated: boolean;
}

interface ConfirmedUser {
  user_id: number;
  name: string;
  phone?: string;
}

interface CellMember {
  id: number;
  name: string;
  phone?: string;
  role: string;
}

interface ValidatedUser {
  user_id: number;
  user_name: string;
  was_confirmed: boolean;
}

interface HistoryItem {
  cell_id: number;
  date: string;
  cell_name: string;
  total_present: number;
  confirmed_present: number;
  unconfirmed_present: number;
  validated_at: string;
}

interface DetailItem {
  user_id: number;
  user_name: string;
  user_phone?: string;
  was_confirmed: boolean;
}

type ViewMode = 'meetings' | 'validate' | 'history' | 'detail';

export default function AttendanceValidation() {
  const { user, isAdmin } = useAuth();

  // Cells (para admin filtrar)
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null);

  // View
  const [view, setView] = useState<ViewMode>('meetings');

  // Meetings list
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Validation form
  const [currentMeeting, setCurrentMeeting] = useState<MeetingItem | null>(null);
  const [confirmedUsers, setConfirmedUsers] = useState<ConfirmedUser[]>([]);
  const [allMembers, setAllMembers] = useState<CellMember[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [confirmedSet, setConfirmedSet] = useState<Set<number>>(new Set());
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchMember, setSearchMember] = useState('');

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterCellId, setFilterCellId] = useState<string>('');

  // Detail
  const [detailData, setDetailData] = useState<DetailItem[]>([]);
  const [detailMeeting, setDetailMeeting] = useState<{ cell_id: number; date: string; cell_name: string } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load cells
  useEffect(() => {
    const loadCells = async () => {
      try {
        const data = await api.getCells();
        setCells(data);
        if (!isAdmin && user?.cell_id) {
          setSelectedCellId(user.cell_id);
        } else if (data.length > 0) {
          setSelectedCellId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCells();
  }, [isAdmin, user]);

  // Load meetings when cell changes
  const loadMeetings = useCallback(async () => {
    if (!selectedCellId) return;
    try {
      setLoadingMeetings(true);
      const data = await api.getValidationMeetings(selectedCellId);
      setMeetings(data as unknown as MeetingItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMeetings(false);
    }
  }, [selectedCellId]);

  useEffect(() => {
    if (selectedCellId && view === 'meetings') {
      loadMeetings();
    }
  }, [selectedCellId, view, loadMeetings]);

  // Prepare validation
  const openValidation = async (meeting: MeetingItem) => {
    try {
      setLoadingValidation(true);
      setCurrentMeeting(meeting);
      setView('validate');

      const data = await api.prepareValidation(meeting.cell_id, meeting.date);

      setConfirmedUsers(data.confirmed);
      setAllMembers(data.allMembers);

      const confSet = new Set(data.confirmed.map((c) => c.user_id));
      setConfirmedSet(confSet);

      // Se já tem validação, marcar os que foram validados
      if (data.validated.length > 0) {
        setSelectedUserIds(new Set(data.validated.map((v) => v.user_id)));
      } else {
        // Por padrão, todos que confirmaram ficam marcados
        setSelectedUserIds(new Set(confSet));
      }

      setShowAddMembers(false);
      setSearchMember('');
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados da reunião');
      setView('meetings');
    } finally {
      setLoadingValidation(false);
    }
  };

  // Toggle user presence
  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Submit validation
  const handleSubmit = async () => {
    if (!currentMeeting) return;
    try {
      setSubmitting(true);
      const attendees = Array.from(selectedUserIds).map((user_id) => ({
        user_id,
        was_confirmed: confirmedSet.has(user_id),
      }));

      await api.submitValidation(currentMeeting.cell_id, currentMeeting.date, attendees);
      alert('Presença validada com sucesso!');
      setView('meetings');
      loadMeetings();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const cellId = filterCellId ? Number(filterCellId) : undefined;
      const data = await api.getValidationHistory(cellId);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [filterCellId]);

  useEffect(() => {
    if (view === 'history') {
      loadHistory();
    }
  }, [view, loadHistory]);

  // View detail
  const openDetail = async (item: HistoryItem) => {
    try {
      setLoadingDetail(true);
      setDetailMeeting({ cell_id: item.cell_id, date: item.date, cell_name: item.cell_name });
      setView('detail');
      const data = await api.getValidationDetail(item.cell_id, item.date);
      setDetailData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (d: string) => {
    const datePart = typeof d === 'string' ? d.split('T')[0] : d;
    return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (d: string) => {
    const datePart = typeof d === 'string' ? d.split('T')[0] : d;
    return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Members not yet in the selected list (for adding)
  const availableMembers = allMembers.filter(
    (m) => !selectedUserIds.has(m.id) && !confirmedSet.has(m.id)
  );

  const filteredAvailableMembers = searchMember
    ? availableMembers.filter((m) =>
        m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
        (m.phone && m.phone.includes(searchMember))
      )
    : availableMembers;

  // ======== RENDER ========

  // Meetings list view
  if (view === 'meetings') {
    return (
      <div>
        <div className="mb-8 animate-fade-in">
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-gold-500" />
            Validação de Presença
          </h1>
          <p className="page-subtitle">
            Valide quem realmente compareceu às reuniões da célula
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 animate-fade-in">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-500 to-[#D9731A] text-white shadow-gold"
          >
            <ClipboardCheck className="w-4 h-4" />
            Validar
          </button>
          <button
            onClick={() => setView('history')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-dark-400 hover:text-dark-50 hover:bg-dark-850/60 transition-all"
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
        </div>

        {/* Cell selector (admin only) */}
        {isAdmin && cells.length > 1 && (
          <div className="mb-6 animate-fade-in">
            <label className="block text-sm font-medium text-dark-300 mb-2">Selecionar Célula</label>
            <select
              value={selectedCellId || ''}
              onChange={(e) => setSelectedCellId(Number(e.target.value))}
              className="input-field max-w-xs"
            >
              {cells.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {loadingMeetings ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="card text-center py-16 animate-fade-in">
            <Calendar className="w-14 h-14 text-dark-700 mx-auto mb-4" />
            <p className="text-dark-500 text-lg">Nenhuma reunião para validar</p>
            <p className="text-sm text-dark-600 mt-1">As reuniões passadas aparecerão aqui para validação</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m, i) => (
              <div
                key={`${m.cell_id}-${m.date}-${i}`}
                className="card-hover stagger-item"
                style={{ animationFillMode: 'both' }}
              >
                <div className="flex items-center gap-4">
                  {/* Date badge */}
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-[0_2px_14px_rgba(191,36,122,0.15)]"
                    style={{
                      background: m.validated
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.12))'
                        : 'linear-gradient(135deg, rgba(191,36,122,0.15), rgba(217,115,26,0.12))',
                    }}
                  >
                    <span className={`text-lg font-extrabold leading-none ${m.validated ? 'text-emerald-400' : 'text-gold-400'}`}>
                      {new Date(m.date.split('T')[0] + 'T00:00:00').getDate()}
                    </span>
                    <span className="text-[10px] text-dark-500 capitalize">
                      {new Date(m.date.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-dark-50">{m.title}</h3>
                      {m.validated && (
                        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />Validada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-500 mt-0.5 capitalize">{formatDate(m.date)}</p>
                    <p className="text-xs text-dark-600 mt-0.5">{m.time} • {m.location}</p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => openValidation(m)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      m.validated
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-gold-500/10 text-gold-400 hover:bg-gold-500/20'
                    }`}
                  >
                    {m.validated ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Ver / Editar
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Validar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Validation form view
  if (view === 'validate' && currentMeeting) {
    return (
      <div>
        <div className="mb-6 animate-fade-in">
          <button
            onClick={() => setView('meetings')}
            className="flex items-center gap-1 text-sm text-dark-400 hover:text-dark-50 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-gold-500" />
            Validar Presença
          </h1>
          <div className="mt-2 p-3 bg-dark-850/50 rounded-xl">
            <p className="font-semibold text-dark-50 text-sm">{currentMeeting.title}</p>
            <p className="text-xs text-dark-500 mt-1 capitalize">{formatDate(currentMeeting.date)} às {currentMeeting.time}</p>
            <p className="text-xs text-dark-600 mt-0.5">{currentMeeting.location}</p>
          </div>
        </div>

        {loadingValidation ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : (
          <>
            {/* Quem confirmou presença */}
            <div className="mb-6 animate-fade-in">
              <h2 className="text-sm font-bold text-dark-300 mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gold-500" />
                Confirmaram Presença ({confirmedUsers.length})
              </h2>
              <p className="text-xs text-dark-600 mb-3">
                Marque quem realmente compareceu. Desmarque quem confirmou mas não foi.
              </p>

              {confirmedUsers.length === 0 ? (
                <p className="text-sm text-dark-600 bg-dark-850/30 rounded-xl px-4 py-3">
                  Ninguém confirmou presença nesta reunião
                </p>
              ) : (
                <div className="space-y-2">
                  {confirmedUsers.map((u) => (
                    <div
                      key={u.user_id}
                      onClick={() => toggleUser(u.user_id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedUserIds.has(u.user_id)
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-dark-850/30 border border-dark-800/30 hover:bg-dark-850/50'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          selectedUserIds.has(u.user_id)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-dark-800 text-dark-600'
                        }`}
                      >
                        {selectedUserIds.has(u.user_id) ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-100 truncate">{u.name}</p>
                        {u.phone && <p className="text-[11px] text-dark-500">{u.phone}</p>}
                      </div>
                      <span className="text-[10px] text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded-full font-medium">
                        Confirmou
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Membros extras que foram (não confirmaram mas estavam presentes) */}
            {/* Mostrar membros que não confirmaram mas foram marcados como presentes */}
            {Array.from(selectedUserIds).filter((id) => !confirmedSet.has(id)).length > 0 && (
              <div className="mb-6 animate-fade-in">
                <h2 className="text-sm font-bold text-dark-300 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  Adicionados Manualmente
                </h2>
                <div className="space-y-2">
                  {Array.from(selectedUserIds)
                    .filter((id) => !confirmedSet.has(id))
                    .map((userId) => {
                      const member = allMembers.find((m) => m.id === userId);
                      if (!member) return null;
                      return (
                        <div
                          key={userId}
                          onClick={() => toggleUser(userId)}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 bg-blue-500/10 border border-blue-500/20"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-500 text-white transition-all">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark-100 truncate">{member.name}</p>
                            {member.phone && <p className="text-[11px] text-dark-500">{member.phone}</p>}
                          </div>
                          <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-medium">
                            Não confirmou
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Botão para adicionar membros que não confirmaram */}
            <div className="mb-6 animate-fade-in">
              <button
                onClick={() => setShowAddMembers(!showAddMembers)}
                className="flex items-center gap-2 text-sm font-semibold text-dark-400 hover:text-dark-50 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar membro que não confirmou
                {showAddMembers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAddMembers && (
                <div className="mt-3 p-4 bg-dark-850/30 rounded-xl border border-dark-800/30">
                  {/* Busca */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input
                      type="text"
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                      placeholder="Buscar membro..."
                      className="input-field pl-10 text-sm"
                    />
                  </div>

                  {filteredAvailableMembers.length === 0 ? (
                    <p className="text-sm text-dark-600 text-center py-4">
                      {searchMember ? 'Nenhum membro encontrado' : 'Todos os membros já estão na lista'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredAvailableMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            toggleUser(m.id);
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-dark-800/50"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-dark-800 text-dark-500">
                            <UserPlus className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark-200 truncate">{m.name}</p>
                            {m.phone && <p className="text-[11px] text-dark-500">{m.phone}</p>}
                          </div>
                          <span className="text-[10px] text-dark-500">
                            {m.role === 'leader' ? 'Líder' : 'Membro'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resumo e botão salvar */}
            <div className="card animate-fade-in">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-dark-400">
                  <Users className="w-4 h-4 text-gold-500" />
                  <span>
                    <strong className="text-dark-100">{selectedUserIds.size}</strong> pessoa{selectedUserIds.size !== 1 ? 's' : ''} presente{selectedUserIds.size !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-xs text-dark-600">
                  {Array.from(selectedUserIds).filter((id) => confirmedSet.has(id)).length} confirmaram •{' '}
                  {Array.from(selectedUserIds).filter((id) => !confirmedSet.has(id)).length} não confirmaram
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="spinner w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {currentMeeting.validated ? 'Atualizar Validação' : 'Confirmar Validação'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // History view
  if (view === 'history') {
    return (
      <div>
        <div className="mb-8 animate-fade-in">
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-gold-500" />
            Validação de Presença
          </h1>
          <p className="page-subtitle">Histórico de validações realizadas</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 animate-fade-in">
          <button
            onClick={() => setView('meetings')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-dark-400 hover:text-dark-50 hover:bg-dark-850/60 transition-all"
          >
            <ClipboardCheck className="w-4 h-4" />
            Validar
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-500 to-[#D9731A] text-white shadow-gold"
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
        </div>

        {/* Filter (admin only) */}
        {isAdmin && cells.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <label className="block text-sm font-medium text-dark-300 mb-2">Filtrar por Célula</label>
            <select
              value={filterCellId}
              onChange={(e) => setFilterCellId(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">Todas as células</option>
              {cells.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {loadingHistory ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : history.length === 0 ? (
          <div className="card text-center py-16 animate-fade-in">
            <History className="w-14 h-14 text-dark-700 mx-auto mb-4" />
            <p className="text-dark-500 text-lg">Nenhuma validação registrada</p>
            <p className="text-sm text-dark-600 mt-1">As validações de presença aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h, i) => (
              <div
                key={`${h.cell_id}-${h.date}-${i}`}
                className="card-hover stagger-item cursor-pointer"
                style={{ animationFillMode: 'both' }}
                onClick={() => openDetail(h)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-[0_2px_14px_rgba(16,185,129,0.15)]"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.12))' }}
                  >
                    <span className="text-lg font-extrabold leading-none text-emerald-400">
                      {new Date(h.date.split('T')[0] + 'T00:00:00').getDate()}
                    </span>
                    <span className="text-[10px] text-dark-500 capitalize">
                      {new Date(h.date.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-dark-50">{h.cell_name}</h3>
                    </div>
                    <p className="text-xs text-dark-500 mt-0.5 capitalize">{formatDate(h.date)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-500" />
                        {h.total_present} presente{h.total_present !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-gold-500" />
                        {h.confirmed_present} confirmaram
                      </span>
                      {h.unconfirmed_present > 0 && (
                        <span className="flex items-center gap-1">
                          <UserPlus className="w-3 h-3 text-blue-400" />
                          {h.unconfirmed_present} não confirmaram
                        </span>
                      )}
                    </div>
                  </div>

                  <Eye className="w-4 h-4 text-dark-600 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Detail view
  if (view === 'detail' && detailMeeting) {
    return (
      <div>
        <div className="mb-6 animate-fade-in">
          <button
            onClick={() => setView('history')}
            className="flex items-center gap-1 text-sm text-dark-400 hover:text-dark-50 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao Histórico
          </button>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-gold-500" />
            Detalhes da Validação
          </h1>
          <div className="mt-2 p-3 bg-dark-850/50 rounded-xl">
            <p className="font-semibold text-dark-50 text-sm">{detailMeeting.cell_name}</p>
            <p className="text-xs text-dark-500 mt-1 capitalize">{formatDate(detailMeeting.date)}</p>
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : detailData.length === 0 ? (
          <div className="card text-center py-12 animate-fade-in">
            <p className="text-dark-500">Nenhum dado encontrado</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {detailData.map((d) => (
              <div
                key={d.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  d.was_confirmed
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    d.was_confirmed ? 'bg-emerald-500' : 'bg-blue-500'
                  } text-white`}
                >
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-100 truncate">{d.user_name}</p>
                  {d.user_phone && <p className="text-[11px] text-dark-500">{d.user_phone}</p>}
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    d.was_confirmed
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-blue-400 bg-blue-500/10'
                  }`}
                >
                  {d.was_confirmed ? 'Confirmou' : 'Não confirmou'}
                </span>
              </div>
            ))}

            {/* Resumo */}
            <div className="card mt-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-dark-400">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span><strong className="text-dark-100">{detailData.length}</strong> presente{detailData.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-dark-400">
                  <CheckCircle2 className="w-4 h-4 text-gold-500" />
                  <span><strong className="text-dark-100">{detailData.filter((d) => d.was_confirmed).length}</strong> confirmaram</span>
                </div>
                <div className="flex items-center gap-2 text-dark-400">
                  <XCircle className="w-4 h-4 text-blue-400" />
                  <span><strong className="text-dark-100">{detailData.filter((d) => !d.was_confirmed).length}</strong> não confirmaram</span>
                </div>
              </div>
            </div>

            {/* Botão para editar */}
            <button
              onClick={() => {
                const meeting = meetings.find(
                  (m) => m.cell_id === detailMeeting.cell_id && m.date === detailMeeting.date
                );
                if (meeting) {
                  openValidation(meeting);
                } else {
                  openValidation({
                    cell_id: detailMeeting.cell_id,
                    title: detailMeeting.cell_name,
                    date: detailMeeting.date,
                    time: '',
                    location: '',
                    cell_name: detailMeeting.cell_name,
                    validated: true,
                  });
                }
              }}
              className="w-full btn-secondary flex items-center justify-center gap-2 mt-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              Editar Validação
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
