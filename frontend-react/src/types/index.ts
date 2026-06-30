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
    category: string;
    time?: string;
    lang?: string;
    provider?: string;
    director?: string;
    cast?: string[];
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
    episodes?: Episode[];
}

export interface Episode {
    number: number;
    title: string;
    url: string;
    server_name?: string;
    serverName?: string;
}

export interface VideoSource {
    stream_url: string;
    resolution: string;
    format_id: string;
}
export interface Category {
    name: string;
    slug: string;
}
