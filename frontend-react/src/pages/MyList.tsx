import { useState, useEffect } from 'react';
import { useMyList } from '../hooks/useMyList';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { MovieCard } from '../components/MovieCard';
import DevicePairPage from './DevicePairPage';
import { accountAPI, exploreAPI } from '../api/client';
import type { Device, ExploreMovie } from '../api/client';
import {
    User, Monitor, LogOut, Trash2, Shield, Copy, Check,
    RefreshCw, Eye, EyeOff, AlertTriangle, Compass, Clock, Bookmark,
    Settings, Lock, X
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';

type TabId = 'explore' | 'history' | 'saved' | 'account';

const TABS: { id: TabId; labelKey: keyof Translations; icon: typeof User; authRequired: boolean }[] = [
    { id: 'explore', labelKey: 'explore', icon: Compass, authRequired: true },
    { id: 'history', labelKey: 'history', icon: Clock, authRequired: false },
    { id: 'saved', labelKey: 'savedMovies', icon: Bookmark, authRequired: false },
    { id: 'account', labelKey: 'account', icon: Settings, authRequired: true },
];

interface Translations {
    explore: string; history: string; savedMovies: string; account: string;
    signInToExplore: string; noWatchHistoryYet: string; startWatchingHint: string;
    exploreTitle: string; exploreEmpty: string; exploreEmptyHint: string;
    retry: string; loadingError: string; watchHistoryHint: string; noSavedMovies: string;
    savedMoviesHint: string; loading: string; signInToSync: string;
    connectedDevices: string; noDevices: string; changePassword: string;
    currentPassword: string; newPassword: string; confirmPassword: string;
    passwordMinHint: string; changePasswordBtn: string; changing: string;
    passwordChanged: string; passwordMismatch: string; fillAllFields: string;
    passwordMinLength: string; passwordChangeFailed: string; recoverAccount: string;
    recoverDescription: string; saveKeySafely: string; generateNewKey: string;
    createRecoveryKey: string; keyGeneratedError: string; generating: string;
    pairDevice: string; logout: string; accountSecurity: string; devices: string;
}

export default function MyList() {
    const { savedMovies, watchHistory, setWatchHistory } = useMyList();
    const { user, isAuthenticated, logout } = useAuth();
    const { t } = useLang();
    const [tab, setTab] = useState<TabId>('history');
    const [showPairModal, setShowPairModal] = useState(false);

    const visibleTabs = TABS.filter(t => !t.authRequired || isAuthenticated);
    const currentTab = visibleTabs.find(t => t.id === tab) ? tab : visibleTabs[0]?.id || 'history';

    return (
        <Layout>
            {/* Top tab bar - all screens */}
            <div className="sticky top-14 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)]">
                <div className="px-4 sm:px-6 lg:px-12 py-2.5 overflow-x-auto scrollbar-hide flex sm:justify-center">
                    <div className="flex gap-1 justify-start sm:justify-center">
                        {visibleTabs.map(({ id, labelKey, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                                    currentTab === id
                                        ? 'bg-accent text-white shadow-sm shadow-accent/20'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                            >
                                <Icon size={16} />
                                {t[labelKey as keyof typeof t] as string}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pb-12">

                {currentTab === 'explore' && isAuthenticated && <ExploreTab />}
                {currentTab === 'history' && (
                    <HistoryTab
                        items={watchHistory}
                        emptyKey="noWatchHistoryYet"
                        hintKey="startWatchingHint"
                        onRemove={(movieId: string) => {
                            setWatchHistory(watchHistory.filter(m => m.id !== movieId));
                        }}
                    />
                )}
                {currentTab === 'saved' && <HistoryTab items={savedMovies} emptyKey="noSavedMovies" hintKey="savedMoviesHint" />}
                {currentTab === 'account' && isAuthenticated && (
                    <AccountSettings user={user!} logout={logout} onShowPair={() => setShowPairModal(true)} />
                )}

                {!isAuthenticated && (currentTab === 'explore' || currentTab === 'account') && (
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-12">
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                            <User size={48} className="mb-4 opacity-30" />
                            <p className="text-lg">{t.signInToExplore}</p>
                            <p className="text-sm mt-1 opacity-70">{t.signInToSync}</p>
                        </div>
                    </div>
                )}
            </div>

            {showPairModal && <DevicePairPage onClose={() => setShowPairModal(false)} />}
        </Layout>
    );
}

// ── Explore Tab ───────────────────────────────────────────────────────

function ExploreTab() {
    const [movies, setMovies] = useState<ExploreMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { t } = useLang();

    useEffect(() => { loadExplore(); }, []);

    async function loadExplore() {
        setLoading(true);
        setError('');
        try {
            setMovies(await exploreAPI.getRelated());
        } catch {
            setError(t.loadingError as string);
        }
        setLoading(false);
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-12">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-accent-bg">
                    <Compass size={18} className="text-accent" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{t.exploreTitle as string}</h2>
                <button onClick={loadExplore} className="ml-auto p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                    <p className="text-sm mb-3">{error}</p>
                    <button onClick={loadExplore} className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors">
                        {t.retry as string}
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
                    <p className="text-base">{t.exploreEmpty as string}</p>
                    <p className="text-sm mt-1 opacity-70">{t.exploreEmptyHint as string}</p>
                </div>
            )}
        </div>
    );
}

// ── History / Saved Tab ────────────────────────────────────────────────

function HistoryTab({ items, emptyKey, hintKey, onRemove }: { items: any[]; emptyKey: string; hintKey: string; onRemove?: (id: string) => void }) {
    const { t } = useLang();
    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-12">
            {items.length > 0 ? (
                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                    {items.map((movie: any, index: number) => (
                        <div key={`${movie.id}-${index}`} className="relative group">
                            <MovieCard movie={movie} />
                            {onRemove && (
                                <button
                                    onClick={(e) => { e.preventDefault(); onRemove(movie.id); }}
                                    className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                    aria-label="Remove"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                    <p className="text-base">{t[emptyKey as keyof typeof t] as string}</p>
                    <p className="text-sm mt-1 opacity-70">{t[hintKey as keyof typeof t] as string}</p>
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
        if (!currentPw || !newPw) { setPwError(t.fillAllFields as string); return; }
        if (newPw.length < 6) { setPwError(t.passwordMinLength as string); return; }
        if (newPw !== confirmPw) { setPwError(t.passwordMismatch as string); return; }
        setChangingPw(true);
        try {
            await accountAPI.changePassword(currentPw, newPw);
            setPwSuccess(t.passwordChanged as string);
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (e: any) { setPwError(e.message || (t.passwordChangeFailed as string)); }
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
            setKeyError(e.message || (t.keyGeneratedError as string));
        }
        setGeneratingKey(false);
    }

    function copyKey() {
        navigator.clipboard.writeText(recoveryKey);
        setKeyCopied(true);
        setTimeout(() => setKeyCopied(false), 2000);
    }

    return (
        <div className="px-4 sm:px-6 lg:px-12 pb-12 max-w-4xl mx-auto">

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-accent/5 to-transparent border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-red-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent/25">
                        <span className="text-2xl font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name}</h2>
                        <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={onShowPair}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-accent bg-accent-bg hover:bg-accent-bg-hover rounded-xl transition-colors border border-accent/20"
                        >
                            <Monitor size={14} />
                            {t.pairDevice as string}
                        </button>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/20"
                        >
                            <LogOut size={14} />
                            {t.logout as string}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Security Section */}
                <div className="space-y-6">
                    {/* Change Password */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-lg bg-accent-bg">
                                <Lock size={16} className="text-accent" />
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)]">{t.changePassword as string}</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    type={showCurrentPw ? 'text' : 'password'}
                                    value={currentPw}
                                    onChange={e => setCurrentPw(e.target.value)}
                                    placeholder={t.currentPassword as string}
                                    className="w-full px-3 py-2.5 pr-10 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent transition-colors"
                                />
                                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showNewPw ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={e => setNewPw(e.target.value)}
                                    placeholder={`${t.newPassword as string} ${t.passwordMinHint as string}`}
                                    className="w-full px-3 py-2.5 pr-10 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent transition-colors"
                                />
                                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <input
                                type="password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder={t.confirmPassword as string}
                                className="w-full px-3 py-2.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent transition-colors"
                            />
                            {pwError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} />{pwError}</p>}
                            {pwSuccess && <p className="text-xs text-green-500">{pwSuccess}</p>}
                            <button
                                onClick={handleChangePassword}
                                disabled={changingPw}
                                className="w-full py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors disabled:opacity-50"
                            >
                                {changingPw ? (t.changing as string) : (t.changePasswordBtn as string)}
                            </button>
                        </div>
                    </div>

                    {/* Recovery Key */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Shield size={16} className="text-amber-500" />
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)]">{t.recoverAccount as string}</h3>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">{t.recoverDescription as string}</p>
                        {keyError && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertTriangle size={12} />{keyError}</p>}
                        {keyShown && recoveryKey ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-500">{t.saveKeySafely as string}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2.5 text-sm font-mono bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-accent select-all break-all">{recoveryKey}</code>
                                    <button onClick={copyKey} className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors flex-shrink-0 border border-[var(--border-subtle)]">
                                        {keyCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <button onClick={handleGenerateKey} disabled={generatingKey} className="w-full py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors disabled:opacity-50 border border-[var(--border-subtle)]">
                                    {generatingKey ? (t.generating as string) : (t.generateNewKey as string)}
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleGenerateKey} disabled={generatingKey} className="w-full py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors disabled:opacity-50">
                                {generatingKey ? (t.generating as string) : (t.createRecoveryKey as string)}
                            </button>
                        )}
                    </div>
                </div>

                {/* Devices Section */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-6 h-fit">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Monitor size={16} className="text-purple-500" />
                            </div>
                            <h3 className="font-semibold text-[var(--text-primary)]">{t.connectedDevices as string}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">{devices.length}</span>
                        </div>
                        <button onClick={loadDevices} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                            <RefreshCw size={14} className={loadingDevices ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {loadingDevices ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="text-center py-8">
                            <Monitor size={32} className="mx-auto mb-2 opacity-30 text-[var(--text-muted)]" />
                            <p className="text-sm text-[var(--text-muted)]">{t.noDevices as string}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {devices.map(device => (
                                <div key={device.id} className="flex items-center justify-between py-2.5 px-3 bg-[var(--bg-tertiary)] rounded-xl group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Monitor size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{device.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{new Date(device.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveDevice(device.id)}
                                        disabled={removingId === device.id}
                                        className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
