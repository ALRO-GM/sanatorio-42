import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
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
