/**
 * Los estilos de la web. Cada uno vive en su carpeta y se apunta aquí; el orden
 * es el del selector de Personalizar, y el primero es el de fábrica.
 *
 * Para añadir uno, ver `README.md`.
 */

import { clinica } from './clinica/theme'
import { espacio } from './espacio/theme'
import { historial } from './historial/theme'
import { libre } from './libre/theme'
import { terminal } from './terminal/theme'
import type { ThemeManifest } from './types'

export const THEMES: readonly ThemeManifest[] = [clinica, terminal, historial, espacio, libre]

export const DEFAULT_THEME: ThemeManifest = clinica

export const themeOf = (id: string | null | undefined): ThemeManifest =>
  THEMES.find((theme) => theme.id === id) ?? DEFAULT_THEME

export type { ThemeManifest, ThemePalette } from './types'
