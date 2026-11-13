import { useState } from 'react'

import {
  DECOR,
  ROLES,
  ROLE_RULES,
  boxesOf,
  decorItem,
  fixturePrice,
  freeSpot,
  has,
  isTurnableKey,
  layoutOf,
  prizeOf,
  sellPrice,
  seatsOf,
  spaceOf,
  staffCost,
  staffOf,
} from '@sanatorio/startup'
import type { Prize, StartupAction, StartupState } from '@sanatorio/startup'

import { useI18n } from '../../../shared/i18n'
import { Icon } from '../../../shared/ui/Icon'
import type { ModelId } from './pixel/models'
import { ItemArt } from './pixel/ItemArt'
import { Card, Coin } from './parts'
import { canPut, decorIndex, decorTarget, putAction } from './target'
import type { Target } from './target'

/**
 * Lo que convierte la oficina en un mundo: el resto de la plantilla, la
 * decoración (comprarla y colocarla a mano) y las cajas sorpresa de las
 * sesiones largas del Pomodoro. Todo pasa por la API (`onAct`): aquí solo se
 * pinta lo que se puede hacer.
 */

type Act = (action: StartupAction) => Promise<boolean>

/** Contratar a alguien del resto de la oficina: una tarjeta por oficio, con su uniforme. */
export function Staff({
  state,
  cash,
  busy,
  onAct,
}: {
  state: StartupState
  cash: number
  busy: boolean
  onAct: Act
}) {
  const { t } = useI18n()

  if (!has(state, 'founded')) return null

  const full = state.team.length >= seatsOf(state)

  return (
    <div className="su-grid" role="group" aria-label={t('startup.staff')}>
      {ROLES.map((role, index) => {
        const rule = ROLE_RULES[role]
        const count = staffOf(state, role)
        const cost = count >= rule.max ? null : staffCost(state, role)

        return (
          <Card
            key={role}
            art={{ kind: 'model', model: 'walker', props: { look: 140 + index * 173, role } }}
            label={t(`startup.role.${role}`)}
            cost={cost}
            cash
            locked={spaceOf(state) < rule.space || full}
            affordable={cost !== null && cost <= cash}
            busy={busy}
            onClick={() => void onAct({ type: 'staff', role })}
          >
            <span className="su-count" aria-hidden="true">
              {count}/{rule.max}
            </span>
          </Card>
        )
      })}
    </div>
  )
}

/** La tienda de decoración: lo que se puede comprar en cada espacio (lo de las cajas, no). */
export function DecorShop({
  state,
  cash,
  busy,
  onAct,
}: {
  state: StartupState
  cash: number
  busy: boolean
  onAct: Act
}) {
  const { t } = useI18n()
  const space = spaceOf(state)

  return (
    <div className="su-grid" role="group" aria-label={t('startup.decorShop')}>
      {DECOR.filter((item) => item.cost > 0 && item.space <= space + 1).map((item) => (
        <Card
          key={item.id}
          art={{ kind: 'model', model: item.id as ModelId }}
          label={t(`startup.decor.${item.id}`)}
          cost={item.cost}
          cash
          locked={item.space > space}
          affordable={item.cost <= cash}
          busy={busy}
          onClick={() => void onAct({ type: 'decor', id: item.id })}
        />
      ))}
    </div>
  )
}

/** Hacia dónde se mueve una pieza con los botones: en la cuadrícula de la oficina. */
const STEPS = [
  ['up', 0, -1],
  ['left', -1, 0],
  ['right', 1, 0],
  ['down', 0, 1],
] as const

/** No hay flecha hacia arriba: es la de abajo, girada (`.su-step.up`). */
const ARROWS = { up: 'abajo', down: 'abajo', left: 'atras', right: 'adelante' } as const

/**
 * Colocar a mano, sin ratón: la lista de todo lo que se mueve (la decoración,
 * colocada o guardada, y lo demás: mesas, servidores, mostrador y lo ganado)
 * para elegir algo y moverlo baldosa a baldosa. La decoración, además, se
 * gira, se guarda o se vende. Lo mismo se hace tocando y arrastrando en la
 * oficina (`PixelScene`).
 */
