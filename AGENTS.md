# Instrucciones para agentes de IA

## El proyecto

Sanatorio 42: web para estudiantes de 42. Cuando te atascas en un proyecto
("¿Qué te duele hoy?"), ves quién te puede ayudar: "pacientes como tú" (lo están
haciendo) y "especialistas" (ya lo aprobaron), su puesto en el cluster y si
están "de guardia". Alrededor: terapias de grupo, tablón de dudas, pizarras y
expediente con XP.

## Estructura

Monorepo con workspaces de npm. Ver `README.md` y `docs/architecture.md`.

- `apps/api/`: API. Una carpeta por funcionalidad en `src/modules/`.
- `apps/web/`: web. Una carpeta por funcionalidad en `src/features/`.
- `packages/contracts/`: tipos de las respuestas de la API, compartidos.
- `infra/`: despliegue.

## Skills y subagentes

En `.claude/skills/` hay una skill por acción recurrente: `nueva-funcionalidad`
(de la idea a producción), `traducir` (textos en las cuatro lenguas, banco de
preguntas y curso de git), `migracion`, `comprobar` (`npm run check` y cómo
leer sus fallos), `revisar` (lista de revisión de este fichero), `desplegar`
(push, despliegue desacoplado del SSH, vigilancia y cupo de GitHub),
`paralelo` (repartir tareas entre agentes con worktrees) y `retomar` (al
empezar una sesión o antes de compactar). Y en `.claude/agents/`, los
subagentes `implementador`, `traductor`, `probador`, `revisor` y
`desplegador`. Úsalos antes de improvisar el procedimiento; si cambia una
regla de aquí, cambia también la skill que la repite.

## Reglas de código

- Antes de dar algo por hecho: `npm run check` (tipos, lint, formato, código sin
  uso con `knip`, duplicados con `jscpd` y tests). Lo que `knip` marque se borra
  o deja de exportarse; no se silencia en `knip.json` salvo que sea un falso aviso,
  con el porqué.
- Un cambio en la forma de una respuesta empieza en `packages/contracts` y se
  refleja en `docs/api.md`.
- API: `core/` e `integrations/` no importan de `modules/`; de otro módulo solo
  se importa su `index.ts`. El linter lo comprueba.
- API: quién administra se comprueba con `assertAdmin(actor)` (`core/actor.ts`),
  no con un `if` propio. Lo que sea solo de admins cuelga de `/admin/…`: la app
  rechaza esa ruta entera a quien no administra, además de lo que compruebe el
  servicio. No pongas una ruta de admins fuera de `/admin/`.
- API: lo que llega en la ruta, la consulta o el cuerpo pasa por un esquema de
  zod o por `idParam` antes de usarse. Un día es el esquema `day` de
  `core/validation.ts`, que exige que la fecha exista. Nada de `Number(…)` ni de
  `request.body.algo` sin validar.
- API: lo que no tiene sesión y cuesta algo (un login, una clave) lleva un tope
  por IP con `createRateLimit` (`core/rate-limit.ts`).
- API: una sesión de staff (`role: 'staff'`) solo llega a `/staff/…`.
  `session.user` y `session.actor` la rechazan; las rutas de staff usan
  `session.staff`. No añadas excepciones.
- API: una ruta nueva entra sola en `tests/integration/routes.test.ts`, que la
  recorre con entradas extremas. Si hace falta que sea pública, se apunta en su
  lista `OPEN`, con el porqué.
- Tests: cada cosa se prueba con las cinco familias de `docs/tests.md`
  (normal, límite, vacío y enorme, imprevisible, permisos). Una pantalla nueva
  lleva su recorrido en `apps/web/tests/ui/`, buscando por rol y nombre como
  lo haría una persona. Los mínimos de cobertura (`thresholds`) solo suben.
- API: el cliente de 42 solo lo reciben `replica`, `network` (correcciones),
  `exams` (intentos y examen en vivo); `auth` hace OAuth con el token de la persona. Los demás leen de la
  réplica. La lista cerrada, con el porqué de cada uno, está en
  `tests/unit/forty-two-callers.test.ts`: un módulo nuevo que lo importe tiene
  que entrar ahí.
- API: antes de pedir algo a 42 se pregunta a `replica.quota` con su escalón
  (`background`, `deferrable` o `critical`). Lo que es de una persona y puede
  esperar usa `quota.defer`, que le da turno en la cola si no hay cuota.
- API: un cambio de esquema es una migración nueva en
  `src/core/db/migrations/`; las existentes no se editan.
