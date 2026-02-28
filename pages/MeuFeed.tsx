import React, { useState, useEffect, useRef } from 'react';
import { Clock, MessageSquare, Heart, Play, Pause, Square, Camera, Send, Trash2 } from 'lucide-react';
import { formatStudyTime } from '../utils/formatTime';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';

interface MeuFeedProps {
    onUpdateHours?: (hours: number) => void;
}

export const MeuFeed: React.FC<MeuFeedProps> = ({ onUpdateHours }) => {
    // Posts from backend
    const [posts, setPosts] = useState<any[]>([]);
    const [newPost, setNewPost] = useState('');
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    // Study Session State
    const [sessionState, setSessionState] = useState<'idle' | 'studying' | 'review'>('idle');
    const [seconds, setSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');

    // Images State
    const [startImage, setStartImage] = useState<string | null>(null);
    const [endImage, setEndImage] = useState<string | null>(null);

    // Refs for file inputs
    const startFileInputRef = useRef<HTMLInputElement>(null);
    const endFileInputRef = useRef<HTMLInputElement>(null);

    // Load posts on mount
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

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (sessionState === 'studying' && !isPaused) {
            interval = setInterval(() => {
                setSeconds((s) => s + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [sessionState, isPaused]);

    // Format Time Helper
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // Handlers
    const handleStartSession = () => {
        if (!subject.trim()) return;
        setSessionState('studying');
        setSeconds(0);
        setIsPaused(false);
    };

    const handleStopSession = () => {
        setSessionState('review');
        setIsPaused(true);
    };

    const handlePublish = async () => {
        setIsLoadingPosts(true);
        try {
            const content = `📚 ${subject}\n\n${description}\n\n⏱️ Tempo de estudo: ${formatTime(seconds)}`;
            await api.createPost(content, null, null);

            // Update Ranking Hours
            if (onUpdateHours && seconds > 0) {
                const hours = seconds / 3600;
                onUpdateHours(hours);
            }

            // Reset and reload
            setSessionState('idle');
            setSubject('');
            setDescription('');
            setStartImage(null);
            setEndImage(null);
            setSeconds(0);

            await loadPosts();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            if (type === 'start') setStartImage(imageUrl);
            else setEndImage(imageUrl);
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
        api.getCurrentUserId().then(id => setCurrentUserId(id));
    }, []);

    return (
        <div className="flex gap-8 max-w-6xl mx-auto pt-8">
            {/* Main Feed */}
            <div className="flex-1 space-y-6">
                <h1 className="text-3xl font-bold text-white mb-6">Meu Feed</h1>

                {/* Study Session Card */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
                    {sessionState === 'idle' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Clock className="text-blue-500" />
                                Iniciar Sessão de Estudo
                            </h3>

                            <div className="flex gap-4 items-start">
                                <div
                                    onClick={() => startFileInputRef.current?.click()}
                                    className="w-24 h-24 bg-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-600 transition-colors border-2 border-dashed border-slate-600 hover:border-slate-500 flex-shrink-0 relative overflow-hidden"
                                >
                                    {startImage ? (
                                        <img src={startImage} alt="Start" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Camera size={24} className="mb-1" />
                                            <span className="text-[10px] uppercase font-bold">Foto Início</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" ref={startFileInputRef} onChange={(e) => handleImageUpload(e, 'start')} className="hidden" accept="image/*" />

                                <div className="flex-1 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="O que você vai estudar agora? (Ex: Raciocínio Lógico)"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                    <button
                                        onClick={handleStartSession}
                                        disabled={!subject.trim()}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                                    >
                                        <Play size={18} fill="currentColor" />
                                        Começar a Estudar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {sessionState === 'studying' && (
                        <div className="flex flex-col items-center justify-center py-4 relative">
                            {!isPaused && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
                            )}

                            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Estudando Agora</div>
                            <h3 className="text-xl font-bold text-white mb-6">{subject}</h3>

                            <div className="text-6xl font-mono font-bold text-white mb-8 tabular-nums tracking-wider drop-shadow-lg">
                                {formatTime(seconds)}
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={`w - 14 h - 14 rounded - full flex items - center justify - center transition - all ${isPaused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'} `}
                                >
                                    {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                                </button>

                                <button
                                    onClick={handleStopSession}
                                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all"
                                >
                                    <Square size={20} fill="currentColor" />
                                </button>
                            </div>
                            <p className="mt-4 text-xs text-slate-500">{isPaused ? 'Pausado' : 'Cronômetro rolando...'}</p>
                        </div>
                    )}

                    {sessionState === 'review' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                                <h3 className="text-lg font-bold text-white">Resumo da Sessão</h3>
                                <span className="text-2xl font-mono font-bold text-blue-400">{formatTime(seconds)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-32 bg-slate-700/50 rounded-lg flex items-center justify-center border border-slate-600 overflow-hidden relative">
                                    {startImage ? (
                                        <>
                                            <span className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase z-10">Início</span>
                                            <img src={startImage} className="w-full h-full object-cover" alt="Start" />
                                        </>
                                    ) : (
                                        <span className="text-slate-500 text-xs">Sem foto inicial</span>
                                    )}
                                </div>

                                <div
                                    onClick={() => endFileInputRef.current?.click()}
                                    className="h-32 bg-slate-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-slate-500 cursor-pointer overflow-hidden relative"
                                >
                                    {endImage ? (
                                        <>
                                            <span className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase z-10">Fim</span>
                                            <img src={endImage} className="w-full h-full object-cover" alt="End" />
                                        </>
                                    ) : (
                                        <>
                                            <Camera size={24} className="text-slate-400 mb-2" />
                                            <span className="text-slate-400 text-xs font-bold uppercase">Adicionar Foto Final</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" ref={endFileInputRef} onChange={(e) => handleImageUpload(e, 'end')} className="hidden" accept="image/*" />
                            </div>

                            <textarea
                                placeholder="Descreva o que você estudou, suas dificuldades ou conquistas..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setSessionState('idle');
                                        setSeconds(0);
                                    }}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={isLoadingPosts}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
                                >
                                    <Send size={18} />
                                    {isLoadingPosts ? 'Publicando...' : 'Publicar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Posts List */}
                <div className="space-y-4">
                    {posts.length === 0 ? (
                        <div className="bg-slate-800 p-12 rounded-2xl border border-slate-700 text-center">
                            <MessageSquare size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">Nenhuma postagem ainda. Comece uma sessão de estudos!</p>
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

            {/* Right Sidebar Stats */}
            <div className="w-80 hidden lg:block space-y-6">
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                    <h3 className="font-bold text-white mb-4">Minhas Estatísticas</h3>
                    <div className="mb-4">
                        <p className="text-sm text-slate-400 mb-1">Total de estudo esta semana:</p>
                        <div className="text-3xl font-bold text-blue-400 mb-2">12h 15m</div>
                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <p className="text-xs text-slate-500">Meta semanal: 16h</p>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">Questões Resolvidas:</p>
                        <div className="text-3xl font-bold text-green-400">1.240</div>
                        <p className="text-xs text-slate-500 mt-1">Total acumulado</p>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                    <h3 className="font-bold text-white mb-4">Grupos Sugeridos</h3>
                    <div className="space-y-4">
                        {[
                            { name: 'Foco na PF', members: 125, icon: '👮‍♂️' },
                            { name: 'Carreiras Fiscais', members: 210, icon: '💼' },
                            { name: 'Tribunais 2024', members: 88, icon: '⚖️' },
                        ].map((group, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xl">
                                        {group.icon}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-white">{group.name}</p>
                                        <p className="text-xs text-slate-400">{group.members} membros</p>
                                    </div>
                                </div>
                                <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">Entrar</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