export function DecorEditor({
  state,
  selected,
  onSelect,
  busy,
  onAct,
}: {
  state: StartupState
  selected: Target | null
  onSelect: (target: Target | null) => void
  busy: boolean
  onAct: Act
}) {
  const { t } = useI18n()
  const [selling, setSelling] = useState<Target | null>(null)
  const name = (id: string): string => t(`startup.decor.${id}`)
  const where = (at: readonly [number, number]) => ({
    x: String(at[0] + 1),
    y: String(at[1] + 1),
  })
  const layout = layoutOf(state)
  const items = [
    ...state.decor
      .map((one, index) => ({ one, index }))
      .filter(({ one }) => decorItem(one.id)?.kind !== 'pet')
      .map(({ one, index }) => ({
        target: decorTarget(index),
        model: one.id as ModelId,
        turn: one.turn,
        at: one.at,
        label:
          one.at === null
            ? t('startup.piece.stored', { name: name(one.id) })
            : t('startup.piece', { name: name(one.id), ...where(one.at) }),
      })),
    ...layout.map((fixture) => ({
      target: fixture.key,
      model: fixture.model as ModelId,
      turn: fixture.turn,
      at: fixture.at,
      label: t('startup.piece', {
        name: t(`startup.fixture.${fixture.key.replace(/[:-]\d+$/, '')}`),
        ...where(fixture.at),
      }),
    })),
  ]
  const chosen = items.find((item) => item.target === selected)
  const index = selected === null ? null : decorIndex(selected)
  const piece = index === null ? undefined : state.decor[index]
  const select = (target: Target | null): void => {
    setSelling(null)
    onSelect(target)
  }

  return (
    <div className="su-editor" role="group" aria-label={t('startup.edit')}>
      <ul className="su-pieces">
        {items.map((item) => (
          <li key={item.target}>
            <button
              type="button"
              className={`su-piece ${selected === item.target ? 'on' : ''} ${item.at === null ? 'stored' : ''}`.trim()}
              aria-pressed={selected === item.target}
              aria-label={item.label}
              title={item.label}
              onClick={() => {
                select(selected === item.target ? null : item.target)
              }}
            >
              <ItemArt
                art={{ kind: 'model', model: item.model, props: { turn: item.turn } }}
                size={28}
              />
            </button>
          </li>
        ))}
      </ul>

      {chosen !== undefined && selected !== null && (
        <div className="su-moves">
          {chosen.at === null && index !== null ? (
            <button
              type="button"
              className="small"
              disabled={busy || freeSpot(state) === null}
              aria-label={t('startup.place')}
              title={t('startup.place')}
              onClick={() => {
                const spot = freeSpot(state)

                if (spot !== null) void onAct(putAction(state, selected, spot[0], spot[1]))
              }}
            >
              <Icon name="mas" size={16} />
            </button>
          ) : (
            STEPS.map(([way, dx, dy]) => {
              const at = chosen.at ?? [0, 0]
              const gx = at[0] + dx
              const gy = at[1] + dy

              return (
                <button
                  key={way}
                  type="button"
                  className={`small su-step ${way}`}
                  disabled={busy || !canPut(state, selected, gx, gy)}
                  aria-label={t(`startup.move.${way}`)}
                  title={t(`startup.move.${way}`)}
                  onClick={() => void onAct(putAction(state, selected, gx, gy))}
                >
                  <Icon name={ARROWS[way]} size={16} />
                </button>
              )
            })
          )}
          {index !== null && (piece?.at ?? null) !== null && piece !== undefined && (
            <>
              <button
                type="button"
                className="small"
                disabled={busy}
                aria-label={t('startup.turn')}
                title={t('startup.turn')}
                onClick={() => {
                  const at = piece.at ?? [0, 0]

                  void onAct({ type: 'place', index, gx: at[0], gy: at[1], turn: !piece.turn })
                }}
              >
                <Icon name="chispa" size={16} />
              </button>
              <button
                type="button"
                className="small"
                disabled={busy}
                aria-label={t('startup.store')}
                title={t('startup.store')}
                onClick={() => void onAct({ type: 'store', index })}
              >
                <Icon name="capas" size={16} />
              </button>
            </>
          )}
          {index === null && isTurnableKey(selected) && (
            <button
              type="button"
              className="small"
              disabled={busy}
              aria-label={t('startup.turn')}
              title={t('startup.turn')}
              onClick={() => void onAct({ type: 'turn', key: selected })}
            >
              <Icon name="chispa" size={16} />
            </button>
          )}
          {index === null && fixturePrice(selected) > 0 && (
            <SellButton
              price={fixturePrice(selected)}
              armed={selling === selected}
              busy={busy}
              onArm={() => {
                setSelling(selected)
              }}
              onSell={() => {
                void onAct({ type: 'sellFixture', key: selected }).then((done) => {
                  if (done) select(null)
                })
              }}
            />
          )}
          {index !== null && piece !== undefined && (
            <SellButton
              price={sellPrice(state, piece.id)}
              armed={selling === selected}
              busy={busy}
              onArm={() => {
                setSelling(selected)
              }}
              onSell={() => {
                void onAct({ type: 'sell', index }).then((done) => {
                  if (done) select(null)
                })
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Vender una pieza: el primer toque dice por cuánto y el segundo la vende
 * (lo de las cajas no se puede volver a comprar).
 */
function SellButton({
  price,
  armed,
  busy,
  onArm,
  onSell,
}: {
  price: number
  armed: boolean
  busy: boolean
  onArm: () => void
  onSell: () => void
}) {
  const { t } = useI18n()
  const label = t(armed ? 'startup.sell.confirm' : 'startup.sell', { n: String(price) })

  return (
    <button
      type="button"
      className={`small su-sell ${armed ? 'danger' : ''}`.trim()}
      disabled={busy}
      aria-label={label}
      title={label}
      onClick={armed ? onSell : onArm}
    >
      <Coin size={14} />
      <b>{armed ? `+${String(price)}?` : `+${String(price)}`}</b>
    </button>
  )
}

/** El dibujo de lo que sale de una caja. */
function PrizeArt({ prize }: { prize: Prize }) {
  return prize.kind === 'decor' ? (
    <ItemArt art={{ kind: 'model', model: prize.id as ModelId }} size={56} />
  ) : (
    <span className="su-prize-cash">
      <Coin size={20} />
      <b>{prize.amount}</b>
    </span>
  )
}

/**
 * Las cajas sorpresa: una por cada sesión del Pomodoro de 30 minutos o más
 * (las cuenta la API). Al abrirla se ve lo que ha tocado, que la web sabe de
 * antes con la misma semilla que la API.
 */
export function Surprise({
  login,
  state,
  sessions,
  busy,
  onAct,
}: {
  login: string
  state: StartupState
  sessions: number
  busy: boolean
  onAct: Act
}) {
  const { t } = useI18n()
  const [shown, setShown] = useState<Prize | null>(null)
  const boxes = boxesOf(state, sessions)

  if (boxes === 0 && shown === null) return null

  return (
    <div className="su-milestone su-surprise">
      {shown !== null ? (
        <div className="su-prize" role="status">
          <PrizeArt prize={shown} />
          <span className="sr-only">
            {shown.kind === 'decor'
              ? t('startup.prize', { name: t(`startup.decor.${shown.id}`) })
              : t('startup.prize.cash')}
          </span>
        </div>
      ) : (
        <ItemArt
          art={{ kind: 'model', model: 'crate', props: { level: Math.min(3, boxes) } }}
          size={56}
        />
      )}
      <span className="su-need met" title={t('startup.boxes')}>
        <span className="sr-only">{t('startup.boxes')}</span>
        {boxes}
      </span>
      {boxes > 0 && (
        <button
          type="button"
          className="primary small su-go"
          aria-label={t('startup.box')}
          title={t('startup.box')}
          disabled={busy}
          onClick={() => {
            const prize = prizeOf(login, state)

            void onAct({ type: 'open' }).then((done) => {
              if (done) setShown(prize)
            })
          }}
        >
          <Icon name="chispa" size={16} />
        </button>
      )}
    </div>
  )
}