- Web: **los textos solo viven en las tablas** de `shared/i18n/textos/*.csv`
  (una por tema; clave, contexto, español, inglés, catalán y euskera). Los
  componentes no llevan texto escrito: usan `t('clave')`. Cada texto nuevo o
  cambiado se edita en su tabla, con su contexto y al menos español e inglés;
  la clave que deja de usarse se borra. Después, `npm run textos -- --write` y
  `npm run check`. Las reglas y el estilo de redacción están en `docs/textos.md`;
  no hay excepciones.
- Web: una funcionalidad no importa de otra (`features/a` → `features/b`); lo
  que se comparte va a `shared/` (`shared/ui`, `shared/chat`…). El linter lo
  comprueba; las pocas excepciones, con su porqué, están en `eslint.config.js`.
- Web: las direcciones se construyen con `shared/links.ts` (`recordHref`,
  `networkHref`, `intraHref`) y se leen con `decodePart`. Nada de montar un
  `#/…/${login}` a mano.
- Web: lo que se añada a la API de mentira sale también en la demostración
  pública (`/demo/`): logins y datos inventados, nunca de gente real.
- Web: las conversaciones viven en el buzón de la cabecera (pestaña
  «Conversaciones»). Para abrir una desde cualquier sitio se llama a
  `openChat(id)` (`features/notices/conversations.ts`); no se monta un chat
  directo en otra sección.
- Web: solo `shared/api/` habla con la API. Lo que se añada al cliente real se
  añade también al simulado (`mock/`); el tipo `Api` obliga a ello.
- API: cuando algo que hace una persona le toca a otra (le responden, le
  reservan, le escriben), el servicio llama a `notify` con un `kind` de
  `packages/contracts/src/notices.ts`. No se escribe en el buzón directamente:
  lo hace `notices` al oír el evento. El texto del aviso va en la tabla `buzon`
  (`notices.kind.*`).
- Web: lo que haya que preguntar de fondo va en `GET /pulse` (`usePulse`), no en
  un sondeo nuevo. Lo que una pantalla pide de nuevo mientras se mira (salas,
  mapa, conectados) va por `usePolling` (`shared/hooks/usePolling.ts`), que se
  para con la pestaña oculta; nada de `setInterval(reload)` a mano.
- **Límites del plan**: al 90 % de un límite gratuito de Oracle solo entra quien
  administra y no corre nada de fondo; al 95 % no entra nadie (`STOP_SHARE` y
  `HARD_STOP_SHARE` en `modules/admin/budget.rules.ts`, y
  `infra/scripts/limits-guard.sh`). No lo hagas regulable ni añadas excepciones.
  Un trabajo periódico nuevo va en `jobs` de su módulo, que es lo que se pausa
  con el corte; lo que se instale en la máquina y hable con internet se añade a
  `QUIET_UNITS` de la guardia. Nada de `infra/` puede pedir a Oracle recursos
  que no sean de la capa gratuita o que pasen del 90 % de ella.
- Comentarios en español, explicando el porqué.

## Reglas de producto

- "Eminencia" es quien aprobó un proyecto con 125; está por encima de
  "especialista" y se enseña en dorado.
- Regla de guardia: alguien está "de guardia" solo si `available: true` y
  `location` no es `null`. Está en `onDuty`, en `features/peers/PeerList.tsx`.
- Tono: clínica cálida y con humor amable. Vocabulario: "de guardia", "fuera de
  turno", "fuera del centro", "especialista", "paciente como tú", "sala de
  espera", "terapia de grupo".
- Textos en segunda persona y con lenguaje inclusivo (evitar formas con género
  cuando se pueda).
- Lo primero que se ve al entrar es el expediente: es la portada y la primera
  pestaña. La navegación va en su propia fila, debajo de la marca: cinco
  categorías (Expediente, Ayuda, Calendario, Clústeres, Datos) y, debajo, las secciones de
  la abierta (`CATEGORIES` en `app/sections.ts`).
- **Funcionalidad nueva**: antes de escribir código se decide su categoría, si
  es sección o bloque, desde qué modo de la interfaz sale (simplificado,
  normal o loco por los datos: `from` y `<Show>` de `shared/detail.tsx`) y su
  importancia, siguiendo la regla de `docs/interfaz.md`; se apunta allí y se
  dice en la respuesta. Mejor un bloque en una sección que existe que una
  sección nueva. Arriba a la derecha solo hay cuatro cosas: el buscador de personas, la
  guardia, el buzón y el menú de la cuenta, que recoge lo demás (panel,
  personalizar, incidencias y sugerencias, salir). No añadas botones sueltos a la cabecera: van al menú. El
  idioma y campus van en el pie.
- Iconos: solo los de `shared/ui/Icon.tsx`, nunca emojis. Uno nuevo se dibuja en
  la misma rejilla (24 × 24, solo trazos, sin colores) y se apunta ahí.
