import React, { useState, useEffect } from 'react';
import { BLOG_DATA } from '../data';
import { BlogPost } from '../types';
import { 
  ArrowLeft, Clock, Calendar, Heart, ThumbsUp, Lightbulb, MessageSquare,
  Edit, Plus, Trash2, Save, X 
} from 'lucide-react';

interface BlogViewProps {
  initialPostId?: string | null;
  onBackToHub: () => void;
  posts?: BlogPost[];
  onUpdatePosts?: (posts: BlogPost[]) => void;
  canEdit?: boolean;
}

export default function BlogView({ 
  initialPostId, 
  onBackToHub,
  posts = BLOG_DATA,
  onUpdatePosts,
  canEdit = false
}: BlogViewProps) {
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  // If initialPostId changes from outside, update selected active post
  useEffect(() => {
    if (initialPostId) {
      const found = posts.find(b => b.id === initialPostId);
      if (found) setActivePost(found);
    }
  }, [initialPostId, posts]);

  // Handle active post synchronization with outer posts list
  useEffect(() => {
    if (activePost) {
      const current = posts.find(b => b.id === activePost.id);
      if (current && JSON.stringify(current) !== JSON.stringify(activePost)) {
        setActivePost(current);
      }
    }
  }, [posts]);

  // Reaction state local to sessions
  const [reactions, setReactions] = useState<{ [postId: string]: { like: number; insight: number; heart: number } }>(() => {
    const saved = localStorage.getItem('prism_blog_reactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    // Initialize with data values
    const initial: { [postId: string]: { like: number; insight: number; heart: number } } = {};
    posts.forEach(b => {
      initial[b.id] = { ...b.reactions };
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('prism_blog_reactions', JSON.stringify(reactions));
  }, [reactions]);

  const handleReact = (postId: string, type: 'like' | 'insight' | 'heart') => {
    setReactions(prev => {
      const currentReactions = prev[postId] || { like: 0, insight: 0, heart: 0 };
      return {
        ...prev,
        [postId]: {
          ...currentReactions,
          [type]: currentReactions[type] + 1
        }
      };
    });
  };

  // Editing state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form fields
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formReadTime, setFormReadTime] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formIsDraft, setFormIsDraft] = useState(false);

  const openCreateForm = () => {
    const today = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    setFormMode('create');
    setFormId(`blog-${Date.now()}`);
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormTags('Технології, Рефлексія');
    setFormReadTime('5 хв');
    setFormDate(today);
    setFormIsDraft(false);
    setIsFormOpen(true);
  };

  const openEditForm = (post: BlogPost) => {
    setFormMode('edit');
    setFormId(post.id);
    setFormTitle(post.title);
    setFormSummary(post.summary);
    setFormContent(post.content);
    setFormTags(post.tags.join(', '));
    setFormReadTime(post.readTime);
    setFormDate(post.date);
    setFormIsDraft(!!post.isDraft);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArray = formTags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    if (formMode === 'create') {
      const newPost: BlogPost = {
        id: formId,
        title: formTitle,
        summary: formSummary,
        content: formContent,
        tags: tagsArray,
        readTime: formReadTime || '5 хв',
        date: formDate,
        reactions: { like: 0, insight: 0, heart: 0 },
        isDraft: formIsDraft
      };
      
      const updated = [newPost, ...posts];
      if (onUpdatePosts) onUpdatePosts(updated);
      
      // Initialize reactions for new post
      setReactions(prev => ({
        ...prev,
        [newPost.id]: { like: 0, insight: 0, heart: 0 }
      }));
    } else {
      const updated = posts.map(b => {
        if (b.id === formId) {
          return {
            ...b,
            title: formTitle,
            summary: formSummary,
            content: formContent,
            tags: tagsArray,
            readTime: formReadTime,
            date: formDate,
            isDraft: formIsDraft
          };
        }
        return b;
      });
      if (onUpdatePosts) onUpdatePosts(updated);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (postId: string) => {
    const updated = posts.filter(b => b.id !== postId);
    if (onUpdatePosts) onUpdatePosts(updated);
    setActivePost(null);
  };

  const visiblePosts = canEdit
    ? posts
    : posts.filter(p => !p.isDraft);

  return (
    <div id="blog-module" className="min-h-screen bg-[#FCFAF5] dark:bg-[#090d16] pb-20 font-sans text-gray-800 dark:text-gray-100">
      {/* Decorative Top Accent */}
      <div className="h-1.5 w-full bg-[#FFB703]" />

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between border-b border-amber-100/30 dark:border-amber-900/30">
        <button
          id="blog-back-btn"
          onClick={onBackToHub}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#FFB703] dark:hover:text-[#FFB703] transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Повернутися до Hub</span>
        </button>

        <div className="flex items-center gap-4">
          {canEdit && !activePost && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#FFB703] hover:bg-[#e09e00] text-gray-900 px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати статтю</span>
            </button>
          )}

          <span 
            id="blog-brand-logo" 
            onClick={onBackToHub}
            className="font-display font-bold text-lg text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-[#FFB703] transition"
          >
            Aura<span className="text-[#FFB703]">.</span>Blog
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-10">
        {activePost ? (
          /* Post Detail View */
          <div id={`blog-post-details-${activePost.id}`} className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                id="blog-close-post-btn"
                onClick={() => setActivePost(null)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                ← До стрічки статей
              </button>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditForm(activePost)}
                    className="flex items-center gap-1 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Редагувати</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Видалити</span>
                  </button>
                </div>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {activePost.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {activePost.readTime}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white tracking-tight leading-tight flex flex-wrap items-center gap-2">
              <span>{activePost.title}</span>
              {activePost.isDraft && (
                <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider font-sans">
                  Чернетка
                </span>
              )}
            </h1>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              {activePost.tags.map(t => (
                <span key={t} className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30">
                  {t}
                </span>
              ))}
            </div>

            {/* Content (Render paragraphs cleanly using elegant serif typography) */}
            <div className="prose prose-amber font-serif text-gray-800 dark:text-gray-200 text-base leading-relaxed space-y-5 pt-4 border-t border-amber-100/20 dark:border-amber-900/30">
              {activePost.content.split('\n\n').map((paragraph, i) => {
                if (paragraph.startsWith('###')) {
                  return (
                    <h3 key={i} className="font-display font-bold text-xl text-gray-900 dark:text-white pt-3 tracking-tight">
                      {paragraph.replace('###', '').trim()}
                    </h3>
                  );
                }
                if (paragraph.startsWith('-') || paragraph.startsWith('1.')) {
                  return (
                    <ul key={i} className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300 font-sans">
                      {paragraph.split('\n').map((li, j) => (
                        <li key={j}>{li.replace(/^[\d.-]\s+/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                if (paragraph.includes('|')) {
                  // Basic Table Renderer
                  const rows = paragraph.split('\n').filter(r => r.includes('|') && !r.includes('---'));
                  return (
                    <div key={i} className="overflow-x-auto my-4 font-sans text-xs text-gray-900 dark:text-white">
                      <table className="min-w-full border-collapse border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-[#121824] rounded-lg overflow-hidden">
                        <tbody>
                          {rows.map((row, rIdx) => {
                            const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');
                            return (
                              <tr key={rIdx} className={rIdx === 0 ? 'bg-amber-50 dark:bg-amber-950/20 font-semibold' : 'border-b border-amber-50 dark:border-amber-900/20'}>
                                {cols.map((col, cIdx) => (
                                  <td key={cIdx} className="p-2.5 border border-amber-100 dark:border-amber-900/40">{col}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-gray-750 dark:text-gray-300 leading-relaxed font-serif text-base whitespace-pre-wrap">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Sticky Interactive Reactions Block */}
            <div className="mt-12 p-5 border border-amber-100 dark:border-amber-900/40 rounded-2xl bg-white dark:bg-[#121824] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-mono">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span>Залиште свою реакцію:</span>
              </div>
              <div className="flex gap-2">
                <button
                  id={`reaction-like-${activePost.id}`}
                  onClick={() => handleReact(activePost.id, 'like')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-850 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-xs text-gray-600 dark:text-gray-300 font-semibold transition bg-white dark:bg-[#1a2333] cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>{reactions[activePost.id]?.like || 0}</span>
                </button>
                <button
                  id={`reaction-insight-${activePost.id}`}
                  onClick={() => handleReact(activePost.id, 'insight')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-850 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-xs text-gray-600 dark:text-gray-300 font-semibold transition bg-white dark:bg-[#1a2333] cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>{reactions[activePost.id]?.insight || 0}</span>
                </button>
                <button
                  id={`reaction-heart-${activePost.id}`}
                  onClick={() => handleReact(activePost.id, 'heart')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-850 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-xs text-gray-600 dark:text-gray-300 font-semibold transition bg-white dark:bg-[#1a2333] cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                  <span>{reactions[activePost.id]?.heart || 0}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Blog Feed View */
          <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
            {/* Title Block */}
            <div className="space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#FFB703] uppercase tracking-widest font-mono">
                  Творчий блокпост
                </span>
                <h1 className="font-display font-extrabold text-4xl text-gray-900 dark:text-white tracking-tight">
                  Мій Блог & Нотатки
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Рефлексії про технології, продуктивність, нейробіологію та культуру. Повільні тексти для усвідомленого занурення.
                </p>
              </div>
            </div>

            {/* Articles List */}
            <div id="blog-posts-feed" className="space-y-6">
              {visiblePosts.map((post) => (
                <article
                  key={post.id}
                  id={`blog-post-card-${post.id}`}
                  onClick={() => setActivePost(post)}
                  className="group cursor-pointer border border-amber-100/30 dark:border-amber-900/20 rounded-2xl p-6 bg-white dark:bg-[#121824] hover:border-[#FFB703]/40 hover:shadow-md transition-all duration-300 relative"
                >
                  <div className="space-y-3">
                    {/* Meta Info */}
                    <div className="flex items-center gap-2.5 text-xs text-gray-400 dark:text-gray-500 font-mono flex-wrap">
                      <span>{post.date}</span>
                      <span>•</span>
                      <span>{post.readTime}</span>
                      {post.isDraft && (
                        <>
                          <span>•</span>
                          <span className="bg-amber-500 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider font-sans">
                            Чернетка
                          </span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-bold text-gray-900 dark:text-white group-hover:text-[#FFB703] transition-colors text-lg sm:text-xl tracking-tight leading-tight">
                      {post.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-sans">
                      {post.summary}
                    </p>

                    {/* Bottom row: tags and quick reactions summary */}
                    <div className="pt-4 border-t border-gray-50 dark:border-gray-800/60 flex items-center justify-between text-xs mt-3">
                      <div className="flex gap-1">
                        {post.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-amber-500" />
                          {reactions[post.id]?.like || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-500" />
                          {reactions[post.id]?.heart || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                  <p className="text-sm text-gray-500">Немає доступних статей. Додайте нову статтю!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDIT/CREATE MODAL OVERLAY */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-850 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white">
                {formMode === 'create' ? 'Створити статтю' : 'Редагувати статтю'}
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
                  Назва статті
                </label>
                <input 
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#FFB703] transition text-sm"
                  placeholder="Введіть захоплюючу назву..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Час читання
                  </label>
                  <input 
                    type="text"
                    required
                    value={formReadTime}
                    onChange={e => setFormReadTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#FFB703] transition text-sm"
                    placeholder="Наприклад: 5 хв"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Дата публікації
                  </label>
                  <input 
                    type="text"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#FFB703] transition text-sm"
                  />
                </div>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#FFB703] transition text-sm"
                  placeholder="Технології, Філософія, Біохімія"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Короткий опис (Summary)
                </label>
                <textarea 
                  required
                  rows={2}
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#FFB703] transition text-sm resize-none"
                  placeholder="Короткий рефлексивний підсумок для стрічки..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Текст статті (Розділяйте абзаци двома переносами рядка `\n\n`)
                </label>
                <textarea 
                  required
                  rows={8}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white font-serif focus:outline-none focus:border-[#FFB703] transition text-sm"
                  placeholder="Основний зміст статті..."
                />
              </div>

              <div className="flex items-center gap-3 bg-amber-50/20 dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-100/20 dark:border-amber-900/10">
                <input
                  type="checkbox"
                  id="formIsDraft"
                  checked={formIsDraft}
                  onChange={e => setFormIsDraft(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#FFB703] focus:ring-[#FFB703] cursor-pointer"
                />
                <label htmlFor="formIsDraft" className="text-xs font-medium text-gray-650 dark:text-gray-450 cursor-pointer select-none">
                  Зберегти як чернетку (приховати статтю від звичайних відвідувачів)
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
                  className="flex items-center gap-1.5 bg-[#FFB703] hover:bg-[#e09e00] text-gray-900 px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
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
              Ви впевнені, що хочете видалити цю статтю? Цю дію не можна буде скасувати.
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
                  if (activePost) {
                    handleDelete(activePost.id);
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
