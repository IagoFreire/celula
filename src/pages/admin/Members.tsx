import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../api';
import type { Member, MemberForm } from '../../types';
import {
  Users, Pencil, Trash2, X, Save, Search, Phone, Shield, Calendar,
  CheckCircle2, ChevronRight,
} from 'lucide-react';

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [form, setForm] = useState<MemberForm>({ name: '', phone: '', role: 'member' });

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => { try { setLoading(true); setMembers(await api.getMembers()); } catch (err) { console.error(err); } finally { setLoading(false); } };

  const openEdit = (m: Member) => { setForm({ name: m.name, phone: m.phone || '', role: m.role }); setEditingId(m.id); };
  const cancelEdit = () => { setEditingId(null); setForm({ name: '', phone: '', role: 'member' }); };

  const handleUpdate = async (e: FormEvent) => { e.preventDefault(); try { if (editingId) await api.updateMember(editingId, { ...form }); cancelEdit(); loadMembers(); } catch (err) { alert((err as Error).message); } };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este membro?')) return;
    try { await api.deleteMember(id); loadMembers(); if (selectedMember?.id === id) setSelectedMember(null); }
    catch (err) { alert((err as Error).message); }
  };

  const viewDetails = async (id: number) => { try { setLoadingDetails(true); setSelectedMember(await api.getMember(id)); } catch (err) { console.error(err); } finally { setLoadingDetails(false); } };

  const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone || '').includes(search)
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2"><Users className="w-6 h-6 text-gold-500" />Membros</h1>
        <p className="page-subtitle">{members.length} membro{members.length !== 1 ? 's' : ''} cadastrado{members.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 animate-fade-in-down">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou celular..." className="input-field pl-10" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* List */}
        <div className="flex-1">
          {filteredMembers.length === 0 ? (
            <div className="card text-center py-16 animate-fade-in"><Users className="w-14 h-14 text-dark-700 mx-auto mb-4" /><p className="text-dark-500 text-lg">Nenhum membro encontrado</p></div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((m) => (
                <div key={m.id}>
                  {editingId === m.id ? (
                    <div className="card-gradient animate-scale-in">
                      <form onSubmit={handleUpdate} className="space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Nome" required />
                          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="Celular" required />
                          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field"><option value="member">Membro</option><option value="admin">Administrador</option></select>
                        </div>
                        <div className="flex gap-2"><button type="submit" className="btn-primary text-sm"><Save className="w-4 h-4" />Salvar</button><button type="button" onClick={cancelEdit} className="btn-secondary text-sm">Cancelar</button></div>
                      </form>
                    </div>
                  ) : (
                    <div
                      className={`card-hover cursor-pointer ${selectedMember?.id === m.id ? 'shadow-[0_4px_20px_rgba(217,115,26,0.15)]' : ''}`}
                      onClick={() => viewDetails(m.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-[#812B8C] rounded-xl flex items-center justify-center flex-shrink-0 shadow-gold">
                          <span className="text-sm font-bold text-white">{m.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-dark-50 text-sm truncate">{m.name}</span>
                            {m.role === 'admin' && <span className="badge-gold text-[10px]"><Shield className="w-2.5 h-2.5 mr-0.5" />Admin</span>}
                          </div>
                          <p className="text-xs text-dark-500 truncate">{m.phone || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-dark-600 hidden sm:block">{m.total_attendance} presenças</span>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-blue-400 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-600 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          <ChevronRight className="w-4 h-4 text-dark-700 hidden sm:block" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedMember && (
          <div className="lg:w-80 xl:w-96 animate-slide-in-right">
            <div className="card lg:sticky lg:top-4">
              {loadingDetails ? (
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
                    <p className="text-sm text-dark-500">{selectedMember.role === 'admin' ? '✦ Administrador' : 'Membro'}</p>
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
