import { MovieCard } from '../../components/MovieCard';
import type { Movie } from '../../types';

export const Card = ({ movie }: { movie: Movie }) => {
    return <MovieCard movie={movie} />;
};
