import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeName } from '../types/Theme';

// We will import the actual theme objects here once they are created
// import { netflixTheme } from '../themes/netflix';
// import { appleTheme } from '../themes/apple';

interface ThemeContextType {
    currentTheme: ThemeName;
    setTheme: (theme: ThemeName) => void;

    // For now, we'll just store the ID. Later we will expose the full theme object
    // theme: Theme; 
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as ThemeName) || 'netflix';
    });

    useEffect(() => {
        localStorage.setItem('app-theme', currentTheme);
        // We can also set a class on the body if global styles need it
        document.body.className = `theme-${currentTheme}`;
    }, [currentTheme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
