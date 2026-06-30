import { Home, Film, Tv, PlayCircle, Heart, Folder, Swords, HeartHandshake, Laugh, Castle, Brain, Siren, Bomb, Dumbbell, Target, Rocket, Compass, FlaskRound, Ghost, Music, VenetianMask, BookOpen, Trees, Landmark, Eye, GraduationCap, Star, Smartphone } from 'lucide-react';

export const CATEGORIES = [
    { id: 'phim-le', nameKey: 'movies' as const, path: '/?category=phim-le', icon: Film },
    { id: 'phim-bo', nameKey: 'series' as const, path: '/?category=phim-bo', icon: Tv },
    { id: 'hoat-hinh', nameKey: 'animation' as const, path: '/?category=hoat-hinh', icon: PlayCircle },
    { id: 'tv-shows', nameKey: 'tvShows' as const, path: '/?category=tv-shows', icon: Folder },
    { id: 'my-list', nameKey: 'myAccount' as const, path: '/my-list', icon: Heart },
];

export const NAV_ITEMS = [
    { nameKey: 'home' as const, path: '/', icon: Home },
    ...CATEGORIES.map(cat => ({ nameKey: cat.nameKey, path: cat.path, icon: cat.icon })),
];

export interface Genre {
    id: string;
    vi: string;
    en: string;
    icon: typeof Home;
}

export const GENRES: Genre[] = [
    { id: 'hanh-dong', vi: 'Hành Động', en: 'Action', icon: Swords },
    { id: 'tinh-cam', vi: 'Tình Cảm', en: 'Romance', icon: HeartHandshake },
    { id: 'hai-huoc', vi: 'Hài Hước', en: 'Comedy', icon: Laugh },
    { id: 'co-trang', vi: 'Cổ Trang', en: 'Historical', icon: Castle },
    { id: 'tam-ly', vi: 'Tâm Lý', en: 'Psychological', icon: Brain },
    { id: 'hinh-su', vi: 'Hình Sự', en: 'Crime', icon: Siren },
    { id: 'chien-tranh', vi: 'Chiến Tranh', en: 'War', icon: Bomb },
    { id: 'the-thao', vi: 'Thể Thao', en: 'Sports', icon: Dumbbell },
    { id: 'vo-thuat', vi: 'Võ Thuật', en: 'Martial Arts', icon: Target },
    { id: 'vien-tuong', vi: 'Viễn Tưởng', en: 'Sci-Fi', icon: Rocket },
    { id: 'phieu-luu', vi: 'Phiêu Lưu', en: 'Adventure', icon: Compass },
    { id: 'khoa-hoc', vi: 'Khoa Học', en: 'Science', icon: FlaskRound },
    { id: 'kinh-di', vi: 'Kinh Dị', en: 'Horror', icon: Ghost },
    { id: 'am-nhac', vi: 'Âm Nhạc', en: 'Music', icon: Music },
    { id: 'than-thoai', vi: 'Thần Thoại', en: 'Mythology', icon: VenetianMask },
    { id: 'tai-lieu', vi: 'Tài Liệu', en: 'Documentary', icon: BookOpen },
    { id: 'gia-dinh', vi: 'Gia Đình', en: 'Family', icon: Trees },
    { id: 'chinh-kich', vi: 'Chính Kịch', en: 'Drama', icon: Landmark },
    { id: 'bi-an', vi: 'Bí Ẩn', en: 'Mystery', icon: Eye },
    { id: 'hoc-duong', vi: 'Học Đường', en: 'School', icon: GraduationCap },
    { id: 'kinh-dien', vi: 'Kinh Điển', en: 'Classic', icon: Star },
    { id: 'phim-18', vi: 'Phim 18+', en: 'Adult', icon: Smartphone },
    { id: 'short-drama', vi: 'Short Drama', en: 'Short Drama', icon: Film },
];
