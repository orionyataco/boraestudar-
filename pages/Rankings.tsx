import React, { useState } from 'react';
import { Medal, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { RankingUser } from '../types';
import { formatStudyTime } from '../utils/formatTime';

interface RankingsProps {
  users: RankingUser[];
}

export const Rankings: React.FC<RankingsProps> = ({ users }) => {
  const [activeTab, setActiveTab] = useState<'points' | 'hours'>('points');

  // Sort users based on active tab
  const sortedUsers = [...users].sort((a, b) => {
    if (activeTab === 'points') {
      // Primary sort by points, secondary by hours
      if (b.points !== a.points) return b.points - a.points;
      return b.hours - a.hours;
    } else {
      // Primary sort by hours, secondary by points
      if (b.hours !== a.hours) return b.hours - a.hours;
      return b.points - a.points;
    }
  });

  // Find current user stats in the sorted list
  const currentUserIndex = sortedUsers.findIndex(u => u.user.id === 'me');
  const currentUser = sortedUsers[currentUserIndex];
  // The rank displayed depends on the sort order
  const currentRank = currentUserIndex + 1;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Medal className="text-yellow-400" size={24} />;
      case 2: return <Medal className="text-slate-300" size={24} />;
      case 3: return <Medal className="text-orange-400" size={24} />;
      default: return <span className="text-slate-500 font-bold w-6 text-center">{rank}º</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-4 md:pt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Classificação Geral</h2>
          <p className="text-slate-400">Acompanhe seu progresso e compare com outros estudantes.</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 md:px-4 py-2 flex items-center gap-2">
          <span className="text-sm text-slate-300">Período:</span>
          <select className="bg-transparent text-white text-sm md:text-base font-medium focus:outline-none">
            <option>Esta Semana</option>
            <option>Este Mês</option>
            <option>Geral</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 md:gap-6 mb-6 md:mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('points')}
          className={`flex-1 min-w-[140px] text-center py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'points' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Pontuação Geral
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`flex-1 min-w-[140px] text-center py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'hours' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Maior Tempo de Estudo
        </button>
      </div>

      {/* Current User Rank Card */}
      {currentUser && (
        <div className="bg-gradient-to-r from-blue-900/40 to-slate-800 border border-blue-500/30 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-blue-400 font-medium mb-1">Meu Desempenho ({activeTab === 'points' ? 'Pontos' : 'Horas'})</p>
            <h3 className="text-2xl font-bold text-white mb-1">Sua Posição: {currentRank}º</h3>
            <p className="text-slate-400 text-sm">Responda quizzes no chat para subir!</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 w-full md:w-auto">
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                {activeTab === 'points' ? 'Pontos' : 'Horas'}
              </p>
              <p className="text-3xl font-bold text-white">
                {activeTab === 'points' ? currentUser.points : formatStudyTime(currentUser.hours)}
              </p>
            </div>
            <div className="h-20 w-32 bg-gradient-to-t from-blue-500/20 to-transparent rounded-lg relative overflow-hidden flex items-end justify-around px-2 pb-2">
              <div className="w-4 bg-blue-500/40 h-[40%] rounded-t"></div>
              <div className="w-4 bg-blue-500/60 h-[60%] rounded-t"></div>
              <div className="w-4 bg-blue-500/80 h-[50%] rounded-t"></div>
              <div className="w-4 bg-blue-400 h-[80%] rounded-t"></div>
              <div className="w-4 bg-white h-[90%] rounded-t shadow-lg shadow-blue-500/50"></div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700 bg-slate-800/50 text-slate-400 text-sm font-medium hidden md:grid">
          <div className="col-span-1 text-center">Pos.</div>
          <div className="col-span-7">Usuário</div>
          <div className="col-span-4 text-right">Pontos / Tempo</div>
        </div>

        <div className="divide-y divide-slate-700/50">
          {sortedUsers.map((user, index) => {
            const rank = index + 1;
            return (
              <div key={user.user.id} className="grid grid-cols-12 gap-4 p-3 md:p-4 items-center hover:bg-slate-700/30 transition-colors">
                <div className="col-span-1 flex justify-center items-center">
                  {getRankIcon(rank)}
                </div>
                <div className="col-span-7 flex items-center gap-4">
                  <img src={user.user.avatar && !user.user.avatar.startsWith('blob:') ? user.user.avatar : "https://picsum.photos/id/64/100/100"} alt={user.user.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <span className="font-semibold text-white block">{user.user.name}</span>
                    {user.user.id === 'me' && <span className="text-xs text-blue-400">Você</span>}
                  </div>
                </div>
                <div className="col-span-4 text-right flex flex-col items-end justify-center">
                  <div className="flex items-center gap-2 text-white font-bold">
                    {activeTab === 'points' ? `${user.points} pts` : formatStudyTime(user.hours)}
                    {user.trend === 'up' && <TrendingUp size={16} className="text-green-500" />}
                    {user.trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
                    {user.trend === 'neutral' && <Minus size={16} className="text-slate-500" />}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    {activeTab === 'points' ? `${formatStudyTime(user.hours)} estudadas` : `${user.points} pts`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};