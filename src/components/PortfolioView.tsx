import React, { useState, useEffect } from 'react';
import { PORTFOLIO_DATA } from '../data';
import { PortfolioProject } from '../types';
import { 
  ArrowLeft, Target, Cpu, Code2, ExternalLink, Calendar, 
  Plus, Edit, Trash2, Save, X 
} from 'lucide-react';

interface PortfolioViewProps {
  initialProjectId?: string | null;
  onBackToHub: () => void;
  projects?: PortfolioProject[];
  onUpdateProjects?: (projects: PortfolioProject[]) => void;
  canEdit?: boolean;
}

export default function PortfolioView({ 
  initialProjectId, 
  onBackToHub,
  projects = PORTFOLIO_DATA,
  onUpdateProjects,
  canEdit = false
}: PortfolioViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(
    initialProjectId ? (projects.find(p => p.id === initialProjectId) || null) : null
  );
  const [activeHeroImage, setActiveHeroImage] = useState<string>(() => {
    if (initialProjectId) {
      const found = projects.find(p => p.id === initialProjectId);
      return found ? found.image : '';
    }
    return '';
  });

  // If initialProjectId changes from outside, update selected active project
  useEffect(() => {
    if (initialProjectId) {
      const found = projects.find(p => p.id === initialProjectId);
      if (found) {
        setActiveProject(found);
        setActiveHeroImage(found.image);
      }
    }
  }, [initialProjectId, projects]);

  // Synchronize activeProject if the state changes externally
  useEffect(() => {
    if (activeProject) {
      const current = projects.find(p => p.id === activeProject.id);
      if (current) {
        if (JSON.stringify(current) !== JSON.stringify(activeProject)) {
          setActiveProject(current);
          setActiveHeroImage(current.image);
        }
      } else {
        setActiveProject(null);
        setActiveHeroImage('');
      }
    }
  }, [projects]);

  const categories = ['all', ...Array.from(new Set(projects.map(p => p.category)))];

  const visibleProjects = canEdit 
    ? projects 
    : projects.filter(p => !p.isDraft);

  const filteredProjects = selectedCategory === 'all'
    ? visibleProjects
    : visibleProjects.filter(p => p.category === selectedCategory);

  // Editor Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Розробка');
  const [formImage, setFormImage] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formResults, setFormResults] = useState('');
  const [formTechStack, setFormTechStack] = useState('');
  const [formImages, setFormImages] = useState('');
  const [formIsDraft, setFormIsDraft] = useState(false);

  const openCreateForm = () => {
    setFormMode('create');
    setFormId(`proj-${Date.now()}`);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Нейротехнології');
    setFormImage('https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80');
    setFormDetails('');
    setFormTags('React, TypeScript');
    setFormResults('');
    setFormTechStack('React, TypeScript, Tailwind');
    setFormImages('');
    setFormIsDraft(false);
    setIsFormOpen(true);
  };

  const openEditForm = (proj: PortfolioProject) => {
    setFormMode('edit');
    setFormId(proj.id);
    setFormTitle(proj.title);
    setFormDescription(proj.description);
    setFormCategory(proj.category);
    setFormImage(proj.image);
    setFormDetails(proj.details);
    setFormTags(proj.tags.join(', '));
    setFormResults(proj.results.join('\n'));
    setFormTechStack(proj.techStack.join(', '));
    setFormImages((proj.images || []).join('\n'));
    setFormIsDraft(!!proj.isDraft);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDetails.trim()) return;

    const tagsArray = formTags.split(',').map(t => t.trim()).filter(t => t !== '');
    const techArray = formTechStack.split(',').map(t => t.trim()).filter(t => t !== '');
    const resultsArray = formResults.split('\n').map(r => r.trim()).filter(r => r !== '');
    const imagesArray = formImages.split('\n').map(img => img.trim()).filter(img => img !== '');

    const targetProject: PortfolioProject = {
      id: formId,
      title: formTitle,
      description: formDescription || formDetails.substring(0, 150) + '...',
      category: formCategory,
      tags: tagsArray,
      image: formImage || 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
      details: formDetails,
      results: resultsArray,
      techStack: techArray,
      images: imagesArray,
      isDraft: formIsDraft
    };

    if (formMode === 'create') {
      const updated = [targetProject, ...projects];
      if (onUpdateProjects) onUpdateProjects(updated);
      setActiveProject(targetProject);
      setActiveHeroImage(targetProject.image);
    } else {
      const updated = projects.map(p => p.id === formId ? targetProject : p);
      if (onUpdateProjects) onUpdateProjects(updated);
      setActiveProject(targetProject);
      setActiveHeroImage(targetProject.image);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (projId: string) => {
    const updated = projects.filter(p => p.id !== projId);
    if (onUpdateProjects) onUpdateProjects(updated);
    setActiveProject(null);
    setActiveHeroImage('');
  };

  return (
    <div id="portfolio-module" className="min-h-screen bg-[#FDFBFB] dark:bg-[#090d16] pb-20 font-sans text-gray-800 dark:text-gray-100">
      {/* Decorative Top Accent */}
      <div className="h-1.5 w-full bg-[#E63946]" />

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80">
        <button
          id="portfolio-back-btn"
          onClick={onBackToHub}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#E63946] dark:hover:text-[#E63946] transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Повернутися до Hub</span>
        </button>

        <div className="flex items-center gap-4">
          {canEdit && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#E63946] hover:bg-[#c92f3b] text-white px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати проект</span>
            </button>
          )}

          {/* Brand logo in corner as per rules */}
          <span 
            id="portfolio-brand-logo" 
            onClick={onBackToHub}
            className="font-display font-bold text-lg text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-[#E63946] transition"
          >
            Aura<span className="text-[#E63946]">.</span>Portfolio
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-10">
        {activeProject ? (
          /* Project Detail View */
          <div id={`portfolio-project-details-${activeProject.id}`} className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
              <button
                id="portfolio-close-project-btn"
                onClick={() => setActiveProject(null)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                ← Назад до списку проектів
              </button>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditForm(activeProject)}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Редагувати</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Видалити</span>
                  </button>
                </div>
              )}
            </div>

            {/* Main Project Hero Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm aspect-video relative bg-gray-50 dark:bg-gray-900/10">
                  <img
                    src={activeHeroImage || activeProject.image}
                    alt={activeProject.title}
                    className="w-full h-full object-cover transition-all duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-900/95 px-3 py-1 rounded-full text-xs font-semibold text-[#E63946] shadow-sm border border-red-100 dark:border-red-950/40">
                    {activeProject.category}
                  </div>
                </div>

                {/* Additional Thumbnails Gallery */}
                {((activeProject.images && activeProject.images.length > 0) || activeProject.image) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[activeProject.image, ...(activeProject.images || [])]
                      .filter((img): img is string => typeof img === 'string' && img.trim() !== '')
                      .map((img, idx) => {
                        const isCurrent = (activeHeroImage || activeProject.image) === img;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveHeroImage(img)}
                            className={`w-16 sm:w-20 h-11 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                              isCurrent 
                                ? 'border-[#E63946] scale-95 shadow-sm' 
                                : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-250 dark:hover:border-gray-700'
                            }`}
                          >
                            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        );
                      })
                    }
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <h1 className="font-display font-bold text-3xl text-gray-900 dark:text-white tracking-tight leading-none flex flex-wrap items-center gap-2">
                  <span>{activeProject.title}</span>
                  {activeProject.isDraft && (
                    <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
                      Чернетка
                    </span>
                  )}
                </h1>
                <p className="text-gray-650 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {activeProject.details}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activeProject.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Split Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Results & Metrics */}
              <div className="md:col-span-2 border border-red-100/50 dark:border-red-950/40 rounded-2xl p-6 bg-gradient-to-br from-red-50/20 to-white dark:from-red-950/10 dark:to-[#121824]">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#E63946]" />
                  <span>Корисна дія та результати проекту</span>
                </h3>
                <ul className="space-y-3">
                  {activeProject.results.map((res, i) => (
                    <li key={i} className="flex gap-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <span className="font-mono text-[#E63946] font-semibold mt-0.5 shrink-0">0{i + 1}.</span>
                      <span>{res}</span>
                    </li>
                  ))}
                  {activeProject.results.length === 0 && (
                    <li className="text-xs text-gray-400 italic">Жодних метрик ще не додано.</li>
                  )}
                </ul>
              </div>

              {/* Technologies Used */}
              <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 bg-white dark:bg-[#121824] shadow-sm">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span>Стек технологій</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeProject.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                    >
                      <Code2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Portfolio List View */
          <div className="space-y-8 animate-fade-in">
            {/* Title Block */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#E63946] uppercase tracking-widest font-mono">
                Виставка робіт
              </span>
              <h1 className="font-display font-extrabold text-4xl text-gray-900 dark:text-white tracking-tight">
                Портфоліо Проектів
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
                Реальні розробки, апаратні рішення та нейротехнологічні експерименти з вимірними бізнес- та технічними показниками.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  id={`portfolio-cat-filter-${cat}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#E63946] text-white shadow-sm shadow-[#E63946]/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat === 'all' ? 'Всі напрямки' : cat}
                </button>
              ))}
            </div>

            {/* Projects Grid */}
            <div id="portfolio-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  id={`portfolio-project-card-${p.id}`}
                  onClick={() => { setActiveProject(p); setActiveHeroImage(p.image); }}
                  className="group cursor-pointer border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-[#121824] hover:border-[#E63946]/30 dark:hover:border-[#E63946]/30 hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                >
                  {/* Project Image */}
                  <div className="aspect-video relative overflow-hidden bg-gray-50 dark:bg-gray-900 shrink-0">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      <div className="bg-white/95 dark:bg-gray-900/95 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#E63946] border border-red-50 dark:border-red-950/40">
                        {p.category}
                      </div>
                      {p.isDraft && (
                        <div className="bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          Чернетка
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-gray-900 dark:text-white group-hover:text-[#E63946] transition-colors text-base tracking-tight line-clamp-1">
                        {p.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed font-sans">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 mt-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#E63946] font-mono flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Детальніше</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <div className="col-span-3 text-center py-10">
                  <p className="text-gray-400 text-sm">Проектів у цьому напрямку не знайдено.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE/EDIT MODAL OVERLAY */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-855 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white">
                {formMode === 'create' ? 'Додати проект' : 'Редагувати проект'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    ID Проекту (Slug, латиницею)
                  </label>
                  <input 
                    type="text"
                    required
                    disabled={formMode === 'edit'}
                    value={formId}
                    onChange={e => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] disabled:opacity-50 transition text-sm font-mono"
                    placeholder="eeg-neuro-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Категорія
                  </label>
                  <input 
                    type="text"
                    required
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                    placeholder="Нейротехнології / IoT"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Заголовок
                </label>
                <input 
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                  placeholder="Назва проекту..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Короткий опис для списку (Один-два абзаци)
                </label>
                <textarea 
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                  placeholder="Короткий слоган або опис ролі проекту..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  URL зображення обкладинки
                </label>
                <input 
                  type="text"
                  value={formImage}
                  onChange={e => setFormImage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm font-mono"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Додаткові фото (по одному посиланню на рядок)
                </label>
                <textarea 
                  rows={3}
                  value={formImages}
                  onChange={e => setFormImages(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm font-mono"
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Теги (через кому)
                </label>
                <input 
                  type="text"
                  required
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                  placeholder="EEG, React, Signal Processing"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Стек технологій (через кому)
                </label>
                <input 
                  type="text"
                  required
                  value={formTechStack}
                  onChange={e => setFormTechStack(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                  placeholder="Rust, WebAssembly, D3.js"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Корисна дія та результати (по одному пункту на рядок)
                </label>
                <textarea 
                  required
                  rows={3}
                  value={formResults}
                  onChange={e => setFormResults(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                  placeholder="Зниження часу входження в робочий фокус на 34%&#10;Реалізовано швидкий алгоритм Фур’є в браузері"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Детальна інформація про проект
                </label>
                <textarea 
                  required
                  rows={4}
                  value={formDetails}
                  onChange={e => setFormDetails(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#E63946] transition text-sm"
                  placeholder="Детальний опис проектування, розробки та випробувань..."
                />
              </div>

              <div className="flex items-center gap-3 bg-gray-55 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <input
                  type="checkbox"
                  id="formIsDraft"
                  checked={formIsDraft}
                  onChange={e => setFormIsDraft(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#E63946] focus:ring-[#E63946] cursor-pointer"
                />
                <label htmlFor="formIsDraft" className="text-xs font-medium text-gray-650 dark:text-gray-450 cursor-pointer select-none">
                  Зберегти як чернетку (приховати проект від звичайних відвідувачів)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50 dark:border-gray-800/60 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 transition cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-[#E63946] hover:bg-[#c92f3b] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Зберегти</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-2">
              Підтвердження видалення
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Ви впевнені, що хочете видалити цей проект з портфоліо? Цю дію не можна буде скасувати.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 transition cursor-pointer text-gray-700 dark:text-gray-300"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeProject) {
                    handleDelete(activeProject.id);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
