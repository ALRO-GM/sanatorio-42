import { focusOf, has, levelOf, stageOf } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'

import { Building } from './art/Building'
import { AxisGlyph } from './art/AxisGlyph'
import { Person } from './art/Person'
import { Coin, Globe, Plant } from './art/Props'
import { ServerRack } from './art/ServerRack'
import { Workstation } from './art/Workstation'

const WIDTH = 320
const HEIGHT = 110
const GROUND = 100
/** Lo que mide cada puesto (mesa con su persona), y dónde empieza la fila. */
const SLOT = 38
const FIRST = 70

/**
 * La startup dibujada: el sitio según la etapa, una mesa por persona (quien la
 * fundó y la plantilla, tecleando), los servidores, las plantas del espacio,
 * una moneda por ronda y, al final, el planeta. Sin texto, salvo el nombre que
 * le haya puesto cada cual y un «+N» si no cabe toda la plantilla.
 *
 * @param me El aspecto de quien la fundó: sale de su login.
 */
export function StartupScene({
  state,
  me,
  compact = false,
}: {
  state: StartupState
  me: number
  compact?: boolean
}) {
  const stage = stageOf(state)
  const focus = focusOf(state)
  const gear = levelOf(state, 'computer')
  const servers = levelOf(state, 'servers')
  const space = levelOf(state, 'space')
  const people = [{ axis: focus, look: me }, ...state.team.map((hire) => hire)]
  const slots = Math.max(1, (compact ? 5 : 6) - (servers > 0 ? 1 : 0))
  const shown = people.slice(0, slots)
  const hidden = people.length - shown.length

  return (
    <svg
      className={`su-scene ${compact ? 'compact' : ''}`.trim()}
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      aria-hidden="true"
    >
      <rect x="0" y={GROUND} width={WIDTH} height={HEIGHT - GROUND} className="su-ground" />
      <Building x={8} y={GROUND} stage={stage} />
      {state.rounds.map((round, index) => (
        <Coin key={round.id} x={14 + index * 9} y={12 + (index % 2) * 4} index={index} />
      ))}
      {state.name !== null && (
        <text x="8" y={stage >= 6 ? 8 : 8} className="su-name">
          {state.name}
        </text>
      )}
      {focus !== null && (
        <g transform={`translate(${String(WIDTH - 26)} 4)`}>
          <AxisGlyph axis={focus} size={22} />
        </g>
      )}
      {has(state, 'global') && <Globe x={WIDTH - 56} y={20} r={13} />}
      {shown.map((person, index) => {
        const x = FIRST + index * SLOT

        return (
          <g key={index}>
            <Person x={x + 7} y={GROUND - 2} axis={person.axis} look={person.look} />
            <Workstation
              x={x}
              y={GROUND}
              gear={index === 0 ? gear : Math.max(1, gear)}
              axis={person.axis}
            />
          </g>
        )
      })}
      {hidden > 0 && (
        <text x={FIRST + shown.length * SLOT + 2} y={GROUND - 12} className="su-more">
          +{hidden}
        </text>
      )}
      {servers > 0 && <ServerRack x={WIDTH - 22} y={GROUND} level={servers} />}
      {Array.from({ length: Math.min(3, space) }, (_, index) => (
        <Plant key={index} x={FIRST - 12 + index * SLOT * 2} y={GROUND} />
      ))}
    </svg>
  )
}
