import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'streamflow_theme';

function isTVUserAgent(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = (navigator.userAgent || '').toLowerCase();
    return ua.includes('web0s') || ua.includes('webos') || ua.includes('smarttv') || ua.includes('tizen') || ua.includes('googletv') || ua.includes('androidtv') || ua.includes('hbbtv');
}

function getInitialTheme(): Theme {
    if (isTVUserAgent()) return 'dark';
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    const setTheme = useCallback((newTheme: Theme) => {
        const targetTheme = isTVUserAgent() ? 'dark' : newTheme;
        setThemeState(targetTheme);
        try {
            localStorage.setItem(STORAGE_KEY, targetTheme);
        } catch { /* ignore */ }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light');
        root.classList.add('dark');
        if (theme === 'light' && !isTVUserAgent()) {
            root.classList.remove('dark');
            root.classList.add('light');
        }
    }, [theme]);

    // Listen for system theme changes (desktop only)
    useEffect(() => {
        if (isTVUserAgent()) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                setThemeState(e.matches ? 'dark' : 'light');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
