import { Layout } from './Layout';
import { HomeContent } from '../../components/HomeContent';
import { SettingsPanel } from '../../components/SettingsPanel';

export const AppleHome = () => {
    return (
        <Layout>
            {/* Apple Theme usually has a dark gradient header, but HomeContent handles general layout */}
            <div className="min-h-screen bg-black">
                <HomeContent topPadding="pt-24" />
            </div>
            <SettingsPanel />
        </Layout>
    );
};
