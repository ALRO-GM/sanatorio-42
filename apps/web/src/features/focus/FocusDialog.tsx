import { useEffect, useRef, useState } from 'react'

import type { FocusSettings, FocusShow } from '@sanatorio/contracts'

import { SECTIONS } from '../../app/sections'
import { Show } from '../../shared/detail'
import { startFocus, useFocus } from '../../shared/focus'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { FocusMyStats } from './FocusMyStats'

const FOCUS_MINUTES = [25, 50, 90] as const
const BREAK_MINUTES = [5, 10, 15, 0] as const
const SHOWS: readonly FocusShow[] = ['corrections', 'events', 'messages', 'guard', 'notices']
/** Las secciones que se pueden dejar a la vista (las de las pestañas). */
const CHOOSABLE = SECTIONS.filter((section) => section.inNav || section.id === 'expediente').map(
  (section) => section.id,
)

const TABS = ['settings', 'stats'] as const

/**
 * El Pomodoro: cuánto concentrarse y descansar, qué secciones dejar en las
 * pestañas y qué avisos seguir recibiendo. Lo demás (juegos, otros avisos) se
 * silencia, y los demás ven «concentrado, no me distraigas».
 *
 * En la otra pestaña, tus estadísticas (#80 del buzón); son cifras, así que
 * salen desde el modo normal.
 */
export function FocusDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const focus = useFocus()
  const dialog = useRef<HTMLDialogElement>(null)
  const [settings, setSettings] = useState<FocusSettings>(
    () =>
      focus?.settings ?? {
        focusMinutes: 25,
        breakMinutes: 5,
        sections: ['calendario', 'expediente'],
        show: ['corrections', 'events'],
      },
  )
  const { busy, error, run } = useAction()
  const [tab, setTab] = useState<(typeof TABS)[number]>('settings')

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const toggle = <T extends string>(list: readonly T[], item: T): T[] =>
    list.includes(item) ? list.filter((one) => one !== item) : [...list, item]

  return (
    <dialog
      ref={dialog}
      className={`layout-dialog focus-dialog ${tab === 'stats' ? 'wide' : ''}`}
      aria-label={t('focus.title')}
      onClose={onClose}
    >
      <div className="layout-head">
        <h3>
          <Icon name="reloj" /> {t('focus.title')}
        </h3>
        <button
          type="button"
          className="link"
          aria-label={t('layout.close')}
          onClick={() => dialog.current?.close()}
        >
          <Icon name="cerrar" />
        </button>
      </div>
      <Show from="normal">
        <div className="filter-pills sub-tabs" role="tablist" aria-label={t('focus.title')}>
          {TABS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              className={`pill ${tab === option ? 'active' : ''}`}
              onClick={() => {
                setTab(option)
              }}
            >
              {t(`focus.tab.${option}`)}
            </button>
          ))}
        </div>
      </Show>
      {tab === 'stats' && <FocusMyStats />}
      {tab === 'settings' && (
        <>
          <p className="hint">{t('focus.pitch')}</p>

          <div className="form-grid">
            <label>
              {t('focus.minutes')}
              <select
                value={settings.focusMinutes}
                onChange={(event) => {
                  setSettings({ ...settings, focusMinutes: Number(event.target.value) })
                }}
              >
                {FOCUS_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {t('focus.minutesN', { n: minutes })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('focus.break')}
              <select
                value={settings.breakMinutes}
                onChange={(event) => {
                  setSettings({ ...settings, breakMinutes: Number(event.target.value) })
                }}
              >
                {BREAK_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes === 0 ? t('focus.noBreak') : t('focus.minutesN', { n: minutes })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="focus-choices">
            <legend>{t('focus.sections')}</legend>
            {CHOOSABLE.map((id) => (
              <label key={id} className="duty-check">
                <input
                  type="checkbox"
                  checked={settings.sections.includes(id)}
                  onChange={() => {
                    setSettings({ ...settings, sections: toggle(settings.sections, id) })
                  }}
                />
                {t(`nav.${id}`)}
              </label>
            ))}
          </fieldset>

          <fieldset className="focus-choices">
            <legend>{t('focus.show')}</legend>
            {SHOWS.map((what) => (
              <label key={what} className="duty-check">
                <input
                  type="checkbox"
                  checked={settings.show.includes(what)}
                  onChange={() => {
                    setSettings({ ...settings, show: toggle(settings.show, what) })
                  }}
                />
                {t(`focus.show.${what}`)}
              </label>
            ))}
          </fieldset>
          <p className="hint">{t('focus.always')}</p>

          <ErrorNote error={error} />
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => {
                void run(async () => {
                  await startFocus(settings)
                  dialog.current?.close()
                })
              }}
            >
              <Icon name="reloj" size={16} /> {t('focus.start')}
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
