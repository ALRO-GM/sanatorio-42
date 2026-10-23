import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent } from 'react'

import type { ClickerBoard } from '@sanatorio/contracts'

import { api, ApiError } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { useStill } from '../../shared/still'
import { Avatar } from '../../shared/ui/Avatar'
import { PillGroup } from '../../shared/ui/PillGroup'
import { withMe } from '../../shared/ui/RankingList'
import { useConfirm } from '../../shared/ui/useConfirm'
import { BigKey, Tile } from './art'
import { CardView } from './Card'
import { cardFor } from './cards'
import type { Tip } from './cards'
import { Bust } from './Bust'
import { CapitalHistory } from './CapitalHistory'
import type { Busted } from './Bust'
import {
  ACHIEVEMENTS,
  BUGS,
  BUILDINGS,
  CAFFEINE_PER_ACHIEVEMENT,
  FORCED_REFUND,
  GOLDEN,
  hiddenAchievement,
  UPGRADE,
} from '@sanatorio/clicker'
import { useEgg } from './egg'
import { usePlayLimit } from './limit'
import {
  baseCps,
  buy,
  buyUpgrade,
  caffeine,
  click,
  clickPower,
  cpsOf,
  hotfix,
  hotfixPrice,
  newGame,
  openGolden,
  receive,
  prestigeAfter,
  priceOf,
  reachedStage,
  capitalOf,
  invested,
  recompile,
  sellAll,
  refundOf,
  restore,
  sell,
  serialize,
  shop,
  squash,
  stageOf,
  tick,
  donationBonus,
} from '@sanatorio/clicker'
import type { Game } from '@sanatorio/clicker'
import { buildingShare, levelProgress, reach, span } from './insight'
import { Backdrop, Coffee, CursorRing, drinkOf, hueOf, Skyline } from './scene'
import { Mini, miniOn, setMini } from './Mini'
import { play, setSound, soundOn } from './sound'
import {
  canResume,
  markCaught,
  newSession,
  readLocal,
  sample,
  seenCaught,
  writeLocal,
} from './sync'
import { achievementText, fill, newsFor, short, textsOf, upgradeText } from './texts'

/** Cada cuánto se hacen cuentas y se repinta, y cada cuánto se guarda. */
const FRAME_MS = 100
/** Fuera del juego basta con hacer cuentas una vez por segundo: solo se ve un número. */
const BACKGROUND_FRAME_MS = 1000
const LOCAL_SAVE_MS = 10_000
const SERVER_SAVE_MS = 60_000
/** Lo que se reenvía de las pulsaciones del guardado anterior, en segundos. */
const CLICKS_OVERLAP_S = 60
/** Cada cuánto se vuelve a intentar cargar si la API no contestó. */
const RETRY_MS = 30_000
/** Tras un guardado rechazado, lo que se espera antes de volver a recargar por otro. */
const REFUSED_WAIT_MS = 10_000
const NEWS_MS = 20_250
/** Lo que se queda en pantalla un aviso (un logro, el efecto de una pull request). */
const TOAST_MS = 7500
/** Fichas que se pintan en la fila de un edificio, por muchas que se tengan. */
const ROW_UNITS = 36
/** Lo que se lanza al pulsar la tecla, además del número. */
const SPARKS = '{};()<>=+*&'
const TABS = ['play', 'stats', 'achievements', 'board'] as const
const AMOUNTS = [1, 10, 100] as const
/** Caracteres que llueven por detrás de la tecla. */
const RAIN = '{}[]();=<>/*01&|!#'

type Tab = (typeof TABS)[number]
/** Lo que salta al pulsar: el número, una chispa de código o la onda. */
type Pop = {
  id: number
  kind: 'num' | 'spark' | 'ripple'
  x: number
  y: number
  text: string
  /** Hacia dónde sale despedida una chispa, en píxeles. */
  dx?: number
}
/** El estallido al abrir una pull request dorada, en tantos por ciento del panel. */
type Burst = { id: number; x: number; y: number; text: string; bad: boolean }
type Shown = Tip & { anchor: DOMRect }
type Toast = { id: number; icon: string; title: string; text: string; tier?: number }

/** El nivel dentro del juego: el mismo cálculo que hace la API para la clasificación. */
const levelOf = (total: number): number => Math.floor(3 * Math.log10(1 + Math.max(0, total)))

/**
 * Code Clicker: la sección secreta. Se pulsa una tecla para escribir líneas de
 * código, se compran cosas que las escriben solas y, si se investiga lo que no
 * se debe, el mundo acaba escrito en C.
 *
 * Las reglas están en `engine.ts`; aquí se lleva el reloj, se guarda la
 * partida y se pinta.
 */
