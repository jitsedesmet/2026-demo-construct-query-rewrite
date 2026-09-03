import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default ts.config(
  includeIgnoreFile(gitignorePath),
  {
    // Everything under src/lib/mapping except its index.ts files is vendored verbatim from
    // https://github.com/jitsedesmet/2025-query-rewriting-1-2, which lints under its own config.
    // Leaving those files untouched is what keeps re-syncing them a copy, so they are not linted here.
    // The two index.ts are ours - they name the pipeline and the subset we vendor - and are linted.
    ignores: [
      "src/lib/mapping/**",
      "!src/lib/mapping/index.ts",
      "!src/lib/mapping/transformations/index.ts"
    ]
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    languageOptions: {
	  globals: {
	    ...globals.browser,
	    ...globals.node
	  }
	}
  },
  {
    files: ["**/*.svelte"],

    languageOptions: {
	  parserOptions: {
	    parser: ts.parser
	  }
	}
  }
);
