import { useState } from 'react'

import type { CurrentUser } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { usePoolAccess, poolAllows } from '../../shared/pool'
import { PillGroup } from '../../shared/ui/PillGroup'
import { NetworkPage } from './NetworkPage'
import { SeatsPage } from './SeatsPage'

const VIEWS = ['corrections', 'seats'] as const

type View = (typeof VIEWS)[number]

/**
 * La pestaña Red: la red de correcciones y, al lado, la de asientos
 * (`docs/asientos.md`). Un piscinero empieza por la de asientos: en la piscina
 * hay pocas correcciones y dónde se sienta cada cual dice más.
 */
export function RedPage({ me }: { me: CurrentUser }) {
  const { t } = useI18n()
  const access = usePoolAccess()
  const seats = poolAllows('red.seats', access)
  const [view, setView] = useState<View>(access.pool && seats ? 'seats' : 'corrections')
  const switcher = seats ? (
    <PillGroup
      options={VIEWS}
      value={view}
      onChange={setView}
      kind="tabs"
      label={t('seats.views')}
      text={(option) => t(`seats.view.${option}`)}
    />
  ) : null

  return view === 'seats' && seats ? (
    <SeatsPage switcher={switcher} />
  ) : (
    <NetworkPage me={me} switcher={switcher} />
  )
}
