import { defineConfig } from 'vitest/config'

export default defineConfig({
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
    },
  },
})
