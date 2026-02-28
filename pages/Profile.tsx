import React, { useState, useEffect } from 'react';
import { Award, Clock, Target, Zap, Trophy, Users, BookOpen, Star, UserPlus, Check, Share2, Search, UserCheck, User, RotateCcw } from 'lucide-react';
import { formatStudyTime } from '../utils/formatTime';
import { supabase } from '../services/supabaseClient';
import {
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { api } from '../services/api';

// Helper icon
const CheckSquareIcon = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
)

const data = [
    { name: 'Seg', hours: 2.5 },
    { name: 'Ter', hours: 3.8 },
    { name: 'Qua', hours: 4.2 },
    { name: 'Qui', hours: 5.5 },
    { name: 'Sex', hours: 4.8 },
    { name: 'Sab', hours: 6.0 },
    { name: 'Dom', hours: 3.0 },
];

interface ProfileProps {
    user: any;
    onEditProfile: () => void;
    onRefresh: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onEditProfile, onRefresh }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(user?.followers_count || 0);
    const [followingCount, setFollowingCount] = useState(user?.following_count || 0);

    const handleFollow = () => {
        if (isFollowing) {
            setFollowersCount(prev => prev - 1);
        } else {
            setFollowersCount(prev => prev + 1);
        }
        setIsFollowing(!isFollowing);
    };

    // Social & Search State
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null); // Added this line

    useEffect(() => {
        loadSuggestions();
        supabase.auth.getUser().then(({ data: { user } }) => { // Moved this block here
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    const loadSuggestions = async () => {
        try {
            const data = await api.getSuggestedUsers();
            setSuggestions(data);
        } catch (error: any) {
            console.error('Error loading suggestions:', error);
        }
    };

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setIsSearching(true); // Set searching state
            const results = await api.searchUsers(query);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleFollowUser = async (userId: string) => {
        try {
            await api.followUser(userId);

            // Optimistic update
            setSuggestions(prev => prev.filter(u => u.id !== userId));
            setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: true } : u));

            // Update my following count
            setFollowingCount(prev => prev + 1);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleUnfollowUser = async (userId: string) => {
        try {
            await api.unfollowUser(userId);

            setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: false } : u));

            // Update my following count
            setFollowingCount(prev => prev - 1);
        } catch (error: any) {
            alert(error.message);
        }
    };
    const handleResetHours = async () => {
        if (confirm('Tem certeza que deseja ZERAR suas horas de estudo? Esta ação não pode ser desfeita.')) {
            try {
                await api.resetStudyHours();
                onRefresh();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleResetPoints = async () => {
        if (confirm('Tem certeza que deseja ZERAR seus pontos de questões? Esta ação não pode ser desfeita.')) {
            try {
                await api.resetPoints();
                onRefresh();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };
    return (
        <div className="max-w-6xl mx-auto pt-4 space-y-8">
            {/* Header Profile */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img
                            src={user?.avatar && !user.avatar.startsWith('blob:') ? user.avatar : "https://picsum.photos/id/64/200/200"}
                            alt="Profile"
                            className="w-24 h-24 rounded-full border-4 border-slate-700 object-cover"
                        />
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900"></div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">{user?.name || 'Usuário'}</h2>
                        <p className="text-slate-400 mb-2 max-w-lg">{user?.bio || 'Sem biografia.'}</p>

                        {/* Stats: Following / Followers */}
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex gap-1.5 hover:text-blue-400 cursor-pointer transition-colors">
                                <span className="font-bold text-white">{followingCount}</span>
                                <span className="text-slate-400">Seguindo</span>
                            </div>
                            <div className="flex gap-1.5 hover:text-blue-400 cursor-pointer transition-colors">
                                <span className="font-bold text-white">{followersCount}</span>
                                <span className="text-slate-400">Seguidores</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    {!currentUserId || user?.id !== currentUserId ? (
                        <button
                            onClick={handleFollow}
                            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isFollowing
                                ? 'bg-slate-800 border border-slate-600 text-white hover:border-red-500/50 hover:text-red-400'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                                }`}
                        >
                            {isFollowing ? (
                                <>
                                    <Check size={18} />
                                    Seguindo
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Seguir
                                </>
                            )}
                        </button>
                    ) : null}
                    <button
                        onClick={onEditProfile}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-medium transition-colors"
                    >
                        Editar Perfil
                    </button>
                    <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors" title="Compartilhar Perfil">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Horas de Estudo', value: formatStudyTime(user?.hours || 0), sub: '+5% na última semana', color: 'text-green-400', icon: Clock, onReset: handleResetHours },
                    { label: 'Pontos', value: user?.points || '0', sub: '+12% na última semana', color: 'text-green-400', icon: CheckSquareIcon, onReset: handleResetPoints },
                    { label: 'Simulados Feitos', value: '22', sub: '+2 na última semana', color: 'text-green-400', icon: BookOpen },
                    { label: 'Acertos Gerais', value: '82%', sub: '-1% na última semana', color: 'text-red-400', icon: Target },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-sm font-medium">{stat.label}</span>
                            {stat.onReset && (
                                <button
                                    onClick={stat.onReset}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    title={`Zerar ${stat.label}`}
                                >
                                    <RotateCcw size={14} />
                                </button>
                            )}
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                        <div className={`text-xs font-medium ${stat.color}`}>{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-6">Progresso Semanal</h3>
                    <div className="h-64 w-full bg-slate-900/50 rounded-xl p-4 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#64748b"
                                    tick={{ fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 5 ? '#1d9bf0' : '#cbd5e1'} opacity={index === 5 ? 1 : 0.5} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                {/* Achievements & Social Column */}
                <div className="space-y-6">
                    {/* Social Widget */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4">Rede de Estudos</h3>

                        {/* Search Box */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar usuários..."
                                value={searchQuery}
                                onChange={(e) => handleSearchUsers(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                            />
                        </div>

                        {/* Results / Suggestions */}
                        <div className="space-y-4">
                            {searchQuery ? (
                                <>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados</h4>
                                    {isSearching ? (
                                        <div className="text-center text-slate-500 text-sm">Buscando...</div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar && !u.avatar.startsWith('blob:') ? u.avatar : `https://picsum.photos/seed/${u.id}/100/100`} className="w-8 h-8 rounded-full object-cover" alt={u.name} />
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold text-sm text-white truncate w-24">{u.name}</p>
                                                    </div>
                                                </div>
                                                {!u.isMe && (
                                                    <button
                                                        onClick={() => u.isFollowing ? handleUnfollowUser(u.id) : handleFollowUser(u.id)}
                                                        className={`p-1.5 rounded-lg transition-colors ${u.isFollowing ? 'bg-slate-700 text-slate-400 hover:text-red-400' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'}`}
                                                    >
                                                        {u.isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-500 text-sm">Nenhum encontrado.</div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sugestões</h4>
                                        <button onClick={loadSuggestions} className="text-[10px] text-blue-400 hover:text-blue-300">Atualizar</button>
                                    </div>
                                    {suggestions.length > 0 ? (
                                        suggestions.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar && !u.avatar.startsWith('blob:') ? u.avatar : `https://picsum.photos/seed/${u.id}/100/100`} className="w-8 h-8 rounded-full object-cover" alt={u.name} />
                                                    <div>
                                                        <p className="font-semibold text-sm text-white">{u.name}</p>
                                                        <p className="text-[10px] text-slate-500">{u.followers_count} seguidores</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleFollowUser(u.id)}
                                                    className="p-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                                                >
                                                    <UserPlus size={16} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-slate-500 text-sm italic">Sem sugestões.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white">Conquistas</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { name: '7 Dias', icon: <Zap size={24} className="text-yellow-500" />, active: true },
                                { name: '1000 Questões', icon: <Award size={24} className="text-blue-400" />, active: false },
                                { name: '1º Simulado', icon: <BookOpen size={24} className="text-blue-400" />, active: false },
                                { name: '1º Grupo', icon: <Users size={24} className="text-blue-400" />, active: false },
                                { name: 'Top 10%', icon: <Trophy size={24} className="text-blue-400" />, active: false },
                                { name: 'Madrugador', icon: <Star size={24} className="text-blue-400" />, active: false },
                            ].map((ach, idx) => (
                                <div key={idx} className={`flex flex-col items-center justify-center p-4 rounded-xl border ${ach.active ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-slate-800 border-slate-700'}`}>
                                    <div className={`mb-2 ${ach.active ? 'text-yellow-500' : 'text-slate-500'}`}>
                                        {ach.icon}
                                    </div>
                                    <span className={`text-xs font-bold text-center ${ach.active ? 'text-yellow-500' : 'text-slate-500'}`}>{ach.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};