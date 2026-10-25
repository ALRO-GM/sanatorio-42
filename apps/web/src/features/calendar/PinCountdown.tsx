import type { CalendarEvent } from '@sanatorio/contracts'

import { pinCountdown, pinOf, unpinCountdown, useCountdowns } from '../../shared/countdowns'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

/**
 * Fijar un evento del calendario en la ventanita de cuentas atrás
 * (`docs/avisos-cuenta-atras.md`), o quitarlo si ya lo está. Solo para lo que
 * aún no ha empezado: de lo que ya está en marcha no hay nada que contar.
 */
export function PinCountdown({ event }: { event: CalendarEvent }) {
  const { t } = useI18n()
  const list = useCountdowns()
  const action = useAction()
  const mine = pinOf(list, event.id)
  const pinned = mine !== undefined

  if (Date.parse(event.start) <= Date.now()) return null

  return (
    <>
      <button
        type="button"
        className="pill"
        aria-pressed={pinned}
        disabled={action.busy}
        onClick={() => {
          void action.run(() =>
            mine === undefined
              ? pinCountdown({ kind: 'event', eventId: event.id })
              : unpinCountdown(mine.id),
          )
        }}
      >
        <Icon name="chincheta" size={14} />{' '}
        {t(pinned ? 'countdown.unpinEvent' : 'countdown.pinEvent')}
      </button>
      <ErrorNote error={action.error} />
    </>
  )
}
