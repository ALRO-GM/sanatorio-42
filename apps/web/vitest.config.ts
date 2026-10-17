import { defineConfig } from 'vitest/config'

import { textosPlugin } from './tools/textos.ts'

/**
 * Tests de la web. Las funciones sueltas corren en Node; las pantallas
 * (`tests/ui`), en un navegador de mentira (jsdom) y contra la API de mentira,
 * como la demostración pública.
 *
 * Va aparte de `vite.config.ts` porque Vitest trae su propia versión de Vite y
 * sus tipos no casan con los del Vite de la web. Para los tests basta esbuild:
 * entiende el JSX sin el plugin de React.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [textosPlugin()],
  test: {
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    setupFiles: ['tests/ui/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      // Mínimos que la CI exige (`npm run test:coverage`). Solo suben, nunca
      // bajan: cada pantalla con su test los empuja hacia arriba.
      thresholds: { lines: 50, statements: 50, functions: 40, branches: 75 },
    },
  },
})
