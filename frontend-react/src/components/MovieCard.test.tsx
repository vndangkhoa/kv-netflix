import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MovieCard } from './MovieCard';
import type { Movie } from '../types';

const mockMovie: Movie = {
    id: 'test-movie-1',
    title: 'Phim Test Đầu Xuân',
    slug: 'phim-test-dau-xuan',
    thumbnail: 'https://phimimg.com/uploads/movies/20260826/test-poster.webp',
    backdrop: 'https://phimimg.com/uploads/movies/20260826/test-thumb.webp',
    year: 2026,
    category: 'series',
};

describe('MovieCard', () => {
    it('renders movie title and link properly', () => {
        render(
            <MemoryRouter>
                <MovieCard movie={mockMovie} />
            </MemoryRouter>
        );

        expect(screen.getByText('Phim Test Đầu Xuân')).toBeInTheDocument();
        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', '/phim/phim-test-dau-xuan');
    });

    it('renders img with lazy loading, no-referrer policy, and proxy url', () => {
        render(
            <MemoryRouter>
                <MovieCard movie={mockMovie} />
            </MemoryRouter>
        );

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
        expect(img.getAttribute('src')).toContain('/api/images/proxy?url=https%3A%2F%2Fphimimg.com');
    });

    it('cascades through fallback candidates when image errors occur', () => {
        render(
            <MemoryRouter>
                <MovieCard movie={mockMovie} />
            </MemoryRouter>
        );

        const img = screen.getByRole('img');
        // Stage 1 error: proxy primary fails -> fallback to raw primary
        fireEvent.error(img);
        expect(img.getAttribute('src')).toBe(mockMovie.thumbnail);

        // Stage 2 error: raw primary fails -> fallback to proxy secondary (backdrop)
        fireEvent.error(img);
        expect(img.getAttribute('src')).toContain(encodeURIComponent(mockMovie.backdrop!));

        // Stage 3 error: proxy secondary fails -> fallback to raw secondary (backdrop)
        fireEvent.error(img);
        expect(img.getAttribute('src')).toBe(mockMovie.backdrop);

        // Stage 4 error: raw secondary fails -> all candidates exhausted -> show fallback error UI
        fireEvent.error(img);
        // The img tag should now be replaced by the error placeholder
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getAllByText('Phim Test Đầu Xuân')).toHaveLength(2);
    });
});
