import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { I18nProvider } from './shared/i18n'
import './styles/index.css'
// Después de las hojas de la web: cada estilo manda sobre ellas. Con cada uno
// vienen sus letras; el navegador solo baja las del que se esté usando.
import './themes'

const root = document.getElementById('root')

if (root === null) {
  throw new Error('Falta el elemento #root en index.html')
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
