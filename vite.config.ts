import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		preserveSymlinks: true
	},
	server: {
		fs: {
			allow: [fileURLToPath(new URL('./comunica', import.meta.url))]
		}
	},
  optimizeDeps: {
    // Force Vite to re-bundle the dependency without the node-specific check
    exclude: ['@comunica/query-sparql']
  }
});
