import React, { useState } from 'react';
import { Activity, Plus, Sparkles, AlertCircle, Link } from 'lucide-react';
import { ChangelogEvent, ModuleType } from '../types';

interface ChangelogProps {
  events: ChangelogEvent[];
  onAddEvent: (description: string, module: ModuleType, type: 'оновлення' | 'досягнення' | 'публікація') => void;
  onNavigateToItem: (module: ModuleType, id: string) => void;
  theme?: 'light' | 'dark';
  canEdit?: boolean;
}

export default function Changelog({ events, onAddEvent, onNavigateToItem, theme, canEdit = false }: ChangelogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [module, setModule] = useState<ModuleType>('garden');
  const [type, setType] = useState<'оновлення' | 'досягнення' | 'публікація'>('оновлення');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onAddEvent(description.trim(), module, type);
    setDescription('');
    setShowAddForm(false);
  };

  const getModuleColorClass = (mod: ModuleType) => {
    switch (mod) {
      case 'portfolio': return 'bg-[#E63946]';
      case 'blog': return 'bg-[#FFB703]';
      case 'garden': return 'bg-[#1A73E8]';
      case 'health': return 'bg-[#2A9D8F]';
      case 'book': return 'bg-[#8338EC]';
      default: return 'bg-gray-400';
    }
  };

  const getModuleLabel = (mod: ModuleType) => {
    switch (mod) {
      case 'portfolio': return 'Portfolio';
      case 'blog': return 'Blog';
      case 'garden': return 'Garden';
      case 'health': return 'Health';
      case 'book': return 'Book';
      default: return '';
    }
  };

  return (
    <div id="changelog-widget" className="border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-6 bg-white dark:bg-[#121824] shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition hover:shadow-md">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Пульсація аури</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Хронологія подій у вашому цифровому просторі</p>
          </div>
        </div>
        {canEdit && (
          <button
            id="toggle-add-event-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition border border-gray-100 dark:border-gray-800 animate-fade-in"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Симулювати подію</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Додавання нової симульованої події</span>
          </div>

          <div>
            <input
              id="event-description-input"
              type="text"
              required
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-gray-300 dark:focus:border-gray-600"
              placeholder="Опис події, наприклад: Тестую добавку Л-теанін..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 font-medium">Модуль</label>
              <select
                id="event-module-select"
                value={module}
                onChange={(e) => setModule(e.target.value as ModuleType)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs text-gray-600 dark:text-gray-300 outline-none"
              >
                <option value="portfolio">Portfolio</option>
                <option value="blog">Blog</option>
                <option value="garden">Garden</option>
                <option value="health">Health</option>
                <option value="book">Book</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 font-medium">Тип дії</label>
              <select
                id="event-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as 'оновлення' | 'досягнення' | 'публікація')}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs text-gray-600 dark:text-gray-300 outline-none"
              >
                <option value="оновлення">Оновлення</option>
                <option value="досягнення">Досягнення</option>
                <option value="публікація">Публікація</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              id="cancel-event-btn"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-[11px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition"
            >
              Скасувати
            </button>
            <button
              id="submit-event-btn"
              type="submit"
              className="px-3 py-1 text-[11px] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 rounded-md transition font-medium"
            >
              Додати у стрічку
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              id={`changelog-item-${event.id}`}
              onClick={() => onNavigateToItem(event.module, event.targetId)}
              className="flex items-start gap-3.5 group cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition"
            >
              {/* Colored Dot & Line */}
              <div className="flex flex-col items-center self-stretch mt-1 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${getModuleColorClass(event.module)} ring-4 ring-white dark:ring-gray-900 shadow-sm shrink-0`} />
                <div className="w-0.5 grow bg-gray-100 dark:bg-gray-800 my-1 group-last:hidden" />
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 font-mono">
                    {getModuleLabel(event.module)}
                  </span>
                  <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{event.time}</span>
                  <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-center">
                    {event.type}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-sans line-clamp-2 leading-relaxed group-hover:text-gray-950 dark:group-hover:text-white transition">
                  {event.description}
                </p>
              </div>

              {/* Link icon showing hover indicator */}
              <div className="shrink-0 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition self-center p-1">
                <Link className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-gray-400 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <AlertCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 mb-1" />
            <p className="text-xs font-sans">Жодних подій у стрічці</p>
          </div>
        )}
      </div>
    </div>
  );
}

