import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import type { ClickerBoard } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { BigKey, Tile } from './art'
import { ACHIEVEMENTS, BUGS, BUILDINGS, CAFFEINE_PER_ACHIEVEMENT } from './data'
import { useEgg } from './egg'
import {
  baseCps,
  buy,
  buyUpgrade,
  caffeine,
  click,
  cpsOf,
  hotfix,
  hotfixPrice,
  newGame,
  openGolden,
  prestigeAfter,
  priceOf,
  reachedStage,
  recompile,
  refundOf,
  restore,
  sell,
  serialize,
  shop,
  squash,
  stageOf,
  tick,
  unitCps,
} from './engine'
import type { Game } from './engine'
import { achievementText, fill, newsFor, short, textsOf, upgradeText } from './texts'

const LOCAL_KEY = 'sanatorio_clicker'
/** Cada cuánto se hacen cuentas y se repinta, y cada cuánto se guarda. */
const FRAME_MS = 100
const LOCAL_SAVE_MS = 10_000
const SERVER_SAVE_MS = 60_000
const NEWS_MS = 9000
const TABS = ['play', 'stats', 'achievements', 'board'] as const
const AMOUNTS = [1, 10, 100] as const
/** Caracteres que llueven por detrás de la tecla. */
const RAIN = '{}[]();=<>/*01&|!#'

type Tab = (typeof TABS)[number]
type Pop = { id: number; x: number; y: number; text: string }
type Toast = { id: number; icon: string; title: string; text: string; tier?: number }

/** El nivel dentro del juego: el mismo cálculo que hace la API para la clasificación. */
const levelOf = (total: number): number => Math.floor(3 * Math.log10(1 + Math.max(0, total)))

