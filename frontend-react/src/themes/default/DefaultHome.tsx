import Navbar from '../../components/Navbar';
import { HomeContent } from '../../components/HomeContent';
import { SettingsPanel } from '../../components/SettingsPanel';

export const DefaultHome = () => {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
            <Navbar />
            <div className="pt-16">
                <HomeContent topPadding="pt-8 md:pt-12" />
            </div>
            <SettingsPanel />
        </div>
    );
};
