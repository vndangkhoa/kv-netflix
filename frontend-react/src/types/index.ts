export interface CastMember {
    name: string;
    avatar?: string;
    character?: string;
    slug?: string;
}

export interface Movie {
    id: string;
    title: string;
    original_title?: string;
    description?: string;
    slug: string;
    thumbnail: string;
    backdrop?: string;
    quality?: string;
    year?: number;
    rating?: string;
    category: string;
    time?: string;
    lang?: string;
    provider?: string;
    director?: string;
    cast?: string[];
    castDetails?: CastMember[];
    genre?: string;
    country?: string;
    // Progress tracking
    currentEpisode?: number;
    watchedTimestamp?: number;
    duration?: number;
}

export interface MovieDetail extends Movie {
    description: string;
    rating?: string;
    duration?: number;
    genre?: string;
    director?: string;
    country?: string;
    cast?: string[];
    castDetails?: CastMember[];
    episodes?: Episode[];
}

export interface SubtitleTrackInfo {
    label: string;
    lang: string;
    url: string;
    default?: boolean;
}

export interface Episode {
    number: number;
    title: string;
    url: string;
    server_name?: string;
    serverName?: string;
    embedUrl?: string;
    embed_url?: string;
    subtitles?: SubtitleTrackInfo[];
}

export interface VideoSource {
    stream_url: string;
    resolution: string;
    format_id: string;
    isEmbed?: boolean;
    ext?: string;
}
export interface Category {
    name: string;
    slug: string;
}
