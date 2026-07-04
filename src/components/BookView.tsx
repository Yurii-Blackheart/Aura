import React, { useState, useEffect } from 'react';
import { BOOK_DATA, EXTRA_STORIES } from '../data';
import { BookChapter } from '../types';
import { 
  ArrowLeft, BookOpen, Compass, Sparkles, Sliders, Moon, Sun, 
  ScrollText, Maximize2, Minimize2, Map, Eye, EyeOff, BookMarked, 
  Layers, HelpCircle, Compass as CompassIcon, Sparkles as SparklesIcon,
  Plus, Edit, Trash2, Save, X
} from 'lucide-react';
import BookLoreGraph from './BookLoreGraph';
import { DEFAULT_BOOKS, getBookDefaultChapters, getBookDefaultExtraStories } from '../booksData';

interface BookViewProps {
  initialChapterId?: string | null;
  onBackToHub: () => void;
  chapters?: BookChapter[];
  onUpdateChapters?: (chapters: BookChapter[]) => void;
  extraStories?: BookChapter[];
  onUpdateExtraStories?: (stories: BookChapter[]) => void;
  canEdit?: boolean;
  activeModule?: string;
  onNavigateToModule?: (module: 'book' | 'lore-graph' | 'world-map') => void;
}

type BookTabType = 'reader' | 'stories-notes' | 'lore-graph' | 'world-map';