/**
 * @param background La web está en otra sección: el juego sigue corriendo, pero
 *   solo se pinta la ventanita de abajo.
 * @param onOpen Lo que hace la ventanita al pulsarla: volver al juego.
 * @param spectate Para quien administra: la partida de esa persona, para verla.
 *   No se guarda nada, ni aquí ni en la API; lo que se toque solo cambia en
 *   esta pantalla.
 */
export function CodeClicker({
  me,
  onExit,
  background = false,
  onOpen,
  spectate,
}: {
  me: string
  onExit: () => void
  background?: boolean
  onOpen?: () => void
  spectate?: string
}) {
  const { lang } = useI18n()
  const texts = textsOf(lang)
  const ui = useCallback(
    (key: string, vars: Record<string, string | number> = {}): string =>
      fill(texts.ui[key] ?? key, vars),
    [texts],
  )
  const egg = useEgg()
  const confirm = useConfirm()
  // Con el pace en riesgo, media hora al día (no cuenta en segundo plano ni viendo otra).
  const limit = usePlayLimit(!background && spectate === undefined)
  const still = useStill()
  const game = useRef<Game | null>(null)
  const names = useRef<string[]>([])
  const [, setFrame] = useState(0)
  const [tab, setTab] = useState<Tab>('play')
  const [amount, setAmount] = useState<number>(1)
  const [selling, setSelling] = useState(false)
  const [pops, setPops] = useState<Pop[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [news, setNews] = useState('')
  // Las noticias que quedan por salir de la tanda en curso.
  const newsDeck = useRef<{ key: string; left: string[] }>({ key: '', left: [] })
  const [board, setBoard] = useState<ClickerBoard | null>(null)
  const [bursts, setBursts] = useState<Burst[]>([])
  // La ficha que se enseña: lo que hay bajo el ratón (o lo último que se tocó).
  const [tip, setTip] = useState<Shown | null>(null)
  const tipNow = useRef<Shown | null>(null)
  // En pantalla táctil no hay "pasar por encima": el primer toque enseña la
  // ficha y el segundo compra.
  const touch = useRef(false)
  const primed = useRef(false)
  const [sound, setSoundOn] = useState(soundOn)
  const [mini, setMiniOn] = useState(miniOn)
  // Lo último que se compró, para el destello de su botón.
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null)
  const keyArt = useRef<HTMLButtonElement>(null)
  // La partida ya está cargada: el rótulo de noticias puede empezar.
  const [loaded, setLoaded] = useState(false)
  // La `rev` de la API de la que parte esta partida. Sin ella (`null`) no se
  // guarda allí: aún no se sabe qué hay, y se podría pisar la partida buena.
  const base = useRef<number | null>(null)
  const session = useRef('')
  // La API no contesta: se juega con la copia del navegador.
  const [offline, setOffline] = useState(false)
  // La partida se ha seguido en otro dispositivo: esta ya no se guarda.
  const [stale, setStale] = useState(false)
  // Lo mismo que `stale`, a mano para el guardado, que no se rehace al cambiar.
  const lost = useRef(false)
  // Veces que la API ha pillado trampas, y la ventana que lo cuenta.
  const caught = useRef(0)
  const [bust, setBust] = useState<Busted | null>(null)
  const refusedAt = useRef(0)
  // El capital segundo a segundo, a la espera de mandarlo con el próximo guardado.
  const samples = useRef<[number, number][]>([])
  // Las pulsaciones contadas segundo a segundo, igual: la API mira cada minuto seguido.
  const clickSamples = useRef<[number, number][]>([])
  const reload = useRef<() => void>(() => undefined)
  // Un paso del reloj del juego, para ponerlo al día justo antes de guardar.
  const step = useRef<() => void>(() => undefined)
  // Un guardado en camino, y si ha quedado otro pendiente detrás.
  const sending = useRef(false)
  const again = useRef(false)
  const saveAgain = useRef<() => void>(() => undefined)
  const counter = useRef(0)
  const plus = useRef(egg.plus)
  const heard = useRef(false)

  if (session.current === '') session.current = newSession()

  plus.current = egg.plus
  heard.current = sound
  tipNow.current = tip

  const toast = useCallback((entry: Omit<Toast, 'id'>): void => {
    const id = ++counter.current

    setToasts((current) => [...current.slice(-3), { ...entry, id }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((other) => other.id !== id))
    }, TOAST_MS)
  }, [])

  const save = useCallback(
    (toServer: boolean): void => {
      const current = game.current

      // Mirando la partida de otra persona no se guarda nada en ningún sitio.
      if (current === null || spectate !== undefined) return

      const saved = serialize(current)
      const rev = base.current

      // Una partida que ya no es la buena no se guarda ni aquí: al recargar
      // manda la de la API.
      if (lost.current) return

      writeLocal(saved, rev)

      if (!toServer || rev === null) return

      // Nunca dos a la vez: si se cruzan, un reparto que trae la respuesta de uno
      // no va en el otro y las cuentas de la API no cuadran. El de detrás espera.
      if (sending.current) {
        again.current = true

        return
      }

      // Al volver de una pausa (el portátil dormido, la pestaña congelada), el
      // reloj del juego puede ir por detrás del de los guardados: se pone al día
      // antes, para que lo escrito mientras tanto vaya en este guardado y no de
      // golpe en el siguiente, que parecería una trampa.
      step.current()

      const fresh = serialize(current)
      const sent = [...samples.current]
      const sentClicks = [...clickSamples.current]

      sending.current = true

      api
        .saveClicker({
          save: fresh,
          rev,
          session: session.current,
          total: current.before + current.total,
          perSecond: baseCps(current),
          achievements: current.achieved.length,
          prestige: current.prestige,
          spent: invested(current),
          capital: sent,
          clicks: sentClicks,
        })
        .then(
          (done) => {
            if (!done.refused) {
              base.current = done.rev
              // Lo que le toca del reparto de una trampa ajena: se suma y se cuenta.
              if (done.gift > 0 && game.current !== null) {
                receive(game.current, done.gift)
                toast({
                  icon: 'loot',
                  title: ui('giftTitle'),
                  text: ui('giftText', { n: short(done.gift, lang, 1) }),
                })
              }
              // Lo mandado ya está allí. Se deja el último punto, para que un
              // salto entre un envío y el siguiente también se vea.
              samples.current = samples.current.filter(([at]) => at >= (sent.at(-1)?.[0] ?? 0))
              // De las pulsaciones se queda el último minuto: una ráfaga que cae
              // entre dos guardados se mide entera en el siguiente.
              clickSamples.current = clickSamples.current.filter(
                ([at]) => at >= (sentClicks.at(-1)?.[0] ?? 0) - CLICKS_OVERLAP_S,
              )

              return
            }

            samples.current = []
            clickSamples.current = []

            // La API no se la cree: se vuelve a la última partida buena, y la
            // carga se encarga de contar qué ha pasado.
            if (Date.now() - refusedAt.current > REFUSED_WAIT_MS) {
              refusedAt.current = Date.now()
              reload.current()
            }
          },
          (error: unknown) => {
            if (error instanceof ApiError && error.status === 409) {
              lost.current = true
              setStale(true)
            }
          },
        )
        .finally(() => {
          sending.current = false
          if (again.current) {
            again.current = false
            saveAgain.current()
          }
        })
    },
    [spectate, toast, ui, lang],
  )

  /**
   * Trae la partida de la API. Al entrar manda la de la API; si no contesta, se
   * juega con la copia del navegador y se reintenta. Con `replace` se cambia la
   * partida en curso por la de la API (tras haberla seguido en otro sitio).
   */
  const load = useCallback(
    async (replace: boolean): Promise<void> => {
      if (spectate !== undefined) {
        // La partida de otra persona, tal como la guardó: solo para verla.
        try {
          const view = await api.getClickerGameOf(spectate)

          game.current = restore(view.save, Date.now()) ?? newGame(Date.now())
          caught.current = view.caught
        } catch {
          game.current ??= newGame(Date.now())
          setOffline(true)
        } finally {
          setLoaded(true)
        }

        return
      }

      const local = readLocal()

      try {
        const state = await api.getClicker()

        names.current = state.names

        if (game.current === null || replace) {
          // Los puntos de la partida que se deja no valen para la que entra.
          samples.current = []
          clickSamples.current = []
          game.current =
            restore(state.save, Date.now()) ??
            (replace ? null : restore(local.save, Date.now())) ??
            newGame(Date.now())
        } else if (!canResume(state, local)) {
          // Se jugó sin conexión, y mientras tanto en otro sitio: no se pisa.
          lost.current = true
          setStale(true)
          setOffline(false)

          return
        }

        // Lo donado lo dice la API, no la partida.
        game.current.donated = state.donated
        base.current = state.rev
        lost.current = false
        setStale(false)
        setOffline(false)
        caught.current = state.caught
        // Si han indultado alguna, que la siguiente vuelva a avisar.
        if (state.caught < seenCaught()) markCaught(state.caught)

        // A la tercera trampa se vende todo, y hasta entonces la API no guarda nada.
        const sold = state.saleDue ? sellAll(game.current, FORCED_REFUND) : null

        if (sold !== null) save(true)
        if (sold !== null || state.caught > seenCaught() || state.seizure !== null) {
          setBust({ n: state.caught, sold, seizure: state.seizure })
          markCaught(state.caught)
        }
      } catch {
        game.current ??= restore(local.save, Date.now()) ?? newGame(Date.now())
        setOffline(true)
      } finally {
        setLoaded(true)
      }
    },
    [save, spectate],
  )

  reload.current = () => {
    void load(true)
  }
  saveAgain.current = () => {
    save(true)
  }

  useEffect(() => {
    void load(false)
  }, [load])

  // Sin conexión se reintenta hasta que la API contesta.
  useEffect(() => {
    if (!offline) return

    const timer = window.setInterval(() => {
      void load(false)
    }, RETRY_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [offline, load])

  // El reloj del juego: aparte de los guardados, para que cambiar de ritmo no
  // los reinicie.
  useEffect(() => {
    step.current = () => {
      const current = game.current

      if (current === null) return

      for (const id of tick(current, Date.now(), Math.random, plus.current, caught.current)) {
        const [title, text] = achievementText(id, lang)

        toast({ icon: 'trophy', title, text, tier: ACHIEVEMENTS.indexOf(id) % 11 })
        // Fuera del juego no suena nada: allí no se ha venido a jugar.
        play('achievement', heard.current && !background)
      }

      sample(samples.current, Date.now(), capitalOf(current))
      sample(clickSamples.current, Date.now(), current.clicks)
      setFrame((value) => value + 1)
    }

    const frame = window.setInterval(
      () => {
        step.current()
      },
      // Fuera del juego o sin nadie mirando, basta con un fotograma por segundo.
      background || still ? BACKGROUND_FRAME_MS : FRAME_MS,
    )

    return () => {
      window.clearInterval(frame)
    }
  }, [lang, toast, background, still])

  // Los guardados periódicos, y uno al entrar o salir del juego.
  useEffect(() => {
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
      window.clearInterval(local)
      window.clearInterval(server)
      document.removeEventListener('visibilitychange', onHide)
      save(true)
    }
  }, [save, background])

  // El rótulo de noticias: una nueva cada pocos segundos, según cómo va la partida.
  useEffect(() => {
    const next = (): void => {
      const current = game.current

      if (current === null) return

      const pool = newsFor(lang, reachedStage(current), current.total, current.prestige)
      const people = names.current.length > 0 ? names.current : ['norminet', 'moulinette']
      const pick = <T,>(list: readonly T[]): T | undefined =>
        list[Math.floor(Math.random() * list.length)]
      const name = pick(people) ?? ''
      // Las noticias salen barajadas y no se repite ninguna hasta haberlas
      // dado todas. Si cambian las que tocan (otra época, otro ciclo), se baraja
      // de nuevo.
      const deck = newsDeck.current
      const key = `${lang}|${pool.length}|${pool[0] ?? ''}`

      if (deck.key !== key || deck.left.length === 0) {
        deck.key = key
        deck.left = [...new Set(pool)].sort(() => Math.random() - 0.5)
      }

      setNews(
        fill(deck.left.pop() ?? '', {
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

  // La ficha se quita al mover la página (ya no estaría al lado de lo que
  // explica) y, en táctil, al tocar fuera de lo que tiene ficha.
  useEffect(() => {
    if (tip === null) return

    const close = (): void => {
      setTip(null)
    }
    const outside = (event: Event): void => {
      if (!(event.target instanceof Element) || event.target.closest('[data-tip]') === null) close()
    }

    window.addEventListener('scroll', close, true)
    document.addEventListener('pointerdown', outside)

    return () => {
      window.removeEventListener('scroll', close, true)
      document.removeEventListener('pointerdown', outside)
    }
  }, [tip])

  // Como en el original, la pestaña del navegador dice cuánto llevas: se ve
  // crecer aunque estés en otra.
  useEffect(() => {
    const before = document.title
    const timer = window.setInterval(() => {
      const current = game.current

      if (current !== null) {
        document.title = `${short(Math.floor(current.code), lang, 1)} · Code Clicker`
      }
    }, 1000)

    return () => {
      window.clearInterval(timer)
      document.title = before
    }
  }, [lang])

  const rain = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        char: RAIN[(index * 7) % RAIN.length] ?? '0',
        left: (index * 37) % 100,
        delay: (index * 0.61) % 7,
        time: 5 + ((index * 13) % 6),
      })),
    [],
  )

  const current = game.current

  if (current === null) {
    return background ? null : <p className="estado">…</p>
  }

  // En otra sección el juego sigue, pero de él solo queda la ventanita.
  if (background) {
    return mini ? (
      <Mini
        lines={short(Math.floor(current.code), lang, 2)}
        perSecond={ui('perSecond', { n: short(cpsOf(current, Date.now()), lang, 1) })}
        labels={{ open: ui('miniOpen'), close: ui('miniClose') }}
        onOpen={() => onOpen?.()}
        onClose={() => {
          setMini(false)
          setMiniOn(false)
        }}
      />
    ) : null
  }

  const now = Date.now()
  const stage = stageOf(current, now)
  const reached = reachedStage(current)
  const shownAchievements = ACHIEVEMENTS.filter(
    (id) => !hiddenAchievement(id) || current.achieved.includes(id),
  )
  const cps = cpsOf(current, now)
  const upgrades = shop(current, now)
  const all = current.before + current.total
  // Se enseñan los edificios que se tienen y los dos siguientes, como incógnita.
  const lastOwned = BUILDINGS.reduce(
    (last, { id }, index) => ((current.owned[id] ?? 0) > 0 ? index : last),
    -1,
  )
  const number = (value: number, decimals = 3): string => short(value, lang, decimals)
  const boosted = current.buffs.some((buff) => buff.id !== 'clot' && buff.until > now)
  const clotted = current.buffs.some((buff) => buff.id === 'clot' && buff.until > now)
  // La lluvia de código es más densa cuanto más se escribe por segundo.
  const drops = cps <= 0 ? 0 : cps < 50 ? 8 : cps < 5000 ? 16 : boosted ? 30 : 24

  /** Lo que hace falta para que algo enseñe su ficha al pasar, enfocar o tocar. */
  const tipOf = (kind: Tip['kind'], id: string) => {
    const show = (element: Element): void => {
      setTip({ kind, id, anchor: element.getBoundingClientRect() })
    }

    return {
      'data-tip': kind,
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch') {
          touch.current = false
          show(event.currentTarget)
        }
      },
      onPointerLeave: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch') setTip(null)
      },
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch') return

        touch.current = true
        primed.current = tipNow.current?.kind === kind && tipNow.current.id === id
        show(event.currentTarget)
      },
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (!touch.current) show(event.currentTarget)
      },
      onBlur: () => {
        if (!touch.current) setTip(null)
      },
    }
  }
  /** En táctil, el primer toque solo enseña la ficha. */
  const ready = (): boolean => !touch.current || primed.current

  const press = (event: PointerEvent<HTMLButtonElement>): void => {
    const gained = click(current, Date.now())
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    const fresh: Pop[] = [
      {
        id: ++counter.current,
        kind: 'num',
        x: x + (Math.random() - 0.5) * 24,
        y,
        text: `+${number(gained, 1)}`,
      },
      { id: ++counter.current, kind: 'ripple', x, y, text: '' },
      ...Array.from({ length: 3 }, (): Pop => ({
        id: ++counter.current,
        kind: 'spark',
        x,
        y,
        text: SPARKS[Math.floor(Math.random() * SPARKS.length)] ?? ';',
        dx: (Math.random() - 0.5) * 150,
      })),
    ]
    const ids = new Set(fresh.map((pop) => pop.id))

    setPops((list) => [...list.slice(-40), ...fresh])
    window.setTimeout(() => {
      setPops((list) => list.filter((pop) => !ids.has(pop.id)))
    }, 1100)
    // El rebote elástico de la tecla, que se reinicia aunque se pulse muy seguido.
    keyArt.current
      ?.querySelector('.cc-key-art')
      ?.animate(
        [
          { transform: 'scale(0.9)' },
          { transform: 'scale(1.07)', offset: 0.45 },
          { transform: 'scale(0.98)', offset: 0.75 },
          { transform: 'scale(1)' },
        ],
        { duration: 320, easing: 'ease-out' },
      )
    play('click', sound)
  }

  const golden = (): void => {
    const at = current.goldenUp
    const result = openGolden(current, Date.now())

    if (result === null || at === null) return

    const bad = result.effect === 'clot' || result.effect === 'ruin'
    const text = ui(`fx_${result.effect}`, { n: number(Math.abs(result.amount), 1) })
    const id = ++counter.current

    setBursts((list) => [...list, { id, x: at.x * 100, y: at.y * 100, text, bad }])
    window.setTimeout(() => {
      setBursts((list) => list.filter((burst) => burst.id !== id))
    }, 3000)
    toast({ icon: bad ? 'bug' : 'golden', title: ui(bad ? 'wrath' : 'golden'), text })
    play(bad ? 'bad' : 'golden', sound)
  }

  const bought = (id: string, done: boolean, upgrade: boolean): void => {
    if (!done) return

    setFlash({ id, n: ++counter.current })
    play(upgrade ? 'upgrade' : 'buy', sound)
  }

  const card = tip === null ? null : cardFor(tip, { game: current, now, lang, selling, amount })
  const level = levelOf(all)
  const paceText = limit.pace === 0 ? ui('limitHole') : String(limit.pace)

  // Se acabó la media hora de hoy: la partida sigue, pero no se juega.
  if (limit.pace !== null && limit.left <= 0) {
    return (
      <section className="cc cc-limited">
        <div className="cc-limit-card">
          <span className="eyebrow">{ui('limitEyebrow')}</span>
          <h2>{ui('limitTitle')}</h2>
          <p>{ui('limitBody', { pace: paceText })}</p>
          <button type="button" className="primary small" onClick={onExit}>
            {ui('back')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`cc stage-${reached} ${stage === 0 && reached > 0 ? 'patched' : ''} ${boosted ? 'boosted' : ''} ${clotted ? 'clotted' : ''}`}
    >
      <header className="cc-head">
        <h2 className="cc-title">{reached >= 3 ? '42 > ./reality' : ui('title')}</h2>
        <PillGroup kind="tabs" options={TABS} value={tab} onChange={setTab} text={ui}>
          <button
            type="button"
            className="pill"
            aria-pressed={sound}
            onClick={() => {
              setSound(!sound)
              setSoundOn(!sound)
              play('buy', !sound)
            }}
          >
            {ui(sound ? 'soundOn' : 'soundOff')}
          </button>
          <button
            type="button"
            className="pill"
            aria-pressed={mini}
            title={ui('miniAbout')}
            onClick={() => {
              setMini(!mini)
              setMiniOn(!mini)
            }}
          >
            {ui(mini ? 'miniOn' : 'miniOff')}
          </button>
          <button type="button" className="pill" onClick={onExit}>
            {ui('back')}
          </button>
        </PillGroup>
      </header>

      {limit.pace !== null && (
        <p className="cc-sync cc-limit-left" role="status">
          {ui('limitLeft', { pace: paceText, min: Math.ceil(limit.left / 60) })}
        </p>
      )}
      {stale && (
        <p className="cc-sync" role="alert">
          <span>{ui('stale')}</span>
          <button
            type="button"
            className="pill"
            onClick={() => {
              void load(true)
            }}
          >
            {ui('staleLoad')}
          </button>
        </p>
      )}
      {bust !== null && (
        <Bust
          key={bust.n}
          bust={bust}
          lang={lang}
          onClose={() => {
            // El aviso de la policía sale una vez: visto, la API lo olvida.
            if (bust.seizure !== null) void api.ackClickerSeizure().catch(() => undefined)
            setBust(null)
          }}
        />
      )}
      {spectate !== undefined && (
        <p className="cc-sync" role="status">
          <span>{ui('spectating', { login: spectate })}</span>
        </p>
      )}
      {offline && !stale && (
        <p className="cc-sync" role="status">
          <span>{ui('offline')}</span>
        </p>
      )}

      {/* El rótulo de noticias, como el de un informativo: una etiqueta, el
          titular y una raya que dice cuánto queda para el siguiente. */}
      <p className="cc-news" role="status">
        <b className="cc-news-tag">{ui('newsTag')}</b>
        <span key={news}>
          {news.startsWith(ui('newsPrefix'))
            ? news.slice(ui('newsPrefix').length).trimStart()
            : news}
        </span>
        <i key={`bar-${news}`} className="cc-news-bar" aria-hidden="true" />
      </p>

      <div className="cc-grid">
        <div className="cc-bank">
          <Skyline stage={reached} />
          <div className="cc-rain" aria-hidden="true">
            {rain.slice(0, drops).map((drop, index) => (
              <i
                key={index}
                style={{
                  left: `${drop.left}%`,
                  animationDelay: `-${drop.delay}s`,
                  animationDuration: `${boosted ? drop.time / 2 : drop.time}s`,
                }}
              >
                {drop.char}
              </i>
            ))}
          </div>
          <Coffee
            achievements={current.achieved.length}
            ducks={current.bought.filter((id) => id.startsWith('duck:')).length}
            title={`${ui(`drink${drinkOf(current.achieved.length)}`)} · ${ui('caffeine', { pct: Math.round(caffeine(current) * 100) })}. ${ui('caffeineAbout')}`}
          />

          <span className="cc-repo">{ui('repo', { login: me })}</span>
          <strong className="cc-count">{number(Math.floor(current.code))}</strong>
          <span className="cc-unit">{ui('code')}</span>
          <span className="cc-cps">
            {ui('perSecond', { n: number(cps, 1) })} ·{' '}
            {ui('clickGain', { n: number(clickPower(current, now), 1) })}
          </span>
          <span
            className="cc-level"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(levelProgress(all) * 100)}
            aria-label={ui('levelBar', { n: level })}
          >
            {/* Con el nivel como clave, las rayas vuelven a correr al subir. */}
            <i key={level} style={{ width: `${levelProgress(all) * 100}%` }} />
            <b>
              {ui('levelBar', { n: level })} → {level + 1}
            </b>
          </span>

          <div className="cc-keywrap">
            <div className="cc-shine" aria-hidden="true" />
            <CursorRing count={current.owned.cursor ?? 0} />
            <button
              ref={keyArt}
              type="button"
              className="cc-key"
              aria-label={ui('title')}
              onPointerDown={press}
            >
              <BigKey stage={reached} />
              {pops.map((pop) =>
                pop.kind === 'ripple' ? (
                  <span key={pop.id} className="cc-ripple" style={{ left: pop.x, top: pop.y }} />
                ) : (
                  <span
                    key={pop.id}
                    className={pop.kind === 'spark' ? 'cc-spark' : 'cc-pop'}
                    style={{
                      left: pop.x,
                      top: pop.y,
                      ...(pop.dx === undefined ? {} : { ['--dx' as string]: `${pop.dx}px` }),
                    }}
                  >
                    {pop.text}
                  </span>
                ),
              )}
            </button>
            {/* Los bugs se pegan alrededor de la tecla, como parásitos. */}
            {current.bugs.map((eaten, index) => (
              <button
                key={index}
                type="button"
                className="cc-bug"
                style={{ ['--a' as string]: `${index * 36 + 18}deg` }}
                title={ui('squashed', { n: number(eaten * BUGS.back, 1) })}
                onClick={() => {
                  const back = squash(current, index)

                  toast({ icon: 'bug', title: ui('squashed', { n: number(back, 1) }), text: '' })
                  play('squash', sound)
                }}
              >
                <Tile icon="bug" size={34} />
              </button>
            ))}
          </div>

          {current.buffs.length > 0 && (
            <div className="cc-buffs">
              {current.buffs.map((buff) => (
                <span key={buff.id} className={`cc-buff ${buff.id}`}>
                  <i
                    style={{
                      width: `${Math.max(0, Math.min(1, (buff.until - now) / GOLDEN[buff.id].ms)) * 100}%`,
                    }}
                  />
                  <b>
                    {ui(`fx_${buff.id}`).split(/[!:]/)[0]} · {Math.ceil((buff.until - now) / 1000)}{' '}
                    s
                  </b>
                </span>
              ))}
            </div>
          )}

          {current.bugs.length > 0 && (
            <small className="cc-bugs">
              {ui('bugs', {
                n: current.bugs.length,
                pct: Math.round(current.bugs.length * BUGS.share * 100),
              })}
            </small>
          )}

          {reached > 0 &&
            (now < current.hotfixUntil ? (
              <span className="cc-hotfix on">
                {ui('hotfixOn', { n: span((current.hotfixUntil - now) / 1000) })}
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
              <span>
                <Tile icon={current.goldenUp.wrath ? 'bug' : 'golden'} size={64} />
              </span>
            </button>
          )}
          {bursts.map((burst) => (
            <span
              key={burst.id}
              className={`cc-burst ${burst.bad ? 'bad' : ''}`}
              style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <i key={index} style={{ ['--a' as string]: `${index * 30}deg` }} />
              ))}
              <b>{burst.text}</b>
            </span>
          ))}
        </div>

        <div className="cc-middle">
          {tab === 'play' && (
            <div className="cc-rows">
              {BUILDINGS.filter(({ id }) => (current.owned[id] ?? 0) > 0).map(({ id }) => {
                const owned = current.owned[id] ?? 0

                return (
                  <div
                    key={id}
                    className={`cc-row ${id === 'pisciner' && stage > 0 ? `possessed-${stage}` : ''}`}
                    style={{ ['--h' as string]: hueOf(id) }}
                    tabIndex={0}
                    {...tipOf('building', id)}
                  >
                    <Backdrop id={id} />
                    <span className="cc-row-name">
                      {texts.buildings[id][0]} <b>×{owned}</b>
                      <small>
                        {ui('rowSpeed', { n: number(buildingShare(current, id).all, 1) })}
                      </small>
                    </span>
                    <span className="cc-row-strip">
                      {Array.from({ length: Math.min(ROW_UNITS, owned) }, (_, index) => (
                        <span
                          key={index}
                          className="cc-unit-tile"
                          style={{
                            ['--y' as string]: `${((index * 37) % 9) - 4}px`,
                            animationDelay: `${((index * 13) % 10) / 5}s`,
                          }}
                        >
                          <Tile icon={id} size={30} />
                        </span>
                      ))}
                      {owned > ROW_UNITS && <b className="cc-row-more">+{owned - ROW_UNITS}</b>}
                    </span>
                  </div>
                )
              })}
              {lastOwned < 0 && <p className="cc-hint">{texts.buildings.cursor[2]}</p>}
            </div>
          )}

          {tab === 'stats' && (
            <div className="cc-stats">
              <dl>
                {(
                  [
                    ['statLevel', String(level)],
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
                    [
                      'statDonated',
                      `${number(current.donated)} (+${Math.round(donationBonus(current) * 100)} %)`,
                    ],
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
              <CapitalHistory
                lang={lang}
                label={ui('capital', { n: number(capitalOf(current)) })}
                live={capitalOf(current)}
              />
              <p className="cc-hint">{ui('prestigeAbout')}</p>
              {prestigeAfter(current) > current.prestige ? (
                <>
                  <p className="cc-hint">{ui('recompileAbout', { n: prestigeAfter(current) })}</p>
                  <button
                    type="button"
                    className="cc-recompile"
                    onClick={() => {
                      void confirm
                        .ask({
                          body: ui('recompileAsk', { n: prestigeAfter(current) }),
                          okText: ui('recompile'),
                          danger: true,
                        })
                        .then((ok) => {
                          if (!ok || game.current === null) return
                          game.current = recompile(game.current, Date.now())
                          save(true)
                        })
                    }}
                  >
                    {ui('recompile')}
                  </button>
                </>
              ) : (
                <p className="cc-hint">{ui('recompileNo')}</p>
              )}
              {current.bought.length > 0 && (
                <>
                  <span className="eyebrow">
                    {ui('boughtUpgrades', { n: current.bought.length })}
                  </span>
                  <div className="cc-upgrades owned">
                    {current.bought.map((id) => {
                      const upgrade = UPGRADE.get(id)

                      return upgrade === undefined ? null : (
                        <span key={id} className="cc-upgrade" tabIndex={0} {...tipOf('owned', id)}>
                          <Tile
                            icon={upgrade.icon}
                            size={36}
                            tier={upgrade.tier}
                            {...(upgrade.icon === 'project' ? { label: '42' } : {})}
                          />
                        </span>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'achievements' && (
            <>
              <p className="cc-hint">
                {current.achieved.length} / {shownAchievements.length} ·{' '}
                {ui('caffeine', {
                  pct: Math.round(current.achieved.length * CAFFEINE_PER_ACHIEVEMENT * 100),
                })}
              </p>
              <div className="cc-achievements">
                {shownAchievements.map((id) => {
                  const got = current.achieved.includes(id)
                  const index = ACHIEVEMENTS.indexOf(id)

                  return (
                    <span
                      key={id}
                      className={`cc-achievement ${got ? 'got' : ''}`}
                      tabIndex={0}
                      {...tipOf('achievement', id)}
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
                <>
                  <p className="cc-hint">{ui('boardHint')}</p>
                  <ol>
                    {withMe(board.entries, board.me).map((row) => (
                      <li key={row.login} className={row.login === me ? 'me' : ''}>
                        <b>{row.rank}</b>
                        <Avatar login={row.login} image={row.image} size={28} />
                        <span>
                          <strong>
                            {row.login}
                            {row.login === me && ` · ${ui('you')}`}
                          </strong>
                          <small>
                            {ui('wealth')} {number(row.wealth, 1)} · {ui('level')} {row.level} ·{' '}
                            {row.achievements} <Tile icon="trophy" size={14} />
                          </small>
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </div>

        <div className="cc-store">
          {upgrades.length > 0 && (
            <>
              <span className="eyebrow">{ui('upgrades')}</span>
              <div className="cc-upgrades">
                {upgrades.slice(0, 24).map((upgrade) => {
                  const poor = upgrade.price > current.code

                  return (
                    <button
                      key={upgrade.id}
                      type="button"
                      className={`cc-upgrade ${poor ? 'poor' : 'can'}`}
                      aria-label={upgradeText(upgrade.id, lang)[0]}
                      aria-disabled={poor}
                      style={{ ['--reach' as string]: reach(current, upgrade.price) }}
                      {...tipOf('upgrade', upgrade.id)}
                      onClick={() => {
                        if (!ready()) return

                        bought(upgrade.id, buyUpgrade(current, upgrade.id, Date.now()), true)
                        setTip(null)
                      }}
                    >
                      <Tile
                        icon={upgrade.icon}
                        size={44}
                        tier={upgrade.tier}
                        {...(upgrade.icon === 'project' ? { label: '42' } : {})}
                      />
                    </button>
                  )
                })}
              </div>
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

              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`cc-building ${able ? 'can' : 'poor'} ${known ? '' : 'unknown'}`}
                    aria-disabled={!able}
                    style={{
                      ['--reach' as string]: selling ? 1 : reach(current, price),
                      ['--h' as string]: hueOf(id),
                    }}
                    {...tipOf('building', id)}
                    onClick={() => {
                      if (!able || !ready()) return

                      bought(
                        id,
                        selling ? sell(current, id, amount) : buy(current, id, amount),
                        false,
                      )
                    }}
                  >
                    {flash?.id === id && <i key={flash.n} className="cc-flash" />}
                    <Tile icon={id} size={46} dim={!known} />
                    <span>
                      <strong>{known ? texts.buildings[id][0] : ui('locked')}</strong>
                      <small className={able ? 'can' : 'cannot'}>{number(price)}</small>
                    </span>
                    <b key={owned}>{owned > 0 ? owned : ''}</b>
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

      {card !== null && tip !== null && (
        <CardView
          card={card}
          anchor={tip.anchor}
          stage={reached}
          price={(value) => number(value)}
          {...(touch.current && card.price !== undefined ? { hint: ui('cardTouch') } : {})}
        />
      )}
      {confirm.dialog}
    </section>
  )
}
