import { useEffect, useState } from 'react'

import type { FocusReason } from '@sanatorio/contracts'

import { stayFocused, stopFocus } from '../../shared/focus'
import { useAction } from '../../shared/hooks/useAsync'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Modal } from '../../shared/ui/Modal'

/** Segundos para pensárselo antes de poder parar (#80 del buzón). */
export const THINK_SECONDS = 10

const REASONS: readonly FocusReason[] = [
  'tired',
  'break',
  'distracted',
  'someone',
  'urgent',
  'done',
  'other',
]

/**
 * «¿Seguro que quieres parar?»: sale al pulsar «Acabar», al salir de la
 * pantalla completa o con Escape. Se marcan los motivos, se recuerda que quizá
 * pueda esperar al final de la sesión y hay diez segundos para pensarlo: hasta
 * entonces solo se puede seguir. Seguir también se apunta (con sus motivos),
 * que es justo lo que se quiere ver en las estadísticas.
 *
 * Escape en esta ventana es «sigo»: cerrar la pregunta sin parar.
 *
 * @param left Lo que queda de concentración, ya escrito («12:30»).
 * @param onDone `true` si se ha parado; `false` si se sigue.
 */
export function FocusExit({ left, onDone }: { left: string; onDone: (stopped: boolean) => void }) {
  const { t } = useI18n()
  // Contra una hora fija y no restando de uno en uno: una pestaña en segundo
  // plano retrasa los temporizadores, y los diez segundos tienen que ser diez.
  const [until] = useState(() => Date.now() + THINK_SECONDS * 1000)
  const [over, setOver] = useState(false)
  const now = useNow(250, { active: !over })
  const wait = Math.max(0, Math.ceil((until - now) / 1000))
  const [reasons, setReasons] = useState<FocusReason[]>([])
  const { busy, error, run } = useAction()

  // Al llegar a cero el reloj se suelta: no hay nada más que contar.
  useEffect(() => {
    if (wait === 0) setOver(true)
  }, [wait])

  const stay = (): void => {
    void run(async () => {
      await stayFocused(reasons)
      onDone(false)
    })
  }

  return (
    <Modal
      label={t('focus.exit.title')}
      className="focus-exit"
      closeOnBackdrop={false}
      // Escape no cierra sin más: cuenta como seguir concentrándose.
      onEscape={() => {
        if (!busy) stay()
      }}
      onClose={() => undefined}
    >
      <h3 id="focus-exit-title">{t('focus.exit.title')}</h3>
      <p>{t('focus.exit.left', { time: left })}</p>

      <fieldset className="focus-choices">
        <legend>{t('focus.exit.why')}</legend>
        {REASONS.map((reason) => (
          <label key={reason} className="duty-check">
            <input
              type="checkbox"
              checked={reasons.includes(reason)}
              onChange={() => {
                setReasons((list) =>
                  list.includes(reason) ? list.filter((one) => one !== reason) : [...list, reason],
                )
              }}
            />
            {t(`focus.reason.${reason}`)}
          </label>
        ))}
      </fieldset>
      <p className="focus-later">{t('focus.exit.later')}</p>

      <p className="hint" role="status" aria-live="polite">
        {wait > 0
          ? t('focus.exit.wait', { n: wait })
          : reasons.length === 0
            ? t('focus.exit.pick')
            : ''}
      </p>
      <ErrorNote error={error} />
      <div className="actions">
        <button type="button" className="primary" disabled={busy} onClick={stay}>
          {t('focus.exit.stay')}
        </button>
        <button
          type="button"
          disabled={busy || wait > 0 || reasons.length === 0}
          onClick={() => {
            void run(async () => {
              await stopFocus(reasons)
              onDone(true)
            })
          }}
        >
          {t('focus.exit.stop')}
        </button>
      </div>
    </Modal>
  )
}
