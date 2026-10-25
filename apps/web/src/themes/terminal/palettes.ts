import type { ThemePalette } from '../types'

/**
 * Los temas de VS Code más instalados, para el estilo Terminal. Cada uno lleva
 * su versión de día y la de noche (la oficial o la de su familia: One Light,
 * Alucard, Light Owl, Latte…); de cada una basta con doce colores y el resto
 * (los suaves, los de segundo plano, el escenario) sale de mezclarlos.
 */
type Colors = {
  bg: string
  surface: string
  surface2: string
  surface3: string
  border: string
  text: string
  /** El color de los comentarios: el texto de tercer plano. */
  comment: string
  accent: string
  green: string
  red: string
  yellow: string
  blue: string
  magenta: string
}

const channels = (hex: string): number[] =>
  [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))

/** `a` mezclado con `b`, `amount` de `a` (de 0 a 1). */
function mix(a: string, b: string, amount: number): string {
  const [x, y] = [channels(a), channels(b)]

  return `#${x
    .map((value, index) => Math.round(value * amount + (y[index] ?? 0) * (1 - amount)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function modeVars(prefix: 'tl' | 'td', c: Colors): Record<string, string> {
  const soft = (color: string): string => mix(color, c.bg, 0.18)

  return {
    [`--${prefix}-bg`]: c.bg,
    [`--${prefix}-surface`]: c.surface,
    [`--${prefix}-surface-2`]: c.surface2,
    [`--${prefix}-surface-3`]: c.surface3,
    [`--${prefix}-border`]: c.border,
    [`--${prefix}-border-strong`]: mix(c.text, c.border, 0.4),
    [`--${prefix}-fill-muted`]: mix(c.text, c.bg, 0.35),
    [`--${prefix}-text`]: c.text,
    [`--${prefix}-text-2`]: mix(c.text, c.comment, 0.6),
    [`--${prefix}-text-3`]: c.comment,
    [`--${prefix}-text-4`]: mix(c.comment, c.bg, 0.65),
    [`--${prefix}-accent`]: c.accent,
    [`--${prefix}-accent-hover`]: mix(c.accent, c.text, 0.75),
    [`--${prefix}-accent-soft`]: soft(c.accent),
    [`--${prefix}-accent-text`]: c.accent,
    [`--${prefix}-on-accent`]: prefix === 'td' ? c.bg : '#ffffff',
    [`--${prefix}-ok`]: c.green,
    [`--${prefix}-ok-soft`]: soft(c.green),
    [`--${prefix}-warn`]: c.yellow,
    [`--${prefix}-warn-soft`]: soft(c.yellow),
    [`--${prefix}-danger`]: c.red,
    [`--${prefix}-danger-soft`]: soft(c.red),
    [`--${prefix}-gold`]: c.yellow,
    [`--${prefix}-term-blue`]: c.blue,
    [`--${prefix}-term-magenta`]: c.magenta,
    [`--${prefix}-glow`]: `${c.accent}33`,
    [`--${prefix}-ring-from`]: c.green,
    [`--${prefix}-ring-to`]: c.magenta,
  }
}

/** El escenario de los grafos es siempre oscuro: va con los colores de noche. */
const stageVars = (c: Colors): Record<string, string> => ({
  '--td-stage': c.bg,
  '--td-stage-text': c.text,
  '--td-stage-muted': c.comment,
  '--td-stage-link': mix(c.comment, c.bg, 0.7),
  '--td-stage-halo': c.bg,
  '--td-stage-accent': c.accent,
})

function vscode(id: string, name: string, light: Colors, dark: Colors): ThemePalette {
  return {
    id,
    name: { es: name },
    swatch: `linear-gradient(135deg, ${dark.bg} 0 50%, ${dark.accent} 50% 100%)`,
    vars: { ...modeVars('tl', light), ...modeVars('td', dark), ...stageVars(dark) },
  }
}

const colors = (
  bg: string,
  surface: string,
  surface2: string,
  surface3: string,
  border: string,
  text: string,
  comment: string,
  accent: string,
  [green, red, yellow, blue, magenta]: readonly [string, string, string, string, string],
): Colors => ({
  bg,
  surface,
  surface2,
  surface3,
  border,
  text,
  comment,
  accent,
  green,
  red,
  yellow,
  blue,
  magenta,
})

export const TERMINAL_PALETTES: readonly ThemePalette[] = [
  // La de siempre: sin variables, los colores escritos en `theme.css`.
  {
    id: 'fosforo',
    name: { es: 'Fósforo', en: 'Phosphor', ca: 'Fòsfor', eu: 'Fosforoa', fr: 'Phosphore' },
    swatch: 'linear-gradient(135deg, #050805 0 50%, #4af626 50% 100%)',
    vars: {},
  },
  vscode(
    'dark-modern',
    'Dark Modern',
    colors('#f8f8f8', '#ffffff', '#f3f3f3', '#e5e5e5', '#cecece', '#3b3b3b', '#6e7681', '#005fb8', [
      '#388a34',
      '#cd3131',
      '#9a6a00',
      '#0451a5',
      '#af00db',
    ]),
    colors('#1f1f1f', '#181818', '#2b2b2b', '#313131', '#3c3c3c', '#cccccc', '#9d9d9d', '#4fc1ff', [
      '#89d185',
      '#f14c4c',
      '#cca700',
      '#569cd6',
      '#c586c0',
    ]),
  ),
  vscode(
    'one-dark-pro',
    'One Dark Pro',
    colors('#fafafa', '#ffffff', '#f0f0f0', '#e5e5e6', '#c8c8c9', '#383a42', '#696c77', '#4078f2', [
      '#50a14f',
      '#e45649',
      '#a87100',
      '#4078f2',
      '#a626a4',
    ]),
    colors('#282c34', '#21252b', '#2c313a', '#3e4451', '#3e4451', '#abb2bf', '#7f848e', '#61afef', [
      '#98c379',
      '#e06c75',
      '#e5c07b',
      '#61afef',
      '#c678dd',
    ]),
  ),
  vscode(
    'dracula',
    'Dracula',
    colors('#fffbeb', '#ffffff', '#f5efd9', '#ece5cc', '#cfcfde', '#1f1f1f', '#635d97', '#644ac9', [
      '#14710a',
      '#cb3a2a',
      '#846e15',
      '#036a96',
      '#a3144d',
    ]),
    colors('#282a36', '#21222c', '#343746', '#44475a', '#44475a', '#f8f8f2', '#7b88b8', '#bd93f9', [
      '#50fa7b',
      '#ff5555',
      '#f1fa8c',
      '#8be9fd',
      '#ff79c6',
    ]),
  ),
  vscode(
    'monokai',
    'Monokai',
    colors('#faf4f2', '#ffffff', '#ede7e5', '#e0dad9', '#c3b7b5', '#29242a', '#706b6e', '#218871', [
      '#218871',
      '#e14775',
      '#b16803',
      '#1c8ca8',
      '#7058be',
    ]),
    colors('#272822', '#1e1f1c', '#31332b', '#3e3d32', '#49483e', '#f8f8f2', '#88846f', '#a6e22e', [
      '#a6e22e',
      '#f92672',
      '#e6db74',
      '#66d9ef',
      '#ae81ff',
    ]),
  ),
  vscode(
    'github',
    'GitHub',
    colors('#f6f8fa', '#ffffff', '#eaeef2', '#d0d7de', '#d0d7de', '#1f2328', '#59636e', '#0969da', [
      '#1a7f37',
      '#cf222e',
      '#9a6700',
      '#0969da',
      '#8250df',
    ]),
    colors('#0d1117', '#161b22', '#21262d', '#30363d', '#30363d', '#e6edf3', '#8b949e', '#58a6ff', [
      '#3fb950',
      '#f85149',
      '#d29922',
      '#58a6ff',
      '#bc8cff',
    ]),
  ),
  vscode(
    'night-owl',
    'Night Owl',
    colors('#fbfbfb', '#ffffff', '#f0f0f0', '#e0e7ea', '#d9d9d9', '#403f53', '#6e7484', '#4876d6', [
      '#08916a',
      '#de3d3b',
      '#a0750a',
      '#4876d6',
      '#994cc3',
    ]),
    colors('#011627', '#01111d', '#0b2942', '#13344f', '#1d3b53', '#d6deeb', '#809191', '#82aaff', [
      '#addb67',
      '#ef5350',
      '#ecc48d',
      '#82aaff',
      '#c792ea',
    ]),
  ),
  vscode(
    'tokyo-night',
    'Tokyo Night',
    colors('#e1e2e7', '#e9e9ed', '#d5d6db', '#c4c8da', '#c4c8da', '#3760bf', '#6172b0', '#2e7de9', [
      '#587539',
      '#f52a65',
      '#8c6c3e',
      '#2e7de9',
      '#9854f1',
    ]),
    colors('#1a1b26', '#16161e', '#1f2335', '#292e42', '#292e42', '#c0caf5', '#737aa2', '#7aa2f7', [
      '#9ece6a',
      '#f7768e',
      '#e0af68',
      '#7aa2f7',
      '#bb9af7',
    ]),
  ),
  vscode(
    'catppuccin',
    'Catppuccin',
    colors('#e6e9ef', '#eff1f5', '#dce0e8', '#ccd0da', '#bcc0cc', '#4c4f69', '#6c6f85', '#8839ef', [
      '#40a02b',
      '#d20f39',
      '#df8e1d',
      '#1e66f5',
      '#ea76cb',
    ]),
    colors('#1e1e2e', '#181825', '#313244', '#45475a', '#45475a', '#cdd6f4', '#9399b2', '#cba6f7', [
      '#a6e3a1',
      '#f38ba8',
      '#f9e2af',
      '#89b4fa',
      '#f5c2e7',
    ]),
  ),
  vscode(
    'nord',
    'Nord',
    colors('#e5e9f0', '#eceff4', '#d8dee9', '#c9d0dc', '#b8c1d1', '#2e3440', '#4c566a', '#5e81ac', [
      '#4f7a3a',
      '#a5404a',
      '#9a6f1c',
      '#5e81ac',
      '#8f5f87',
    ]),
    colors('#2e3440', '#3b4252', '#434c5e', '#4c566a', '#4c566a', '#eceff4', '#9aa5bd', '#88c0d0', [
      '#a3be8c',
      '#bf616a',
      '#ebcb8b',
      '#81a1c1',
      '#b48ead',
    ]),
  ),
  vscode(
    'gruvbox',
    'Gruvbox',
    colors('#fbf1c7', '#f9f5d7', '#f2e5bc', '#ebdbb2', '#d5c4a1', '#3c3836', '#7c6f64', '#af3a03', [
      '#79740e',
      '#9d0006',
      '#b57614',
      '#076678',
      '#8f3f71',
    ]),
    colors('#282828', '#1d2021', '#32302f', '#3c3836', '#504945', '#ebdbb2', '#a89984', '#fabd2f', [
      '#b8bb26',
      '#fb4934',
      '#fabd2f',
      '#83a598',
      '#d3869b',
    ]),
  ),
  vscode(
    'solarized',
    'Solarized',
    colors('#eee8d5', '#fdf6e3', '#f5efdc', '#e4ddc8', '#d3cbb7', '#4f6168', '#6c7c7d', '#1f6fb0', [
      '#6c7c00',
      '#c42b28',
      '#946f00',
      '#1f6fb0',
      '#b62d70',
    ]),
    colors('#002b36', '#073642', '#0a3f4c', '#114b59', '#2a5562', '#93a1a1', '#7c9094', '#268bd2', [
      '#859900',
      '#dc322f',
      '#b58900',
      '#268bd2',
      '#d33682',
    ]),
  ),
]
