import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { registerWebOSBackHandler } from '../hooks/useWebOS';

interface ModalProps {
    children: ReactNode;
    onClose: () => void;
}

export function Modal({ children, onClose }: ModalProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        const unregister = registerWebOSBackHandler(() => {
            onClose();
            return true;
        });
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            unregister();
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Content */}
            <div className="relative w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl p-6 transition-all duration-200 scale-100 opacity-100">
                <button
                    onClick={onClose}
                    tabIndex={0}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-dim)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-accent transition-colors"
                >
                    <X size={16} />
                </button>
                {children}
            </div>
        </div>
    );
}
