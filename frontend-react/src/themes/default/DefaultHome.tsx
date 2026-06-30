import { Layout } from '../../components/Layout';
import { HomeContent } from '../../components/HomeContent';
import { useSync } from '../../hooks/useSync';

export const DefaultHome = () => {
    useSync();

    return (
        <Layout>
            <HomeContent />
        </Layout>
    );
};
