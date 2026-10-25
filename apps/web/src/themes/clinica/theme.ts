import '@fontsource-variable/figtree'
import '@fontsource-variable/jetbrains-mono'

import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Clean code (la carpeta sigue llamándose `clinica`, su nombre de antes):
 * turquesa, mucho blanco y superficies con relieve: luz por arriba, sombra
 * suave por abajo y botones con brillo.
 */
export const clinica: ThemeManifest = {
  id: 'clinica',
  name: {
    es: 'Clean code',
    en: 'Clean code',
    ca: 'Clean code',
    eu: 'Clean code',
    fr: 'Clean code',
  },
  hint: {
    es: 'Luminoso, con relieve y turquesa',
    en: 'Bright, with depth and turquoise',
    ca: 'Lluminós, amb relleu i turquesa',
    eu: 'Argitsua, erliebearekin eta turkesa',
    fr: 'Lumineux, avec du relief et du turquoise',
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
