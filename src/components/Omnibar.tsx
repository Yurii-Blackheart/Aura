import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, CornerDownLeft, X, BookOpen, HeartPulse, Brain, Book, FolderGit2 } from 'lucide-react';
import { PORTFOLIO_DATA, BLOG_DATA, GARDEN_DATA, HEALTH_DATA, BOOK_DATA } from '../data';
import { SearchResult, ModuleType } from '../types';

interface OmnibarProps {
  onSelectResult: (module: ModuleType, itemId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  portfolioProjects?: any[];
  blogPosts?: any[];
  gardenNotes?: any[];
  healthProtocols?: any[];
  bookChapters?: any[];
}

export default function Omnibar({ 
  onSelectResult, 
  isOpen = false, 
  onClose,
  portfolioProjects = PORTFOLIO_DATA,
  blogPosts = BLOG_DATA,
  gardenNotes = GARDEN_DATA,
  healthProtocols = HEALTH_DATA,
  bookChapters = BOOK_DATA
}: OmnibarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input on mount or when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Core search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    // Search Portfolio
    portfolioProjects.forEach(p => {
      if (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some((t: string) => t.toLowerCase().includes(q))) {
        matches.push({
          id: p.id,
          title: p.title,
          snippet: p.description,
          module: 'portfolio',
          typeLabel: 'Проект'
        });
      }
    });

    // Search Blog
    blogPosts.forEach(b => {
      if (b.title.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q) || b.content.toLowerCase().includes(q)) {
        matches.push({
          id: b.id,
          title: b.title,
          snippet: b.summary,
          module: 'blog',
          typeLabel: 'Блог'
        });
      }
    });

    // Search Garden
    gardenNotes.forEach(g => {
      if (g.title.toLowerCase().includes(q) || g.content.toLowerCase().includes(q) || g.tags.some((t: string) => t.toLowerCase().includes(q))) {
        matches.push({
          id: g.id,
          title: g.title,
          snippet: g.content.replace(/[\[\]]/g, '').slice(0, 100) + '...',
          module: 'garden',
          typeLabel: 'Сад Знань'
        });
      }
    });

    // Search Health
    healthProtocols.forEach(h => {
      const stepsText = h.steps.map((s: any) => s.text).join(' ');
      if (h.title.toLowerCase().includes(q) || h.description.toLowerCase().includes(q) || stepsText.toLowerCase().includes(q)) {
        matches.push({
          id: h.id,
          title: h.title,
          snippet: h.description,
          module: 'health',
          typeLabel: 'Протокол'
        });
      }
    });

    // Search Book
    bookChapters.forEach(ch => {
      const contentText = ch.content.join(' ');
      if (ch.title.toLowerCase().includes(q) || ch.subtitle.toLowerCase().includes(q) || contentText.toLowerCase().includes(q)) {
        matches.push({
          id: ch.id,
          title: ch.title,
          snippet: ch.subtitle + ': ' + ch.content[0].slice(0, 80) + '...',
          module: 'book',
          typeLabel: 'Книга (Розділ)'
        });
      }
    });

