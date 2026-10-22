import { useEffect, useId, useRef, useState } from 'react'

import type {
  CorrectionPrompt,
  CorrectionUnderstanding,
  ReactionKind,
  RequesterTag,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useGateQueue } from '../../shared/hooks/useGateQueue'
import { localeOf, useI18n } from '../../shared/i18n'
import { REACTIONS } from '../../shared/reactions'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { REQUESTER_TAGS } from '../help/tags'
import { UNDERSTANDINGS } from './understanding'

type CorrectionGateProps = {
  /** Cuántas correcciones dice el pulso que hay por valorar. */
  pending: number
  /** Se ha contestado o aplazado alguna: conviene pedir el pulso otra vez. */
  onChange: () => void
}

/** Cada cuánto se mira si ya no hay otra ventana delante para abrir esta. */
const WAIT_MS = 1500

/**
 * Tras una corrección de 42, una ventana que pregunta a las dos partes, de una
 * corrección en una, como la valoración de la ayuda reservada:
 *
 * - a quien corrigieron, qué tal entiende ahora el problema y, si quiere, una
 *   reacción para quien le corrigió (cuenta en sus «Reacciones recibidas»);
 * - a quien corrigió, cómo llegó la otra persona (cuenta en su «Cómo llegas
 *   cuando pides ayuda»).
 *
 * A diferencia de las peticiones de ayuda, se puede saltar: «Ahora no» (o
 * Escape) vuelve a preguntar más tarde y «No volver a preguntar» la descarta.
 * No se abre encima de otra ventana: espera a que se cierre.
 */
