import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, 
  BookOpen, 
  Brain, 
  HeartPulse, 
  Book, 
  Search, 
  Sparkles, 
  Edit2, 
  Check, 
  X, 
  Compass, 
  Activity,
  ArrowRight,
  Sun,
  Moon,
  Lock,
  ShieldAlert,
  Chrome,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Dices,
  Map
} from 'lucide-react';
import { ModuleType, ChangelogEvent } from './types';
import { INITIAL_CHANGELOG, PORTFOLIO_DATA, BLOG_DATA, GARDEN_DATA, HEALTH_DATA, BOOK_DATA, EXTRA_STORIES } from './data';
import { getBookDefaultChapters, getBookDefaultExtraStories } from './booksData';

// Firebase imports
import { User, signInWithPopup } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth, googleProvider, loginWithSimulatedGoogle } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Views
import PortfolioView from './components/PortfolioView';
import BlogView from './components/BlogView';
import GardenView from './components/GardenView';
import HealthView from './components/HealthView';
import BookView from './components/BookView';

// Interactive Components
import Omnibar from './components/Omnibar';
import Changelog from './components/Changelog';
import Glossary from './components/Glossary';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('hub');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoveredModule, setHoveredModule] = useState<ModuleType | null>(null);

  // Dynamic Content States
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>(() => {
    const saved = localStorage.getItem('prism_portfolio_projects');
    return saved ? JSON.parse(saved) : PORTFOLIO_DATA;
  });

  const [blogPosts, setBlogPosts] = useState<any[]>(() => {
    const saved = localStorage.getItem('prism_blog_posts');
    return saved ? JSON.parse(saved) : BLOG_DATA;
  });

  const [gardenNotes, setGardenNotes] = useState<any[]>(() => {
    const saved = localStorage.getItem('prism_garden_notes');
    return saved ? JSON.parse(saved) : GARDEN_DATA;
  });

  const [healthProtocols, setHealthProtocols] = useState<any[]>(() => {
    const saved = localStorage.getItem('prism_health_protocols');
    return saved ? JSON.parse(saved) : HEALTH_DATA;
  });

  const [bookChapters, setBookChapters] = useState<any[]>(() => {
    const activeBookId = localStorage.getItem('prism_active_book_id') || 'glass-prism';
    const saved = localStorage.getItem(`prism_book_chapters_${activeBookId}`);
    return saved ? JSON.parse(saved) : getBookDefaultChapters(activeBookId);
  });

  const [extraStories, setExtraStories] = useState<any[]>(() => {
    const activeBookId = localStorage.getItem('prism_active_book_id') || 'glass-prism';
    const saved = localStorage.getItem(`prism_extra_stories_${activeBookId}`);
    return saved ? JSON.parse(saved) : getBookDefaultExtraStories(activeBookId);
  });

  // LocalStorage Persistence Sync
  useEffect(() => {
    localStorage.setItem('prism_portfolio_projects', JSON.stringify(portfolioProjects));
  }, [portfolioProjects]);

  useEffect(() => {
    localStorage.setItem('prism_blog_posts', JSON.stringify(blogPosts));
  }, [blogPosts]);

  useEffect(() => {
    localStorage.setItem('prism_garden_notes', JSON.stringify(gardenNotes));
  }, [gardenNotes]);

  useEffect(() => {
    localStorage.setItem('prism_health_protocols', JSON.stringify(healthProtocols));
  }, [healthProtocols]);

  useEffect(() => {
    const activeBookId = localStorage.getItem('prism_active_book_id') || 'glass-prism';
    localStorage.setItem(`prism_book_chapters_${activeBookId}`, JSON.stringify(bookChapters));
  }, [bookChapters]);

  useEffect(() => {
    const activeBookId = localStorage.getItem('prism_active_book_id') || 'glass-prism';
    localStorage.setItem(`prism_extra_stories_${activeBookId}`, JSON.stringify(extraStories));
  }, [extraStories]);

  // Tracking refs to detect new publications dynamically
  const prevPortfolioRef = useRef<string[]>(portfolioProjects.map((p: any) => p.id));
  const prevBlogRef = useRef<string[]>(blogPosts.map((p: any) => p.id));
  const prevGardenRef = useRef<string[]>(gardenNotes.map((n: any) => n.id));
  const prevHealthRef = useRef<string[]>(healthProtocols.map((h: any) => h.id));
  const prevChaptersRef = useRef<string[]>(bookChapters.map((c: any) => c.id));
  const prevStoriesRef = useRef<string[]>(extraStories.map((s: any) => s.id));

  // Automated publication event generator helper
  const autoAddChangelogEvent = (description: string, module: ModuleType, type: 'оновлення' | 'досягнення' | 'публікація', targetId: string) => {
    const newEvent: ChangelogEvent = {
      id: `ch-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time: 'Щойно',
      timestamp: new Date(),
      description,
      module,
      type,
      targetId
    };

    setChangelogEvents(prev => {
      const updatedEvents = [newEvent, ...prev.slice(0, 15)];
      if (user) {
        saveToCloud(statusText, updatedEvents);
      }
      return updatedEvents;
    });
  };

  // 1. Portfolio addition detection
  useEffect(() => {
    const currentIds = portfolioProjects.map((p: any) => p.id);
    const addedIds = currentIds.filter(id => !prevPortfolioRef.current.includes(id));
    if (addedIds.length > 0) {
      addedIds.forEach(id => {
        const proj = portfolioProjects.find((p: any) => p.id === id);
        if (proj) {
          autoAddChangelogEvent(
            `Опубліковано новий проект у портфоліо: «${proj.title}»`,
            'portfolio',
            'публікація',
            proj.id
          );
        }
      });
    }
    prevPortfolioRef.current = currentIds;
  }, [portfolioProjects]);

  // 2. Blog addition detection
  useEffect(() => {
    const currentIds = blogPosts.map((p: any) => p.id);
    const addedIds = currentIds.filter(id => !prevBlogRef.current.includes(id));
    if (addedIds.length > 0) {
      addedIds.forEach(id => {
        const post = blogPosts.find((p: any) => p.id === id);
        if (post) {
          autoAddChangelogEvent(
            `Опубліковано новий допис у блозі: «${post.title}»`,
            'blog',
            'публікація',
            post.id
          );
        }
      });
    }
    prevBlogRef.current = currentIds;
  }, [blogPosts]);

  // 3. Garden addition detection
  useEffect(() => {
    const currentIds = gardenNotes.map((n: any) => n.id);
    const addedIds = currentIds.filter(id => !prevGardenRef.current.includes(id));
    if (addedIds.length > 0) {
      addedIds.forEach(id => {
        const note = gardenNotes.find((n: any) => n.id === id);
        if (note) {
          autoAddChangelogEvent(
            `Додано нову інтелектуальну нотатку в Сад: «${note.title}»`,
            'garden',
            'оновлення',
            note.id
          );
        }
      });
    }
    prevGardenRef.current = currentIds;
  }, [gardenNotes]);

  // 4. Health addition detection
  useEffect(() => {
    const currentIds = healthProtocols.map((h: any) => h.id);
    const addedIds = currentIds.filter(id => !prevHealthRef.current.includes(id));
    if (addedIds.length > 0) {
      addedIds.forEach(id => {
        const proto = healthProtocols.find((h: any) => h.id === id);
        if (proto) {
          autoAddChangelogEvent(
            `Розроблено новий протокол біохакінгу: «${proto.title}»`,
            'health',
            'досягнення',
            proto.id
          );
        }
      });
    }
    prevHealthRef.current = currentIds;
  }, [healthProtocols]);

  // 5. Book chapter addition detection
  useEffect(() => {
    const currentIds = bookChapters.map((c: any) => c.id);
    const addedIds = currentIds.filter(id => !prevChaptersRef.current.includes(id));
    if (addedIds.length > 0) {
      addedIds.forEach(id => {
        const chapter = bookChapters.find((c: any) => c.id === id);
        if (chapter) {
          autoAddChangelogEvent(
            `Написано новий розділ книги: «${chapter.title}»`,
            'book',
            'публікація',
            chapter.id
          );
        }
      });
    }
    prevChaptersRef.current = currentIds;
  }, [bookChapters]);

  // 6. Extra stories addition detection
  useEffect(() => {
    const currentIds = extraStories.map((s: any) => s.id);
    const addedIds = currentIds.filter(id => !prevStoriesRef.current.includes(id));
    if (addedIds.length > 0) {
      addedIds.forEach(id => {
        const story = extraStories.find((s: any) => s.id === id);
        if (story) {
          autoAddChangelogEvent(
            `Написано нове оповідання або лор: «${story.title}»`,
            'book',
            'публікація',
            story.id
          );
        }
      });
    }
    prevStoriesRef.current = currentIds;
  }, [extraStories]);
  
  // Theme state (persistent and reactive to system pref)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('prism_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Apply root document dark class
  useEffect(() => {
    localStorage.setItem('prism_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // User State & Cloud Sync
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'user'>('user');
  const [showUserCabinet, setShowUserCabinet] = useState(false);
  const [isUserModeActive, setIsUserModeActive] = useState(false);
  const [isSimulatedUser, setIsSimulatedUser] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Auth Restrict states & fallback fields
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showSimSection, setShowSimSection] = useState(false);
  const [simName, setSimName] = useState('Yurii Blackheart');
  const [simEmail, setSimEmail] = useState('yurii.blackheart@gmail.com');
  const [simPhoto, setSimPhoto] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80');

  const handleModalGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setIsSimulatedUser(false);
      setShowAuthModal(false);
    } catch (error: any) {
      console.warn("Firebase sign-in popup error in modal, showing iframe simulator:", error);
      setShowSimSection(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModalSimulatedSignIn = async () => {
    setAuthLoading(true);
    try {
      const mockUser = await loginWithSimulatedGoogle(simEmail, simName, simPhoto);
      setUser(mockUser);
      setIsSimulatedUser(true);
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Status Bar state
  const [statusText, setStatusText] = useState<string>(() => {
    return localStorage.getItem('prism_status_text') || 
      'Зараз: Розробляю EEG Neuro-Focus Tracker · Тестую синергію L-теаніну · Пишу Розділ 2 книги';
  });
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [tempStatusText, setTempStatusText] = useState(statusText);

  // Changelog Events State
  const [changelogEvents, setChangelogEvents] = useState<ChangelogEvent[]>(() => {
    const saved = localStorage.getItem('prism_changelog_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
      } catch (err) { /* fallback */ }
    }
    return INITIAL_CHANGELOG;
  });

  // Save changelog on changes locally
  useEffect(() => {
    localStorage.setItem('prism_changelog_events', JSON.stringify(changelogEvents));
  }, [changelogEvents]);

  // Synchronize status and changelog events with Firestore on user login
  useEffect(() => {
    const syncUserDataOnLogin = async () => {
      if (!user) {
        setSyncStatus('idle');
        setUserRole('user');
        return;
      }
      setSyncStatus('syncing');
      const userDocPath = `users/${user.uid}`;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        let userDocSnap;
        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (fetchErr) {
          handleFirestoreError(fetchErr, OperationType.GET, userDocPath);
          return;
        }

        let activeRole: 'admin' | 'editor' | 'user' = 'user';
        if (user.email === 'yurii.blackheart@gmail.com') {
          activeRole = 'admin';
        }
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.statusText) {
            setStatusText(data.statusText);
            setTempStatusText(data.statusText);
          }
          if (data.changelogEvents && Array.isArray(data.changelogEvents)) {
            const loadedEvents = data.changelogEvents.map((e: any) => ({
              ...e,
              timestamp: e.timestamp ? new Date(e.timestamp) : new Date()
            }));
            setChangelogEvents(loadedEvents);
          }

          // Use stored role if present
          if (data.role) {
            activeRole = user.email === 'yurii.blackheart@gmail.com' ? 'admin' : data.role;
          }
          setUserRole(activeRole);

          // If role field in Firestore is out of sync, write it back
          if (data.role !== activeRole) {
            await setDoc(userDocRef, { role: activeRole }, { merge: true });
          }
        } else {
          // Initialize user document in firestore with local data and role
          try {
            await setDoc(userDocRef, {
              statusText: statusText,
              changelogEvents: changelogEvents.map(e => ({
                ...e,
                timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp
              })),
              email: user.email,
              displayName: user.displayName,
              updatedAt: new Date().toISOString(),
              role: activeRole
            });
            setUserRole(activeRole);
          } catch (writeErr) {
            handleFirestoreError(writeErr, OperationType.CREATE, userDocPath);
            return;
          }
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error("Error syncing user data:", err);
        setSyncStatus('error');
      }
    };

    syncUserDataOnLogin();
  }, [user]);

  // Helper to save data to Firestore
  const saveToCloud = async (newStatus: string, newEvents: ChangelogEvent[]) => {
    if (!user) return;
    setSyncStatus('syncing');
    const userDocPath = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userDocRef, {
          statusText: newStatus,
          changelogEvents: newEvents.map(e => ({
            ...e,
            timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp
          })),
          email: user.email,
          displayName: user.displayName,
          updatedAt: new Date().toISOString(),
          role: userRole
        }, { merge: true });
      } catch (writeErr) {
        handleFirestoreError(writeErr, OperationType.UPDATE, userDocPath);
        return;
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error("Cloud save failed", err);
      setSyncStatus('error');
    }
  };

  // Handle adding a new mock event to watch Pulse update live!
  const handleAddChangelogEvent = (description: string, module: ModuleType, type: 'оновлення' | 'досягнення' | 'публікація') => {
    // Select a corresponding target item to link if possible
    let targetId = '';
    if (module === 'portfolio') targetId = portfolioProjects[0]?.id || '';
    else if (module === 'blog') targetId = blogPosts[0]?.id || '';
    else if (module === 'garden') targetId = gardenNotes[0]?.id || '';
    else if (module === 'health') targetId = healthProtocols[0]?.id || '';
    else if (module === 'book') targetId = bookChapters[0]?.id || '';

    const newEvent: ChangelogEvent = {
      id: `ch-custom-${Date.now()}`,
      time: 'Щойно',
      timestamp: new Date(),
      description,
      module,
      type,
      targetId
    };

    const updatedEvents = [newEvent, ...changelogEvents.slice(0, 5)];
    setChangelogEvents(updatedEvents);
    
    if (user) {
      saveToCloud(statusText, updatedEvents);
    }
  };

  const handleSaveStatus = () => {
    setStatusText(tempStatusText);
    localStorage.setItem('prism_status_text', tempStatusText);
    setIsEditingStatus(false);
    
    if (user) {
      saveToCloud(tempStatusText, changelogEvents);
    }
  };

  // Navigates directly to specific item
  const handleSelectResult = (module: ModuleType, itemId: string) => {
    setSelectedItemId(itemId);
    setActiveModule(module);
  };

  // Surprise Me Choice helper
  const handleSurpriseMe = () => {
    // Pick a random module from the five
    const modules: ModuleType[] = ['portfolio', 'blog', 'garden', 'health', 'book'];
    const randomModule = modules[Math.floor(Math.random() * modules.length)];
    let randomItemId = '';

    if (randomModule === 'portfolio') {
      const items = portfolioProjects;
      randomItemId = items.length > 0 ? items[Math.floor(Math.random() * items.length)].id : '';
    } else if (randomModule === 'blog') {
      const items = blogPosts;
      randomItemId = items.length > 0 ? items[Math.floor(Math.random() * items.length)].id : '';
    } else if (randomModule === 'garden') {
      const items = gardenNotes;
      randomItemId = items.length > 0 ? items[Math.floor(Math.random() * items.length)].id : '';
    } else if (randomModule === 'health') {
      const items = healthProtocols;
      randomItemId = items.length > 0 ? items[Math.floor(Math.random() * items.length)].id : '';
    } else if (randomModule === 'book') {
      const items = bookChapters;
      randomItemId = items.length > 0 ? items[Math.floor(Math.random() * items.length)].id : '';
    }

    if (randomItemId) {
      // Direct transition to the selected random node
      handleSelectResult(randomModule, randomItemId);
    }
  };

  // Background tint styling map based on Hovered State
  const getBackgroundColor = () => {
    const isDark = theme === 'dark';
    if (isDark) {
      switch (hoveredModule) {
        case 'portfolio': return '#1d0c0e'; // Deep crimson slate
        case 'blog': return '#1a1306';      // Deep gold/amber slate
        case 'garden': return '#071120';    // Deep sapphire slate
        case 'health': return '#061614';    // Deep emerald slate
        case 'book':
        case 'lore-graph':
        case 'world-map': return '#130a21'; // Deep amethyst slate
        default: return '#090d16';          // Elegant cosmic dark background
      }
    } else {
      switch (hoveredModule) {
        case 'portfolio': return '#FFF5F5'; // Very light coral-red
        case 'blog': return '#FFFDF2'; // Very light amber
        case 'garden': return '#F5F9FF'; // Very light blue
        case 'health': return '#F5FAFA'; // Very light teal-green
        case 'book':
        case 'lore-graph':
        case 'world-map': return '#FAF6FF'; // Very light purple
        default: return '#F8F9FA'; // Rest light gray core background
      }
    }
  };

  const renderModuleView = () => {
    const canEdit = true;
    switch (activeModule) {
      case 'portfolio':
        return (
          <PortfolioView 
            projects={portfolioProjects}
            onUpdateProjects={setPortfolioProjects}
            canEdit={canEdit}
            initialProjectId={selectedItemId} 
            onBackToHub={() => { setActiveModule('hub'); setSelectedItemId(null); }} 
          />
        );
      case 'blog':
        return (
          <BlogView 
            posts={blogPosts}
            onUpdatePosts={setBlogPosts}
            canEdit={canEdit}
            initialPostId={selectedItemId} 
            onBackToHub={() => { setActiveModule('hub'); setSelectedItemId(null); }} 
          />
        );
      case 'garden':
        return (
          <GardenView 
            notes={gardenNotes}
            onUpdateNotes={setGardenNotes}
            canEdit={canEdit}
            initialNoteId={selectedItemId} 
            onBackToHub={() => { setActiveModule('hub'); setSelectedItemId(null); }} 
          />
        );
      case 'health':
        return (
          <HealthView 
            protocols={healthProtocols}
            onUpdateProtocols={setHealthProtocols}
            canEdit={canEdit}
            initialProtocolId={selectedItemId} 
            onBackToHub={() => { setActiveModule('hub'); setSelectedItemId(null); }} 
          />
        );
      case 'book':
      case 'lore-graph':
      case 'world-map':
        return (
          <BookView 
            chapters={bookChapters}
            onUpdateChapters={setBookChapters}
            extraStories={extraStories}
            onUpdateExtraStories={setExtraStories}
            canEdit={canEdit}
            initialChapterId={selectedItemId} 
            activeModule={activeModule}
            onNavigateToModule={(mod) => {
              setActiveModule(mod);
              if (mod === 'book') {
                setSelectedItemId(null);
              }
            }}
            onBackToHub={() => { setActiveModule('hub'); setSelectedItemId(null); }} 
          />
        );
      default:
        return null;
    }
  };

  // Keyboard shortcut handler for Omnibar (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (activeModule !== 'hub') {
    return (
      <div className="bg-white dark:bg-[#090d16] min-h-screen text-gray-900 dark:text-gray-100 transition-all duration-300 flex flex-col">
        {isUserModeActive && userRole === 'admin' && (
          <div className="w-full bg-emerald-500 text-white py-2 px-4 text-center text-xs font-medium flex items-center justify-center gap-2 shadow-md shrink-0 z-50">
            <Eye className="w-4 h-4" />
            <span>Ви переглядаєте сайт у режимі звичайного користувача (всі функції адміна приховано).</span>
            <button
              onClick={() => setIsUserModeActive(false)}
              className="bg-white text-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-50 transition ml-2 shadow-sm uppercase tracking-wider cursor-pointer"
            >
              Вимкнути режим користувача
            </button>
          </div>
        )}
        <div className="flex-1">
          {renderModuleView()}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-20 px-4 sm:px-6 transition-all duration-700 ease-out flex flex-col font-sans"
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {/* 1. ADMIN USER MODE PREVIEW BANNER ON HUB */}
      {isUserModeActive && userRole === 'admin' && (
        <div className="w-full max-w-6xl mx-auto mt-4 -mb-4 bg-emerald-500 text-white py-2.5 px-4 rounded-2xl text-center text-xs font-medium flex items-center justify-center gap-2 shadow-md animate-pulse shrink-0 z-10">
          <Eye className="w-4.5 h-4.5" />
          <span>Ви переглядаєте сайт у режимі звичайного користувача. Всі функції створення контенту та чернетки приховано.</span>
          <button
            onClick={() => setIsUserModeActive(false)}
            className="bg-white text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-bold hover:bg-emerald-50 transition ml-2 shadow-sm uppercase tracking-wider cursor-pointer"
          >
            Повернутися до режиму адміна
          </button>
        </div>
      )}
      
      {/* 2. MAIN HEADER (AURA WHITE/DARK CORE) */}
      <header className="w-full max-w-6xl mx-auto mt-12 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-100/50 dark:border-gray-800/60 pb-8">
        <div className="space-y-1.5 text-center md:text-left">
          <h1 className="font-display font-black text-4xl tracking-tight text-gray-900 dark:text-white leading-none flex items-center justify-center md:justify-start gap-1">
            AURA<span className="text-gray-400 dark:text-gray-500 font-light">HUB</span>
          </h1>
          <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">
            Гармонійний простір вашої особистості та спектр інтересів.
          </p>
        </div>

        {/* ACTIONS & AUTHENTICATION */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* SEARCH TRIGGER + SURPRISE ME + THEME TOGGLE */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
            {/* Omnibar Input Mimic Button */}
            <button 
              id="header-search-trigger"
              onClick={() => setIsSearchOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-between gap-10 px-4 py-2 bg-white dark:bg-[#121824] hover:bg-gray-50 dark:hover:bg-gray-800/80 border border-gray-100 dark:border-gray-800 rounded-xl text-xs text-gray-400 dark:text-gray-500 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span>Шукати в екосистемі...</span>
              </div>
              <span className="hidden sm:inline bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500 dark:text-gray-400">⌘K</span>
            </button>

            {/* Surprise Me Button (Dices Icon) */}
            <button
              id="surprise-me-btn"
              onClick={handleSurpriseMe}
              className="flex items-center justify-center p-2.5 bg-white dark:bg-[#121824] hover:bg-gray-50 dark:hover:bg-gray-800/80 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition cursor-pointer"
              title="Здивуй мене випадковою нотаткою чи розділом"
            >
              <Dices className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </button>

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="flex items-center justify-center p-2.5 bg-white dark:bg-[#121824] hover:bg-gray-50 dark:hover:bg-gray-800/80 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition cursor-pointer"
              title={theme === 'light' ? 'Перемкнути на темну тему' : 'Перемкнути на світлу тему'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. NAVIGATION GRID - SPECTRUM (THE PRISM EFFECT) */}
      <main className="w-full max-w-6xl mx-auto flex-1">
        
        {/* Five core module tiles */}
        <div id="prism-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-12">
          
          {/* MODULE: Portfolio (Coral Red #E63946) */}
          <div
            id="tile-portfolio"
            onClick={() => handleSelectResult('portfolio', '')}
            onMouseEnter={() => setHoveredModule('portfolio')}
            onMouseLeave={() => setHoveredModule(null)}
            className="group cursor-pointer rounded-2xl p-6 bg-white dark:bg-[#121824] border border-[#E63946]/20 dark:border-[#E63946]/10 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between h-48 transition-all duration-500 hover:-translate-y-1.5 hover:bg-[#E63946] hover:border-[#E63946] dark:hover:bg-[#E63946] dark:hover:border-[#E63946]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#E63946]/5 text-[#E63946] border border-[#E63946]/10 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-all">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
            </div>

            <div className="space-y-1 mt-6">
              <span className="text-[10px] tracking-widest font-bold uppercase text-[#E63946]/60 dark:text-[#E63946]/70 font-mono group-hover:text-white/70 transition">
                Дія & Результати
              </span>
              <h2 className="font-display font-extrabold text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-white transition leading-none">
                Portfolio
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 group-hover:text-white/80 transition leading-snug font-sans line-clamp-2 mt-1">
                Енергія, конкретні розробки, показники проектів та інструменти.
              </p>
            </div>
          </div>

          {/* MODULE: Blog (Amber #FFB703) */}
          <div
            id="tile-blog"
            onClick={() => handleSelectResult('blog', '')}
            onMouseEnter={() => setHoveredModule('blog')}
            onMouseLeave={() => setHoveredModule(null)}
            className="group cursor-pointer rounded-2xl p-6 bg-white dark:bg-[#121824] border border-[#FFB703]/20 dark:border-[#FFB703]/10 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between h-48 transition-all duration-500 hover:-translate-y-1.5 hover:bg-[#FFB703] hover:border-[#FFB703] dark:hover:bg-[#FFB703] dark:hover:border-[#FFB703]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#FFB703]/5 text-[#FFB703] border border-[#FFB703]/10 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-all">
                <BookOpen className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
            </div>

            <div className="space-y-1 mt-6">
              <span className="text-[10px] tracking-widest font-bold uppercase text-[#FFB703]/60 dark:text-[#FFB703]/70 font-mono group-hover:text-white/70 transition">
                Рефлексія & Слово
              </span>
              <h2 className="font-display font-extrabold text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-white transition leading-none">
                Blog
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 group-hover:text-white/80 transition leading-snug font-sans line-clamp-2 mt-1">
                Творчі роздуми, особисті есеї про технології та світ навколо.
              </p>
            </div>
          </div>

          {/* MODULE: Garden (Classic Blue #1A73E8) */}
          <div
            id="tile-garden"
            onClick={() => handleSelectResult('garden', '')}
            onMouseEnter={() => setHoveredModule('garden')}
            onMouseLeave={() => setHoveredModule(null)}
            className="group cursor-pointer rounded-2xl p-6 bg-white dark:bg-[#121824] border border-[#1A73E8]/20 dark:border-[#1A73E8]/10 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between h-48 transition-all duration-500 hover:-translate-y-1.5 hover:bg-[#1A73E8] hover:border-[#1A73E8] dark:hover:bg-[#1A73E8] dark:hover:border-[#1A73E8]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#1A73E8]/5 text-[#1A73E8] border border-[#1A73E8]/10 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-all">
                <Brain className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
            </div>

            <div className="space-y-1 mt-6">
              <span className="text-[10px] tracking-widest font-bold uppercase text-[#1A73E8]/60 dark:text-[#1A73E8]/70 font-mono group-hover:text-white/70 transition">
                Мережа Знань
              </span>
              <h2 className="font-display font-extrabold text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-white transition leading-none">
                Garden
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 group-hover:text-white/80 transition leading-snug font-sans line-clamp-2 mt-1">
                Цифровий сад вічнозелених пов’язаних нотаток та системного мислення.
              </p>
            </div>
          </div>

          {/* MODULE: Health (Teal Green #2A9D8F) */}
          <div
            id="tile-health"
            onClick={() => handleSelectResult('health', '')}
            onMouseEnter={() => setHoveredModule('health')}
            onMouseLeave={() => setHoveredModule(null)}
            className="group cursor-pointer rounded-2xl p-6 bg-white dark:bg-[#121824] border border-[#2A9D8F]/20 dark:border-[#2A9D8F]/10 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between h-48 transition-all duration-500 hover:-translate-y-1.5 hover:bg-[#2A9D8F] hover:border-[#2A9D8F] dark:hover:bg-[#2A9D8F] dark:hover:border-[#2A9D8F]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#2A9D8F]/5 text-[#2A9D8F] border border-[#2A9D8F]/10 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-all">
                <HeartPulse className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
            </div>

            <div className="space-y-1 mt-6">
              <span className="text-[10px] tracking-widest font-bold uppercase text-[#2A9D8F]/60 dark:text-[#2A9D8F]/70 font-mono group-hover:text-white/70 transition">
                Тіло & Біохакінг
              </span>
              <h2 className="font-display font-extrabold text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-white transition leading-none">
                Health
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 group-hover:text-white/80 transition leading-snug font-sans line-clamp-2 mt-1">
                Протоколи продуктивності, сну та нутріцевтики для балансу.
              </p>
            </div>
          </div>

          {/* MODULE: Book (Purple #8338EC) */}
          <div
            id="tile-book"
            onClick={() => handleSelectResult('book', '')}
            onMouseEnter={() => setHoveredModule('book')}
            onMouseLeave={() => setHoveredModule(null)}
            className="group cursor-pointer rounded-2xl p-6 bg-white dark:bg-[#121824] border border-[#8338EC]/20 dark:border-[#8338EC]/10 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between h-48 transition-all duration-500 hover:-translate-y-1.5 hover:bg-[#8338EC] hover:border-[#8338EC] dark:hover:bg-[#8338EC] dark:hover:border-[#8338EC]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-[#8338EC]/5 text-[#8338EC] border border-[#8338EC]/10 group-hover:bg-white/20 group-hover:text-white group-hover:border-transparent transition-all">
                <Book className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:translate-x-1.5 transition-all" />
            </div>

            <div className="space-y-1 mt-6">
              <span className="text-[10px] tracking-widest font-bold uppercase text-[#8338EC]/60 dark:text-[#8338EC]/70 font-mono group-hover:text-white/70 transition">
                Уява & Світи
              </span>
              <h2 className="font-display font-extrabold text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-white transition leading-none">
                Book
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-400 group-hover:text-white/80 transition leading-snug font-sans line-clamp-2 mt-1">
                Фентезійний світ Скляної Призми, інтерактивне читання глав.
              </p>
            </div>
          </div>

        </div>

        {/* 4. LOWER BENTO-WIDGETS PANEL: CHANCELOG (PULSE) & GLOSSARY */}
        <div id="bento-widgets" className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Left: PULSE (Changelog) */}
          <Changelog 
            events={changelogEvents} 
            onAddEvent={handleAddChangelogEvent}
            onNavigateToItem={handleSelectResult} 
            theme={theme}
            canEdit={(userRole === 'admin' || userRole === 'editor') && !isUserModeActive}
          />

          {/* Right: GLOSSARY OF ENTITIES */}
          <Glossary theme={theme} />

        </div>

      </main>

      {/* OMNIBAR SEARCH DIALOG OVERLAY */}
      <Omnibar 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelectResult={handleSelectResult} 
        portfolioProjects={portfolioProjects}
        blogPosts={blogPosts}
        gardenNotes={gardenNotes}
        healthProtocols={healthProtocols}
        bookChapters={bookChapters}
      />

    </div>
  );
}

