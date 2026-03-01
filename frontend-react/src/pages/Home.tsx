import { useTheme } from '../context/ThemeContext';
import { netflixTheme } from '../themes/netflix';
import { appleTheme } from '../themes/apple';

import { defaultTheme } from '../themes/default';

const themes = {
    default: defaultTheme,
    netflix: netflixTheme,
    apple: appleTheme,
};

const Home = () => {
    const { currentTheme } = useTheme();

    // Dynamically select the Home component based on the current theme
    const ActiveTheme = themes[currentTheme];
    const ThemeHome = ActiveTheme.components.Home;

    return <ThemeHome />;
};

export default Home;
