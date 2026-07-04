import React, { useState, useEffect } from 'react';
import { HEALTH_DATA } from '../data';
import { HealthProtocol } from '../types';
import { 
  ArrowLeft, CheckCircle2, Circle, HeartPulse, ShieldCheck, Pill, 
  CalendarClock, Info, Plus, Edit, Trash2, Save, X 
} from 'lucide-react';

interface HealthViewProps {
  initialProtocolId?: string | null;
  onBackToHub: () => void;
  protocols?: HealthProtocol[];
  onUpdateProtocols?: (protocols: HealthProtocol[]) => void;
  canEdit?: boolean;
}

export default function HealthView({ 
  initialProtocolId, 
  onBackToHub,
  protocols = HEALTH_DATA,
  onUpdateProtocols,
  canEdit = false
}: HealthViewProps) {
  const visibleProtocols = canEdit
    ? protocols
    : protocols.filter(p => !p.isDraft);

  const [activeProtocol, setActiveProtocol] = useState<HealthProtocol>(
    initialProtocolId ? (visibleProtocols.find(h => h.id === initialProtocolId) || visibleProtocols[0]) : visibleProtocols[0]
  );

  // Sync initialProtocolId if it changes externally
  useEffect(() => {
    if (initialProtocolId) {
      const found = visibleProtocols.find(h => h.id === initialProtocolId);
      if (found) setActiveProtocol(found);
    }
  }, [initialProtocolId, visibleProtocols]);

  // Sync activeProtocol if state changes externally
  useEffect(() => {
    if (activeProtocol) {
      const current = visibleProtocols.find(h => h.id === activeProtocol.id);
      if (current && JSON.stringify(current) !== JSON.stringify(activeProtocol)) {
        setActiveProtocol(current);
      } else if (!current && visibleProtocols.length > 0) {
        setActiveProtocol(visibleProtocols[0]);
      }
    } else if (visibleProtocols.length > 0) {
      setActiveProtocol(visibleProtocols[0]);
    }
  }, [visibleProtocols]);

  // Load unchecked/checked state from localStorage to make it persistent!
  const [checkedSteps, setCheckedSteps] = useState<{ [protocolId: string]: string[] }>(() => {
    const saved = localStorage.getItem('prism_health_steps');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('prism_health_steps', JSON.stringify(checkedSteps));
  }, [checkedSteps]);

  const toggleStep = (protocolId: string, stepId: string) => {
    setCheckedSteps(prev => {
      const current = prev[protocolId] || [];
      const updated = current.includes(stepId)
        ? current.filter(id => id !== stepId)
        : [...current, stepId];
      return {
        ...prev,
        [protocolId]: updated
      };
    });
  };

  const getAdherenceScore = (protocol: HealthProtocol) => {
    const completedCount = (checkedSteps[protocol.id] || []).length;
    const totalCount = protocol.steps.length;
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  };

  const isStepDone = (protocolId: string, stepId: string) => {
    return (checkedSteps[protocolId] || []).includes(stepId);
  };

  // Editor modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Нейробіологія');
  const [formSchedule, setFormSchedule] = useState('Щодня, ранок');
  const [formTarget, setFormTarget] = useState('');
  const [formRationale, setFormRationale] = useState('');
  const [formSteps, setFormSteps] = useState('');
  const [formSupplements, setFormSupplements] = useState('');
  const [formIsDraft, setFormIsDraft] = useState(false);

  const openCreateForm = () => {
    setFormMode('create');
    setFormId(`health-${Date.now()}`);
    setFormTitle('');
    setFormCategory('Нейробіологія');
    setFormSchedule('Щодня, ранок');
    setFormTarget('');
    setFormRationale('');
    setFormSteps('');
    setFormSupplements('');
    setFormIsDraft(false);
    setIsFormOpen(true);
  };

  const openEditForm = (p: HealthProtocol) => {
    setFormMode('edit');
    setFormId(p.id);
    setFormTitle(p.title);
    setFormCategory(p.category);
    setFormSchedule(p.schedule);
    setFormTarget(p.target);
    setFormRationale(p.scientificRationale);
    setFormSteps(p.steps.map(s => s.text).join('\n'));
    setFormSupplements(
      p.supplements.map(s => `${s.name} : ${s.dosage} @ ${s.timing}`).join('\n')
    );
    setFormIsDraft(!!p.isDraft);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    // Parse Steps
    const parsedSteps = formSteps
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map((line, idx) => ({
        id: `step-${idx}-${Date.now()}`,
        text: line,
        done: false
      }));

    // Parse Supplements (Format: "Name : Dosage @ Timing")
    const parsedSupps = formSupplements
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => {
        let name = line;
        let dosage = 'За потребою';
        let timing = 'Протягом дня';

        const atIdx = line.indexOf('@');
        let temp = line;
        if (atIdx !== -1) {
          timing = line.substring(atIdx + 1).trim();
          temp = line.substring(0, atIdx).trim();
        }

        const colonIdx = temp.indexOf(':');
        if (colonIdx !== -1) {
          name = temp.substring(0, colonIdx).trim();
          dosage = temp.substring(colonIdx + 1).trim();
        } else {
          name = temp;
        }

        return { name, dosage, timing };
      });

    const newProtocol: HealthProtocol = {
      id: formId,
      title: formTitle,
      description: formTarget, // Use target as a fallback description
      category: formCategory as any,
      schedule: formSchedule,
      target: formTarget,
      scientificRationale: formRationale,
      steps: parsedSteps,
      supplements: parsedSupps,
      isDraft: formIsDraft
    };

    if (formMode === 'create') {
      const updated = [...protocols, newProtocol];
      if (onUpdateProtocols) onUpdateProtocols(updated);
      setActiveProtocol(newProtocol);
    } else {
      const updated = protocols.map(p => p.id === formId ? newProtocol : p);
      if (onUpdateProtocols) onUpdateProtocols(updated);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (protocolId: string) => {
    const updated = protocols.filter(p => p.id !== protocolId);
    if (onUpdateProtocols) onUpdateProtocols(updated);
    if (updated.length > 0) {
      setActiveProtocol(updated[0]);
    }
  };

  return (
    <div id="health-module" className="min-h-screen bg-[#F4F8F7] dark:bg-[#090d16] pb-20 font-sans text-gray-800 dark:text-gray-100">
      {/* Decorative Top Accent */}
      <div className="h-1.5 w-full bg-[#2A9D8F]" />

      {/* Header Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between border-b border-teal-100/30 dark:border-teal-900/30">
        <button
          id="health-back-btn"
          onClick={onBackToHub}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#2A9D8F] dark:hover:text-[#2A9D8F] transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Повернутися до Hub</span>
        </button>

        <div className="flex items-center gap-4">
          {canEdit && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#2A9D8F] hover:bg-[#20786d] text-white px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати протокол</span>
            </button>
          )}

          <span 
            id="health-brand-logo" 
            onClick={onBackToHub}
            className="font-display font-bold text-lg text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-[#2A9D8F] transition"
          >
            Aura<span className="text-[#2A9D8F]">.</span>Health
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Protocols Menu (Col span 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[#121824] border border-teal-100/50 dark:border-teal-900/30 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-2 border-b border-gray-50 dark:border-gray-855 pb-3">
                <HeartPulse className="w-4 h-4 text-[#2A9D8F]" />
                <span>Біохакінг-протоколи</span>
              </h3>

              {/* Protocol Navigation Cards */}
              <div className="space-y-3">
                {visibleProtocols.map(h => {
                  const score = getAdherenceScore(h);
                  return (
                    <button
                      key={h.id}
                      id={`health-protocol-card-btn-${h.id}`}
                      onClick={() => setActiveProtocol(h)}
                      className={`w-full text-left p-4 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-2.5 ${
                        activeProtocol && activeProtocol.id === h.id
                          ? 'bg-teal-50/40 dark:bg-teal-950/20 border-[#2A9D8F]/30 dark:border-[#2A9D8F]/50 text-gray-900 dark:text-white shadow-sm'
                          : 'bg-white dark:bg-[#1a2333]/40 border-transparent dark:border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center justify-between gap-2">
                          <span>{h.title}</span>
                          {h.isDraft && (
                            <span className="bg-amber-500 text-white text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-full tracking-wider shrink-0 font-sans">
                              Чернетка
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{h.category} • {h.schedule}</div>
                      </div>

                      {/* Mini Score indicators */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                          <span>Виконання на сьогодні:</span>
                          <span className="font-semibold text-[#2A9D8F] dark:text-[#4ade80]">{score}%</span>
                        </div>
                        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#2A9D8F] transition-all duration-300"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
                {visibleProtocols.length === 0 && (
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-4">Протоколів не знайдено</p>
                )}
              </div>
            </div>

            {/* Scientific disclaimer */}
            <div className="p-4 rounded-2xl bg-[#2A9D8F]/5 dark:bg-[#2A9D8F]/10 border border-teal-100/30 dark:border-teal-950/20 text-xs text-teal-800 dark:text-teal-300 leading-relaxed font-sans space-y-1.5">
              <div className="font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#2A9D8F] dark:text-[#2ad1bc]" />
                <span>Наукова методологія</span>
              </div>
              <p className="text-teal-700/95 dark:text-teal-400/95">
                Кожен крок протоколу побудований на сучасних клінічних дослідженнях нейробіології та хронобіології. Жодних магічних пігулок — лише управління циркадними ритмами та синергетичні нутріцевтичні стеки.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: Protocol Interactive Checklist & details (Col span 8) */}
          <div className="lg:col-span-8">
            {activeProtocol ? (
              <div id={`health-protocol-display-${activeProtocol.id}`} className="bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
                
                {/* Meta Stats */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-5 border-b border-gray-50 dark:border-gray-855">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-teal-50 dark:bg-teal-950/20 text-[#2A9D8F] dark:text-[#2ad1bc] font-bold px-2 py-0.5 rounded">
                      {activeProtocol.category}
                    </span>
                    <h1 className="font-display font-bold text-xl sm:text-2xl text-gray-900 dark:text-white tracking-tight leading-none mt-1 flex flex-wrap items-center gap-2">
                      <span>{activeProtocol.title}</span>
                      {activeProtocol.isDraft && (
                        <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider font-sans">
                          Чернетка
                        </span>
                      )}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    {canEdit && (
                      <div className="flex items-center gap-1.5 border-r border-gray-100 dark:border-gray-800 pr-3 mr-1">
                        <button
                          onClick={() => openEditForm(activeProtocol)}
                          className="flex items-center gap-1 text-[11px] font-semibold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition cursor-pointer animate-fade-in"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Редагувати</span>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-1 text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Видалити</span>
                        </button>
                      </div>
                    )}

                    {/* Big Dynamic Score circle/block */}
                    <div className="bg-teal-50/30 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-900/30 rounded-2xl p-2.5 px-3.5 flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-medium">Акуратність виконання:</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">Сьогодні виконано {(checkedSteps[activeProtocol.id] || []).length} з {activeProtocol.steps.length}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full border-4 border-[#2A9D8F]/20 flex items-center justify-center font-mono font-bold text-xs text-[#2A9D8F] dark:text-[#4ade80] relative shrink-0">
                        <span>{getAdherenceScore(activeProtocol)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Targets and Schedules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-[#1a2333]/40 rounded-2xl border border-gray-100/40 dark:border-gray-800 text-xs">
                    <span className="block font-semibold text-gray-400 dark:text-gray-500 mb-1">Головна ціль:</span>
                    <p className="text-gray-750 dark:text-gray-300 leading-relaxed">{activeProtocol.target}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-[#1a2333]/40 rounded-2xl border border-gray-100/40 dark:border-gray-800 text-xs">
                    <span className="block font-semibold text-gray-400 dark:text-gray-500 mb-1">Розклад виконання:</span>
                    <p className="text-gray-750 dark:text-gray-300 leading-relaxed font-mono flex items-center gap-1.5 mt-0.5">
                      <CalendarClock className="w-3.5 h-3.5 text-[#2A9D8F]" />
                      {activeProtocol.schedule}
                    </p>
                  </div>
                </div>

                {/* Interactive Checklist Steps */}
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight mb-3">Покроковий алгоритм дій</h3>
                  <div className="space-y-2">
                    {activeProtocol.steps.map((step) => {
                      const done = isStepDone(activeProtocol.id, step.id);
                      return (
                        <div
                          key={step.id}
                          id={`health-step-checkbox-${step.id}`}
                          onClick={() => toggleStep(activeProtocol.id, step.id)}
                          className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                            done
                              ? 'bg-teal-50/10 dark:bg-teal-950/5 border-teal-100 dark:border-teal-900/30 text-gray-500 dark:text-gray-500'
                              : 'bg-white dark:bg-[#1a2333]/40 border-gray-100 dark:border-gray-800 hover:border-teal-100 dark:hover:border-teal-900 text-gray-750 dark:text-gray-200'
                          }`}
                        >
                          <button className="mt-0.5 shrink-0 text-teal-600 hover:scale-105 transition cursor-pointer">
                            {done ? (
                              <CheckCircle2 className="w-5 h-5 text-[#2A9D8F] fill-[#2A9D8F]/10" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            )}
                          </button>
                          <p className={`text-xs sm:text-sm leading-relaxed ${done ? 'line-through text-gray-450 dark:text-gray-550' : 'text-gray-700 dark:text-gray-300'}`}>
                            {step.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Science Corner */}
                <div className="p-5 border border-teal-100/30 dark:border-teal-900/20 rounded-2xl bg-gradient-to-r from-teal-50/10 to-white dark:from-teal-950/5 dark:to-[#121824] flex gap-3 text-xs">
                  <Info className="w-5 h-5 text-[#2A9D8F] shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">Наукове обґрунтування:</h4>
                    <p className="text-gray-650 dark:text-gray-400 leading-relaxed">{activeProtocol.scientificRationale}</p>
                  </div>
                </div>

                {/* Supplement Table / Stack */}
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-[#2A9D8F]" />
                    <span>Супутній нутріцевтичний стек</span>
                  </h3>
                  <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                    <table className="min-w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 font-mono border-b border-gray-100 dark:border-gray-800">
                          <th className="p-3 font-semibold uppercase">Добавка</th>
                          <th className="p-3 font-semibold uppercase">Дозування</th>
                          <th className="p-3 font-semibold uppercase">Коли приймати</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {activeProtocol.supplements.map((supp, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{supp.name}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400 font-mono">{supp.dosage}</td>
                            <td className="p-3 text-gray-500 dark:text-gray-450">{supp.timing}</td>
                          </tr>
                        ))}
                        {activeProtocol.supplements.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-gray-400">Нутріцевтиків не вказано</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-[#121824] rounded-3xl border border-gray-100">
                <p className="text-gray-400">Немає доступних протоколів.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CREATE/EDIT MODAL OVERLAY */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-850 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white">
                {formMode === 'create' ? 'Створити протокол' : 'Редагувати протокол'}
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
                    ID Протоколу (Slug, латиницею)
                  </label>
                  <input 
                    type="text"
                    required
                    disabled={formMode === 'edit'}
                    value={formId}
                    onChange={e => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] disabled:opacity-50 transition text-sm font-mono"
                    placeholder="deep-sleep-protocol"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm"
                    placeholder="Нейробіологія / Біохакінг"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm"
                  placeholder="Заголовок..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Розклад
                  </label>
                  <input 
                    type="text"
                    required
                    value={formSchedule}
                    onChange={e => setFormSchedule(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm"
                    placeholder="Щодня, вечір за 2 год до сну"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    Головна ціль
                  </label>
                  <input 
                    type="text"
                    required
                    value={formTarget}
                    onChange={e => setFormTarget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm"
                    placeholder="Зниження кортизолу, регенерація..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Наукове обґрунтування
                </label>
                <textarea 
                  required
                  rows={2}
                  value={formRationale}
                  onChange={e => setFormRationale(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm font-sans"
                  placeholder="Дослідження Ендрю Хубермана щодо..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Кроки алгоритму (Кожен крок з нового рядка)
                </label>
                <textarea 
                  required
                  rows={4}
                  value={formSteps}
                  onChange={e => setFormSteps(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm font-sans"
                  placeholder="Вимкнути яскраве верхнє світло&#10;Прийняти Магній L-Треонат&#10;Виконати 10 хв дихання NSDR"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                  Супутні добавки (Формат: Назва : Дозування @ Коли приймати, по одній на рядок)
                </label>
                <textarea 
                  rows={3}
                  value={formSupplements}
                  onChange={e => setFormSupplements(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a2333] text-gray-900 dark:text-white focus:outline-none focus:border-[#2A9D8F] transition text-sm font-sans"
                  placeholder="L-Теанін : 200 мг @ за 30 хв до сну&#10;Апігенін : 50 мг @ за 30 хв до сну"
                />
              </div>

              <div className="flex items-center gap-3 bg-teal-50/20 dark:bg-teal-950/10 p-4 rounded-2xl border border-teal-100/20 dark:border-teal-900/10">
                <input
                  type="checkbox"
                  id="formIsDraft"
                  checked={formIsDraft}
                  onChange={e => setFormIsDraft(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#2A9D8F] focus:ring-[#2A9D8F] cursor-pointer"
                />
                <label htmlFor="formIsDraft" className="text-xs font-medium text-gray-650 dark:text-gray-450 cursor-pointer select-none">
                  Зберегти як чернетку (приховати протокол від звичайних відвідувачів)
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
                  className="flex items-center gap-1.5 bg-[#2A9D8F] hover:bg-[#20786d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
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
              Ви впевнені, що хочете видалити цей біохакінг-протокол? Цю дію не можна буде скасувати.
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
                  if (activeProtocol) {
                    handleDelete(activeProtocol.id);
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
