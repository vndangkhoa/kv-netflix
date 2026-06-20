import { Home, Film, Tv, PlayCircle, Heart, Folder } from 'lucide-react';

export const CATEGORIES = [
    { id: 'phim-le', nameKey: 'movies' as const, path: '?category=phim-le', icon: Film },
    { id: 'phim-bo', nameKey: 'series' as const, path: '?category=phim-bo', icon: Tv },
    { id: 'hoat-hinh', nameKey: 'animation' as const, path: '?category=hoat-hinh', icon: PlayCircle },
    { id: 'tv-shows', nameKey: 'tvShows' as const, path: '?category=tv-shows', icon: Folder },
    { id: 'my-list', nameKey: 'myAccount' as const, path: '/my-list', icon: Heart },
];

export const NAV_ITEMS = [
    { nameKey: 'home' as const, path: '/', icon: Home },
    ...CATEGORIES.map(cat => ({ nameKey: cat.nameKey, path: cat.path, icon: cat.icon })),
];
