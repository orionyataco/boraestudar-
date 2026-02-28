import React, { useState } from 'react';
import { Eye, ArrowLeft, Rocket, User, Mail, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface LoginProps {
    onLogin: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await api.login(email, password);
            onLogin();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        setError('');
        setIsLoading(true);
        try {
            await api.register(name, email, password);
            onLogin();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Forgot Password State
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (resetEmail) {
            // Simulate API call
            setTimeout(() => {
                setResetSuccess(true);
            }, 1000);
        }
    };

    // Components for the Logo
    const BrandLogoLarge = () => (
        <div className="flex flex-col gap-4 mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-black/20 transform -rotate-6">
                <Rocket size={48} className="text-blue-600" fill="currentColor" />
            </div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
                Bora<span className="text-blue-100">Estudar!</span>
            </h1>
        </div>
    );

    const BrandLogoSmall = () => (
        <div className="flex items-center gap-2 mb-6 md:hidden">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center text-white">
                <Rocket size={20} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">
                Bora<span className="text-blue-500">Estudar!</span>
            </h2>
        </div>
    );

    const getLeftPanelContent = () => {
        switch (authMode) {
            case 'register':
                return {
                    title: 'Sua jornada começa aqui.',
                    subtitle: 'Junte-se a milhares de estudantes e alcance a aprovação com nossa metodologia colaborativa.'
                };
            case 'forgot':
                return {
                    title: 'Recupere seu acesso.',
                    subtitle: 'Não se preocupe, acontece com todo mundo. Vamos te ajudar a voltar aos estudos.'
                };
            default:
                return {
                    title: 'Que bom te ver de novo!',
                    subtitle: 'Continue de onde parou. Seus grupos de estudo estão te esperando.'
                };
        }
    };

    const leftContent = getLeftPanelContent();

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 pointer-events-none"></div>

            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">

                {/* Left Side: Gradient Card with Logo */}
                <div className={`hidden md:block transition-all duration-700 ${authMode === 'register' ? 'order-2' : 'order-1'}`}>
                    <div className="bg-gradient-to-br from-[#0c8de4] to-[#f97316] rounded-3xl p-1 shadow-2xl shadow-blue-900/50 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-700">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[22px] h-[600px] flex flex-col justify-center p-12 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0c8de4] to-[#ea580c] opacity-80 mix-blend-overlay"></div>
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-40"></div>
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>

                            <div className="relative z-20">
                                <BrandLogoLarge />
                                <div className="h-1 w-20 bg-white/50 rounded-full mb-6"></div>
                                <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                                    {leftContent.title}
                                </h2>
                                <p className="text-slate-200 text-lg font-medium leading-relaxed max-w-sm">
                                    {leftContent.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className={`md:px-8 transition-all duration-500 ${authMode === 'register' ? 'order-1' : 'order-2'}`}>
                    <BrandLogoSmall />

                    {authMode === 'register' && (
                        // --- REGISTER FORM ---
                        <div className="animate-fadeIn">
                            <button
                                onClick={() => setAuthMode('login')}
                                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
                            >
                                <ArrowLeft size={18} /> Voltar para o login
                            </button>
                            <h2 className="text-3xl font-bold text-white mb-2">Crie sua conta</h2>
                            <p className="text-slate-400 mb-8">Preencha os campos abaixo para começar.</p>

                            <div className="space-y-5">
                                {/* Username */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome de Usuário</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 text-slate-500" size={20} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                            placeholder="Escolha um nome de usuário"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                        placeholder="seu@email.com"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                            placeholder="Mínimo 8 caracteres"
                                        />
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white">
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleRegister}
                                disabled={isLoading}
                                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02]"
                            >
                                {isLoading ? 'Criando conta...' : 'Criar Conta'}
                            </button>
                            {error && (
                                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}
                        </div>
                    )}

                    {authMode === 'login' && (
                        // --- LOGIN FORM ---
                        <div className="animate-fadeIn">
                            <h2 className="text-3xl font-bold text-white mb-8">Acesse sua conta</h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Digite seu e-mail"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Digite sua senha"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        />
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white">
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setAuthMode('forgot');
                                        setResetSuccess(false);
                                        setResetEmail('');
                                    }}
                                    className="text-sm text-blue-500 hover:text-blue-400 font-medium text-left"
                                >
                                    Esqueceu a senha?
                                </button>

                                <button
                                    onClick={handleLogin}
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02]"
                                >
                                    {isLoading ? 'Entrando...' : 'Entrar'}
                                </button>
                                {error && (
                                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}

                                <p className="text-center text-slate-400 text-sm mt-6">
                                    Ainda não tem uma conta?{' '}
                                    <button
                                        onClick={() => setAuthMode('register')}
                                        className="text-blue-500 hover:underline font-bold"
                                    >
                                        Crie agora
                                    </button>
                                </p>
                            </div>
                        </div>
                    )}

                    {authMode === 'forgot' && (
                        // --- FORGOT PASSWORD FORM ---
                        <div className="animate-fadeIn">
                            <button
                                onClick={() => setAuthMode('login')}
                                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
                            >
                                <ArrowLeft size={18} /> Voltar para o login
                            </button>

                            {!resetSuccess ? (
                                <>
                                    <h2 className="text-3xl font-bold text-white mb-2">Esqueceu a senha?</h2>
                                    <p className="text-slate-400 mb-8">Digite seu e-mail abaixo e enviaremos um link para você redefinir sua senha.</p>

                                    <form onSubmit={handleResetPassword} className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-mail Cadastrado</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-3.5 text-slate-500" size={20} />
                                                <input
                                                    type="email"
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                                    placeholder="seu@email.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                        >
                                            Enviar Link de Recuperação <ArrowRight size={18} />
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-8 bg-slate-800/50 rounded-2xl border border-slate-700 animate-fadeIn">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">E-mail Enviado!</h3>
                                    <p className="text-slate-400 text-sm mb-6 px-4">
                                        Enviamos as instruções de recuperação para <strong>{resetEmail}</strong>. Verifique sua caixa de entrada e spam.
                                    </p>
                                    <button
                                        onClick={() => setAuthMode('login')}
                                        className="text-blue-400 hover:text-blue-300 font-bold text-sm"
                                    >
                                        Voltar para o login
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
