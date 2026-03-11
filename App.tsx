import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { api } from './services/api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Chat } from './pages/Chat';
import { Groups } from './pages/Groups';
import { Rankings } from './pages/Rankings';
import { EditProfile } from './pages/EditProfile';
import { Settings } from './pages/Settings';
import { AccountSettings } from './pages/AccountSettings';
import { AdminDashboard } from './pages/AdminDashboard';
import { Page, RankingUser } from './types';
import { Bell, Settings as SettingsIcon, Rocket, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [rankingUsers, setRankingUsers] = useState<RankingUser[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.getMe().then(user => {
        setCurrentUser(user);
        setIsLoadingSession(false);
      }).catch(() => {
        localStorage.removeItem('auth_token');
        setCurrentPage(Page.LOGIN);
        setIsLoadingSession(false);
      });
    } else {
      setCurrentPage(Page.LOGIN);
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage !== Page.LOGIN) {
      api.getRankings().then(data => {
        setRankingUsers(data);
      }).catch(console.error);
    }
  }, [currentPage]);

  const handleUpdateScore = async (points: number) => {
    try {
      await api.updateProgress(0, points);
      const data = await api.getRankings();
      setRankingUsers(data);
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateHours = async (hours: number) => {
    try {
      await api.updateProgress(hours, 0);
      const data = await api.getRankings();
      setRankingUsers(data);
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigateToProfile = (userId: string) => {
    setViewingUserId(userId);
    setCurrentPage(Page.PROFILE);
  };

  const handlePageChange = (page: Page, options?: { groupId?: string; userId?: string | null }) => {
    if (options?.groupId) setSelectedGroupId(options.groupId);
    if (options && options.userId !== undefined) {
      setViewingUserId(options.userId);
    } else if (page === Page.PROFILE) {
      setViewingUserId(null);
    } else if (page !== Page.EDIT_PROFILE && page !== Page.SETTINGS) {
      setViewingUserId(null);
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard onUpdateHours={handleUpdateHours} user={currentUser} onNavigateToProfile={handleNavigateToProfile} />;
      case Page.PROFILE:
        return (
          <Profile
            user={viewingUserId && viewingUserId !== currentUser?.id ? null : currentUser}
            viewingUserId={viewingUserId}
            onEditProfile={() => setCurrentPage(Page.EDIT_PROFILE)}
            onNavigateToProfile={handleNavigateToProfile}
            onRefresh={() => {
              api.getMe().then(user => setCurrentUser(user));
            }}
          />
        );
      case Page.EDIT_PROFILE:
        return <EditProfile user={currentUser} onSave={() => {
          api.getMe().then(user => {
            setCurrentUser(user);
            setCurrentPage(Page.PROFILE);
            setViewingUserId(null);
          });
        }} onCancel={() => {
          setCurrentPage(Page.PROFILE);
          setViewingUserId(null);
        }} />;
      case Page.CHAT:
        return <Chat onUpdateScore={handleUpdateScore} user={currentUser} initialGroupId={selectedGroupId ?? undefined} onBack={() => setCurrentPage(Page.GROUPS)} />;
      case Page.GROUPS:
        return <Groups onNavigate={(page, groupId) => handlePageChange(page as Page, { groupId })} />;
      case Page.RANKING:
        return <Rankings users={rankingUsers} onNavigateToProfile={handleNavigateToProfile} />;
      case Page.SETTINGS:
        return <Settings onNavigate={(page) => handlePageChange(page as Page)} />;
      case Page.ACCOUNT_SETTINGS:
        return <AccountSettings onAccountDeleted={() => setCurrentPage(Page.LOGIN)} />;
      case Page.ADMIN:
        return <AdminDashboard currentUser={currentUser} />;
      default:
        return <Dashboard onUpdateHours={handleUpdateHours} user={currentUser} onNavigateToProfile={handleNavigateToProfile} />;
    }
  };

  const getHeaderTitle = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return 'BoraEstudar!';
      case Page.PROFILE: return 'Meu Perfil';
      case Page.EDIT_PROFILE: return 'Editar Perfil';
      case Page.SETTINGS: return 'Configurações';
      default: return 'BoraEstudar!';
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (currentPage === Page.LOGIN) {
    return <Login onLogin={() => {
      api.getMe().then(user => {
        setCurrentUser(user);
        setCurrentPage(Page.DASHBOARD);
      });
    }} />;
  }

  return (
    <div className="flex bg-slate-900 min-h-screen font-sans text-slate-200">
      <Sidebar
        currentPage={currentPage}
        setPage={handlePageChange}
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('auth_token');
          setCurrentUser(null);
          setCurrentPage(Page.LOGIN);
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 md:ml-64 relative">
        {currentPage !== Page.DASHBOARD && currentPage !== Page.CHAT && (
          <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/90 backdrop-blur sticky top-0 z-40 md:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-slate-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Menu size={24} />
              </button>
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
                <Rocket size={14} className="text-white transform -rotate-12" fill="currentColor" />
              </div>
              <span className="font-bold text-white tracking-tight">{getHeaderTitle()}</span>
            </div>
            <img
              src={currentUser?.avatar && !currentUser.avatar.startsWith('blob:') ? currentUser.avatar : "https://picsum.photos/id/64/100/100"}
              className="w-8 h-8 rounded-full border border-slate-600 cursor-pointer"
              alt="Profile"
              onClick={() => handlePageChange(Page.PROFILE)}
            />
          </div>
        )}

        {currentPage === Page.DASHBOARD && (
          <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-slate-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Menu size={24} />
              </button>
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
                <Rocket size={14} className="text-white transform -rotate-12" fill="currentColor" />
              </div>
              <span className="font-bold text-white tracking-tight">{getHeaderTitle()}</span>
            </div>
            <div className="flex items-center gap-3 md:gap-6 text-sm font-medium text-slate-400">
              <button className="relative hover:text-white hidden sm:block">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={() => handlePageChange(Page.SETTINGS)}
                className="hover:text-white hidden sm:block"
              >
                <SettingsIcon size={20} />
              </button>
              <img
                src={currentUser?.avatar && !currentUser.avatar.startsWith('blob:') ? currentUser.avatar : "https://picsum.photos/id/64/100/100"}
                className="w-8 h-8 rounded-full border border-slate-600 cursor-pointer"
                alt="Profile"
                onClick={() => handlePageChange(Page.PROFILE)}
              />
            </div>
          </div>
        )}

        <div className={currentPage === Page.CHAT ? 'h-full' : 'p-4 md:p-8 min-h-[calc(100vh-4rem)]'}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;