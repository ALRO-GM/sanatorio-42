import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'

import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Peer4U: el estilo de fábrica desde el 2026-10-29. Sobrio, como una web de
 * producto internacional: letra Inter, grises neutros, un solo acento
 * turquesa, bordes finos en vez de sombras y cifras alineadas. El ejemplo que
 * se aprobó: https://claude.ai/artifact/WuVSadwa7zy7e2AiuijDkP
 */
export const peer4u: ThemeManifest = {
  id: 'peer4u',
  name: {
    es: 'Peer4U',
    en: 'Peer4U',
    ca: 'Peer4U',
    eu: 'Peer4U',
    fr: 'Peer4U',
  },
  hint: {
    es: 'Sobrio y claro, con un solo color de acento',
    en: 'Clean and calm, with a single accent colour',
    ca: 'Sobri i clar, amb un sol color d’accent',
    eu: 'Soila eta argia, azentu-kolore bakarrarekin',
    fr: 'Sobre et clair, avec une seule couleur d’accent',
  },
  preview: {
    bg: '#fafafa',
    surface: '#ffffff',
    text: '#18181b',
    accent: '#0f766e',
    font: "'Inter Variable', sans-serif",
    radius: '0.75rem',
  },
}
