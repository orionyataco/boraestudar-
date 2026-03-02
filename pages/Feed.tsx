import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, MessageCircle, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { formatStudyTime } from '../utils/formatTime';
import { supabase } from '../services/supabaseClient';

interface FeedProps {
    onNavigateToProfile?: (userId: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ onNavigateToProfile }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [newPost, setNewPost] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const sendingRef = useRef(false); // Ref para proteção contra duplo clique

    // Carrega posts ao iniciar e ao trocar aba
    useEffect(() => {
        loadPosts();
    }, [activeTab]);

    // Carrega sugestões apenas uma vez na montagem
    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadPosts = async () => {
        try {
            const data = activeTab === 'all' ? await api.getPosts() : await api.getFollowingPosts();
            setPosts(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadSuggestions = async () => {
        try {
            const data = await api.getSuggestedUsers();
            setSuggestions(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.trim() || isSending || sendingRef.current) return;

        // Dupla proteção: state para UI e ref para lógica imediata
        sendingRef.current = true;
        setIsSending(true);
        setIsLoading(true);
        try {
            await api.createPost(newPost, null, null);
            setNewPost('');
            await loadPosts();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
            setIsSending(false);
            sendingRef.current = false;
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await api.deletePost(postId);
            await loadPosts();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleFollowFromFeed = async (userId: string) => {
        try {
            await api.followUser(userId);
            setSuggestions(prev => prev.filter(u => u.id !== userId));
            if (activeTab === 'following') loadPosts();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    return (
        <div className="max-w-6xl mx-auto pt-4 flex gap-8">
            <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold text-white">Feed de Estudos</h1>
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Para Você
                        </button>
                        <button
                            onClick={() => setActiveTab('following')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'following' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Seguindo
                        </button>
                    </div>
                </div>

                {/* Create Post */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Compartilhe seu progresso, dúvidas ou conquistas..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                        rows={3}
                    />
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleCreatePost}
                            disabled={isLoading || isSending || !newPost.trim()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Send size={18} />
                            {isLoading ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </div>

                {/* Posts List */}
                <div className="space-y-4">
                    {posts.length === 0 ? (
                        <div className="bg-slate-800 p-12 rounded-2xl border border-slate-700 text-center">
                            <MessageCircle size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">
                                {activeTab === 'all'
                                    ? "Nenhuma postagem ainda. Seja o primeiro a compartilhar!"
                                    : "Você ainda não segue ninguém ou ninguém postou nada. Explore o feed geral!"}
                            </p>
                        </div>
                    ) : (
                        posts.map((post) => (
                            <div key={post.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <img
                                            src={post.user?.avatar && !post.user.avatar.startsWith('blob:') ? post.user.avatar : "https://picsum.photos/id/64/100/100"}
                                            alt={post.user?.name || 'Usuário'}
                                            className="w-12 h-12 rounded-full border-2 border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => onNavigateToProfile?.(post.user?.id)}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3
                                                    className="font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
                                                    onClick={() => onNavigateToProfile?.(post.user?.id)}
                                                >
                                                    {post.user?.name || 'Usuário'}
                                                </h3>
                                                <span className="text-slate-500 text-sm">
                                                    {post.created_at ? new Date(post.created_at.replace(' ', 'T')).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : 'Agora'}
                                                </span>
                                            </div>
                                            <p className="text-slate-300 whitespace-pre-wrap">{post.content}</p>
                                        </div>
                                    </div>
                                    {post.user?.id === currentUserId && (
                                        <button
                                            onClick={() => handleDeletePost(post.id)}
                                            className="text-slate-500 hover:text-red-400 transition-colors p-2"
                                            title="Deletar postagem"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Sidebar - Suggestions */}
            <div className="w-80 hidden lg:block space-y-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quem seguir</h4>
                        <button onClick={loadSuggestions} className="text-xs text-blue-400 hover:text-blue-300">Ver mais</button>
                    </div>
                    <div className="space-y-4">
                        {suggestions.length > 0 ? (
                            suggestions.map((u) => (
                                <div key={u.id} className="flex items-center justify-between group">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => onNavigateToProfile?.(u.id)}
                                    >
                                        <img src={u.avatar && !u.avatar.startsWith('blob:') ? u.avatar : `https://picsum.photos/seed/${u.id}/100/100`} className="w-8 h-8 rounded-full object-cover" alt={u.name} />
                                        <div className="overflow-hidden">
                                            <p className="font-semibold text-sm text-white truncate w-32">{u.name}</p>
                                            <p className="text-[10px] text-slate-500">Sugestão para você</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleFollowFromFeed(u.id)}
                                        className="p-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                                        title="Seguir"
                                    >
                                        <UserPlus size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-500 text-sm italic">Sem sugestões.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
