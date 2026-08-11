import { useState } from 'react';
import { History, Heart, MonitorSmartphone, ListChecks, LogIn } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

const FEATURES = [
    { key: 'featWatchProgress', icon: History },
    { key: 'featFavorite', icon: Heart },
    { key: 'featSync', icon: MonitorSmartphone },
    { key: 'featList', icon: ListChecks },
] as const;

export const LoginPromoBanner = () => {
    const { t } = useLang();
    const { isAuthenticated } = useAuth();
    const [authModal, setAuthModal] = useState<string | null>(null);

    if (isAuthenticated) return null;

    return (
        <>
            <div
                className="mx-4 sm:mx-6 lg:mx-12 mb-6 rounded-2xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-8 px-6 sm:px-8 py-6 sm:py-7"
                style={{
                    background: 'linear-gradient(135deg,#1f1810 0%,#120e09 100%)',
                    border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
            >
                {/* Left: title + desc + login button */}
                <div className="lg:w-2/5 flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">{t.loginPromoTitle}</h3>
                    <p className="text-xs sm:text-sm text-[#888c9d] font-light mb-4 leading-relaxed">{t.loginPromoDesc}</p>
                    <button
                        onClick={() => setAuthModal('login')}
                        tabIndex={0}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] px-4 py-2 text-sm font-semibold transition-colors"
                    >
                        <LogIn size={15} />
                        {t.login}
                    </button>
                </div>

                {/* Middle: feature items */}
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3 min-w-0">
                    {FEATURES.map(({ key, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-2.5 min-w-0">
                            <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 bg-[var(--accent)]/10 text-[var(--accent)]">
                                <Icon size={16} />
                            </div>
                            <span className="text-xs sm:text-[13px] text-white/85 leading-snug">{t[key]}</span>
                        </div>
                    ))}
                </div>

                {/* Right: decorative graphic */}
                <div className="hidden xl:block w-56 shrink-0 relative" aria-hidden>
                    <div className="absolute -top-16 -right-8 w-40 h-40 rounded-full bg-[var(--accent)]/15 blur-3xl" />
                    <div className="relative h-36 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-[var(--bg-3)] to-[var(--bg-5)]/40">
                        <div className="absolute left-3 bottom-2 w-20 h-28 rounded-lg clip-mamphim bg-[var(--bg-4)] border border-white/10 rotate-[-6deg] shadow-xl" />
                        <div className="absolute right-3 bottom-2 w-20 h-28 rounded-lg clip-mamphim bg-[var(--bg-3)] border border-white/15 rotate-[6deg] shadow-xl">
                            <div className="absolute inset-0 flex items-center justify-center text-[var(--accent)]">
                                <LogIn size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {authModal === 'login' && (
                <LoginPage onClose={() => setAuthModal(null)} onSwitchToRegister={() => setAuthModal('register')} onSwitchToReset={() => setAuthModal('reset')} />
            )}
            {authModal === 'register' && (
                <RegisterPage onClose={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />
            )}
            {authModal === 'reset' && (
                <ResetPasswordPage onClose={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />
            )}
        </>
    );
};
