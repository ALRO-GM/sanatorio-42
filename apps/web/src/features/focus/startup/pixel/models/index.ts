import { coins, building, flag, globe, rocket } from './milestones'
import type { Model } from './model'
import { beanbag, books, bookshelf, coffee, cooler, dashboard, printer, whiteboard } from './office'
import {
  aquarium,
  arcade,
  bonsai,
  bookcase,
  clock,
  corkboard,
  discoball,
  fountain,
  guitar,
  lamp,
  neon,
  piano,
  rug,
  sofa,
  statue,
  telescope,
  trophy,
  tree,
  tv,
  vending,
} from './decor'
import { cat, crate, dog, robot, truck } from './pets'
import { cactus, monstera } from './plants'
import { rack } from './servers'
import { person, reception, walker, workstation } from './workplace'

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
  walker,
  reception,
  // La decoración que se compra (`DECOR`): la planta es la monstera.
  plant: monstera,
  lamp,
  rug,
  guitar,
  corkboard,
  sofa,
  bonsai,
  bookcase,
  tv,
  neon,
  vending,
  aquarium,
  arcade,
  tree,
  clock,
  piano,
  statue,
  fountain,
  trophy,
  discoball,
  telescope,
  cat,
  dog,
  robot,
  crate,
  truck,
} satisfies Record<string, Model>

export type ModelId = keyof typeof MODELS

export type { Props } from './model'
