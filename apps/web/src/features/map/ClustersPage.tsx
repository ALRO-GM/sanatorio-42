import { useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { FacilityForm } from '../facility/FacilityForm'
import { ClustersTour } from './ClustersTour'
import { Show } from '../../shared/detail'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { directChatId, openChat } from '../notices/conversations'
import { ClusterMapView } from './ClusterMapView'
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
      <h2>
        {t('clusters.title')}
        <InfoTip title={t('clusters.title')}>
          <ClustersTour />
        </InfoTip>
      </h2>
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
      {map.loading && <p className="estado">{t('map.loading')}</p>}
      {!map.loading && map.data === undefined && (
        <ErrorNote error={map.error} onRetry={() => void map.reload()} />
      )}

      {map.data !== undefined && (
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
              map={map.data}
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
    </section>
  )
}
