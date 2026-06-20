import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { useLang } from '../context/LanguageContext';
import { authAPI } from '../api/client';

interface Props {
    onClose: () => void;
    onSwitchToRegister: () => void;
    onSwitchToReset: () => void;
}

export default function LoginPage({ onClose, onSwitchToRegister, onSwitchToReset }: Props) {
    const [mode, setMode] = useState<'password' | 'code'>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, loginWithToken } = useAuth();
    const { t } = useLang();

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.loginWithCode(code);
            loginWithToken(res.token, res.user);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t.invalidOrExpiredCode);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 text-center">{t.login}</h2>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1 mb-4">
                <button
                    onClick={() => { setMode('password'); setError(''); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'password' ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    {t.email}
                </button>
                <button
                    onClick={() => { setMode('code'); setError(''); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'code' ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    {t.loginWithCode}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm px-4 py-2 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {mode === 'password' ? (
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            placeholder="email@example.com"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-[var(--text-muted)]">{t.password}</label>
                            <button type="button" onClick={onSwitchToReset} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                                {t.forgotPassword}
                            </button>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            placeholder="••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors mt-1"
                    >
                        {loading ? t.loggingIn : t.login}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleCodeLogin} className="space-y-3.5">
                    <p className="text-xs text-[var(--text-muted)] text-center">{t.enterCodeFromDevice}</p>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="w-full px-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder="000000"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={code.length < 6 || loading}
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                        {loading ? t.loggingIn : t.login}
                    </button>
                </form>
            )}

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                {t.noAccount}{' '}
                <button onClick={onSwitchToRegister} className="text-cyan-500 hover:text-cyan-400 font-medium">
                    {t.register}
                </button>
            </p>
        </Modal>
    );
}
