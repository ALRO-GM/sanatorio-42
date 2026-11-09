import { useState } from 'react'
import type { ReactNode } from 'react'

import type { StartupSnapshot } from '@sanatorio/contracts'
import {
  ITEMS,
  MILESTONE_RULES,
  NAME_MAX,
  REROLL_COST,
  ROUNDS,
  ROUND_RULES,
  SPACES,
  canLegacy,
  candidatesOf,
  cashOf,
  focusOf,
  has,
  levelOf,
  lockedOf,
  moodOf,
  nextMilestone,
  nextRound,
  parseStartup,
  priceOf,
  rateOf,
  seatsOf,
  seeded,
  skillOf,
  spaceOf,
  valuationOf,
} from '@sanatorio/startup'
import type { Item, ItemKind, StartupAction, StartupState } from '@sanatorio/startup'

import { api } from '../../../shared/api'
import { useAction, useAsync } from '../../../shared/hooks/useAsync'
import { useI18n } from '../../../shared/i18n'
import { useFormat } from '../../../shared/i18n/useFormat'
import { Async } from '../../../shared/ui/Async'
import { ErrorNote } from '../../../shared/ui/ErrorNote'
import { Icon } from '../../../shared/ui/Icon'
import { AxisGlyph } from './art/AxisGlyph'
import { Card, Figure, Need, Dots, coins, hm } from './parts'
import { ItemArt } from './pixel/ItemArt'
import type { ArtOf } from './pixel/ItemArt'
import type { ModelId } from './pixel/models'
import { PixelScene } from './pixel/PixelScene'
import { DecorEditor, DecorShop, Staff, Surprise } from './World'
import { putAction } from './target'
import type { Target } from './target'

/** El aspecto de quien funda la startup: un número fijo sacado de su login. */
export const lookOf = (login: string): number => Math.floor(seeded(`${login}|look`)() * 1000)

/** El dibujo de los productos y de lo del edificio: un modelo de la oficina que los recuerda. */
const ART_OF: Record<string, { model: ModelId; level?: number }> = {
  'product-bot': { model: 'robot' },
  'product-web': { model: 'workstation', level: 2 },
  'product-api': { model: 'rack', level: 2 },
  'product-insights': { model: 'dashboard' },
  'product-assistant': { model: 'neon' },
  'product-cloud': { model: 'rack', level: 5 },
  floors: { model: 'building', level: 4 },
  basement: { model: 'rack', level: 6 },
  solar: { model: 'lamp' },
  rooftop: { model: 'tree' },
}

/** El dibujo de una pieza del catálogo en el nivel que se compraría. */
function artOf(item: Item, level: number): ArtOf {
  if (item.kind === 'learn' && item.axis !== null) return { kind: 'learn', axis: item.axis }
  if (item.kind === 'gear') return { kind: 'computer', level: level + 1 }
  if (item.kind === 'space') return { kind: 'space', level: level + 1 }
  if (item.kind === 'servers') return { kind: 'servers', level: level + 1 }

  const art = ART_OF[item.id] ?? { model: 'books' }

  return { kind: 'model', model: art.model, props: { level: art.level ?? level + 1 } }
}

/** Las tiendas: mejoras (aprender, ordenador, espacio, servidores), productos y edificio. */
const SHOPS: readonly { label: string; kinds: readonly ItemKind[] }[] = [
  { label: 'startup.shop', kinds: ['learn', 'gear', 'space', 'servers'] },
  { label: 'startup.products', kinds: ['product'] },
  { label: 'startup.building', kinds: ['building'] },
]

/**
 * La startup del Pomodoro (`docs/pomodoro-startup.md`): cada minuto de
 * concentración se gasta en construirla, del garaje al control global, y se
 * compara con la de los demás. Casi sin texto: dibujos, iconos y cifras.
 */
export function StartupPanel() {
  const startup = useAsync(() => api.getStartup(), [])
  const ranking = useAsync(() => api.getStartupRanking(), [])
  const action = useAction()

  return (
    <Async state={startup}>
      {(data) => {
        const run = async (next: StartupAction): Promise<boolean> => {
          // La partida que devuelve la API es la que manda: se pinta tal cual.
          const done = await action.run(async () => {
            startup.setData(await api.startupAction(next))
          })

          if (done) void ranking.reload()

          return done
        }

        return (
          <Game
            snapshot={data}
            busy={action.busy}
            onAct={run}
            error={<ErrorNote error={action.error} />}
            ranking={ranking.data ?? []}
          />
        )
      }}
    </Async>
  )
}

