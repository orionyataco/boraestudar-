import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Save, User, Briefcase, GraduationCap, Calendar, AtSign, Camera, Instagram, Linkedin, Github } from 'lucide-react';
import { api } from '../services/api';

interface EditProfileProps {
    user: any;
    onSave: () => void;
    onCancel: () => void;
}

export const EditProfile: React.FC<EditProfileProps> = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        avatar: user?.avatar || 'https://picsum.photos/id/64/200/200',
    });
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.updateProfile(formData.name, formData.bio, formData.avatar);
            onSave();
        } catch (error: any) {
            alert(error.message || 'Erro ao atualizar perfil');
        }
        setIsLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto pt-4 pb-12">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-3xl font-bold text-white">Editar Perfil</h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">

                {/* Profile Photo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-slate-700 overflow-hidden relative">
                            <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="text-white" size={32} />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white border-4 border-slate-800 hover:bg-blue-500 transition-colors"
                        >
                            <Camera size={16} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                    <p className="mt-3 text-sm text-slate-400">Clique na foto para alterar</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome de Usuário</label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    name="username"
                                    value={(formData as any).username}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gênero</label>
                                <select
                                    name="gender"
                                    value={(formData as any).gender}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors appearance-none"
                                >
                                    <option value="">Selecione</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                    <option value="NB">Não-binário</option>
                                    <option value="O">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data de Nascimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3.5 text-slate-500" size={18} />
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={(formData as any).birthDate}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Biografia</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors h-32 resize-none"
                                maxLength={300}
                            />
                            <div className="text-right text-xs text-slate-500 mt-1">{formData.bio.length}/300</div>
                        </div>
                    </div>

                    {/* Simplified Right Column - removed extra fields for now */}
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-900 rounded-xl border border-slate-700">
                            <p className="text-slate-400 text-sm">
                                Campos adicionais como profissão, formação e redes sociais serão adicionados em breve.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-700 mt-8 pt-6 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
};