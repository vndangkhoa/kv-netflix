import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { authAPI } from '../api/client';
import { Modal } from '../components/Modal';

interface Props {
    onClose: () => void;
}

export default function DevicePairPage({ onClose }: Props) {
    const [mode, setMode] = useState<'show' | 'enter'>('show');
    const [code, setCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'generating' | 'waiting' | 'expired' | 'used'>('generating');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { isAuthenticated } = useAuth();
    const { t } = useLang();

    const generateCode = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.generateLinkCode();
            setCode(res.code);
            setExpiresAt(new Date(res.expires_at));
            setStatus('waiting');
        } catch {
            setError(t.failedToGenerateCode);
            setStatus('generating');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && mode === 'show') {
            generateCode();
        }
    }, [isAuthenticated, mode]);

    // Countdown timer
    useEffect(() => {
        if (!expiresAt || mode !== 'show') return;
        timerRef.current = setInterval(() => {
            const diff = expiresAt.getTime() - Date.now();
            if (diff <= 0) {
                setCountdown('00:00');
                setStatus('expired');
                if (timerRef.current) clearInterval(timerRef.current);
                return;
            }
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [expiresAt, mode]);

    // Polling to check if the link code was used by another device
    useEffect(() => {
        if (mode !== 'show' || status !== 'waiting' || !code) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }

        pollRef.current = setInterval(async () => {
            try {
                const res = await authAPI.checkDeviceStatus(code);
                if (res.status === 'paired') {
                    setStatus('used');
                    if (pollRef.current) clearInterval(pollRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            } catch {
                // Ignore transient polling errors
            }
        }, 2000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [mode, status, code]);

    const handlePairInput = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.pairDevice(inputCode);
            setStatus('used');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.invalidOrExpiredCode);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <Modal onClose={onClose}>
                <p className="text-[var(--text-muted)] text-sm text-center mb-3">{t.loginToPair}</p>
                <button onClick={onClose} className="w-full py-2 bg-accent text-[var(--accent-contrast)] rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
                    {t.close}
                </button>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose}>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 text-center">{t.pairDevice}</h2>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1 mb-4">
                <button
                    onClick={() => { setMode('show'); setError(''); setStatus('generating'); }}
                    tabIndex={0}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'show' ? 'bg-accent text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    {t.enterCodeOnOtherDevice}
                </button>
                <button
                    onClick={() => { setMode('enter'); setError(''); }}
                    tabIndex={0}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'enter' ? 'bg-accent text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    {t.loginWithCode}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs px-3 py-1.5 rounded-lg mb-3">
                    {error}
                </div>
            )}

            {status === 'used' ? (
                <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] font-medium">{t.deviceConnected}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{t.deviceConnectedDesc}</p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-6 py-2 bg-accent text-white text-xs font-bold rounded-lg hover:bg-accent-hover transition-colors"
                    >
                        {t.close}
                    </button>
                </div>
            ) : mode === 'show' ? (
                loading ? (
                    <div className="py-8">
                        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : (
                    <>
                        <div className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl py-5 px-4 mb-4">
                            <p className="text-4xl font-mono font-bold text-[var(--text-primary)] tracking-[0.4em] text-center">
                                {code}
                            </p>
                        </div>

                        {expiresAt && status !== 'expired' && (
                            <p className="text-[var(--text-dim)] text-xs text-center mb-4">
                                {t.expiresIn} <span className="text-[var(--text-secondary)] font-mono">{countdown}</span>
                            </p>
                        )}

                        {status === 'expired' && (
                            <button
                                onClick={generateCode}
                                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-[var(--accent-contrast)] text-sm font-bold rounded-lg transition-colors"
                            >
                                {t.generateNewCode}
                            </button>
                        )}

                        {status === 'waiting' && (
                            <div className="flex items-center justify-center gap-2 text-[var(--text-dim)] text-xs">
                                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                                {t.waitingForDevice}
                            </div>
                        )}
                    </>
                )
            ) : (
                <form onSubmit={handlePairInput} className="space-y-3.5">
                    <p className="text-xs text-[var(--text-muted)] text-center">{t.enterCodeFromDevice}</p>
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        tabIndex={0}
                        className="w-full px-3 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-4 focus:ring-accent transition-all"
                        placeholder="000000"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={inputCode.length < 6 || loading}
                        tabIndex={0}
                        className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all focus-visible:ring-4 focus-visible:ring-accent"
                    >
                        {loading ? t.pairing : t.pairDevice}
                    </button>
                </form>
            )}
        </Modal>
    );
}
