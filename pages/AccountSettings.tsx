import React, { useState } from 'react';
import { Lock, User, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

interface AccountSettingsProps {
    onAccountDeleted: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onAccountDeleted }) => {
    const [activeTab, setActiveTab] = useState<'security' | 'danger'>('security');

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Account deletion
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const handleChangePassword = async () => {
        setPasswordMessage('');
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('A nova senha deve ter pelo menos 8 caracteres');
            return;
        }

        try {
            await api.changePassword(currentPassword, newPassword);
            setPasswordMessage('Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
        } catch (error: any) {
            setPasswordMessage(error.message || 'Erro ao alterar senha');
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) return;
        if (!window.confirm('Tem certeza? Esta ação é irreversível!')) return;

        try {
            await api.deleteAccount(deletePassword);
            alert('Conta deletada com sucesso');
            window.location.href = '/';
        } catch (error: any) {
            alert(error.message || 'Erro ao deletar conta');
        }
    };

    return (
        <div className="max-w-4xl mx-auto pt-4 space-y-6">
            <h1 className="text-3xl font-bold text-white mb-6">Configurações da Conta</h1>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'security'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Lock size={18} />
                        Segurança
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('danger')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'danger'
                        ? 'text-red-400 border-b-2 border-red-400'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Trash2 size={18} />
                        Zona de Perigo
                    </div>
                </button>
            </div>

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-6">Alterar Senha</h2>

                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Senha Atual</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {passwordMessage && (
                            <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-200 text-sm">
                                <CheckCircle size={16} /> {passwordMessage}
                            </div>
                        )}

                        {passwordError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                <AlertCircle size={16} /> {passwordError}
                            </div>
                        )}

                        <button
                            onClick={handleChangePassword}
                            disabled={!currentPassword || !newPassword || !confirmPassword}
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Alterar Senha
                        </button>
                    </div>
                </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
                <div className="bg-slate-800 p-6 rounded-2xl border border-red-900/50">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Deletar Conta</h2>
                    <p className="text-slate-400 mb-6">
                        Esta ação é irreversível. Todos os seus dados, postagens e progresso serão permanentemente deletados.
                    </p>

                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Digite "DELETAR" para confirmar
                            </label>
                            <input
                                type="text"
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder="DELETAR"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
                            />
                        </div>

                        {deleteError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                <AlertCircle size={16} /> {deleteError}
                            </div>
                        )}

                        <button
                            onClick={handleDeleteAccount}
                            disabled={!deletePassword || deleteConfirm !== 'DELETAR'}
                            className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Deletar Minha Conta
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
