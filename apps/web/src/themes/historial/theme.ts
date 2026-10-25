import '@fontsource-variable/caveat'
import '@fontsource-variable/source-serif-4'
import '@fontsource/special-elite'

import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Cuaderno (la carpeta sigue llamándose `historial`, su nombre de antes): el
 * cuaderno de toda la vida. Títulos escritos a pluma, texto de libro, rótulos
 * a máquina de escribir, papel con su grano y notas sujetas con celo.
 */
export const historial: ThemeManifest = {
  id: 'historial',
  name: { es: 'Cuaderno', en: 'Notebook', ca: 'Quadern', eu: 'Koadernoa', fr: 'Cahier' },
  hint: {
    es: 'Cálido: papel, tinta y notas a mano',
    en: 'Warm: paper, ink and handwritten notes',
    ca: 'Càlid: paper, tinta i notes a mà',
    eu: 'Epela: papera, tinta eta eskuzko oharrak',
    fr: 'Chaleureux : papier, encre et notes à la main',
  },
  preview: {
    bg: '#eadfc8',
    surface: '#fbf5e6',
    text: '#33291c',
    accent: '#2a4a8f',
    font: "'Caveat Variable', cursive",
    radius: '255px 15px 225px 15px / 15px 225px 15px 255px',
  },
}
