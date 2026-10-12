import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { I18nProvider } from './shared/i18n'
// Las letras de los tres estilos, servidas desde aquí: el navegador solo baja
// las del estilo que se esté usando.
import '@fontsource-variable/figtree'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/source-sans-3'
import '@fontsource-variable/space-grotesk'
import './styles/index.css'

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
