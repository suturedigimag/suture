// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  site: 'https://literatureclub.in',
  trailingSlash: 'never',
  vite: {
    css: {
      preprocessorOptions: {},
    },
  },
});

