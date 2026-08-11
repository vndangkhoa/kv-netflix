import { Layout } from '../../components/Layout';
import { HomeContent } from '../../components/HomeContent';
import { ListHome } from './ListHome';
import { useSync } from '../../hooks/useSync';
import { useTheme } from '../../context/ThemeContext';

export const DefaultHome = () => {
    useSync();
    const { layoutTheme } = useTheme();

    if (layoutTheme === 'list') {
        return <ListHome />;
    }

    return (
        <Layout>
            <HomeContent />
        </Layout>
    );
};
