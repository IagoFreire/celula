import { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Calendar, Clock, MapPin, CalendarDays, Users, X, XCircle, RotateCcw, AlertTriangle,
} from 'lucide-react';

interface GeneratedMeeting {
  cell_id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  cell_name: string;
  description?: string;
  frequency?: string;
  member_count?: number;
  cancelled?: boolean;
  cancel_reason?: string | null;
}

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

export default function AdminSchedules() {
  const [meetings, setMeetings] = useState<GeneratedMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<GeneratedMeeting | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getSchedules();
      setMeetings(data as unknown as GeneratedMeeting[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      setSubmitting(true);
      await api.cancelSchedule(cancelTarget.cell_id, cancelTarget.date, cancelReason);
      setCancelTarget(null);
      setCancelReason('');
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (m: GeneratedMeeting) => {
    if (!confirm('Deseja reativar esta reunião?')) return;
    try {
      await api.reactivateSchedule(m.cell_id, m.date);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const formatDate = (d: string) => {
    const datePart = typeof d === 'string' ? d.split('T')[0] : d;
    return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  };

  // Agrupar por mês
  const grouped = meetings.reduce<Record<string, GeneratedMeeting[]>>((acc, m) => {
    const datePart = m.date.split('T')[0];
    const d = new Date(datePart + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2"><CalendarDays className="w-6 h-6 text-gold-500" />Cronograma</h1>
        <p className="page-subtitle">Gerado automaticamente a partir das células cadastradas</p>
      </div>

      {meetings.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <Calendar className="w-14 h-14 text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-lg">Nenhuma reunião prevista</p>
          <p className="text-sm text-dark-600 mt-1">Configure o dia da semana e frequência nas células para gerar o cronograma</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([monthKey, items]) => (
            <div key={monthKey}>
              <h2 className="text-sm font-bold text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-500" />
                {monthLabel(monthKey)}
                <span className="text-dark-600 font-normal">({items.length} reuniões)</span>
              </h2>
              <div className="space-y-3">
                {items.map((m, i) => (
                  <div
                    key={`${m.cell_id}-${m.date}-${i}`}
                    className={`card-hover stagger-item ${m.cancelled ? 'opacity-60' : ''}`}
                    style={{ animationFillMode: 'both' }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Date badge */}
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-[0_2px_14px_rgba(191,36,122,0.15)]`}
                        style={{ background: m.cancelled
                          ? 'linear-gradient(135deg, rgba(127,127,127,0.15), rgba(127,127,127,0.12))'
                          : 'linear-gradient(135deg, rgba(191,36,122,0.15), rgba(217,115,26,0.12))'
                        }}>
                        <span className={`text-lg font-extrabold leading-none ${m.cancelled ? 'text-dark-500' : 'text-gold-400'}`}>
                          {new Date(m.date.split('T')[0] + 'T00:00:00').getDate()}
                        </span>
                        <span className="text-[10px] text-dark-500 capitalize">
                          {new Date(m.date.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-bold ${m.cancelled ? 'text-dark-500 line-through' : 'text-dark-50'}`}>{m.title}</h3>
                          {m.frequency && (
                            <span className="text-[10px] text-dark-600 bg-dark-850 px-2 py-0.5 rounded-full">{FREQ_LABELS[m.frequency] || m.frequency}</span>
                          )}
                          {m.cancelled && (
                            <span className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                              <XCircle className="w-3 h-3" />Cancelada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-dark-500 mt-0.5 capitalize">{formatDate(m.date)}</p>

                        {m.cancelled && m.cancel_reason && (
                          <div className="mt-2 flex items-start gap-1.5 text-sm text-red-400/80 bg-red-500/5 px-3 py-2 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{m.cancel_reason}</span>
                          </div>
                        )}

                        {!m.cancelled && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gold-600" />{m.time}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold-600" />{m.location}</span>
                            {m.member_count != null && (
                              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gold-600" />{m.member_count} membro{m.member_count !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 self-center ml-2">
                        {m.cancelled ? (
                          <button
                            onClick={() => handleReactivate(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="Reativar reunião"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reativar
                          </button>
                        ) : (
                          <button
                            onClick={() => { setCancelTarget(m); setCancelReason(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Cancelar reunião"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cancelamento */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-dark-50 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  Cancelar Reunião
                </h3>
                <button onClick={() => setCancelTarget(null)} className="p-2 hover:bg-dark-850 rounded-xl text-dark-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-5 p-3 bg-dark-850/50 rounded-xl">
                <p className="font-semibold text-dark-50 text-sm">{cancelTarget.title}</p>
                <p className="text-xs text-dark-500 mt-1 capitalize">{formatDate(cancelTarget.date)} às {cancelTarget.time}</p>
                <p className="text-xs text-dark-600 mt-0.5">{cancelTarget.location}</p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-dark-300 mb-2">Motivo do cancelamento</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Ex: Feriado, líder indisponível, evento especial..."
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {submitting ? <div className="spinner w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Confirmar Cancelamento
                </button>
                <button
                  onClick={() => setCancelTarget(null)}
                  className="btn-secondary text-sm"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
