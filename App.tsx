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
import { Page, RankingUser } from './types';
import { Bell, Settings as SettingsIcon, Rocket, Menu } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.LOGIN);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Shared state for Rankings to allow Chat updates
  const [rankingUsers, setRankingUsers] = useState<RankingUser[]>([]);

  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        api.getMe().then(user => {
          setCurrentUser(user);
          setCurrentPage(Page.DASHBOARD);
        }).catch(() => {
          setCurrentPage(Page.LOGIN);
        });
      } else {
        setCurrentPage(Page.LOGIN);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        api.getMe().then(user => {
          setCurrentUser(user);
          if (currentPage === Page.LOGIN) {
            setCurrentPage(Page.DASHBOARD);
          }
        });
      } else {
        setCurrentUser(null);
        setCurrentPage(Page.LOGIN);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentPage !== Page.LOGIN) {
      api.getRankings().then(data => {
        setRankingUsers(data);
      }).catch(console.error);
    }
  }, [currentPage]);

  // Helper to re-calculate ranks based on points (default sort)
  const recalculateRanks = (users: RankingUser[]) => {
    // Sort by points descending for internal rank tracking
    const sorted = [...users].sort((a, b) => b.points - a.points);
    return users.map(u => {
      const newRank = sorted.findIndex(s => s.user.id === u.user.id) + 1;
      // Determine trend based on previous rank vs new rank
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (newRank < u.rank) trend = 'up';
      else if (newRank > u.rank) trend = 'down';

      return { ...u, rank: newRank, trend };
    });
  };

  const handleUpdateScore = async (points: number) => {
    try {
      await api.updateProgress(0, points);
      // Refresh rankings
      const data = await api.getRankings();
      setRankingUsers(data);
      // Refresh user data
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateHours = async (hours: number) => {
    try {
      await api.updateProgress(hours, 0);
      // Refresh rankings
      const data = await api.getRankings();
      setRankingUsers(data);
      // Refresh user data
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard onUpdateHours={handleUpdateHours} user={currentUser} onNavigate={(page) => setCurrentPage(page as Page)} />;
      case Page.PROFILE:
        return <Profile
          user={currentUser}
          onEditProfile={() => setCurrentPage(Page.EDIT_PROFILE)}
          onRefresh={() => api.getMe().then(setCurrentUser)}
        />;
      case Page.EDIT_PROFILE:
        return <EditProfile user={currentUser} onSave={() => {
          // Refresh user data after save
          api.getMe().then(user => {
            setCurrentUser(user);
            setCurrentPage(Page.PROFILE);
          });
        }} onCancel={() => setCurrentPage(Page.PROFILE)} />;
      case Page.CHAT:
        return <Chat onUpdateScore={handleUpdateScore} user={currentUser} onBack={() => setCurrentPage(Page.GROUPS)} />;
      case Page.GROUPS:
        return <Groups onNavigate={(page) => setCurrentPage(page as Page)} />;
      case Page.RANKING:
        return <Rankings users={rankingUsers} />;
      case Page.SETTINGS:
        return <Settings onNavigate={setCurrentPage} />;
      case Page.ACCOUNT_SETTINGS:
        return <AccountSettings onAccountDeleted={() => {
          setCurrentPage(Page.LOGIN);
        }} />;
      default:
        return <Dashboard />;
    }
  };

  const getHeaderTitle = () => {
    switch (currentPage) {
      case Page.DASHBOARD: return 'BoraEstudar!';
      case Page.PROFILE: return 'Meu Perfil';
      case Page.EDIT_PROFILE: return 'Editar Perfil';
      case Page.SETTINGS: return 'Configurações';
      case Page.CHAT: return ''; // Chat has its own header
      case Page.RANKING: return ''; // Ranking has its own header
      default: return 'BoraEstudar!';
    }
  };

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
        setPage={setCurrentPage}
        onLogout={async () => {
          await supabase.auth.signOut();
          setCurrentPage(Page.LOGIN);
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 md:ml-64 relative">
        {/* Mobile Header - Show on all pages except Dashboard which has its own */}
        {currentPage !== Page.DASHBOARD && currentPage !== Page.CHAT && (
          <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/90 backdrop-blur sticky top-0 z-40 md:hidden">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
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
              onClick={() => setCurrentPage(Page.PROFILE)}
            />
          </div>
        )}

        {/* Top Bar - only show on Dashboard for this mockup style */}
        {currentPage === Page.DASHBOARD && (
          <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
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
                onClick={() => setCurrentPage(Page.SETTINGS)}
                className="hover:text-white hidden sm:block"
              >
                <SettingsIcon size={20} />
              </button>
              <img
                src={currentUser?.avatar && !currentUser.avatar.startsWith('blob:') ? currentUser.avatar : "https://picsum.photos/id/64/100/100"}
                className="w-8 h-8 rounded-full border border-slate-600 cursor-pointer"
                alt="Profile"
                onClick={() => setCurrentPage(Page.PROFILE)}
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