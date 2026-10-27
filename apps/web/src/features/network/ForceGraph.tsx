import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import type { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import { photoUrl } from '../../shared/api'
import { byWeight, graphSignature, spotAt, spotIndex } from './graph-data'
import type { SpotIndex } from './graph-data'
import {
  MOVING_LINKS,
  isHeavy,
  layerBase,
  reuseTransform,
  inside,
  layerKey,
  segmentMeets,
  strongest,
  visibleBounds,
} from './graph-layers'

type ForceGraphProps = {
  nodes: readonly NetworkNode[]
  links: readonly NetworkLink[]
  /** Color de cada persona. Cambiarlo repinta sin recolocar. */
  colorOf: (node: NetworkNode) => string
  /** Persona elegida: ella y su entorno se quedan encendidos. */
  selected: string | null
  onSelect: (login: string | null) => void
  /** Texto para lectores de pantalla: el grafo en sí es un dibujo. */
  label: string
  /** Lo que se enseña junto a la burbuja bajo el ratón. */
  tooltip: (node: NetworkNode) => ReactNode
  /** Nombres de los botones de zoom y del buscador. */
  controls: {
    zoomIn: string
    zoomOut: string
    fit: string
    find: string
    none: string
    /** La leyenda de las flechas de quien está elegido. */
    gave: string
    got: string
  }
  /**
   * Uniones sin sentido (la red de asientos): una recta con su cifra, sin
   * puntas ni leyenda de flechas. La cifra es `forth`.
   */
  undirected?: boolean
}

/** Una persona dentro de la simulación: los datos y dónde está. */
type SimNode = SimulationNodeDatum & { login: string; data: NetworkNode; r: number }
type SimLink = SimulationLinkDatum<SimNode> & {
  weight: number
  mutual: boolean
  /** Veces que `source` ha corregido a `target`, y al revés. */
  forth: number
  back: number
  /** `true` si une a dos personas de la misma comunidad. */
  inner: boolean
}

/** Desplazamiento y escala de la vista. */
type View = { x: number; y: number; k: number }

/** Todo lo que el dibujo necesita y que no debe provocar renders de React. */
type Scene = {
  nodes: SimNode[]
  links: SimLink[]
  neighbours: Map<string, Set<string>>
  simulation: Simulation<SimNode, SimLink> | null
  view: View
  hover: SimNode | null
  /** `true` hasta que la primera colocación se ha encajado en pantalla. */
  needsFit: boolean
  /** Si la persona ha movido la vista, no se le vuelve a encajar sola. */
  touched: boolean
  frame: number
  /** `true` si alguien ha pedido repintar: un fotograma sin paso ni petición no pinta. */
  dirty: boolean
  /** Pasos de la simulación desde que llegaron los datos. */
  ticks: number
  /** Las uniones por peso (`byWeight`): cada grupo se pinta de un solo trazo. */
  groups: SimLink[][]
  /** Las más fuertes, también por peso: las únicas que se pintan mientras todo se mueve. */
  strong: SimLink[][]
  /** Las que se pintan mientras se mueve un grafo pesado (modo ligero). */
  strongHeavy: SimLink[][]
  /** Índice de burbujas por sitio para el ratón, y de qué `version` es. */
  spots: { index: SpotIndex<SimNode>; version: number } | null
  /** Huella de los datos con los que se montó la simulación (`graphSignature`). */
  signature: string
  /** `true` mientras la simulación recoloca las burbujas. */
  moving: boolean
  /** Sube con cada cosa que cambia lo que se ve en las uniones (ver `graph-layers.ts`). */
  version: number
}

/** Con cuánta fuerza tira de cada burbuja el centro de su comunidad. */
const COMMUNITY_PULL = 0.16

/** Sitio que ocupan los rótulos de arriba y la leyenda de abajo, en píxeles. */
const FIT_TOP = 34
const FIT_BOTTOM = 64

const MIN_ZOOM = 0.08
const MAX_ZOOM = 6
/** Al ir a una persona buscada: el zoom mínimo con el que se la ve bien, y lo que tarda. */
const GO_TO_ZOOM = 1.6
const GO_TO_MS = 450
/** Personas que se ofrecen al buscar. */
const FOUND_MAX = 6

/**
 * Por debajo de este calor la simulación se da por quieta y el bucle de
 * fotogramas se para del todo (d3 trae 0,001: los últimos cien pasos casi no
 * movían nada y costaban como los primeros).
 */
const ALPHA_MIN = 0.005
/**
 * Calor al arrastrar una burbuja: lo justo para que sus vecinas la sigan. Con
 * 0,25, como antes, el grafo entero se recolocaba a cada movimiento.
 */
const DRAG_HEAT = 0.08
/** Nombres que se pintan como mucho en un fotograma: más no se leen. */
const MAX_LABELS = 120
/** En modo ligero (grafo pesado), menos nombres. */
const MAX_LABELS_HEAVY = 40
/** Uniones que se pintan mientras se mueve un grafo pesado. */
const MOVING_LINKS_HEAVY = 1200
/**
 * Lo que tiene que pasar sin tocar la vista para volver a pintar nítida la capa
 * de uniones. Mientras dura el zoom o el arrastre se reaprovecha la de antes.
 */
const VIEW_SETTLE_MS = 180
/** Con más burbujas que esto, las fotos esperan a que el grafo se quede quieto. */
const PHOTOS_WHILE_MOVING = 400

/** `true` mientras la simulación tenga calor o alguien la esté calentando (arrastrar). */
function isHot(simulation: Simulation<SimNode, SimLink>): boolean {
  return (
    simulation.alpha() >= simulation.alphaMin() || simulation.alphaTarget() >= simulation.alphaMin()
  )
}

/**
 * Radio de una burbuja. El área es proporcional a su actividad, y la escala es
 * relativa a la persona más activa de lo que se ve: así las diferencias se
 * notan igual en un mes (pocas correcciones) que en todo el histórico.
 */
function radiusOf(node: NetworkNode, busiest: number): number {
  const activity = node.given + node.received

  return Math.min(
    4.5 + 24 * Math.sqrt(activity / busiest),
    // Con muy poca actividad en total, nadie se hace enorme por tener tres.
    4.5 + Math.sqrt(activity) * 3,
  )
}

const weightOf = (link: NetworkLink): number => link.forth + link.back

/**
 * Fuerza que junta a cada persona con su comunidad: tira de cada burbuja hacia
 * el centro de las de su grupo. Con ella los grupos se separan a la vista en
 * vez de quedar mezclados en una sola nube.
 */
function communityForce(nodes: readonly SimNode[]): (alpha: number) => void {
  return (alpha) => {
    const centres = new Map<number, { x: number; y: number; n: number }>()

    for (const node of nodes) {
      const centre = centres.get(node.data.community) ?? { x: 0, y: 0, n: 0 }

      centre.x += node.x ?? 0
      centre.y += node.y ?? 0
      centre.n += 1
      centres.set(node.data.community, centre)
    }

    for (const node of nodes) {
      const centre = centres.get(node.data.community)

      // Una comunidad de una sola persona no tiene a dónde ir.
      if (centre === undefined || centre.n < 2) {
        continue
      }

      node.vx = (node.vx ?? 0) + (centre.x / centre.n - (node.x ?? 0)) * COMMUNITY_PULL * alpha
      node.vy = (node.vy ?? 0) + (centre.y / centre.n - (node.y ?? 0)) * COMMUNITY_PULL * alpha
    }
  }
}

/** Lado, en píxeles, de cada foto ya recortada en redondo. */
const PHOTO_PX = 128

/**
 * Fotos ya pedidas, entre montajes: cambiar un filtro no las vuelve a descargar.
 * Se guardan ya recortadas en redondo: recortar cada foto en cada fotograma
 * (`clip`) era de lo que más costaba con el grafo moviéndose.
 */
const pictures = new Map<string, HTMLCanvasElement | null | 'loading'>()

/**
 * Fotos pidiéndose ahora. Se piden pocas a la vez (cada una se decodifica en el
 * hilo de la página) y, al desmontar el grafo, las que falten se cortan: si
 * no, seguían llegando y decodificándose un buen rato en otra sección.
 */
const loading = new Map<string, HTMLImageElement>()
const PHOTO_LOADS = 6

/** Corta las fotos a medio pedir; se volverán a pedir si se vuelven a ver. */
function dropLoading(): void {
  for (const [url, image] of loading) {
    image.onload = null
    image.onerror = null
    image.src = ''
    pictures.delete(url)
  }
  loading.clear()
}

/** La foto cuadrada del centro, recortada en un círculo. */
function roundPicture(image: HTMLImageElement): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const side = Math.min(image.naturalWidth, image.naturalHeight)

  if (context === null || side === 0) return null

  canvas.width = PHOTO_PX
  canvas.height = PHOTO_PX
  context.beginPath()
  context.arc(PHOTO_PX / 2, PHOTO_PX / 2, PHOTO_PX / 2, 0, 2 * Math.PI)
  context.clip()
  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_PX,
    PHOTO_PX,
  )

  return canvas
}

