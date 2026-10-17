import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { I18nProvider, initialLang, loadLang } from './shared/i18n'
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

// Sin nadie mirando, las animaciones se paran (y no calientan el equipo).
watchStill()

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
