import type { Movie } from '../../types';
import { Card } from './Card';

export const MovieGrid = ({ movies, loading, title }: { movies: Movie[], loading?: boolean, title?: string }) => {
    if (loading) {
        return (
            <div className="px-4 md:px-12 pb-10">
                {title && <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>}
                <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-[#222] rounded-md animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-12 pb-10">
            {title && <h2 className="text-xl font-bold mb-4 text-white hover:text-gray-300 cursor-pointer transition-colors inline-block">{title} &gt;</h2>}
            <div className="grid grid-cols-2 min-[450px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.map((movie) => (
                    <Card key={movie.id} movie={movie} />
                ))}
            </div>
        </div>
    );
};
