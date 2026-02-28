import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MoreVertical, Paperclip, Send, FileText, Users, PlusCircle, HelpCircle, X, CheckCircle, Link, Trash2, Edit2, UserPlus, LogOut, MessageSquare } from 'lucide-react';
import { ChatMessage, QuizData } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';

interface ChatProps {
    onUpdateScore: (points: number) => void;
    user: any;
    onBack?: () => void;
}

export const Chat: React.FC<ChatProps> = ({ onUpdateScore, user, onBack }) => {
    // Channels State
    const [channels, setChannels] = useState<any[]>([]);
    const [activeChannel, setActiveChannel] = useState<string>('default');
    const [showGroupMenu, setShowGroupMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Edit Group State
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editImage, setEditImage] = useState('');

    // Quiz State
    const [showCreateQuiz, setShowCreateQuiz] = useState(false);
    const [quizQuestion, setQuizQuestion] = useState('');
    const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
    const [quizCorrect, setQuizCorrect] = useState(0);
    const [answeringQuizId, setAnsweringQuizId] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load groups from backend
    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const groups = await api.getGroups();
            setChannels(groups);
            if (groups.length > 0 && activeChannel === 'default') {
                setActiveChannel(groups[0].id);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    };

    useEffect(() => {
        if (activeChannel && activeChannel !== 'default') {
            loadMessages(activeChannel);
        }
    }, [activeChannel]);

    const loadMessages = async (groupId: string) => {
        try {
            const posts = await api.getGroupPosts(groupId);
            console.log('Posts carregados:', posts);

            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            const currentUserId = supabaseUser?.id;

            const formattedMessages: ChatMessage[] = posts.map((p: any) => {
                let displayType: 'text' | 'file' | 'quiz' = 'text';
                let displayText = p.content;
                let quizData: QuizData | undefined = undefined;
                let fileName: string | undefined = undefined;

                if (p.content && (p.content.startsWith('{') || p.content.startsWith('['))) {
                    try {
                        const parsed = JSON.parse(p.content);
                        if (parsed.type) {
                            displayType = parsed.type;
                            displayText = parsed.text || '';
                            quizData = parsed.quiz;
                            fileName = parsed.fileName;
                        }
                    } catch (e) {
                        // Not valid JSON or not our format, keep as text
                    }
                }

                return {
                    id: p.id,
                    userId: p.user?.id || 'unknown',
                    userName: p.user?.name || 'Usuário',
                    userAvatar: p.user?.avatar && !p.user.avatar.startsWith('blob:') ? p.user.avatar : `https://picsum.photos/seed/${p.user_id}/100/100`,
                    text: displayText,
                    timestamp: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                    isMe: p.user_id === currentUserId,
                    type: displayType,
                    fileName,
                    quiz: quizData,
                    userAnswer: p.userAnswer
                };
            }).reverse();

            setMessages(formattedMessages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        try {
            // Send plain text message
            await api.createGroupPost(activeChannel, input);
            setInput('');
            await loadMessages(activeChannel);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Tem certeza que deseja apagar esta mensagem?')) return;
        try {
            await api.deleteGroupPost(activeChannel, postId);
            await loadMessages(activeChannel);
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Erro ao apagar mensagem');
        }
    };

    const handleLeaveGroup = async () => {
        if (!confirm('Tem certeza que deseja sair deste grupo?')) return;
        try {
            await api.leaveGroup(activeChannel);
            setShowGroupMenu(false);
            await loadGroups();
            if (channels.length > 0) {
                setActiveChannel(channels[0].id);
            }
        } catch (error) {
            console.error('Error leaving group:', error);
            alert('Erro ao sair do grupo');
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) return;
        try {
            await api.deleteGroup(activeChannel);
            setShowGroupMenu(false);
            await loadGroups();
            if (channels.length > 0) {
                setActiveChannel(channels[0].id);
            }
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Erro ao excluir grupo');
        }
    };

    const handleUpdateGroup = async () => {
        if (!editName.trim()) return;
        try {
            await api.updateGroup(activeChannel, editName, editDesc, editImage);
            setShowEditModal(false);
            await loadGroups();
        } catch (error) {
            console.error('Error updating group:', error);
            alert('Erro ao atualizar grupo');
        }
    };

    const currentGroup = channels.find(c => c.id === activeChannel);
    const isGroupCreator = currentGroup && user && currentGroup.creator_id === user.id;

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // Create a rich message object
            const messageContent = JSON.stringify({
                type: 'file',
                text: file.name,
                fileName: file.name
            });

            await api.createGroupPost(activeChannel, messageContent);
            await loadMessages(activeChannel);

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Error sending file:', error);
            alert('Erro ao enviar arquivo');
        }
    };

    const handleCreateQuiz = async () => {
        if (!quizQuestion.trim() || quizOptions.some(o => !o.trim())) return;

        const quizData: QuizData = {
            question: quizQuestion,
            options: [...quizOptions],
            correctIndex: quizCorrect,
            points: 50,
            answeredBy: []
        };

        try {
            const messageContent = JSON.stringify({
                type: 'quiz',
                text: 'Questão Desafio',
                quiz: quizData
            });

            await api.createGroupPost(activeChannel, messageContent);

            // Reset Quiz Form
            setQuizQuestion('');
            setQuizOptions(['', '', '', '']);
            setQuizCorrect(0);
            setShowCreateQuiz(false);
            await loadMessages(activeChannel);
        } catch (error) {
            console.error('Error creating quiz:', error);
        }
    };

    const handleAnswerQuiz = async (msgId: string, optionIndex: number) => {
        if (answeringQuizId === msgId) return; // Prevent double click
        setAnsweringQuizId(msgId);

        try {
            const result = await api.answerQuiz(activeChannel, msgId, optionIndex);

            if (result.isCorrect) {
                onUpdateScore(result.points);
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 3000);
            }

            // Refresh messages to show updated state
            await loadMessages(activeChannel);
        } catch (error: any) {
            console.error('Error answering quiz:', error);
            if (error.message === 'You have already answered this quiz') {
                // Silently refresh to sync state (user probably double clicked or state was stale)
                await loadMessages(activeChannel);
            } else {
                alert(error.message || 'Erro ao responder quiz');
            }
        } finally {
            setAnsweringQuizId(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] pt-2 overflow-hidden relative">
            {/* Celebration Overlay */}
            {showCelebration && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <div className="bg-green-500/90 text-white px-8 py-6 rounded-3xl shadow-2xl animate-bounce flex flex-col items-center gap-2 backdrop-blur-sm">
                        <div className="text-6xl">🎉</div>
                        <h2 className="text-3xl font-bold">Parabéns!</h2>
                        <p className="text-xl font-medium">+50 Pontos</p>
                    </div>
                </div>
            )}

            {/* Create Quiz Modal */}
            {showCreateQuiz && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Criar Pergunta (Quiz)</h3>
                            <button onClick={() => setShowCreateQuiz(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Enunciado</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                                    placeholder="Digite a pergunta aqui..."
                                    value={quizQuestion}
                                    onChange={e => setQuizQuestion(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Alternativas (Selecione a correta)</label>
                                <div className="space-y-2">
                                    {quizOptions.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <button
                                                onClick={() => setQuizCorrect(idx)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${quizCorrect === idx ? 'border-green-500 bg-green-500 text-white' : 'border-slate-600'}`}
                                            >
                                                {quizCorrect === idx && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                            </button>
                                            <input
                                                type="text"
                                                className={`flex-1 bg-slate-900 border ${quizCorrect === idx ? 'border-green-500/50' : 'border-slate-700'} rounded-lg p-2 text-white text-sm outline-none`}
                                                placeholder={`Alternativa ${idx + 1}`}
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...quizOptions];
                                                    newOpts[idx] = e.target.value;
                                                    setQuizOptions(newOpts);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg text-xs text-blue-200">
                                <p>ℹ️ Você não poderá responder sua própria pergunta. Quem acertar ganha 50 pontos no ranking.</p>
                            </div>

                            <button
                                onClick={handleCreateQuiz}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <HelpCircle size={20} />
                                Lançar Desafio
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white p-2 -ml-2 rounded-lg transition-colors">
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        {currentGroup?.image ? (
                            <img src={currentGroup.image} alt={currentGroup.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />
                        ) : (
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                <FileText className="text-white" size={20} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {currentGroup?.name || 'Grupo'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                {`${currentGroup?.member_count || 0} membros`}
                            </p>
                        </div>
                    </div>
                    <div className="relative flex items-center gap-4 text-slate-400">
                        <button onClick={() => setShowGroupMenu(!showGroupMenu)} className="cursor-pointer hover:text-white p-2">
                            <MoreVertical size={20} />
                        </button>

                        {showGroupMenu && currentGroup && (
                            <div className="absolute right-0 top-12 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[200px] py-2">
                                {isGroupCreator ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowGroupMenu(false);
                                                setEditName(currentGroup.name);
                                                setEditDesc(currentGroup.description || '');
                                                setEditImage(currentGroup.image || '');
                                                setShowEditModal(true);
                                            }}
                                            className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                            Editar Grupo
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowGroupMenu(false);
                                                setShowInviteModal(true);
                                            }}
                                            className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                        >
                                            <UserPlus size={16} />
                                            Convidar Membros
                                        </button>
                                        <div className="border-t border-slate-700 my-2"></div>
                                        <button
                                            onClick={() => {
                                                setShowGroupMenu(false);
                                                handleDeleteGroup();
                                            }}
                                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                            Excluir Grupo
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowGroupMenu(false);
                                            handleLeaveGroup();
                                        }}
                                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sair do Grupo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6" ref={scrollRef}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-2 md:gap-4 group ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                            {!msg.isMe && (
                                <img
                                    src={(msg as any).userAvatar && !(msg as any).userAvatar.startsWith('blob:') ? (msg as any).userAvatar : `https://picsum.photos/seed/${msg.userId}/100/100`}
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-full mt-1 border border-slate-700"
                                    alt="User"
                                />
                            )}
                            <div className={`flex flex-col max-w-[90%] sm:max-w-[85%] md:max-w-[60%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-baseline gap-2 mb-1 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-sm font-bold text-slate-300">
                                        {msg.isMe ? 'Você' : (msg as any).userName || 'Usuário'}
                                    </span>
                                    <span className="text-xs text-slate-500">{msg.timestamp}</span>
                                </div>

                                {/* TYPE: FILE */}
                                {msg.type === 'file' && (
                                    <div className="bg-blue-600/20 border border-blue-600/40 p-3 rounded-lg flex items-center gap-3">
                                        <div className="bg-blue-600 p-2 rounded">
                                            <FileText size={20} className="text-white" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="text-blue-300 font-medium">{msg.fileName}</p>
                                            <p className="text-blue-400/60 text-xs">PDF • 2.4 MB</p>
                                        </div>
                                    </div>
                                )}

                                {/* TYPE: QUIZ */}
                                {msg.type === 'quiz' && msg.quiz && (
                                    <div className="bg-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 w-full max-w-sm border border-slate-700 relative overflow-hidden">
                                        {/* Background accent */}
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>

                                        <div className="flex items-center gap-2 text-yellow-500 mb-3 font-bold text-sm uppercase tracking-wider">
                                            <HelpCircle size={16} />
                                            <span>Quiz • {msg.quiz.points} pontos</span>
                                        </div>
                                        <h3 className="text-white font-bold text-lg mb-4 leading-relaxed">{msg.quiz.question}</h3>
                                        <div className="space-y-2">
                                            {msg.quiz.options.map((opt, idx) => {
                                                const userAnswer = msg.userAnswer;
                                                const iAnswered = !!userAnswer;
                                                const isSelected = iAnswered && userAnswer.optionIndex === idx;
                                                const isCorrectOption = idx === msg.quiz.correctIndex;

                                                let btnClass = 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700';

                                                if (iAnswered) {
                                                    if (isCorrectOption) {
                                                        btnClass = 'bg-green-500/20 border-green-500 text-green-400 font-medium ring-1 ring-green-500/50';
                                                    } else if (isSelected) {
                                                        btnClass = 'bg-red-500/20 border-red-500 text-red-400 opacity-80';
                                                    } else {
                                                        btnClass = 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed';
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={idx}
                                                        disabled={iAnswered || msg.isMe || answeringQuizId === msg.id}
                                                        onClick={() => !msg.isMe && handleAnswerQuiz(msg.id, idx)}
                                                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between group ${btnClass}`}
                                                    >
                                                        <span className="flex-1">{opt}</span>
                                                        {isCorrectOption && iAnswered && <CheckCircle size={18} className="text-green-500 animate-[bounce_0.5s]" />}
                                                        {isSelected && !isCorrectOption && <X size={18} className="text-red-500" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {msg.userAnswer && (
                                            <div className={`mt-4 p-3 rounded-xl text-center text-sm font-bold animate-[pulse_0.5s] ${msg.userAnswer?.isCorrect
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                {msg.userAnswer?.isCorrect
                                                    ? `🎉 Parabéns! Você ganhou +${msg.quiz.points} pontos!`
                                                    : '❌ Resposta incorreta. Tente na próxima!'}
                                            </div>
                                        )}
                                        {msg.isMe && (
                                            <div className="mt-3 text-xs text-slate-500 text-center italic">
                                                Você criou esta pergunta.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TYPE: TEXT */}
                                {msg.type === 'text' && (
                                    <div className={`p-3 md:p-4 rounded-2xl text-sm leading-relaxed ${msg.isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                        }`}>
                                        {msg.text}
                                    </div>
                                )}
                            </div>

                            {msg.isMe && (
                                <button
                                    onClick={() => handleDeletePost(msg.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 transition-all rounded-full hover:bg-slate-800/50 self-start"
                                    title="Excluir mensagem"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-800">
                    <div className="flex items-center gap-2 md:gap-4 max-w-4xl mx-auto">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-slate-400 hover:text-white transition-colors p-2 hidden md:block"
                        >
                            <Paperclip size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        {/* Create Quiz Button */}
                        <button
                            onClick={() => setShowCreateQuiz(true)}
                            className="text-yellow-500 hover:text-yellow-400 transition-colors p-2"
                            title="Criar Pergunta"
                        >
                            <HelpCircle size={20} />
                        </button>

                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua mensagem..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 pl-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Info */}
            <div className="w-72 border-l border-slate-800 hidden xl:block p-6">
                {currentGroup ? (
                    <>
                        <div className="text-center mb-8">
                            {currentGroup.image ? (
                                <img src={currentGroup.image} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-slate-700 hover:scale-105 transition-transform" alt={currentGroup.name} />
                            ) : (
                                <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FileText size={40} className="text-blue-500" />
                                </div>
                            )}
                            <h3 className="font-bold text-white text-lg">{currentGroup.name}</h3>
                            <p className="text-slate-400 text-sm mt-2">{currentGroup.description || 'Sem descrição.'}</p>

                            {/* Invite Link Button (if member) */}
                            <div className="mt-4">
                                <button
                                    onClick={() => {
                                        if (currentGroup.invite_code) {
                                            navigator.clipboard.writeText(currentGroup.invite_code);
                                            alert("Código copiado: " + currentGroup.invite_code);
                                        }
                                    }}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-full border border-slate-700 transition-colors flex items-center justify-center gap-2 mx-auto hover:border-slate-500"
                                    title="Copiar Código de Convite"
                                >
                                    <Link size={12} />
                                    {currentGroup.invite_code ? 'Copiar Código' : 'Código indisponível'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Membros Online ({currentGroup.onlineCount || 0})</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {(currentGroup.members || []).map((m: any) => (
                                        <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                                            <div className="relative">
                                                <img src={m.avatar && !m.avatar.startsWith('blob:') ? m.avatar : `https://picsum.photos/seed/${m.id}/100/100`} className="w-8 h-8 rounded-full border border-slate-700 object-cover" alt={m.name} />
                                                {/* Simulate online status based on recent activity timestamp if available, for now just show dot for everyone or based on onlineCount logic */}
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${new Date(m.last_seen) > new Date(Date.now() - 5 * 60 * 1000) ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                            </div>
                                            <span className="text-sm text-slate-300 truncate">{m.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-slate-500 mt-10">
                        Selecione um grupo para ver os detalhes
                    </div>
                )}
            </div>

            {/* Edit Group Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Editar Grupo</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nome do Grupo</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Descrição</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                                    value={editDesc}
                                    onChange={e => setEditDesc(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">URL da Imagem</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    value={editImage}
                                    onChange={e => setEditImage(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <button
                                onClick={handleUpdateGroup}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 mt-2"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && currentGroup && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl text-center">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                            <UserPlus size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Convidar Amigos</h3>
                        <p className="text-slate-400 text-sm mb-6">Compartilhe o código abaixo para que outros possam entrar no grupo.</p>

                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-6 mb-6">
                            <span className="text-3xl font-mono font-bold text-white tracking-widest">{currentGroup.invite_code}</span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (currentGroup.invite_code) {
                                        navigator.clipboard.writeText(currentGroup.invite_code);
                                        alert('Código copiado!');
                                    }
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Link size={18} />
                                Copiar
                            </button>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
