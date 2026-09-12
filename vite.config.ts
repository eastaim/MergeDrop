import { defineConfig } from 'vite';

// `base` must match the GitHub Pages project-site subpath (/<repo>/), otherwise
// every built asset 404s on the deployed site.
export default defineConfig({
  base: '/MergeDrop/',
  build: {
    target: 'es2022',
  },
});
