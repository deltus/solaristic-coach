// ESLint rules for the app (loaded through ../../eslint.config.js). Lives here so its packages,
// including the TypeScript 6 that typescript-eslint needs, come from tools/lint/node_modules.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'dev-dist/', 'android/', 'release/', 'node_modules/', 'tools/lint/node_modules/', 'public/', 'docs/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Unused names are already errors in tsconfig (noUnusedLocals); allow _-prefixed ones on purpose.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // The code uses `!` where a value is known to exist (e.g. after a has() check).
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  },
  // Tests call useDatabase(), which is not a hook despite its name.
  { files: ['tests/**/*.ts'], rules: { 'react-hooks/rules-of-hooks': 'off' } },
  { files: ['scripts/**/*.{js,mjs}', 'tools/**/*.js'], languageOptions: { globals: globals.node } },
  prettier
);
