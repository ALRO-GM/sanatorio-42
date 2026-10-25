/**
 * Los títulos que pone Peer4U a los eventos del calendario («Te corrigen
 * ft_printf», «Sprint de Libft»…).
 *
 * La API manda dos cosas: `label`, que dice de qué es el título y con qué
 * datos (`{ kind: 'corrected', project: 'ft_printf' }`), y `title`, el mismo
 * título ya escrito en español. La web escribe `label` en el idioma de quien
 * mira (`event.name.*` en las tablas de textos); `title` queda para quien no
 * sepa leer `label` y para lo que se guardó antes de que existiera.
 *
 * Lo que tiene título propio (una pizarra, un evento o un examen de 42) va con
 * `label: null`: ese título no es nuestro y no se traduce.
 */

import type { CalendarEvent, EventTitle } from '@sanatorio/contracts'

/** El título en español, el que se guardaba antes de `label`. */
export function spanishTitle(label: EventTitle): string {
  const project = label.project === null ? '' : ` ${label.project}`

  switch (label.kind) {
    case 'help_window':
      return 'Te ofreces a ayudar'
    case 'helping':
      return `Ayudas a ${label.login ?? ''}`.trim()
    case 'helped':
      return `${label.login ?? ''} te ayuda`.trim()
    case 'sprint':
      return `Sprint de ${label.project ?? 'grupo'}`
    case 'correcting':
      return `Corriges${project}`
    case 'corrected':
      return `Te corrigen${project}`
  }
}

/** Un título hecho de un `label`, con los dos campos que lleva el evento. */
export function titled(label: EventTitle): Pick<CalendarEvent, 'title' | 'label'> {
  return { title: spanishTitle(label), label }
}

const label = (
  kind: EventTitle['kind'],
  project: string | null = null,
  login: string | null = null,
): EventTitle => ({ kind, project, login })

/**
 * El `label` de un título en español ya guardado: el de una cuenta atrás
 * fijada desde un evento, o el de un aviso de evento de antes de `label`. Lo
 * reconoce por el id del evento y por la forma de `spanishTitle`; si no es uno
 * de los nuestros, `null` y se enseña el título tal cual.
 */
export function labelOf(title: string, eventId: string | null): EventTitle | null {
  if (eventId === null) return null

  if (eventId.startsWith('help:window:')) {
    return title === 'Te ofreces a ayudar' ? label('help_window') : null
  }
  if (eventId.startsWith('help:booking:')) {
    const helping = /^Ayudas a (\S+)$/.exec(title)
    const helped = /^(\S+) te ayuda$/.exec(title)

    if (helping?.[1] !== undefined) return label('helping', null, helping[1])
    if (helped?.[1] !== undefined) return label('helped', null, helped[1])

    return null
  }
  if (eventId.startsWith('therapy:')) {
    const project = /^Sprint de (.+)$/.exec(title)?.[1]

    if (project === undefined) return null

    return label('sprint', project === 'grupo' ? null : project)
  }
  if (eventId.startsWith('evaluation:')) {
    const match = /^(Corriges|Te corrigen)(?: (.+))?$/.exec(title)

    if (match === null) return null

    return label(match[1] === 'Corriges' ? 'correcting' : 'corrected', match[2] ?? null)
  }

  return null
}
