import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Trash2, Edit2, UserPlus, Link as LinkIcon } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';

interface GroupsProps {
    onNavigate?: (page: string) => void;
}

export const Groups: React.FC<GroupsProps> = ({ onNavigate }) => {
    const [groups, setGroups] = useState<any[]>([]);
    const [myGroups, setMyGroups] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupImage, setNewGroupImage] = useState('');
    const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false); // New state for private toggle

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [joinCode, setJoinCode] = useState(''); // New state for join code
    const [showJoinModal, setShowJoinModal] = useState(false); // New state for join modal

    const [isGroupsLoading, setIsGroupsLoading] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setCurrentUserId(user.id);
            }
        });
    }, []);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        setIsGroupsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const [allGroupsData, myGroupsData] = await Promise.all([
                api.getGroups(),
                user ? api.getMyGroups() : Promise.resolve([])
            ]);
            setGroups(allGroupsData);
            setMyGroups(myGroupsData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGroupsLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;

        setIsLoading(true);
        try {
            if (editingGroup) {
                await api.updateGroup(editingGroup.id, newGroupName, newGroupDescription, newGroupImage);
            } else {
                await api.createGroup(newGroupName, newGroupDescription, newGroupImage, newGroupIsPrivate);
            }

            setShowCreateModal(false);
            setEditingGroup(null);
            setNewGroupName('');
            setNewGroupDescription('');
            setNewGroupImage('');
            setNewGroupIsPrivate(false); // Reset private toggle
            await loadGroups();

            // Navigate to chat after creating group (only if not editing)
            if (!editingGroup && onNavigate) {
                onNavigate('CHAT');
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (group: any) => {
        setEditingGroup(group);
        setNewGroupName(group.name);
        setNewGroupDescription(group.description || '');
        setNewGroupImage(group.image || '');
        setNewGroupIsPrivate(group.is_private || false); // Set private toggle for editing
        setShowCreateModal(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewGroupImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await api.searchUsers(query);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
        }
    };

    const handleInviteMember = async (userId: string) => {
        try {
            await api.addMemberToGroup(inviteGroupId!, userId);
            alert('Convite enviado/Membro adicionado!');
            setShowInviteModal(false);
            setInviteGroupId(null);
            setSearchQuery('');
            setSearchResults([]);
            loadGroups();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleJoinGroup = async (groupId: string) => {
        try {
            await api.joinGroup(groupId);
            await loadGroups();
            // Navigate to chat after joining group
            if (onNavigate) {
                onNavigate('CHAT');
            }
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleJoinViaCode = async () => {
        if (!joinCode.trim()) return;
        try {
            const res = await api.joinGroupViaCode(joinCode);
            alert('Você entrou no grupo!');
            setShowJoinModal(false);
            setJoinCode('');
            await loadGroups();
            if (onNavigate) onNavigate('CHAT');
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

        try {
            await api.deleteGroup(groupId);
            await loadGroups();
        } catch (error: any) {
            alert(error.message);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pt-4 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-white">Grupos de Estudo</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="px-4 sm:px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <LinkIcon size={18} />
                        Entrar com Código
                    </button>
                    <button
                        onClick={() => {
                            setEditingGroup(null);
                            setNewGroupName('');
                            setNewGroupDescription('');
                            setNewGroupImage('');
                            setNewGroupIsPrivate(false);
                            setShowCreateModal(true);
                        }}
                        className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Criar Grupo
                    </button>
                </div>
            </div>

            {/* My Groups Section */}
            {myGroups.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Meus Grupos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myGroups.map((group) => (
                            <div key={group.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
                                <div className="flex items-start gap-3 mb-4">
                                    {group.image ? (
                                        <img
                                            src={group.image}
                                            alt={group.name}
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                                            <Users size={24} className="text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg">{group.name}</h3>
                                        <p className="text-slate-400 text-sm">{group.is_private ? '🔒 Privado' : '🌐 Público'} • por {group.creator_name}</p>
                                    </div>
                                    {currentUserId === group.creator_id && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setInviteGroupId(group.id);
                                                    setShowInviteModal(true);
                                                }}
                                                className="text-slate-500 hover:text-blue-500 transition-colors p-1"
                                                title="Convidar membros"
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(group)}
                                                className="text-slate-500 hover:text-yellow-500 transition-colors p-1"
                                                title="Editar grupo"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-slate-500 hover:text-red-500 transition-colors p-1"
                                                title="Excluir grupo"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {group.description && (
                                    <p className="text-slate-300 text-sm mb-4 line-clamp-2">{group.description}</p>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                                    <span className="text-slate-400 text-sm flex items-center gap-1">
                                        <Users size={16} />
                                        {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
                                    </span>
                                    <button
                                        onClick={() => onNavigate && onNavigate('CHAT')}
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Abrir Chat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Groups Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Grupos Públicos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.length === 0 ? (
                        <div className="col-span-full bg-slate-800 p-12 rounded-2xl border border-slate-700 text-center">
                            <Users size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">Nenhum grupo público encontrado.</p>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div key={group.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors">
                                <div className="flex items-start gap-3 mb-4">
                                    {group.image ? (
                                        <img
                                            src={group.image}
                                            alt={group.name}
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                                            <Users size={24} className="text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg">{group.name}</h3>
                                        <p className="text-slate-400 text-sm">por {group.creator_name}</p>
                                    </div>
                                    {currentUserId === group.creator_id && (
                                        <button
                                            onClick={() => handleDeleteGroup(group.id)}
                                            className="text-slate-500 hover:text-red-500 transition-colors p-1"
                                            title="Excluir grupo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                {group.description && (
                                    <p className="text-slate-300 text-sm mb-4 line-clamp-2">{group.description}</p>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                                    <span className="text-slate-400 text-sm flex items-center gap-1">
                                        <Users size={16} />
                                        {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
                                    </span>
                                    <button
                                        onClick={() => handleJoinGroup(group.id)}
                                        className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Entrar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            {editingGroup ? 'Editar Grupo' : 'Criar Novo Grupo'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Grupo</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Ex: Concurso Banco Central 2025"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Imagem do Grupo</label>
                                <div className="flex items-center gap-4">
                                    {newGroupImage && (
                                        <img src={newGroupImage} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                                    )}
                                    <label className="flex-1 cursor-pointer bg-slate-900 border border-slate-700 rounded-lg p-3 text-center hover:bg-slate-700 transition-colors">
                                        <span className="text-slate-400 text-sm">Carregar Imagem...</span>
                                        <input type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${newGroupIsPrivate ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${newGroupIsPrivate ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={newGroupIsPrivate}
                                        onChange={e => setNewGroupIsPrivate(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-slate-300 text-sm select-none">Grupo Privado (Apenas convidados)</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Descrição (opcional)</label>
                                <textarea
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                    placeholder="Descreva o objetivo do grupo..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingGroup(null);
                                }}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={isLoading || !newGroupName.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
                            >
                                {isLoading ? 'Salvando...' : (editingGroup ? 'Salvar' : 'Criar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Via Code Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-sm w-full shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Entrar com Código</h2>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="Cole o código do convite aqui..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mb-4 focus:border-blue-500 outline-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleJoinViaCode}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg"
                            >
                                Entrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Member Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-4">Convidar Membros</h2>

                        {/* ADD INVITE LINK SECTION */}
                        {inviteGroupId && (
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Link de Convite</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/30 p-2 rounded text-slate-300 text-sm truncate font-mono select-all">
                                        {/* We need to get the invite code from the group object.
                                             Simpler way: Just use the groupId if we didn't store code in state?
                                             Wait, we need the invite CODE.
                                             Let's fetch the group details or assume we have it in myGroups?
                                             The GET /groups response doesn't return invite_code safely.
                                             Wait, for OWNER it should.

                                             Let's assume for now we use a placeholder or need to fetch it.
                                             Correction: The backend GET /api/users/me/groups DOES NOT return invite_code yet.
                                             Let's update backend to return invite_code for CREATOR.
                                          */}
                                        {/* For now, let's display a generic message or try to find the group in myGroups */}
                                        {myGroups.find(g => g.id === inviteGroupId)?.invite_code || "Carregando..."}
                                    </code>
                                    <button
                                        onClick={() => {
                                            const code = myGroups.find(g => g.id === inviteGroupId)?.invite_code;
                                            if (code) navigator.clipboard.writeText(code);
                                            alert("Código copiado!");
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"
                                    >
                                        <LinkIcon size={18} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Compartilhe este código com quem você quer convidar.</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Buscar Usuário</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearchUsers(e.target.value)}
                                        placeholder="Nome ou email..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                    <Search size={18} className="absolute left-3 top-3.5 text-slate-500" />
                                </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {searchResults.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-3 bg-slate-750 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                            <div>
                                                <p className="font-medium text-white">{user.name}</p>
                                                <p className="text-xs text-slate-400 truncate max-w-[150px]">{user.bio}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInviteMember(user.id)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                ))}
                                {searchQuery.length >= 3 && searchResults.length === 0 && (
                                    <p className="text-slate-400 text-center py-4">Nenhum usuário encontrado.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowInviteModal(false);
                                    setInviteGroupId(null);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
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
