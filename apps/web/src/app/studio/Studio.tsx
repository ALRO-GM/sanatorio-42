import { useState } from 'react'
import type { ReactNode } from 'react'

import { ComfortSettings } from '../../features/settings/ComfortSettings'
import { StudioTour } from '../../features/settings/StudioTour'
import { useI18n } from '../../shared/i18n'
import type { StudioTab } from '../../shared/layout/customize'
import type { OrderMode } from '../../shared/layout/order'
import { resetPrefs, updatePrefs, usePrefs } from '../../shared/layout/store'
import { DetailCards } from '../../shared/ui/DetailSelect'
import { InfoTip } from '../../shared/ui/InfoTip'
import { LangSelect } from '../../shared/ui/LangSelect'
import { Modal } from '../../shared/ui/Modal'
import { PillGroup } from '../../shared/ui/PillGroup'
import type { Section } from '../sections'
import { Miniature } from './Miniature'
import { StylePanel } from './StylePanel'

/** Antelaciones del aviso que se pueden elegir, en minutos. `0` es sin avisos. */
const LEADS = [0, 2, 5, 10, 15, 30, 60] as const

const MODES = ['manual', 'mine', 'community'] as const satisfies readonly OrderMode[]

const TABS = ['style', 'order', 'settings'] as const satisfies readonly StudioTab[]

type StudioProps = {
  /** Quién eres: hay estilos que solo puede elegir su dueña. */
  me: string
  /** La sección abierta detrás: la vista previa empieza en ella. */
  section: Section
  /** La pestaña de opciones con la que se abre. */
  tab: StudioTab
  onClose: () => void
  /** Con qué estilo ven los demás tu perfil (va con el estilo). */
  recordStyle?: ReactNode
}

/**
 * Personalizar: el estudio. Una ventana algo menor que la página, con la web en
 * pequeño a la izquierda (se ordena arrastrando: `Miniature`) y las opciones a
 * la derecha, en tres pestañas: el estilo, el orden y los ajustes. En el móvil
 * ocupa toda la pantalla y las opciones van arriba, encima de la vista previa.
 *
 * Todo se guarda al momento y la página de detrás cambia a la vez; «Listo»
 * solo cierra.
 */
export function Studio({ me, section, tab: initialTab, onClose, recordStyle }: StudioProps) {
  const { t } = useI18n()
  const prefs = usePrefs()
  const [tab, setTab] = useState<StudioTab>(initialTab)
  const [said, setSaid] = useState('')

  return (
    <Modal
      label={t('layout.title')}
      title={
        <>
          {t('layout.title')}
          <InfoTip title={t('layout.title')}>
            <StudioTour />
          </InfoTip>
        </>
      }
      onClose={onClose}
      className="studio"
    >
      {/* Lo que se oye al arrastrar: coger, mover, soltar o cancelar. */}
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {said}
      </p>
      <div className="studio-body">
        <section className="studio-preview">
          <p className="hint">{t('studio.hint')}</p>
          <Miniature start={section} announce={setSaid} />
        </section>

        <section className="studio-panel">
          <PillGroup
            kind="tabs"
            id="studio"
            className="studio-tabs"
            options={TABS}
            value={tab}
            onChange={setTab}
            label={t('layout.title')}
            text={(option) => t(`studio.tab.${option}`)}
          />
          <div
            className="studio-tabpanel"
            role="tabpanel"
            id={`studio-panel-${tab}`}
            aria-labelledby={`studio-tab-${tab}`}
          >
            {tab === 'style' && <StylePanel me={me} recordStyle={recordStyle} />}

            {tab === 'order' && (
              <>
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
                {prefs.mode !== 'manual' && <p className="hint">{t('studio.autoNote')}</p>}
                <button type="button" className="pill" onClick={resetPrefs}>
                  {t('layout.reset')}
                </button>
              </>
            )}

            {tab === 'settings' && (
              <>
                <div className="studio-field">
                  <span>{t('settings.detail')}</span>
                  <DetailCards />
                </div>
                <label className="studio-field">
                  <span>{t('layout.alerts.lead')}</span>
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
                <label className="duty-check">
                  <input
                    type="checkbox"
                    checked={prefs.tips !== false}
                    onChange={(event) => {
                      const tips = event.target.checked

                      updatePrefs((current) => ({ ...current, tips }))
                    }}
                  />
                  {t('layout.tips.show')}
                </label>
                <div className="studio-settings">
                  <LangSelect />
                  <ComfortSettings />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <div className="actions">
        <button type="button" className="primary small" onClick={onClose}>
          {t('layout.done')}
        </button>
      </div>
    </Modal>
  )
}
