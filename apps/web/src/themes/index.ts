/**
 * Los estilos de la web. Cada uno vive en su carpeta y se apunta aquí; el orden
 * es el del selector de Personalizar, y el primero es el de fábrica.
 *
 * Para añadir uno, ver `README.md`.
 */

import { bichota } from './bichota/theme'
import { clinica } from './clinica/theme'
import { espacio } from './espacio/theme'
import { historial } from './historial/theme'
import { libre } from './libre/theme'
import { peer4u } from './peer4u/theme'
import { terminal } from './terminal/theme'
import { canUseStyle } from './ids'
import type { ThemeManifest } from './types'

const THEMES: readonly ThemeManifest[] = [
  peer4u,
  clinica,
  terminal,
  historial,
  espacio,
  libre,
  bichota,
]

export const DEFAULT_THEME: ThemeManifest = peer4u

export const themeOf = (id: string | null | undefined): ThemeManifest =>
  THEMES.find((theme) => theme.id === id) ?? DEFAULT_THEME

/** Los estilos que puede elegir esa persona: los de todo el mundo y los suyos. */
export const themesFor = (login: string): ThemeManifest[] =>
  THEMES.filter((theme) => canUseStyle(theme.id, login))

export { canUseStyle } from './ids'
export type { ThemeManifest, ThemePalette } from './types'
