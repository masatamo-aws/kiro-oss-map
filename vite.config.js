import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  
  server: {
    port: 3003,
    host: '0.0.0.0',
    strictPort: true
  },
  
  build: {
    outDir: '../dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: resolve(__dirname, 'src/index.html')
    }
  },
  
  optimizeDeps: {
    include: [],
    exclude: []
  }
});
