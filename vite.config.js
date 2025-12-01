import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    warmup: {
      clientFiles: ['./client/main.jsx', './client/App.jsx'],
    },
    proxy: {
      '/v1': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-redux',
      '@reduxjs/toolkit',
      'firebase/app',
      'firebase/auth',
    ],
    force: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['react-redux', '@reduxjs/toolkit'],
          'firebase-vendor': ['firebase/app', 'firebase/auth'],
        },
      },
    },
  },
});
