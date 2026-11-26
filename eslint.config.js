import js from '@eslint/js';
import globals from 'globals';

/** Configuración de ESLint (revisa errores y malas prácticas en el código). */
export default [
  {
    ignores: ['node_modules/', 'coverage/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // CLAUDE.md: nada de console.log en el código.
      'no-console': 'error',
    },
  },
  {
    // La pantalla (carpeta public/) corre en el navegador.
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
];
