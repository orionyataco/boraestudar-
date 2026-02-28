import React, { useState, useEffect } from 'react';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { api } from '../services/api';
import { formatStudyTime } from '../utils/formatTime';
import { supabase } from '../services/supabaseClient';

export const Feed: React.FC = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [newPost, setNewPost] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const data = await api.getPosts();
            setPosts(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.trim()) return;

        setIsLoading(true);
        try {
            await api.createPost(newPost, null, null);
            setNewPost('');
            await loadPosts();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
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

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    return (
        <div className="max-w-4xl mx-auto pt-4 space-y-6">
            <h1 className="text-3xl font-bold text-white mb-6">Feed de Estudos</h1>

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
                        disabled={isLoading || !newPost.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
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
                        <p className="text-slate-400">Nenhuma postagem ainda. Seja o primeiro a compartilhar!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <img
                                        src={post.user?.avatar && !post.user.avatar.startsWith('blob:') ? post.user.avatar : "https://picsum.photos/id/64/100/100"}
                                        alt={post.user?.name || 'Usuário'}
                                        className="w-12 h-12 rounded-full border-2 border-slate-700"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-white">{post.user?.name || 'Usuário'}</h3>
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
    );
};
