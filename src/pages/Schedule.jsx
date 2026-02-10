import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  Circle,
  BookOpen,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedulesData, myAttendance] = await Promise.all([
        api.getUpcomingSchedules(),
        api.getMyAttendance(),
      ]);
      setSchedules(schedulesData);
      const map = {};
      myAttendance.forEach((a) => { map[a.schedule_id] = true; });
      setAttendanceMap(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleAttendance = async (scheduleId) => {
    setConfirmingId(scheduleId);
    try {
      if (attendanceMap[scheduleId]) {
        await api.cancelAttendance(scheduleId);
        setAttendanceMap((prev) => { const next = { ...prev }; delete next[scheduleId]; return next; });
        setSchedules((prev) => prev.map((s) => s.id === scheduleId ? { ...s, confirmed_count: s.confirmed_count - 1 } : s));
      } else {
        await api.confirmAttendance(scheduleId);
        setAttendanceMap((prev) => ({ ...prev, [scheduleId]: true }));
        setSchedules((prev) => prev.map((s) => s.id === scheduleId ? { ...s, confirmed_count: s.confirmed_count + 1 } : s));
      }
    } catch (err) { console.error(err); }
    finally { setConfirmingId(null); }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
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

      {schedules.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <Calendar className="w-14 h-14 text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-lg">Nenhuma reunião agendada</p>
          <p className="text-dark-600 text-sm mt-1">As próximas reuniões aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule, index) => {
            const date = formatDate(schedule.date);
            const isConfirmed = attendanceMap[schedule.id];
            const isConfirming = confirmingId === schedule.id;

            return (
              <div
                key={schedule.id}
                className="card-hover stagger-item"
                style={{ animationFillMode: 'both' }}
              >
                <div className="flex gap-4">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-[0_2px_14px_rgba(191,36,122,0.15)]"
                    style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.15), rgba(217,115,26,0.12))' }}>
                    <span className="text-[10px] font-bold text-gold-600 uppercase tracking-wider">{date.month}</span>
                    <span className="text-2xl font-extrabold text-gold-400 leading-none">{date.day}</span>
                    <span className="text-[10px] text-dark-500">{date.dayName}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-dark-50 text-[15px]">{schedule.title}</h3>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-dark-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gold-600" />
                        {schedule.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gold-600" />
                        {schedule.location}
                      </span>
                      {schedule.leader_name && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gold-600" />
                          {schedule.leader_name}
                        </span>
                      )}
                    </div>

                    {schedule.cell_name && (
                      <span className="badge-gold mt-2 text-[11px]">{schedule.cell_name}</span>
                    )}

                    {schedule.study_title && (
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-gold-500/70">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="truncate">{schedule.study_title}</span>
                      </div>
                    )}

                    {schedule.notes && (
                      <p className="mt-2 text-sm text-dark-600 line-clamp-2">{schedule.notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 flex items-center justify-between" style={{ paddingTop: '0.85rem', marginTop: '0.85rem' }}>
                  <span className="flex items-center gap-1.5 text-sm text-dark-500">
                    <Users className="w-4 h-4" />
                    {schedule.confirmed_count} confirmado{schedule.confirmed_count !== 1 ? 's' : ''}
                  </span>

                  <button
                    onClick={() => toggleAttendance(schedule.id)}
                    disabled={isConfirming}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-95 ${
                      isConfirmed
                        ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_2px_10px_rgba(16,185,129,0.15)]'
                        : 'bg-gold-500/10 text-gold-400 shadow-[0_2px_10px_rgba(217,115,26,0.12)] hover:shadow-[0_4px_18px_rgba(217,115,26,0.2)]'
                    }`}
                  >
                    {isConfirming ? (
                      <div className="spinner w-4 h-4" />
                    ) : isConfirmed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    {isConfirmed ? 'Confirmado' : 'Confirmar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
