import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { Modal } from '../components/Modal';

interface Props {
    onClose: () => void;
    onSwitchToLogin: () => void;
}

export default function RegisterPage({ onClose, onSwitchToLogin }: Props) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const { t } = useLang();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(email, password, name);
            navigate('/');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5 text-center">{t.register}</h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm px-4 py-2 rounded-lg mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t.name}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder={t.name}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t.email}</label>
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
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t.password}</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder={t.passwordMinHint}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors mt-1"
                >
                    {loading ? t.registering : t.register}
                </button>
            </form>

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                {t.hasAccount}{' '}
                <button onClick={onSwitchToLogin} className="text-cyan-500 hover:text-cyan-400 font-medium">
                    {t.login}
                </button>
            </p>
        </Modal>
    );
}
