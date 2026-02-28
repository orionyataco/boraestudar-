import React from 'react';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart2,
  User,
  Settings,
  LogOut,
  Rocket,
  MessageCircle,
  UsersRound,
  X
} from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  onLogout: () => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setPage,
  onLogout,
  isMobileMenuOpen = false,
  onCloseMobileMenu
}) => {
  const navItems = [
    { id: Page.DASHBOARD, icon: <LayoutDashboard size={20} />, label: 'Feed' },
    { id: Page.GROUPS, icon: <Users size={20} />, label: 'Grupos' },
    { id: Page.RANKING, icon: <BarChart2 size={20} />, label: 'Rankings' },
    { id: Page.PROFILE, icon: <User size={20} />, label: 'Meu Perfil' },
  ];

  const handleNavClick = (page: Page) => {
    setPage(page);
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Rocket size={18} className="text-white transform -rotate-12" fill="currentColor" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Bora<span className="text-blue-500">Estudar!</span>
            </h1>
          </div>

          {/* Close button - only visible on mobile */}
          <button
            onClick={onCloseMobileMenu}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentPage === item.id
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => handleNavClick(Page.SETTINGS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-2 ${currentPage === Page.SETTINGS
              ? 'bg-blue-600/20 text-blue-400 font-medium'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </button>
          <button
            onClick={() => {
              onLogout();
              if (onCloseMobileMenu) onCloseMobileMenu();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};