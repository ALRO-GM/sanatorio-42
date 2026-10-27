import { parseStartup } from '@sanatorio/startup'

import { api } from '../../../shared/api'
import { useAsync } from '../../../shared/hooks/useAsync'
import { lookOf } from './StartupPanel'
import { StartupScene } from './StartupScene'

/**
 * La startup en pequeño, abajo del Pomodoro a pantalla completa: se ve crecer
 * mientras te concentras. Sin datos (o si falla), no sale nada: no estorba.
 */
export function StartupStrip() {
  const { data } = useAsync(() => api.getStartup(), [])

  if (data === undefined) return null

  return (
    <div className="su-strip">
      <StartupScene state={parseStartup(data.state)} me={lookOf(data.login)} compact />
    </div>
  )
}
