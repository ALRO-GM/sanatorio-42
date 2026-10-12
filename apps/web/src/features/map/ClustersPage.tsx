import { useState } from 'react'

import { Chat } from '../alerts/Chat'
import { useThread } from '../alerts/useThread'
import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { ClusterMapView } from './ClusterMapView'

/**
 * El chat de dos personas: un solo id por pareja, con los logins en orden
 * alfabético. Es la misma regla que comprueba la API.
 */
export const directChatId = (a: string, b: string): string => `dm:${[a, b].sort().join(':')}`

type ClustersPageProps = {
  me: string
  /** Con quién abrir el chat al llegar (desde un aviso o un enlace). */
  initialPeer: string | null
}

/**
 * Los clusters del campus, sin proyecto de por medio: quién está sentado dónde
 * y quién de ellos tiene Sanatorio abierto. A cualquiera se le puede escribir;
 * si la tiene abierta lo verá en el momento, y si no, cuando entre.
 */
export function ClustersPage({ me, initialPeer }: ClustersPageProps) {
  const { t } = useI18n()
  const map = useAsync(() => api.getCampusMap(), [])
  const chats = useAsync(() => api.getChats(), [])
  const [peer, setPeer] = useState<string | null>(
    initialPeer === null || initialPeer === me ? null : initialPeer,
  )

  const seated = map.data?.clusters.flatMap((cluster) => cluster.seats) ?? []
  const online = seated.filter((seat) => seat.occupant?.online === true).length
  const occupied = seated.filter((seat) => seat.occupant !== null).length
  const peerOnline =
    seated.some((seat) => seat.occupant?.login === peer && seat.occupant.online) ||
    chats.data?.some((chat) => chat.login === peer && chat.online) === true

  return (
    <section>
      <h2>{t('clusters.title')}</h2>
      {map.loading && <p className="estado">{t('map.loading')}</p>}
      {!map.loading && map.data === undefined && (
        <ErrorNote error={map.error} onRetry={() => void map.reload()} />
      )}

      {map.data !== undefined && (
        <>
          <p className="clusters-count" role="status">
            <span className="seat-online sample" /> {t('clusters.count', { online, occupied })}
          </p>
          <div className="card">
            <ClusterMapView
              map={map.data}
              legend={['online', 'occupied', 'reserved', 'free']}
              onChat={(login) => {
                setPeer(login)
              }}
            />
          </div>
        </>
      )}

      {peer !== null && (
        <article className="card direct-chat">
          <div className="card-head">
            <span className="seat-person">
              <Avatar login={peer} image={null} size={28} />
              <strong>{peer}</strong>
              {peerOnline && <span className="badge on">{t('clusters.online')}</span>}
            </span>
            <button
              type="button"
              className="link"
              aria-label={t('layout.close')}
              onClick={() => {
                setPeer(null)
                void chats.reload()
              }}
            >
              <Icon name="cerrar" />
            </button>
          </div>
          <DirectThread key={peer} me={me} peer={peer} />
        </article>
      )}

      <article className="card">
        <span className="eyebrow">{t('clusters.chats')}</span>
        {chats.data?.length === 0 && <p className="estado">{t('clusters.noChats')}</p>}
        <ul className="rows">
          {(chats.data ?? []).map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                className={`row plain direct-row ${chat.login === peer ? 'active' : ''}`}
                onClick={() => {
                  setPeer(chat.login)
                }}
              >
                <Avatar login={chat.login} image={chat.image} size={28} />
                <span>
                  <strong>{chat.login}</strong>
                  {chat.online && <span className="seat-online sample" />}
                  <small>
                    {chat.lastFrom === me ? `${t('map.you')}: ` : ''}
                    {chat.last ?? '…'}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}

/** El hilo con una persona: el mismo chat de los eventos, con su id de pareja. */
function DirectThread({ me, peer }: { me: string; peer: string }) {
  const thread = useThread(directChatId(me, peer))

  return <Chat thread={thread} me={me} direct />
}
