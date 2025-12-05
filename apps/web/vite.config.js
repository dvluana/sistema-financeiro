import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        hmr: {
            // Evita full page reload quando possível
            overlay: true,
        },
    },
    // Otimiza as dependências para evitar re-bundling
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'zustand',
            'framer-motion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-switch',
            '@radix-ui/react-select',
        ],
    },
});
