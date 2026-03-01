import type { Movie } from '../../types';
import { Card } from './Card';

export const MovieGrid = ({ movies, loading, title }: { movies: Movie[], loading?: boolean, title?: string }) => {
    if (loading) {
        return (
            <div className="px-6 md:px-16 pt-8 pb-16">
                {title && <h2 className="text-2xl font-bold mb-6 text-white/90">{title}</h2>}
                <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 md:px-16 pt-8 pb-16">
            <div className="flex items-baseline justify-between mb-6">
                {title && <h2 className="text-2xl font-bold text-white/90">{title}</h2>}
                <button className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors">See All</button>
            </div>

            <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12">
                {movies.map((movie) => (
                    <Card key={movie.id} movie={movie} />
                ))}
            </div>
        </div>
    );
};
