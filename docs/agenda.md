# Agenda: Scrum individual por proyecto

Pedido por Alberto el 2026-10-25: una **agenda** para que cada cual vea cómo
avanza y dónde se atasca, lo más automática posible. Un Scrum individual, con
dailies y weeklies en los que se apunta qué vas a hacer, si lo hiciste y, si
no, por qué. Casi todo se **elige de listas** (con «Otro» y su texto), para
que los datos salgan limpios y se puedan contar. Gira alrededor de los
proyectos del cursus de la persona y de los eventos de 42 a los que va, para
ayudarla a centrarse en sacar sus proyectos.

Rutas en [api.md](api.md#agenda-scrum-individual-modulesagenda).

## Dónde está

- **Sección Agenda** (`agenda`, icono `agenda`), en la categoría **Perfil**,
  junto a la portada: es «lo tuyo», tu progreso (regla de `interfaz.md`). Sale
  desde el modo **normal**, como el avance: quien solo quiere pedir o dar ayuda
  no la necesita. Con ella, Perfil pasa a tener dos secciones (Perfil ·
  Agenda) en la segunda fila.
- **Tablero del sprint**: dentro de la tarjeta de cada grupo de la sección
  Sprints («Ver el tablero», solo si estás dentro) y en cada meta de la agenda
  que va con un sprint tuyo («En tu sprint · … · Ver el tablero»).
- Demostración `scrum` en el (i) del título: meta, checkpoint, daily con un
  atasco de la lista y el tablero.

## Cómo se usa

1. **Nueva meta**: eliges el proyecto (los que tienes en curso y los 10
   siguientes de tu plan), la fecha de entrega, cuánto llevas (de 10 en 10,
   «0 % · ni un commit» … «100 % · listo para entregar») y, si quieres, lo que
   te queda en una frase. Salen los **checkpoints de fábrica** de su tipo de
   proyecto; los quitas con un clic y añades otros de la lista.
2. En la meta marcas checkpoints, añades uno de la lista o uno propio
   («Otro (escríbelo)»), cambias el avance, la **fijas como cuenta atrás**
   (chincheta: una cuenta atrás propia con el título «Entrega de …» al final
   del día, con `POST /countdowns/pins`) y la cierras como **Entregado** o
   **Dejarla** (se puede reabrir).
3. **Apuntar daily**: daily o weekly, el día (el weekly va al lunes), qué te
   propones (los checkpoints que quedan), si lo hiciste, qué te atascó y cómo
   podrías salir (con «Otro» y su texto), el avance nuevo y una nota corta.
   Apuntarlo otra vez el mismo día lo reescribe: uno por día y meta.
4. Al lado, **lo de 42 a lo que vas** en dos semanas (eventos apuntados,
   exámenes y correcciones), cada uno con su chincheta. Arriba, «Cuenta atrás»
   abre la ventanita (tu próximo compromiso o una propia) y «Ver el
   calendario» lleva al calendario.

## Las listas

Son cerradas y viven en la API (`modules/agenda/agenda.rules.ts`), que las da
en `GET /agenda` (`options`): la web solo pone el texto de cada clave (tabla
`textos/agenda.csv`). Una clave nueva se añade en el contrato
(`packages/contracts/src/agenda.ts`), en las reglas y en la tabla; TypeScript
no deja olvidar ninguna.

### Checkpoints (`scrum.check.*`)

| Clave | Texto |
| --- | --- |
| `works` | El código funciona |
| `subject` | Subject cubierto entero |
| `sheet` | Hoja de corrección repasada |
| `norminette` | Norminette en verde |
| `leaks` | Sin leaks ni segfaults |
| `breakers` | Varios peers han intentado romperlo |
| `git` | Repo limpio y pusheado |
| `slots` | Slots de corrección reservados |
| `flags` | Compila con `-Wall -Wextra -Werror` |
| `canonical` | Forma canónica en cada clase (C++) |
| `pytools` | flake8 y mypy en verde (Python) |
| `tests` | Los tests pasan |
| `rebuild` | Se monta desde cero sin tocar nada |
| `inputs` | Aguanta mapas y argumentos rotos |
| `window` | La ventana se cierra limpia |
| `practice` | Practicados todos los niveles (examen) |
| `mock` | Simulacro con el reloj en marcha (examen) |
| `registered` | Apuntado al examen en la intra |

### De fábrica, por tipo de proyecto

El tipo sale del nombre del proyecto (`kindOf`); lo que no se reconoce es de C.

| Tipo | Se reconoce por | Checkpoints |
| --- | --- | --- |
| `c` | el resto (Libft, ft_printf, push_swap, minishell…) | works, subject, sheet, norminette, leaks, breakers, git, slots |
| `graphics` | so_long, FdF, fract-ol, cub3D, miniRT, MiniLibX | works, subject, inputs, window, sheet, norminette, leaks, breakers, git, slots |
| `cpp` | CPP Module | works, subject, flags, canonical, leaks, sheet, breakers, git, slots |
| `python` | Python Module, 42next | works, subject, pytools, tests, sheet, breakers, git, slots |
| `sysadmin` | Born2beroot, Inception, NetPractice, cloud-1, kfs | works, subject, rebuild, sheet, breakers, git, slots |
| `exam` | Exam… | practice, mock, registered |
| `other` | ft_transcendence, webserv, ft_irc, camagru… | works, subject, sheet, breakers, git, slots |

### Atascos (`scrum.problem.*`)

`concept` (atascado en un concepto), `bug` (un bug que no encuentro),
`memory` (leaks o segfaults), `norminette`, `subject` (entender el subject),
`time` (no me dio tiempo), `motivation`, `waiting` (esperando corrección o
slot), `cluster_full` (el clúster estaba lleno), `failed_eval` (suspendí una
corrección), `personal` (motivos personales) y `other` (con texto).

### Cómo salir (`scrum.solution.*`)

`peer2peer` (preguntar en Peer to peer), `book_help` (reservar ayuda),
`pair` (pair programming), `sprint` (pedírselo a mi sprint), `whiteboard` (ir
a una pizarra), `docs` (leer la doc o el man), `debugger` (gdb, valgrind,
prints), `split` (partir la tarea), `rest` (descansar y volver fresco) y
`other` (con texto).

### Cómo fue (`scrum.outcome.*`)

`done` (hecho), `partial` (a medias), `not_done` (no lo hice) y, sin elegir,
«aún en marcha» (lo que te propones hoy, para cerrarlo luego).

## Modelo de datos (migración 76, `modules/agenda`)

Las tablas `agenda_*` ya eran de la réplica (eventos de 42): estas son
`scrum_*`. Las tres llevan `login`, van en la descarga de datos y se
anonimizan con el resto.

| Tabla | Qué guarda |
| --- | --- |
| `scrum_goals` | La meta: `login`, `campus_id`, `project_id`, `project_name` y `project_kind` (copiados al crearla), `target_day`, `progress` (0-100, de 5 en 5), `note`, `status` (`active`, `done`, `dropped`), `created_at`, `updated_at` y `closed_at` |
| `scrum_checkpoints` | Los de cada meta: `key` (de la lista) o `text` (propio), `position` y `done_at` (`NULL` sin hacer) |
| `scrum_entries` | Dailies y weeklies: `kind`, `day` (el lunes, en el weekly), `plan` (ids de checkpoints en JSON), `outcome`, `problem` y `problem_other`, `solution` y `solution_other`, `progress` y `note`. Único por (`goal_id`, `kind`, `day`) |

Topes, con su porqué en `agenda.service.ts`: 8 metas en marcha, 15
checkpoints por meta, la entrega de hoy a 180 días, un daily de los últimos
14 días o de mañana (un weekly, hasta la semana que viene), textos cortos
(nota 200, «Otro» 120, nota del daily 280, checkpoint propio 80).

Cada campo elegido es una clave: para sacar cifras basta un `GROUP BY`
(`problem` por proyecto, por tipo o por semana; cuánto tarda cada tipo de
proyecto de `created_at` a `closed_at`; qué checkpoint queda el último). El
texto de «Otro» solo se guarda con «Otro».

## Sprints

Cada sprint (grupo de terapia, `therapy_groups`) ya va de un proyecto
(`project_id`). Quien está en él ve en `GET /agenda/sprints/:id` la meta de
cada persona del grupo **para ese proyecto** (la activa o, si no, la última
entregada; nunca las dejadas): fecha, avance, checkpoints hechos de los que
hay, por cuál va (el primero sin hacer), sus 5 últimos dailies y su
**atasco abierto** (el último daily o weekly, si apuntó un problema; uno
posterior sin problema lo cierra). La web lo pinta como el tablero de un
equipo: una fila por persona, con fecha, %, checkpoints, último daily y una
etiqueta con el atasco; al abrir la fila salen sus checkpoints y dailies.

- **Privacidad**: solo quien está en el grupo (`403` si no; `404` si el grupo
  no existe, está cerrado o es de otro campus). Fuera del tablero, las metas
  de una persona no las ve nadie más: cualquier ruta con la meta de otro da
  `404`. Quien sale del grupo deja de ver el tablero, y su meta deja de
  salir en él.
- **Mundos separados y ocultos**: del tablero sale quien no se ve
  (`seesFor`, `core/audience.ts`); a un grupo no entra nadie del otro mundo.
- En la agenda, cada meta con un sprint tuyo de su proyecto sale **enmarcada**
  en él («En tu sprint · sitio · N personas»), con el tablero a un clic.

## Lo que queda: el gancho con la ayuda

Alberto quiere conectar esto con la ayuda de la web (que quien puede ayudar
vea dónde se atasca alguien y se acerque). No está hecho; el sitio está listo:

- **API**: `onBlocker` en `AgendaServiceOptions` (`agenda.service.ts`). Se
  llama cada vez que alguien guarda un daily o weekly con atasco, con
  `{ login, campusId, goalId, projectId, problem, solution }`. Hoy no se pasa
  (no hace nada) y un fallo suyo no tumba el daily. Conectarlo es pasarlo en
  `app/composition.ts` (por ejemplo, para avisar con `notify` a quien está
  disponible en ese proyecto o proponer una reserva de `help`).
- **Web**: en el detalle de cada fila del tablero
  (`shared/agenda/SprintBoardView.tsx`) está marcado dónde iría «Echarle una
  mano».

## De dónde salen los datos

Nada nuevo a 42:

- Proyectos en curso: la réplica (`projectsOf`, los mismos de la sala de
  espera, que ya llegan con el login).
- Lo siguiente del plan: el plan de estudios guardado (`curriculum.placesOf`
  para saber si es C o Python y `curriculum.circles`, como el Avance de Datos),
  sin preguntar a 42.
- Eventos: `calendar.between` con lo de 42 ya copiado, como las cuentas
  atrás. Comparte la caché de los eventos del campus (como mucho una petición
  por campus y hora, con cuota de fondo) y nunca pide la agenda de la persona.

## Piscineros

Permisos `agenda` (la sección y sus rutas) y `agenda.sprint` (el tablero),
en el árbol de **Expediente** del panel. Van en lo de fábrica de la piscina:
los piscineros también tienen proyectos y sprints.

## Simulado y demostración

`shared/api/mock/agenda.ts`: dos metas tuyas (ft_printf, con un daily de
leaks; get_next_line, en el sprint 2 con un weekly de «Otro»), cuatro
proyectos siguientes del plan y el tablero del sprint 2 con `lruiz`
(esperando slot) y `gmoreno` (atascado en un concepto). El sprint 1 da `403`:
no estás dentro. Sale igual en `/demo/`.
