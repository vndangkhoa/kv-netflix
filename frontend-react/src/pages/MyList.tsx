import { useTheme } from '../context/ThemeContext';
import { netflixTheme } from '../themes/netflix';
import { appleTheme } from '../themes/apple';
import { useMyList } from '../hooks/useMyList';
import { SettingsPanel } from '../components/SettingsPanel';

import { defaultTheme } from '../themes/default';

const themes = {
    netflix: netflixTheme,
    apple: appleTheme,
    default: defaultTheme,
};

const MyList = () => {
    const { currentTheme } = useTheme();
    const { savedMovies, watchHistory } = useMyList();
    const ActiveTheme = themes[currentTheme];
    const { Layout, MovieGrid } = ActiveTheme.components;

    return (
        <Layout>
            <div className="pt-24 px-4 md:px-12 min-h-screen">
                {/* Watch History Section */}
                {watchHistory.length > 0 && (
                    <div className="mb-12">
                        <MovieGrid movies={watchHistory} title="Continue Watching" />
                    </div>
                )}

                {/* Saved List Section */}
                <MovieGrid movies={savedMovies} title="My List" />

                {savedMovies.length === 0 && watchHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                        <p className="text-xl">Your list is empty.</p>
                        <p className="text-sm mt-2">Start watching or add movies to your list.</p>
                    </div>
                )}
            </div>
            <SettingsPanel />
        </Layout>
    );
};

export default MyList;
