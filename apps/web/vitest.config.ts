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
  // Los paquetes del monorepo con código (gitsim) se usan desde su fuente.
  resolve: { conditions: ['source'] },
  test: {
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    setupFiles: ['tests/ui/setup.ts'],
    // En la CI la máquina es más lenta y algún test de pantalla se pasa de
    // tiempo de vez en cuando (y entonces no se despliega). Allí se repite
    // hasta dos veces; en local, no, para que un fallo de verdad se vea.
    retry: process.env.CI === undefined ? 0 : 2,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      // Mínimos que la CI exige (`npm run test:coverage`). Solo suben, nunca
      // bajan: cada pantalla con su test los empuja hacia arriba.
      thresholds: { lines: 64, statements: 64, functions: 51, branches: 79 },
    },
  },
})
