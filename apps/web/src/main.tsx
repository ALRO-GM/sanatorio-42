import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { I18nProvider, initialLang, loadLang } from './shared/i18n'
import { watchErrors } from './shared/errors'
import { watchStill } from './shared/still'
import './styles/index.css'
// Después de las hojas de la web: cada estilo manda sobre ellas. Con cada uno
// vienen sus letras; el navegador solo baja las del que se esté usando.
import './themes'

const root = document.getElementById('root')

if (root === null) {
  throw new Error('Falta el elemento #root en index.html')
}

// Los textos del idioma de la persona, antes de pintar: así no ve un instante
// la web en español. Si no llegan, se pinta en español igualmente.
await loadLang(initialLang()).catch(() => undefined)

// Un fallo que no recoge ninguna sección también deja rastro en el servidor.
watchErrors()

// Sin nadie mirando, las animaciones se paran (y no calientan el equipo).
watchStill()

// Lo que se va usando de la web se queda en el PC (`public/sw.js`): la próxima
// vez se abre sin bajarlo. Solo en la web compilada, no con `npm run dev`.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .catch(() => undefined)
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
