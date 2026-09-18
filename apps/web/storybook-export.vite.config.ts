import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { esmExternalRequirePlugin } from 'rolldown/plugins';

export default defineConfig({
  plugins: [
    react(),
    esmExternalRequirePlugin({ external: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/] }),
  ],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('./public/export/storybook', import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(
        new URL('./src/features/editor/export/StorybookScreen.tsx', import.meta.url),
      ),
      formats: ['es'],
      fileName: () => 'renderer.js',
      cssFileName: 'styles',
    },
    rolldownOptions: {
      output: { codeSplitting: false },
    },
  },
});
