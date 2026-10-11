import { useEffect, useRef } from 'react'

import { useI18n } from '../i18n'
import { arrange, move } from './order'
import type { OrderMode } from './order'
import { NAV_DEFAULT, PAGE_IDS, PAGES } from './registry'
import type { PageId } from './registry'
import { resetPrefs, toggleFold, updatePrefs, usePrefs } from './store'
import { Icon } from '../ui/Icon'

/** Antelaciones del aviso que se pueden elegir, en minutos. `0` es sin avisos. */
const LEADS = [0, 2, 5, 10, 15, 30, 60] as const

const MODES = ['manual', 'mine', 'community'] as const satisfies readonly OrderMode[]

/**
 * La ventana de personalización: en qué orden van las pestañas y los bloques de
 * cada página, cuáles salen plegados, y si el orden lo pones tú o se calcula
 * solo con lo que más usas tú o la comunidad.
 */
export function LayoutSettings({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const prefs = usePrefs()
  const dialog = useRef<HTMLDialogElement>(null)
  const manual = prefs.mode === 'manual'

  useEffect(() => {
    // Sin limpieza a propósito: cerrar aquí dispararía `onClose` en el doble
    // montaje de desarrollo y la ventana se cerraría nada más abrirse.
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const navOrder = arrange(NAV_DEFAULT, prefs.nav, 'manual', {}, (id) => id)

  const pageOrder = (page: PageId): string[] =>
    arrange(
      PAGES[page].map((block) => block.id),
      prefs.pages[page]?.order ?? [],
      'manual',
      {},
      (id) => id,
    )

  const moveBlock = (page: PageId, id: string, step: -1 | 1): void => {
    updatePrefs((current) => ({
      ...current,
      pages: {
        ...current.pages,
        [page]: {
          folded: current.pages[page]?.folded ?? [],
          order: move(pageOrder(page), id, step),
        },
      },
    }))
  }

  return (
    <dialog ref={dialog} className="layout-dialog" onClose={onClose} aria-label={t('layout.title')}>
      <div className="layout-head">
        <h3>{t('layout.title')}</h3>
        <button type="button" className="link" aria-label={t('layout.close')} onClick={onClose}>
          <Icon name="cerrar" />
        </button>
      </div>

      <fieldset className="layout-modes">
        <legend>{t('layout.mode')}</legend>
        {MODES.map((mode) => (
          <label key={mode} className={prefs.mode === mode ? 'active' : ''}>
            <input
              type="radio"
              name="layout-mode"
              checked={prefs.mode === mode}
              onChange={() => {
                updatePrefs((current) => ({ ...current, mode }))
              }}
            />
            <span>
              <strong>{t(`layout.mode.${mode}`)}</strong>
              <small>{t(`layout.mode.${mode}.hint`)}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="layout-group">
        <h4>{t('layout.alerts')}</h4>
        <label className="layout-alert">
          {t('layout.alerts.lead')}
          <select
            value={prefs.alertLead ?? 5}
            onChange={(event) => {
              const alertLead = Number(event.target.value)

              updatePrefs((current) => ({ ...current, alertLead }))

              // De paso se pide permiso para avisar con la web en otra pestaña.
              if (
                alertLead > 0 &&
                'Notification' in window &&
                Notification.permission === 'default'
              ) {
                void Notification.requestPermission()
              }
            }}
          >
            {LEADS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0
                  ? t('layout.alerts.off')
                  : t('layout.alerts.minutes', { n: minutes })}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">{t('layout.alerts.hint')}</p>
      </section>

      <section className="layout-group">
        <h4>{t('layout.nav')}</h4>
        {!manual && <p className="hint">{t('layout.autoNote')}</p>}
        <ol className="layout-list">
          {navOrder.map((id, index) => (
            <li key={id}>
              <span>{t(`nav.${id}`)}</span>
              <Arrows
                disabled={!manual}
                first={index === 0}
                last={index === navOrder.length - 1}
                label={t(`nav.${id}`)}
                onMove={(step) => {
                  updatePrefs((current) => ({ ...current, nav: move(navOrder, id, step) }))
                }}
              />
            </li>
          ))}
        </ol>
      </section>

      {PAGE_IDS.map((page) => {
        const order = pageOrder(page)
        const folded = prefs.pages[page]?.folded ?? []

        return (
          <section key={page} className="layout-group">
            <h4>{t(`layout.page.${page}`)}</h4>
            <ol className="layout-list">
              {order.map((id, index) => {
                const foldable = PAGES[page].find((block) => block.id === id)?.foldable === true

                return (
                  <li key={id}>
                    <span>{t(`layout.${page}.${id}`)}</span>
                    {foldable && (
                      <label className="layout-fold">
                        <input
                          type="checkbox"
                          checked={folded.includes(id)}
                          onChange={() => {
                            toggleFold(page, id)
                          }}
                        />
                        {t('layout.folded')}
                      </label>
                    )}
                    <Arrows
                      disabled={!manual}
                      first={index === 0}
                      last={index === order.length - 1}
                      label={t(`layout.${page}.${id}`)}
                      onMove={(step) => {
                        moveBlock(page, id, step)
                      }}
                    />
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}

      <div className="actions">
        <button type="button" className="pill" onClick={resetPrefs}>
          {t('layout.reset')}
        </button>
        <button type="button" className="primary small" onClick={onClose}>
          {t('layout.done')}
        </button>
      </div>
    </dialog>
  )
}

type ArrowsProps = {
  disabled: boolean
  first: boolean
  last: boolean
  /** Nombre de lo que se mueve, para los lectores de pantalla. */
  label: string
  onMove: (step: -1 | 1) => void
}

function Arrows({ disabled, first, last, label, onMove }: ArrowsProps) {
  const { t } = useI18n()

  return (
    <span className="layout-arrows">
      <button
        type="button"
        disabled={disabled || first}
        aria-label={t('layout.up', { name: label })}
        onClick={() => {
          onMove(-1)
        }}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={disabled || last}
        aria-label={t('layout.down', { name: label })}
        onClick={() => {
          onMove(1)
        }}
      >
        ↓
      </button>
    </span>
  )
}
