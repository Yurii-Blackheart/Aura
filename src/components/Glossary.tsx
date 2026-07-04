import React, { useState } from 'react';
import { HelpCircle, Sparkles, Compass, FolderGit2, BookOpen, Brain, HeartPulse, Book } from 'lucide-react';

interface GlossaryProps {
  theme?: 'light' | 'dark';
}

export default function Glossary({ theme }: GlossaryProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'philosophy' | 'modules'>('philosophy');

  const items = [
    {
      module: 'portfolio',
      name: 'Portfolio',
      color: '#E63946',
      bgClass: 'bg-[#E63946]/5 text-[#E63946] border-[#E63946]/20 dark:bg-[#E63946]/10 dark:text-[#f87171] dark:border-[#E63946]/30',
      icon: <FolderGit2 className="w-4 h-4" />,
      text: 'Втілює стихію дії, матеріалізації думок та професійного росту. Тут зберігаються проекти, які мають кількісні результати, інтеграції та працюючий код.'
    },
    {
      module: 'blog',
      name: 'Blog',
      color: '#FFB703',
      bgClass: 'bg-[#FFB703]/5 text-[#FFB703] border-[#FFB703]/20 dark:bg-[#FFB703]/10 dark:text-[#fbbf24] dark:border-[#FFB703]/30',
      icon: <BookOpen className="w-4 h-4" />,
      text: 'Світ емоційного та творчого самовираження. Особисті есеї, рефлексії про технології, культуру та суспільство, написані живою, неформальною мовою.'
    },
    {
      module: 'garden',
      name: 'Garden',
      color: '#1A73E8',
      bgClass: 'bg-[#1A73E8]/5 text-[#1A73E8] border-[#1A73E8]/20 dark:bg-[#1A73E8]/10 dark:text-[#60a5fa] dark:border-[#1A73E8]/30',
      icon: <Brain className="w-4 h-4" />,
      text: 'Асоціативна мережа «вічнозелених» знань. Нотатки, які не старіють, а доповнюються роками, з’єднуючись внутрішніми посиланнями в інтелектуальну карту.'
    },
    {
      module: 'health',
      name: 'Health',
      color: '#2A9D8F',
      bgClass: 'bg-[#2A9D8F]/5 text-[#2A9D8F] border-[#2A9D8F]/20 dark:bg-[#2A9D8F]/10 dark:text-[#2dd4bf] dark:border-[#2A9D8F]/30',
      icon: <HeartPulse className="w-4 h-4" />,
      text: 'Простір науково обґрунтованого біохакінгу та фізичного балансу. Детальні протоколи сну, фокусу, харчування та тренувань для утримання ресурсу.'
    },
    {
      module: 'book',
      name: 'Book',
      color: '#8338EC',
      bgClass: 'bg-[#8338EC]/5 text-[#8338EC] border-[#8338EC]/20 dark:bg-[#8338EC]/10 dark:text-[#c084fc] dark:border-[#8338EC]/30',
      icon: <Book className="w-4 h-4" />,
      text: 'Художній вимір. Чернетки та готові розділи інтерактивної книги «Скляна Призма», що дозволяють зануритись у світ магії світла та фентезі-світобудови.'
    }
  ];

  return (
    <div id="glossary-widget" className="border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-6 bg-white dark:bg-[#121824] shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-gray-50 dark:border-gray-800/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Compass className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm tracking-tight">Глосарій сутностей</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Путівник по моєму цифровому розуму</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/60 p-1 rounded-lg self-start">
          <button
            id="glossary-tab-philosophy"
            onClick={() => setActiveTab('philosophy')}
            className={`px-3 py-1 text-xs rounded-md transition font-medium cursor-pointer ${
              activeTab === 'philosophy' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Філософія
          </button>
          <button
            id="glossary-tab-modules"
            onClick={() => setActiveTab('modules')}
            className={`px-3 py-1 text-xs rounded-md transition font-medium cursor-pointer ${
              activeTab === 'modules' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Спектр модулів
          </button>
        </div>
      </div>

      {activeTab === 'philosophy' ? (
        <div id="glossary-philosophy-content" className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
          <p>
            Вітаю у моєму <strong className="text-gray-900 dark:text-white font-medium">Цифровому Космосі</strong>. Цей сайт — не просто статичне портфоліо чи стрічка публікацій, а діюче втілення концепції <strong className="text-gray-900 dark:text-white font-medium">Призми</strong>.
          </p>
          <p>
            Наш розум не є однорідним. Ми поєднуємо в собі прагматичного розробника, романтичного письменника, прискіпливого дослідника знань та біохакера, що балансує роботу тіла. 
          </p>
          <p>
            Тут <strong className="text-gray-900 dark:text-white font-medium">Hub</strong> виступає в ролі білого світла. Він об’єднує всі напрямки діяльності, утримуючи баланс та чистоту. Проте, проходячи крізь призму інтересів, це світло розкладається на унікальні яскраві кольори — кожен зі своїм настроєм, правилами та інтерактивним інтерфейсом.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-400 mt-2">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Спробуйте натиснути кнопку <strong>«Здивуй мене»</strong> зверху, щоб випадково зануритись у довільну точку мого спектра знань!</span>
          </div>
        </div>
      ) : (
        <div id="glossary-modules-content" className="space-y-4 animate-fade-in">
          {items.map((item) => (
            <div key={item.module} id={`glossary-item-${item.module}`} className="flex gap-3 items-start p-2.5 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-800 hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition">
              <div className={`p-2 rounded-lg border shrink-0 ${item.bgClass}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">{item.name}</h4>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed font-sans">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

