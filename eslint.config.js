// eslint.config.js
import globals from 'globals';
import js from '@eslint/js';

export default [
  // Apply ESLint's recommended default rules
  js.configs.recommended,

  {
    // Global settings for all JavaScript files
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node // Enable Node.js global variables
      }
    },
    rules: {
      // Enforce consistent semicolon usage
      'semi': ['error', 'always'],
      // Enforce single quotes for strings
      'quotes': ['error', 'single']
    }
  },

  // Ignore the dist directory
  {
    ignores: ['dist/**']
  }
];
