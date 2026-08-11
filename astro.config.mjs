// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  image: {
    domains: ['static.wixstatic.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com',
      },
    ],
  },
  integrations: [react()],
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  site: 'https://literatureclub.in',
  trailingSlash: 'never',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  vite: {
    css: {
      preprocessorOptions: {},
    },
  },
});

