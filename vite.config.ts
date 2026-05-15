import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tsconfigPaths(),
      {
        name: 'tonconnect-manifest',
        generateBundle() {
          if (!env.VITE_APP_DOMAIN) {
            throw new Error('VITE_APP_DOMAIN is required for production builds. Set it in .env.production.local');
          }
          const domain = env.VITE_APP_DOMAIN.replace(/\/$/, '');
          const base   = (env.VITE_BASE_URL ?? '/single-nominator-client').replace(/\/$/, '');
          this.emitFile({
            type: 'asset',
            fileName: 'tonconnect-manifest.json',
            source: JSON.stringify({
              url: `${domain}${base}`,
              name: 'TON single-nominator',
              iconUrl: `${domain}${base}/logo.png`,
            }, null, 2) + '\n',
          });
        },
      },
    ],
    assetsInclude: ["**/*.fif", "**/*.sh"],
    base: env.VITE_BASE_URL ?? '/single-nominator-client',
    server: {
      port: 3000,
    },
    esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  };
})