function Game({
  snapshot,
  busy,
  onAct,
  error,
  ranking,
}: {
  snapshot: StartupSnapshot
  busy: boolean
  onAct: (action: StartupAction) => Promise<boolean>
  error: ReactNode
  ranking: Awaited<ReturnType<typeof api.getStartupRanking>>
}) {
  const { t } = useI18n()
  const { compact } = useFormat()
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Target | null>(null)
  const [visiting, setVisiting] = useState<string | null>(null)
  const state = parseStartup(snapshot.state)
  const act = (next: StartupAction): void => void onAct(next)
  const balance = snapshot.earnedMinutes - state.spent
  const hours = snapshot.earnedMinutes / 60
  const cash = cashOf(state, snapshot.earnedMinutes)
  const focus = focusOf(state)

  return (
    <section className="su-panel" aria-label={t('startup.title')}>
      {visiting !== null ? (
        <Visit
          login={visiting}
          onClose={() => {
            setVisiting(null)
          }}
        />
      ) : (
        <PixelScene
          state={state}
          me={lookOf(snapshot.login)}
          editing={
            editing
              ? {
                  selected,
                  onSelect: setSelected,
                  onDrop: (target, gx, gy) => {
                    act(putAction(state, target, gx, gy))
                  },
                }
              : undefined
          }
        />
      )}

      <div className="su-figures">
        <Figure icon="reloj" label={t('startup.balance')} value={hm(balance)} strong />
        <Figure icon="coin" label={t('startup.cash')} value={coins(cash, compact)} strong />
        <Figure icon="despegue" label={t('startup.rate')} value={`+${String(rateOf(state))}`} />
        <Figure icon="trofeo" label={t('startup.hours')} value={hm(snapshot.earnedMinutes)} />
        <Figure
          icon="estrella"
          label={t('startup.valuation')}
          value={compact(valuationOf(state))}
        />
        <Figure
          icon="persona"
          label={t('startup.team')}
          value={`${String(state.team.length + 1)}/${String(seatsOf(state) + 1)}`}
        />
        <Figure icon="corazon" label={t('startup.mood')} value={`×${String(moodOf(state))}`} />
        {focus !== null && (
          <span className="su-figure" title={t(`startup.axis.${focus}`)}>
            <AxisGlyph axis={focus} />
          </span>
        )}
        {visiting === null && (
          <button
            type="button"
            className={`small su-edit ${editing ? 'on' : ''}`.trim()}
            aria-pressed={editing}
            aria-label={t('startup.edit')}
            title={t('startup.edit')}
            onClick={() => {
              setEditing(!editing)
              setSelected(null)
            }}
          >
            <Icon name="agarrar" size={16} />
          </button>
        )}
      </div>
      {error}

      {editing && (
        <DecorEditor
          state={state}
          selected={selected}
          onSelect={setSelected}
          busy={busy}
          onAct={onAct}
        />
      )}

      <Surprise
        login={snapshot.login}
        state={state}
        sessions={snapshot.longSessions}
        busy={busy}
        onAct={onAct}
      />
      <Milestone state={state} hours={hours} balance={balance} busy={busy} onAct={act} />
      {canLegacy(state) && <Legacy busy={busy} onAct={act} />}

      {SHOPS.map((shop) => {
        // Lo del edificio, solo cuando ya se ve venir (desde la oficina grande).
        if (shop.kinds.includes('building') && spaceOf(state) < 3) return null

        return (
          <div key={shop.label} className="su-grid" role="group" aria-label={t(shop.label)}>
            {ITEMS.filter((item) => shop.kinds.includes(item.kind)).map((item) => {
              const level = levelOf(state, item.id)
              const price = priceOf(state, item)
              const paid = item.currency === 'cash' ? cash : balance

              return (
                <Card
                  key={item.id}
                  art={artOf(item, level)}
                  label={labelOf(item, level, t)}
                  cost={price}
                  cash={item.currency === 'cash'}
                  locked={lockedOf(state, item)}
                  affordable={price !== null && price <= paid}
                  busy={busy}
                  onClick={() => {
                    act({ type: 'buy', item: item.id })
                  }}
                >
                  <Dots level={level} of={item.costs.length} />
                </Card>
              )
            })}
          </div>
        )
      })}

      {has(state, 'mvp') && (
        <Hiring login={snapshot.login} state={state} balance={balance} busy={busy} onAct={act} />
      )}
      <Staff state={state} cash={cash} busy={busy} onAct={onAct} />
      <DecorShop state={state} cash={cash} busy={busy} onAct={onAct} />
      {has(state, 'founded') && (
        <NextRound state={state} hours={hours} balance={balance} busy={busy} onAct={act} />
      )}
      <Ranking
        rows={ranking}
        me={snapshot.login}
        onVisit={(login) => {
          setEditing(false)
          setVisiting(login === snapshot.login ? null : login)
        }}
      />
    </section>
  )
}

