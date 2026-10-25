/**
 * El common core de 42 por círculos, del 0 al 6: lo que dibuja el "Holy Graph".
 *
 * La API de 42 no dice en qué círculo está cada proyecto (el grafo de la intra
 * sale de un servicio interno), así que la tabla está aquí. Los proyectos se
 * reconocen por su `slug`, que no cambia aunque cambie el nombre.
 *
 * Algunos tienen dos slugs: el de siempre y el del plan nuevo (`42next-…`), que
 * convive con el anterior. Va primero el más usado.
 *
 * La piscina no está: no forma parte del common core.
 */

type CoreProject = {
  /** Identificador estable dentro del grafo. */
  key: string
  name: string
  /** Nombre corto, para que quepa dentro del nodo. */
  short: string
  slugs: readonly string[]
}

const project = (name: string, short: string, ...slugs: string[]): CoreProject => ({
  key: slugs[0]?.replace(/^42cursus-/, '') ?? name,
  name,
  short,
  slugs,
})

const cpp = (module: string): CoreProject =>
  project(`CPP Module ${module}`, `CPP ${module}`, `cpp-module-${module}`)

const exam = (rank: string): CoreProject =>
  project(`Exam Rank ${rank}`, `Exam ${rank}`, `exam-rank-${rank}`, `42next-exam-rank-${rank}`)

/** `COMMON_CORE[n]` son los proyectos del círculo `n`. */
export const COMMON_CORE: readonly (readonly CoreProject[])[] = [
  [project('Libft', 'Libft', '42cursus-libft')],
  [
    project('ft_printf', 'printf', '42cursus-ft_printf'),
    project('get_next_line', 'GNL', '42cursus-get_next_line'),
    project('Born2beroot', 'B2BR', 'born2beroot', '42next-born2beroot'),
  ],
  [
    project('push_swap', 'push_swap', '42cursus-push_swap', '42next-push_swap'),
    project('so_long', 'so_long', 'so_long'),
    project('FdF', 'FdF', '42cursus-fdf'),
    project('fract-ol', 'fract-ol', '42cursus-fract-ol'),
    project('pipex', 'pipex', 'pipex'),
    project('minitalk', 'minitalk', 'minitalk'),
    exam('02'),
  ],
  [
    project('Philosophers', 'Philo', '42cursus-philosophers'),
    project('minishell', 'minishell', '42cursus-minishell'),
    exam('03'),
  ],
  [
    project('NetPractice', 'NetPractice', 'netpractice'),
    project('cub3d', 'cub3d', 'cub3d'),
    project('miniRT', 'miniRT', 'minirt'),
    cpp('00'),
    cpp('01'),
    cpp('02'),
    cpp('03'),
    cpp('04'),
    exam('04'),
  ],
  [
    cpp('05'),
    cpp('06'),
    cpp('07'),
    cpp('08'),
    cpp('09'),
    project('ft_irc', 'ft_irc', 'ft_irc'),
    project('webserv', 'webserv', 'webserv'),
    project('Inception', 'Inception', 'inception'),
    exam('05'),
  ],
  [project('ft_transcendence', 'transc.', 'ft_transcendence'), exam('06')],
]

/**
 * Proyectos entre los que se elige uno: con aprobar cualquiera del grupo, el
 * hueco está hecho. Por slug, como la tabla de arriba.
 *
 * Los `bis` de Python son la segunda oportunidad de un módulo: vale uno de los dos.
 */
export const CHOICES: Readonly<Record<string, readonly string[]>> = {
  'circle2-graphics': ['so_long', '42cursus-fdf', '42cursus-fract-ol'],
  'circle2-unix': ['pipex', 'minitalk'],
  'circle4-graphics': ['cub3d', 'minirt'],
  'circle5-network': ['ft_irc', 'webserv'],
  'python-05': ['python-module-05', 'python-module-05-bis'],
  'python-06': ['python-module-06', 'python-module-06-bis'],
}

/**
 * Versiones de un mismo proyecto (la de siempre y la del plan nuevo,
 * `42next-…`): quien hizo una tiene hecho el hueco, sea del plan que sea. Salen
 * de la tabla de arriba: los proyectos con más de un slug.
 */
export const VERSIONS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  COMMON_CORE.flat()
    .filter((project) => project.slugs.length > 1)
    .map((project) => [`version-${project.key}`, project.slugs]),
)
