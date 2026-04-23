import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		preserveSymlinks: true
	},
  optimizeDeps: {
    // Force Vite to re-bundle the dependency without the node-specific check
    exclude: ['@comunica/query-sparql']
  }
});
