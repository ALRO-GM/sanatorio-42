import { useEffect, useRef } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force'
import type { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

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
}

/** Una persona dentro de la simulación: los datos y dónde está. */
type SimNode = SimulationNodeDatum & { login: string; data: NetworkNode; r: number }
type SimLink = SimulationLinkDatum<SimNode> & {
  weight: number
  mutual: boolean
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
}

/** Con cuánta fuerza tira de cada burbuja el centro de su comunidad. */
const COMMUNITY_PULL = 0.16

const MIN_ZOOM = 0.08
const MAX_ZOOM = 6

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

/** Fotos ya pedidas, entre montajes: cambiar un filtro no las vuelve a descargar. */
const pictures = new Map<string, HTMLImageElement | null>()

function pictureOf(url: string, onLoad: () => void): HTMLImageElement | null {
  const known = pictures.get(url)

  if (known !== undefined) {
    return known !== null && known.complete && known.naturalWidth > 0 ? known : null
  }

  const image = new Image()

  image.onload = onLoad
  image.onerror = () => {
    pictures.set(url, null)
  }
  image.src = url
  pictures.set(url, image)

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
export function ForceGraph({ nodes, links, colorOf, selected, onSelect, label }: ForceGraphProps) {
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
  })
  // Lo último que llegó por props, a mano para el dibujo sin volver a montar nada.
  const live = useRef({ colorOf, selected, onSelect })

  live.current = { colorOf, selected, onSelect }

  /** Pide un repintado para el siguiente fotograma. Varias peticiones son una. */
  const schedule = useRef<() => void>(() => undefined)

  // --- Dibujo y eventos: se montan una vez ---------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (canvas === null || context === null || context === undefined) {
      return undefined
    }

    const state = scene.current
    let width = 0
    let height = 0
    let palette = readPalette()

    function readPalette() {
      const style = getComputedStyle(document.documentElement)
      const read = (name: string, fallback: string): string =>
        style.getPropertyValue(name).trim() || fallback

      return {
        text: read('--text', '#333'),
        muted: read('--text-4', '#aaa'),
        surface: read('--surface', '#fff'),
        accent: read('--accent', '#00babc'),
        link: read('--text-3', '#888'),
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

      const k = Math.max(
        MIN_ZOOM,
        Math.min(1.6, 0.92 * Math.min(width / (maxX - minX || 1), height / (maxY - minY || 1))),
      )

      state.view = {
        k,
        x: width / 2 - ((minX + maxX) / 2) * k,
        y: height / 2 - ((minY + maxY) / 2) * k,
      }
    }

    const draw = (): void => {
      state.frame = 0

      const { view, hover } = state
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

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      context.translate(view.x, view.y)
      context.scale(view.k, view.k)

      // Uniones: primero las apagadas, luego las encendidas encima.
      for (const pass of [false, true]) {
        for (const link of state.links) {
          const source = link.source as SimNode
          const target = link.target as SimNode
          const on = around === null || source.login === focus || target.login === focus

          if (on !== pass) {
            continue
          }

          context.beginPath()
          context.moveTo(source.x ?? 0, source.y ?? 0)
          context.lineTo(target.x ?? 0, target.y ?? 0)
          context.lineWidth = (0.5 + Math.sqrt(link.weight) * 0.75) / Math.sqrt(view.k)
          // En reposo, todas del mismo gris: el color es para las burbujas. Al
          // elegir a alguien, las suyas se encienden, en turquesa las mutuas.
          context.strokeStyle = around !== null && on && link.mutual ? palette.accent : palette.link
          context.globalAlpha = on
            ? around === null
              ? Math.min(0.7, (0.1 + link.weight * 0.05) * density)
              : 0.9
            : 0.04
          context.stroke()
        }
      }

      for (const node of state.nodes) {
        const on = lit(node.login)
        const x = node.x ?? 0
        const y = node.y ?? 0

        context.globalAlpha = on ? 1 : 0.14
        context.beginPath()
        context.arc(x, y, node.r, 0, 2 * Math.PI)
        context.fillStyle = color(node.data)
        context.fill()

        // La foto, solo cuando la burbuja se ve lo bastante grande para distinguirla.
        const shownRadius = node.r * view.k

        if (on && shownRadius > 11 && node.data.image !== null) {
          const picture = pictureOf(node.data.image, schedule.current)

          if (picture !== null) {
            const inner = node.r - Math.max(1.5, node.r * 0.14)
            const side = Math.min(picture.naturalWidth, picture.naturalHeight)

            context.save()
            context.beginPath()
            context.arc(x, y, inner, 0, 2 * Math.PI)
            context.clip()
            context.drawImage(
              picture,
              (picture.naturalWidth - side) / 2,
              (picture.naturalHeight - side) / 2,
              side,
              side,
              x - inner,
              y - inner,
              inner * 2,
              inner * 2,
            )
            context.restore()
          }
        }

        // Quien viene de fuera lleva un aro discontinuo; la elegida, uno grueso.
        if (node.data.external || node.login === chosen || node === hover) {
          context.beginPath()
          context.arc(x, y, node.r + 2 / view.k, 0, 2 * Math.PI)
          context.lineWidth = (node.login === chosen || node === hover ? 2.5 : 1.2) / view.k
          context.setLineDash(
            node.data.external && node.login !== chosen ? [4 / view.k, 3 / view.k] : [],
          )
          context.strokeStyle = node.login === chosen ? palette.accent : palette.text
          context.stroke()
          context.setLineDash([])
        }
      }

      // Nombres: los de las burbujas grandes, y siempre los del entorno encendido.
      context.textAlign = 'center'
      context.textBaseline = 'top'
      context.font = `600 ${11 / view.k}px system-ui, sans-serif`
      context.lineWidth = 3 / view.k
      context.strokeStyle = palette.surface
      context.fillStyle = palette.text

      for (const node of state.nodes) {
        const named =
          around === null
            ? node.r * view.k > 13
            : lit(node.login) && (around.size < 60 || node.login === focus)

        if (!named) {
          continue
        }

        const y = (node.y ?? 0) + node.r + 3 / view.k

        context.globalAlpha = 1
        context.strokeText(node.login, node.x ?? 0, y)
        context.fillText(node.login, node.x ?? 0, y)
      }

      context.globalAlpha = 1
    }

    schedule.current = () => {
      if (state.frame === 0) {
        state.frame = requestAnimationFrame(draw)
      }
    }

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1
      const box = canvas.getBoundingClientRect()

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
      const box = canvas.getBoundingClientRect()

      return {
        x: (event.clientX - box.left - state.view.x) / state.view.k,
        y: (event.clientY - box.top - state.view.y) / state.view.k,
      }
    }

    const nodeAt = (point: { x: number; y: number }): SimNode | null => {
      let found: SimNode | null = null
      let best = Infinity

      for (const node of state.nodes) {
        const distance = Math.hypot((node.x ?? 0) - point.x, (node.y ?? 0) - point.y)
        // Un margen en píxeles de pantalla: las burbujas pequeñas también se aciertan.
        const reach = node.r + 4 / state.view.k

        if (distance <= reach && distance < best) {
          found = node
          best = distance
        }
      }

      return found
    }

    let drag: { node: SimNode | null; x: number; y: number; moved: boolean } | null = null

    const onPointerDown = (event: PointerEvent): void => {
      const point = toGraph(event)

      drag = { node: nodeAt(point), x: event.clientX, y: event.clientY, moved: false }
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent): void => {
      const point = toGraph(event)

      if (drag === null) {
        const hover = nodeAt(point)

        if (hover !== state.hover) {
          state.hover = hover
          canvas.style.cursor = hover === null ? 'grab' : 'pointer'
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
        // Una burbuja arrastrada se queda clavada donde va el ratón y el resto se recoloca.
        drag.node.fx = point.x
        drag.node.fy = point.y
        state.simulation?.alphaTarget(0.25).restart()
      }
    }

    const onPointerUp = (event: PointerEvent): void => {
      if (drag === null) {
        return
      }

      if (drag.node !== null) {
        drag.node.fx = null
        drag.node.fy = null
        state.simulation?.alphaTarget(0)
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
        schedule.current()
      }
    }

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()

      const box = canvas.getBoundingClientRect()
      const px = event.clientX - box.left
      const py = event.clientY - box.top
      const k = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, state.view.k * Math.exp(-event.deltaY * 0.0015)),
      )
      const scale = k / state.view.k

      // El punto bajo el ratón no se mueve al hacer zoom.
      state.view = { k, x: px - (px - state.view.x) * scale, y: py - (py - state.view.y) * scale }
      state.touched = true
      schedule.current()
    }

    const onDoubleClick = (): void => {
      state.touched = false
      fit()
      schedule.current()
    }

    const observer = new ResizeObserver(resize)
    // El modo nocturno cambia los colores del texto y de las uniones.
    const themeObserver = new MutationObserver(() => {
      palette = readPalette()
      schedule.current()
    })

    observer.observe(canvas)
    themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme'] })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDoubleClick)

    // El encaje inicial lo pide la simulación cuando ya ha repartido las burbujas.
    const fitter = (): void => {
      if (!state.touched) {
        fit()
      }
    }

    canvas.addEventListener('graph:fit', fitter)

    return () => {
      observer.disconnect()
      themeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDoubleClick)
      canvas.removeEventListener('graph:fit', fitter)
      cancelAnimationFrame(state.frame)
      state.frame = 0
    }
  }, [])

  // --- Datos: cada vez que cambian, la simulación se recalienta -------------
  useEffect(() => {
    const state = scene.current
    const canvas = canvasRef.current
    const before = new Map(state.nodes.map((node) => [node.login, node]))
    // Quien ya estaba conserva su sitio: el grafo se recoloca, no salta.
    const spread = 30 * Math.sqrt(nodes.length)
    const busiest = Math.max(1, ...nodes.map((node) => node.given + node.received))
    const simNodes: SimNode[] = nodes.map((data, index) => {
      const old = before.get(data.login)
      // Espiral de girasol para los nuevos: repartidos, sin azar.
      const angle = index * 2.399963
      const distance = spread * Math.sqrt((index + 0.5) / nodes.length)

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

    for (const link of links) {
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
    state.neighbours = neighbours
    state.hover = null

    // Con un grafo nuevo entero (otro filtro, otra persona) se vuelve a encajar.
    const kept = simNodes.filter((node) => before.has(node.login)).length

    if (kept < simNodes.length / 2) {
      state.needsFit = true
      state.touched = false
    }

    let ticks = 0

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
      .alphaDecay(simNodes.length > 800 ? 0.035 : 0.022)
      .velocityDecay(0.35)
      .on('tick', () => {
        ticks += 1

        // Durante la primera colocación la vista acompaña al grafo.
        if (state.needsFit && !state.touched && ticks % 6 === 0) {
          canvas?.dispatchEvent(new Event('graph:fit'))
        }

        schedule.current()
      })
      .on('end', () => {
        if (state.needsFit) {
          canvas?.dispatchEvent(new Event('graph:fit'))
          state.needsFit = false
          schedule.current()
        }
      })

    return () => {
      state.simulation?.stop()
    }
  }, [nodes, links])

  // Cambiar el color o la persona elegida solo repinta.
  useEffect(() => {
    schedule.current()
  }, [colorOf, selected])

  return <canvas ref={canvasRef} className="force-graph" role="img" aria-label={label} />
}
