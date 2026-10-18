import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig, loadEnv } from 'vite'

import { textosPlugin } from './tools/textos.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), textosPlugin()],
    // Los paquetes del monorepo con código (gitsim) se usan desde su fuente.
    resolve: { conditions: ['source', ...defaultClientConditions] },
    build: {
      // Nada incrustado como `data:`. Vite mete así los ficheros pequeños, y
      // entre ellos caían trozos de tipografías: la política de contenido
      // (`font-src 'self'`) los bloqueaba y esas letras salían con otra fuente.
      // Mejor un fichero más que abrir la política.
      assetsInlineLimit: 0,
    },
    // La demostración pública (`npm run build:demo`) es la web con la API de
    // mentira. Sus ajustes van aquí y no en un `.env.demo`: los `.env.*` no
    // entran ni en git ni en la imagen de Docker, y sin ellos la demo se
    // compilaría contra la API de verdad.
    define:
      mode === 'demo'
        ? {
            'import.meta.env.VITE_USE_MOCK': JSON.stringify('true'),
            'import.meta.env.VITE_MOCK_LOGGED_IN': JSON.stringify('true'),
            'import.meta.env.VITE_DEMO': JSON.stringify('true'),
          }
        : {},
    server: {
      port: 5173,
      // En desarrollo la web llama a `/api` igual que en producción, y Vite lo
      // reenvía a la API local. Así no hay que cambiar URLs entre entornos ni
      // depender de CORS.
      proxy: {
        '/api': env.API_PROXY_TARGET ?? 'http://localhost:3000',
      },
    },
  }
})