- Explicaciones: nada de párrafos fijos de ayuda bajo un título. Cada sección
  lleva junto al título un `InfoTip` (`shared/ui/InfoTip.tsx`) con su
  demostración animada, y la ventana no lleva más texto que el de la demo. Una
  demo nueva se empieza con `npm run demo:new` (plantilla) y cumple los
  criterios de `docs/demos.md`: un guion sobre `shared/tour/Tour.tsx` hecho con
  `defineTour`, una frase de 70 caracteres como mucho por acción, 20 s de guion
  como mucho, etiquetas reales de la web, logins inventados y el ratón solo
  hacia cosas que existen. Los tests lo comprueban solos.
- Aspecto: hay varios estilos, cada uno en su carpeta de `apps/web/src/themes/`
  (ver su `README.md`). Los componentes no saben cuál está puesto: usan las
  variables de `styles/theme.css` y `styles/styles.css`, y cada estilo les da
  valor. Lo que añadas tiene que verse bien en todos, en claro y en oscuro. Lo
  que no cambia: dentro de una tarjeta no va otra tarjeta con borde, y el color
  es del acento y de los estados (`--ok`, `--warn`, `--danger`).
- Un aviso de un evento con más gente no se puede cerrar sin contestar (voy, me
  retraso, no voy). Lo pendiente lo guarda la API (`GET /events/alerts`), no el
  navegador. No añadas una forma de saltárselo.
- Mapa de clusters: dorado = especialista de guardia, verde = paciente de
  guardia, gris = ocupado sin más. El azul de terapia solo se pinta mientras el
  grupo está reunido (o, al elegir puestos, si choca con el día y la hora).
- Grafo del tablón: es el plan de cada persona, no un catálogo. Turquesa =
  aprobado, blanco = en curso, gris = disponible, gris con candado = aún no.
  Cada proyecto enseña como mucho una marca y solo a quien puede hacer algo con
  ella (`graph` en `doubts.service.ts`). La piscina no sale en ningún sitio.
- Red de correcciones: el grafo se pinta en `<canvas>` (`features/network/ForceGraph.tsx`),
  no en SVG, y todo lo que cambia a cada fotograma vive en un `ref`, no en estado
  de React. Las cuentas (endogamia, comunidades) son de la API: la web no las repite.
- Calendario: cada tipo de evento tiene su color e icono (`features/calendar/kinds.ts`
  y las clases `kind-*`). Lo de Sanatorio en tonos fríos, lo de 42 en cálidos;
  borde discontinuo = no estás apuntado.
- Tablón: el grafo va en perspectiva (`features/doubts/iso.ts`). Cada círculo es
  una bandeja que se levanta al pasar por ella y se queda arriba si tiene el
  proyecto abierto; los tonos van seguidos de un círculo al siguiente.
- Colores: todos salen de las variables de tema de `styles/theme.css`
  (`--surface`, `--text`, `--border`…). Un hexadecimal suelto no cambiaría con el
  modo nocturno; solo vale para lo que es igual en los dos temas (post-its,
  códigos de color del mapa y del grafo).
- Paleta: la pone el estilo. "No disponible" va en gris neutro, nunca en rojo.
- La cabecera tiene que caber en una sola fila y todo verse bien en móvil.
- No hagas commits: los hace la persona.

## XP y anti-trampas

- La XP por ayudar en persona solo sale de una sesión reservada, aceptada,
  con los dos códigos validados (inicio y fin) y valorada por las dos partes. No
  añadas atajos que den XP con un clic.
- Pizarras y sesiones de ayuda: sin los dos códigos no hay XP ni tiempo
  contado. Las reglas (cuándo vale cada código, cuánto tiempo cuenta) están en
  `modules/attendance/attendance.rules.ts`; ese tiempo se enseña al staff, así
  que ante la duda se cuenta menos.
- Las valoraciones no son notas: describen cómo fue la sesión. No añadas
  opciones negativas, positivas ni neutras.
- Los topes (pareja/día, pareja/semana, diarios) y las faltas están en
  `help.service.ts`, `doubts.service.ts` y `therapy.service.ts`, con su porqué.

## Pendiente

- Probar las secciones con gente real y ajustar textos y límites (plazas, XP).
- Guardar el idioma elegido también en el servidor (`PUT /me/settings` ya lo admite).
- Traducir los mensajes de error de la API; fuera del español se enseña uno genérico.

## Al limpiar o compactar el contexto

- Antes: actualiza `docs/tareas-tras-compactar.md` (lo hecho, el plan de lo
  siguiente y lo que queda a medias) y `docs/contexto.md`.
- Después, cuando te digan "revisa y ejecuta las tareas tras compactar": lee ese
  fichero y haz lo que dice, en orden, marcando cada tarea al terminarla.
