import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from '../i18n/translations';
import type { Lang, Translations } from '../i18n/translations';

interface LanguageContextType {
    lang: Lang;
    t: Translations;
    toggleLang: () => void;
    setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'streamflow_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'vi' || stored === 'en') return stored;
        } catch { /* ignore */ }
        return 'vi';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const toggleLang = () => {
        setLangState(prev => prev === 'vi' ? 'en' : 'vi');
    };

    const setLang = (l: Lang) => setLangState(l);

    return (
        <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang, setLang }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLang() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLang must be used within LanguageProvider');
    return ctx;
}
