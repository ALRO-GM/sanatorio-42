import type { RequesterTag } from '@sanatorio/contracts'
import type { IconName } from '../../shared/ui/Icon'

/**
 * Cómo llegó quien pedía ayuda. Lo elige quien ayudó.
 *
 * No son notas: describen la sesión, y ninguna es mejor que otra. Los textos,
 * en `help.tag.<tag>`. Las de quien ayuda (cómo ayudó) son las de
 * `shared/reactions.ts`.
 */
export const REQUESTER_TAGS: readonly { tag: RequesterTag; emoji: IconName }[] = [
  { tag: 'prepared', emoji: 'lapiz' },
  { tag: 'curious', emoji: 'pregunta' },
  { tag: 'autonomous', emoji: 'despegue' },
  { tag: 'basics', emoji: 'capas' },
]
