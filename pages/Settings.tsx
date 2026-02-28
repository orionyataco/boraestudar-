import React from 'react';
import { Lock, Trash2, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { Page } from '../types';

interface SettingsProps {
    onNavigate: (page: Page) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const settingsOptions = [
        {
            title: 'Segurança da Conta',
            description: 'Alterar senha e configurações de segurança',
            icon: <Lock size={24} className="text-blue-500" />,
            action: () => onNavigate(Page.ACCOUNT_SETTINGS),
        },
        {
            title: 'Excluir Conta',
            description: 'Deletar permanentemente sua conta',
            icon: <Trash2 size={24} className="text-red-500" />,
            action: () => onNavigate(Page.ACCOUNT_SETTINGS),
            danger: true,
        },
    ];

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12 space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Configurações</h2>
                <p className="text-slate-400">Gerencie suas preferências e configurações da conta.</p>
            </div>

            <div className="space-y-4">
                {settingsOptions.map((option, index) => (
                    <button
                        key={index}
                        onClick={option.action}
                        className={`w-full bg-slate-800 p-6 rounded-2xl border transition-all text-left hover:border-slate-600 ${option.danger ? 'border-red-900/30' : 'border-slate-700'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${option.danger ? 'bg-red-900/20' : 'bg-slate-900'}`}>
                                    {option.icon}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${option.danger ? 'text-red-400' : 'text-white'}`}>
                                        {option.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm">{option.description}</p>
                                </div>
                            </div>
                            <ChevronRight size={24} className="text-slate-500" />
                        </div>
                    </button>
                ))}
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <h3 className="font-bold text-white mb-2">Sobre o BoraEstudar!</h3>
                <p className="text-slate-400 text-sm mb-4">
                    Plataforma de estudos colaborativa para concurseiros e vestibulandos.
                </p>
                <p className="text-slate-500 text-xs">Versão 1.0.0</p>
            </div>
        </div>
    );
};