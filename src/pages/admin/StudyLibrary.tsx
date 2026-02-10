import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { api } from '../../api';
import type { Study, StudyForm } from '../../types';
import {
  Plus, Pencil, Trash2, FileText, Upload, X, Save, Search, Tag, Download, BookOpen, Library,
} from 'lucide-react';

export default function AdminStudyLibrary() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<StudyForm>({ title: '', description: '', content: '', category: '', keywords: '' });

  useEffect(() => { loadData(); }, [search, filterCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      const [s, c] = await Promise.all([api.getStudies(params), api.getStudyCategories()]);
      setStudies(s); setCategories(c);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = () => { setForm({ title: '', description: '', content: '', category: '', keywords: '' }); setFile(null); setEditingId(null); setShowForm(false); };
  const openEdit = (s: Study) => { setForm({ title: s.title, description: s.description || '', content: s.content || '', category: s.category || '', keywords: s.keywords || '' }); setEditingId(s.id); setFile(null); setShowForm(true); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (file) formData.append('file', file);
      if (editingId) await api.updateStudy(editingId, formData); else await api.createStudy(formData);
      resetForm(); loadData();
    } catch (err) { alert((err as Error).message); }
  };

  const handleDelete = async (id: number) => { if (!confirm('Excluir este estudo?')) return; try { await api.deleteStudy(id); loadData(); } catch (err) { alert((err as Error).message); } };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  if (loading && studies.length === 0) return <div className="flex items-center justify-center py-20"><div className="spinner w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="page-title flex items-center gap-2"><Library className="w-6 h-6 text-gold-500" />Biblioteca de Estudos</h1>
          <p className="page-subtitle">Gerencie os materiais bíblicos</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Novo Estudo</span>
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6 animate-fade-in-down">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estudos..." className="input-field pl-10" /></div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field sm:w-48"><option value="">Todas categorias</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-gradient mb-6 animate-fade-in-down">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-dark-50">{editingId ? 'Editar Estudo' : 'Novo Estudo'}</h3>
            <button onClick={resetForm} className="p-1.5 hover:bg-dark-850 rounded-lg text-dark-500"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Título *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required placeholder="Título do estudo" /></div>
              <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Categoria</label><input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" placeholder="Ex: Evangelhos, Salmos..." list="cat-list" /><datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
            </div>
            <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Descrição</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Breve descrição..." /></div>
            <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Conteúdo</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field" rows={6} placeholder="Conteúdo do estudo..." /></div>
            <div><label className="block text-sm font-medium text-dark-400 mb-1.5">Palavras-chave</label><input type="text" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="input-field" placeholder="Separadas por vírgula: fé, oração, salvação" /></div>
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1.5">Arquivo (PDF, DOC, TXT)</label>
              <div className="rounded-xl p-5 text-center cursor-pointer group transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(191,36,122,0.04), rgba(217,115,26,0.03))',
                  boxShadow: 'inset 0 0 0 2px rgba(76,68,130,0.3)',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(217,115,26,0.3), 0 0 20px rgba(217,115,26,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(76,68,130,0.3)')}>
                <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-dark-600 mx-auto mb-2 group-hover:text-gold-500 transition-colors" />
                  <p className="text-sm text-dark-500">{file ? file.name : 'Clique para selecionar'}</p>
                  <p className="text-xs text-dark-600 mt-1">Máximo 10MB</p>
                </label>
              </div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn-primary"><Save className="w-4 h-4" />{editingId ? 'Atualizar' : 'Criar'}</button><button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button></div>
          </form>
        </div>
      )}

      {/* List */}
      {studies.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in"><BookOpen className="w-14 h-14 text-dark-700 mx-auto mb-4" /><p className="text-dark-500 text-lg">Nenhum estudo cadastrado</p></div>
      ) : (
        <div className="space-y-3">
          {studies.map((s) => (
            <div key={s.id} className="card-hover stagger-item" style={{ animationFillMode: 'both' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(191,36,122,0.15)]"
                    style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.12), rgba(217,115,26,0.1))' }}>
                    <FileText className="w-5 h-5 text-gold-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-dark-50">{s.title}</h3>
                    {s.description && <p className="text-sm text-dark-500 mt-0.5 line-clamp-1">{s.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {s.category && <span className="badge-gold text-[10px]"><Tag className="w-2.5 h-2.5 mr-1" />{s.category}</span>}
                      {s.file_path && <a href={s.file_path} target="_blank" rel="noopener noreferrer" className="badge bg-blue-500/10 text-blue-400 text-[10px] shadow-[0_1px_4px_rgba(59,130,246,0.12)] hover:bg-blue-500/20 transition-colors"><Download className="w-2.5 h-2.5 mr-1" />Arquivo</a>}
                      <span className="text-xs text-dark-600">{fmtDate(s.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                  <button onClick={() => openEdit(s)} className="p-2 hover:bg-dark-850 rounded-lg text-dark-500 hover:text-blue-400 transition-all"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-dark-850 rounded-lg text-dark-500 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
