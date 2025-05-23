import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Assuming AuthContext.tsx is in ../contexts/

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateNewQuiz: () => void;
  onNavigateHistory: () => void;
  onNavigateAchievements: () => void;
  onNavigateLogin: () => void;
  onNavigateSignup: () => void;
  onNavigateMultiplayer: (mode?: 'create' | 'join') => void;
  onJoinSharedQuiz?: (code: string) => Promise<void>;
  onJoinMultiplayerRoom?: (code: string) => void;
}

const NAV_LINKS = [
  { label: 'New Quiz', icon: 'fas fa-plus-circle', action: 'onNavigateNewQuiz' },
  { label: 'History', icon: 'fas fa-history', action: 'onNavigateHistory' },
  { label: 'Achievements', icon: 'fas fa-trophy', action: 'onNavigateAchievements' },
];

const Header: React.FC<HeaderProps> = ({ 
  onNavigateHome, 
  onNavigateNewQuiz, 
  onNavigateHistory, 
  onNavigateAchievements,
  onNavigateLogin,
  onNavigateSignup,
  onNavigateMultiplayer,
  onJoinSharedQuiz,
  onJoinMultiplayerRoom
}) => {
  const { currentUser, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTab, setJoinTab] = useState<'shared' | 'multiplayer'>('shared');
  const [sharedQuizCode, setSharedQuizCode] = useState('');
  const [multiplayerCode, setMultiplayerCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      onNavigateHome();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleJoinShared = async () => {
    if (!sharedQuizCode.trim()) {
      setJoinError('Please enter a quiz code.');
      return;
    }
    setJoinError(null);
    try {
      await onJoinSharedQuiz?.(sharedQuizCode.trim());
      setShowJoinModal(false);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join shared quiz.');
    }
  };

  const handleJoinMultiplayer = () => {
    if (!multiplayerCode.trim()) {
      setJoinError('Please enter a room code.');
      return;
    }
    setJoinError(null);
    try {
      onJoinMultiplayerRoom?.(multiplayerCode.trim());
      setShowJoinModal(false);
    } catch (err) {
      setJoinError('Could not join multiplayer room.');
    }
  };

  return (
    <header className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[95vw] max-w-5xl z-50">
      <nav className="bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-2xl shadow-2xl rounded-2xl px-6 py-3 flex justify-between items-center border border-slate-700/40 transition-all duration-300">
        <div 
          className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 cursor-pointer flex items-center animate-pulse hover:scale-105 transition-transform duration-200"
          onClick={onNavigateHome}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && onNavigateHome()}
          aria-label="Go to homepage"
        >
          <i className="fas fa-brain mr-2"></i> Quiz Master Pro
        </div>
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="text-blue-400 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-bold hover:bg-blue-600/30 flex items-center gap-1 focus:outline-none"
            aria-label="Join Quiz or Room"
          >
            <i className="fas fa-link"></i> Join
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMultiplayer((v) => !v)}
              className="text-yellow-400 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-bold hover:bg-yellow-600/30 flex items-center gap-1 focus:outline-none"
              aria-label="Multiplayer"
            >
              <i className="fas fa-users"></i> Multiplayer <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {showMultiplayer && (
              <div className="absolute left-0 mt-2 w-44 bg-slate-800 dark:bg-slate-900 rounded-lg shadow-lg py-2 z-50 animate-fadeInUp border border-slate-700/40">
                <button
                  onClick={() => { setShowMultiplayer(false); onNavigateMultiplayer('create'); }}
                  className="w-full text-left px-4 py-2 text-purple-300 hover:bg-purple-600/20 rounded transition-colors duration-150 flex items-center gap-2"
                >
                  <i className="fas fa-plus-circle"></i> Create Room
                </button>
                <button
                  onClick={() => { setShowMultiplayer(false); onNavigateMultiplayer('join'); }}
                  className="w-full text-left px-4 py-2 text-blue-300 hover:bg-blue-600/20 rounded transition-colors duration-150 flex items-center gap-2"
                >
                  <i className="fas fa-sign-in-alt"></i> Join Room
                </button>
              </div>
            )}
          </div>
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                setShowProfile(false);
                setShowMultiplayer(false);
                (link.action === 'onNavigateNewQuiz' && onNavigateNewQuiz()) ||
                  (link.action === 'onNavigateHistory' && onNavigateHistory()) ||
                  (link.action === 'onNavigateAchievements' && onNavigateAchievements());
              }}
              className="text-neutral-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-600/30 flex items-center gap-1"
              aria-label={link.label}
            >
              <i className={`${link.icon}`}></i> {link.label}
            </button>
          ))}
          {currentUser ? (
            <div className="relative inline-block text-left">
              <button
                onClick={() => setShowProfile((v) => !v)}
                className="flex items-center px-2 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-200"
                aria-label="Profile menu"
              >
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border-2 border-purple-400 shadow-sm"
                />
              </button>
              {showProfile && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 dark:bg-slate-900 rounded-lg shadow-lg py-2 z-50 animate-fadeInUp border border-slate-700/40">
                  <div className="px-4 py-2 text-neutral-200 border-b border-slate-700 flex items-center gap-2">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`}
                      alt="avatar"
                      className="w-7 h-7 rounded-full border border-purple-400"
                    />
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-600/20 rounded transition-colors duration-150 flex items-center gap-2"
                  >
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={onNavigateLogin}
                className="text-neutral-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-600/30 flex items-center gap-1"
                aria-label="Login"
              >
                <i className="fas fa-sign-in-alt"></i> Login
              </button>
              <button
                onClick={onNavigateSignup}
                className="text-neutral-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600/30 flex items-center gap-1"
                aria-label="Sign Up"
              >
                <i className="fas fa-user-plus"></i> Sign Up
              </button>
            </>
          )}
        </div>
        {/* Mobile Nav */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setShowMobileMenu((v) => !v)}
            className="text-neutral-300 hover:text-white focus:outline-none text-2xl"
            aria-label="Open menu"
          >
            <i className="fas fa-bars"></i>
          </button>
          {showMobileMenu && (
            <div className="absolute top-16 right-4 w-64 bg-slate-900/95 dark:bg-slate-950/95 rounded-xl shadow-2xl py-4 px-4 z-50 animate-fadeInUp border border-slate-700/40">
              <button
                onClick={() => { setShowMobileMenu(false); setShowMultiplayer(true); }}
                className="w-full text-left px-4 py-2 text-yellow-400 hover:bg-yellow-600/20 rounded transition-colors duration-150 flex items-center gap-2 mb-2"
              >
                <i className="fas fa-users"></i> Multiplayer
              </button>
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowProfile(false);
                    setShowMultiplayer(false);
                    (link.action === 'onNavigateNewQuiz' && onNavigateNewQuiz()) ||
                      (link.action === 'onNavigateHistory' && onNavigateHistory()) ||
                      (link.action === 'onNavigateAchievements' && onNavigateAchievements());
                  }}
                  className="w-full text-left px-4 py-2 text-neutral-300 hover:text-white hover:bg-purple-600/20 rounded transition-colors duration-150 flex items-center gap-2"
                >
                  <i className={`${link.icon}`}></i> {link.label}
                </button>
              ))}
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-600/20 rounded transition-colors duration-150 flex items-center gap-2 mt-2"
                >
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={onNavigateLogin}
                    className="w-full text-left px-4 py-2 text-green-400 hover:bg-green-600/20 rounded transition-colors duration-150 flex items-center gap-2"
                  >
                    <i className="fas fa-sign-in-alt"></i> Login
                  </button>
                  <button
                    onClick={onNavigateSignup}
                    className="w-full text-left px-4 py-2 text-blue-400 hover:bg-blue-600/20 rounded transition-colors duration-150 flex items-center gap-2"
                  >
                    <i className="fas fa-user-plus"></i> Sign Up
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full relative border border-blue-700/40 animate-fadeInUp">
              <button
                className="absolute top-3 right-3 text-neutral-400 hover:text-white text-xl"
                onClick={() => setShowJoinModal(false)}
                aria-label="Close join modal"
              >
                <i className="fas fa-times"></i>
              </button>
              <div className="flex mb-6">
                <button
                  className={`flex-1 py-2 rounded-l-lg ${joinTab === 'shared' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-300'}`}
                  onClick={() => setJoinTab('shared')}
                >
                  Join Shared Quiz
                </button>
                <button
                  className={`flex-1 py-2 rounded-r-lg ${joinTab === 'multiplayer' ? 'bg-yellow-500 text-white' : 'bg-slate-800 text-yellow-300'}`}
                  onClick={() => setJoinTab('multiplayer')}
                >
                  Join Multiplayer Room
                </button>
              </div>
              {joinTab === 'shared' ? (
                <div>
                  <label className="block text-sm text-blue-300 mb-1 font-semibold">Quiz Code:</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter Quiz Code"
                      value={sharedQuizCode}
                      onChange={e => setSharedQuizCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded border border-slate-600 bg-slate-900 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={handleJoinShared}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-yellow-300 mb-1 font-semibold">Room Code:</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter Room Code"
                      value={multiplayerCode}
                      onChange={e => setMultiplayerCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded border border-slate-600 bg-slate-900 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button
                      onClick={handleJoinMultiplayer}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg shadow"
                    >
                      Join
                    </button>
                  </div>
                </div>
              )}
              {joinError && <div className="text-red-400 mt-2 text-center">{joinError}</div>}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;