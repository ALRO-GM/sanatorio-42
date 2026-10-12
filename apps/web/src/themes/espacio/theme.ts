import '@fontsource-variable/exo-2'
import '@fontsource-variable/orbitron'

import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Espacial: el puente de mando de una nave. Fondo de espacio profundo con
 * nebulosas, una galaxia y un planeta con anillos; paneles de cristal con el
 * borde encendido, rótulos de consola y neón violeta y cian.
 */
export const espacio: ThemeManifest = {
  id: 'espacio',
  name: { es: 'Espacial', en: 'Space', ca: 'Espacial', eu: 'Espaziala' },
  hint: {
    es: 'Ciencia ficción: nebulosas, planetas y neón',
    en: 'Sci-fi: nebulae, planets and neon',
    ca: 'Ciència-ficció: nebuloses, planetes i neó',
    eu: 'Zientzia-fikzioa: nebulosak, planetak eta neoia',
  },
  preview: {
    bg: 'radial-gradient(circle at 80% 10%, #6a3fd0, #0a0b24 70%)',
    surface: '#161a3d',
    text: '#e9ecff',
    accent: 'linear-gradient(135deg, #b388ff, #5ef0ff)',
    font: "'Orbitron Variable', sans-serif",
    radius: '0.35rem',
  },
}
