import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      watch: {
        ignored: ['**/node_modules/**'],
      },
      proxy: {
        '/api/jira': {
          target: 'https://sedna-tech.atlassian.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/jira/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              // Add Basic Auth header for Jira API
              const email = env.VITE_JIRA_USER_EMAIL;
              const apiToken = env.VITE_JIRA_API_KEY;

              if (email && apiToken) {
                const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
                proxyReq.setHeader('Authorization', `Basic ${auth}`);
                console.log('[Jira Proxy] Auth header added for:', email);
              } else {
                console.error('[Jira Proxy] Missing credentials:', {
                  hasEmail: !!email,
                  hasToken: !!apiToken,
                });
              }

              // Add required Jira API headers to bypass XSRF check
              proxyReq.setHeader('X-Atlassian-Token', 'no-check');
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Accept', 'application/json');
            });
            proxy.on('proxyRes', (proxyRes, _req, _res) => {
              // Log proxy responses for debugging
              console.log(`[Jira Proxy] ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
            });
            proxy.on('error', (err, _req, _res) => {
              console.error('[Jira Proxy] Error:', err);
            });
          },
        },
      },
    },
  };
});
