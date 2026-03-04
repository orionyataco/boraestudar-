import React, { useState, useEffect } from 'react';
import {
    Shield, Users, FileText, Layers, Trash2,
    ChevronRight, AlertTriangle, RefreshCw, UserCheck, UserX, Crown
} from 'lucide-react';
import { api } from '../services/api';

interface AdminDashboardProps {
    currentUser: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'posts'>('overview');
    const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalGroups: 0 });
    const [users, setUsers] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Guard: access denied for non-admins
    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertTriangle size={48} className="text-red-500" />
                <h2 className="text-2xl font-bold text-white">Acesso Negado</h2>
                <p className="text-slate-400">Você não tem permissão para acessar esta área.</p>
            </div>
        );
    }

    const loadStats = async () => {
        try {
            const s = await api.admin.getStats();
            setStats(s);
        } catch (e) { console.error(e); }
    };

    const loadUsers = async () => {
        try {
            const u = await api.admin.getAllUsers();
            setUsers(u || []);
        } catch (e) { console.error(e); }
    };

    const loadPosts = async () => {
        try {
            const p = await api.admin.getAllPosts();
            setPosts(p || []);
        } catch (e) { console.error(e); }
    };

    const loadAll = async () => {
        setLoading(true);
        await Promise.all([loadStats(), loadUsers(), loadPosts()]);
        setLoading(false);
    };

    useEffect(() => { loadAll(); }, []);

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Tem certeza que deseja deletar este post?')) return;
        setActionLoading(postId);
        try {
            await api.admin.deletePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (e: any) {
            alert(e.message);
        }
        setActionLoading(null);
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Tem certeza que deseja remover o usuário "${userName}"? Esta ação não pode ser desfeita.`)) return;
        if (userId === currentUser?.id) return alert('Você não pode remover a si mesmo.');
        setActionLoading(userId);
        try {
            await api.admin.deleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            await loadStats();
        } catch (e: any) {
            alert(e.message);
        }
        setActionLoading(null);
    };

    const handleSetAdmin = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const msg = newRole === 'admin' ? 'Promover a Admin?' : 'Remover permissão de Admin?';
        if (!confirm(msg)) return;
        setActionLoading(userId + '-role');
        try {
            await api.admin.setUserRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (e: any) {
            alert(e.message);
        }
        setActionLoading(null);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const statCards = [
        { label: 'Total de Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        { label: 'Total de Posts', value: stats.totalPosts, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: 'Total de Grupos', value: stats.totalGroups, icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    ];

    return (
        <div className="max-w-6xl mx-auto pt-2 pb-12 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/30">
                        <Shield size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
                        <p className="text-slate-400 text-sm">Gerencie usuários, posts e conteúdo da plataforma</p>
                    </div>
                </div>
                <button
                    onClick={loadAll}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className={`p-6 rounded-2xl border ${card.bg} flex items-center gap-4`}>
                        <div className={`p-3 rounded-xl ${card.bg}`}>
                            <card.icon size={22} className={card.color} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">{card.label}</p>
                            <p className="text-3xl font-bold text-white">{loading ? '—' : card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="flex border-b border-slate-700">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: Shield },
                        { id: 'users', label: `Usuários (${users.length})`, icon: Users },
                        { id: 'posts', label: `Posts (${posts.length})`, icon: FileText },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                                : 'text-slate-400 border-transparent hover:text-white'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white mb-4">Últimos Usuários Cadastrados</h3>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {users.slice(0, 5).map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={u.avatar && !u.avatar.startsWith('blob:') ? u.avatar : `https://picsum.photos/seed/${u.id}/100/100`}
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                                    alt={u.name}
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-white flex items-center gap-1">
                                                        {u.name}
                                                        {u.role === 'admin' && <Crown size={12} className="text-yellow-400" />}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{u.email}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-500">{formatDate(u.created_at)}</span>
                                        </div>
                                    ))}
                                    {users.length > 5 && (
                                        <button
                                            onClick={() => setActiveTab('users')}
                                            className="w-full text-center text-sm text-blue-400 hover:text-blue-300 py-2 flex items-center justify-center gap-1"
                                        >
                                            Ver todos os {users.length} usuários <ChevronRight size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Todos os Usuários</h3>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {users.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={u.avatar && !u.avatar.startsWith('blob:') ? u.avatar : `https://picsum.photos/seed/${u.id}/100/100`}
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                                                    alt={u.name}
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                                                        {u.name}
                                                        {u.role === 'admin' && (
                                                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1">
                                                                <Crown size={10} /> Admin
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{u.email} · {u.followers_count || 0} seguidores</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {u.id !== currentUser?.id && (
                                                    <>
                                                        <button
                                                            onClick={() => handleSetAdmin(u.id, u.role)}
                                                            disabled={actionLoading === u.id + '-role'}
                                                            title={u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                                        >
                                                            {u.role === 'admin' ? <UserX size={16} /> : <UserCheck size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.name)}
                                                            disabled={actionLoading === u.id}
                                                            title="Remover usuário"
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {u.id === currentUser?.id && (
                                                    <span className="text-xs text-slate-600 italic">Você</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {users.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum usuário encontrado.</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* POSTS TAB */}
                    {activeTab === 'posts' && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Todos os Posts</h3>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {posts.map(p => (
                                        <div key={p.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors group">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <img
                                                        src={p.user?.avatar && !p.user.avatar.startsWith('blob:') ? p.user.avatar : `https://picsum.photos/seed/${p.user?.id}/100/100`}
                                                        className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0 mt-0.5"
                                                        alt={p.user?.name}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-medium text-white">{p.user?.name}</span>
                                                            <span className="text-xs text-slate-500">·</span>
                                                            <span className="text-xs text-slate-500">{formatDate(p.created_at)}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-300 line-clamp-2 break-words">
                                                            {p.content?.startsWith('{')
                                                                ? '[Conteúdo especial]'
                                                                : p.content}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePost(p.id)}
                                                    disabled={actionLoading === p.id}
                                                    title="Deletar post"
                                                    className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    {actionLoading === p.id
                                                        ? <RefreshCw size={16} className="animate-spin" />
                                                        : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {posts.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum post encontrado.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
