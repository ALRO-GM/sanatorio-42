import type { ReactionKind } from '@sanatorio/contracts'
import type { IconName } from './ui/Icon'

/** Las cuatro reacciones de "¿Cómo te ayudó?", con su icono. Los textos, en `react.<kind>`. */
export const REACTIONS: readonly { kind: ReactionKind; emoji: IconName }[] = [
  { kind: 'bug', emoji: 'bicho' },
  { kind: 'code', emoji: 'lupa' },
  { kind: 'concept', emoji: 'idea' },
  { kind: 'patient', emoji: 'corazon' },
]
