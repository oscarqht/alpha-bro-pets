import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind the preview's exact hostname: wildcard binds can share a port with
    // another task on macOS, making localhost resolve to the wrong application.
    host: 'localhost',
    port: 3000,
    allowedHosts: true,
  },
});
