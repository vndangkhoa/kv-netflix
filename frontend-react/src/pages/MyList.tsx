import { useState, useEffect } from 'react';
import { useMyList } from '../hooks/useMyList';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { MovieCard } from '../components/MovieCard';
import DevicePairPage from './DevicePairPage';
import { accountAPI, exploreAPI } from '../api/client';
import type { Device, ExploreMovie } from '../api/client';
import { User, Monitor, LogOut, Trash2, Key, Shield, Copy, Check, RefreshCw, Eye, EyeOff, AlertTriangle, Compass } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

export default function MyList() {
    const { watchHistory } = useMyList();
    const { user, isAuthenticated, logout } = useAuth();
    const { t } = useLang();
    const [showPairModal, setShowPairModal] = useState(false);
    const [tab, setTab] = useState<'explore' | 'history' | 'account'>('history');

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-300">
            <Navbar />
            <main className="pt-14">
                {/* Tabs */}
                <div className="px-4 sm:px-6 lg:px-12 pt-6 pb-4">
                    <div className="flex gap-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-1 w-fit overflow-x-auto">
                        {isAuthenticated && (
                            <button
                                onClick={() => setTab('explore')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'explore' ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                {t.explore}
                            </button>
                        )}
                        <button
                            onClick={() => setTab('history')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'history' ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            {t.history} ({watchHistory.length})
                        </button>
                        {isAuthenticated && (
                            <button
                                onClick={() => setTab('account')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'account' ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                {t.account}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                {tab === 'explore' && isAuthenticated && <ExploreTab />}
                {tab === 'history' && <HistoryTab watchHistory={watchHistory} />}
                {tab === 'account' && isAuthenticated && (
                    <AccountSettings user={user!} logout={logout} onShowPair={() => setShowPairModal(true)} />
                )}

                {!isAuthenticated && tab !== 'account' && (
                    <div className="px-4 sm:px-6 lg:px-12 pb-12">
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                            <p className="text-lg mb-1">{t.signInToExplore}</p>
                        </div>
                    </div>
                )}
            </main>

            {showPairModal && (
                <DevicePairPage onClose={() => setShowPairModal(false)} />
            )}
        </div>
    );
}

// ── Explore Tab ───────────────────────────────────────────────────────

function ExploreTab() {
    const [movies, setMovies] = useState<ExploreMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { t } = useLang();

    useEffect(() => {
        loadExplore();
    }, []);

    async function loadExplore() {
        setLoading(true);
        setError('');
        try {
            const data = await exploreAPI.getRelated();
            setMovies(data);
        } catch {
            setError(t.loadingError);
        }
        setLoading(false);
    }

    return (
        <div className="px-4 sm:px-6 lg:px-12 pb-12">
            <div className="flex items-center gap-2 mb-4">
                <Compass size={18} className="text-cyan-500" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t.exploreTitle}</h2>
                <button onClick={loadExplore} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                    <p className="text-sm mb-3">{error}</p>
                    <button onClick={loadExplore} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors">
                        {t.retry}
                    </button>
                </div>
            ) : movies.length > 0 ? (
                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                    {movies.map((movie, index) => (
                        <MovieCard key={`${movie.id}-${index}`} movie={movie} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                    <Compass size={48} className="mb-4 opacity-50" />
                    <p className="text-lg mb-1">{t.exploreEmpty}</p>
                    <p className="text-sm">{t.exploreEmptyHint}</p>
                </div>
            )}
        </div>
    );
}

// ── History Tab ───────────────────────────────────────────────────────

function HistoryTab({ watchHistory }: { watchHistory: any[] }) {
    const { t } = useLang();
    return (
        <div className="px-4 sm:px-6 lg:px-12 pb-12">
            {watchHistory.length > 0 ? (
                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                    {watchHistory.map((movie: any, index: number) => (
                        <MovieCard key={`${movie.id}-${index}`} movie={movie} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                    <p className="text-lg mb-1">{t.noWatchHistoryYet}</p>
                    <p className="text-sm">{t.startWatchingHint}</p>
                </div>
            )}
        </div>
    );
}

// ── Account Settings ──────────────────────────────────────────────────

function AccountSettings({ user, logout, onShowPair }: { user: { id: number; name: string; email: string }; logout: () => void; onShowPair: () => void }) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const { t, lang } = useLang();

    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');
    const [changingPw, setChangingPw] = useState(false);

    const [recoveryKey, setRecoveryKey] = useState('');
    const [keyCopied, setKeyCopied] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [keyShown, setKeyShown] = useState(false);
    const [keyError, setKeyError] = useState('');

    useEffect(() => { loadDevices(); }, []);

    async function loadDevices() {
        setLoadingDevices(true);
        try { setDevices(await accountAPI.getDevices()); } catch { /* ignore */ }
        setLoadingDevices(false);
    }

    async function handleRemoveDevice(deviceId: number) {
        setRemovingId(deviceId);
        try {
            await accountAPI.removeDevice(deviceId);
            setDevices(devices.filter(d => d.id !== deviceId));
        } catch { /* ignore */ }
        setRemovingId(null);
    }

    async function handleChangePassword() {
        setPwError(''); setPwSuccess('');
        if (!currentPw || !newPw) { setPwError(t.fillAllFields); return; }
        if (newPw.length < 6) { setPwError(t.passwordMinLength); return; }
        if (newPw !== confirmPw) { setPwError(t.passwordMismatch); return; }
        setChangingPw(true);
        try {
            await accountAPI.changePassword(currentPw, newPw);
            setPwSuccess(t.passwordChanged);
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (e: any) { setPwError(e.message || t.passwordChangeFailed); }
        setChangingPw(false);
    }

    async function handleGenerateKey() {
        setGeneratingKey(true);
        setKeyError('');
        try {
            const data = await accountAPI.generateRecoveryKey();
            setRecoveryKey(data.key);
            setKeyShown(true);
            setKeyCopied(false);
        } catch (e: any) {
            console.error('Recovery key generation failed:', e);
            setKeyError(e.message || t.keyGeneratedError);
        }
        setGeneratingKey(false);
    }

    function copyKey() {
        navigator.clipboard.writeText(recoveryKey);
        setKeyCopied(true);
        setTimeout(() => setKeyCopied(false), 2000);
    }

    return (
        <div className="px-4 sm:px-6 lg:px-12 pb-12 space-y-6">
            {/* Profile */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-7 h-7 text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-lg text-[var(--text-primary)] truncate">{user.name}</h2>
                        <p className="text-sm text-[var(--text-muted)] truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={onShowPair} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                            <Monitor size={14} /> {t.pairDevice}
                        </button>
                        <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                            <LogOut size={14} /> {t.logout}
                        </button>
                    </div>
                </div>
            </div>

            {/* Devices */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Monitor size={18} className="text-cyan-500" />
                        <h3 className="font-semibold text-[var(--text-primary)]">{t.connectedDevices}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">{devices.length}</span>
                    </div>
                    <button onClick={loadDevices} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><RefreshCw size={14} /></button>
                </div>
                {loadingDevices ? (
                    <p className="text-sm text-[var(--text-muted)]">{t.loading}</p>
                ) : devices.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">{t.noDevices}</p>
                ) : (
                    <div className="space-y-2">
                        {devices.map(device => (
                            <div key={device.id} className="flex items-center justify-between py-2 px-3 bg-[var(--bg-tertiary)] rounded-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Monitor size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{device.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{new Date(device.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveDevice(device.id)} disabled={removingId === device.id} className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Change Password */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Key size={18} className="text-cyan-500" />
                    <h3 className="font-semibold text-[var(--text-primary)]">{t.changePassword}</h3>
                </div>
                <div className="space-y-3 max-w-md w-full">
                    <div className="relative">
                        <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder={t.currentPassword} className="w-full px-3 py-2 pr-10 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-500" />
                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">{showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                    <div className="relative">
                        <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={`${t.newPassword} ${t.passwordMinHint}`} className="w-full px-3 py-2 pr-10 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-500" />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t.confirmPassword} className="w-full px-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-500" />
                    {pwError && <p className="text-xs text-red-500">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-green-500">{pwSuccess}</p>}
                    <button onClick={handleChangePassword} disabled={changingPw} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50">
                        {changingPw ? t.changing : t.changePasswordBtn}
                    </button>
                </div>
            </div>

            {/* Recovery Key */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                    <Shield size={18} className="text-cyan-500" />
                    <h3 className="font-semibold text-[var(--text-primary)]">{t.recoverAccount}</h3>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-4">{t.recoverDescription}</p>
                {keyError && <p className="text-xs text-red-500 mb-2">{keyError}</p>}
                {keyShown && recoveryKey ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-amber-500/30">
                            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-500">{t.saveKeySafely}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 text-sm font-mono bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-cyan-400 select-all break-all">{recoveryKey}</code>
                            <button onClick={copyKey} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors flex-shrink-0">
                                {keyCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <button onClick={handleGenerateKey} disabled={generatingKey} className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors disabled:opacity-50">
                            {generatingKey ? t.generating : t.generateNewKey}
                        </button>
                    </div>
                ) : (
                    <button onClick={handleGenerateKey} disabled={generatingKey} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50">
                        {generatingKey ? t.generating : t.createRecoveryKey}
                    </button>
                )}
            </div>
        </div>
    );
}
