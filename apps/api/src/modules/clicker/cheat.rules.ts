/**
 * Code Clicker: cómo se nota que una partida tiene trampa.
 *
 * La API no juega, así que no puede rehacer la partida. Lo que sí puede es
 * comprobar que las cuentas salen: que no se tiene más de lo que se ha escrito,
 * y que no se ha escrito más de lo que da tiempo desde el último guardado, ni
 * con la mejor racha.
 *
 * Los márgenes son anchos a propósito. Pillar a quien no ha hecho nada cuesta
 * mucho más (pierde todo lo comprado) que dejar pasar una trampa pequeña: aquí
 * solo cae lo que es desproporcionado.
 */

/**
 * Precio base de cada edificio y lo que encarece cada compra. Son los de
 * `apps/web/src/features/clicker/data.ts`; un test comprueba que no se separan.
 */
export const BASE_PRICE: Readonly<Record<string, number>> = {
  cursor: 15,
  pisciner: 100,
  cluster: 1_100,
  overflow: 12_000,
  pipeline: 130_000,
  repo: 1_400_000,
  temple: 20_000_000,
  regex: 330_000_000,
  docker: 5_100_000_000,
  compiler: 75_000_000_000,
  portal: 1e12,
  rebase: 1.4e13,
  quantum: 1.7e14,
  neural: 2.1e15,
  fuzzer: 2.6e16,
  recursion: 3.1e17,
  terminal: 7.1e19,
  forks: 1.2e22,
  hive: 1.9e24,
  you: 5.4e26,
}
export const GROWTH = 1.15

/** Segundos que se dan de más al tiempo pasado: relojes, red y guardados que se cruzan. */
const GRACE_S = 120
/** Por cuánto se multiplica lo que cabría esperar antes de sospechar. */
const SAFETY = 3
/**
 * Lo más que rinde un segundo sin tocar nada: con diez bugs pegados, lo que no
 * se comen más lo que devuelven al aplastarlos (cada uno, todo lo comido).
 */
const PASSIVE = 6
/** Segundos de producción que puede valer una pull request dorada (la racha ×666 de 6 s). */
const GOLDEN_SECONDS = 4000
/** Cada cuánto puede salir una, como poco. */
const GOLDEN_EVERY_S = 300
/** Lo que multiplica las pulsaciones la mejor racha. */
const CLICK_COMBO = 777
/** Pulsaciones por segundo que se dan por humanas. */
const CLICKS_PER_S = 30
/** Lo que da una pulsación como mucho: las ocho de base y una parte de la producción. */
const CLICK_BASE = 8
const CLICK_SHARE = 0.2
/** Lo que devuelve un bug al aplastarlo, sobre lo que se comió. */
const BUG_BACK = 1.1
/** Un nivel de prestigio por cada raíz cúbica de billones escritos. */
const PRESTIGE_UNIT = 1e12
/**
 * Líneas por segundo que caben, como mucho, por cada línea escrita en total.
 * Jugando a comprar siempre lo que más rinde no se pasa de 0,007.
 */
const CPS_PER_TOTAL = 0.1

/** Lo que se lee de una partida guardada para hacerle las cuentas. */
export type Ledger = {
  /** Líneas sin gastar. */
  code: number
  /** Líneas escritas en esta partida, y en las anteriores a recompilar. */
  total: number
  before: number
  clicks: number
  golden: number
  /** Lo que llevan comido los bugs pegados. */
  bugs: number
  /** Lo que costaron los edificios que se tienen. */
  holdings: number
}

const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

/** Lee una partida; `null` si no es una partida. */
export function readSave(save: string): Ledger | null {
  let parsed: Record<string, unknown>

  try {
    const read: unknown = JSON.parse(save)

    if (typeof read !== 'object' || read === null || Array.isArray(read)) return null

    parsed = read as Record<string, unknown>
  } catch {
    return null
  }

  const code = amount(parsed.code)
  const total = amount(parsed.total)

  if (code === null || total === null) return null

  const owned =
    typeof parsed.owned === 'object' && parsed.owned !== null
      ? (parsed.owned as Record<string, unknown>)
      : {}
  let holdings = 0

  for (const [id, count] of Object.entries(owned)) {
    const base = BASE_PRICE[id]
    const units = amount(count)

    // Un edificio que no existe o una cantidad imposible: como si costara infinito.
    if (base === undefined || units === null || !Number.isInteger(units)) {
      holdings = Infinity
    } else {
      holdings += (base * (GROWTH ** units - 1)) / (GROWTH - 1)
    }
  }

  return {
    code,
    total,
    before: amount(parsed.before) ?? 0,
    clicks: amount(parsed.clicks) ?? 0,
    golden: amount(parsed.golden) ?? 0,
    bugs: Array.isArray(parsed.bugs)
      ? parsed.bugs.reduce((sum: number, bug) => sum + (amount(bug) ?? 0), 0)
      : 0,
    holdings,
  }
}

/** Las cifras que manda la web con cada guardado. */
export type Figures = {
  total: number
  perSecond: number
  prestige: number
  /** Lo que la web dice que costó todo lo que se tiene, mejoras incluidas. */
  spent: number
}

/** Por qué una partida no cuadra. */
export type Reason = 'figures' | 'ledger' | 'rate' | 'speed' | 'prestige' | 'clicks'

