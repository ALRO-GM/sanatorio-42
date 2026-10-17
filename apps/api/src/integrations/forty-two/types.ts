/**
 * Formas de lo que devuelve la API de 42, en los campos que nos importan.
 *
 * Son las de fuera: lo que la web recibe está en `@sanatorio/contracts`.
 */

/**
 * Avatar de una persona en la API de 42.
 *
 * OJO, aquí se equivocó la primera versión: se tipó como `{ url }` y la API no
 * tiene ninguna clave `url` en usuarios. Devuelve `link` (el original) y
 * `versions` con los tamaños. Leer `image.url` daba `undefined` siempre, así que
 * todos los avatares salían a `null` y el front caía a las iniciales. Verificado
 * contra `/v2/users/:login`, `/v2/projects/:id/users` y el `user` anidado de
 * `projects_users`: los tres traen esta misma forma.
 *
 * `link` y cada versión pueden venir a `null` (quién no tiene foto subida), de
 * ahí que todo sea opcional y nullable.
 */
export type ApiUserImage = {
  link?: string | null
  versions?: {
    large?: string | null
    medium?: string | null
    small?: string | null
    micro?: string | null
  } | null
}

/**
 * Qué versión del avatar se guarda.
 *
 * La web enseña el avatar en dos sitios: en la cabecera, a 40 px, y en la lista
 * de compañeros, a 28 y 64 px. `medium` da de sobra para todo eso y pesa mucho
 * menos que el original, que puede ser una foto de móvil de varios megabytes.
 * Los tamaños no están garantizados por la API, así que si `medium` no existe
 * se baja a `small` y de ahí al original, antes que devolver `null`.
 */
type AvatarSize = 'medium' | 'small' | 'link'

/**
 * Tamaños del avatar, en orden de preferencia: de más pequeño a más grande.
 *
 * Se recorren en este orden y se devuelve el primero que venga de verdad, para
 * no afirmar una foto que la API no tiene.
 */
export const AVATAR_SIZE_ORDER = [
  'medium',
  'small',
  'link',
] as const satisfies readonly AvatarSize[]

/** Persona tal y como la devuelve la API de 42, en los campos que nos importan. */
export type ApiUser = {
  id: number
  login: string
  kind?: string
  image?: ApiUserImage | null
  /** Nombre de siempre. Es lo que muestra la cabecera del front. */
  usual_full_name?: string | null
  /** Nombre y apellidos, por si `usual_full_name` viene a `null`. */
  first_name?: string | null
  last_name?: string | null
  /** `false` para cuentas congeladas o que ya no cursan. Lleva `?` en la API. */
  'active?'?: boolean | null
  /** Última modificación en 42. Es lo que permite pedir solo lo que ha cambiado. */
  updated_at?: string | null
  /** Solo en el perfil completo (`/v2/me`, `/v2/users/:login`). */
  campus_users?: readonly ApiCampusUser[] | null
  /** Su paso por cada cursus, con el nivel. El `21` es el 42cursus. */
  cursus_users?: readonly ApiCursusUser[] | null
  /** Solo en el perfil completo: todos sus proyectos, con estado y nota. */
  projects_users?: readonly ApiProjectUser[] | null
  /**
   * Puesto en el cluster (`"c2r17s2"`) en el que está **ahora mismo**, o `null`
   * si no está en el campus. Lo trae `GET /v2/users/:login` y también los
   * objetos de usuario completos que vienen en otros endpoints.
   *
   * La diferencia entre `undefined` y `null` importa: `undefined` es que este
   * endpoint no habla de ubicación, y `null` es que sí habla y dice que no está.
   * Los resúmenes de usuario no lo incluyen, así que no se puede tratar ambos
   * igual al guardar.
   */
  location?: string | null
}

/** Estado de una persona en un proyecto, tal y como viene en `projects_users`. */
export type ApiProjectUser = {
  /** Id de la fila en 42. Es la clave de la réplica. */
  id?: number
  status: string
  /** Tri-estado: `true` aprobado, `false` suspendido, `null` sin nota todavía. */
  'validated?'?: boolean | null
  final_mark?: number | null
  updated_at?: string | null
  /** Cuándo se apuntó al proyecto: es cuando lo tuvo disponible. */
  created_at?: string | null
  /**
   * Cursus a los que pertenece la fila. `21` es el 42cursus (el common core y lo
   * que viene después); la piscina es el `9` y la C-piscine-reloaded el `66`.
   */
  cursus_ids?: number[] | null
  project?: { id: number; name?: string | null; slug?: string | null } | null
  /** Veces que lo ha reintentado (0 la primera). En los exámenes, los reintentos. */
  occurrence?: number | null
  /**
   * Los grupos con los que lo ha hecho, uno por intento. En un examen, cada uno
   * es un intento con su nota.
   */
  teams?: ApiProjectTeam[] | null
  /**
   * La persona, anidada.
   *
   * Solo viene cuando la consulta es **por proyecto**
   * (`GET /v2/projects_users?filter[project_id]=…`): ahí la API la adjunta
   * completa, con `location` y `image` incluidas. En la consulta por login
   * (`GET /v2/users/:login/projects_users`) también viene, así que de hecho se
   * puede leer de las dos, pero el filtro por proyecto es el que lo garantiza.
   *
   * Se declara como `ApiUser` porque es literalmente el mismo objeto de usuario
   * que devuelve `/v2/users/:login`, con su `location` en las mismas
   * condiciones: la clave está presente, el valor puede ser `null`.
   */
  user?: ApiUser | null
}

