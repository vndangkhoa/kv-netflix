import { useState } from 'react';
import { Settings, X, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { ThemeName } from '../types/Theme';

export const SettingsPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { currentTheme, setTheme } = useTheme();

    const themes: { id: ThemeName; name: string; color: string }[] = [
        { id: 'default', name: 'StreamFlow', color: '#06b6d4' },
        { id: 'netflix', name: 'Netflix', color: '#E50914' },
        { id: 'apple', name: 'Apple TV+', color: '#FFFFFF' },
    ];

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[9999] bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/10 transition-all text-white"
            >
                <Settings className="w-6 h-6 animate-spin-slow" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <h2 className="text-lg font-bold text-white">Appearance</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Choose Theme</h3>
                                <div className="space-y-2">
                                    {themes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setTheme(theme.id)}
                                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${currentTheme === theme.id
                                                ? 'bg-white/10 border-white/20'
                                                : 'bg-transparent border-white/5 hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg shadow-inner flex items-center justify-center font-bold text-white text-xs"
                                                    style={{ backgroundColor: theme.id === 'netflix' ? '#000' : '#111' }}
                                                >
                                                    <span style={{ color: theme.color }}>
                                                        {theme.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-white">{theme.name}</span>
                                            </div>
                                            {currentTheme === theme.id && (
                                                <div className="bg-green-500 rounded-full p-1">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <p className="text-xs text-blue-200 text-center">
                                    Switching themes completely changes the layout and browsing experience.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