export default function BookView({ 
  initialChapterId, 
  onBackToHub,
  chapters = BOOK_DATA,
  onUpdateChapters,
  extraStories = EXTRA_STORIES,
  onUpdateExtraStories,
  canEdit = false,
  activeModule,
  onNavigateToModule
}: BookViewProps) {
  // Navigation active tab: 'reader' | 'stories-notes' | 'lore-graph' | 'world-map'
  const [localActiveTab, setLocalActiveTab] = useState<BookTabType>('reader');

  const activeTab = activeModule 
    ? (activeModule === 'lore-graph' ? 'lore-graph' : (activeModule === 'world-map' ? 'world-map' : (localActiveTab === 'stories-notes' ? 'stories-notes' : 'reader')))
    : localActiveTab;

  const setActiveTab = (tab: BookTabType) => {
    if (onNavigateToModule) {
      if (tab === 'reader' || tab === 'stories-notes') onNavigateToModule('book');
      else if (tab === 'lore-graph') onNavigateToModule('lore-graph');
      else if (tab === 'world-map') onNavigateToModule('world-map');
    }
    setLocalActiveTab(tab);
  };

  const visibleChapters = canEdit
    ? chapters
    : chapters.filter(c => !c.isDraft);

  const visibleExtraStories = canEdit
    ? extraStories
    : extraStories.filter(s => !s.isDraft);

  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    return localStorage.getItem('prism_active_book_id') || 'glass-prism';
  });
  const [isBooksDropdownOpen, setIsBooksDropdownOpen] = useState(false);

  const handleSelectBook = (bookId: string) => {
    if (bookId === selectedBookId) {
      setIsBooksDropdownOpen(false);
      return;
    }

    // Save current book's custom chapters before leaving
    localStorage.setItem(`prism_book_chapters_${selectedBookId}`, JSON.stringify(chapters));
    localStorage.setItem(`prism_extra_stories_${selectedBookId}`, JSON.stringify(extraStories));

    setSelectedBookId(bookId);
    localStorage.setItem('prism_active_book_id', bookId);

    const savedChapters = localStorage.getItem(`prism_book_chapters_${bookId}`);
    const savedStories = localStorage.getItem(`prism_extra_stories_${bookId}`);

    const newChapters = savedChapters ? JSON.parse(savedChapters) : getBookDefaultChapters(bookId);
    const newStories = savedStories ? JSON.parse(savedStories) : getBookDefaultExtraStories(bookId);

    if (onUpdateChapters) onUpdateChapters(newChapters);
    if (onUpdateExtraStories) onUpdateExtraStories(newStories);

    const filteredNewChapters = canEdit ? newChapters : newChapters.filter((c: any) => !c.isDraft);
    const filteredNewStories = canEdit ? newStories : newStories.filter((s: any) => !s.isDraft);
    const firstChapter = filteredNewChapters[0] || filteredNewStories[0];
    if (firstChapter) {
      setActiveChapter(firstChapter);
    }

    setIsBooksDropdownOpen(false);
    setActiveTab('reader');
  };

  const getActiveBookName = () => {
    const bk = DEFAULT_BOOKS.find(b => b.id === selectedBookId);
    return bk ? bk.title : 'Читати Книгу';
  };

  const [activeChapter, setActiveChapter] = useState<BookChapter>(() => {
    if (initialChapterId) {
      const foundChapter = visibleChapters.find(c => c.id === initialChapterId) || 
                           visibleExtraStories.find(s => s.id === initialChapterId);
      if (foundChapter) return foundChapter;
    }
    return visibleChapters[0] || visibleExtraStories[0];
  });

  // Immersive reading full-screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Keyboard escape listener for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync initialChapterId if it changes externally
  useEffect(() => {
    if (initialChapterId) {
      const found = visibleChapters.find(c => c.id === initialChapterId) || 
                    visibleExtraStories.find(s => s.id === initialChapterId);
      if (found) {
        setActiveChapter(found);
        setActiveTab('reader'); // Ensure reader tab is open to read it
      }
    }
  }, [initialChapterId, visibleChapters, visibleExtraStories]);

  // Synchronize activeChapter if the lists are updated from outside
  useEffect(() => {
    if (activeChapter) {
      const current = visibleChapters.find(c => c.id === activeChapter.id) || 
                      visibleExtraStories.find(s => s.id === activeChapter.id);
      if (current && JSON.stringify(current) !== JSON.stringify(activeChapter)) {
        setActiveChapter(current);
      } else if (!current) {
        if (visibleChapters.length > 0) setActiveChapter(visibleChapters[0]);
        else if (visibleExtraStories.length > 0) setActiveChapter(visibleExtraStories[0]);
      }
    } else {
      if (visibleChapters.length > 0) setActiveChapter(visibleChapters[0]);
      else if (visibleExtraStories.length > 0) setActiveChapter(visibleExtraStories[0]);
    }
  }, [visibleChapters, visibleExtraStories]);

  // Reading Theme Local to Book Module
  const [readTheme, setReadTheme] = useState<'paper' | 'dark' | 'white'>('paper');

  // Completed chapters tracking
  const [readChapters, setReadChapters] = useState<string[]>(() => {
    const saved = localStorage.getItem('prism_read_chapters');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('prism_read_chapters', JSON.stringify(readChapters));
  }, [readChapters]);

  const toggleReadChapter = (chapterId: string) => {
    setReadChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const cycleTheme = () => {
    if (readTheme === 'paper') setReadTheme('dark');
    else if (readTheme === 'dark') setReadTheme('white');
    else setReadTheme('paper');
  };

  const getThemeClasses = () => {
    switch (readTheme) {
      case 'paper':
        return 'bg-[#F9F5EB] border-[#EADEC9] text-[#2C2518]';
      case 'dark':
        return 'bg-[#121214] border-[#222226] text-[#E4E4E6]';
      case 'white':
        return 'bg-white dark:bg-[#121824] border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  const getThemeIcon = () => {
    switch (readTheme) {
      case 'paper':
        return <ScrollText className="w-4 h-4 text-amber-700 dark:text-amber-500" />;
      case 'dark':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'white':
        return <Sun className="w-4 h-4 text-amber-500" />;
    }
  };

  const getThemeLabel = () => {
    switch (readTheme) {
      case 'paper': return 'Папір';
      case 'dark': return 'Ніч';
      case 'white': return 'День';
    }
  };

  const getChapterIndex = (chapterId: string) => {
    const index = chapters.findIndex(c => c.id === chapterId);
    return index >= 0 ? index + 1 : null;
  };

  const handleSelectChapter = (ch: BookChapter) => {
    setActiveChapter(ch);
    const isMainChapter = chapters.some(c => c.id === ch.id);
    setActiveTab(isMainChapter ? 'reader' : 'stories-notes');
  };

  // World map ideas local storage
  const [mapIdea, setMapIdea] = useState('');
  const [mapIdeas, setMapIdeas] = useState<string[]>(() => {
    const saved = localStorage.getItem('prism_map_ideas');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSaveMapIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapIdea.trim()) return;
    const updated = [mapIdea, ...mapIdeas];
    setMapIdeas(updated);
    localStorage.setItem('prism_map_ideas', JSON.stringify(updated));
    setMapIdea('');
  };

  // Editing Forms and States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Fields
  const [formId, setFormId] = useState('');
  const [formType, setFormType] = useState<'chapter' | 'story'>('chapter');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formReadingTime, setFormReadingTime] = useState('5 хв читання');
  const [formContent, setFormContent] = useState('');
  const [formLore, setFormLore] = useState('');
  const [formIsDraft, setFormIsDraft] = useState(false);

  const openCreateForm = () => {
    setFormMode('create');
    setFormId(`book-${Date.now()}`);
    setFormType('chapter');
    setFormTitle('');
    setFormSubtitle('');
    setFormReadingTime('5 хв читання');
    setFormContent('');
    setFormLore('');
    setFormIsDraft(false);
    setIsFormOpen(true);
  };

  const openEditForm = (item: BookChapter) => {
    const isMainChapter = chapters.some(c => c.id === item.id);
    
    setFormMode('edit');
    setFormId(item.id);
    setFormType(isMainChapter ? 'chapter' : 'story');
    setFormTitle(item.title);
    setFormSubtitle(item.subtitle);
    setFormReadingTime(item.readingTime);
    setFormContent(item.content.join('\n\n'));
    setFormLore(
      item.lore ? item.lore.map(l => `${l.title}: ${l.text}`).join('\n') : ''
    );
    setFormIsDraft(!!item.isDraft);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    // Parse content paragraphs
    const paragraphs = formContent.split('\n\n').map(p => p.trim()).filter(p => p !== '');

    // Parse lore pairs (Format: "Title: Text")
    const loreLines = formLore.split('\n').map(l => l.trim()).filter(l => l !== '');
    const parsedLore = loreLines.map(line => {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        return {
          title: line.substring(0, idx).trim(),
          text: line.substring(idx + 1).trim()
        };
      }
      return { title: line, text: '' };
    });

    const targetItem: BookChapter = {
      id: formId,
      title: formTitle,
      subtitle: formSubtitle,
      readingTime: formReadingTime,
      content: paragraphs,
      lore: parsedLore,
      isDraft: formIsDraft
    };

    if (formMode === 'create') {
      if (formType === 'chapter') {
        const updated = [...chapters, targetItem];
        if (onUpdateChapters) onUpdateChapters(updated);
      } else {
        const updated = [...extraStories, targetItem];
        if (onUpdateExtraStories) onUpdateExtraStories(updated);
      }
      setActiveChapter(targetItem);
    } else {
      // Edit mode
      if (formType === 'chapter') {
        // If it was chapter, keep it in chapter
        const updated = chapters.map(c => c.id === formId ? targetItem : c);
        if (onUpdateChapters) onUpdateChapters(updated);
        // Ensure it's removed from stories if it changed type (optional, keep it simple)
        const updatedStories = extraStories.filter(s => s.id !== formId);
        if (onUpdateExtraStories) onUpdateExtraStories(updatedStories);
      } else {
        const updated = extraStories.map(s => s.id === formId ? targetItem : s);
        if (onUpdateExtraStories) onUpdateExtraStories(updated);
        const updatedChapters = chapters.filter(c => c.id !== formId);
        if (onUpdateChapters) onUpdateChapters(updatedChapters);
      }
    }

    setIsFormOpen(false);
  };

  const handleDelete = (itemId: string) => {
    const updatedChapters = chapters.filter(c => c.id !== itemId);
    const updatedStories = extraStories.filter(s => s.id !== itemId);
    
    if (onUpdateChapters) onUpdateChapters(updatedChapters);
    if (onUpdateExtraStories) onUpdateExtraStories(updatedStories);

    if (updatedChapters.length > 0) {
      setActiveChapter(updatedChapters[0]);
    } else if (updatedStories.length > 0) {
      setActiveChapter(updatedStories[0]);
    }
  };

  return (
    <div id="book-module" className="min-h-screen bg-[#FAF9FC] dark:bg-[#090d16] pb-20 font-sans text-gray-800 dark:text-gray-100">
      {/* Decorative Top Accent */}
      <div className="h-1.5 w-full bg-[#8338EC]" />

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between border-b border-purple-100/30 dark:border-purple-900/30">
        <button
          id="book-back-btn"
          onClick={onBackToHub}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#8338EC] dark:hover:text-[#8338EC] transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Повернутися до Hub</span>
        </button>

        <div className="flex items-center gap-4">
          {canEdit && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#8338EC] hover:bg-[#6c2ec4] text-white px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm animate-pulse-slow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати розділ / оповідання</span>
            </button>
          )}

          <span 
            id="book-brand-logo" 
            onClick={onBackToHub}
            className="font-display font-bold text-lg text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-[#8338EC] transition"
          >
            Aura<span className="text-[#8338EC]">.</span>Book
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10">
        {(activeTab === 'reader' || activeTab === 'stories-notes') ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Side Navigation & Chapter Directory */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. Global World Navigation Menu */}
            <div className="bg-white dark:bg-[#121824] border border-purple-100/40 dark:border-purple-900/30 rounded-2xl p-4 shadow-sm space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-gray-400 dark:text-gray-500 px-1 block">
                Навігація по всесвіту
              </span>
              
              <div className="flex flex-col gap-2">
                {/* Book Selector Dropdown Button */}
                <div className="relative">
                  <button
                    id="tab-reader-btn"
                    onClick={() => {
                      if (activeTab !== 'reader') {
                        setActiveTab('reader');
                        setIsBooksDropdownOpen(true);
                      } else {
                        setIsBooksDropdownOpen(!isBooksDropdownOpen);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'reader'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 bg-gray-50/50 dark:bg-gray-800/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span className="truncate">{getActiveBookName()}</span>
                    </div>
                    <span className={`text-[9px] transition-transform duration-200 ${isBooksDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {isBooksDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#1a2333] border border-purple-100/80 dark:border-purple-900/50 rounded-xl shadow-xl z-30 overflow-hidden py-1">
                      {DEFAULT_BOOKS.map((b) => (
                        <button
                          key={b.id}
                          id={`book-select-${b.id}`}
                          onClick={() => handleSelectBook(b.id)}
                          className={`w-full text-left px-3.5 py-2.5 text-xs transition flex flex-col gap-0.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/40 ${
                            selectedBookId === b.id && activeTab === 'reader'
                              ? 'bg-purple-50/50 dark:bg-purple-950/20 text-[#8338EC] dark:text-purple-400 font-semibold'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full gap-1.5">
                            <span className="font-semibold truncate">{b.title}</span>
                            {selectedBookId === b.id && activeTab === 'reader' && <span className="text-[10px] text-[#8338EC] dark:text-purple-400 font-bold">✓</span>}
                          </div>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate leading-tight">{b.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tab: Stories & Notes */}
                <button
                  id="tab-stories-notes-btn"
                  onClick={() => {
                    setActiveTab('stories-notes');
                    setIsBooksDropdownOpen(false);
                    const hasActiveStory = activeChapter && extraStories.some(s => s.id === activeChapter.id);
                    if (!hasActiveStory && extraStories.length > 0) {
                      setActiveChapter(extraStories[0]);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'stories-notes'
                      ? 'bg-[#8338EC] text-white shadow-md shadow-purple-500/10'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 bg-gray-50/50 dark:bg-gray-800/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Оповідання та Нотатки</span>
                </button>
              </div>

              {/* Show "Лор книги" and "Карта світу" ONLY when in reader mode (main book chapters) */}
              {activeTab === 'reader' && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-purple-100/30 dark:border-purple-900/30">
                  <button
                    id="tab-lore-btn"
                    onClick={() => setActiveTab('lore-graph')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'lore-graph'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Лор книги (Граф)</span>
                  </button>

                  <button
                    id="tab-map-btn"
                    onClick={() => setActiveTab('world-map')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'world-map'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <Map className="w-4 h-4" />
                    <span>Карта світу</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Main Book Chapters */}
            {activeTab === 'reader' && (
              <div className="bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/30 rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-xs tracking-tight flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-2">
                  <BookMarked className="w-3.5 h-3.5 text-[#8338EC]" />
                  <span>Зміст Книги</span>
                </h3>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {visibleChapters.map((ch, idx) => {
                    const isRead = readChapters.includes(ch.id);
                    const isActive = activeChapter && activeChapter.id === ch.id && activeTab === 'reader';
                    return (
                      <button
                        key={ch.id}
                        id={`book-chapter-btn-${ch.id}`}
                        onClick={() => handleSelectChapter(ch)}
                        className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition flex items-start gap-2 cursor-pointer ${
                          isActive
                            ? 'bg-purple-50/50 dark:bg-purple-950/20 border-[#8338EC]/30 dark:border-[#8338EC]/50 text-gray-900 dark:text-white shadow-sm font-semibold'
                            : 'bg-white dark:bg-[#1a2333]/30 border-transparent dark:border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">0{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-gray-800 dark:text-gray-200 flex items-center justify-between gap-1">
                            <span className="truncate">{ch.title.replace(/Розділ \d+:\s*/, '')}</span>
                            {ch.isDraft && (
                              <span className="bg-amber-500 text-white text-[7px] uppercase font-bold px-1 py-0.5 rounded tracking-wider shrink-0 font-sans">
                                Чернетка
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                            <span>{ch.readingTime}</span>
                            {isRead && <span className="text-emerald-500 dark:text-emerald-400 font-semibold">• Прочитано</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {visibleChapters.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-4">Немає розділів</p>
                  )}
                </div>
              </div>
            )}

            {/* 3. Short Stories & Notes section underneath */}
            {activeTab === 'stories-notes' && (
              <div className="bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/30 rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-xs tracking-tight flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Оповідання та Нотатки</span>
                </h3>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {visibleExtraStories.map((story) => {
                    const isActive = activeChapter && activeChapter.id === story.id && activeTab === 'stories-notes';
                    return (
                      <button
                        key={story.id}
                        id={`book-extra-btn-${story.id}`}
                        onClick={() => handleSelectChapter(story)}
                        className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition flex items-start gap-2.5 cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 text-gray-900 dark:text-white shadow-sm font-semibold'
                            : 'bg-white dark:bg-[#1a2333]/30 border-transparent dark:border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span className="text-amber-500 text-xs mt-0.5">✦</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-gray-800 dark:text-gray-200 flex items-center justify-between gap-1">
                            <span className="truncate">{story.title}</span>
                            {story.isDraft && (
                              <span className="bg-amber-500 text-white text-[7px] uppercase font-bold px-1 py-0.5 rounded tracking-wider shrink-0 font-sans">
                                Чернетка
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{story.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                  {visibleExtraStories.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-4">Немає оповідань</p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* MAIN COLUMN(S) */}
          {(activeTab === 'reader' || activeTab === 'stories-notes') && (
            <>
              {/* MIDDLE PANEL: Immersive Book Text (Col span 9) */}
              <div className="lg:col-span-9 space-y-6">
                {activeChapter ? (
                  <div 
                    id={`book-reading-container`} 
                    className={`border rounded-3xl p-6 sm:p-10 shadow-sm transition-all duration-300 space-y-6 relative overflow-hidden ${getThemeClasses()}`}
                  >
                    
                    {/* Top metadata & Centralized Cycle theme/fullscreen controls */}
                    <div className="flex items-center justify-between border-b border-current/10 pb-4 text-[10px] font-mono uppercase tracking-wider opacity-70">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {getChapterIndex(activeChapter.id) !== null ? `РОЗДІЛ 0${getChapterIndex(activeChapter.id)}` : 'ПОЗА СЮЖЕТОМ'}
                        </span>
                      </div>

                      {/* Centralized Controls inside Reader Block */}
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <div className="flex items-center gap-1 mr-3 border-r border-current/10 pr-3">
                            <button
                              onClick={() => openEditForm(activeChapter)}
                              className="p-1 rounded hover:bg-current/10 transition cursor-pointer flex items-center justify-center text-blue-600"
                              title="Редагувати вміст"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="p-1 rounded hover:bg-current/10 transition cursor-pointer flex items-center justify-center text-red-500"
                              title="Видалити"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <button
                          id="book-pref-theme-cycle-btn"
                          onClick={cycleTheme}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-current/5 hover:bg-current/10 border border-current/15 transition text-[10px] cursor-pointer"
                          title={`Режим читання: ${getThemeLabel()}. Клацніть для зміни.`}
                        >
                          {getThemeIcon()}
                          <span>{getThemeLabel()}</span>
                        </button>

                        <button
                          id="book-fullscreen-btn"
                          onClick={() => setIsFullScreen(true)}
                          className="p-1 rounded bg-current/5 hover:bg-current/10 border border-current/15 transition cursor-pointer flex items-center justify-center"
                          title="Розширити на весь екран"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Main Titles */}
                    <div className="space-y-2 text-center pt-2">
                      <h1 className="font-serif font-extrabold text-2xl sm:text-3xl leading-tight flex flex-wrap items-center justify-center gap-2">
                        <span>{activeChapter.title.replace(/Розділ \d+:\s*/, '')}</span>
                        {activeChapter.isDraft && (
                          <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider font-sans shrink-0">
                            Чернетка
                          </span>
                        )}
                      </h1>
                      <p className="font-serif italic opacity-75 text-xs sm:text-sm">{activeChapter.subtitle}</p>
                    </div>

                    {/* Story text */}
                    <div className="font-serif text-base sm:text-lg leading-relaxed space-y-6 pt-4 select-text max-h-[55vh] overflow-y-auto pr-2">
                      {activeChapter.content.map((paragraph, index) => (
                        <p key={index} className="indent-4 text-justify">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Chapter completion action */}
                    <div className="pt-5 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                      <p className="font-sans opacity-70">Прочитали цей розділ? Позначте прогрес:</p>
                      <button
                        id="book-mark-read-btn"
                        onClick={() => toggleReadChapter(activeChapter.id)}
                        className={`px-4 py-2 rounded-xl font-semibold cursor-pointer transition ${
                           readChapters.includes(activeChapter.id)
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-[#8338EC] text-white hover:bg-[#8338EC]/90'
                        }`}
                      >
                        {readChapters.includes(activeChapter.id) ? '✓ Прочитано' : 'Позначити як прочитаний'}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 bg-white dark:bg-[#121824] border border-gray-150 rounded-3xl">
                    <p className="text-gray-400">Немає доступного вмісту.</p>
                  </div>
                )}
              </div>
            </>
          )}

          </div>
        ) : (
          /* SEPARATE IMMERSIVE PAGES FOR GRAPH / MAP */
          <div className="space-y-6 animate-fade-in">
            
            {/* Immersive Sub-Navigation Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#121824] p-4 rounded-2xl border border-purple-100/40 dark:border-purple-900/30 shadow-sm">
              <button
                onClick={() => setActiveTab('reader')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8338EC] hover:text-[#6c2ec4] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад до Читання («{getActiveBookName()}»)</span>
              </button>
              <div className="flex items-center gap-2">
                                <button
                  onClick={() => setActiveTab('lore-graph')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'lore-graph' ? 'bg-[#8338EC] text-white shadow-md shadow-purple-500/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  Лор книги (Граф)
                </button>
                <button
                  onClick={() => setActiveTab('world-map')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'world-map' ? 'bg-[#8338EC] text-white shadow-md shadow-purple-500/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  Карта світу
                </button>
              </div>
            </div>

            {/* LORE GRAPH VIEW */}
            {activeTab === 'lore-graph' && (
              <div className="w-full bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-4 sm:p-6 shadow-sm">
                <BookLoreGraph canEdit={canEdit} />
              </div>
            )}

            {/* WORLD MAP VIEW */}
            {activeTab === 'world-map' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
                
                {/* Left side: Immersive Blueprint Map (Col span 8) */}
                <div className="lg:col-span-8 bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-6 shadow-sm min-h-[500px] relative flex flex-col justify-between overflow-hidden">
                  
                  {/* Background blueprints decorative blueprint lines */}
                  <div className="absolute inset-0 opacity-5 dark:opacity-[0.03] pointer-events-none bg-[radial-gradient(#8338ec_1.2px,transparent_1.2px)] [background-size:16px_16px]" />
                  
                  <div className="space-y-2 relative z-10">
                    <span className="text-[10px] uppercase font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded font-bold">
                      КАРТОГРАФІЯ ВСЕСВІТУ
                    </span>
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white tracking-tight">
                      Топографічна Карта Світу Скляної Призми
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-550 max-w-2xl">
                      Вивчайте географічне розташування Храму Світла, Спектральних Садів, Долини Тіней та заломлювальних хребтів у майбутніх експедиціях.
                    </p>
                  </div>

                  <div className="my-6 border border-dashed border-purple-200 dark:border-purple-900/50 rounded-2xl p-8 sm:p-14 text-center bg-purple-500/[0.01] flex flex-col items-center justify-center gap-6 min-h-[280px] relative z-10">
                    
                    {/* Mythical Compass rose graphic */}
                    <div className="relative w-28 h-28 border border-purple-200 dark:border-purple-900/60 rounded-full flex items-center justify-center animate-[spin_40s_linear_infinite]">
                      <div className="absolute w-24 h-24 border border-dashed border-purple-100 dark:border-purple-950 rounded-full" />
                      <div className="absolute h-full w-[1px] bg-purple-100 dark:bg-purple-950" />
                      <div className="absolute w-full h-[1px] bg-purple-100 dark:bg-purple-950" />
                      <CompassIcon className="w-10 h-10 text-purple-300 dark:text-purple-900 stroke-[1]" />
                      <span className="absolute top-1 font-mono text-[8px] text-purple-400">Пн</span>
                      <span className="absolute bottom-1 font-mono text-[8px] text-purple-400">Пд</span>
                      <span className="absolute right-1 font-mono text-[8px] text-purple-400">Сх</span>
                      <span className="absolute left-1 font-mono text-[8px] text-purple-400">Зх</span>
                    </div>

                    <div className="space-y-1.5 max-w-md">
                      <h4 className="font-serif font-bold text-base text-gray-800 dark:text-gray-200">
                        Території покриті спектральним туманом...
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Карта світу наразі розробляється. Ви можете запропонувати свої ідеї щодо локацій, річок, або фрактальних гірських масивів у полі праворуч.
                      </p>
                    </div>
                  </div>
                  
                </div>

                {/* Right side: Interactive Suggestions & Location Ideas Panel (Col span 4) */}
                <div className="lg:col-span-4 bg-white dark:bg-[#121824] border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-6 shadow-sm space-y-6">
                  
                  <div className="space-y-1 pb-3 border-b border-gray-100 dark:border-gray-850">
                    <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-550 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8338EC]" />
                      <span>Скринька ідей</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 dark:text-gray-550">
                      Запропонуйте локації, пам'ятки або фрактальні річки.
                    </p>
                  </div>

                  {/* Interactive suggestion builder Form */}
                  <form onSubmit={handleSaveMapIdea} className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-300">
                      Запропонуйте локацію або ідею:
                    </h4>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl py-2.5 px-3 text-xs outline-none focus:bg-white text-gray-850 dark:text-gray-200"
                        placeholder="наприклад: Озеро Опалу"
                        value={mapIdea}
                        onChange={e => setMapIdea(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-sm shadow-purple-500/10"
                      >
                        Надіслати
                      </button>
                    </div>
                  </form>

                  {/* Suggested locations list */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-300">
                      Запропоновані локації спільнотою ({mapIdeas.length}):
                    </h4>
                    
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {mapIdeas.map((idea, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 p-2.5 bg-purple-500/[0.03] dark:bg-purple-500/[0.02] hover:bg-purple-500/[0.05] rounded-xl border border-purple-500/10 text-xs text-gray-700 dark:text-gray-300 font-medium transition"
                        >
                          <CompassIcon className="w-3.5 h-3.5 text-[#8338EC] shrink-0" />
                          <span className="truncate">{idea}</span>
                        </div>
                      ))}
                      {mapIdeas.length === 0 && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-550 italic text-center py-6">
                          Скриня пропозицій наразі пуста...
                        </p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}



      {/* FULL SCREEN IMMERSIVE READING MODAL */}
      {isFullScreen && activeChapter && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black flex items-start justify-center py-10 px-4 sm:py-20">
          <div className={`w-full max-w-3xl rounded-3xl p-8 sm:p-16 space-y-8 relative shadow-2xl ${getThemeClasses()}`}>
            
            <button
              id="book-close-fullscreen-btn"
              onClick={() => setIsFullScreen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-current/10 transition cursor-pointer flex items-center justify-center"
              title="Закрити повноекранний режим"
            >
              <Minimize2 className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-current/10 pb-4 text-[10px] font-mono uppercase tracking-wider opacity-70">
              <span>{getChapterIndex(activeChapter.id) !== null ? `РОЗДІЛ 0${getChapterIndex(activeChapter.id)}` : 'ПОЗА СЮЖЕТОМ'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={cycleTheme}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-current/5 border border-current/15 text-[10px]"
                >
                  {getThemeIcon()}
                  <span>{getThemeLabel()}</span>
                </button>
                <span>{activeChapter.readingTime}</span>
              </div>
            </div>

            <div className="space-y-3 text-center">
              <h1 className="font-serif font-black text-3xl sm:text-4xl leading-tight">
                {activeChapter.title.replace(/Розділ \d+:\s*/, '')}
              </h1>
              <p className="font-serif italic opacity-75 text-sm sm:text-base">{activeChapter.subtitle}</p>
            </div>

            <div className="font-serif text-lg sm:text-xl leading-relaxed space-y-6 text-justify select-text pt-6">
              {activeChapter.content.map((paragraph, index) => (
                <p key={index} className="indent-6">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-8 border-t border-current/10 text-center text-xs opacity-60 font-mono">
              [ Натисніть ESC або кнопку у верхньому кутку, щоб вийти з повноекранного режиму ]
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL OVERLAY */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-850 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white">
                {formMode === 'create' ? 'Створити матеріал' : 'Редагувати матеріал'}
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
                    ID Матеріалу (Slug, латиницею)
                  </label>
                  <input 
                    type="text"
                    required
                    disabled={formMode === 'edit'}
                    value={formId}
                    onChange={e => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] disabled:opacity-50 transition text-sm font-mono"
                    placeholder="chapter-four"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Тип вмісту
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as 'chapter' | 'story')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] transition text-sm font-sans"
                  >
                    <option value="chapter">Розділ книги (Зміст)</option>
                    <option value="story">Оповідання або Нотатка</option>
                  </select>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] transition text-sm"
                  placeholder="Заголовок..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Підзаголовок / Слогани
                  </label>
                  <input 
                    type="text"
                    required
                    value={formSubtitle}
                    onChange={e => setFormSubtitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] transition text-sm"
                    placeholder="Підзаголовок..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Час читання
                  </label>
                  <input 
                    type="text"
                    required
                    value={formReadingTime}
                    onChange={e => setFormReadingTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] transition text-sm"
                    placeholder="5 хв читання"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Лор-довідка (Опис понять, кожна пара "Поняття: Опис" з нового рядка)
                </label>
                <textarea 
                  rows={3}
                  value={formLore}
                  onChange={e => setFormLore(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] transition text-sm font-sans"
                  placeholder="Скляна Призма: Артефакт древніх, що заломлює простір і час.&#10;Храм Світла: Центр духовної сили..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Текст розділу / оповідання (розділяйте абзаци подвійним переносом рядка [Enter Enter])
                </label>
                <textarea 
                  required
                  rows={8}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#8338EC] transition text-sm font-serif"
                  placeholder="Одного разу у Спектральних Садах..."
                />
              </div>

              <div className="flex items-center gap-3 bg-purple-50/25 dark:bg-purple-950/10 p-4 rounded-2xl border border-purple-100/20 dark:border-purple-900/10">
                <input
                  type="checkbox"
                  id="formIsDraft"
                  checked={formIsDraft}
                  onChange={e => setFormIsDraft(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#8338EC] focus:ring-[#8338EC] cursor-pointer"
                />
                <label htmlFor="formIsDraft" className="text-xs font-medium text-gray-650 dark:text-gray-450 cursor-pointer select-none">
                  Зберегти як чернетку (приховати цей розділ/оповідання від звичайних відвідувачів)
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
                  className="flex items-center gap-1.5 bg-[#8338EC] hover:bg-[#6c2ec4] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in text-gray-800 dark:text-gray-100">
          <div className="w-full max-w-md bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-2">
              Підтвердження видалення
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 font-sans">
              Ви впевнені, що хочете видалити цей матеріал? Цю дію не можна буде скасувати.
            </p>
            <div className="flex gap-3 justify-end font-sans">
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
                  if (activeChapter) {
                    handleDelete(activeChapter.id);
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
  </div>
  );
}
