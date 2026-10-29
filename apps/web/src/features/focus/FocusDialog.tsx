import { useEffect, useRef, useState } from 'react'

import type { FocusSettings, FocusShow } from '@sanatorio/contracts'

import { SECTIONS } from '../../app/sections'
import { Show } from '../../shared/detail'
import { startFocus, useFocus } from '../../shared/focus'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { StepPicker } from '../../shared/ui/StepPicker'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'
import { FocusMyStats } from './FocusMyStats'
import { StartupPanel } from './startup/StartupPanel'
import { usePoolAllows } from '../../shared/pool'

/**
 * Lo que se puede estar concentrado: de 5 en 5 minutos hasta 4 horas, en una
 * rueda que se desliza opción a opción (pedido por Alberto, 2026-10-27).
 */
const FOCUS_MINUTES: readonly number[] = Array.from({ length: 48 }, (_, index) => (index + 1) * 5)
/** El descanso, en la misma rueda: sin descanso, 5, 10 o 15 minutos. */
const BREAK_MINUTES: readonly number[] = [0, 5, 10, 15]
const SHOWS: readonly FocusShow[] = ['corrections', 'events', 'messages', 'guard', 'notices']
/** Las secciones que se pueden dejar a la vista (las de las pestañas; el expediente, siempre). */
const CHOOSABLE = SECTIONS.filter((section) => section.inNav).map((section) => section.id)

const TABS = ['settings', 'startup', 'stats'] as const

/**
 * El Pomodoro en una ventana (desde el menú de la cuenta): el panel de abajo,
 * que se cierra al empezar.
 */
export function FocusDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const [wide, setWide] = useState(false)

  return (
    <Modal
      ref={dialog}
      label={t('focus.title')}
      className={`focus-dialog ${wide ? 'wide' : ''}`}
      onClose={onClose}
      title={
        <>
          <Icon name="reloj" /> {t('focus.title')}
        </>
      }
    >
      <FocusPanel
        onStarted={() => {
          dialog.current?.close()
        }}
        onWide={setWide}
      />
    </Modal>
  )
}

/**
 * El Pomodoro como pestaña de Aprender (reorganización del 2026-10-29): el
 * mismo panel, en la página.
 */
export function FocusPage() {
  const { t } = useI18n()

  return (
    <section className="focus-page">
      <h2>
        <Icon name="reloj" /> {t('focus.title')}
      </h2>
      <FocusPanel />
    </section>
  )
}

/**
 * El Pomodoro: cuánto concentrarse y descansar, qué secciones dejar en las
 * pestañas y qué avisos seguir recibiendo. Lo demás (juegos, otros avisos) se
 * silencia, y los demás ven «concentrado, no me distraigas».
 *
 * En las otras pestañas, la Startup y tus estadísticas (#80 del buzón); son
 * cifras, así que salen desde el modo normal.
 *
 * @param onStarted Al empezar (la ventana se cierra).
 * @param onWide Si la pestaña abierta necesita más ancho (la ventana se ensancha).
 */
function FocusPanel({
  onStarted,
  onWide,
}: {
  onStarted?: () => void
  onWide?: (wide: boolean) => void
}) {
  const { t } = useI18n()
  const focus = useFocus()
  const [settings, setSettings] = useState<FocusSettings>(
    () =>
      focus?.settings ?? {
        focusMinutes: 25,
        breakMinutes: 5,
        sections: ['calendario'],
        show: ['corrections', 'events'],
      },
  )
  const { busy, error, run } = useAction()
  const stats = usePoolAllows('focus.stats')
  const [tab, setTab] = useState<(typeof TABS)[number]>('settings')

  useEffect(() => {
    onWide?.(tab !== 'settings')
  }, [tab, onWide])

  const toggle = <T extends string>(list: readonly T[], item: T): T[] =>
    list.includes(item) ? list.filter((one) => one !== item) : [...list, item]

  return (
    <>
      <Show from="normal">
        <PillGroup
          kind="tabs"
          className="sub-tabs"
          options={stats ? TABS : TABS.filter((each) => each !== 'stats')}
          value={tab}
          onChange={setTab}
          label={t('focus.title')}
          text={(option) => t(`focus.tab.${option}`)}
        />
      </Show>
      {tab === 'stats' && stats && <FocusMyStats />}
      {tab === 'startup' && <StartupPanel />}
      {tab === 'settings' && (
        <>
          <p className="hint">{t('focus.pitch')}</p>

          <div className="form-grid">
            <StepPicker
              className="focus-minutes"
              variant="wheel"
              options={FOCUS_MINUTES}
              value={settings.focusMinutes}
              onChange={(focusMinutes) => {
                setSettings({ ...settings, focusMinutes })
              }}
              label={t('focus.minutes')}
              text={(minutes) => t('focus.minutesN', { n: minutes })}
            />
            <StepPicker
              className="focus-minutes"
              variant="wheel"
              options={BREAK_MINUTES}
              value={settings.breakMinutes}
              onChange={(breakMinutes) => {
                setSettings({ ...settings, breakMinutes })
              }}
              label={t('focus.break')}
              text={(minutes) =>
                minutes === 0 ? t('focus.noBreak') : t('focus.minutesN', { n: minutes })
              }
            />
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
                  onStarted?.()
                })
              }}
            >
              <Icon name="reloj" size={16} /> {t('focus.start')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
