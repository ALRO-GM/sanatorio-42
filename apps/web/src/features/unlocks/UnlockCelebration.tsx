import { useCallback, useEffect, useRef, useState } from 'react'

import type { TitleId, Unlock } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { onCheckUnlocks } from '../../shared/unlocks'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Modal } from '../../shared/ui/Modal'
import { TitleBanner } from '../../shared/ui/TitleBanner'

type UnlockCelebrationProps = {
  /** El título que luces ahora: si es el nuevo, no se ofrece ponérselo. */
  current: TitleId | undefined
  /** No es momento (la bienvenida, un Pomodoro): espera, sin perder nada. */
  paused: boolean
  /** Te has puesto el título nuevo: hay que volver a pedir el expediente. */
  onEquipped: () => void
}

/**
 * La celebración de lo desbloqueado (`docs/cursos-logros.md`): un logro de los
 * cursos, un título de nivel o el de maestro del código. Una ventana por cosa,
 * con su banner, lo conseguido, la XP que da y «Lucirlo ahora». Lo que ya se
 * ha celebrado lo guarda la API: no se repite al recargar ni en otro
 * dispositivo. Pregunta al abrirse la web y tras cada punto superado de un
 * curso (`shared/unlocks.ts`).
 */
export function UnlockCelebration({ current, paused, onEquipped }: UnlockCelebrationProps) {
  const { t } = useI18n()
  const [queue, setQueue] = useState<Unlock[]>([])
  // Lo ya cerrado, aunque la API aún no haya contestado: que no vuelva a salir.
  const closed = useRef(new Set<string>())
  const equip = useAction()
  const equipButton = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    try {
      const { unlocks } = await api.getUnlocks()

      setQueue((before) => [
        ...before,
        ...unlocks.filter(
          (unlock) =>
            !closed.current.has(unlock.id) && !before.some((entry) => entry.id === unlock.id),
        ),
      ])
    } catch {
      // Celebrar no es imprescindible: se vuelve a mirar la próxima vez.
    }
  }, [])

  useEffect(() => {
    void load()

    return onCheckUnlocks(() => void load())
  }, [load])

  const shown = paused ? undefined : queue[0]

  if (shown === undefined) return null

  const done = (id: string): void => {
    closed.current.add(id)
    equip.clearError()
    setQueue((before) => before.filter((entry) => entry.id !== id))
    // Si no llega, saldrá otra vez la próxima vez que se abra la web.
    api.markUnlocksSeen([id]).catch(() => undefined)
  }

  const name =
    shown.kind === 'achievement'
      ? t(`ach.${shown.id}`)
      : shown.kind === 'level'
        ? t('unlock.level', { level: shown.level })
        : t(`title.${shown.id}`)
  const wearing = current === shown.id

  return (
    <Modal
      key={shown.id}
      portal
      label={t(`unlock.kind.${shown.kind}`)}
      title={t(`unlock.kind.${shown.kind}`)}
      className="unlock-dialog"
      initialFocus={equipButton}
      onClose={() => {
        done(shown.id)
      }}
    >
      <div className="unlock-show">
        <TitleBanner title={shown.id} />
        <p className="unlock-name">{name}</p>
        {shown.xp > 0 && <p className="unlock-xp">{t('unlock.xp', { xp: shown.xp })}</p>}
        <p className="unlock-title">{t('unlock.title', { title: t(`title.${shown.id}`) })}</p>
      </div>
      <ErrorNote error={equip.error} />
      <div className="unlock-actions">
        {!wearing && (
          <button
            ref={equipButton}
            type="button"
            className="primary"
            disabled={equip.busy}
            onClick={() => {
              void (async () => {
                if (await equip.run(() => api.updateSettings({ title: shown.id }))) {
                  done(shown.id)
                  onEquipped()
                }
              })()
            }}
          >
            {t('unlock.equip')}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            done(shown.id)
          }}
        >
          {t('unlock.later')}
        </button>
      </div>
      {queue.length > 1 && (
        <p className="unlock-more">{t('unlock.more', { n: queue.length - 1 })}</p>
      )}
    </Modal>
  )
}
