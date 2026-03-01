import type { Theme } from '../../types/Theme';
import { Layout } from './Layout';
import { Hero } from '../../components/Hero';
import { MovieGrid } from './MovieGrid';
import { Card } from './Card';
import { WatchPage } from './WatchPage'; // Added
import { AppleHome } from './AppleHome'; // Added

export const appleTheme: Theme = {
    name: 'apple',
    label: 'Apple TV+',
    colors: {
        background: '#000000',
        primary: '#FFFFFF',
        text: '#FFFFFF',
    },
    components: {
        Layout,
        Hero,
        MovieGrid,
        Card,
        WatchPage, // Added
        Home: AppleHome, // Added as Home
    },
};
