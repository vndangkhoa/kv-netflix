import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function DeviceLoginPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { loginWithToken } = useAuth();
    const { t } = useLang();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.loginWithCode(code);
            loginWithToken(res.token, res.user);
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.invalidOrExpiredCode);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{t.pairDevice}</h1>
                    <p className="text-[var(--text-muted)] text-sm">
                        {t.enterCodeFromDevice}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm px-4 py-2 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="w-full px-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder="000000"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={code.length < 6 || loading}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        {loading ? t.loggingIn : t.login}
                    </button>
                </form>

                <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                    {t.noAccount}{' '}
                    <button onClick={() => navigate('/')} className="text-cyan-500 hover:text-cyan-400 font-medium">
                        {t.backToHome}
                    </button>
                </p>
            </div>
        </div>
    );
}
