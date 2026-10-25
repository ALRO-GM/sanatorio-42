import type { ReactNode } from 'react'

import type { Lang } from '@sanatorio/contracts'

/**
 * Lo que es un estilo: una carpeta de `themes/` con este manifiesto, su hoja de
 * estilos y sus recursos (letras, texturas, imágenes). Ver `themes/README.md`.
 */
export type ThemeManifest = {
  /** Va en `data-style` de `<html>` y es el nombre de la carpeta. Minúsculas y guiones. */
  id: string
  /**
   * Si es un estilo hecho para alguien, sus logins: solo esas personas lo ven en
   * el selector. Sin él, es de todo el mundo. Ver `ids.ts`.
   */
  owners?: readonly string[]
  /** Cómo se llama y qué se dice de él en el selector. Lo que falte sale en español. */
  name: Partial<Record<Lang, string>> & { es: string }
  hint: Partial<Record<Lang, string>> & { es: string }
  /** La muestra del selector: tiene que parecerse al estilo sin estar puesto. */
  preview: {
    bg: string
    surface: string
    text: string
    accent: string
    /** `font-family` del título de la muestra. */
    font: string
    radius: string
  }
  /**
   * Paletas entre las que elegir, si el estilo deja cambiar de color. Cada una
   * da valor a variables de CSS que usa su hoja de estilos. La primera es la de
   * fábrica.
   */
  palettes?: readonly ThemePalette[]
  /**
   * Iconos que este estilo dibuja a su manera, por nombre (`shared/ui/Icon`).
   * Los que no estén aquí son los de siempre.
   */
  icons?: Readonly<Record<string, ReactNode>>
  /** Imágenes del estilo por nombre, para lo que no se pueda poner desde el CSS. */
  images?: Readonly<Record<string, string>>
}

export type ThemePalette = {
  id: string
  name: Partial<Record<Lang, string>> & { es: string }
  /** El color de la muestra en el selector. */
  swatch: string
  /** Variables de CSS que pone en `<html>`: `{ '--hue': '250' }`. */
  vars: Readonly<Record<string, string>>
}
