/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-tertiary': 'var(--bg-tertiary)',
                'bg-elevated': 'var(--bg-elevated)',
                'bg-overlay': 'var(--bg-overlay)',
                'bg-badge': 'var(--bg-badge)',
                'bg-badge-hover': 'var(--bg-badge-hover)',
                'bg-3': 'var(--bg-3)',
                'bg-4': 'var(--bg-4)',
                'bg-5': 'var(--bg-5)',
                'footer-bg': 'var(--footer-bg)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-muted': 'var(--text-muted)',
                'text-dim': 'var(--text-dim)',
                'text-on-image': 'var(--text-on-image)',
                'text-on-image-dim': 'var(--text-on-image-dim)',
                'border-primary': 'var(--border-primary)',
                'border-subtle': 'var(--border-subtle)',
                'accent': 'var(--accent)',
                'accent-hover': 'var(--accent-hover)',
                'accent-bg': 'var(--accent-bg)',
                'accent-bg-hover': 'var(--accent-bg-hover)',
                'accent-contrast': 'var(--accent-contrast)',
            },
        },
    },
    plugins: [],
}
