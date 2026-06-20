import Navbar from '../../components/Navbar';
import { HomeContent } from '../../components/HomeContent';
import { useSync } from '../../hooks/useSync';

export const DefaultHome = () => {
    useSync();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-red-600 selection:text-white transition-colors duration-300">
            <Navbar />
            <main className="pt-14">
                <HomeContent />
            </main>
        </div>
    );
};
