import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('./public/export', import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/features/editor/export/runtime.tsx', import.meta.url)),
      name: 'JjapgmaPage',
      formats: ['iife'],
      fileName: () => 'runtime.js',
      cssFileName: 'styles',
    },
  },
});