/** "12 min 05 s", para lo que queda de un parche. */
function clock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))

  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`
}

/**
 * Code Clicker: la sección secreta. Se pulsa una tecla para escribir líneas de
 * código, se compran cosas que las escriben solas y, si se investiga lo que no
 * se debe, el mundo acaba escrito en C.
 *
 * Las reglas están en `engine.ts`; aquí se lleva el reloj, se guarda la
 * partida y se pinta.
 */
export function CodeClicker({ me, onExit }: { me: string; onExit: () => void }) {
  const { lang } = useI18n()
  const texts = textsOf(lang)
  const ui = useCallback(
    (key: string, vars: Record<string, string | number> = {}): string =>
      fill(texts.ui[key] ?? key, vars),
    [texts],
  )
  const egg = useEgg()
  const game = useRef<Game | null>(null)
  const names = useRef<string[]>([])
  const [, setFrame] = useState(0)
  const [tab, setTab] = useState<Tab>('play')
  const [amount, setAmount] = useState<number>(1)
  const [selling, setSelling] = useState(false)
  const [pops, setPops] = useState<Pop[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [news, setNews] = useState('')
  const [board, setBoard] = useState<ClickerBoard | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  // La partida ya está cargada: el rótulo de noticias puede empezar.
  const [loaded, setLoaded] = useState(false)
  const counter = useRef(0)
  const plus = useRef(egg.plus)

  plus.current = egg.plus

  const toast = useCallback((entry: Omit<Toast, 'id'>): void => {
    const id = ++counter.current

    setToasts((current) => [...current.slice(-3), { ...entry, id }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((other) => other.id !== id))
    }, 5000)
  }, [])

  const save = useCallback((toServer: boolean): void => {
    const current = game.current

    if (current === null) return

    const saved = serialize(current)

    try {
      localStorage.setItem(LOCAL_KEY, saved)
    } catch {
      // Sin almacenamiento local, queda la copia de la API.
    }

    if (toServer) {
      void api
        .saveClicker({
          save: saved,
          total: current.before + current.total,
          perSecond: baseCps(current),
          achievements: current.achieved.length,
          prestige: current.prestige,
        })
        .catch(() => undefined)
    }
  }, [])

  // Cargar la partida: manda la de la API; si no hay, la de este navegador.
  useEffect(() => {
    let alive = true

    api.getClicker().then(
      (state) => {
        if (!alive) return

        let local: string | null = null

        try {
          local = localStorage.getItem(LOCAL_KEY)
        } catch {
          local = null
        }

        names.current = state.names
        game.current =
          restore(state.save, Date.now()) ?? restore(local, Date.now()) ?? newGame(Date.now())
        setLoaded(true)
      },
      () => {
        if (!alive) return

        game.current = newGame(Date.now())
        setLoaded(true)
      },
    )

    return () => {
      alive = false
    }
  }, [])

  // El reloj del juego, y los guardados periódicos.
  useEffect(() => {
    const frame = window.setInterval(() => {
      const current = game.current

      if (current === null) return

      for (const id of tick(current, Date.now(), Math.random, plus.current)) {
        const [title, text] = achievementText(id, lang)

        toast({ icon: 'trophy', title, text, tier: ACHIEVEMENTS.indexOf(id) % 11 })
      }

      setFrame((value) => value + 1)
    }, FRAME_MS)
    const local = window.setInterval(() => {
      save(false)
    }, LOCAL_SAVE_MS)
    const server = window.setInterval(() => {
      save(true)
    }, SERVER_SAVE_MS)
    const onHide = (): void => {
      if (document.hidden) save(true)
    }

    document.addEventListener('visibilitychange', onHide)

    return () => {
      window.clearInterval(frame)
      window.clearInterval(local)
      window.clearInterval(server)
      document.removeEventListener('visibilitychange', onHide)
      save(true)
    }
  }, [lang, save, toast])

  // El rótulo de noticias: una nueva cada pocos segundos, según cómo va la partida.
  useEffect(() => {
    const next = (): void => {
      const current = game.current

      if (current === null) return

      const pool = newsFor(lang, reachedStage(current), current.before + current.total)
      const people = names.current.length > 0 ? names.current : ['norminet', 'moulinette']
      const pick = <T,>(list: readonly T[]): T | undefined =>
        list[Math.floor(Math.random() * list.length)]
      const name = pick(people) ?? ''

      setNews(
        fill(pick(pool) ?? '', {
          name,
          name2: pick(people.filter((other) => other !== name)) ?? name,
          n: short(current.before + current.total, lang, 1),
        }),
      )
    }

    next()

    const timer = window.setInterval(next, NEWS_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [lang, loaded])

  useEffect(() => {
    if (tab !== 'board') return

    save(true)
    // Un momento para que la API tenga ya lo que se acaba de mandar.
    const timer = window.setTimeout(() => {
      api.getClickerBoard().then(setBoard, () => undefined)
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [tab, save])

  const rain = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        char: RAIN[(index * 7) % RAIN.length] ?? '0',
        left: (index * 37) % 100,
        delay: (index * 0.61) % 7,
        time: 5 + ((index * 13) % 6),
      })),
    [],
  )

  const current = game.current

  if (current === null) {
    return <p className="estado">…</p>
  }

  const now = Date.now()
  const stage = stageOf(current, now)
  const reached = reachedStage(current)
  const cps = cpsOf(current, now)
  const upgrades = shop(current, now)
  const all = current.before + current.total
  // Se enseñan los edificios que se tienen y los dos siguientes, como incógnita.
  const lastOwned = BUILDINGS.reduce(
    (last, { id }, index) => ((current.owned[id] ?? 0) > 0 ? index : last),
    -1,
  )
  const number = (value: number, decimals = 3): string => short(value, lang, decimals)

  const press = (event: PointerEvent<HTMLButtonElement>): void => {
    const gained = click(current, Date.now())
    const box = event.currentTarget.getBoundingClientRect()
    const id = ++counter.current

    setPops((list) => [
      ...list.slice(-18),
      {
        id,
        x: event.clientX - box.left + (Math.random() - 0.5) * 24,
        y: event.clientY - box.top,
        text: `+${number(gained, 1)}`,
      },
    ])
    window.setTimeout(() => {
      setPops((list) => list.filter((pop) => pop.id !== id))
    }, 900)
  }

  const golden = (): void => {
    const result = openGolden(current, Date.now())

    if (result === null) return

    toast({
      icon: result.effect === 'clot' || result.effect === 'ruin' ? 'bug' : 'golden',
      title: ui(result.effect === 'clot' || result.effect === 'ruin' ? 'wrath' : 'golden'),
      text: ui(`fx_${result.effect}`, { n: number(Math.abs(result.amount), 1) }),
    })
  }

  const detail = (): [string, string, number] | null => {
    if (focus === null) return null

    const upgrade = upgrades.find((entry) => entry.id === focus)

    if (upgrade === undefined) return null

    return [...upgradeText(upgrade.id, lang), upgrade.price]
  }
  const shown = detail()

  return (
    <section className={`cc stage-${reached} ${stage === 0 && reached > 0 ? 'patched' : ''}`}>
      <header className="cc-head">
        <h2 className="cc-title">{reached >= 3 ? '42 > ./reality' : ui('title')}</h2>
        <div className="filter-pills" role="tablist">
          {TABS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              className={`pill ${tab === option ? 'active' : ''}`}
              onClick={() => {
                setTab(option)
              }}
            >
              {ui(option)}
            </button>
          ))}
          <button type="button" className="pill" onClick={onExit}>
            {ui('back')}
          </button>
        </div>
      </header>

      <p className="cc-news" role="status">
        <span key={news}>{news}</span>
      </p>

      <div className="cc-grid">
        <div className="cc-bank">
          <div className="cc-rain" aria-hidden="true">
            {cps > 0 &&
              rain.map((drop, index) => (
                <i
                  key={index}
                  style={{
                    left: `${drop.left}%`,
                    animationDelay: `-${drop.delay}s`,
                    animationDuration: `${drop.time}s`,
                  }}
                >
                  {drop.char}
                </i>
              ))}
          </div>
          <div
            className="cc-coffee"
            style={{ height: `${Math.min(60, caffeine(current) * 12)}%` }}
            title={`${ui('caffeine', { pct: Math.round(caffeine(current) * 100) })}. ${ui('caffeineAbout')}`}
          />

          <span className="cc-repo">{ui('repo', { login: me })}</span>
          <strong className="cc-count">{number(Math.floor(current.code))}</strong>
          <span className="cc-unit">{ui('code')}</span>
          <span className="cc-cps">{ui('perSecond', { n: number(cps, 1) })}</span>

          <button type="button" className="cc-key" aria-label={ui('title')} onPointerDown={press}>
            <BigKey stage={reached} />
            {pops.map((pop) => (
              <span key={pop.id} className="cc-pop" style={{ left: pop.x, top: pop.y }}>
                {pop.text}
              </span>
            ))}
          </button>

          {current.buffs.length > 0 && (
            <div className="cc-buffs">
              {current.buffs.map((buff) => (
                <span key={buff.id} className={`cc-buff ${buff.id}`}>
                  {ui(`fx_${buff.id}`).split(/[!:]/)[0]} · {Math.ceil((buff.until - now) / 1000)} s
                </span>
              ))}
            </div>
          )}

          {current.bugs.length > 0 && (
            <div className="cc-bugs">
              <small>
                {ui('bugs', {
                  n: current.bugs.length,
                  pct: Math.round(current.bugs.length * BUGS.share * 100),
                })}
              </small>
              <div>
                {current.bugs.map((eaten, index) => (
                  <button
                    key={index}
                    type="button"
                    className="cc-bug"
                    title={number(eaten * BUGS.back, 1)}
                    onClick={() => {
                      const back = squash(current, index)

                      toast({
                        icon: 'bug',
                        title: ui('squashed', { n: number(back, 1) }),
                        text: '',
                      })
                    }}
                  >
                    <Tile icon="bug" size={34} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {reached > 0 &&
            (now < current.hotfixUntil ? (
              <span className="cc-hotfix on">
                {ui('hotfixOn', { n: clock(current.hotfixUntil - now) })}
              </span>
            ) : (
              <button
                type="button"
                className="cc-hotfix"
                title={ui('hotfixAbout')}
                disabled={hotfixPrice(current) > current.code}
                onClick={() => {
                  hotfix(current, Date.now())
                }}
              >
                {ui('hotfix', { n: number(hotfixPrice(current)) })}
              </button>
            ))}

          {current.goldenUp !== null && (
            <button
              type="button"
              className={`cc-golden ${current.goldenUp.wrath ? 'wrath' : ''}`}
              style={{ left: `${current.goldenUp.x * 100}%`, top: `${current.goldenUp.y * 100}%` }}
              aria-label={ui(current.goldenUp.wrath ? 'wrath' : 'golden')}
              onClick={golden}
            >
              <Tile icon={current.goldenUp.wrath ? 'bug' : 'golden'} size={56} />
            </button>
          )}
        </div>

        <div className="cc-middle">
          {tab === 'play' && (
            <div className="cc-rows">
              {BUILDINGS.filter(({ id }) => (current.owned[id] ?? 0) > 0).map(({ id }) => (
                <div key={id} className="cc-row">
                  <span className="cc-row-name">
                    {texts.buildings[id][0]} <b>×{current.owned[id]}</b>
                  </span>
                  <span className="cc-row-strip">
                    {Array.from({ length: Math.min(28, current.owned[id] ?? 0) }, (_, index) => (
                      <Tile key={index} icon={id} size={26} />
                    ))}
                  </span>
                </div>
              ))}
              {lastOwned < 0 && <p className="cc-hint">{texts.buildings.cursor[2]}</p>}
            </div>
          )}

          {tab === 'stats' && (
            <div className="cc-stats">
              <dl>
                {(
                  [
                    ['statLevel', String(levelOf(all))],
                    ['statTotal', number(current.total)],
                    ['statAll', number(all)],
                    ['statHand', number(current.hand)],
                    ['statClicks', number(current.clicks)],
                    [
                      'statBuildings',
                      number(BUILDINGS.reduce((sum, { id }) => sum + (current.owned[id] ?? 0), 0)),
                    ],
                    ['statGolden', number(current.golden)],
                    ['statBugs', number(current.pops)],
                    ['statPrestige', number(current.prestige)],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key}>
                    <dt>{ui(key)}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="cc-hint">
                {ui('caffeine', { pct: Math.round(caffeine(current) * 100) })} ·{' '}
                {ui('caffeineAbout')}
              </p>
              <p className="cc-hint">{ui('prestigeAbout')}</p>
              {prestigeAfter(current) > current.prestige ? (
                <>
                  <p className="cc-hint">{ui('recompileAbout', { n: prestigeAfter(current) })}</p>
                  <button
                    type="button"
                    className="cc-recompile"
                    onClick={() => {
                      if (window.confirm(ui('recompileAsk', { n: prestigeAfter(current) }))) {
                        game.current = recompile(current, Date.now())
                        save(true)
                      }
                    }}
                  >
                    {ui('recompile')}
                  </button>
                </>
              ) : (
                <p className="cc-hint">{ui('recompileNo')}</p>
              )}
            </div>
          )}

          {tab === 'achievements' && (
            <>
              <p className="cc-hint">
                {current.achieved.length} / {ACHIEVEMENTS.length} ·{' '}
                {ui('caffeine', {
                  pct: Math.round(current.achieved.length * CAFFEINE_PER_ACHIEVEMENT * 100),
                })}
              </p>
              <div className="cc-achievements">
                {ACHIEVEMENTS.map((id, index) => {
                  const got = current.achieved.includes(id)
                  const [name, about] = achievementText(id, lang)

                  return (
                    <span
                      key={id}
                      className="cc-achievement"
                      title={got ? `${name}\n${about}` : ui('locked')}
                    >
                      <Tile
                        icon={id.startsWith('own:') ? (id.split(':')[1] ?? 'trophy') : 'trophy'}
                        size={38}
                        tier={index % 11}
                        dim={!got}
                      />
                    </span>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'board' && (
            <div className="cc-board">
              {board === null ? (
                <p className="cc-hint">…</p>
              ) : board.entries.length === 0 ? (
                <p className="cc-hint">{ui('noBoard')}</p>
              ) : (
                <ol>
                  {[
                    ...board.entries,
                    ...(board.me !== null && !board.entries.some((row) => row.login === me)
                      ? [board.me]
                      : []),
                  ].map((row) => (
                    <li key={row.login} className={row.login === me ? 'me' : ''}>
                      <b>{row.rank}</b>
                      <Avatar login={row.login} image={row.image} size={28} />
                      <span>
                        <strong>{row.login}</strong>
                        <small>
                          {ui('level')} {row.level} · {number(row.total, 1)} · {row.achievements}{' '}
                          <Tile icon="trophy" size={14} />
                        </small>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        <div className="cc-store">
          {upgrades.length > 0 && (
            <>
              <span className="eyebrow">{ui('upgrades')}</span>
              <div className="cc-upgrades">
                {upgrades.slice(0, 24).map((upgrade) => (
                  <button
                    key={upgrade.id}
                    type="button"
                    className={`cc-upgrade ${upgrade.price > current.code ? 'poor' : ''}`}
                    aria-label={upgradeText(upgrade.id, lang)[0]}
                    onMouseEnter={() => {
                      setFocus(upgrade.id)
                    }}
                    onFocus={() => {
                      setFocus(upgrade.id)
                    }}
                    onMouseLeave={() => {
                      setFocus(null)
                    }}
                    onBlur={() => {
                      setFocus(null)
                    }}
                    onClick={() => {
                      buyUpgrade(current, upgrade.id, Date.now())
                    }}
                  >
                    <Tile
                      icon={upgrade.icon}
                      size={40}
                      tier={upgrade.tier}
                      {...(upgrade.icon === 'project' ? { label: '42' } : {})}
                    />
                  </button>
                ))}
              </div>
              <p className="cc-detail" role="status">
                {shown !== null && (
                  <>
                    <strong>{shown[0]}</strong> · {number(shown[2])}
                    <br />
                    {shown[1]}
                  </>
                )}
              </p>
            </>
          )}

          <div className="cc-store-head">
            <span className="eyebrow">{ui('store')}</span>
            <span className="cc-amounts">
              <button
                type="button"
                className={selling ? '' : 'on'}
                onClick={() => {
                  setSelling(false)
                }}
              >
                {ui('buy')}
              </button>
              <button
                type="button"
                className={selling ? 'on' : ''}
                onClick={() => {
                  setSelling(true)
                }}
              >
                {ui('sell')}
              </button>
              {AMOUNTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={amount === option ? 'on' : ''}
                  onClick={() => {
                    setAmount(option)
                  }}
                >
                  {option}
                </button>
              ))}
            </span>
          </div>

          <ul className="cc-buildings">
            {BUILDINGS.map(({ id }, index) => {
              if (index > lastOwned + 2) return null

              const owned = current.owned[id] ?? 0
              const known = index <= lastOwned + 1
              const price = selling ? refundOf(current, id, amount) : priceOf(current, id, amount)
              const able = selling ? owned > 0 : price <= current.code
              const each = unitCps(current, id)

              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`cc-building ${able ? '' : 'poor'}`}
                    disabled={!able}
                    title={
                      known
                        ? `${texts.buildings[id][2]}\n${ui('each', { n: number(each, 1) })}`
                        : ui('locked')
                    }
                    onClick={() => {
                      if (selling) sell(current, id, amount)
                      else buy(current, id, amount)
                    }}
                  >
                    <Tile icon={id} size={46} dim={!known} />
                    <span>
                      <strong>{known ? texts.buildings[id][0] : ui('locked')}</strong>
                      <small className={able ? 'can' : 'cannot'}>{number(price)}</small>
                    </span>
                    <b>{owned > 0 ? owned : ''}</b>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="cc-toasts" aria-live="polite">
        {toasts.map((entry) => (
          <div key={entry.id} className="cc-toast">
            <Tile
              icon={entry.icon}
              size={36}
              {...(entry.tier === undefined ? {} : { tier: entry.tier })}
            />
            <span>
              <strong>{entry.title}</strong>
              {entry.text !== '' && <small>{entry.text}</small>}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
