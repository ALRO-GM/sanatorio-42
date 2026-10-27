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
  candidatesOf,
  focusOf,
  has,
  levelOf,
  nextMilestone,
  nextRound,
  parseStartup,
  priceOf,
  seatsOf,
  seeded,
  skillOf,
  valuationOf,
} from '@sanatorio/startup'
import type { Item, StartupAction, StartupState } from '@sanatorio/startup'

import { api } from '../../../shared/api'
import { useAction, useAsync } from '../../../shared/hooks/useAsync'
import { useI18n } from '../../../shared/i18n'
import { useFormat } from '../../../shared/i18n/useFormat'
import { ErrorNote } from '../../../shared/ui/ErrorNote'
import { Icon } from '../../../shared/ui/Icon'
import type { IconName } from '../../../shared/ui/Icon'
import { AxisGlyph } from './art/AxisGlyph'
import { ItemArt } from './art/ItemArt'
import type { ArtOf } from './art/ItemArt'
import { StartupScene } from './StartupScene'

/** El aspecto de quien funda la startup: un número fijo sacado de su login. */
export const lookOf = (login: string): number => Math.floor(seeded(`${login}|look`)() * 1000)

/** Minutos como `h:mm`: lo mismo en todos los idiomas. */
const hm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60))}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`

/** El dibujo de una pieza del catálogo en el nivel que se compraría. */
function artOf(item: Item, level: number): ArtOf {
  if (item.kind === 'learn' && item.axis !== null) return { kind: 'learn', axis: item.axis }
  if (item.kind === 'gear') return { kind: 'computer', level: level + 1 }
  if (item.kind === 'space') return { kind: 'space', level: level + 1 }

  return { kind: 'servers', level: level + 1 }
}

/**
 * La startup del Pomodoro (`docs/pomodoro-startup.md`): cada minuto de
 * concentración se gasta en construirla, del garaje al control global, y se
 * compara con la de los demás. Casi sin texto: dibujos, iconos y cifras.
 */
export function StartupPanel() {
  const { t } = useI18n()
  const { data, error, loading, reload, setData } = useAsync(() => api.getStartup(), [])
  const ranking = useAsync(() => api.getStartupRanking(), [])
  const action = useAction()

  if (loading && data === undefined) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const run = async (next: StartupAction): Promise<void> => {
    // La partida que devuelve la API es la que manda: se pinta tal cual.
    if (
      await action.run(async () => {
        setData(await api.startupAction(next))
      })
    ) {
      void ranking.reload()
    }
  }

  return (
    <Game
      snapshot={data}
      busy={action.busy}
      onAct={(next) => void run(next)}
      error={<ErrorNote error={action.error} />}
      ranking={ranking.data ?? []}
    />
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
  onAct: (action: StartupAction) => void
  error: ReactNode
  ranking: Awaited<ReturnType<typeof api.getStartupRanking>>
}) {
  const { t } = useI18n()
  const { compact } = useFormat()
  const state = parseStartup(snapshot.state)
  const balance = snapshot.earnedMinutes - state.spent
  const hours = snapshot.earnedMinutes / 60
  const focus = focusOf(state)

  return (
    <section className="su-panel" aria-label={t('startup.title')}>
      <StartupScene state={state} me={lookOf(snapshot.login)} />

      <div className="su-figures">
        <Figure icon="reloj" label={t('startup.balance')} value={hm(balance)} strong />
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
        {focus !== null && (
          <span className="su-figure" title={t(`startup.axis.${focus}`)}>
            <AxisGlyph axis={focus} />
          </span>
        )}
      </div>
      {error}

      <Milestone state={state} hours={hours} balance={balance} busy={busy} onAct={onAct} />

      <div className="su-grid" role="group" aria-label={t('startup.shop')}>
        {ITEMS.map((item) => {
          const level = levelOf(state, item.id)
          const price = priceOf(state, item)
          const locked = item.needs !== null && !has(state, item.needs)

          return (
            <Card
              key={item.id}
              art={artOf(item, level)}
              label={
                item.kind === 'learn' && item.axis !== null
                  ? t('startup.item.learn', { axis: t(`startup.axis.${item.axis}`) })
                  : t(`startup.item.${item.kind}`)
              }
              cost={price}
              locked={locked}
              affordable={price !== null && price <= balance}
              busy={busy}
              onClick={() => {
                onAct({ type: 'buy', item: item.id })
              }}
            >
              <Dots level={level} of={item.costs.length} />
            </Card>
          )
        })}
      </div>

      {has(state, 'mvp') && (
        <Hiring login={snapshot.login} state={state} balance={balance} busy={busy} onAct={onAct} />
      )}
      {has(state, 'founded') && (
        <NextRound state={state} hours={hours} balance={balance} busy={busy} onAct={onAct} />
      )}
      <Ranking rows={ranking} me={snapshot.login} />
    </section>
  )
}

/** Una cifra con su icono; el nombre, solo para quien no ve el icono. */
function Figure({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: IconName
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <span className={`su-figure ${strong ? 'strong' : ''}`.trim()} title={label}>
      <Icon name={icon} size={16} />
      <span className="sr-only">{label}</span>
      <b>{value}</b>
    </span>
  )
}

/** Los niveles comprados de una pieza, como puntos. */
function Dots({ level, of }: { level: number; of: number }) {
  return (
    <span className="su-dots" aria-hidden="true">
      {Array.from({ length: of }, (_, index) => (
        <i key={index} className={index < level ? 'on' : undefined} />
      ))}
    </span>
  )
}

/** Lo que hace falta, con su icono: tienes / pide. */
function Need({ icon, have, need }: { icon: IconName; have: number; need: number }) {
  if (need <= 0) return null

  return (
    <span className={`su-need ${have >= need ? 'met' : ''}`.trim()}>
      <Icon name={icon} size={13} />
      {Math.floor(have)}/{need}
    </span>
  )
}

/** Una tarjeta del juego: dibujo, precio y, si no se puede, apagada o con candado. */
function Card({
  art,
  label,
  cost,
  locked,
  affordable,
  busy,
  onClick,
  children,
}: {
  art: ArtOf
  label: string
  cost: number | null
  locked: boolean
  affordable: boolean
  busy: boolean
  onClick: () => void
  children?: ReactNode
}) {
  const max = cost === null

  return (
    <button
      type="button"
      className={`su-card ${locked ? 'locked' : ''} ${max ? 'max' : ''}`.trim()}
      aria-label={label}
      title={label}
      disabled={busy || locked || max || !affordable}
      onClick={onClick}
    >
      <ItemArt art={art} />
      {children}
      <span className="su-cost">
        {locked ? (
          <Icon name="candado" size={13} />
        ) : max ? (
          <Icon name="hecho" size={13} />
        ) : (
          <>
            <Icon name="reloj" size={13} />
            {hm(cost)}
          </>
        )}
      </span>
    </button>
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
}: {
  rows: Awaited<ReturnType<typeof api.getStartupRanking>>
  me: string
}) {
  const { t } = useI18n()
  const { compact } = useFormat()

  if (rows.length === 0) return null

  return (
    <ol className="su-ranking" aria-label={t('startup.ranking')}>
      {rows.map((row, index) => (
        <li key={row.login} className={row.login === me ? 'mine' : undefined}>
          <span className="su-rank">{index + 1}</span>
          <span className="su-who">
            <b>{row.name ?? row.login}</b>
            {row.name !== null && <small>{row.login}</small>}
          </span>
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
