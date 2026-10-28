import type { Axis } from '@sanatorio/startup'

import type { ModelId, Props } from './models'
import { PixelArt } from './PixelArt'

/** De qué es el dibujo de una tarjeta. */
export type ArtOf =
  | { kind: 'learn'; axis: Axis }
  | { kind: 'computer'; level: number }
  | { kind: 'space'; level: number }
  | { kind: 'servers'; level: number }
  | { kind: 'side' | 'mvp' | 'founded' | 'global' }
  | { kind: 'round'; index: number }
  | { kind: 'hire'; axis: Axis; look: number }

/** Qué modelo dibuja cada tarjeta, y con qué. */
function modelOf(art: ArtOf): { model: ModelId; props: Props } {
  switch (art.kind) {
    case 'learn':
      return { model: 'books', props: { axis: art.axis } }
    case 'computer':
      return { model: 'workstation', props: { level: art.level } }
    case 'space':
      return { model: 'building', props: { level: art.level } }
    case 'servers':
      return { model: 'rack', props: { level: art.level } }
    case 'side':
      return { model: 'whiteboard', props: {} }
    case 'mvp':
      return { model: 'rocket', props: {} }
    case 'founded':
      return { model: 'flag', props: {} }
    case 'global':
      return { model: 'globe', props: {} }
    case 'round':
      return { model: 'coins', props: { level: art.index + 1 } }
    case 'hire':
      return { model: 'person', props: { look: art.look, axis: art.axis } }
  }
}

/**
 * El dibujo de una tarjeta del juego, en un hueco de `size`: lo que se compra,
 * el hito, la ronda o la persona candidata. Son los mismos modelos en píxeles
 * que la oficina (`pixel/models`).
 */
export function ItemArt({ art, size = 48 }: { art: ArtOf; size?: number }) {
  const { model, props } = modelOf(art)

  return <PixelArt model={model} props={props} size={size} />
}
