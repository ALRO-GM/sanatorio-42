import '@fontsource-variable/figtree'
import '@fontsource-variable/jetbrains-mono'

import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Clínica: la sala de un hospital nuevo. Turquesa, mucho blanco y superficies
 * con relieve: luz por arriba, sombra suave por abajo y botones con brillo.
 */
export const clinica: ThemeManifest = {
  id: 'clinica',
  name: { es: 'Clínica', en: 'Clinic', ca: 'Clínica', eu: 'Klinika' },
  hint: {
    es: 'Luminoso, con relieve y turquesa',
    en: 'Bright, with depth and turquoise',
    ca: 'Lluminós, amb relleu i turquesa',
    eu: 'Argitsua, erliebearekin eta turkesa',
  },
  preview: {
    bg: 'linear-gradient(135deg, #dff5f1, #eef3fb)',
    surface: '#ffffff',
    text: '#12302c',
    accent: 'linear-gradient(135deg, #1ccfc9, #0a8fb0)',
    font: "'Figtree Variable', sans-serif",
    radius: '0.8rem',
  },
}
