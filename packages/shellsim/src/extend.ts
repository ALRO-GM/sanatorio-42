/**
 * Cómo otro motor se apoya en esta shell (el de Docker, `@sanatorio/dockersim`):
 * le pasa a `run` unos programas más y la shell los busca antes que los suyos.
 * Así se escriben Dockerfiles con `cat > Dockerfile <<'EOF'` y se ejecuta
 * `docker …` en la misma terminal, con las mismas tuberías y variables. Sin
 * extensión, la shell es la de siempre: el curso de shell no ve nada de esto.
 */

import type { CommandFn } from './commands/types.js'
import type { World } from './model.js'

/** Lo que contesta un servidor a `curl` o `wget`. */
export type HttpReply = { status: number; body: string; type: string }

export type Extension = {
  /** Programas añadidos; con el mismo nombre que uno de la shell, lo sustituyen. */
  commands: Readonly<Record<string, CommandFn>>
  /**
   * Si una orden sola (sin tubería ni redirección) solo mira y no cuenta para
   * las estrellas, como `ls` o `cat` en la shell (`docker ps`, `docker logs`).
   */
  looking?: (words: readonly string[]) => boolean
  /**
   * Quién contesta en un puerto antes que los servicios de la máquina (los
   * puertos publicados de los contenedores): `null` si no es suyo. `headers`
   * trae las cabeceras de `curl -H` (el `Host:` de un Ingress, en el motor de
   * Kubernetes), en minúsculas.
   */
  http?: (
    world: World,
    host: string,
    port: number,
    path: string,
    headers?: Readonly<Record<string, string>>,
  ) => HttpReply | null
}
