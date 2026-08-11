import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
export type AccentTheme = 'crimson' | 'cyan' | 'golden';
export type LayoutTheme = 'hero' | 'list';

interface ThemeContextType {
    theme: Theme;
    accentTheme: AccentTheme;
    layoutTheme: LayoutTheme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    toggleAccentTheme: () => void;
    setAccentTheme: (accent: AccentTheme) => void;
    toggleLayoutTheme: () => void;
    setLayoutTheme: (layout: LayoutTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'streamflow_theme';
const ACCENT_STORAGE_KEY = 'streamflow_accent_theme';
const LAYOUT_STORAGE_KEY = 'streamflow_layout_theme';

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

function getInitialAccentTheme(): AccentTheme {
    try {
        const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
        if (stored === 'crimson' || stored === 'cyan' || stored === 'golden') return stored;
    } catch { /* ignore */ }
    return 'crimson';
}

function getInitialLayoutTheme(): LayoutTheme {
    try {
        const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (stored === 'hero' || stored === 'list') return stored;
    } catch { /* ignore */ }
    return 'hero';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);
    const [accentTheme, setAccentThemeState] = useState<AccentTheme>(getInitialAccentTheme);
    const [layoutTheme, setLayoutThemeState] = useState<LayoutTheme>(getInitialLayoutTheme);

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

    const setAccentTheme = useCallback((newAccent: AccentTheme) => {
        setAccentThemeState(newAccent);
        try {
            localStorage.setItem(ACCENT_STORAGE_KEY, newAccent);
        } catch { /* ignore */ }
    }, []);

    const toggleAccentTheme = useCallback(() => {
        const cycle: AccentTheme[] = ['crimson', 'cyan', 'golden'];
        const idx = cycle.indexOf(accentTheme);
        setAccentTheme(cycle[(idx + 1) % cycle.length]);
    }, [accentTheme, setAccentTheme]);

    const setLayoutTheme = useCallback((newLayout: LayoutTheme) => {
        setLayoutThemeState(newLayout);
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, newLayout);
        } catch { /* ignore */ }
    }, []);

    const toggleLayoutTheme = useCallback(() => {
        setLayoutTheme(layoutTheme === 'hero' ? 'list' : 'hero');
    }, [layoutTheme, setLayoutTheme]);

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

    // Apply accent theme class to document
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('accent-crimson', 'accent-cyan', 'accent-golden');
        root.classList.add(`accent-${accentTheme}`);
    }, [accentTheme]);

    // Apply layout theme class to document
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('layout-hero', 'layout-list');
        root.classList.add(`layout-${layoutTheme}`);
    }, [layoutTheme]);

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
        <ThemeContext.Provider value={{ theme, accentTheme, layoutTheme, toggleTheme, setTheme, toggleAccentTheme, setAccentTheme, toggleLayoutTheme, setLayoutTheme }}>
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