/** El nombre accesible de una tarjeta del catálogo: el espacio, por el sitio al que se va. */
function labelOf(
  item: Item,
  level: number,
  t: (key: string, vars?: Record<string, string>) => string,
): string {
  if (item.kind === 'learn' && item.axis !== null) {
    return t('startup.item.learn', { axis: t(`startup.axis.${item.axis}`) })
  }
  if (item.kind === 'gear') return t('startup.item.gear')
  if (item.kind === 'space') {
    const next = SPACES[level + 1]

    return next === undefined ? t('startup.item.space') : t(`startup.space.${next}`)
  }

  return t(`startup.item.${item.id}`)
}

/**
 * Terminar la partida (control global y el edificio entero) y volver a tu
 * cuarto con lo que se conserva. Pide pulsar dos veces: no tiene vuelta atrás.
 */
function Legacy({ busy, onAct }: { busy: boolean; onAct: (action: StartupAction) => void }) {
  const { t } = useI18n()
  const [armed, setArmed] = useState(false)
  const label = armed ? t('startup.legacy.sure') : t('startup.legacy')

  return (
    <div className="su-milestone su-legacy">
      <ItemArt art={{ kind: 'model', model: 'rocket' }} size={56} />
      <button
        type="button"
        className={`small su-go ${armed ? 'primary' : ''}`.trim()}
        aria-label={label}
        title={label}
        disabled={busy}
        onClick={() => {
          if (armed) onAct({ type: 'legacy' })
          setArmed(!armed)
        }}
      >
        <Icon name={armed ? 'hecho' : 'despegue'} size={16} />
      </button>
    </div>
  )
}

/** La oficina de otra persona del ranking, para ir a verla; y volver a la tuya. */
function Visit({ login, onClose }: { login: string; onClose: () => void }) {
  const { t } = useI18n()
  const { data, error } = useAsync(() => api.getStartupOffice(login), [login])

  return (
    <div className="su-visit">
      <button
        type="button"
        className="small su-visit-close"
        aria-label={t('startup.visit.close')}
        title={t('startup.visit.close')}
        onClick={onClose}
      >
        <Icon name="atras" size={16} />
        <span>{login}</span>
      </button>
      {data !== undefined ? (
        <PixelScene state={parseStartup(data.state)} me={lookOf(login)} />
      ) : (
        <ErrorNote error={error} />
      )}
    </div>
  )
}

