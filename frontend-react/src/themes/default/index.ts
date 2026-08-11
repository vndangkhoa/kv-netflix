import type { Theme } from '../../types/Theme';
import { DefaultHome } from './DefaultHome';
import { Hero } from '../../components/Hero';
import { WatchPage } from './WatchPage'; // Use local StreamFlow WatchPage
import { Layout } from '../../components/Layout'; // Fallback layout if needed, but Home handles it

export const defaultTheme: Theme = {
    name: 'default',
    label: 'StreamFlow',
    colors: {
        background: '#191b24',
        primary: '#ffd875',
        text: '#FFFFFF',
    },
    components: {
        Layout,
        Hero,
        WatchPage,
        Home: DefaultHome,
    },
};
