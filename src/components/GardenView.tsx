import React, { useState, useEffect } from 'react';
import { GARDEN_DATA } from '../data';
import { GardenNote } from '../types';
import { 
  ArrowLeft, Brain, Search, GitBranch, Share2, Tag, BookOpen, 
  Plus, Edit, Trash2, Save, X 
} from 'lucide-react';
import GardenGraph from './GardenGraph';

interface GardenViewProps {
  initialNoteId?: string | null;
  onBackToHub: () => void;
  notes?: GardenNote[];
  onUpdateNotes?: (notes: GardenNote[]) => void;
  canEdit?: boolean;
}

export default function GardenView({
  initialNoteId,
  onBackToHub,
  notes = GARDEN_DATA,
  onUpdateNotes,
  canEdit = false
}: GardenViewProps) {
  const visibleNotes = canEdit
    ? notes
    : notes.filter(n => !n.isDraft);

  const [activeNote, setActiveNote] = useState<GardenNote>(
    initialNoteId ? (visibleNotes.find(n => n.id === initialNoteId) || visibleNotes[0]) : visibleNotes[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Sync initialNoteId if it changes externally (e.g., search or surprise choice)
  useEffect(() => {
    if (initialNoteId) {
      const found = visibleNotes.find(n => n.id === initialNoteId);
      if (found) setActiveNote(found);
    }
  }, [initialNoteId, visibleNotes]);

  // Synchronize activeNote with dynamic notes array in case it is updated from outside
  useEffect(() => {
    if (activeNote) {
      const current = visibleNotes.find(n => n.id === activeNote.id);
      if (current && JSON.stringify(current) !== JSON.stringify(activeNote)) {
        setActiveNote(current);
      } else if (!current && visibleNotes.length > 0) {
        // Fallback if active note was deleted
        setActiveNote(visibleNotes[0]);
      }
    } else if (visibleNotes.length > 0) {
      setActiveNote(visibleNotes[0]);
    }
  }, [visibleNotes]);

  const categories = ['all', 'центр', 'системне-мислення', 'біохімія', 'кібернетика', 'філософія', 'книги', 'тренування'];

  // Handle note navigation
  const navigateToNote = (noteId: string) => {
    const target = visibleNotes.find(n => n.id === noteId);
    if (target) {
      setActiveNote(target);
    }
  };

  // Parse custom wikilinks [[note-id|label]] into clickable elements
  const renderContentWithWikiLinks = (text: string) => {
    const wikiLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|([^\]]+))?\]\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = wikiLinkRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add text before the match
      if (matchIndex > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, matchIndex)}</span>);
      }

      const noteId = match[1];
      const label = match[2] || noteId;

      const noteExists = visibleNotes.some(n => n.id === noteId);

      if (noteExists) {
        elements.push(
          <button
            key={`link-${matchIndex}`}
            onClick={() => navigateToNote(noteId)}
            className="text-[#1A73E8] hover:text-[#1A73E8]/80 font-medium underline underline-offset-2 transition decoration-dotted decoration-2 cursor-pointer inline"
          >
            {label}
          </button>
        );
      } else {
        elements.push(
          <span key={`link-broken-${matchIndex}`} className="text-gray-400 italic">
            {label} <sup>(немає)</sup>
          </span>
        );
      }

      lastIndex = wikiLinkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
    }

    return elements;
  };

  // Filtering notes
  const filteredNotes = visibleNotes.filter(n => {
    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Editor states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form fields
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('філософія');
  const [formTags, setFormTags] = useState('');
  const [formConnectedNotes, setFormConnectedNotes] = useState('');
  const [formIsDraft, setFormIsDraft] = useState(false);

  const openCreateForm = () => {
    setFormMode('create');
    setFormId(`note-${Date.now()}`);
    setFormTitle('');
    setFormContent('');
    setFormCategory('філософія');
    setFormTags('Запис, Ідея');
    setFormConnectedNotes('my-personality-center');
    setFormIsDraft(false);
    setIsFormOpen(true);
  };

  const openEditForm = (note: GardenNote) => {
    setFormMode('edit');
    setFormId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormTags(note.tags.join(', '));
    setFormConnectedNotes(note.connectedNotes.join(', '));
    setFormIsDraft(!!note.isDraft);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArray = formTags.split(',').map(t => t.trim()).filter(t => t !== '');
    const connectionsArray = formConnectedNotes.split(',').map(c => c.trim()).filter(c => c !== '');

    if (formMode === 'create') {
      const newNote: GardenNote = {
        id: formId,
        title: formTitle,
        category: formCategory,
        content: formContent,
        tags: tagsArray,
        connectedNotes: connectionsArray,
        isDraft: formIsDraft
      };

      const updated = [newNote, ...notes];
      if (onUpdateNotes) onUpdateNotes(updated);
      setActiveNote(newNote);
    } else {
      const updated = notes.map(n => {
        if (n.id === formId) {
          return {
            ...n,
            title: formTitle,
            category: formCategory,
            content: formContent,
            tags: tagsArray,
            connectedNotes: connectionsArray,
            isDraft: formIsDraft
          };
        }
        return n;
      });
      if (onUpdateNotes) onUpdateNotes(updated);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (noteId: string) => {
    if (noteId === 'my-personality-center') {
      alert('Ви не можете видалити центральний вузол особистості!');
      return;
    }
    const updated = notes.filter(n => n.id !== noteId);
    if (onUpdateNotes) onUpdateNotes(updated);
    if (updated.length > 0) {
      setActiveNote(updated[0]);
    }
  };

  return (
    <div id="garden-module" className="min-h-screen bg-[#F6F8FC] dark:bg-[#090d16] pb-20 font-sans text-gray-800 dark:text-gray-100">
      {/* Decorative Top Accent */}
      <div className="h-1.5 w-full bg-[#1A73E8]" />

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between border-b border-blue-100/40 dark:border-blue-900/30">
        <button
          id="garden-back-btn"
          onClick={onBackToHub}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#1A73E8] dark:hover:text-[#1A73E8] transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Повернутися до Hub</span>
        </button>

        <div className="flex items-center gap-4">
          {canEdit && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#1A73E8] hover:bg-[#155cb4] text-white px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати нотатку</span>
            </button>
          )}

          <span 
            id="garden-brand-logo" 
            onClick={onBackToHub}
            className="font-display font-bold text-lg text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-[#1A73E8] transition"
          >
            Aura<span className="text-[#1A73E8]">.</span>Garden
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Interactive Mind / Note Navigator (Col span 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#121824] border border-blue-100/50 dark:border-blue-900/30 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-2 border-b border-gray-50 dark:border-gray-855 pb-3">
                <GitBranch className="w-4 h-4 text-[#1A73E8]" />
                <span>Мережа Нотаток</span>
              </h3>

              {/* Mini Search Inside Garden */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  id="garden-search-input"
                  type="text"
                  placeholder="Пошук нотаток..."
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-blue-200 dark:focus:border-blue-800 text-gray-750 dark:text-gray-205 placeholder-gray-400 dark:placeholder-gray-500 transition"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    id={`garden-cat-pills-${cat}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[10px] font-medium px-2 py-1 rounded-md cursor-pointer transition ${
                      selectedCategory === cat
                        ? 'bg-[#1A73E8] text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat === 'all' ? 'Всі' : cat.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Notes List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {filteredNotes.map(n => (
                  <button
                    key={n.id}
                    id={`garden-note-list-btn-${n.id}`}
                    onClick={() => setActiveNote(n)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col gap-1.5 cursor-pointer ${
                      activeNote.id === n.id
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-[#1A73E8]/30 dark:border-[#1A73E8]/50 text-[#1A73E8] dark:text-[#60a5fa] shadow-sm'
                        : 'bg-white dark:bg-[#1a2333]/40 border-transparent dark:border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-semibold truncate flex items-center justify-between gap-2">
                      <span>{n.title}</span>
                      {n.isDraft && (
                        <span className="bg-amber-500 text-white text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-full tracking-wider shrink-0">
                          Чернетка
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                      <span className="capitalize">{n.category.replace('-', ' ')}</span>
                      <span>•</span>
                      <span>{n.connectedNotes.length} зв’язків</span>
                    </div>
                  </button>
                ))}
                {filteredNotes.length === 0 && (
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-4">Нотаток не знайдено</p>
                )}
              </div>
            </div>

            {/* Micro instructions on digital gardens */}
            <div className="p-4 rounded-2xl bg-[#1A73E8]/5 dark:bg-[#1A73E8]/10 border border-blue-100/30 dark:border-blue-950/20 text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-sans space-y-1.5">
              <div className="font-semibold flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 shrink-0 text-[#1A73E8] dark:text-[#60a5fa]" />
                <span>Що таке Сад Знань?</span>
              </div>
              <p className="text-gray-650 dark:text-gray-400 leading-relaxed">
                Це некомерційний спосіб ведення записів. Нотатки утворюють взаємопов’язаний граф за допомогою спеціальних внутрішніх посилань (вікілінків), які дозволяють легко подорожувати спорідненими концепціями.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: Note Content (Col span 8) */}
          <div className="lg:col-span-8">
            {activeNote ? (
              <div id={`garden-note-display-${activeNote.id}`} className="bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
                {/* Category and Tags */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 dark:border-gray-855 pb-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider bg-blue-50 dark:bg-blue-950/20 text-[#1A73E8] dark:text-[#60a5fa] font-bold px-2.5 py-1 rounded-md border border-blue-100/50 dark:border-blue-900/30">
                    {activeNote.category.replace('-', ' ')}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-2">
                      {activeNote.tags.map(t => (
                        <span key={t} className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500" />
                          {t}
                        </span>
                      ))}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-gray-800 pl-3">
                        <button
                          onClick={() => openEditForm(activeNote)}
                          className="flex items-center gap-1 text-[11px] font-semibold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Редагувати</span>
                        </button>
                        <button
                          onClick={() => {
                            if (activeNote.id === 'my-personality-center') {
                              alert('Ви не можете видалити центральний вузол особистості!');
                              return;
                            }
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Видалити</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 dark:text-white tracking-tight leading-none flex flex-wrap items-center gap-2">
                  <span>{activeNote.title}</span>
                  {activeNote.isDraft && (
                    <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider font-sans">
                      Чернетка
                    </span>
                  )}
                </h1>

                {/* Note Content (with parsed wikilinks) */}
                <div className="text-gray-750 dark:text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 font-sans border-b border-gray-50 dark:border-gray-800 pb-6 whitespace-pre-wrap">
                  {activeNote.content.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <p key={idx} className="font-semibold text-gray-900 dark:text-white">
                          {renderContentWithWikiLinks(paragraph)}
                        </p>
                      );
                    }
                    if (paragraph.startsWith('1.') || paragraph.startsWith('-')) {
                      return (
                        <ul key={idx} className="list-disc pl-5 space-y-2 font-sans">
                          {paragraph.split('\n').map((li, liIdx) => (
                            <li key={liIdx}>{renderContentWithWikiLinks(li.replace(/^[\d.-]\s+/, ''))}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={idx}>
                        {renderContentWithWikiLinks(paragraph)}
                      </p>
                    );
                  })}
                </div>

                {/* BACKLINKS SECTION (Connected notes) */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-[#1A73E8]" />
                    <span>Пов’язані матеріали ({activeNote.connectedNotes.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeNote.connectedNotes.map(noteId => {
                      const linkedNote = notes.find(n => n.id === noteId);
                      if (!linkedNote) return null;
                      return (
                        <div
                          key={noteId}
                          id={`garden-backlink-${noteId}`}
                          onClick={() => navigateToNote(noteId)}
                          className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-100 dark:hover:border-blue-900/60 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 cursor-pointer transition flex flex-col justify-between"
                        >
                          <h5 className="font-semibold text-xs text-gray-800 dark:text-gray-200 line-clamp-1 group-hover:text-[#1A73E8] dark:group-hover:text-[#60a5fa] transition">
                            {linkedNote.title}
                          </h5>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 capitalize">{linkedNote.category.replace('-', ' ')}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-[#121824] rounded-3xl border border-gray-150 dark:border-gray-800">
                <p className="text-gray-500">Немає доступних нотаток.</p>
              </div>
            )}
          </div>

        </div>

        {/* Dynamic Interactive Connection Graph */}
        <div className="mt-8">
          <GardenGraph activeNoteId={activeNote?.id || ''} onSelectNote={navigateToNote} notes={visibleNotes} />
        </div>

      </div>

      {/* EDIT/CREATE NOTE MODAL OVERLAY */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-850 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white">
                {formMode === 'create' ? 'Створити нотатку' : 'Редагувати нотатку'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  ID Нотатки (латиницею, без пробілів, наприклад: system-thinking)
                </label>
                <input 
                  type="text"
                  required
                  disabled={formMode === 'edit'}
                  value={formId}
                  onChange={e => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#1A73E8] disabled:opacity-50 transition text-sm font-mono"
                  placeholder="назва-ідентифікатор"
                />
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#1A73E8] transition text-sm"
                  placeholder="Заголовок нотатки..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Категорія
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#1A73E8] transition text-sm"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat.replace('-', ' ')}</option>
                    ))}
                  </select>
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#1A73E8] transition text-sm"
                    placeholder="Система, Філософія"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Зв’язані нотатки (ID через кому, наприклад: my-personality-center, eeg-neuro-focus)
                </label>
                <input 
                  type="text"
                  value={formConnectedNotes}
                  onChange={e => setFormConnectedNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#1A73E8] transition text-sm font-mono"
                  placeholder="ID інших нотаток..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Вміст (виклінки пишуться як `[[ід-нотатки|назва посилання]]`)
                </label>
                <textarea 
                  required
                  rows={8}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#1A73E8] transition text-sm"
                  placeholder="Текст нотатки..."
                />
              </div>

              <div className="flex items-center gap-3 bg-blue-50/20 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100/20 dark:border-blue-900/10">
                <input
                  type="checkbox"
                  id="formIsDraft"
                  checked={formIsDraft}
                  onChange={e => setFormIsDraft(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#1A73E8] focus:ring-[#1A73E8] cursor-pointer"
                />
                <label htmlFor="formIsDraft" className="text-xs font-medium text-gray-650 dark:text-gray-450 cursor-pointer select-none">
                  Зберегти як чернетку (приховати нотатку від звичайних відвідувачів)
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
                  className="flex items-center gap-1.5 bg-[#1A73E8] hover:bg-[#155cb4] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
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
              Ви впевнені, що хочете видалити цю нотатку? Цю дію не можна буде скасувати.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 transition cursor-pointer text-gray-750 dark:text-gray-300"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeNote) {
                    handleDelete(activeNote.id);
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