/** Margen de las cuentas con decimales: precios redondeados y números enormes. */
const slack = (total: number): number => total * 1e-3 + 1000

/** Lo que se tiene de más sobre lo que se ha escrito en la partida. */
const excess = (ledger: Ledger, spent: number): number =>
  ledger.code + Math.max(ledger.holdings, spent) - ledger.total

/**
 * Compara un guardado con el anterior.
 *
 * @param before El último guardado que entró: sus cifras, cuándo fue (ms) y su
 *   partida, o `null` en `ledger` si aún no había ninguna.
 * @returns Por qué no cuadra, o `null` si no hay nada raro.
 */
export function verdict(
  before: {
    total: number
    perSecond: number
    at: number
    ledger: Ledger | null
    /** Lo cobrado de la bolsa común desde ese guardado: vale como escrito. */
    bonus?: number
  },
  sent: Figures,
  ledger: Ledger,
  now: number,
): Reason | null {
  // Las cifras de la clasificación tienen que ser las de la partida.
  if (Math.abs(sent.total - (ledger.before + ledger.total)) > slack(sent.total)) return 'figures'

  // No se puede tener (sin gastar o en edificios) más de lo que se ha escrito.
  // Si la partida anterior ya no cuadraba, solo cuenta que cuadre aún menos:
  // así una partida vieja no se queda pillada para siempre.
  const over = excess(ledger, sent.spent)
  const overBefore = before.ledger === null ? 0 : Math.max(0, excess(before.ledger, 0))

  if (over > slack(ledger.total) && over > overBefore * 1.001 + slack(ledger.total)) {
    return 'ledger'
  }

  if (sent.prestige > Math.cbrt(sent.total / PRESTIGE_UNIT) + 1) return 'prestige'
  if (sent.perSecond > sent.total * CPS_PER_TOTAL + 10) return 'speed'

  const gain = sent.total - before.total

  if (gain <= 0) return null

  const seconds = Math.max(0, now - before.at) / 1000 + GRACE_S
  const rate = Math.max(before.perSecond, sent.perSecond)
  // Lo que se ha pulsado y las doradas que se han abierto, según la partida y
  // sin pasar de lo que da tiempo. Si la cuenta ha bajado es que se recompiló:
  // vale el tope.
  const most = (count: number, counted: number | undefined, cap: number): number =>
    counted === undefined || count < counted ? cap : Math.min(cap, count - counted)
  const goldens = most(ledger.golden, before.ledger?.golden ?? 0, 1 + seconds / GOLDEN_EVERY_S)
  const clicks = most(ledger.clicks, before.ledger?.clicks ?? 0, seconds * CLICKS_PER_S)
  const passive = PASSIVE * rate * (seconds + goldens * GOLDEN_SECONDS)
  const byHand = clicks * (CLICK_BASE + CLICK_SHARE * rate) * (goldens > 0 ? CLICK_COMBO : 1)
  const allowed =
    SAFETY * (passive + byHand) +
    (before.ledger?.bugs ?? 0) * BUG_BACK +
    13 * goldens +
    1000 +
    (before.bonus ?? 0)

  return gain > allowed ? 'rate' : null
}

/**
 * La política de trampas, en cada trampa pillada: vuelve la última partida
 * buena, se venden todos sus edificios y se le da esta parte de lo que
 * costaron. La misma cantidad se reparte entre quienes nunca han sido pillados.
 * Es `FORCED_REFUND` de la web (`data.ts`); un test comprueba que coinciden.
 */
export const SALE_REFUND = 0.5

/** El título que deja en el banner haber sido pillado tantas veces. */
export function hackerTitle(
  caught: number,
): 'hacker_etico' | 'hacker_poco_etico' | 'hacker_cazado' | null {
  if (caught <= 0) return null

  return caught === 1 ? 'hacker_etico' : caught === 2 ? 'hacker_poco_etico' : 'hacker_cazado'
}

/** Lo que da un «commit de la suerte»: como en la web (`openGolden`, `data.ts`). */
const LUCKY_SHARE = 0.15
const LUCKY_SECONDS = 900

/** Cuántos commits de la suerte vale coger el botín de la bolsa común. */
export const POOL_LUCKY_TIMES = 10

/** Lo que se lleva alguien del botín: diez commits de la suerte, sin pasar de lo que hay. */
export function poolShare(code: number, perSecond: number, pool: number): number {
  const lucky = Math.min(code * LUCKY_SHARE, perSecond * LUCKY_SECONDS) + 13

  return Math.max(0, Math.min(pool, POOL_LUCKY_TIMES * lucky))
}

/** Cada cuánto puede coger alguien del botín, como poco: lo que tarda en salir una dorada. */
export const POOL_EVERY_MS = GOLDEN_EVERY_S * 1000

/**
 * Lo que vale lo que se requisa: lo que costaron los edificios. Una partida con
 * edificios imposibles (`holdings` infinito) no aporta nada a la bolsa.
 */
export function seizedValue(ledger: Ledger | null): number {
  return ledger === null || !Number.isFinite(ledger.holdings) ? 0 : ledger.holdings * SALE_REFUND
}

/** Lo que le toca a cada persona limpia del reparto: a partes iguales. */
export function giftShare(amount: number, people: number): number {
  return people > 0 && Number.isFinite(amount) && amount > 0 ? amount / people : 0
}
