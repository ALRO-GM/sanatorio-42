import '@fontsource-variable/figtree'
import '@fontsource-variable/space-grotesk'

import type { ThemeManifest } from '../types'
import './theme.css'

const palette = (
  id: string,
  es: string,
  en: string,
  fr: string,
  hue: number,
  chroma: number,
): NonNullable<ThemeManifest['palettes']>[number] => ({
  id,
  name: { es, en, fr },
  swatch: `oklch(0.62 ${chroma} ${hue})`,
  vars: { '--hue': String(hue), '--chroma': String(chroma) },
})

/**
 * A tu color: un estilo sobrio que no tiene color propio. Se elige una paleta y
 * todo (fondos, bordes, acento, sombras) sale de ese tono.
 */
export const libre: ThemeManifest = {
  id: 'libre',
  name: {
    es: 'A tu color',
    en: 'Your colour',
    ca: 'Al teu color',
    eu: 'Zure kolorean',
    fr: 'À ta couleur',
  },
  hint: {
    es: 'Sobrio, con la paleta que elijas',
    en: 'Plain, in the palette you choose',
    ca: 'Sobri, amb la paleta que triïs',
    eu: 'Soila, zuk aukeratutako paletarekin',
    fr: 'Sobre, avec la palette de ton choix',
  },
  preview: {
    bg: '#f3f4f8',
    surface: '#ffffff',
    text: '#1c2030',
    accent: 'conic-gradient(#3b82f6, #a855f7, #ec4899, #f59e0b, #22c55e, #06b6d4, #3b82f6)',
    font: "'Space Grotesk Variable', sans-serif",
    radius: '0.5rem',
  },
  palettes: [
    palette('oceano', 'Océano', 'Ocean', 'Océan', 250, 0.15),
    palette('turquesa', 'Turquesa', 'Turquoise', 'Turquoise', 195, 0.11),
    palette('bosque', 'Bosque', 'Forest', 'Forêt', 150, 0.13),
    palette('ambar', 'Ámbar', 'Amber', 'Ambre', 75, 0.14),
    palette('coral', 'Coral', 'Coral', 'Corail', 30, 0.16),
    palette('rosa', 'Rosa', 'Pink', 'Rose', 350, 0.17),
    palette('violeta', 'Violeta', 'Violet', 'Violet', 295, 0.17),
    palette('grafito', 'Grafito', 'Graphite', 'Graphite', 250, 0.01),
  ],
}
