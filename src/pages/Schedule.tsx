import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Loader2,
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

export default function Schedule() {
  const { user, isAdminOrLeader } = useAuth();
  const [meetings, setMeetings] = useState<GeneratedMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  // Map de "cell_id_date" -> true/false para presença confirmada
  const [confirmedMap, setConfirmedMap] = useState<Record<string, boolean>>({});
  // Map de "cell_id_date" -> count de confirmações
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  // Set de chaves em loading (botão individual)
  const [togglingSet, setTogglingSet] = useState<Set<string>>(new Set());

  const meetingKey = (cellId: number, date: string) => `${cellId}_${date}`;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUpcomingSchedules();
      const meetingsData = data as unknown as GeneratedMeeting[];
      setMeetings(meetingsData);

      // Buscar status de presença em batch para reuniões não canceladas
      const activeMeetings = meetingsData.filter(m => !m.cancelled);
      if (activeMeetings.length > 0 && user) {
        const uniqueMeetings = Array.from(
          new Map(activeMeetings.map(m => [meetingKey(m.cell_id, m.date), { cell_id: m.cell_id, date: m.date }])).values()
        );
        const { confirmed, counts } = await api.checkMeetingAttendanceBatch(uniqueMeetings);
        
        const cMap: Record<string, boolean> = {};
        for (const c of confirmed) {
          cMap[meetingKey(c.cell_id, c.date)] = true;
        }
        setConfirmedMap(cMap);

        const ctMap: Record<string, number> = {};
        for (const ct of counts) {
          ctMap[meetingKey(ct.cell_id, ct.date)] = ct.count;
        }
        setCountMap(ctMap);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleAttendance = async (cellId: number, date: string) => {
    const key = meetingKey(cellId, date);
    if (togglingSet.has(key)) return;

    setTogglingSet(prev => new Set(prev).add(key));
    try {
      const isConfirmed = confirmedMap[key];
      if (isConfirmed) {
        await api.cancelMeetingAttendance(cellId, date);
        setConfirmedMap(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setCountMap(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 1) - 1) }));
      } else {
        await api.confirmMeetingAttendance(cellId, date);
        setConfirmedMap(prev => ({ ...prev, [key]: true }));
        setCountMap(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingSet(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const datePart = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
    const date = new Date(datePart + 'T00:00:00');
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return { dayName: days[date.getDay()], day: date.getDate(), month: months[date.getMonth()] };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <Calendar className="w-6 h-6 text-gold-500" />
          Cronograma
        </h1>
        <p className="page-subtitle">Próximas reuniões de célula</p>
      </div>

      {meetings.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <Calendar className="w-14 h-14 text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-lg">Nenhuma reunião agendada</p>
          <p className="text-dark-600 text-sm mt-1">As próximas reuniões aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting, i) => {
            const date = formatDate(meeting.date);
            const key = meetingKey(meeting.cell_id, meeting.date);
            const isConfirmed = !!confirmedMap[key];
            const attendanceCount = countMap[key] || 0;
            const isToggling = togglingSet.has(key);

            return (
              <div
                key={`${meeting.cell_id}-${meeting.date}-${i}`}
                className={`card-hover stagger-item ${meeting.cancelled ? 'opacity-60' : ''}`}
                style={{ animationFillMode: 'both' }}
              >
                <div className="flex gap-4">
                  {/* Date Badge */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-[0_2px_14px_rgba(191,36,122,0.15)]`}
                    style={{ background: meeting.cancelled
                      ? 'linear-gradient(135deg, rgba(127,127,127,0.15), rgba(127,127,127,0.12))'
                      : 'linear-gradient(135deg, rgba(191,36,122,0.15), rgba(217,115,26,0.12))'
                    }}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${meeting.cancelled ? 'text-dark-600' : 'text-gold-600'}`}>{date.month}</span>
                    <span className={`text-2xl font-extrabold leading-none ${meeting.cancelled ? 'text-dark-500' : 'text-gold-400'}`}>{date.day}</span>
                    <span className="text-[10px] text-dark-500">{date.dayName}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold text-[15px] ${meeting.cancelled ? 'text-dark-500 line-through' : 'text-dark-50'}`}>{meeting.title}</h3>
                      {meeting.frequency && (
                        <span className="text-[10px] text-dark-600 bg-dark-850 px-2 py-0.5 rounded-full">{FREQ_LABELS[meeting.frequency] || meeting.frequency}</span>
                      )}
                      {meeting.cancelled && (
                        <span className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" />Cancelada
                        </span>
                      )}
                    </div>

                    {meeting.cancelled && meeting.cancel_reason && (
                      <div className="mt-2 flex items-start gap-1.5 text-sm text-red-400/80 bg-red-500/5 px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{meeting.cancel_reason}</span>
                      </div>
                    )}

                    {!meeting.cancelled && (
                      <>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-dark-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gold-600" />
                            {meeting.time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gold-600" />
                            {meeting.location}
                          </span>
                          {isAdminOrLeader && meeting.member_count != null && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-gold-600" />
                              {meeting.member_count} membro{meeting.member_count !== 1 ? 's' : ''}
                            </span>
                          )}
                          {isAdminOrLeader && attendanceCount > 0 && (
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <UserCheck className="w-3.5 h-3.5" />
                              {attendanceCount} confirmado{attendanceCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {meeting.cell_name && (
                          <span className="badge-gold mt-2 text-[11px]">{meeting.cell_name}</span>
                        )}

                        {meeting.description && (
                          <p className="mt-2 text-sm text-dark-600 line-clamp-2">{meeting.description}</p>
                        )}

                        {/* Botão de Confirmar Presença */}
                        {user && (
                          <button
                            onClick={() => toggleAttendance(meeting.cell_id, meeting.date)}
                            disabled={isToggling}
                            className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                              isConfirmed
                                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                                : 'bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 border border-gold-500/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isConfirmed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            {isConfirmed ? 'Presença Confirmada' : 'Confirmar Presença'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
