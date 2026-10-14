import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthModal from './AuthModal';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const userLinks = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/rating', label: 'Rating', icon: '⭐' },
    { to: '/feedback', label: 'Feedback', icon: '💬' },
    { to: '/voting', label: 'Voting', icon: '🗳️' },
  ];

  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/manage-menu', label: 'Manage Menu', icon: '⚙️' },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const linkClass = ({ isActive }) =>
    `relative px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
      isActive
        ? 'bg-linear-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-100'
        : 'text-gray-700 hover:text-orange-600 hover:bg-orange-500/10 dark:text-gray-200 dark:hover:text-orange-400 dark:hover:bg-white/10'
    }`;

  const themeButton = (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-gray-700 dark:text-gray-200 dark:bg-white/10 dark:hover:bg-white/20 transition-all duration-200 cursor-pointer active:scale-95 border border-orange-500/15 dark:border-white/10"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle theme"
    >
      <span className="text-sm">{theme === 'light' ? '🌙' : '☀️'}</span>
    </button>
  );

  return (
    <>
      <header className="fixed top-3 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* ── Main Floating Glass Bar ── */}
          <nav className="w-full glass-nav rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between pointer-events-auto transition-all duration-300">
            
            {/* Logo & Brand Identity */}
            <NavLink
              to={isAdmin ? '/dashboard' : '/'}
              className="flex items-center gap-2.5 shrink-0 group"
            >
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
                <span className="text-lg">🍽️</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-lg tracking-tight text-gray-900 dark:text-white leading-none">
                  Mess<span className="text-orange-500 dark:text-orange-400">Pulse</span>
                </span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-400 tracking-wider uppercase">
                  CUTM Dining
                </span>
              </div>
            </NavLink>

            {/* ── Desktop Nav Links ── */}
            <div className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-gray-100/70 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
              {links.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            {/* ── Desktop Right Controls (Theme + Auth) ── */}
            <div className="hidden sm:flex items-center gap-2.5">
              {themeButton}

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {user?.fullName?.split(' ')[0] || (isAdmin ? 'Admin' : 'Student')}
                    </span>
                    {isAdmin && (
                      <span className="bg-linear-to-r from-orange-500 to-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gray-200/70 hover:bg-red-500 hover:text-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-600 dark:hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span>🔐</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* ── Mobile Hamburger ── */}
            <div className="flex items-center gap-2 md:hidden">
              {themeButton}
              <button
                aria-label="Toggle menu"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center gap-1.2 cursor-pointer"
              >
                <span
                  className={`block w-4 h-0.5 bg-gray-800 dark:bg-gray-200 rounded-full transition-all duration-300 ${
                    menuOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`}
                />
                <span
                  className={`block w-4 h-0.5 bg-gray-800 dark:bg-gray-200 rounded-full transition-all duration-300 ${
                    menuOpen ? 'opacity-0 scale-0' : ''
                  }`}
                />
                <span
                  className={`block w-4 h-0.5 bg-gray-800 dark:bg-gray-200 rounded-full transition-all duration-300 ${
                    menuOpen ? '-rotate-45 -translate-y-1.5' : ''
                  }`}
                />
              </button>
            </div>
          </nav>
        </div>

        {/* ── Mobile Drawer ── */}
        <div className="max-w-6xl mx-auto md:hidden pointer-events-auto">
          <div
            className={`mt-2 glass-nav rounded-2xl p-4 transition-all duration-300 overflow-hidden ${
              menuOpen ? 'max-h-96 opacity-100 shadow-xl' : 'max-h-0 opacity-0 pointer-events-none py-0'
            }`}
          >
            <div className="flex flex-col gap-1.5">
              {links.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}

              <div className="pt-3 mt-2 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {user?.fullName?.split(' ')[0]} ({isAdmin ? 'Admin' : 'Student'})
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white font-bold text-xs text-center shadow-md"
                  >
                    🔐 Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
};

export default Navbar;