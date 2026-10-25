/**
 * El panel de una sugerencia (`docs/sugerencias.md`): dónde (detectado, y
 * cambiable), el problema y tu propuesta. Pequeño y junto a donde se soltó la
 * burbuja; en el móvil, abajo a todo lo ancho. Se cierra con Escape.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'

import { api } from '../../shared/api'
import { useDetail } from '../../shared/detail'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useShownTheme } from '../../shared/theme'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { clean, spotLabel } from './detect'
import type { Spot } from './detect'

/** Cómo se abrió: soltando la burbuja sobre algo, o pulsándola. */
export type Opened = {
  spot: Spot | null
  /** Dónde se soltó, o `null` si se pulsó sin arrastrar. */
  at: { x: number; y: number } | null
}

/** Largo de los campos, como la API. */
const PROBLEM_MAX = 500
const PROPOSAL_MAX = 500
const DETAIL_MAX = 120

/** Ancho del panel y alto aproximado, para colocarlo sin que se salga. */
const WIDTH = 320
const HEIGHT = 380
/** Por debajo de este ancho, el panel va abajo a todo lo ancho (`suggest.css`). */
const DOCK_BELOW = 560

/** Dónde va el panel: junto al punto donde se soltó, o bajo la burbuja. */
function placement(at: Opened['at'], anchor: HTMLElement | null): CSSProperties | undefined {
  const width = window.innerWidth
  const height = window.innerHeight

  if (width < DOCK_BELOW) return undefined

  const clampX = (x: number): number => Math.min(Math.max(8, x), width - WIDTH - 8)

  if (at === null) {
    const rect = anchor?.getBoundingClientRect()

    return rect === undefined
      ? undefined
      : { left: clampX(rect.right - WIDTH), top: rect.bottom + 8 }
  }

  const below = at.y + 28
  const top = below + HEIGHT > height ? Math.max(8, at.y - HEIGHT - 16) : below

  return { left: clampX(at.x - 24), top }
}

/** El estilo y el tema puestos, como los acepta la API (`clinica-dark`). */
function themeName(style: string): string {
  const mode = document.documentElement.dataset.theme ?? 'light'

  return `${style}-${mode}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 40)
}

export function SuggestPanel({
  opened,
  section,
  sections,
  anchor,
  onClose,
}: {
  opened: Opened
  section: string
  sections: readonly string[]
  /** La burbuja, para colocar el panel debajo si se abrió sin arrastrar. */
  anchor: HTMLElement | null
  /** `true` si se mandó. */
  onClose: (sent: boolean) => void
}) {
  const { t, lang } = useI18n()
  const mode = useDetail()
  const style = useShownTheme().id
  const titleId = useId()
  const panel = useRef<HTMLFormElement>(null)
  const { busy, error, run } = useAction()
  const detected = opened.spot === null ? null : spotLabel(opened.spot, section, t)
  // Sin nada detectado (se pulsó la burbuja), el sitio se elige de la lista.
  const [editing, setEditing] = useState(detected === null)
  const [where, setWhere] = useState(
    sections.includes(section) ? section : (sections[0] ?? section),
  )
  const [detail, setDetail] = useState('')
  const [problem, setProblem] = useState('')
  const [proposal, setProposal] = useState('')
  const [style_] = useState(() => placement(opened.at, anchor))
  const moved = where !== section
  const label = moved || detected === null ? t(`nav.${where}`) : detected

  // Al abrirse, el foco va al primer campo que toca rellenar.
  useEffect(() => {
    const first = panel.current?.querySelector<HTMLElement>(
      detected === null ? 'select' : 'textarea',
    )

    first?.focus()
  }, [detected])

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    const hash = window.location.hash.slice(0, 200)
    const sent = await run(() =>
      api.sendSuggestion({
        problem,
        ...(proposal.trim() === '' ? {} : { proposal }),
        place: {
          section: where,
          label: clean(label),
          detail: detail.trim() === '' ? null : clean(detail, DETAIL_MAX),
          // Si se cambia de sección, la ruta del elemento ya no es de ella.
          selector: moved ? '' : (opened.spot?.selector ?? ''),
          hash: /\s/.test(hash) ? '' : hash,
          viewport: {
            width: Math.max(1, Math.round(window.innerWidth)),
            height: Math.max(1, Math.round(window.innerHeight)),
          },
          theme: themeName(style),
          lang,
          mode,
        },
      }),
    )

    if (sent) onClose(true)
  }

  return createPortal(
    <form
      ref={panel}
      className={`suggest-panel ${style_ === undefined ? 'docked' : ''}`}
      style={style_}
      role="dialog"
      aria-labelledby={titleId}
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose(false)
        }
      }}
    >
      <div className="suggest-head">
        <strong id={titleId}>
          <Icon name="idea" size={16} /> {t('suggest.open')}
        </strong>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('common.close')}
          onClick={() => {
            onClose(false)
          }}
        >
          <Icon name="cerrar" size={16} />
        </button>
      </div>

      <div className="suggest-where">
        <span className="suggest-where-text">
          <small>{t('suggest.where')}</small> <strong>{label}</strong>
        </span>
        {!editing && (
          <button
            type="button"
            className="link"
            onClick={() => {
              setEditing(true)
            }}
          >
            {t('suggest.change')}
          </button>
        )}
      </div>
      {editing && (
        <div className="suggest-where-edit">
          <label>
            {t('suggest.section')}
            <select
              value={where}
              onChange={(event) => {
                setWhere(event.target.value)
              }}
            >
              {sections.map((id) => (
                <option key={id} value={id}>
                  {t(`nav.${id}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('suggest.detail')}
            <input
              value={detail}
              maxLength={DETAIL_MAX}
              placeholder={t('suggest.detail.example')}
              onChange={(event) => {
                setDetail(event.target.value)
              }}
            />
          </label>
        </div>
      )}

      <label>
        {t('suggest.problem')}
        <textarea
          value={problem}
          rows={2}
          maxLength={PROBLEM_MAX}
          required
          minLength={5}
          placeholder={t('suggest.problem.example')}
          onChange={(event) => {
            setProblem(event.target.value)
          }}
        />
      </label>
      <label>
        {t('suggest.proposal')}
        <textarea
          value={proposal}
          rows={2}
          maxLength={PROPOSAL_MAX}
          placeholder={t('suggest.proposal.example')}
          onChange={(event) => {
            setProposal(event.target.value)
          }}
        />
      </label>
      <ErrorNote error={error} />
      <div className="actions">
        <button
          type="submit"
          className="primary small"
          disabled={busy || problem.trim().length < 5}
        >
          {t('common.send')}
        </button>
      </div>
    </form>,
    document.body,
  )
}