    setResults(matches.slice(0, 8)); // Limit to 8 best matches
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        const item = results[selectedIndex];
        onSelectResult(item.module, item.id);
        if (onClose) onClose();
      }
    }
  };

  const getModuleIcon = (module: ModuleType) => {
    switch (module) {
      case 'portfolio': return <FolderGit2 className="w-4 h-4 text-[#E63946]" />;
      case 'blog': return <BookOpen className="w-4 h-4 text-[#FFB703]" />;
      case 'garden': return <Brain className="w-4 h-4 text-[#1A73E8]" />;
      case 'health': return <HeartPulse className="w-4 h-4 text-[#2A9D8F]" />;
      case 'book': return <Book className="w-4 h-4 text-[#8338EC]" />;
      default: return null;
    }
  };

  const getModuleBgClass = (module: ModuleType) => {
    switch (module) {
      case 'portfolio': return 'bg-[#E63946]/10 text-[#E63946] dark:bg-[#E63946]/20 dark:text-[#f87171]';
      case 'blog': return 'bg-[#FFB703]/10 text-[#FFB703] dark:bg-[#FFB703]/20 dark:text-[#fbbf24]';
      case 'garden': return 'bg-[#1A73E8]/10 text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#60a5fa]';
      case 'health': return 'bg-[#2A9D8F]/10 text-[#2A9D8F] dark:bg-[#2A9D8F]/20 dark:text-[#2dd4bf]';
      case 'book': return 'bg-[#8338EC]/10 text-[#8338EC] dark:bg-[#8338EC]/20 dark:text-[#c084fc]';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getModuleBorderHover = (module: ModuleType) => {
    switch (module) {
      case 'portfolio': return 'hover:border-[#E63946]/30 hover:bg-[#E63946]/5 dark:hover:bg-[#E63946]/10';
      case 'blog': return 'hover:border-[#FFB703]/30 hover:bg-[#FFB703]/5 dark:hover:bg-[#FFB703]/10';
      case 'garden': return 'hover:border-[#1A73E8]/30 hover:bg-[#1A73E8]/5 dark:hover:bg-[#1A73E8]/10';
      case 'health': return 'hover:border-[#2A9D8F]/30 hover:bg-[#2A9D8F]/5 dark:hover:bg-[#2A9D8F]/10';
      case 'book': return 'hover:border-[#8338EC]/30 hover:bg-[#8338EC]/5 dark:hover:bg-[#8338EC]/10';
      default: return '';
    }
  };

  const getActiveBorder = (module: ModuleType) => {
    switch (module) {
      case 'portfolio': return 'border-l-4 border-l-[#E63946] bg-[#E63946]/5 dark:bg-[#E63946]/10 border-transparent';
      case 'blog': return 'border-l-4 border-l-[#FFB703] bg-[#FFB703]/5 dark:bg-[#FFB703]/10 border-transparent';
      case 'garden': return 'border-l-4 border-l-[#1A73E8] bg-[#1A73E8]/5 dark:bg-[#1A73E8]/10 border-transparent';
      case 'health': return 'border-l-4 border-l-[#2A9D8F] bg-[#2A9D8F]/5 dark:bg-[#2A9D8F]/10 border-transparent';
      case 'book': return 'border-l-4 border-l-[#8338EC] bg-[#8338EC]/5 dark:bg-[#8338EC]/10 border-transparent';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div id="omnibar-overlay" className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-[12vh] px-4" onClick={(e) => {
      if (e.target === e.currentTarget && onClose) onClose();
    }}>
      <div 
        id="omnibar-container"
        className="w-full max-w-2xl bg-white/95 dark:bg-[#121824]/95 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 flex flex-col max-h-[70vh]"
        ref={containerRef}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            id="omnibar-input"
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-sans text-base leading-relaxed"
            placeholder="Шукайте за ключовим словом (напр. сон, фокус, Альд, ЕЕГ)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button id="clear-search-btn" onClick={() => setQuery('')} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-200/60 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] font-mono shrink-0">
            <span>ESC</span>
          </div>
        </div>

        {/* Results area */}
        <div id="omnibar-results" className="overflow-y-auto p-2 max-h-[50vh] no-scrollbar">
          {query.trim() === '' ? (
            <div className="p-4 space-y-4">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Швидкі теми для пошуку
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { term: 'сон', label: 'Біохімія & Протокол сну', module: 'health' as const, id: 'deep-sleep-protocol' },
                  { term: 'L-теанін', label: 'Ноотропна синергія', module: 'garden' as const, id: 'l-theanine-synergy' },
                  { term: 'ЕЕГ', label: 'EEG Neuro-Focus Tracker', module: 'portfolio' as const, id: 'neuro-focus' },
                  { term: 'Альд', text: 'Альд', label: 'Книга «Скляна призма»', module: 'book' as const, id: 'chapter-1-refraction' },
                  { term: 'мислення', label: 'Мистецтво повільного мислення', module: 'blog' as const, id: 'art-of-slow-thinking' },
                  { term: 'сад', label: 'Чому цифрові сади змінять блоги', module: 'blog' as const, id: 'why-digital-gardens' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    id={`quick-search-item-${idx}`}
                    onClick={() => {
                      onSelectResult(item.module, item.id);
                      if (onClose) onClose();
                    }}
                    className="flex flex-col items-start p-3 text-left border border-gray-100 dark:border-gray-800 rounded-xl hover:border-gray-200 dark:hover:border-gray-700 transition text-sm bg-white dark:bg-[#1a2333]/50 hover:shadow-sm"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200">«{item.term}»</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id + '-' + item.module}
                    id={`search-result-item-${idx}`}
                    onClick={() => {
                      onSelectResult(item.module, item.id);
                      if (onClose) onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition border border-transparent ${
                      isSelected ? getActiveBorder(item.module) : getModuleBorderHover(item.module)
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${getModuleBgClass(item.module)}`}>
                      {getModuleIcon(item.module)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{item.title}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getModuleBgClass(item.module)}`}>
                          {item.typeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{item.snippet}</p>
                    </div>
                    {isSelected && (
                      <div className="shrink-0 text-gray-300 self-center">
                        <CornerDownLeft className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm font-sans dark:text-gray-300">Нічого не знайдено за запитом «{query}»</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Спробуйте ввести інше слово, наприклад «сон» або «фокус»</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
