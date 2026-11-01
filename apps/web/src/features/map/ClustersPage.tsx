import { useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Async } from '../../shared/ui/Async'
import { Icon } from '../../shared/ui/Icon'
import { SectionTitle } from '../../shared/ui/SectionTitle'
import { FacilityForm } from '../facility/FacilityForm'
import { ClustersTour } from './ClustersTour'
import { Show } from '../../shared/detail'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { directChatId, openChat } from '../notices/conversations'
import { ClusterMapView } from './ClusterMapView'
import { SeatHeatCard } from './SeatHeatCard'
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { usePoolAllows } from '../../shared/pool'

/**
 * Los clusters del campus, sin proyecto de por medio: quién está sentado dónde
 * y quién de ellos tiene Sanatorio abierto. A cualquiera se le puede escribir:
 * la conversación se abre en el buzón, que es donde viven todas.
 */
export function ClustersPage({ me }: { me: string }) {
  const [reporting, setReporting] = useState(false)
  const { t, tn } = useI18n()
  const marking = useAction()
  const map = useAsync(() => api.getCampusMap(), [])

  const seated = map.data?.clusters.flatMap((cluster) => cluster.seats) ?? []
  // Un piscinero, solo lo que permite el panel (`docs/piscineros.md`).
  const report = usePoolAllows('clusters.report')
  const broken = usePoolAllows('clusters.broken')
  const online = seated.filter((seat) => seat.occupant?.online === true).length
  const occupied = seated.filter((seat) => seat.occupant !== null || seat.taken).length

  return (
    <section>
      <SectionTitle title={t('clusters.title')}>
        <ClustersTour />
      </SectionTitle>
      {!report ? null : reporting ? (
        <FacilityForm
          onDone={() => {
            setReporting(false)
          }}
        />
      ) : (
        <button
          type="button"
          className="pill facility-open"
          onClick={() => {
            setReporting(true)
          }}
        >
          <Icon name="aviso" size={14} /> {t('facility.open')}
        </button>
      )}
      <Async state={map} loadingText={t('map.loading')}>
        {(campus) => (
          <>
            <Show from="datos">
              <PoolOnly k="clusters.online">
                <p className="clusters-count" role="status">
                  <span className="seat-online sample" />{' '}
                  {tn('clusters.count', occupied, { online, occupied })}
                </p>
              </PoolOnly>
            </Show>
            <div className="card" data-feedback="clusters.map">
              <ClusterMapView
                map={campus}
                legend={['online', 'occupied', 'reserved', 'free', 'broken']}
                onBroken={
                  !broken
                    ? undefined
                    : (host, isBroken) => {
                        // Si falla, se dice (antes se callaba y parecía que no hacía nada).
                        void marking
                          .run(() =>
                            isBroken ? api.reportBrokenSeat(host) : api.clearBrokenSeat(host),
                          )
                          .then((done) => (done ? map.reload() : undefined))
                      }
                }
                onChat={(login) => {
                  openChat(directChatId(me, login))
                }}
              />
              <ErrorNote error={marking.error} />
            </div>
          </>
        )}
      </Async>
      {/* Debajo del plano, cuánto se usa cada ordenador (antes en Amigos). */}
      <SeatHeatCard />
    </section>
  )
}
