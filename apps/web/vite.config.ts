import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
  // Code splitting para melhor cache e carregamento
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendors React - raramente muda
          'vendor-react': ['react', 'react-dom'],
          // UI e animações
          'vendor-ui': [
            'framer-motion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-switch',
            '@radix-ui/react-select',
            'vaul',
          ],
          // Utilitários
          'vendor-utils': [
            'zustand',
            'date-fns',
            'clsx',
            'tailwind-merge',
          ],
        },
      },
    },
    // Gera source maps para debugging em produção
    sourcemap: false,
    // Limita tamanho de warnings de chunk
    chunkSizeWarningLimit: 500,
  },
})
