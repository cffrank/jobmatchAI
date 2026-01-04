import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'coverage/**',
      'dist/**',
      '.wrangler/**',
      'node_modules/**',
      'e2e-tests/node_modules/**',
      '*.log',
      '*.tsbuildinfo',
    ],
  },
];
