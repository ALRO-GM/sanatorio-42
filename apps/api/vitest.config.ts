import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Los paquetes del monorepo con código (gitsim) se usan desde su fuente.
  resolve: { conditions: ['source'] },
  test: {
    /**
     * `tests/unit`        → una pieza cada vez, con la base en memoria.
     * `tests/integration` → la app entera con la API de 42 simulada.
     */
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    pool: 'forks',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/cli/**'],
      // Mínimos que la CI exige (`npm run test:coverage`). Solo suben: si un
      // cambio los baja, faltan tests de lo nuevo. Referencia: Google da el
      // 75 % por encomiable y el 90 % por ejemplar (docs/tests.md).
      thresholds: { lines: 96, statements: 96, functions: 96, branches: 89 },
    },
  },
})
