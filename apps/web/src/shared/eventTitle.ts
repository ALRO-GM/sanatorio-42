/**
 * El título de un evento del calendario en el idioma de quien mira.
 *
 * Los títulos que pone Peer4U («Te corrigen ft_printf», «Sprint de Libft»)
 * llegan de la API en español en `title` y, aparte, como `label`: de qué son y
 * con qué datos. Con `label` se escribe el texto de su tabla (`event.name.*`);
 * sin él (una pizarra, un evento o un examen de 42, que tienen su propio
 * título), se enseña `title` tal cual. Lo usan el calendario, la agenda, los
 * avisos de eventos y las cuentas atrás.
 */

import type { EventTitle } from '@sanatorio/contracts'

import type { Translate } from './i18n'

/** La clave del texto de un `label`, o `null` si le falta lo que necesita. */
function keyOf(label: EventTitle): string | null {
  switch (label.kind) {
    case 'helping':
    case 'helped':
      return label.login === null ? null : `event.name.${label.kind}`
    case 'sprint':
      return label.project === null ? 'event.name.sprintGroup' : 'event.name.sprint'
    case 'correcting':
    case 'corrected':
      return label.project === null ? `event.name.${label.kind}Any` : `event.name.${label.kind}`
    case 'help_window':
      return 'event.name.help_window'
  }
}

/**
 * @param event Lo que trae el título: un evento o una cuenta atrás. `label`
 *   puede faltar en lo guardado antes de que existiera.
 */
export function eventTitle(
  t: Translate,
  event: { title: string | null; label?: EventTitle | null | undefined },
): string {
  const { label } = event
  const key = label === undefined || label === null ? null : keyOf(label)

  return key === null || label === undefined || label === null
    ? (event.title ?? '')
    : t(key, { project: label.project ?? '', login: label.login ?? '' })
}
