import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          cannon: ['cannon-es'],
        },
      },
    },
  },
});
