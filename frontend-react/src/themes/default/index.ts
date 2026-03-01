import type { Theme } from '../../types/Theme';
import { DefaultHome } from './DefaultHome';
import { Hero } from '../../components/Hero';
import { MovieGrid } from '../netflix/MovieGrid';
import { Card } from '../netflix/Card';
import { WatchPage } from './WatchPage'; // Use local StreamFlow WatchPage
import { Layout } from '../netflix/Layout'; // Fallback layout if needed, but Home handles it

export const defaultTheme: Theme = {
    name: 'default',
    label: 'StreamFlow',
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
        Home: DefaultHome,
    },
};
