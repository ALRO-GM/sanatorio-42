import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const TS = ['**/*.ts', '**/*.tsx']

/**
 * Las reglas con tipos solo se aplican a TypeScript: un `.js` que no está en
 * ningún tsconfig no tiene tipos, y ESLint abortaría al encontrarlo.
 */
const onlyTs = (configs) => configs.map((config) => ({ ...config, files: TS }))

/**
 * Una sola configuración para todo el repositorio.
 *
 * 1. Con tipos: los errores de tipos se ven en el lint, no al compilar.
 * 2. Sin `any` implícito.
 * 3. Sin promesas sin `await`: un `await` olvidado es un bug silencioso.
 */
export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/data/**', '.claude/**'],
  },
  js.configs.recommended,
  ...onlyTs(tseslint.configs.strictTypeChecked),
  ...onlyTs(tseslint.configs.stylisticTypeChecked),
  {
    files: TS,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Interpolar un número en un mensaje es normal; lo que no se quiere es
      // interpolar objetos o arrays por accidente.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Fronteras entre capas de la API: `core` e `integrations` no conocen los
    // módulos, y nadie importa las tripas de otro módulo salvo por su `index`.
    files: ['apps/api/src/core/**/*.ts', 'apps/api/src/integrations/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/**', '**/app/**'],
              message: '`core` e `integrations` no pueden depender de los módulos ni de la app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**'],
              message: 'Un módulo no puede depender de la composición de la app.',
            },
            {
              regex: '^\\.\\./[a-z-]+/(?!index\\.js$).+',
              message: 'De otro módulo solo se importa su `index.js`.',
            },
          ],
        },
      ],
    },
  },
  {
    // La composición también: de cada módulo, solo lo que publica su `index.js`.
    files: ['apps/api/src/app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./modules/[a-z-]+/(?!index\\.js$).+',
              message: 'De un módulo solo se importa su `index.js`.',
            },
          ],
        },
      ],
    },
  },
  {
    /**
     * Relajas solo para los tests de la API, y por razones concretas:
     * - `require-await`: un doble de `sleep` devuelve una promesa sin esperar nada.
     * - `no-floating-promises`: se disparan llamadas en paralelo a propósito,
     *   para probar la serialización del limitador.
     */
    files: ['apps/api/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
)