/** Pertenencia de una persona a un campus. */
export type ApiCampusUser = {
  campus_id: number
  is_primary?: boolean | null
}

/**
 * Un puesto ocupado, de `GET /v2/campus/:id/locations?filter[active]=true`.
 *
 * Con `filter[active]=true` la API devuelve solo las sesiones abiertas
 * (`end_at: null`): el campus entero en una o pocas páginas, en vez de las
 * 7 511 del histórico.
 */
export type ApiLocation = {
  id: number
  host: string
  begin_at?: string | null
  end_at?: string | null
  campus_id?: number
  user?: ApiUser | null
}

/** El paso de alguien por un cursus, de `GET /v2/users/:id/cursus_users` o del perfil. */
export type ApiCursusUser = {
  cursus_id: number
  level?: number | null
  begin_at?: string | null
  /** Fecha en la que el black hole alcanzaría a la persona, si 42 la da. */
  blackholed_at?: string | null
}

/** Un campus, de `GET /v2/campus`. */
export type ApiCampus = {
  id: number
  name: string
  time_zone?: string | null
  city?: string | null
  country?: string | null
  users_count?: number | null
  active?: boolean | null
}

/** Un evento de un campus, de `GET /v2/campus/:id/events`. */
export type ApiEvent = {
  id: number
  name: string
  description?: string | null
  location?: string | null
  /** `conference`, `meet_up`, `hackathon`, `workshop`, `event`… */
  kind?: string | null
  max_people?: number | null
  nbr_subscribers?: number | null
  begin_at: string
  end_at: string
}

/** La inscripción de alguien a un evento, de `GET /v2/users/:id/events_users`. */
export type ApiEventsUser = {
  id: number
  event_id: number
  event?: ApiEvent | null
}

/** Un examen, de `GET /v2/campus/:id/exams` o `/v2/users/:id/exams`. */
export type ApiExam = {
  id: number
  name: string
  location?: string | null
  max_people?: number | null
  nbr_subscribers?: number | null
  begin_at: string
  end_at: string
}

/**
 * Una corrección, de `GET /v2/users/:id/scale_teams` o `GET /v2/scale_teams`.
 *
 * Antes de la corrección 42 oculta a la otra parte: `corrector` y `correcteds`
 * pueden venir como el texto `"invisible"` en vez de como personas.
 */
export type ApiScaleTeam = {
  id: number
  begin_at: string
  corrector?: { id: number; login: string } | string | null
  correcteds?: { id: number; login: string }[] | string | null
  scale?: { duration?: number | null } | null
  team?: { project_id?: number | null } | null
  /** Nota que puso quien corrigió. `null` si aún no se ha hecho. */
  final_mark?: number | null
  /** El veredicto: `positive` dice si dio el proyecto por bueno. */
  flag?: { name?: string | null; positive?: boolean | null } | null
}

/**
 * Un hito de alguien en 42, de `GET /v2/users/:id/quests_users`.
 *
 * Los que interesan: `common-core-rank-00`…`06` (uno por círculo del common
 * core, validado al completarlo) y `42next`, que marca a quien sigue el plan
 * nuevo, el que pasa de C a Python.
 */
export type ApiQuestUser = {
  quest_id: number
  validated_at?: string | null
  quest?: { slug?: string | null; kind?: string | null } | null
}

/**
 * La edición de un proyecto en un campus, de `GET /v2/project_sessions`.
 *
 * De aquí salen las horas estimadas: `estimate_time` es un texto como
 * `"55 hours"`, `"2 days"` o `"1 week"`.
 */
export type ApiProjectSession = {
  project_id: number
  estimate_time?: string | null
}

/**
 * Un movimiento de puntos de evaluación (`/users/:id/correction_point_historics`).
 * `sum` es lo que cambió (negativo si se gastaron o se dieron) y `reason`, por
 * qué: una donación a la bolsa lleva «pool» en el motivo.
 */
export type ApiCorrectionPoint = {
  id: number
  reason: string
  sum: number
  total: number
  created_at: string
}

/** Un intento de un proyecto (un «equipo»), tal como viene dentro de su fila. */
export type ApiProjectTeam = {
  id: number
  final_mark?: number | null
  'validated?'?: boolean | null
  created_at?: string | null
  closed_at?: string | null
}

/** Una inscripción a un examen (`/exams/:id/exams_users`), con la persona anidada. */
export type ApiExamUser = {
  id: number
  user?: {
    id: number
    login: string
    image?: {
      link?: string | null
      versions?: { small?: string | null; medium?: string | null } | null
    } | null
  } | null
}
