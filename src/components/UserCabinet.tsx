import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Award, 
  BookOpen, 
  HeartPulse, 
  Brain, 
  ThumbsUp, 
  Check, 
  X, 
  RefreshCw, 
  Search, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Edit, 
  Database,
  Lock,
  Sparkles,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'editor' | 'user';
  statusText?: string;
  updatedAt?: string;
}

interface UserCabinetProps {
  user: User;
  isSimulated: boolean;
  userRole: 'admin' | 'editor' | 'user';
  isUserModeActive: boolean;
  onToggleUserMode: (active: boolean) => void;
  onClose: () => void;
  // Dynamic stats
  portfolioCount: number;
  blogCount: number;
  gardenCount: number;
  healthCount: number;
  bookCount: number;
  statusText: string;
  onSaveStatus: (status: string) => void;
}

export default function UserCabinet({
  user,
  isSimulated,
  userRole,
  isUserModeActive,
  onToggleUserMode,
  onClose,
  portfolioCount,
  blogCount,
  gardenCount,
  healthCount,
  bookCount,
  statusText,
  onSaveStatus
}: UserCabinetProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'admin'>('profile');
  
  // Status Edit State
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState(statusText);

  // Admin users list states
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState<{ [uid: string]: 'idle' | 'saving' | 'saved' | 'error' }>({});
  const [adminErrorMessage, setAdminErrorMessage] = useState<string | null>(null);

  // User Local Stats (persistent from localStorage)
  const [readChaptersCount, setReadChaptersCount] = useState(0);
  const [checkedStepsCount, setCheckedStepsCount] = useState(0);
  const [reactionsCount, setReactionsCount] = useState(0);

  // Sync temp status on mount or prop change
  useEffect(() => {
    setTempStatus(statusText);
  }, [statusText]);

  // Load local activities
  useEffect(() => {
    try {
      const readChapters = localStorage.getItem('prism_read_chapters');
      if (readChapters) {
        setReadChaptersCount(JSON.parse(readChapters).length);
      }

      const checkedSteps = localStorage.getItem('prism_health_steps');
      if (checkedSteps) {
        const parsed = JSON.parse(checkedSteps);
        let totalChecked = 0;
        Object.keys(parsed).forEach(key => {
          if (Array.isArray(parsed[key])) {
            totalChecked += parsed[key].length;
          }
        });
        setCheckedStepsCount(totalChecked);
      }

      const reactions = localStorage.getItem('prism_blog_reactions');
      if (reactions) {
        setReactionsCount(Object.keys(JSON.parse(reactions)).length);
      }
    } catch (err) {
      console.warn("Failed to parse local storage stats inside cabinet", err);
    }
  }, []);

  // Fetch users for Admin Panel
  const fetchUsers = async () => {
    setAdminLoading(true);
    setAdminErrorMessage(null);

    const fallbackList: UserDoc[] = [
      { uid: 'owner-uid', displayName: 'Yurii Blackheart (Ви)', email: 'yurii.blackheart@gmail.com', role: 'admin', statusText: 'Власник', updatedAt: new Date().toISOString() },
      { uid: 'sim-editor-1', displayName: 'Олена Кравченко', email: 'olena.k@example.com', role: 'editor', statusText: 'Редактор блогу', updatedAt: new Date().toISOString() },
      { uid: 'sim-user-1', displayName: 'Максим Шевченко', email: 'maksim.sh@example.com', role: 'user', statusText: 'Слухач курсу', updatedAt: new Date().toISOString() }
    ];

    if (!auth.currentUser && isSimulated) {
      setUsers(fallbackList);
      setAdminLoading(false);
      return;
    }

    try {
      const usersCol = collection(db, 'users');
      const usersSnap = await getDocs(usersCol);
      const usersList: UserDoc[] = [];
      
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          uid: docSnap.id,
          displayName: data.displayName || 'Без імені',
          email: data.email || '',
          role: data.role || 'user',
          statusText: data.statusText || '',
          updatedAt: data.updatedAt || ''
        });
      });

      usersList.sort((a, b) => {
        if (a.role === 'admin') return -1;
        if (b.role === 'admin') return 1;
        if (a.role === 'editor') return -1;
        if (b.role === 'editor') return 1;
        return a.email.localeCompare(b.email);
      });

      if (usersList.length === 0) {
        usersList.push(...fallbackList);
      } else {
        const hasYurii = usersList.some(u => u.email === 'yurii.blackheart@gmail.com');
        if (!hasYurii) {
          usersList.unshift({ uid: 'owner-uid', displayName: 'Yurii Blackheart', email: 'yurii.blackheart@gmail.com', role: 'admin', statusText: 'Власник', updatedAt: new Date().toISOString() });
        }
        if (usersList.length < 3) {
          usersList.push(
            { uid: 'sim-editor-1', displayName: 'Олена Кравченко', email: 'olena.k@example.com', role: 'editor', statusText: 'Редактор блогу', updatedAt: new Date().toISOString() },
            { uid: 'sim-user-1', displayName: 'Максим Шевченко', email: 'maksim.sh@example.com', role: 'user', statusText: 'Слухач курсу', updatedAt: new Date().toISOString() }
          );
        }
      }

      setUsers(usersList);
    } catch (err: any) {
      console.error("Failed to fetch users in cabinet", err);
      setAdminErrorMessage("Не вдалося завантажити користувачів з Firestore. Показано локальний список.");
      setUsers(fallbackList);
    } finally {
      setAdminLoading(false);
    }
  };

  // Fetch on tab switch to admin
  useEffect(() => {
    if (activeTab === 'admin' && userRole === 'admin') {
      fetchUsers();
    }
  }, [activeTab, userRole]);

  // Update User Role
  const handleRoleChange = async (uid: string, newRole: 'admin' | 'editor' | 'user') => {
    const targetUser = users.find(u => u.uid === uid);
    if (targetUser && targetUser.email === 'yurii.blackheart@gmail.com') {
      alert("Ви не можете змінити роль для головного власника!");
      return;
    }

    setActionStatus(prev => ({ ...prev, [uid]: 'saving' }));
    try {
      if (uid.startsWith('sim-') || uid === 'owner-uid') {
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        setActionStatus(prev => ({ ...prev, [uid]: 'saved' }));
        setTimeout(() => setActionStatus(prev => ({ ...prev, [uid]: 'idle' })), 2000);
        return;
      }

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      setActionStatus(prev => ({ ...prev, [uid]: 'saved' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [uid]: 'idle' })), 2000);
    } catch (err) {
      console.error("Error updating user role in cabinet", err);
      setActionStatus(prev => ({ ...prev, [uid]: 'error' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [uid]: 'idle' })), 3000);
    }
  };

  // Handle local status save
  const handleSaveStatus = () => {
    onSaveStatus(tempStatus);
    setIsEditingStatus(false);
  };

  // Filtered users for search query
  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    editors: users.filter(u => u.role === 'editor').length,
    regular: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        id="user-cabinet-container"
        className="w-full max-w-4xl bg-white dark:bg-[#0c1220] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl text-gray-900 dark:text-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800/60 pb-4 mb-4 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A73E8]/10 text-[#1A73E8] rounded-xl dark:bg-[#1A73E8]/20">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl tracking-tight text-gray-900 dark:text-white leading-none">
                Особистий Кабінет
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono uppercase tracking-wider">
                Простір дослідника екосистеми AuraHub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switched only if user is Admin */}
            {userRole === 'admin' && (
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shrink-0">
                <button
                  id="tab-profile-btn"
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-white dark:bg-[#121824] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Профіль</span>
                </button>
                <button
                  id="tab-admin-btn"
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Керування ({adminStats.total || '...'})</span>
                </button>
              </div>
            )}

            <button 
              id="cabinet-close-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-300 transition cursor-pointer"
            >
              Закрити
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {/* 1. Main Profile Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-gray-50/50 dark:bg-[#121824]/40 border border-gray-100 dark:border-gray-800/50 rounded-2xl">
                  {/* Photo & Role */}
                  <div className="flex flex-col items-center text-center p-3 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800/60">
                    <img 
                      src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                      alt={user.displayName || 'Google User'}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 dark:border-gray-700 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <h3 className="font-display font-extrabold text-base text-gray-900 dark:text-white mt-3 leading-tight">
                      {user.displayName || 'Гість AuraHub'}
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate max-w-full">
                      {user.email}
                    </p>

                    <div className="mt-3 flex gap-1 flex-wrap justify-center">
                      {userRole === 'admin' ? (
                        <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          Власник системи
                        </span>
                      ) : userRole === 'editor' ? (
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          Редактор
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          Читач екосистеми
                        </span>
                      )}
                      {isSimulated && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                          Тест сесія
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Status Editor */}
                  <div className="md:col-span-2 flex flex-col justify-between p-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                          Ваш поточний статус у мережі
                        </span>
                        {!isEditingStatus && (
                          <button
                            id="edit-status-btn"
                            onClick={() => { setTempStatus(statusText); setIsEditingStatus(true); }}
                            className="text-[10px] text-[#1A73E8] dark:text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Змінити статус</span>
                          </button>
                        )}
                      </div>

                      {isEditingStatus ? (
                        <div className="space-y-2">
                          <textarea
                            id="status-editor-textarea"
                            className="w-full bg-white dark:bg-[#182235] border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-800 dark:text-gray-100 outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]/30 font-sans resize-none h-20"
                            placeholder="Чим ви зараз займаєтесь, досліджуєте чи над чим працюєте?"
                            value={tempStatus}
                            onChange={(e) => setTempStatus(e.target.value)}
                            maxLength={150}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              id="cancel-status-btn"
                              onClick={() => setIsEditingStatus(false)}
                              className="px-3 py-1 bg-gray-150 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 rounded-lg text-[10px] font-semibold text-gray-500 dark:text-gray-400 transition cursor-pointer"
                            >
                              Скасувати
                            </button>
                            <button
                              id="save-status-btn"
                              onClick={handleSaveStatus}
                              className="px-3 py-1 bg-[#1A73E8] hover:bg-[#1A73E8]/90 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer"
                            >
                              Зберегти
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white dark:bg-[#182235]/40 rounded-xl border border-gray-100 dark:border-gray-800/80 text-xs italic text-gray-650 dark:text-gray-350 min-h-[50px] flex items-center leading-relaxed">
                          "{statusText || 'Немає статусу. Розкажіть світові над чим працюєте.'}"
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-450 dark:text-gray-500 font-mono mt-3 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Будь-які зміни автоматично записуються у ваш хмарний профіль Google</span>
                    </div>
                  </div>
                </div>

                {/* 2. Administrator Special Controls Panel */}
                {userRole === 'admin' && (
                  <div className="p-5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Адміністративний режим перегляду</span>
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans max-w-xl">
                          Ви можете увімкнути <strong>Режим Користувача</strong>. Це відключить всі можливості редагування, кнопки створення/зміни контенту і повністю приховає ваші чернетки. Ви зможете протестувати сайт точно так само, як його бачать звичайні гості.
                        </p>
                      </div>

                      <button
                        id="user-mode-toggle"
                        onClick={() => onToggleUserMode(!isUserModeActive)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm border shrink-0 ${
                          isUserModeActive 
                            ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                            : 'bg-white dark:bg-[#121824] text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/5'
                        }`}
                      >
                        {isUserModeActive ? (
                          <>
                            <EyeOff className="w-4 h-4 animate-bounce" />
                            <span>Режим Користувача (АКТИВНИЙ)</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>Увімкнути режим користувача</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isUserModeActive && (
                      <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/10 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 font-sans flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Наразі ви у звичайному режимі читача. Для створення та редагування розділів вимкніть його тут.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Stats & Ecosystem Activity Tracking */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 font-mono">
                    Ваша активність та Статистика
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Read Chapters */}
                    <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl border border-purple-500/10 flex flex-col justify-between min-h-[90px]">
                      <div className="flex items-center justify-between text-purple-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Читання глав</span>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">{readChaptersCount}</div>
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">прочитаних розділів книги</div>
                      </div>
                    </div>

                    {/* Biohacking Steps */}
                    <div className="p-4 bg-teal-500/5 dark:bg-teal-500/10 rounded-2xl border border-teal-500/10 flex flex-col justify-between min-h-[90px]">
                      <div className="flex items-center justify-between text-teal-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Біохакінг</span>
                        <HeartPulse className="w-4 h-4" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400">{checkedStepsCount}</div>
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">виконаних кроків протоколів</div>
                      </div>
                    </div>

                    {/* Blog Reactions */}
                    <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/10 flex flex-col justify-between min-h-[90px]">
                      <div className="flex items-center justify-between text-amber-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Інтерактив</span>
                        <ThumbsUp className="w-4 h-4" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black font-mono text-amber-500 dark:text-amber-400">{reactionsCount}</div>
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">лайків та реакцій залишено</div>
                      </div>
                    </div>

                    {/* Total Knowledge Garden */}
                    <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/10 flex flex-col justify-between min-h-[90px]">
                      <div className="flex items-center justify-between text-blue-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Сад знань</span>
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="mt-2">
                        <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">{gardenCount}</div>
                        <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">активних нотаток у саду</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ecosystem Database content sizes stats */}
                <div className="p-4 bg-gray-50 dark:bg-[#121824] rounded-2xl border border-gray-150 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span>База Даних AuraHub:</span>
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>Проекти: <strong>{portfolioCount}</strong></span>
                    <span>Дописи: <strong>{blogCount}</strong></span>
                    <span>Нотатки: <strong>{gardenCount}</strong></span>
                    <span>Протоколи: <strong>{healthCount}</strong></span>
                    <span>Книги/глави: <strong>{bookCount}</strong></span>
                  </div>
                </div>

              </motion.div>
            ) : (
              // ----------------------------------------------------
              // TAB: ADMIN MANAGEMENT (PAST ADMINPANEL.TSX CODE)
              // ----------------------------------------------------
              <motion.div
                key="admin-tab"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                {/* Dashboard stats strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                  <div className="p-3 bg-gray-50 dark:bg-[#121824] rounded-2xl border border-gray-100 dark:border-gray-800/40 text-center">
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">Всього користувачів</div>
                    <div className="text-2xl font-black mt-1 font-mono text-gray-800 dark:text-gray-100">{adminStats.total}</div>
                  </div>
                  <div className="p-3 bg-red-500/5 dark:bg-red-500/10 rounded-2xl border border-red-500/10 text-center">
                    <div className="text-xs text-red-500/70 font-medium flex items-center justify-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Адміністратори
                    </div>
                    <div className="text-2xl font-black mt-1 font-mono text-red-500">{adminStats.admins}</div>
                  </div>
                  <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/10 text-center">
                    <div className="text-xs text-indigo-500/70 font-medium flex items-center justify-center gap-1">
                      <Edit className="w-3.5 h-3.5" />
                      Редактори
                    </div>
                    <div className="text-2xl font-black mt-1 font-mono text-indigo-500">{adminStats.editors}</div>
                  </div>
                  <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-center">
                    <div className="text-xs text-emerald-500/70 font-medium flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Читачі
                    </div>
                    <div className="text-2xl font-black mt-1 font-mono text-emerald-500">{adminStats.regular}</div>
                  </div>
                </div>

                {/* Error Banner */}
                {adminErrorMessage && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-sans">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{adminErrorMessage}</span>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </span>
                  <input
                    id="admin-search-input"
                    type="text"
                    placeholder="Шукати користувача за іменем або поштою..."
                    className="w-full bg-gray-50 dark:bg-[#121824] border border-gray-100 dark:border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20 text-gray-900 dark:text-gray-100"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Users Table */}
                <div className="border border-gray-100 dark:border-gray-800/60 rounded-2xl bg-white dark:bg-[#0a0e1a] overflow-hidden">
                  {adminLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
                      <p className="text-xs font-mono">Отримання профілів з Firestore...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <p className="text-xs font-sans">Користувачів не знайдено</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-gray-50 dark:bg-[#121824] border-b border-gray-100 dark:border-gray-800 text-[10px] font-mono uppercase text-gray-400 dark:text-gray-500 sticky top-0">
                          <tr>
                            <th className="py-3 px-4">Користувач</th>
                            <th className="py-3 px-4">Роль</th>
                            <th className="py-3 px-4">Поточний Стан</th>
                            <th className="py-3 px-4 text-right">Управління ролями</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                          {filteredUsers.map((u) => {
                            const status = actionStatus[u.uid] || 'idle';
                            const isSelf = u.email === 'yurii.blackheart@gmail.com';
                            
                            return (
                              <tr 
                                key={u.uid} 
                                className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors ${
                                  isSelf ? 'bg-red-500/5 dark:bg-red-500/5' : ''
                                }`}
                              >
                                {/* User Details */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-bold border border-gray-200 dark:border-gray-700">
                                      {u.displayName.charAt(0)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
                                        {u.displayName}
                                        {isSelf && (
                                          <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-black">
                                            Власник
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]">
                                        {u.email}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Role Badge */}
                                <td className="py-3 px-4">
                                  {u.role === 'admin' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 font-semibold text-[10px]">
                                      <Shield className="w-3 h-3" />
                                      Адміністратор
                                    </span>
                                  ) : u.role === 'editor' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold text-[10px]">
                                      <Edit className="w-3 h-3" />
                                      Редактор
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold text-[10px]">
                                      <UserIcon className="w-3 h-3" />
                                      Користувач
                                    </span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-3 px-4 text-gray-400 dark:text-gray-500 max-w-[150px] truncate italic">
                                  {u.statusText || 'Немає статусу'}
                                </td>

                                {/* Action Dropdown */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {status === 'saving' && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                                    {status === 'saved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                    {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}

                                    <select
                                      id={`role-select-${u.uid}`}
                                      disabled={isSelf || status === 'saving'}
                                      value={u.role}
                                      onChange={(e) => handleRoleChange(u.uid, e.target.value as 'admin' | 'editor' | 'user')}
                                      className="bg-gray-50 dark:bg-[#121824] border border-gray-200 dark:border-gray-800 text-[11px] rounded-lg py-1 px-2 text-gray-700 dark:text-gray-200 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                                    >
                                      <option value="user">Читач (User)</option>
                                      <option value="editor">Редактор (Editor)</option>
                                      <option value="admin">Адмін (Admin)</option>
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center justify-between font-mono border-t border-gray-100 dark:border-gray-800/40 pt-4 shrink-0">
                  <div className="flex items-center gap-1 text-red-500/80">
                    <Award className="w-3.5 h-3.5 animate-pulse" />
                    <span>Захищено правилами Firestore Security Rules</span>
                  </div>
                  <span>Звіти підписуються криптографічно Google</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
