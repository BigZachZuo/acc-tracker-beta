import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' means load ALL env vars, regardless of prefix (e.g. API_KEY and VITE_API_KEY).
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Robustly try to find the API key from various possible environment variables
  const apiKey = env.VITE_API_KEY || env.API_KEY || env.GEMINI_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

  return {
    plugins: [react()],
    // Define global constants replacement
    define: {
      // Polyfill both common naming conventions
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});