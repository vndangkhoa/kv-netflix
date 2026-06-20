import { useState } from 'react';
import { authAPI } from '../api/client';
import { Eye, EyeOff, Key, CheckCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useLang } from '../context/LanguageContext';

interface Props {
    onClose: () => void;
    onSwitchToLogin: () => void;
}

export default function ResetPasswordPage({ onClose, onSwitchToLogin }: Props) {
    const { t } = useLang();
    const [key, setKey] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleReset() {
        setError('');
        if (!key || !newPw) {
            setError(t.fillAllFields);
            return;
        }
        if (newPw.length < 6) {
            setError(t.passwordMinLength);
            return;
        }
        if (newPw !== confirmPw) {
            setError(t.passwordMismatch);
            return;
        }
        setLoading(true);
        try {
            await authAPI.resetPassword(key, newPw);
            setSuccess(true);
        } catch (e: any) {
            setError(e.message || t.invalidKey);
        }
        setLoading(false);
    }

    if (success) {
        return (
            <Modal onClose={onSwitchToLogin}>
                <div className="text-center">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t.resetSuccess}</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                        {t.resetSuccessDesc}
                    </p>
                    <button
                        onClick={onSwitchToLogin}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                    >
                        {t.login}
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose}>
            <div className="flex items-center gap-2 mb-1">
                <Key size={20} className="text-cyan-500" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{t.resetPassword}</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-5">
                {t.resetPasswordDesc}
            </p>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm px-4 py-2 rounded-lg mb-4">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t.recoveryKey}</label>
                    <input
                        type="text"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        className="w-full px-3 py-2 text-sm font-mono bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t.newPassword}</label>
                    <div className="relative">
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            placeholder={`${t.newPassword} ${t.passwordMinHint}`}
                            className="w-full px-3 py-2 pr-10 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{t.confirmPassword}</label>
                    <input
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="••••••"
                        className="w-full px-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                </div>
                <button
                    onClick={handleReset}
                    disabled={loading}
                    className="w-full py-2.5 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg transition-colors mt-1"
                >
                    {loading ? t.resetting : t.resetBtn}
                </button>
            </div>

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                {t.hasAccount}{' '}
                <button onClick={onSwitchToLogin} className="text-cyan-500 hover:text-cyan-400 font-medium">
                    {t.login}
                </button>
            </p>
        </Modal>
    );
}
