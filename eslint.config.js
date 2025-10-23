import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist', 'legacy/**/*'] }, // legacy is read-only reference
  {
    // Config files (Node.js environment)
    files: ['*.config.{js,ts}', 'eslint.config.js', 'scripts/**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: { project: false },
    },
    plugins: { '@typescript-eslint': tseslint.plugin, 'import': pluginImport },
    rules: {
      ...js.configs.recommended.rules,
      'import/order': ['warn', { 'newlines-between': 'always', 'alphabetize': { order: 'asc' } }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Application files (Browser environment)
    files: ['src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: { project: false, ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, 'import': pluginImport, '@typescript-eslint': tseslint.plugin },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommendedTypeChecked[0].rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'import/order': ['warn', { 'newlines-between': 'always', 'alphabetize': { order: 'asc' } }],
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
];
