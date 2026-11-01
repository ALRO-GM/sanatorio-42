import { useEffect, useMemo, useState } from 'react'

import type {
  CollectionGroup,
  CollectionRarity,
  CorrectionCollection,
  HolyGraph,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { Show, shows, useDetail } from '../../shared/detail'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { PillGroup } from '../../shared/ui/PillGroup'
import { RankingList, withMe } from '../../shared/ui/RankingList'
import {
  CORRECTION_TIERS,
  albumOf,
  goalsOf,
  newlyComplete,
  progressOf,
  rarityTierOf,
  toNextTier,
} from './corrections'
import type { AlbumCard, AlbumSet } from './corrections'

type CorrectionGraphProps = {
  graph: HolyGraph
  selected: number | null
  onSelect: (projectId: number) => void
}

/** Dónde se recuerda qué sets ya estaban completos, para celebrar solo lo nuevo. */
const SEEN_KEY = 'sanatorio_album_sets'

function readSeen(kind: string): number[] | null {
  try {
    const stored = localStorage.getItem(`${SEEN_KEY}_${kind}`)
    const parsed: unknown = stored === null ? null : JSON.parse(stored)

    return Array.isArray(parsed)
      ? parsed.filter((one): one is number => typeof one === 'number')
      : null
  } catch {
    return null
  }
}

function writeSeen(kind: string, circles: number[]): void {
  try {
    localStorage.setItem(`${SEEN_KEY}_${kind}`, JSON.stringify(circles))
  } catch {
    // Sin almacenamiento no se celebra nada: no pasa nada más.
  }
}

/**
 * «Mis correcciones» del tablón: el álbum de correcciones
 * (`docs/correcciones-coleccion.md`). Cada proyecto que puedes corregir es un
 * cromo y los de un círculo, una colección; los que te faltan salen en
 * silueta y los que aún no has aprobado, con candado. El nivel de cada cromo
 * son las veces que lo has corregido (1, 3, 5 y 10).
 *
 * En el simplificado, solo el álbum y tu progreso; desde el normal, el
 * siguiente objetivo y cómo vas frente a otra gente; en el de datos, además, la
 * rareza de cada cromo y las clasificaciones abiertas.
 */
export function CorrectionGraph({ graph, selected, onSelect }: CorrectionGraphProps) {
  const { t, tn } = useI18n()
  const detail = useDetail()
  const extras = shows(detail, 'normal')
  const [group, setGroup] = useState<CollectionGroup>('friends')
  // La rareza y los puestos solo se piden si se van a enseñar.
  const collection = useAsync(
    () => (extras ? api.getCorrectionCollection(group) : Promise.resolve(null)),
    [extras, group],
  )
  const sets = useMemo(() => albumOf(graph), [graph])
  const progress = progressOf(sets)
  const rarity = collection.data?.rarity ?? []
  const goals = goalsOf(sets, rarity)
  const master = progress.tiers[CORRECTION_TIERS.length - 1] ?? 0
  const [celebrating, setCelebrating] = useState<number[]>([])

  // Al completar una colección, se celebra una vez (y se recuerda que se vio).
  useEffect(() => {
    const complete = sets.filter((set) => set.complete).map((set) => set.circle)
    const fresh = newlyComplete(sets, readSeen(graph.kind))

    // Solo se enciende: en desarrollo el efecto corre dos veces, y la segunda
    // ya lo ve guardado.
    if (fresh.length > 0) setCelebrating(fresh)
    writeSeen(graph.kind, complete)
  }, [sets, graph.kind])

  const setName = (circle: number): string =>
    graph.kind === 'piscine'
      ? t(circle === 0 ? 'piscine.progress' : 'piscine.apart')
      : t('graph.circle', { n: circle })
  const pct = (share: number): string => t('cgraph.pct', { pct: Math.round(share * 100) })

  return (
    <div className="card correction-album">
      <header className="album-head">
        <ProgressRing share={progress.share} label={pct(progress.share)} />
        <div className="album-summary">
          <span className="eyebrow">{t('cgraph.album')}</span>
          <strong className="album-count">
            {progress.total === 0
              ? t('cgraph.empty')
              : tn('cgraph.progress', progress.total, { owned: progress.owned })}
          </strong>
          {progress.sets > 0 && (
            <span className="album-sets-done">
              <Icon name="trofeo" size={14} />{' '}
              {tn('cgraph.sets', progress.sets, { done: progress.completeSets })}
            </span>
          )}
          <ul className="album-levels" aria-label={t('cgraph.levels')}>
            {CORRECTION_TIERS.map((goal, index) => (
              <li key={goal}>
                <span className={`album-pip tier-${index + 1}`} aria-hidden="true" />
                {t(`cgraph.level${index + 1}`, { n: goal })} · {progress.tiers[index] ?? 0}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {master > 0 && (
        <p className="album-master">
          <Icon name="chispa" size={13} /> {tn('cgraph.master', master)}
        </p>
      )}

      {celebrating.length > 0 && (
        <p className="album-celebrate" role="status">
          <Icon name="medalla" size={16} />{' '}
          {t('cgraph.celebrate', { set: celebrating.map(setName).join(' · ') })}
        </p>
      )}

      <Show from="normal">
        {collection.data === undefined && !collection.loading ? (
          <ErrorNote error={collection.error} onRetry={() => void collection.reload()} />
        ) : (
          <div className="album-extras">
            <Goals
              goals={goals}
              done={progress.total > 0 && progress.owned === progress.total}
              setName={setName}
              pct={pct}
              onSelect={onSelect}
            />
            {collection.data !== null && collection.data !== undefined && (
              <Standings data={collection.data} />
            )}
          </div>
        )}
      </Show>

      <ul className="album-legend">
        <li>
          <span className="album-swatch owned" aria-hidden="true" /> {t('cgraph.legend.owned')}
        </li>
        <li>
          <span className="album-swatch missing" aria-hidden="true" /> {t('cgraph.legend.missing')}
        </li>
        <li>
          <Icon name="candado" size={12} /> {t('cgraph.legend.locked')}
        </li>
      </ul>

      <ol className="album-sets">
        {sets.map((set) => (
          <AlbumSetView
            key={set.circle}
            set={set}
            name={setName(set.circle)}
            celebrate={celebrating.includes(set.circle)}
            selected={selected}
            rarity={rarity}
            pct={pct}
            onSelect={onSelect}
          />
        ))}
      </ol>

      <Show from="datos">
        {collection.data !== null && collection.data !== undefined && (
          <Ranking data={collection.data} group={group} onGroup={setGroup} pct={pct} />
        )}
      </Show>
    </div>
  )
}

/** El progreso total en un anillo: se lee de un vistazo, sin números de más. */
function ProgressRing({ share, label }: { share: number; label: string }) {
  const radius = 30
  const length = 2 * Math.PI * radius

  return (
    <div className="album-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle className="album-ring-track" cx="36" cy="36" r={radius} />
        <circle
          className="album-ring-fill"
          cx="36"
          cy="36"
          r={radius}
          strokeDasharray={`${String(length * share)} ${String(length)}`}
        />
      </svg>
      <span>{label}</span>
    </div>
  )
}

type SetProps = {
  set: AlbumSet
  name: string
  celebrate: boolean
  selected: number | null
  rarity: readonly CollectionRarity[]
  pct: (share: number) => string
  onSelect: (projectId: number) => void
}

/** Una colección (un círculo): su barra, lo que le falta y sus cromos. */
function AlbumSetView({ set, name, celebrate, selected, rarity, pct, onSelect }: SetProps) {
  const { t, tn } = useI18n()
  const missing = set.total - set.owned
  const share = set.total === 0 ? 0 : set.owned / set.total

  return (
    <li
      className={`album-set ${set.complete ? 'complete' : ''} ${celebrate ? 'celebrate' : ''}`.trim()}
    >
      <header className="album-set-head">
        <strong>{name}</strong>
        <span className="album-set-count">
          {set.total === 0
            ? t('cgraph.set.later')
            : set.complete
              ? t('cgraph.set.complete')
              : tn('cgraph.set.missing', missing)}
        </span>
        {set.total > 0 && (
          <span
            className="album-bar"
            role="progressbar"
            aria-label={name}
            aria-valuemin={0}
            aria-valuemax={set.total}
            aria-valuenow={set.owned}
          >
            <span style={{ width: `${String(share * 100)}%` }} />
          </span>
        )}
        {set.total > 0 && (
          <small>
            {set.owned}/{set.total}
          </small>
        )}
      </header>
      <div className="album-grid">
        {set.cards.map((card) => (
          <Card
            key={card.projectId}
            card={card}
            selected={card.projectId === selected}
            rarity={rarity.find((one) => one.projectId === card.projectId)}
            pct={pct}
            onSelect={onSelect}
          />
        ))}
      </div>
    </li>
  )
}

type CardProps = {
  card: AlbumCard
  selected: boolean
  rarity: CollectionRarity | undefined
  pct: (share: number) => string
  onSelect: (projectId: number) => void
}

/** Un cromo: nombre, veces, los cuatro niveles en puntos y, en el de datos, su rareza. */
function Card({ card, selected, rarity, pct, onSelect }: CardProps) {
  const { t, tn } = useI18n()
  const rare = rarityTierOf(rarity)
  const next = card.state === 'owned' ? toNextTier(card.corrected) : null
  const title =
    card.state === 'locked'
      ? t('cgraph.future', { name: card.name })
      : card.state === 'missing'
        ? t('cgraph.card.missing', { name: card.name })
        : [
            tn('cgraph.times', card.corrected, { name: card.name }),
            next === null ? null : tn('cgraph.card.next', next),
          ]
            .filter((part) => part !== null)
            .join(' · ')

  return (
    <button
      type="button"
      className={`album-card ${card.state} tier-${String(card.tier)} ${selected ? 'selected' : ''}`.trim()}
      title={title}
      aria-label={title}
      onClick={() => {
        onSelect(card.projectId)
      }}
    >
      <span className="album-card-pips" aria-hidden="true">
        {CORRECTION_TIERS.map((goal, index) => (
          <span key={goal} className={card.tier > index ? 'on' : ''} />
        ))}
      </span>
      <strong>{card.short}</strong>
      <small>
        {card.state === 'owned' ? (
          `×${String(card.corrected)}`
        ) : card.state === 'missing' ? (
          t('cgraph.legend.missing')
        ) : (
          <Icon name="candado" size={12} />
        )}
      </small>
      <Show from="datos">
        {rare !== null && card.state !== 'locked' && rarity !== undefined && (
          <span
            className={`album-rarity ${rare}`}
            title={t('cgraph.rarity.share', { pct: pct(rarity.share) })}
          >
            {t(`cgraph.rarity.${rare}`)}
          </span>
        )}
      </Show>
    </button>
  )
}

type GoalsProps = {
  goals: ReturnType<typeof goalsOf>
  done: boolean
  setName: (circle: number) => string
  pct: (share: number) => string
  onSelect: (projectId: number) => void
}

/** El siguiente objetivo: lo más cercano, no lo más grande (gradiente de meta). */
function Goals({ goals, done, setName, pct, onSelect }: GoalsProps) {
  const { t, tn } = useI18n()
  const { closestSet, rarest, nextLevel } = goals

  if (closestSet === null && rarest === null && nextLevel === null && !done) return null

  return (
    <section className="album-goals" aria-label={t('cgraph.goals')}>
      <span className="eyebrow">{t('cgraph.goals')}</span>
      <ul>
        {done && (
          <li>
            <Icon name="trofeo" size={14} /> {t('cgraph.goal.done')}
          </li>
        )}
        {closestSet !== null && (
          <li>
            <Icon name="lupa" size={14} />{' '}
            {tn('cgraph.goal.set', closestSet.missing.length, {
              set: setName(closestSet.circle),
              names: closestSet.missing.map((card) => card.short).join(', '),
            })}{' '}
            <GoTo projectId={closestSet.missing[0]?.projectId} onSelect={onSelect} />
          </li>
        )}
        {rarest !== null && (
          <li>
            <Icon name="estrella" size={14} />{' '}
            {t('cgraph.goal.rare', { name: rarest.card.name, pct: pct(rarest.share) })}{' '}
            <GoTo projectId={rarest.card.projectId} onSelect={onSelect} />
          </li>
        )}
        {nextLevel !== null && (
          <li>
            <Icon name="chispa" size={14} />{' '}
            {tn('cgraph.goal.level', nextLevel.needed, {
              name: nextLevel.card.name,
              level: t(`cgraph.level${String(nextLevel.card.tier + 1)}`, {
                n: CORRECTION_TIERS[nextLevel.card.tier] ?? 0,
              }),
            })}
          </li>
        )}
      </ul>
    </section>
  )
}

function GoTo({
  projectId,
  onSelect,
}: {
  projectId: number | undefined
  onSelect: (projectId: number) => void
}) {
  const { t } = useI18n()

  if (projectId === undefined) return null

  return (
    <button
      type="button"
      className="link-button"
      onClick={() => {
        onSelect(projectId)
      }}
    >
      {t('cgraph.goal.open')}
    </button>
  )
}

/** El nombre de un grupo, con su etiqueta si la tiene (el kickoff, el círculo). */
function useGroupName(): (group: CollectionGroup, label: string | null) => string {
  const { t } = useI18n()

  return (group, label) =>
    group === 'kickoff' && label !== null
      ? t('cgraph.group.kickoffOf', { month: label })
      : group === 'circle' && label !== null
        ? t('graph.circle', { n: Number(label) })
        : t(`cgraph.group.${group}`)
}

/** Cómo vas en cada grupo, en una línea por grupo (el resumen del normal). */
function Standings({ data }: { data: CorrectionCollection }) {
  const { t } = useI18n()
  const groupName = useGroupName()

  if (data.standings.length === 0) return null

  return (
    <section className="album-standings" aria-label={t('cgraph.compare')}>
      <span className="eyebrow">{t('cgraph.compare')}</span>
      <ul>
        {data.standings.map((standing) => (
          <li key={standing.group}>
            <span>{groupName(standing.group, standing.label)}</span>
            <strong>
              {standing.rank === null
                ? t('cgraph.rank.none')
                : t('cgraph.rank', { rank: standing.rank, size: standing.size })}
            </strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

type RankingProps = {
  data: CorrectionCollection
  group: CollectionGroup
  onGroup: (group: CollectionGroup) => void
  pct: (share: number) => string
}

/** La clasificación de completitud del grupo elegido (modo de datos). */
function Ranking({ data, group, onGroup, pct }: RankingProps) {
  const { t } = useI18n()
  const groupName = useGroupName()
  const me = data.me?.login ?? ''
  const rows = withMe(data.rows, data.me)

  return (
    <section className="album-ranking" aria-label={t('cgraph.ranking')}>
      <h3>{t('cgraph.ranking')}</h3>
      <PillGroup
        kind="tabs"
        options={data.standings.map((standing) => standing.group)}
        value={group}
        onChange={onGroup}
        label={t('cgraph.ranking.groups')}
        text={(option) =>
          groupName(option, data.standings.find((one) => one.group === option)?.label ?? null)
        }
      />
      {rows.length === 0 ? (
        <p className="estado">{t('cgraph.ranking.empty')}</p>
      ) : (
        <RankingList
          rows={rows}
          me={me}
          label={t('cgraph.ranking')}
          value={(row) => (
            <span className="album-ranking-value">
              {row.collected}/{row.eligible} · <strong>{pct(row.share)}</strong>
            </span>
          )}
        />
      )}
    </section>
  )
}
