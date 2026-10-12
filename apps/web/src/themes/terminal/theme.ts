import '@fontsource-variable/jetbrains-mono'

import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Terminal: la otra mitad de Sanatorio 42, el código. Todo en letra de máquina,
 * sin una curva ni una sombra, con los colores de una consola: verde fósforo
 * para lo que manda y los de siempre para avisos y errores.
 */
export const terminal: ThemeManifest = {
  id: 'terminal',
  name: { es: 'Terminal', en: 'Terminal', ca: 'Terminal', eu: 'Terminala' },
  hint: {
    es: 'Crudo: consola, monoespaciada y líneas rectas',
    en: 'Raw: console, monospace and straight lines',
    ca: 'Cru: consola, monoespaiada i línies rectes',
    eu: 'Gordina: kontsola, tarte bakarrekoa eta lerro zuzenak',
  },
  preview: {
    bg: '#050805',
    surface: '#0b120c',
    text: '#d7e4d9',
    accent: '#4af626',
    font: "'JetBrains Mono Variable', monospace",
    radius: '0',
  },
}
