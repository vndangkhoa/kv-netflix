import type { ReactNode } from 'react';
import type { Movie } from './index';

export interface ThemeComponents {
    Layout: React.ComponentType<{ children: ReactNode }>;
    Hero: React.ComponentType<{ movies: Movie[] }>;
    WatchPage: React.ComponentType<{ slug: string, episode: string }>;
    Home: React.ComponentType; // Refactored to be self-contained
}

export type ThemeName = 'netflix' | 'apple' | 'default';

export interface Theme {
    name: ThemeName;
    label: string;
    colors: {
        background: string;
        primary: string;
        text: string;
    };
    components: ThemeComponents;
}