/** El siguiente hito: el proyecto, el MVP, fundar (con nombre) o el control global. */
function Milestone({
  state,
  hours,
  balance,
  busy,
  onAct,
}: {
  state: StartupState
  hours: number
  balance: number
  busy: boolean
  onAct: (action: StartupAction) => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const next = nextMilestone(state)

  if (next === null) return null

  const rule = MILESTONE_RULES[next]
  const ready =
    skillOf(state) >= rule.skill &&
    state.team.length >= rule.team &&
    hours >= rule.hours &&
    (rule.round === null || state.rounds.some((round) => round.id === rule.round))

  return (
    <div className="su-milestone">
      <ItemArt art={{ kind: next }} size={56} />
      <div className="su-needs">
        <Need icon="estrella" have={skillOf(state)} need={rule.skill} />
        <Need icon="persona" have={state.team.length} need={rule.team} />
        <Need icon="trofeo" have={hours} need={rule.hours} />
      </div>
      {next === 'founded' && (
        <input
          className="su-name-input"
          value={name}
          maxLength={NAME_MAX}
          aria-label={t('startup.name')}
          placeholder={t('startup.name')}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
      )}
      <button
        type="button"
        className="primary small su-go"
        aria-label={t(`startup.milestone.${next}`)}
        title={t(`startup.milestone.${next}`)}
        disabled={
          busy || !ready || rule.cost > balance || (next === 'founded' && name.trim() === '')
        }
        onClick={() => {
          onAct({ type: 'milestone', milestone: next, ...(next === 'founded' ? { name } : {}) })
        }}
      >
        <Icon name={next === 'founded' ? 'bandera' : 'despegue'} size={16} />
        {rule.cost > 0 && <span>{hm(rule.cost)}</span>}
      </button>
    </div>
  )
}

/** Tres candidatos al azar (con su especialidad y estrellas) y volver a sacar. */
function Hiring({
  login,
  state,
  balance,
  busy,
  onAct,
}: {
  login: string
  state: StartupState
  balance: number
  busy: boolean
  onAct: (action: StartupAction) => void
}) {
  const { t } = useI18n()
  const full = state.team.length >= seatsOf(state)

  return (
    <div className="su-grid su-hiring" role="group" aria-label={t('startup.hire')}>
      {candidatesOf(login, state).map((candidate, index) => (
        <Card
          key={`${String(state.team.length)}-${String(state.rolls)}-${String(index)}`}
          art={{ kind: 'hire', axis: candidate.axis, look: candidate.look }}
          label={`${t('startup.hire')} · ${t(`startup.axis.${candidate.axis}`)}`}
          cost={candidate.cost}
          locked={full}
          affordable={candidate.cost <= balance}
          busy={busy}
          onClick={() => {
            onAct({ type: 'hire', index })
          }}
        >
          <span className="su-stars" aria-hidden="true">
            {Array.from({ length: candidate.stars }, (_, star) => (
              <Icon key={star} name="estrella" size={11} />
            ))}
          </span>
        </Card>
      ))}
      <button
        type="button"
        className="su-card su-reroll"
        aria-label={t('startup.reroll')}
        title={t('startup.reroll')}
        disabled={busy || REROLL_COST > balance}
        onClick={() => {
          onAct({ type: 'reroll' })
        }}
      >
        <Icon name="chispa" size={28} />
        <span className="su-cost">
          <Icon name="reloj" size={13} />
          {hm(REROLL_COST)}
        </span>
      </button>
    </div>
  )
}

/** La siguiente ronda de inversión: lo que pide, lo que multiplica y la suerte de las hechas. */
function NextRound({
  state,
  hours,
  balance,
  busy,
  onAct,
}: {
  state: StartupState
  hours: number
  balance: number
  busy: boolean
  onAct: (action: StartupAction) => void
}) {
  const { t } = useI18n()
  const round = nextRound(state)

  if (round === null) return null

  const rule = ROUND_RULES[round]
  const ready =
    state.team.length >= rule.team && levelOf(state, 'space') >= rule.space && hours >= rule.hours

  return (
    <div className="su-milestone su-round">
      <ItemArt art={{ kind: 'round', index: ROUNDS.indexOf(round) }} size={56} />
      <div className="su-needs">
        <Need icon="persona" have={state.team.length} need={rule.team} />
        <Need icon="capas" have={levelOf(state, 'space')} need={rule.space} />
        <Need icon="trofeo" have={hours} need={rule.hours} />
        <span className="su-need met">×{rule.multiplier}</span>
      </div>
      <button
        type="button"
        className="primary small su-go"
        aria-label={t('startup.round')}
        title={t('startup.round')}
        disabled={busy || !ready || rule.cost > balance}
        onClick={() => {
          onAct({ type: 'round' })
        }}
      >
        <Icon name="despegue" size={16} />
        <span>{hm(rule.cost)}</span>
      </button>
    </div>
  )
}

/** El ranking: horas de concentración y la startup de cada cual. */
function Ranking({
  rows,
  me,
  onVisit,
}: {
  rows: Awaited<ReturnType<typeof api.getStartupRanking>>
  me: string
  onVisit: (login: string) => void
}) {
  const { t } = useI18n()
  const { compact } = useFormat()

  if (rows.length === 0) return null

  return (
    <ol className="su-ranking" aria-label={t('startup.ranking')}>
      {rows.map((row, index) => (
        <li key={row.login} className={row.login === me ? 'mine' : undefined}>
          <span className="su-rank">{index + 1}</span>
          <button
            type="button"
            className="su-who"
            aria-label={t('startup.visit', { login: row.login })}
            title={t('startup.visit', { login: row.login })}
            onClick={() => {
              onVisit(row.login)
            }}
          >
            <b>{row.name ?? row.login}</b>
            {row.name !== null && <small>{row.login}</small>}
          </button>
          {row.focus !== null && <AxisGlyph axis={row.focus} size={18} />}
          <span className="su-need met">
            <Icon name="trofeo" size={12} />
            {row.hours}
          </span>
          <span className="su-need met">
            <Icon name="estrella" size={12} />
            {compact(row.valuation)}
          </span>
        </li>
      ))}
    </ol>
  )
}
