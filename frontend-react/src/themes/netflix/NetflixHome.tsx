import { Layout } from './Layout';
import { HomeContent } from '../../components/HomeContent';
import { SettingsPanel } from '../../components/SettingsPanel';

export const NetflixHome = () => {
    return (
        <Layout>
            <div className="w-full min-h-screen bg-black">
                <HomeContent topPadding="pt-8" />
            </div>
            <SettingsPanel />
        </Layout>
    );
};