export function CorrectionGate({ pending, onChange }: CorrectionGateProps) {
  const { queue, setQueue, current } = useGateQueue<CorrectionPrompt>(pending, () =>
    api.getCorrectionPrompts(),
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const { busy, error, run } = useAction()
  /** `true` mientras se contesta: el cierre que sigue no es un «Ahora no». */
  const answering = useRef(false)
  const currentId = current?.id

  useEffect(() => {
    const element = dialog.current

    if (currentId === undefined) return

    const open = (): void => {
      if (element === null || element.open) return
      // Delante hay otra (unas condiciones, una petición de ayuda…): luego.
      if (document.querySelector('dialog[open]') !== null) return

      element.showModal()
    }

    open()

    const timer = setInterval(open, WAIT_MS)

    return () => {
      clearInterval(timer)
    }
  }, [currentId])

  // Sin nada que preguntar no hay ventana: al desmontarse, se cierra sola.
  if (current === undefined) return null

  /** Hace algo con la corrección que se ve y pasa a la siguiente. */
  const next = (action: () => Promise<void>): void => {
    answering.current = true
    void run(async () => {
      await action()
      setQueue((list) => list.slice(1))
      onChange()
    }).finally(() => {
      answering.current = false
    })
  }
  const later = (): void => {
    next(() => api.skipCorrection(current.id, false))
  }

  return (
    <dialog
      ref={dialog}
      className="layout-dialog help-gate correction-gate"
      aria-labelledby={`correction-${current.id}`}
      onCancel={(event) => {
        // Escape es «Ahora no»: se cierra al contestar la API, no antes.
        event.preventDefault()
        if (!busy) later()
      }}
      onClose={() => {
        // El navegador puede cerrarla por su cuenta (un segundo Escape): también es «Ahora no».
        if (!answering.current && dialog.current !== null) later()
      }}
    >
      <CorrectionForm
        key={current.id}
        prompt={current}
        more={queue.length - 1}
        busy={busy}
        error={error}
        onLater={later}
        onNever={() => {
          next(() => api.skipCorrection(current.id, true))
        }}
        onSend={(input) => {
          next(() => api.rateCorrection(current.id, input))
        }}
      />
    </dialog>
  )
}

type CorrectionFormProps = {
  prompt: CorrectionPrompt
  /** Cuántas más quedan detrás. */
  more: number
  busy: boolean
  error: unknown
  onLater: () => void
  onNever: () => void
  onSend: (
    input:
      | { understanding: CorrectionUnderstanding; reaction: ReactionKind | null }
      | { tag: RequesterTag },
  ) => void
}

/** Lo de dentro de la ventana. Va aparte para empezar de cero con cada corrección. */
function CorrectionForm({
  prompt,
  more,
  busy,
  error,
  onLater,
  onNever,
  onSend,
}: CorrectionFormProps) {
  const { t, lang } = useI18n()
  const name = useId()
  const [understanding, setUnderstanding] = useState<CorrectionUnderstanding | null>(null)
  const [reaction, setReaction] = useState<ReactionKind | null>(null)
  const [tag, setTag] = useState<RequesterTag | null>(null)
  const corrected = prompt.role === 'corrected'
  const logins = new Intl.ListFormat(localeOf(lang), { type: 'conjunction' }).format(
    prompt.peers.map((peer) => peer.login),
  )
  const when = new Date(prompt.beginAt).toLocaleString(localeOf(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const ready = corrected ? understanding !== null : tag !== null

  return (
    <>
      <div className="layout-head">
        <span className="event-kind">
          <Icon name="red" /> {t('net.rate.kind')}
        </span>
        {more > 0 && <span className="hint">{t('net.rate.more', { n: more })}</span>}
      </div>
      <div className="help-gate-who">
        <span className="correction-gate-faces">
          {prompt.peers.slice(0, 3).map((peer) => (
            <Avatar key={peer.login} login={peer.login} image={peer.image} size={56} />
          ))}
        </span>
        <h3 id={`correction-${prompt.id}`}>
          {corrected
            ? t('net.rate.correctedBy', { login: logins })
            : t('net.rate.youCorrected', { logins })}
        </h3>
      </div>
      <p className="hint">
        {prompt.projectName === null ? when : `${prompt.projectName} · ${when}`}
      </p>

      {corrected ? (
        <>
          <fieldset className="layout-modes correction-gate-answers">
            <legend>{t('net.rate.understand')}</legend>
            {UNDERSTANDINGS.map((answer) => (
              <label key={answer} className={understanding === answer ? 'active' : ''}>
                <input
                  type="radio"
                  name={name}
                  value={answer}
                  checked={understanding === answer}
                  onChange={() => {
                    setUnderstanding(answer)
                  }}
                />
                <span>{t(`net.rate.understanding.${answer}`)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="correction-gate-tags">
            <legend>{t('net.rate.reaction', { login: logins })}</legend>
            <div className="rating-options">
              {REACTIONS.map(({ kind, emoji }) => (
                <button
                  key={kind}
                  type="button"
                  className={`pill ${reaction === kind ? 'active' : ''}`}
                  aria-pressed={reaction === kind}
                  onClick={() => {
                    setReaction(reaction === kind ? null : kind)
                  }}
                >
                  <Icon name={emoji} /> {t(`react.${kind}`)}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset className="correction-gate-tags">
          <legend>
            {t(prompt.peers.length > 1 ? 'net.rate.arrivedMany' : 'net.rate.arrived')}
          </legend>
          <div className="rating-options">
            {REQUESTER_TAGS.map(({ tag: option, emoji }) => (
              <button
                key={option}
                type="button"
                className={`pill ${tag === option ? 'active' : ''}`}
                aria-pressed={tag === option}
                onClick={() => {
                  setTag(option)
                }}
              >
                <Icon name={emoji} /> {t(`help.tag.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className="hint">{t('net.rate.hint')}</p>
      <ErrorNote error={error} />
      <div className="actions">
        <button type="button" className="pill" disabled={busy} onClick={onLater}>
          {t('net.rate.later')}
        </button>
        <button type="button" className="pill" disabled={busy} onClick={onNever}>
          {t('net.rate.never')}
        </button>
        <button
          type="button"
          className="primary small"
          disabled={busy || !ready}
          onClick={() => {
            if (corrected && understanding !== null) onSend({ understanding, reaction })
            else if (tag !== null) onSend({ tag })
          }}
        >
          {t('net.rate.send')}
        </button>
      </div>
    </>
  )
}
