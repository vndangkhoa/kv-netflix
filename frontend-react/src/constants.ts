import { Home, Film, Tv, PlayCircle, Heart, Folder } from 'lucide-react';

export const CATEGORIES = [
    { id: 'phim-le', name: 'Phim Lẻ', path: '?category=phim-le', icon: Film },
    { id: 'phim-bo', name: 'Phim Bộ', path: '?category=phim-bo', icon: Tv },
    { id: 'hoat-hinh', name: 'Hoạt Hình', path: '?category=hoat-hinh', icon: PlayCircle },
    { id: 'tv-shows', name: 'TV Shows', path: '?category=tv-shows', icon: Folder },
    { id: 'my-list', name: 'My List', path: '/my-list', icon: Heart },
];

export const NAV_ITEMS = [
    { name: 'Home', path: '/', icon: Home },
    ...CATEGORIES.map(cat => ({ name: cat.name, path: cat.path, icon: cat.icon })),
];
