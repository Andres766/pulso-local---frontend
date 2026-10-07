import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo el frontend y la API comparten origen gracias al proxy:
// la cookie de sesión SameSite=Strict funciona sin configuraciones extra.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: { sourcemap: false },
});
