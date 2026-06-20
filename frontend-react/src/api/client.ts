const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('streamflow_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}

export interface User {
    id: number;
    email: string;
    name: string;
    created_at: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface SavedMovie {
    id: number;
    user_id: number;
    movie_id: string;
    title: string;
    slug: string;
    thumbnail: string;
    backdrop: string;
    year: number;
    category: string;
    quality: string;
    director: string;
    cast: string;
    saved_at: string;
}

export interface WatchHistoryEntry {
    id: number;
    user_id: number;
    movie_id: string;
    title: string;
    slug: string;
    thumbnail: string;
    backdrop: string;
    year: number;
    category: string;
    genre: string;
    country: string;
    quality: string;
    current_episode: number;
    watched_timestamp: number;
    duration: number;
    progress: number;
    watched_at: string;
}

export const authAPI = {
    register: (email: string, password: string, name: string) =>
        request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        }),

    login: (email: string, password: string) =>
        request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    getMe: () => request<User>('/auth/me'),

    generateDeviceCode: (deviceName: string) =>
        request<{ code: string; expires_at: string }>('/auth/device/code', {
            method: 'POST',
            body: JSON.stringify({ device_name: deviceName }),
        }),

    pairDevice: (code: string) =>
        request<AuthResponse>('/auth/device/pair', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),

    checkDeviceStatus: (code: string) =>
        request<{ status: string; token?: string }>(`/auth/device/status?code=${code}`),

    generateLinkCode: () =>
        request<{ code: string; expires_at: string }>('/auth/device/link-code', {
            method: 'POST',
        }),

    loginWithCode: (code: string) =>
        request<AuthResponse>('/auth/device/link-login', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),

    resetPassword: (key: string, newPassword: string) =>
        request<{ status: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ key, new_password: newPassword }),
        }),
};

export interface Device {
    id: number;
    user_id: number;
    name: string;
    is_paired: boolean;
    created_at: string;
}

export const accountAPI = {
    getDevices: () => request<Device[]>('/account/devices'),

    removeDevice: (deviceId: number) =>
        request<{ status: string }>('/account/devices', {
            method: 'DELETE',
            body: JSON.stringify({ device_id: deviceId }),
        }),

    changePassword: (currentPassword: string, newPassword: string) =>
        request<{ status: string }>('/account/change-password', {
            method: 'POST',
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        }),

    generateRecoveryKey: () =>
        request<{ key: string; created_at: string }>('/account/recovery-key', {
            method: 'POST',
        }),
};

export interface ExploreMovie {
    id: string;
    title: string;
    slug: string;
    thumbnail: string;
    backdrop: string;
    year: number;
    quality: string;
    genre: string;
    category: string;
}

export const exploreAPI = {
    getRelated: () => request<ExploreMovie[]>('/videos/explore'),
};

export const syncAPI = {
    getSavedMovies: () => request<SavedMovie[]>('/sync/saved-movies'),

    addSavedMovie: (movie: Partial<SavedMovie>) =>
        request<SavedMovie>('/sync/saved-movies', {
            method: 'POST',
            body: JSON.stringify(movie),
        }),

    removeSavedMovie: (movieId: string) =>
        request<{ status: string }>(`/sync/saved-movies?movie_id=${movieId}`, {
            method: 'DELETE',
        }),

    getWatchHistory: () => request<WatchHistoryEntry[]>('/sync/watch-history'),

    updateWatchProgress: (data: Partial<WatchHistoryEntry>) =>
        request<WatchHistoryEntry>('/sync/watch-history', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    bulkSync: (savedMovies: Partial<SavedMovie>[], watchHistory: Partial<WatchHistoryEntry>[]) =>
        request<{ saved_movies: SavedMovie[]; watch_history: WatchHistoryEntry[] }>('/sync/bulk', {
            method: 'POST',
            body: JSON.stringify({ saved_movies: savedMovies, watch_history: watchHistory }),
        }),
};
