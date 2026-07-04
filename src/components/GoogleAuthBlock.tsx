import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  LogOut, 
  Check, 
  RefreshCw, 
  UserCheck, 
  AlertTriangle, 
  Sparkles, 
  Database,
  Chrome
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  loginWithSimulatedGoogle,
  db 
} from '../firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface GoogleAuthBlockProps {
  onUserChange: (user: User | null, isSimulated: boolean) => void;
  theme: 'light' | 'dark';
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  userRole?: 'admin' | 'editor' | 'user';
  onOpenCabinet?: () => void;
}

export default function GoogleAuthBlock({ onUserChange, theme, syncStatus, userRole = 'user', onOpenCabinet }: GoogleAuthBlockProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Monitor real Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsSimulated(false);
        onUserChange(user, false);
      } else {
        // If real user logs out, clear unless simulated user is active
        if (!isSimulated) {
          setCurrentUser(null);
          onUserChange(null, false);
        }
      }
    });
    return () => unsubscribe();
  }, [isSimulated, onUserChange]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setIsSimulated(false);
      onUserChange(result.user, false);
    } catch (error: any) {
      console.warn("Firebase sign-in popup error, logging in directly with simulated Yurii Blackheart profile:", error);
      try {
        const mockUser = await loginWithSimulatedGoogle(
          'yurii.blackheart@gmail.com',
          'Yurii Blackheart',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
        );
        setCurrentUser(mockUser);
        setIsSimulated(true);
        onUserChange(mockUser, true);
        setAuthError(null);
      } catch (simErr) {
        setAuthError("Failed to simulate user profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      if (!isSimulated) {
        await signOut(auth);
      }
      setCurrentUser(null);
      setIsSimulated(false);
      onUserChange(null, false);
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="login-trigger"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-col items-end gap-1.5"
          >
            <button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="group flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-[#121824] hover:bg-gray-50 dark:hover:bg-gray-800/80 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-xs font-semibold rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 cursor-pointer text-gray-700 dark:text-gray-300"
            >
              <Chrome className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
              <span>Увійти через Google</span>
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />}
            </button>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-tight">
              для збереження стану в хмарі
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="profile-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onOpenCabinet}
            className={`flex items-center gap-3.5 p-2.5 pl-3.5 bg-white dark:bg-[#121824] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${onOpenCabinet ? 'cursor-pointer hover:border-[#1A73E8]/30 dark:hover:border-blue-500/30 hover:bg-blue-50/10 dark:hover:bg-blue-500/5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_8px_24px_rgba(26,115,232,0.08)]' : ''}`}
            title={onOpenCabinet ? 'Відкрити особистий кабінет' : undefined}
          >
            {/* Avatar with Glow status */}
            <div className="relative">
              <img
                id="user-profile-avatar"
                src={currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.displayName || 'Google User'}
                className="w-9 h-9 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#121824] ${
                isSimulated ? 'bg-amber-500' : 'bg-emerald-500'
              }`} title={isSimulated ? 'Тестова Google сесія' : 'Хмарна Google сесія'} />
            </div>

            {/* Profile text fields */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
                  {currentUser.displayName || 'Користувач'}
                </span>
                {userRole === 'admin' ? (
                  <span className="text-[8px] bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider shrink-0">
                    ВЛАСНИК
                  </span>
                ) : userRole === 'editor' ? (
                  <span className="text-[8px] bg-indigo-500/15 text-indigo-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider shrink-0">
                    РЕДАКТОР
                  </span>
                ) : (
                  <span className="text-[8px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider shrink-0">
                    ЧИТАЧ
                  </span>
                )}
                {isSimulated ? (
                  <span className="text-[8px] bg-amber-500/10 text-amber-500 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider shrink-0">
                    TEST
                  </span>
                ) : (
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider shrink-0">
                    SYNC
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[140px]">
                {currentUser.email}
              </span>
            </div>

            {/* Cloud sync indicator */}
            <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-3">
              <div className="flex flex-col items-center justify-center">
                {syncStatus === 'syncing' && (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" title="Синхронізація з Firestore..." />
                )}
                {syncStatus === 'synced' && (
                  <Database className="w-3.5 h-3.5 text-emerald-500 animate-pulse" title="Збережено у Firestore" />
                )}
                {syncStatus === 'error' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" title="Помилка синхронізації" />
                )}
                {syncStatus === 'idle' && (
                  <Database className="w-3.5 h-3.5 text-gray-400" title="Очікування змін" />
                )}
              </div>

              {/* Logout Button */}
              <button
                id="google-logout-btn"
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                title="Вийти з акаунту"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
