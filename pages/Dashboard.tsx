import React, { useState, useEffect, useRef } from 'react';
import { Clock, MessageSquare, Heart, MoreHorizontal, Play, Pause, Square, Camera, Send, ThumbsUp, Trash2, Pencil, X, Check, Users } from 'lucide-react';
import { Post, Comment } from '../types';
import { formatStudyTime } from '../utils/formatTime';
import { api } from '../services/api';

interface DashboardProps {
  onUpdateHours?: (hours: number) => void;
  user?: any;
  onNavigate?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onUpdateHours, user, onNavigate }) => {
  // Post State
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingGroups, setTrendingGroups] = useState<any[]>([]);

  useEffect(() => {
    loadPosts();
    loadTrendingGroups();
  }, []);

  const loadTrendingGroups = async () => {
    try {
      const groups = await api.getGroups();
      setTrendingGroups(groups.slice(0, 3)); // Show top 3
    } catch (error) {
      console.error('Error loading trending groups:', error);
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const rawPosts = await api.getPosts();

      const formattedPosts = rawPosts.map((p: any) => {
        // Simple parsing of content to extract subject/description if possible
        // Expected format: "📚 Subject\n\nDescription\n\n⏱️ Tempo..."
        let subject = 'Postagem';
        let description = p.content;
        let duration = undefined;

        if (p.content.includes('📚')) {
          const parts = p.content.split('\n\n');
          const subjLine = parts.find((l: string) => l.startsWith('📚'));
          if (subjLine) subject = subjLine.replace('📚 ', '');

          const durLine = parts.find((l: string) => l.includes('⏱️'));
          if (durLine) duration = durLine.replace('⏱️ Tempo de estudo: ', '');

          description = p.content
            .replace(subjLine || '', '')
            .replace(durLine || '', '')
            .trim();
        }

        return {
          id: p.id,
          user: p.user,
          subject,
          description,
          timeAgo: p.created_at ? new Date(p.created_at.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Agora',
          likes: p.likes,
          likedBy: p.likedBy || [],
          comments: p.comments,
          commentsList: (p.commentsList || []).map((c: any) => ({
            ...c,
            timestamp: c.timestamp ? new Date(c.timestamp.replace(' ', 'T')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Agora'
          })),
          imageStart: p.imageStart,
          imageEnd: p.imageEnd,
          duration
        };
      });

      setPosts(formattedPosts);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Study Session State
  const [sessionState, setSessionState] = useState<'idle' | 'studying' | 'review'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Images State
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [startImageFile, setStartImageFile] = useState<File | null>(null);
  const [endImageFile, setEndImageFile] = useState<File | null>(null);

  // Comments State
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  // Comment Editing State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Post Editing State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostDesc, setEditingPostDesc] = useState('');
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null); // For dropdown menu

  // Refs for file inputs
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuPostId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
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
    try {
      const content = `📚 ${subject}\n\n${description}\n\n⏱️ Tempo de estudo: ${formatTime(seconds)}`;

      // Convert images to Base64
      let imageStartBase64: string | undefined;
      let imageEndBase64: string | undefined;

      if (startImageFile) {
        imageStartBase64 = await fileToBase64(startImageFile);
      }
      if (endImageFile) {
        imageEndBase64 = await fileToBase64(endImageFile);
      }

      await api.createPost(content, imageStartBase64, imageEndBase64);

      // Update Ranking Hours
      if (onUpdateHours && seconds > 0) {
        const hours = seconds / 3600;
        onUpdateHours(hours);
      }

      // Reset
      setSessionState('idle');
      setSubject('');
      setDescription('');
      setStartImage(null);
      setEndImage(null);
      setStartImageFile(null);
      setEndImageFile(null);
      setSeconds(0);

      await loadPosts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      if (type === 'start') {
        setStartImage(imageUrl);
        setStartImageFile(file);
      } else {
        setEndImage(imageUrl);
        setEndImageFile(file);
      }
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await api.toggleLike(postId);

      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: res.liked ? post.likes + 1 : post.likes - 1,
            // We can't easily track likedBy without more backend data, but we can toggle the count
            likedBy: res.liked ? [...post.likedBy, 'me'] : post.likedBy.filter(id => id !== 'me')
          };
        }
        return post;
      }));
    } catch (error) {
      console.error(error);
    }
  };

  // --- POST EDIT/DELETE HANDLERS ---
  // --- POST EDIT/DELETE HANDLERS ---
  const handleDeletePost = async (postId: string) => {
    if (confirm('Tem certeza que deseja excluir esta postagem?')) {
      try {
        await api.deletePost(postId);
        await loadPosts();
      } catch (error: any) {
        alert(error.message);
      }
    }
    setActiveMenuPostId(null);
  };

  const handleStartEditingPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditingPostDesc(post.description);
    setActiveMenuPostId(null);
  };

  const handleSavePostEdit = async (postId: string) => {
    try {
      // Reconstruct content with existing subject/duration if possible, or just update description
      // For simplicity, we just update the content to be the new description, losing the subject/duration formatting if we aren't careful.
      // Ideally we would parse the old content, replace the description part, and send it back.
      // But since we only have editingPostDesc, let's assume the user is editing the *whole* content or just the description part.
      // Let's try to preserve the subject/duration if they exist in the original post.

      const post = posts.find(p => p.id === postId);
      let newContent = editingPostDesc;

      if (post) {
        newContent = `📚 ${post.subject}\n\n${editingPostDesc}\n\n⏱️ Tempo de estudo: ${post.duration || '00:00:00'}`;
      }

      await api.editPost(postId, newContent);
      await loadPosts();
      setEditingPostId(null);
      setEditingPostDesc('');
    } catch (error: any) {
      alert(error.message);
    }
  };

  // --- COMMENT HANDLERS ---
  // --- COMMENT HANDLERS ---
  const handlePostComment = async (postId: string) => {
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    try {
      await api.createComment(postId, text);

      // Clear input
      setCommentText(prev => ({ ...prev, [postId]: '' }));

      // Reload posts to show new comment
      await loadPosts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      await api.deleteComment(commentId);
      await loadPosts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStartEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const handleCancelEditing = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (postId: string, commentId: string) => {
    if (!editingText.trim()) return;

    try {
      await api.editComment(commentId, editingText);
      await loadPosts();
      handleCancelEditing();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (

    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto pt-4 lg:pt-8 text-slate-100">
      {/* Main Feed */}
      <div className="flex-1 space-y-4 lg:space-y-6">
        {/* ... existing Study Session Card ... */}
        {/* ... REUSE LINES 347-493 ... */}
        <div className="bg-slate-900/50 rounded-2xl p-4 md:p-6 border border-slate-800 shadow-xl relative overflow-hidden backdrop-blur-sm">
          {/* ... (Existing Study Session Content - simplified for brevity in replacement, needs to be preserved) ... */}
          {sessionState === 'idle' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="text-blue-500" />
                Iniciar Sessão de Estudo
              </h3>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div
                  onClick={() => startFileInputRef.current?.click()}
                  className="w-full sm:w-24 h-24 bg-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-700 transition-colors border-2 border-dashed border-slate-700 hover:border-slate-600 flex-shrink-0 relative overflow-hidden"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleStartSession}
                    disabled={!subject.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
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
              {/* Background pulse effect */}
              {!isPaused && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
              )}

              <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Estudando Agora</div>
              <h3 className="text-xl font-bold text-white mb-6">{subject}</h3>

              <div className="text-6xl font-mono font-bold text-white mb-8 tabular-nums tracking-wider drop-shadow-2xl">
                {formatTime(seconds)}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isPaused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'}`}
                >
                  {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                </button>

                <button
                  onClick={handleStopSession}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-900/20"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-32 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden relative">
                  {startImage ? (
                    <>
                      <span className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase z-10 text-white">Início</span>
                      <img src={startImage} className="w-full h-full object-cover" alt="Start" />
                    </>
                  ) : (
                    <span className="text-slate-500 text-xs">Sem foto inicial</span>
                  )}
                </div>

                <div
                  onClick={() => endFileInputRef.current?.click()}
                  className="h-32 bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-slate-500 cursor-pointer overflow-hidden relative transition-colors"
                >
                  {endImage ? (
                    <>
                      <span className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase z-10 text-white">Fim</span>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none placeholder:text-slate-600"
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
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                  <Send size={18} />
                  Publicar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- POST LIST --- */}
        {posts.map((post) => (
          <div key={post.id} className="bg-slate-900/50 rounded-2xl p-4 md:p-6 border border-slate-800 shadow-xl backdrop-blur-sm">
            {/* ... EXISTING POST CONTENT ... */}
            <div className="flex justify-between items-start mb-4 relative">
              <div className="flex gap-3">
                <img src={post.user?.avatar && !post.user.avatar.startsWith('blob:') ? post.user.avatar : "https://picsum.photos/id/64/100/100"} alt={post.user?.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                <div>
                  <h3 className="font-semibold text-white">{post.user?.name}</h3>
                  <p className="text-xs text-slate-500">{post.timeAgo}</p>
                </div>
              </div>

              {post.user.id === user?.id && (
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {activeMenuPostId === post.id && (
                    <div ref={menuRef} className="absolute right-0 top-8 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 w-32 overflow-hidden animate-In">
                      <button
                        onClick={() => handleStartEditingPost(post)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white text-left transition-colors"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 text-left transition-colors"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Images - Before/After Style */}
            {(post.imageStart || post.imageEnd) && (
              <div className={`grid ${post.imageStart && post.imageEnd ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2 mb-4 rounded-xl overflow-hidden relative group`}>
                {post.imageStart && (
                  <div className="relative">
                    <span className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur-sm z-10">Início</span>
                    <img src={post.imageStart} alt="Start" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                {post.imageEnd && (
                  <div className="relative">
                    <span className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur-sm z-10">Fim</span>
                    <img src={post.imageEnd} alt="End" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
              </div>
            )}

            {/* Content or Edit Form */}
            <div className="mb-3">
              {editingPostId === post.id ? (
                <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <textarea
                    value={editingPostDesc}
                    onChange={(e) => setEditingPostDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 resize-none h-24"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingPostId(null)}
                      className="text-sm px-3 py-1.5 text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSavePostEdit(post.id)}
                      className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">{post.subject}</h4>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{post.description}</p>
                  </div>
                  {post.duration && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ml-2 uppercase tracking-wide">
                      <Clock size={12} />
                      {post.duration}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 transition-colors group ${post.likedBy.includes('me') ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
              >
                <Heart
                  size={18}
                  className={`group-hover:scale-110 transition-transform ${post.likedBy.includes('me') ? 'fill-current' : ''}`}
                />
                <span className="text-sm font-medium">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors">
                <MessageSquare size={18} />
                <span className="text-sm font-medium">{post.comments}</span>
              </button>
            </div>

            {/* Comments List */}
            {post.commentsList && post.commentsList.length > 0 && (
              <div className="mt-4 space-y-3 pl-2 border-l-2 border-slate-800 ml-1">
                {post.commentsList.map((comment) => (
                  <div key={comment.id} className="bg-slate-950/50 p-3 rounded-lg group border border-slate-800/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={comment.user?.avatar && !comment.user.avatar.startsWith('blob:') ? comment.user.avatar : "https://picsum.photos/id/64/100/100"} className="w-5 h-5 rounded-full object-cover" alt={comment.user?.name} />
                        <span className="text-xs font-bold text-slate-300">{comment.user?.name}</span>
                        <span className="text-[10px] text-slate-500">• {comment.timestamp}</span>
                      </div>

                      {comment.user.id === user?.id && editingCommentId !== comment.id && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEditing(comment)}
                            className="text-slate-500 hover:text-blue-400 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(post.id, comment.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleSaveEdit(post.id, comment.id)} className="text-green-500 hover:text-green-400">
                          <Check size={16} />
                        </button>
                        <button onClick={handleCancelEditing} className="text-red-500 hover:text-red-400">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 pl-7">{comment.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comment Input */}
            <div className="mt-4 flex gap-3 items-center">
              <img src={user?.avatar && !user.avatar.startsWith('blob:') ? user.avatar : 'https://picsum.photos/id/64/150/150'} className="w-8 h-8 rounded-full bg-slate-800 object-cover border border-slate-700" alt="Me" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Adicionar um comentário..."
                  value={commentText[post.id] || ''}
                  onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePostComment(post.id);
                    }
                  }}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                />
                <button
                  onClick={() => handlePostComment(post.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 p-1"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Right Sidebar Stats - Hidden on mobile, shown as cards on tablet/desktop */}
      <div className="w-full lg:w-80 space-y-4 lg:space-y-6">

        {/* Statistics Card */}
        <div className="bg-slate-900/50 rounded-2xl p-4 md:p-5 border border-slate-800 shadow-xl backdrop-blur-sm">
          <h3 className="font-bold text-white mb-4">Minhas Estatísticas</h3>
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-1">Total de estudo esta semana:</p>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {formatStudyTime(user?.hours || 0)}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((user?.hours || 0) / 16 * 100, 100)}%` }}></div>
            </div>
            <p className="text-xs text-slate-500">Meta semanal: 16h</p>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-400 mb-1">Pontos Acumulados:</p>
            <div className="text-3xl font-bold text-green-400">{user?.points || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Total acumulado</p>
          </div>
        </div>

        {/* Existing Groups Suggestions (Optional) */}
        {/* Trending Groups Section */}
        <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800 backdrop-blur-sm">
          <h3 className="font-bold text-white mb-4">Grupos em Alta</h3>
          <div className="space-y-4">
            {trendingGroups.length > 0 ? (
              trendingGroups.map((group, i) => (
                <div key={group.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    {group.image ? (
                      <img src={group.image} alt={group.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl border border-slate-700">
                        <Users size={20} className="text-blue-500" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-sm text-white truncate w-24 md:w-32">{group.name}</p>
                      <p className="text-xs text-slate-400">{group.member_count} membros</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate && onNavigate('GROUPS')}
                    className="text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1 rounded-lg transition-all"
                  >
                    Ver
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-2">Carregando grupos...</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};