function pictureOf(url: string, onLoad: () => void): HTMLCanvasElement | null {
  const known = pictures.get(url)

  if (known !== undefined) {
    return known === 'loading' ? null : known
  }
  // Ya hay bastantes en camino: esta se pide en un dibujo próximo.
  if (loading.size >= PHOTO_LOADS) return null

  const image = new Image()

  // Al llegar una (o fallar) se repinta, y ese dibujo pide las siguientes.
  image.onload = () => {
    loading.delete(url)
    pictures.set(url, roundPicture(image))
    onLoad()
  }
  image.onerror = () => {
    loading.delete(url)
    pictures.set(url, null)
    onLoad()
  }
  image.src = url
  pictures.set(url, 'loading')
  loading.set(url, image)

  return null
}

/**
 * El grafo de correcciones: burbujas que se recolocan solas.
 *
 * Cada persona es una burbuja (más grande cuanto más corrige y es corregida) y
 * cada unión tira de las dos con más fuerza cuantas más correcciones comparten,
 * así que quienes se corrigen mucho acaban juntos. Se pinta en un `<canvas>`
 * porque con cientos de personas el SVG no da abasto.
 *
 * Rueda: zoom. Arrastrar el fondo: mover. Arrastrar una burbuja: recolocarla.
 */
export function ForceGraph({
  nodes,
  links,
  colorOf,
  selected,
  onSelect,
  label,
  tooltip,
  controls,
  undirected = false,
}: ForceGraphProps) {
  // La burbuja bajo el ratón y dónde está en pantalla, para su etiqueta flotante.
  const [tip, setTip] = useState<{ node: NetworkNode; x: number; y: number } | null>(null)
  /** Acciones de los botones, que viven dentro del efecto del dibujo. */
  const actions = useRef({
    zoomBy: (_factor: number): void => undefined,
    fit: (): void => undefined,
    goTo: (_login: string): void => undefined,
  })
  // Lo escrito en el buscador de dentro del grafo.
  const [query, setQuery] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scene = useRef<Scene>({
    nodes: [],
    links: [],
    neighbours: new Map(),
    simulation: null,
    view: { x: 0, y: 0, k: 1 },
    hover: null,
    needsFit: true,
    touched: false,
    frame: 0,
    dirty: false,
    ticks: 0,
    groups: [],
    strong: [],
    strongHeavy: [],
    spots: null,
    signature: '',
    moving: false,
    version: 0,
  })
  // Lo último que llegó por props, a mano para el dibujo sin volver a montar nada.
  const live = useRef({ colorOf, selected, onSelect, undirected })

  live.current = { colorOf, selected, onSelect, undirected }

  /** Pide un repintado para el siguiente fotograma. Varias peticiones son una. */
  const schedule = useRef<() => void>(() => undefined)

  // --- Dibujo y eventos: se montan una vez ---------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (canvas === null || context === null || context === undefined) {
      return undefined
    }

    const stage: HTMLCanvasElement = canvas
    /** La capa de uniones ya pintada, y de qué estado es. */
    const layerCanvas = document.createElement('canvas')
    const layerContext = layerCanvas.getContext('2d')

    if (layerContext === null) return undefined

    const layer = {
      canvas: layerCanvas,
      context: layerContext,
      key: '',
      /** Lo mismo sin la vista, y la vista con la que se pintó. */
      base: '',
      view: { x: 0, y: 0, k: 1 },
    }
    /** La última vista pintada y cuándo cambió por última vez (zoom, arrastre). */
    let lastView = { x: 0, y: 0, k: 1 }
    let viewAt = -Infinity
    let settle: ReturnType<typeof setTimeout> | null = null
    /** Dónde está el lienzo en la página. Se guarda: pedirlo en cada movimiento del ratón obliga a recalcular la página. */
    let box = canvas.getBoundingClientRect()
    const measure = (): void => {
      box = canvas.getBoundingClientRect()
    }
    /** El viaje en curso hasta una burbuja buscada, para poder cortarlo. */
    let travel = 0
    const state = scene.current
    let width = 0
    let height = 0
    let palette = readPalette()

    // El grafo va siempre sobre fondo oscuro, sea cual sea el tema: sus colores
    // son los del "escenario" (`--stage-*`), que pone cada estilo.
    function readPalette() {
      const style = getComputedStyle(stage)
      const read = (name: string, fallback: string): string =>
        style.getPropertyValue(name).trim() || fallback

      return {
        text: read('--stage-text', '#eef6f4'),
        muted: read('--stage-muted', '#8fa39d'),
        surface: read('--stage-halo', '#071110'),
        accent: read('--stage-accent', '#2bdcd5'),
        link: read('--stage-link', '#9db4ae'),
        gave: read('--stage-gave', '#7ff3ee'),
        got: read('--stage-got', '#ffb36b'),
      }
    }

    const fit = (): void => {
      if (state.nodes.length === 0 || width === 0) {
        return
      }

      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity

      for (const node of state.nodes) {
        minX = Math.min(minX, (node.x ?? 0) - node.r)
        maxX = Math.max(maxX, (node.x ?? 0) + node.r)
        minY = Math.min(minY, (node.y ?? 0) - node.r)
        maxY = Math.max(maxY, (node.y ?? 0) + node.r)
      }

      // Arriba y abajo hay rótulos flotando (contador, leyenda): el grafo se
      // encaja en lo que queda libre entre ellos.
      const free = Math.max(120, height - FIT_TOP - FIT_BOTTOM)
      const k = Math.max(
        MIN_ZOOM,
        Math.min(1.6, 0.94 * Math.min(width / (maxX - minX || 1), free / (maxY - minY || 1))),
      )

      state.view = {
        k,
        x: width / 2 - ((minX + maxX) / 2) * k,
        y: FIT_TOP + free / 2 - ((minY + maxY) / 2) * k,
      }
    }

    const draw = (): void => {
      const { view, hover } = state
      // Grafo pesado: modo ligero, sin fotos, sin flechas ni cifras y con menos nombres.
      const heavy = isHeavy(state.nodes.length, state.links.length)
      const now = performance.now()

      if (view.x !== lastView.x || view.y !== lastView.y || view.k !== lastView.k) {
        lastView = { ...view }
        viewAt = now
      }
      const { colorOf: color, selected: chosen } = live.current
      const ratio = window.devicePixelRatio || 1
      // Lo que manda: la burbuja bajo el ratón, o si no la elegida.
      const focus = hover?.login ?? chosen
      const around = focus === null ? null : (state.neighbours.get(focus) ?? new Set<string>())
      // Con muchas uniones por persona, cada una se pinta más tenue.
      const density = Math.min(
        1,
        2.2 / Math.sqrt(state.links.length / (state.nodes.length || 1) || 1),
      )
      const lit = (login: string): boolean =>
        around === null || login === focus || around.has(login)
      // Lo que cae fuera de lo que se ve no se pinta (con zoom, casi todo).
      const bounds = visibleBounds(view, width, height)
      const shown = (node: SimNode): boolean =>
        inside(bounds, node.x ?? 0, node.y ?? 0, node.r + 20)
      const crosses = (link: SimLink): boolean => {
        const from = link.source as SimNode
        const to = link.target as SimNode

        return segmentMeets(bounds, from.x ?? 0, from.y ?? 0, to.x ?? 0, to.y ?? 0)
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.translate(view.x, view.y)
      context.scale(view.k, view.k)

      // Uniones. Con el grafo quieto, las que no están encendidas salen de una
      // capa ya pintada (`graph-layers.ts`) y solo se pintan encima las de quien
      // está elegido. Mientras se mueve, con muchas, solo las más fuertes.
      const style = (target: CanvasRenderingContext2D, link: SimLink, on: boolean): void => {
        target.lineWidth = (0.5 + Math.sqrt(link.weight) * 0.75) / Math.sqrt(view.k)
        // En reposo, todas del mismo gris: el color es para las burbujas. Al
        // elegir a alguien, las suyas se encienden, en turquesa las mutuas.
        target.strokeStyle = around !== null && on && link.mutual ? palette.accent : palette.link
        target.globalAlpha = on
          ? around === null
            ? Math.min(0.7, (0.1 + link.weight * 0.05) * density)
            : 0.9
          : 0.04
      }
      const touches = (link: SimLink): boolean =>
        (link.source as SimNode).login === focus || (link.target as SimNode).login === focus
      /**
       * Las uniones de quien está elegido, con sentido, en una sola recta: la
       * punta va hacia quien fue corregido, en un color si corrigió esa persona
       * y en otro si la corrigieron. Si fueron las dos cosas, la recta se parte
       * por la mitad: cada mitad lleva su color y su punta hacia su burbuja.
       */
      const directed = (link: SimLink): void => {
        if (!crosses(link)) return

        // Modo ligero: sin flechas ni cifras, una recta encendida.
        if (heavy) {
          const from = link.source as SimNode
          const to = link.target as SimNode

          context.globalAlpha = 0.9
          context.strokeStyle = link.mutual ? palette.accent : palette.gave
          context.lineWidth = (0.8 + Math.sqrt(link.weight) * 0.6) / Math.sqrt(view.k)
          context.beginPath()
          context.moveTo(from.x ?? 0, from.y ?? 0)
          context.lineTo(to.x ?? 0, to.y ?? 0)
          context.stroke()

          return
        }

        const source = link.source as SimNode
        const target = link.target as SimNode
        const x1 = source.x ?? 0
        const y1 = source.y ?? 0
        const x2 = target.x ?? 0
        const y2 = target.y ?? 0
        const length = Math.hypot(x2 - x1, y2 - y1)

        if (length < source.r + target.r) return

        const ux = (x2 - x1) / length
        const uy = (y2 - y1) / length
        // Los bordes de las dos burbujas, y el punto medio entre ellos.
        const ax = x1 + ux * (source.r + 1 / view.k)
        const ay = y1 + uy * (source.r + 1 / view.k)
        const bx = x2 - ux * (target.r + 1 / view.k)
        const by = y2 - uy * (target.r + 1 / view.k)
        const both = link.forth > 0 && link.back > 0
        const midX = (ax + bx) / 2
        const midY = (ay + by) / 2
        const size = 11 / view.k
        // Con dos cifras y la recta corta, cada una a un lado para no pisarse.
        const apart = both && Math.hypot(bx - ax, by - ay) / 2 < size * 4 ? size * 0.9 : 0

        /** Un tramo de `(fx, fy)` a la punta `(tx, ty)`, con su cifra en medio. */
        const arrow = (
          fx: number,
          fy: number,
          tx: number,
          ty: number,
          count: number,
          colour: string,
          side: number,
        ): void => {
          const dx = tx - fx
          const dy = ty - fy
          const span = Math.hypot(dx, dy)

          if (span === 0) return

          const vx = dx / span
          const vy = dy / span
          const width = (0.8 + Math.sqrt(count) * 0.75) / Math.sqrt(view.k)
          const head = Math.min(span * 0.6, Math.max(6 / view.k, width * 3))

          context.globalAlpha = 0.95
          context.strokeStyle = colour
          context.fillStyle = colour
          context.lineWidth = width
          context.beginPath()
          context.moveTo(fx, fy)

          if (live.current.undirected) {
            context.lineTo(tx, ty)
            context.stroke()
          } else {
            context.lineTo(tx - vx * head * 0.8, ty - vy * head * 0.8)
            context.stroke()
          }

          context.beginPath()
          context.moveTo(tx, ty)
          context.lineTo(tx - vx * head - vy * head * 0.55, ty - vy * head + vx * head * 0.55)
          context.lineTo(tx - vx * head + vy * head * 0.55, ty - vy * head - vx * head * 0.55)
          context.closePath()
          if (!live.current.undirected) context.fill()

          // La cifra, en medio del tramo: cuántas (corregidas, aprobadas o
          // suspendidas, según el filtro) le hizo una burbuja a la otra.
          const labelX = (fx + tx) / 2 - vy * side
          const labelY = (fy + ty) / 2 + vx * side

          context.font = `600 ${String(size)}px system-ui, sans-serif`
          context.textAlign = 'center'
          context.textBaseline = 'middle'
          context.lineWidth = 3 / view.k
          context.strokeStyle = palette.surface
          context.strokeText(String(count), labelX, labelY)
          context.fillStyle = colour
          context.fillText(String(count), labelX, labelY)
        }
        const colourOf = (from: SimNode): string =>
          from.login === focus ? palette.gave : palette.got

        if (live.current.undirected) {
          arrow(ax, ay, bx, by, link.forth, palette.gave, 0)
        } else if (both) {
          arrow(midX, midY, bx, by, link.forth, colourOf(source), apart)
          arrow(midX, midY, ax, ay, link.back, colourOf(target), apart)
        } else if (link.forth > 0) {
          arrow(ax, ay, bx, by, link.forth, colourOf(source), 0)
        } else if (link.back > 0) {
          arrow(bx, by, ax, ay, link.back, colourOf(target), 0)
        }
      }

      /**
       * Un grupo de uniones del mismo peso, de un solo trazo. Las de quien está
       * elegido se saltan: van después, una a una, con su sentido.
       */
      const strokeGroup = (
        target: CanvasRenderingContext2D,
        group: readonly SimLink[],
        on: boolean,
        skipFocus: boolean,
      ): void => {
        const first = group[0]

        if (first === undefined) return

        style(target, first, on)
        target.beginPath()
        for (const link of group) {
          if ((skipFocus && touches(link)) || !crosses(link)) continue

          const from = link.source as SimNode
          const to = link.target as SimNode

          target.moveTo(from.x ?? 0, from.y ?? 0)
          target.lineTo(to.x ?? 0, to.y ?? 0)
        }
        target.stroke()
      }

      if (state.moving) {
        const groups = heavy
          ? state.strongHeavy
          : state.links.length > MOVING_LINKS
            ? state.strong
            : state.groups

        for (const group of groups) strokeGroup(context, group, around === null, around !== null)
        if (around !== null) {
          for (const group of groups) {
            for (const link of group) if (touches(link)) directed(link)
          }
        }
      } else {
        const kind = around === null ? 'rest' : 'dim'
        const key = layerKey({ kind, view, width, height, ratio, version: state.version })
        const base = layerBase({ kind, width, height, ratio, version: state.version })
        // En pleno zoom o arrastre, la capa de antes, ampliada o movida: volver a
        // pintar miles de uniones en cada paso de la rueda es lo que atascaba.
        const gesture = layer.key !== key && layer.base === base && now - viewAt < VIEW_SETTLE_MS

        if (gesture) {
          const [scale, x, y] = reuseTransform(layer.view, view, ratio)

          context.save()
          context.setTransform(scale, 0, 0, scale, x, y)
          context.globalAlpha = 1
          context.drawImage(layer.canvas, 0, 0)
          context.restore()
          // Al acabar el gesto, una vez más, ya nítida.
          if (settle !== null) clearTimeout(settle)
          settle = setTimeout(() => {
            settle = null
            schedule.current()
          }, VIEW_SETTLE_MS)
        } else if (layer.key !== key) {
          const target = layer.context

          layer.canvas.width = Math.round(width * ratio)
          layer.canvas.height = Math.round(height * ratio)
          target.setTransform(ratio, 0, 0, ratio, 0, 0)
          target.translate(view.x, view.y)
          target.scale(view.k, view.k)

          // En la capa «apagada» van todas tenues: las de quien está elegido se
          // pintan después encima, y la tenue de debajo no se nota.
          for (const group of state.groups) strokeGroup(target, group, around === null, false)
          layer.key = key
          layer.base = base
          layer.view = { ...view }
        }

        if (!gesture) {
          context.save()
          context.setTransform(1, 0, 0, 1, 0, 0)
          context.globalAlpha = 1
          context.drawImage(layer.canvas, 0, 0)
          context.restore()
        }

        if (around !== null) {
          for (const link of state.links) {
            if (!touches(link)) continue

            directed(link)
          }
        }
      }

      // Burbujas, de golpe: un trazo por color y por si está encendida o apagada,
      // en vez de un relleno por burbuja (con miles, era buena parte del fotograma).
      const batches = new Map<string, SimNode[]>()
      const visible: SimNode[] = []

      for (const node of state.nodes) {
        if (!shown(node)) continue

        visible.push(node)

        const id = `${lit(node.login) ? '1' : '0'}${color(node.data)}`
        const batch = batches.get(id)

        if (batch === undefined) batches.set(id, [node])
        else batch.push(node)
      }

      for (const [id, batch] of batches) {
        context.globalAlpha = id.startsWith('1') ? 1 : 0.14
        context.fillStyle = id.slice(1)
        context.beginPath()
        for (const node of batch) {
          const x = node.x ?? 0
          const y = node.y ?? 0

          context.moveTo(x + node.r, y)
          context.arc(x, y, node.r, 0, 2 * Math.PI)
        }
        context.fill()
      }

      // Las fotos, solo cuando la burbuja se ve lo bastante grande para
      // distinguirla. Con muchas burbujas, mientras se recolocan, sin fotos; en
      // modo ligero, nunca: es lo que más cuesta de cada fotograma.
      const photos = !heavy && (!state.moving || state.nodes.length <= PHOTOS_WHILE_MOVING)

      context.globalAlpha = 1
      for (const node of visible) {
        const x = node.x ?? 0
        const y = node.y ?? 0

        if (photos && node.r * view.k > 11 && lit(node.login)) {
          const photo = photoUrl(node.data.login, node.data.image)
          const picture = photo === null ? null : pictureOf(photo, schedule.current)

          if (picture !== null) {
            const inner = node.r - Math.max(1.5, node.r * 0.14)

            context.drawImage(picture, x - inner, y - inner, inner * 2, inner * 2)
          }
        }

        // Quien viene de fuera lleva un aro discontinuo; la elegida, uno grueso.
        if (node.data.external || node.login === chosen || node === hover) {
          context.globalAlpha = lit(node.login) ? 1 : 0.14
          context.beginPath()
          context.arc(x, y, node.r + 2 / view.k, 0, 2 * Math.PI)
          context.lineWidth = (node.login === chosen || node === hover ? 2.5 : 1.2) / view.k
          context.setLineDash(
            node.data.external && node.login !== chosen ? [4 / view.k, 3 / view.k] : [],
          )
          context.strokeStyle = node.login === chosen ? palette.accent : palette.text
          context.stroke()
          context.setLineDash([])
          context.globalAlpha = 1
        }
      }

      // Nombres: los de las burbujas grandes, y siempre los del entorno encendido.
      context.textAlign = 'center'
      context.textBaseline = 'top'
      context.font = `600 ${11 / view.k}px system-ui, sans-serif`
      context.lineWidth = 3 / view.k
      context.strokeStyle = palette.surface
      context.fillStyle = palette.text

      let labels = 0

      for (const node of state.nodes) {
        if (labels >= (heavy ? MAX_LABELS_HEAVY : MAX_LABELS)) break

        const named =
          around === null
            ? node.r * view.k > 13
            : lit(node.login) && (around.size < 60 || node.login === focus)

        if (!named || !shown(node)) {
          continue
        }

        const y = (node.y ?? 0) + node.r + 3 / view.k

        labels += 1
        context.globalAlpha = 1
        context.strokeText(node.login, node.x ?? 0, y)
        context.fillText(node.login, node.x ?? 0, y)
      }

      context.globalAlpha = 1
    }

    /** Un paso de la simulación: mueve las burbujas y, al enfriarse, la da por quieta. */
    const tick = (simulation: Simulation<SimNode, SimLink>): void => {
      simulation.tick()
      state.ticks += 1
      state.moving = true
      state.version += 1

      // Durante la primera colocación la vista acompaña al grafo.
      if (state.needsFit && !state.touched && state.ticks % 6 === 0) fit()

      if (!isHot(simulation)) {
        // Quieto: desde ahora se pintan todas las uniones, y en la capa guardada.
        state.moving = false
        state.version += 1
        if (state.needsFit && !state.touched) fit()
        state.needsFit = false
      }
    }

    /** Lo que costó el último paso y cuándo acabó: el siguiente espera el doble. */
    let last = { cost: 0, end: 0 }

    /**
     * Un fotograma. Si la simulación tiene calor da un paso, pero como mucho un
     * tercio del tiempo: si un paso costó 10 ms, el siguiente espera 20 ms. Con
     * grafos grandes se recoloca algo más despacio y la página sigue fluida.
     * Pinta solo si algo ha cambiado y pide otro fotograma solo mientras haya
     * calor: quieto el grafo, no queda ningún bucle corriendo.
     */
    const frame = (now: number): void => {
      state.frame = 0

      const simulation = state.simulation
      let changed = state.dirty

      if (simulation !== null && isHot(simulation) && now - last.end >= 2 * last.cost) {
        const start = performance.now()

        tick(simulation)
        last = { cost: performance.now() - start, end: performance.now() }
        changed = true
      }

      state.dirty = false
      if (changed) draw()
      if (simulation !== null && isHot(simulation)) request()
    }

    /** Pide el siguiente fotograma; con la pestaña oculta, nada (se retoma al volver). */
    const request = (): void => {
      if (state.frame === 0 && document.visibilityState !== 'hidden') {
        state.frame = requestAnimationFrame(frame)
      }
    }

    schedule.current = () => {
      state.dirty = true
      request()
    }

    // Pestaña oculta: fuera el fotograma pendiente. Al volver, se repinta y,
    // si la simulación aún tenía calor, sigue donde estaba.
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        cancelAnimationFrame(state.frame)
        state.frame = 0
      } else {
        schedule.current()
      }
    }

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1

      measure()
      width = box.width
      height = box.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)

      if (!state.touched) {
        fit()
      }

      schedule.current()
    }

    /** Punto del lienzo, en coordenadas del grafo. */
    const toGraph = (event: PointerEvent | WheelEvent): { x: number; y: number } => {
      return {
        x: (event.clientX - box.left - state.view.x) / state.view.k,
        y: (event.clientY - box.top - state.view.y) / state.view.k,
      }
    }

    /**
     * La burbuja bajo un punto, con un índice por sitio (`graph-data.ts`) en vez
     * de mirarlas todas a cada movimiento del ratón. El índice se rehace solo
     * cuando las burbujas se han movido desde la última vez.
     */
    const nodeAt = (point: { x: number; y: number }): SimNode | null => {
      if (state.spots?.version !== state.version) {
        state.spots = { index: spotIndex(state.nodes), version: state.version }
      }

      // Un margen en píxeles de pantalla: las burbujas pequeñas también se aciertan.
      return spotAt(state.spots.index, point.x, point.y, 4 / state.view.k)
    }

    let drag: { node: SimNode | null; x: number; y: number; moved: boolean } | null = null

    // Los dedos (o el ratón) que hay sobre el lienzo, y el gesto de dos dedos en
    // curso: a qué distancia estaban y dónde quedaba su punto medio.
    const touches = new Map<number, { x: number; y: number }>()
    let pinch: { distance: number; x: number; y: number } | null = null

    /** Dónde está un puntero dentro del lienzo. */
    const place = (event: PointerEvent): { x: number; y: number } => {
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    /** La distancia entre los dos dedos y su punto medio. */
    const spread = (): { distance: number; x: number; y: number } => {
      const [a = { x: 0, y: 0 }, b = { x: 0, y: 0 }] = [...touches.values()]

      return {
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      }
    }
    /** Suelta la burbuja que se estuviera arrastrando, sin elegir a nadie. */
    const letGo = (): void => {
      const held = drag?.node ?? null

      if (held !== null) {
        held.fx = null
        held.fy = null
        state.simulation?.alphaTarget(0)
        schedule.current()
      }

      drag = null
    }

    const onPointerDown = (event: PointerEvent): void => {
      measure()
      touches.set(event.pointerId, place(event))
      setTip(null)
      canvas.setPointerCapture(event.pointerId)

      // Con dos dedos se acerca, se aleja y se mueve el grafo, caigan donde
      // caigan: si alguno había cogido una burbuja, la suelta.
      if (touches.size === 2) {
        letGo()
        pinch = spread()

        return
      }
      if (touches.size > 2) return

      drag = { node: nodeAt(toGraph(event)), x: event.clientX, y: event.clientY, moved: false }
    }

    const onPointerMove = (event: PointerEvent): void => {
      if (touches.has(event.pointerId)) touches.set(event.pointerId, place(event))

      if (pinch !== null && touches.size === 2) {
        const now = spread()

        // Primero el zoom, alrededor del punto medio; después, lo que ese punto
        // se haya movido: así se puede pellizcar y desplazar a la vez.
        zoomAt(now.distance / pinch.distance, pinch.x, pinch.y)
        state.view = {
          ...state.view,
          x: state.view.x + now.x - pinch.x,
          y: state.view.y + now.y - pinch.y,
        }
        pinch = now
        schedule.current()

        return
      }
      // El dedo que queda tras un gesto de dos no arrastra ni elige nada.
      if (drag === null && touches.size > 0) return

      const point = toGraph(event)

      if (drag === null) {
        const hover = nodeAt(point)

        if (hover !== state.hover) {
          state.hover = hover
          canvas.style.cursor = hover === null ? 'grab' : 'pointer'
          setTip(
            hover === null
              ? null
              : {
                  node: hover.data,
                  x: (hover.x ?? 0) * state.view.k + state.view.x,
                  y: ((hover.y ?? 0) - hover.r) * state.view.k + state.view.y,
                },
          )
          schedule.current()
        }

        return
      }

      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y

      if (!drag.moved && Math.hypot(dx, dy) < 4) {
        return
      }

      drag.moved = true

      if (drag.node === null) {
        state.view = { ...state.view, x: state.view.x + dx, y: state.view.y + dy }
        state.touched = true
        drag.x = event.clientX
        drag.y = event.clientY
        schedule.current()
      } else {
        // Una burbuja arrastrada se queda clavada donde va el ratón y sus vecinas
        // la siguen con poco calor; al soltarla, se enfría y el bucle se para.
        drag.node.fx = point.x
        drag.node.fy = point.y
        drag.node.x = point.x
        drag.node.y = point.y
        state.version += 1
        state.simulation?.alphaTarget(DRAG_HEAT)
        // Sin pedir un dibujo por cada movimiento del ratón: el siguiente paso
        // de la simulación ya pinta la burbuja en su sitio nuevo.
        request()
      }
    }

    const onPointerUp = (event: PointerEvent): void => {
      touches.delete(event.pointerId)
      if (touches.size < 2) pinch = null

      if (drag === null) {
        return
      }

      if (drag.node !== null) {
        drag.node.fx = null
        drag.node.fy = null
        state.simulation?.alphaTarget(0)
        schedule.current()
      }

      if (!drag.moved) {
        live.current.onSelect(
          drag.node === null || drag.node.login === live.current.selected ? null : drag.node.login,
        )
      }

      drag = null
      canvas.releasePointerCapture(event.pointerId)
    }

    const onLeave = (): void => {
      if (state.hover !== null && drag === null) {
        state.hover = null
        setTip(null)
        schedule.current()
      }
    }

    /** Cambia el zoom dejando quieto el punto (`px`, `py`) del lienzo. */
    const zoomAt = (factor: number, px: number, py: number): void => {
      const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.view.k * factor))
      const scale = k / state.view.k

      state.view = { k, x: px - (px - state.view.x) * scale, y: py - (py - state.view.y) * scale }
      state.touched = true
      setTip(null)
      schedule.current()
    }

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      measure()

      // El punto bajo el ratón no se mueve al hacer zoom.
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - box.left, event.clientY - box.top)
    }

    const onDoubleClick = (): void => {
      state.touched = false
      fit()
      schedule.current()
    }

    actions.current = {
      // Los botones hacen zoom sobre el centro de lo que se ve.
      zoomBy: (factor) => {
        zoomAt(factor, width / 2, height / 2)
      },
      fit: onDoubleClick,
      // Lleva la vista hasta una burbuja, acercándose si hace falta, en un
      // movimiento corto para que se vea de dónde a dónde se va.
      goTo: (login) => {
        const node = state.nodes.find((candidate) => candidate.login === login)

        if (node === undefined) return

        const from = state.view
        const k = Math.max(from.k, GO_TO_ZOOM)
        const to = { k, x: width / 2 - (node.x ?? 0) * k, y: height / 2 - (node.y ?? 0) * k }
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const start = performance.now()

        state.touched = true
        setTip(null)
        cancelAnimationFrame(travel)

        const step = (now: number): void => {
          const part = still ? 1 : Math.min(1, (now - start) / GO_TO_MS)
          // Sale rápido y frena al llegar.
          const eased = 1 - (1 - part) ** 3

          state.view = {
            k: from.k + (to.k - from.k) * eased,
            x: from.x + (to.x - from.x) * eased,
            y: from.y + (to.y - from.y) * eased,
          }
          schedule.current()
          if (part < 1) travel = requestAnimationFrame(step)
        }

        travel = requestAnimationFrame(step)
      },
    }

    const observer = new ResizeObserver(resize)
    // El modo nocturno cambia los colores del texto y de las uniones.
    const themeObserver = new MutationObserver(() => {
      palette = readPalette()
      state.version += 1
      schedule.current()
    })

    observer.observe(canvas)
    themeObserver.observe(document.documentElement, {
      attributeFilter: ['data-theme', 'data-style', 'style'],
    })
    // La página se desplaza sin que el lienzo cambie de tamaño: se vuelve a medir.
    window.addEventListener('scroll', measure, { capture: true, passive: true })
    canvas.addEventListener('pointerenter', measure)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDoubleClick)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('scroll', measure, { capture: true })
      canvas.removeEventListener('pointerenter', measure)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDoubleClick)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(state.frame)
      cancelAnimationFrame(travel)
      state.frame = 0
      // Lo que llegue tarde (una foto, un clic) ya no pide fotogramas.
      schedule.current = () => undefined
      dropLoading()
    }
  }, [])

  // --- Datos: cada vez que cambian de verdad, la simulación se recalienta ----
  // Lo que llegue con la misma huella (el sondeo mientras se copia, un render
  // que crea arrays nuevos) no recoloca nada: solo se cambian los datos de cada
  // burbuja y se repinta.
  const latest = useRef({ nodes, links })

  latest.current = { nodes, links }

  const signature = useMemo(() => graphSignature(nodes, links), [nodes, links])

  useEffect(() => {
    const state = scene.current
    const { nodes: people, links: pairs } = latest.current
    const before = new Map(state.nodes.map((node) => [node.login, node]))
    // Quien ya estaba conserva su sitio: el grafo se recoloca, no salta.
    const spread = 30 * Math.sqrt(people.length)
    const busiest = people.reduce((most, node) => Math.max(most, node.given + node.received), 1)
    const simNodes: SimNode[] = people.map((data, index) => {
      const old = before.get(data.login)
      // Espiral de girasol para los nuevos: repartidos, sin azar.
      const angle = index * 2.399963
      const distance = spread * Math.sqrt((index + 0.5) / people.length)

      return {
        login: data.login,
        data,
        r: radiusOf(data, busiest),
        x: old?.x ?? Math.cos(angle) * distance,
        y: old?.y ?? Math.sin(angle) * distance,
        ...(old === undefined ? {} : { vx: old.vx ?? 0, vy: old.vy ?? 0 }),
      }
    })
    const byLogin = new Map(simNodes.map((node) => [node.login, node]))
    const neighbours = new Map<string, Set<string>>()
    const simLinks: SimLink[] = []

    for (const link of pairs) {
      const source = byLogin.get(link.source)
      const target = byLogin.get(link.target)

      if (source === undefined || target === undefined) {
        continue
      }

      simLinks.push({
        source,
        target,
        weight: weightOf(link),
        mutual: link.forth > 0 && link.back > 0,
        forth: link.forth,
        back: link.back,
        inner: source.data.community === target.data.community,
      })

      for (const [from, to] of [
        [link.source, link.target],
        [link.target, link.source],
      ] as const) {
        const set = neighbours.get(from) ?? new Set<string>()

        set.add(to)
        neighbours.set(from, set)
      }
    }

    // Cuántas uniones tiene cada burbuja: quien tiene muchas no debe tirar igual de todas.
    const degree = new Map<string, number>()

    for (const link of simLinks) {
      for (const end of [link.source as SimNode, link.target as SimNode]) {
        degree.set(end.login, (degree.get(end.login) ?? 0) + 1)
      }
    }

    state.simulation?.stop()
    state.nodes = simNodes
    state.links = simLinks
    state.groups = byWeight(simLinks)
    state.strong = byWeight(strongest(simLinks, MOVING_LINKS))
    state.strongHeavy = byWeight(strongest(simLinks, MOVING_LINKS_HEAVY))
    state.spots = null
    state.signature = signature
    state.moving = true
    state.ticks = 0
    state.version += 1
    state.neighbours = neighbours
    state.hover = null

    // Con un grafo nuevo entero (otro filtro, otra persona) se vuelve a encajar.
    const kept = simNodes.filter((node) => before.has(node.login)).length

    if (kept < simNodes.length / 2) {
      state.needsFit = true
      state.touched = false
    }

    state.simulation = forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          // Más correcciones, más cerca.
          .distance(
            (link) =>
              (link.source as SimNode).r +
              (link.target as SimNode).r +
              14 +
              90 / Math.sqrt(link.weight),
          )
          .strength((link) => {
            const least = Math.min(
              degree.get((link.source as SimNode).login) ?? 1,
              degree.get((link.target as SimNode).login) ?? 1,
            )

            const pull = Math.min(1, (0.35 + 0.12 * Math.sqrt(link.weight)) / Math.sqrt(least))

            // Entre comunidades se tira menos: si no, todo acaba en una sola bola.
            return link.inner ? pull : pull * 0.25
          }),
      )
      .force(
        'charge',
        forceManyBody<SimNode>()
          .strength((node) => -40 - node.r * 12)
          .theta(0.95)
          .distanceMax(900),
      )
      .force(
        'collide',
        forceCollide<SimNode>((node) => node.r + 2.5).iterations(simNodes.length > 800 ? 1 : 2),
      )
      .force('community', communityForce(simNodes))
      // Una gravedad suave hacia el centro: los grupos sueltos no se escapan.
      .force('x', forceX<SimNode>(0).strength(0.035))
      .force('y', forceY<SimNode>(0).strength(0.035))
      .alpha(kept === simNodes.length && kept > 0 ? 0.35 : 1)
      // Con muchas uniones cada paso cuesta más: se enfría antes, y en modo ligero, más.
      .alphaDecay(
        isHeavy(simNodes.length, simLinks.length)
          ? 0.05
          : simNodes.length > 800 || simLinks.length > 5000
            ? 0.035
            : 0.022,
      )
      .velocityDecay(0.35)
      .alphaMin(ALPHA_MIN)
      // Sin el reloj propio de d3: los pasos los da el bucle de fotogramas del
      // lienzo, que sabe cuándo parar, cuándo esperar y cuándo la pestaña no se ve.
      .stop()
    schedule.current()

    return () => {
      state.simulation?.stop()
    }
  }, [signature])

  // Mismos datos en objetos nuevos: cada burbuja se queda con el suyo (para el
  // color, la etiqueta y la ficha) sin moverse.
  useEffect(() => {
    const state = scene.current

    if (state.signature !== signature) return

    const fresh = new Map(nodes.map((node) => [node.login, node]))

    for (const node of state.nodes) node.data = fresh.get(node.login) ?? node.data
    schedule.current()
  }, [nodes, signature])

  // Cambiar el color o la persona elegida solo repinta.
  useEffect(() => {
    schedule.current()
  }, [colorOf, selected])

  // Quienes están pintados y llevan lo escrito en el login: primero los que
  // empiezan así, y a igualdad, los más activos.
  const wanted = query.trim().toLowerCase()
  const found =
    wanted === ''
      ? []
      : nodes
          .filter((node) => node.login.includes(wanted))
          .sort(
            (a, b) =>
              Number(b.login.startsWith(wanted)) - Number(a.login.startsWith(wanted)) ||
              b.given + b.received - (a.given + a.received),
          )
          .slice(0, FOUND_MAX)
  const pick = (login: string): void => {
    onSelect(login)
    actions.current.goTo(login)
    setQuery('')
  }

  return (
    <div className="force-wrap">
      <canvas ref={canvasRef} className="force-graph" role="img" aria-label={label} />
      {/* Buscar a alguien entre quienes están pintados: la vista va hasta su burbuja. */}
      <div className="force-find">
        <input
          type="search"
          value={query}
          placeholder={controls.find}
          aria-label={controls.find}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && found[0] !== undefined) pick(found[0].login)
            if (event.key === 'Escape') setQuery('')
          }}
        />
        {wanted !== '' && (
          <ul>
            {found.length === 0 ? (
              <li className="none">{controls.none}</li>
            ) : (
              found.map((node) => (
                <li key={node.login}>
                  <button
                    type="button"
                    onClick={() => {
                      pick(node.login)
                    }}
                  >
                    <i style={{ background: colorOf(node) }} />
                    {node.login}
                    <small>{node.given + node.received}</small>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {selected !== null && !undirected && (
        <ul className="force-arrows" aria-label={`${controls.gave} · ${controls.got}`}>
          <li>
            <i className="gave" aria-hidden="true" />
            {controls.gave}
          </li>
          <li>
            <i className="got" aria-hidden="true" />
            {controls.got}
          </li>
        </ul>
      )}
      {tip !== null && (
        <div className="force-tip" style={{ left: tip.x, top: tip.y }}>
          {tooltip(tip.node)}
        </div>
      )}
      <div className="force-controls">
        <button
          type="button"
          aria-label={controls.zoomIn}
          title={controls.zoomIn}
          onClick={() => {
            actions.current.zoomBy(1.4)
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label={controls.zoomOut}
          title={controls.zoomOut}
          onClick={() => {
            actions.current.zoomBy(1 / 1.4)
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label={controls.fit}
          title={controls.fit}
          onClick={() => {
            actions.current.fit()
          }}
        >
          ⤢
        </button>
      </div>
    </div>
  )
}
