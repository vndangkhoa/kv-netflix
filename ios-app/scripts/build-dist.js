#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'simulator-web');
const distDir = path.join(rootDir, 'www');

console.log('[Build] Preparing native iOS web assets in www/ ...');

// Ensure www exists and is clean
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy app.html as index.html
const appHtmlPath = path.join(srcDir, 'app.html');
const indexHtmlPath = path.join(distDir, 'index.html');
fs.copyFileSync(appHtmlPath, indexHtmlPath);
console.log('✓ Copied simulator-web/app.html -> www/index.html');

// Recursive directory copy helper
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy vendor directory
copyDirRecursive(path.join(srcDir, 'vendor'), path.join(distDir, 'vendor'));
console.log('✓ Copied simulator-web/vendor -> www/vendor');

console.log('✓ Build complete! Native iOS web assets ready in www/');
