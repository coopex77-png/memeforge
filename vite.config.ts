import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Custom plugin to exclude api/ directory from Vite processing
// Vercel serverless functions live in api/ and should NOT be bundled by Vite
function excludeApiPlugin(): Plugin {
  return {
    name: 'exclude-api',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.includes('/api/') || source.startsWith('api/')) {
        return { id: source, external: true };
      }
      return null;
    },
    load(id) {
      if (id.includes('/api/')) {
        return '';
      }
      return null;
    },
    transform(code, id) {
      if (id.includes('/api/')) {
        return { code: '', map: null };
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/api/**'],
      },
    },
    plugins: [excludeApiPlugin(), react()],
    define: {
      'process.env.GEMINI_API_KEY_1': JSON.stringify(env.GEMINI_API_KEY_1),
      'process.env.GEMINI_API_KEY_2': JSON.stringify(env.GEMINI_API_KEY_2),
      'process.env.GEMINI_API_KEY_3': JSON.stringify(env.GEMINI_API_KEY_3),
      'process.env.GEMINI_API_KEY_4': JSON.stringify(env.GEMINI_API_KEY_4)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        external: [/^\/api\//],
      }
    },
  };
});
