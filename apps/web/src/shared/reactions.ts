import type { ReactionKind } from '@sanatorio/contracts'

/** Las cuatro reacciones de "¿Cómo te ayudó?", con su icono. Los textos, en `react.<kind>`. */
export const REACTIONS: readonly { kind: ReactionKind; emoji: string }[] = [
  { kind: 'bug', emoji: '🐛' },
  { kind: 'code', emoji: '🔍' },
  { kind: 'concept', emoji: '💡' },
  { kind: 'patient', emoji: '🤝' },
]
