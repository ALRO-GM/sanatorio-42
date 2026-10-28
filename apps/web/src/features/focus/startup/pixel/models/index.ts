import { coins, building, flag, globe, rocket } from './milestones'
import type { Model } from './model'
import { beanbag, books, bookshelf, coffee, cooler, dashboard, printer, whiteboard } from './office'
import { cactus, monstera } from './plants'
import { rack } from './servers'
import { person, workstation } from './workplace'

/**
 * Todos los modelos por su nombre. Para añadir uno: su archivo en `models/`
 * (o en el que le toque) y una línea aquí; para que salga en la oficina, su
 * regla en `layout.ts`.
 */
export const MODELS = {
  workstation,
  person,
  rack,
  monstera,
  cactus,
  whiteboard,
  dashboard,
  coffee,
  cooler,
  beanbag,
  printer,
  books,
  bookshelf,
  coins,
  globe,
  rocket,
  flag,
  building,
} satisfies Record<string, Model>

export type ModelId = keyof typeof MODELS

export type { Props } from './model'
