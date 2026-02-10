import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Study } from '../types';
import {
  BookOpen,
  Search,
  FileText,
  Download,
  Tag,
  Calendar,
  User,
  Filter,
  X,
  Sparkles,
} from 'lucide-react';

export default function Studies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadStudies(); }, [search, selectedCategory]);

  const loadCategories = async () => {
    try { setCategories(await api.getStudyCategories()); } catch (err) { console.error(err); }
  };

  const loadStudies = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      setStudies(await api.getStudies(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');

  return (
    <div>
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-gold-500" />
          Estudos Bíblicos
        </h1>
        <p className="page-subtitle">Acesse os materiais disponíveis</p>
      </div>

      {/* Filtros */}
      <div className="card mb-6 animate-fade-in-down">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou palavras-chave..."
              className="input-field pl-10"
            />
          </div>
          <div className="relative sm:w-48">
            <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field pl-10 appearance-none cursor-pointer"
            >
              <option value="">Todas categorias</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="spinner w-8 h-8" />
        </div>
      ) : studies.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <BookOpen className="w-14 h-14 text-dark-700 mx-auto mb-4" />
          <p className="text-dark-500 text-lg">Nenhum estudo encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
            <div
              key={study.id}
              className="card-hover cursor-pointer group stagger-item"
              style={{ animationFillMode: 'both' }}
              onClick={() => setSelectedStudy(study)}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_2px_12px_rgba(191,36,122,0.15)] group-hover:shadow-[0_4px_18px_rgba(191,36,122,0.25)] transition-shadow duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.12), rgba(217,115,26,0.1))' }}>
                  <FileText className="w-5 h-5 text-gold-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-dark-50 truncate group-hover:text-gold-400 transition-colors">{study.title}</h3>
                  {study.category && (
                    <span className="badge-gold mt-1 text-[10px]">
                      <Tag className="w-2.5 h-2.5 mr-1" />
                      {study.category}
                    </span>
                  )}
                </div>
              </div>

              {study.description && (
                <p className="mt-3 text-sm text-dark-500 line-clamp-2">{study.description}</p>
              )}

              <div className="mt-3 pt-3 flex items-center justify-between text-[11px] text-dark-600" style={{ borderTop: 'none', boxShadow: 'var(--inset-highlight)' }}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(study.created_at)}
                </span>
                {study.created_by_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {study.created_by_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedStudy && (
        <div className="modal-overlay" onClick={() => setSelectedStudy(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_2px_14px_rgba(191,36,122,0.2)]"
                    style={{ background: 'linear-gradient(135deg, rgba(191,36,122,0.15), rgba(217,115,26,0.12))' }}>
                    <Sparkles className="w-5 h-5 text-gold-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-dark-50">{selectedStudy.title}</h2>
                    {selectedStudy.category && <span className="badge-gold mt-1 text-[10px]"><Tag className="w-2.5 h-2.5 mr-1" />{selectedStudy.category}</span>}
                  </div>
                </div>
                <button onClick={() => setSelectedStudy(null)} className="p-2 hover:bg-dark-850 rounded-xl text-dark-500 hover:text-dark-50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedStudy.description && <p className="text-dark-300 mb-5">{selectedStudy.description}</p>}

              {selectedStudy.content && (
                <div className="mb-5 p-5 bg-dark-850/50 rounded-xl text-dark-300 text-sm whitespace-pre-wrap leading-relaxed shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
                  {selectedStudy.content}
                </div>
              )}

              {selectedStudy.keywords && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-dark-400 mb-2">Palavras-chave:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudy.keywords.split(',').map((kw, i) => (
                      <span key={i} className="badge-dark text-[11px]">{kw.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedStudy.file_path && (
                <a href={selectedStudy.file_path} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex">
                  <Download className="w-4 h-4" />Baixar arquivo
                </a>
              )}

              <div className="divider-gold my-5" />
              <div className="flex items-center justify-between text-sm text-dark-600">
                <span>Publicado em {formatDate(selectedStudy.created_at)}</span>
                {selectedStudy.created_by_name && <span>Por {selectedStudy.created_by_name}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
