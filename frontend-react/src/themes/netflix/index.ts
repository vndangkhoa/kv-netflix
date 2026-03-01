import type { Theme } from '../../types/Theme';
import { Layout } from './Layout';
import { Hero } from '../../components/Hero';
import { MovieGrid } from './MovieGrid';
import { Card } from './Card';
import { WatchPage } from './WatchPage';
import { NetflixHome } from './NetflixHome'; // Added

export const netflixTheme: Theme = {
    name: 'netflix',
    label: 'Netflix',
    colors: {
        background: '#141414',
        primary: '#E50914',
        text: '#FFFFFF',
    },
    components: {
        Layout,
        Hero,
        MovieGrid,
        Card,
        WatchPage,
        Home: NetflixHome, // Added as Home
    },
};
