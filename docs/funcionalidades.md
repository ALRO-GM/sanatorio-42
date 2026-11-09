# Funcionalidades

Todo lo que la web incluye y usa hoy (2026-11-01), agrupado por dónde está,
con el modo de la interfaz desde el que sale y quién lo ve. Está sacado del
código: las secciones de `apps/web/src/app/sections.ts`, los bloques de
`shared/layout/registry.ts`, los `<Show from="…">` de cada pantalla y los
permisos de piscinero de `apps/api/src/modules/pool/pool.keys.ts`. Cómo está
hecha cada pieza: [componentes.md](componentes.md). Por qué cada elemento va en
su modo: [interfaz.md](interfaz.md).

## Cómo leer las tablas

**Modo** es desde cuál sale (`from`): **S** = simplificado (sale en los tres),
**N** = normal (normal y datos), **D** = solo en «loco por los datos». De
fábrica, el modo es normal. Lo que no lleva `<Show>` propio sale con el modo de
su sección. Una sección que no toca en el modo elegido deja de salir en las
pestañas, pero se abre por su dirección.

**Quién**: «todos» es cualquier persona con sesión (estudiante o piscinero con
el permiso). Un piscinero solo ve lo que tiene permitido; la clave va entre
corchetes, p. ej. `[tablon.graph]`, y una clave hija solo vale si su padre está
permitido. Las claves que un piscinero tiene de fábrica son `expediente`,
`expediente.achievements`, `agenda`, `agenda.sprint`, `consulta`,
`consulta.map`, `guardia`, `tablon`, `terapia`, `pizarras`, `notgames`, `calendario`,
`clusters`, `clusters.report`, `red`, `red.seats`, `focus`, `mailbox`,
`people`, `broadcasts` y `tickets`; el resto lo abre quien administra en
Gestión › Piscina. Además, estudiantes y piscineros no se ven entre sí, y un
piscinero solo ve a los de su campus ([piscineros.md](piscineros.md)).

Los nombres de la izquierda son los que se ven en español; entre paréntesis, la
dirección (que conserva los nombres de antes de Peer4U).

## Índice

- [Yo](#yo): Perfil · Agenda · Calendario
- [Ayuda](#ayuda): Peer to peer · Proyectos · Sprints · Pizarras · On-call
- [Aprender](#aprender): Curso de git · Curso de shell · Curso de Docker · Curso de Kubernetes · Not-games · Pomodoro
- [Campus](#campus): Clústeres · Amigos · Avance · Red · Exámenes · Clasificaciones
- [Cabecera](#cabecera), [menú de la cuenta](#menú-de-la-cuenta) y [pie](#pie)
- [En toda la web](#en-toda-la-web): ventanitas, avisos obligatorios, buzón, Personalizar
- [Fuera de la web con sesión](#fuera-de-la-web-con-sesión): entrada, mantenimiento, privacidad
- [Panel de gestión](#panel-de-gestión) (solo admins)
- [Staff](#staff), [piscineros](#piscineros), [demostración](#demostración) y [Code Clicker](#code-clicker)
- [Direcciones](#direcciones)

## Yo

### Perfil (`#/expediente`) · portada · S · `[expediente]`

Sin el permiso, a un piscinero la portada solo le da la bienvenida.

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Tarjeta: foto, login, título, nivel, barra de XP, siguiente título, enlace a la intra | S | Todos | `features/profile/Expediente.tsx` (bloque `record`) |
| Cómo se gana XP y cuánta llevas de cada cosa (al pulsar el nivel) | S | Todos | `LevelButton.tsx` |
| Elegir título; cada título trae su banner, que ven los demás | S | Todos | `TitlePicker.tsx` |
| Títulos de los cursos: cada logro de los cursos conseguido es un título con el banner de su curso (patrón por curso, color por nivel) | S | Con logros de los cursos | `TitlePicker.tsx`, `shared/ui/TitleBanner.tsx`, `styles/banners.css` ([cursos-logros.md](cursos-logros.md)) |
| Certificados del curso de shell | S | Con certificados `[shellcourse]` | `shared/course/Certificates.tsx` |
| Certificados del curso de Docker | S | Con certificados `[dockercourse]` | `MyDockerCertificates` en `shared/course/Certificates.tsx` |
| Certificados del curso de Kubernetes | S | Con certificados `[k8scourse]` | `MyK8sCertificates` en `shared/course/Certificates.tsx` |
| Descargar las horas validadas (CSV con código de verificación) | N | Todos `[expediente.hours]` | `HoursReport.tsx` |
| Health check: pace, cuándo caerías a cada pace, black hole, calculadora «si termino tal día»; la primera vez pregunta pace y fecha | S | Todos `[expediente.health]` | `HealthCard.tsx` (bloque `health`) |
| Compararte en Avance desde el health check | N | Todos `[avance]` | `progressHref` |
| Tu red de correcciones en pequeño | N | Todos `[expediente.network]` | `NetworkCard.tsx` (bloque `network`) |
| Logros y reacciones recibidas | N | Todos `[expediente.achievements]` | `Achievements.tsx` (bloque `achievements`) |
| Logros de los cursos: primer punto, cada certificado y todos los jefes con tres estrellas de cada curso (en git, pruebas de grupo y jefe final), y empezar, terminar y terminar en el orden sugerido los cuatro | N | Todos `[expediente.achievements]` | `Achievements.tsx`, `modules/courses` ([cursos-logros.md](cursos-logros.md)) |
| Quién ayuda más (del mes o siempre) y «cómo te han descrito» | N | Todos `[expediente.ranking]` | `LeaderboardCard.tsx`, `AskedCard.tsx` (bloque `ranking`) |
| Plegar y ordenar los bloques; «Ordenar o plegar estos bloques» | S | Todos | `shared/layout/Blocks.tsx` |
| Perfil de otra persona (`#/expediente/<login>`): su estilo, nivel, salud, red, logros y botón para escribirle | S | Todos | `PublicRecord.tsx` |
| Demostración | S | Todos | `RecordTour.tsx` |

### Agenda (`#/agenda`) · N · `[agenda]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Metas por proyecto: día objetivo y, si se quiere, hora de entrega; progreso, nota, checkpoints de fábrica por tipo o propios; cerrar como hecha o abandonada, reabrir | N | Todos | `features/agenda/GoalForm.tsx`, `GoalCard.tsx` |
| Dailies y weeklies: plan, resultado, problema y solución, elegidos de listas | N | Todos | `EntryForm.tsx` |
| Tablero del sprint dentro de la meta | N | Quien está en un grupo de ese proyecto | `shared/agenda/SprintBoardView.tsx` |
| Eventos de 42 de las dos próximas semanas, con chincheta para fijar la cuenta atrás | N | Todos | `AgendaPage.tsx` |
| Atajos a Cuentas atrás, Calendario y Sprints del proyecto | N | Todos | `AgendaPage.tsx` |
| Demostración | N | Todos | `ScrumTour.tsx` |

Detalle: [agenda.md](agenda.md).

### Calendario (`#/calendario`) · S · `[calendario]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Pestañas Calendario y Cuentas atrás (se recuerda la última) | S | Todos | `features/calendar/CalendarPage.tsx` |
| Vistas día, semana y mes; línea de horas con la raya de ahora | S | Todos | `DayTimeline.tsx` |
| Formas del día: lista, entera, ajustada, desde ahora | N | Todos | `CalendarPage.tsx` |
| Filtro por tipo: ayuda, sprint, pizarra, corrección, evento de 42 apuntado o abierto, examen | S | Todos | `kinds.ts` |
| Ficha del evento: cuándo, dónde, quién, plazas, si vas; enlace a la intra; apuntarse a una pizarra o un sprint | S | Todos | `EventDialog.tsx` |
| Sala del evento: respuestas rápidas (lo he visto, me retraso, no puedo ir) y chat | S | Quien está apuntado | `EventRoom.tsx` |
| Asistencia con un solo código y QR (pizarras y sesiones de ayuda): vale toda la actividad y el tiempo cuenta desde que llegas hasta el final | S | Quien organiza ve el código; quien asiste lo escribe al llegar | `Attendance.tsx` |
| Fijar la cuenta atrás de un evento | S | Todos | `PinCountdown.tsx` |
| Cuentas atrás: las tuyas, el próximo compromiso, algo propio, metas de la agenda, lo de los próximos 30 días | S | Todos (metas `[agenda]`) | `CountdownsView.tsx`, `CountdownPicker.tsx`, `countdowns/GoalPins.tsx` |
| Demostración | S | Todos | `AgendaTour.tsx` |

## Ayuda

### Peer to peer (`#/consulta`) · S · `[consulta]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Elegir proyecto (tus proyectos en curso; a un piscinero, los de la piscina); con uno solo en curso se abre directamente; se recuerda al ir y volver (`#/consulta/<id>`) | S | Todos | `features/peers/ProjectSelect.tsx` |
| Quién puede ayudar, primero quien está disponible: peer como tú, senior o guru, dónde se sienta, si preevalúa, si está en un Pomodoro | S | Todos | `PeerList.tsx` |
| Ficha al pasar por un login | S | Todos `[people]` | `shared/ui/PersonLink.tsx` |
| Mapa del proyecto: puestos, disponibles resaltados, sprint reunido en azul (en el móvil, debajo de la lista) | S | Todos `[consulta.map]` | `features/map/ProjectMap.tsx` |
| Filtros «solo disponibles» y «solo reservables» | S | Todos | `PeerList.tsx` |
| Filtros seniors / peers y «solo preevaluación» | N | Todos | `PeerList.tsx` |
| «Os habéis corregido N veces» con cada persona | D | Todos | `PeerList.tsx` |
| Reservar un rato (30, 60, 90 o 120 min) a quien se ofrece hoy | S | Todos | `features/help/BookHelp.tsx` |
| Sugerencia de ir a Sprints si hay grupos o varias personas disponibles | S | Todos | `PeerList.tsx` |
| Demostración | S | Todos | `WaitingTour.tsx` |

### Proyectos (`#/tablon`) · S · `[tablon]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Grafo de tu plan en perspectiva para elegir proyecto (al piscinero, el de la piscina) | S | Todos `[tablon.graph]` | `features/doubts/HolyGraph.tsx`, `PiscineGraph.tsx` |
| Cambiar entre el grafo de avance y el de correcciones | N | Todos | `DoubtBoard.tsx` |
| Álbum de correcciones: cada proyecto que puedes corregir es un cromo y cada círculo una colección; niveles 1, 3, 5 y 10, siguiente objetivo, rareza y clasificación de completitud entre tu gente (con quien más te sientas), tu kickoff, tu círculo y el campus (más cifras cuanto más alto el modo) | N | Todos `[tablon.corrections]` | `CorrectionGraph.tsx`, `corrections.ts` ([correcciones-coleccion.md](correcciones-coleccion.md)) |
| Guía del proyecto: leerla, proponer cambios, aceptar o rechazar propuestas, marcar un cambio; editarla directamente | S | Todos; editar, seniors | `GuidePanel.tsx` |
| Corcho de dudas: crear, responder, marcar resuelta, editar, borrar, denunciar | S | Todos | `DoubtForm.tsx`, `DoubtDetailCard.tsx` |
| Demostración | S | Todos | `BoardTour.tsx` |

### Sprints (`#/terapia`) · S · `[terapia]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Grupos abiertos del campus, por proyecto | S | Todos | `features/therapy/TherapyGroups.tsx` |
| Abrir o cambiar un grupo: para avanzar o de repaso, hasta 14 fechas, horario, de 1 a 6 puestos que se tocan (o sitio automático) | S | Todos | `GroupForm.tsx`, `map/SeatPicker.tsx` |
| Unirse con el % que llevas, salirse, copiar los logins | S | Todos | `GroupCard.tsx` |
| Chat del grupo | S | Miembros | `GroupCard.tsx` |
| Tablero del sprint | S | Miembros `[agenda.sprint]` | `shared/agenda/SprintBoardView.tsx` |
| Editar, cerrar y avisar una vez a quien hace el proyecto | S | Quien lo abrió | `GroupCard.tsx` |
| Retirar el grupo de otra persona | S | Quien modera | `GroupCard.tsx` |
| Demostración | S | Todos | `TherapyTour.tsx` |

### Pizarras (`#/pizarras`) · S · `[pizarras]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Mes con las del día elegido, o las próximas con plaza, y las pasadas | S | Todos | `features/boards/BoardsCalendar.tsx` |
| Proponer o editar una: título, tema, lugar, fecha (62 días vista como mucho), plazas, horario, descripción | S | Todos | `BoardForm.tsx` |
| Apuntarse (solo antes de que empiece) o salirse; aviso si está llena; denunciar | S | Todos | `BoardCard.tsx` |
| Editar o cancelar | S | Quien la organiza | `BoardCard.tsx` |
| Retirar la de otra persona | S | Quien modera | `BoardCard.tsx` |
| Demostración | S | Todos | `BoardsTour.tsx` |

La asistencia con códigos va en el Calendario.

### On-call (`#/guardia`) · S · `[guardia]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Frase de ánimo | S | Todos | `features/help/cheers.ts` |
| Ofrecerse a preevaluar lo que aprobaste | S | Todos | `PreReviewToggle.tsx` (bloque `prereview`) |
| Cómo te ven ahora y las medias horas de hoy, con un tope de 30 min a 8 h; el editor enseña las cuatro horas siguientes y «Ver el resto del día» | S | Todos | `GuardStatus.tsx`, `DayEditor.tsx` (bloque `today`) |
| Aviso arriba de las reservas que esperan tu respuesta, con salto hasta ellas | S | Todos | `Guardia.tsx` |
| Reservas que te piden y que pides: aceptar, rechazar, anular, valorar (con etiquetas, no notas), bloquear | S | Todos | `BookingCard.tsx` (bloque `bookings`) |
| Personas bloqueadas, con desbloquear | N | Si hay alguna | bloque `blocked` |
| Demostración | S | Todos | `GuardTour.tsx` |

La XP de una sesión solo sale con el código validado y las dos
valoraciones.

## Aprender

### Curso de git (`#/cursogit`) · N · `[gitcourse]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Camino con forma de ramas: mundos en capítulos plegables, puntos que se abren en orden, estrellas | N | Todos | `features/gitcourse/GitCourseTab.tsx` |
| Cada punto: animación de la estructura, teoría y reto en una terminal con git simulado | N | Todos; solo cuenta sentado en un puesto del clúster, o fuera con permiso del panel diciendo dónde estás (en 42, teletrabajo, fuera de 42) | `LevelView.tsx`, `GitGraph.tsx`, `PlacePicker.tsx` |
| Test previo a cada prueba de grupo: entero o una hora de espera | N | Sentado en un puesto | `GateView.tsx` |
| Quién de tu campus espera esa prueba | N | Todos | `GatePeople` |
| Salas de la prueba de grupo: crear, entrar, empezar, órdenes en un origin común | N | Tras el test `[gitcourse.groups]` | `GroupRoom.tsx` |
| Reglas de las estrellas y tiempo estimado | N | Todos | `shared/course/Stars.tsx`, `Estimate.tsx` |
| Demostración | N | Todos | `GitCourseTour.tsx` |

Detalle: [curso-git.md](curso-git.md).

### Curso de shell (`#/cursoshell`) · N · `[shellcourse]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Árbol de 3 niveles y 9 bloques en capítulos plegables | N | Todos | `features/shellcourse/ShellCourseTab.tsx` |
| Cada unidad: teoría, ejemplo que se escribe solo y prueba en una shell simulada | N | Todos | `UnitView.tsx`, `Challenge` |
| Jefes contrarreloj por bloque y jefe final por nivel, con certificado | N | Todos | `shared/course/Certificates.tsx` |
| Demostración | N | Todos | `ShellCourseTour.tsx` |

No pide puesto en el clúster. Detalle: [curso-shell.md](curso-shell.md).

### Curso de Docker (`#/cursodocker`) · N · `[dockercourse]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Árbol de 3 niveles y 9 bloques en capítulos plegables, como el de shell | N | Todos | `features/dockercourse/DockerCourseTab.tsx` |
| Sugerencia de hacer antes el nivel principiante de shell, con enlace; no bloquea | N | Quien aún no lo tiene | `shared/course/CourseOrderHint.tsx` |
| Cada unidad: teoría, ejemplo que se ejecuta solo y prueba en una terminal con Docker simulado (Dockerfiles, compose, registro) | N | Todos | `UnitView.tsx`, `Challenge.tsx`, `packages/dockersim` |
| Jefes contrarreloj por bloque y jefe final por nivel, con certificado | N | Todos | `shared/course/Certificates.tsx` |
| Demostración | N | Todos | `DockerCourseTour.tsx` |

No pide puesto en el clúster. Detalle: [curso-docker.md](curso-docker.md).

### Curso de Kubernetes (`#/cursok8s`) · N · `[k8scourse]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Árbol de 3 niveles y 9 bloques en capítulos plegables, como los de shell y Docker | N | Todos | `features/k8scourse/K8sCourseTab.tsx` |
| Sugerencia de hacer antes el nivel principiante de Docker, con enlace; no bloquea | N | Quien aún no lo tiene | `shared/course/CourseOrderHint.tsx` |
| Cada unidad: teoría, ejemplo que se ejecuta solo y prueba en una terminal con dos clústeres k3s simulados (kubectl, Kustomize y Helm) | N | Todos | `UnitView.tsx`, `Challenge.tsx`, `packages/k8ssim` |
| Jefes contrarreloj por bloque y jefe final por nivel, con certificado | N | Todos | `shared/course/Certificates.tsx` |
| Demostración | N | Todos | `KubernetesCourseTour.tsx` |

No pide puesto en el clúster. Detalle: [curso-kubernetes.md](curso-kubernetes.md).

### Not-games (`#/notgames`) · N · `[notgames]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Salas abiertas de preguntas y de ajedrez: cada grupo (estudiantes o piscineros) solo ve las suyas y, de fábrica, solo las de su campus | N | Todos | `features/notgames/NotGamesPage.tsx`, API `quiz/room-access.ts` |
| Crear sala de preguntas: duelo, equipos, todos contra todos (a solas, práctica) o supervivencia con 3 vidas; preguntas de lo que sabe todo el grupo o generales; rápidas, largas o mezcla; dificultad; cuántas; círculo mínimo; competitivo (fallar resta) | N | Todos | `NotGamesPage.tsx` |
| Partida: espera y equipos, cuenta atrás con la hora del servidor, marcador, la buena y por qué | N | Quien está en la sala | `RoomView.tsx` |
| Ajedrez con pregunta: reloj de 3, 5, 10 o 15 min, pregunta tras cada jugada (quien acierta primero mueve), rendirse, repasar la partida, estilo del tablero | N | Todos `[notgames.chess]` | `TurnRoomView.tsx`, `ChessBoard.tsx` |
| Repaso: lo fallado con concepto, ejemplo y la pregunta; lo superado aparte | N | Todos `[notgames.review]` | `ReviewTab.tsx` |
| Sonidos, que se pueden apagar | N | Todos | `SoundToggle.tsx` |
| Demostraciones (salas y ajedrez) | N | Todos | `NotGamesTour.tsx`, `ChessTour.tsx` |

### Pomodoro (`#/pomodoro`) · S · `[focus]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Concentración de 5 a 240 min (rueda de 5 en 5) y descanso de 0, 5, 10 o 15 | S | Todos | `features/focus/FocusPage.tsx` |
| Qué pestañas siguen a la vista y qué avisos pasan (correcciones, eventos, mensajes, guardia, buzón) | S | Todos | `FocusPage.tsx` |
| Pestañas Startup y Estadísticas | N | Todos | `FocusPage.tsx` |
| Tus estadísticas: días, horas, paradas y motivos, «quise parar y seguí», y la media del tramo de gente elegido | N | Todos `[focus.stats]` | `FocusMyStats.tsx`, `FocusStatsView.tsx` |
| Startup: con los minutos de concentración se construye una empresa en una oficina viva en píxeles (gente que programa, va a por café o charla; personal y mascotas); dinero, productos, edificio con sótano y azotea, contratar, decoración que se coloca, cajas sorpresa, mudanza, nueva partida+ y visitar la oficina de quien sale en la clasificación | N | Todos | `focus/startup/StartupPanel.tsx`, `World.tsx` |

Lo que va fuera de la página (temporizador, pantalla completa, sonido) está en
[En toda la web](#en-toda-la-web). Startup: [pomodoro-startup.md](pomodoro-startup.md).

## Campus

### Clústeres (`#/clusters`) · N · `[clusters]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Plano de cada clúster con leyenda (en la web, ocupado, reservado, libre, roto) y colores (senior disponible dorado, peer disponible verde) | N | Todos | `features/map/ClusterMapView.tsx` |
| Resaltar a tu círculo o a quien hace tu proyecto, con cuánta gente cumple cada uno | N | Todos | `ClustersPage.tsx` |
| Girar y alinear el plano; «Ajustar» o «100 %» en los clústeres grandes | N | Todos | `fit.ts` |
| Ficha de un puesto al pasar; al pulsar se queda, con escribir y ver el perfil. El círculo de un piscinero es su último módulo de C aprobado (C 02 → «C02»; solo shell → 0) | N | Todos | `SeatHoverCard.tsx`, `shared/circle.ts` |
| Los piscineros siguen en el plano (la sala tal cual), pero un estudiante no ve su foto | N | Estudiantes | `ClusterMapView.tsx` |
| «N de M personas tienen Peer4U abierto» | D | Todos `[clusters.online]` | `ClustersPage.tsx` |
| Marcar o desmarcar un puesto roto | N | Todos `[clusters.broken]` | `ClustersPage.tsx` |
| Avisar al staff de un problema del edificio: qué, dónde (tu puesto si no se dice) y nota | N | Todos `[clusters.report]` | `features/facility/FacilityForm.tsx` |
| Mapa de calor: horas de uso de cada ordenador por periodo | N | Todos | `SeatHeatCard.tsx` |
| Demostración | N | Todos | `ClustersTour.tsx` |

### Amigos (`#/asientos`) · N · `[red.seats]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Con quién te sueles sentar, en una frase | N | Todos | `features/network/SeatsPage.tsx` |
| Red de con quién se sienta cada cual, por periodo o fechas (de entrada, «todo»); cada grupo empieza en su hueco y se puede reorganizar desde cero | N | Todos | `SeatsPage.tsx` |
| Si un periodo no deja a nadie, vuelve a «todo» con un aviso; si no sales en el grafo, no quedas elegido | N | Todos | `SeatsPage.tsx` |
| Color por grupos o por lo a solas que se sienta cada cual; recortes (los que más, %, centrar en ti) | N | Todos | `SeatsPage.tsx` |
| Ficha: horas, % a solas, puesto habitual, con quién más | N | Todos | `SeatsPage.tsx` |
| Totales, quién se sienta más a solas y cómo se calcula | N | Todos | `SeatsPage.tsx` |
| Demostración | N | Todos | `SeatsTour.tsx` |

Detalle: [asientos.md](asientos.md).

### Avance (`#/avance`) · N · `[avance]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| La respuesta en una frase: cuántas semanas vas por delante o por detrás de la media | N | Estudiantes | `features/stats/progressAnswer.ts` |
| Gráfica por círculos o por horas: tu línea, medias por plan, población (terminado, en curso, black hole) y campus, paces y cuartiles, zoom; en el móvil, tocar marca un punto y arrastrar recorre la línea con ajuste fino | N | Estudiantes | `ProgressPage.tsx`, `ProgressChart.tsx` |
| «Ver a fondo»: quién cuenta, campus, todos juntos (abierto de fábrica en datos) | N | Estudiantes | `ProgressPage.tsx` |
| Comparar con hasta 5 personas y «los más rápidos» | N | Todos `[avance.compare]` | `ProgressCompare.tsx` |
| Quién va más rápido: por círculo o %, plan, kickoff, rangos; tu fila fija. Las kickoffs son las reales de cada campus (los días con muchas entradas); quien entró a destiempo va con la anterior a su entrada | N | Estudiantes | `ProgressRanking.tsx` |
| Avance de la piscina: aprobado por día frente a la media de su piscina y los más avanzados; en la vista sin límites, las últimas 10 piscinas, la media de todas y quién cuenta (todos, quien sigue o quien abandonó); por semanas, con los viernes de examen marcados | N | Piscineros | `PiscineProgressPage.tsx`, `PiscineTop.tsx`, `PiscinePools.tsx` |
| Demostración | N | Todos | `ProgressTour.tsx` |

Detalle: [blackhole.md](blackhole.md).

### Red (`#/red`) · N · `[red]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Grafo de burbujas de quién ha corregido a quién; de entrada, tu red del último año. Con más de 150 burbujas solo se pintan las uniones más fuertes (1,5 por burbuja; las de quien eliges, todas) | N | Todos | `features/network/ForceGraph.tsx` |
| Unos filtros que no dejan a nadie vuelven solos a la vista de partida con un aviso; si tu red sale vacía (aún sin correcciones, o viendo la web como piscinero), la de partida es la del campus | N | Todos | `NetworkPage.tsx` |
| En la vista de piscinero sin límites, de partida la red de toda la piscina en curso o la última, desde su primer día | N | Dueño | `NetworkPage.tsx`, `pool.service.ts` |
| Filtros: campus (uno, varios, todos), meses en una línea que se arrastra, proyecto, mínimos por pareja y persona, cuántas personas, veredicto, solo mutuas, solo de dentro | N | Todos | `NetworkPage.tsx`, `Timeline.tsx` |
| Color por comunidad, endogamia, suspensos dados o recibidos, promoción, balance, origen o campus | N | Todos | `NetworkPage.tsx` |
| Buscar a alguien en el grafo; atajo a tu red | N | Todos | `PersonSearch.tsx` |
| Ficha de persona y detalle de una pareja | N | Todos | `PersonPanel.tsx`, `PairDetail.tsx` |
| Totales y una frase con tus correcciones hechas y recibidas | N | Todos | bloque `totals` |
| Endogamia, parejas, los más estrictos, proyectos más corregidos | D | Todos `[red.rankings]` | bloques `endogamy`, `pairs`, `strictest`, `projects` |
| Cómo se lee | N | Todos | bloque `about` |
| Aviso mientras sigue la copia desde 42 | N | Todos | `NetworkPage.tsx` |
| Demostración | N | Todos | `NetworkTour.tsx` |

### Exámenes (`#/examenes`) · N · `[examenes]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Examen en vivo del campus: quién ha entrado, qué examen, barra con la nota de hoy (la que 42 va subiendo mientras siguen dentro) y mejor nota; refrescar | N | Todos `[examenes.live]` | `features/exams/ExamPeople.tsx` |
| Último examen acabado con sus resultados | N | Todos `[examenes.live]` | `ExamsPage.tsx` |
| «En vivo» en la pestaña Campus y en Exámenes mientras hay examen | S | Todos | `app/Nav.tsx` |
| Estadísticas de cada Exam Rank, con filtros de plan, exámenes y kickoffs | N | Todos `[examenes.stats]` | `ExamStatsPanel.tsx` |
| Detalle de cada intento y días por círculo, plegados hasta pulsar | D | Todos `[examenes.stats]` | `ExamStatsPanel.tsx` |
| Elegir exámenes de estudiantes o de piscineros | N | Solo la vista sin límites del dueño | `ExamsPage.tsx` |
| Demostración | N | Todos | `ExamsTour.tsx` |

### Abandono (`#/abandono`) · N · `[abandono]`

Pedido por Alberto el 2026-11-06 ([abandono.md](abandono.md)). Solo quien administra, la vista sin límites y piscineros con el permiso (cerrado de entrada).

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Tabla de cada piscinero con su probabilidad de abandono, estado, último día, días sin venir, horas, asistencia, aislamiento, correcciones y aprobados; filtros: más probables, todos por probabilidad, seguro que siguen, no vinieron nunca | N | Admins `[abandono]` | `features/dropout/` |
| Ficha de una persona: horas de cada día (fines de semana y viernes de examen marcados; el eje, en días de piscina), razones y cuándo lo dejó («del jueves al viernes») | N | Admins `[abandono]` | `features/dropout/` |
| Abandonos por día de piscina (del 1, el lunes del inicio, al 26, el viernes del examen final; los días de examen 5, 12, 19 y 26 resaltados) o por semana, con el acumulado, y por día de la semana del cambio; solo confirmados o también probables | N | Admins `[abandono]` | `features/dropout/` |
| Cifras: confirmados, probables, % de la piscina, horas de media antes de abandonar frente a quien sigue, semana y día con más abandonos | N | Admins `[abandono]` | `features/dropout/` |
| Tabla de correlaciones (0–100) entre factores que se pueden quitar y poner, y dispersión de dos factores elegidos | N | Admins `[abandono]` | `features/dropout/` |
| Factores comunes: parejas juntas frente al abandono y grupos de factores que van juntos | N | Admins `[abandono]` | `features/dropout/` |
| Elegir piscina entre las 10 últimas de Madrid (copiadas de fondo por el historial de piscinas) | N | Admins `[abandono]` | `features/dropout/`, `replica/piscine-history.ts` |
| En las piscinas terminadas, el abandono seguro: el último día que vino (puesto, examen o corrección); quien llegó hasta dos días antes del examen final, la terminó | N | Admins `[abandono]` | `dropout.rules.ts` |
| Comparar piscinas: elegir varias de las 10 últimas y ver cuánta gente sigue cada día, abandonos por semana y día de la semana, y cómo eran quienes lo dejaron frente a quienes siguen, de cada una y de todas juntas | N | Admins `[abandono]` | `features/dropout/` |
| Ajustar el cálculo en vivo: deslizadores para lo que pesa faltar entre semana, el viernes y el fin de semana, cuándo se confirma, los umbrales y un peso por factor (horas, asistencia, aislamiento, correcciones, aprobados); «Volver a lo de fábrica» | N | Admins `[abandono]` | `DropoutTuningPanel.tsx` |
| Totales arriba: piscineros, abandonaron, probables, en duda, siguen, no vinieron nunca y en el examen; cada uno filtra la tabla | N | Admins `[abandono]` | `DropoutPage.tsx` |
| Quien está en el examen o corrige ese día cuenta como venido (los puestos de los piscineros solo se ven en vivo) | N | Admins `[abandono]` | `stats/dropout.service.ts` |

### Clasificaciones (`#/estadisticas`) · N · `[estadisticas]`

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Clasificación de cada sección de Ayuda (sesiones validadas, dudas resueltas, sprints, pizarras, partidas), del mes o siempre, con fotos y tu fila; los puestos se cuentan solo entre la gente que ves | N | Todos | `features/stats/HelpStatsPage.tsx` |
| Tu mejor puesto en una frase | N | Todos | `HelpStatsPage.tsx` |
| Clasificaciones de los cursos, del mismo periodo: estrellas de los cuatro juntos y de cada curso, jefes vencidos y certificados, con las cifras del campus, fotos y tu fila; solo gente del campus y de tu mundo, sin ocultos | N | Todos | `CourseStats.tsx`, `StatsCard.tsx`, `modules/courses` ([cursos-logros.md](cursos-logros.md)) |
| Demostración | N | Todos | `HelpStatsTour.tsx` |

## Cabecera

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Marca Peer4U: lleva a la portada (y guarda un secreto) | S | Todos | `app/Header.tsx` |
| Buscador de personas por login o nombre, sin distinguir acentos | S | Todos `[people]` | `features/profile/PersonFinder.tsx` |
| Interruptor «Disponible» | S | Todos `[guardia]` | `features/peers/AvailabilityToggle.tsx` |
| Interrogante: se arrastra sobre un sitio y abre su demostración | S | Todos | `features/suggest/HelpBubble.tsx` |
| Bicho de sugerencias: se suelta sobre algo y abre un panel con el sitio, el problema y tu propuesta | S | Todos `[tickets]` | `SuggestBubble.tsx`, `SuggestPanel.tsx` |
| Instalar como aplicación (icono de bandeja con flecha): solo si el navegador lo permite y aún no está instalada; en Safari de iPhone y iPad explica cómo hacerlo desde Compartir. Iconos PNG, manifest con `id` y `scope` y etiquetas de iOS para instalarla en cualquier dispositivo | S | Todos | `app/InstallButton.tsx`, `shared/install.ts`, `public/manifest.webmanifest` |
| Buzón con el número de sin leer | S | Todos `[mailbox]` | `features/notices/Mailbox.tsx` |
| Categorías y, debajo, secciones de la abierta (en el móvil, barra fija abajo) | S | Todos | `app/Nav.tsx` |

## Menú de la cuenta

En este orden (`app/Header.tsx`, `app/UserMenu.tsx`):

| Entrada | Modo | Quién |
| --- | --- | --- |
| Pomodoro | S | Todos `[focus]` |
| Panel de gestión | S | Solo admins |
| Code Clicker | S | Quien eligió la pastilla roja `[clicker]` |
| Personalizar | S | Todos |
| Incidencias y sugerencias | S | Todos `[tickets]` |
| Bienvenida | S | Todos |
| Salir | S | Todos |

## Pie

| Funcionalidad | Modo | Quién |
| --- | --- | --- |
| Idioma: español, inglés, catalán, euskera y francés (lo que le falta al francés sale en inglés) | S | Todos |
| «Más ajustes» (abre Personalizar) | S | Todos |
| Campus que se mira (los que no se copian, marcados) | N | Todos |
| De cuándo son los datos de 42 | D | Todos |
| Privacidad | S | Todos |
| Quién la hace: «Hecho para albrodri», con enlace a su perfil de la intra (también en la pantalla de entrada) | S | Todos |

## En toda la web

### Cargas largas

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Mientras carga Amigos, Red o Avance: tu burbuja latiendo, la fase en la que va y cifras que suben hacia las de la última vez | S | Todos | `shared/ui/LoadingActivity.tsx`, `shared/loadMemory.ts` |
| Los grafos de Amigos y Red aparecen desde ti hacia fuera, por tandas | S | Todos | `features/network/reveal.ts` |
| Al volver a Amigos, Red o Avance se ve al momento lo de la última vez, y se pone al día detrás | S | Todos | `useAsync` con `keep` |
| Si algo tarda, «Cargando…» dice que sigue en marcha | S | Todos | `shared/ui/Async.tsx` |

Detalle: [rendimiento.md](rendimiento.md#9-cargas-largas-2026-11-02).

### Ventanitas de la esquina

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Temporizador del Pomodoro, plegable y arrastrable | S | Todos `[focus]` | `features/focus/FocusTimer.tsx` |
| Pomodoro a pantalla completa: «no molestar», pantalla encendida, la startup en pequeño | S | Todos `[focus]` | `FocusScreen.tsx`, `useWakeLock.ts` |
| Al parar antes de tiempo: motivos, diez segundos y seguir con felicitación | S | Todos `[focus]` | `FocusExit.tsx` |
| Sonido de fondo: ruido, naturaleza o diez lo-fi | S | Todos `[focus]` | `FocusSound.tsx` |
| Mientras dura: solo las pestañas elegidas, juegos callados, solo los avisos elegidos; «concentrado» en tu ficha | S | Todos | `app/sections.ts` (`hiddenInFocus`) |
| Cuentas atrás: avisos de quien administra y lo que fijas | S | Todos | `features/countdowns/CountdownDock.tsx` |
| Ventanita de Code Clicker | S | Quien juega `[clicker]` | `features/clicker/Mini.tsx` |
| Ordenar, sacar a flotar y plegar cada ventanita | S | Todos | `shared/dock` |

### Franjas y avisos

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Tu turno en la cola de la cuota de 42 | S | Quien espera | `features/alerts/QuotaNotice.tsx` |
| Aviso de que tu campus aún no se copia | S | Quien entra desde otro campus | `features/campus/OtherCampusNotice.tsx` |
| Franja de mantenimiento con enlace al panel | S | Admins durante el mantenimiento | `features/maintenance/MaintenanceBanner.tsx` |
| Franja «ver como piscinero» con «Volver» | S | Admins en esa vista | `app/PoolPreviewBar.tsx` |
| En esa vista, el Avance es el del piscinero que va más avanzado (tu perfil no cuenta), con su piscina entera | S | Admins en esa vista | `PiscineProgressPage.tsx`, `stats/piscine.service.ts` |

### Ventanas que hay que contestar

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Aceptar privacidad y condiciones (otra vez si cambia la versión) | S | Todos | `features/legal/LegalGate.tsx` |
| Comunicados de quien administra, con opciones | S | Destinatarios `[broadcasts]` | `features/admin/BroadcastGate.tsx` |
| Avisos de eventos con la antelación elegida; con más gente, no se cierran sin «voy», «me retraso» o «no voy»; notificación del sistema si la pestaña está oculta | S | Todos `[calendario]` | `features/alerts/AlertCenter.tsx` |
| Confirmar la asistencia al abrir el enlace de un QR | S | Asistentes | `AlertCenter.tsx` |
| Peticiones de ayuda y reservas rechazadas o anuladas (se aplazan en el Pomodoro) | S | Todos `[consulta]` | `features/help/HelpGate.tsx` |
| Revisión de trampas de Code Clicker | S | Quien juega `[clicker]` | `features/clicker/ReviewGate.tsx` |

### Otras ventanas

| Funcionalidad | Modo | Quién | Dónde |
| --- | --- | --- | --- |
| Bienvenida en seis pasos (siete con la Red), que siguen el modo elegido: el modo en el saludo, perfil, Peer to peer y On-call, Proyectos con Sprints y Pizarras, el calendario con los ajustes; sola solo la primera vez que entras (lo apunta la API por persona: no vuelve en otro navegador ni al volver a entrar) y, cuando quieras, desde el menú | S | Todos | `features/welcome/Welcome.tsx` |
| Buzón · Avisos: cada uno lleva a su sitio; guardar, borrar, borrar los leídos | S | Todos `[mailbox]` | `features/notices/Mailbox.tsx` |
| Buzón · Conversaciones: directas, de grupo, pizarra, ayuda y evento; filtros (sin leer, pendientes, tipo, proyecto); marcar pendiente o sin leer; recordar en una hora, mañana o el lunes; escribir a alguien nuevo; denunciar un mensaje | S | Todos `[mailbox]` | `Conversations.tsx`, `PeerPicker.tsx` |
| Incidencias y sugerencias: categoría (fallo, mejora, idea, traducción, otra), sección y texto, y las tuyas con respuesta | S | Todos `[tickets]` | `features/admin/Inbox.tsx` |
| Personalizar · Estilo: siete estilos (uno exclusivo), paletas, claro u oscuro, y con qué estilo ven tu perfil | S | Todos | `app/studio/StylePanel.tsx` |
| Personalizar · Orden: la web en pequeño para arrastrar categorías, pestañas y bloques; a mano, por tu uso o por la comunidad; volver al de fábrica | S | Todos | `Miniature.tsx` |
| Personalizar · Ajustes: modo de la interfaz, antelación de avisos (0 a 60 min), iconos de información, idioma, tamaño del texto, daltonismo, zen | S | Todos | `features/settings/ComfortSettings.tsx` |
| Demostración animada en el icono de información de cada sección, con velocidad elegible | S | Todos | `shared/tour` |
| Ficha de una persona al pasar por su login | S | Todos `[people]` | `shared/ui/PersonLink.tsx` |
| Cuando algo falla, «Reintentar» recarga la página entera (también si el servidor no responde) | S | Todos | `shared/ui/ErrorNote.tsx`, `ErrorBoundary` |

## Fuera de la web con sesión

| Funcionalidad | Quién | Dónde |
| --- | --- | --- |
| Entrar con la cuenta de 42 y el motivo de un rechazo (cancelado, no eres estudiante, piscina cerrada con el aviso de quien administra) | Sin sesión | `features/auth/Login.tsx` |
| Portada pública por idioma (`/es/`, `/en/`, `/ca/`, `/eu/`, `/fr/`): qué es Peer4U, qué ofrece y preguntas frecuentes, en HTML sin JavaScript para los buscadores; lleva a entrar en su idioma (`/?lang=…`). La pantalla de entrada enlaza a la de su idioma («Qué es Peer4U»). Con `robots.txt` y `sitemap.xml` ([seo.md](seo.md)) | Todos | `tools/portada.ts` |
| Servidor caído, con reintentar | Todos | `app/App.tsx` |
| Pantalla de mantenimiento con cuenta atrás y entrada discreta para admins | Quien no administra | `features/maintenance/MaintenanceScreen.tsx` |
| Privacidad y condiciones (`#/privacidad`), también sin sesión: responsable y correo de contacto, quién puede entrar, datos de 42 y de aquí, base legal (consentimiento e interés legítimo), quién lo ve y proveedores, plazos, seguridad, derechos, cómo no salir en la web y normas | Todos | `features/legal/LegalPage.tsx` |
| Con sesión: cuándo aceptaste, descargar todos tus datos, anonimizar la cuenta escribiendo tu login | Todos | `LegalPage.tsx`, `AnonymizeAccount.tsx` |

## Panel de gestión

`#/gestion`, desde el menú de la cuenta. Solo admins, tras el segundo factor
(código de una app de autenticación; la primera vez, con un QR:
`features/admin/PanelLock.tsx`). No depende del modo. Pestañas, en este orden
(`AdminPage.tsx`):

| Pestaña | Qué se hace |
| --- | --- |
| Consumo | Aviso si no hay secreto siguiente de la app de 42 puesto (el actual caduca cada cuatro semanas y la web pasa sola al siguiente); presupuesto de peticiones y sus ajustes; cuota de la API de 42 (modo, hasta dónde baja la copia, cola); uso de 42 por función y persona con topes; consumo por persona, últimas 48 h, quién más gasta y tope por hora a mano |
| Permisos y bloqueos | Dar o quitar admin; bloquear 1, 7 o 30 días o siempre, con motivo; límites a mano; cuentas de staff (la clave se ve una vez); horas validadas de todo el mundo; quién puede hacer el curso de git fuera del clúster y el último sitio que dijo |
| Límites | Topes por persona (mensajes por minuto, incidencias, sugerencias, dudas, reservas de ayuda, sprints, pizarras, puestos rotos, avisos del edificio, metas, cuentas atrás): lo de fábrica, cambiarlo para todo el mundo o, eligiendo a alguien, solo para esa persona, y volver a lo de fábrica. Manda persona > todo el mundo > fábrica. Los cortes del plan (90 %) no se regulan |
| Incidencias | Pendientes y respondidas, denuncias por motivo, responder y borrar |
| Mensajes | Registro de lo escrito en los chats de eventos, con filtro |
| Qué se usa | Mapa de calor de cada elemento, recorridos entre secciones y mapa de clics |
| Estadísticas | Tiempo en la web y tráfico (de todos o de una persona), velocidad de las demos, quién está conectado y crecimiento por campus |
| Amigos | Pesos de los puestos de la red de asientos en una cuadrícula alrededor de la persona, con el grafo resultante y cuánto mejor separa en grupos frente a los pesos en uso |
| Code Clicker | Uso y partidas; trampas (ver la partida, escribir, indultar, comunicado a quienes las hicieron); sanción a mano; resetear la pastilla |
| Comunicados | A una persona, varias, un campus o todo el mundo, con opciones y respuestas |
| Cuentas atrás | Limpieza de taquillas (día y hora) u otro aviso, para estudiantes, piscineros o todos |
| Mantenimiento | Mensaje y hora de vuelta (atajos de 30 a 240 min) |
| Avisos del edificio | Lista y «resuelto» |
| Pomodoro | Uso por periodo, paradas y motivos, por tramo de gente |
| Piscina | Abrir o cerrar la entrada; aviso con la piscina cerrada; árbol de permisos por pestaña y elemento; ver como piscinero; vista sin límites (solo el dueño); salas de preguntas entre campus (de fábrica, no) |
| Personas ocultas | Ocultar a alguien a estudiantes, piscineros o los dos, con motivo |
| Limpiar datos | Qué, de quién y desde cuándo, con vista previa antes de borrar (lo único que borra datos) |

Detalle: [mantenimiento.md](mantenimiento.md),
[avisos-cuenta-atras.md](avisos-cuenta-atras.md),
[personas-ocultas.md](personas-ocultas.md), [consumo-api.md](consumo-api.md),
[limites.md](limites.md).

## Staff

`#/validar`, fuera de la web de estudiantes (`features/staff/StaffPage.tsx`).
Se entra con la clave que crea un admin; la sesión dura 2 h y no llega a nada
más.

| Funcionalidad | Dónde |
| --- | --- |
| Escribir el código de un documento (p. ej. el CSV de horas) y verlo tal como se emitió | `StaffPage.tsx` |
| Subir el fichero recibido y saber si es idéntico | `StaffPage.tsx` |
| Avisos del edificio, con «resuelto» | `features/facility/FacilityList.tsx` |

## Piscineros

Quien está en una piscina en curso entra a una versión solo para piscineros si
quien administra la abre ([piscineros.md](piscineros.md)). Además de los
permisos por clave de arriba:

- Peer to peer enseña todos los proyectos de la piscina.
- Proyectos enseña el grafo de la piscina (shell en azul claro, C en azul
  oscuro, y aparte rushes, BSQ y exámenes).
- Avance enseña la piscina por días frente a la media de su piscina.
- Sin el permiso `expediente`, la portada es un saludo.
- Su círculo (en Peer to peer, la ficha de una persona y los clústeres) es su
  último módulo de C aprobado: C 02 aprobado es «C02»; quien solo lleva shell, 0.
- En Not-games solo ven las salas de piscineros, y de su campus (o de todos,
  si quien administra abre las salas entre campus).
- Solo ven a piscineros de su campus, y ningún estudiante los ve.

## Demostración

`/demo/`: la web entera con la API de mentira (`shared/api/mock`), datos y
logins inventados y nada guardado. Una etiqueta plegable en la pila dice que es
una demostración y enlaza a la web de verdad (`app/DemoBadge.tsx`).

## Code Clicker

Secreto (`#/clicker`, `features/clicker`). Pulsando la marca de la cabecera
salen avisos y, al final, una pregunta con dos pastillas: la azul lo olvida
todo; la roja abre el juego. Para quien no eligió la roja, la sección no existe.

| Funcionalidad | Quién |
| --- | --- |
| Juego incremental: escribir código, comprar lo que lo escribe solo, mejoras y noticias que hablan de tus 10 amistades más cercanas (con quien más te sientas) | Pastilla roja `[clicker]` |
| Sigue en toda la web con su ventanita (no en el Pomodoro) | Pastilla roja |
| Estadísticas con historial de capital (hoy, semana, mes, todo, fechas, zoom), logros y clasificación | Pastilla roja |
| Tope de 30 min al día si tu pace está en riesgo | Pastilla roja |
| Revisión de trampas: hay que defenderse (20 caracteres o más) antes de seguir | Quien tiene una revisión |

Detalle: [code-clicker.md](code-clicker.md).

## Direcciones

`#/<sección>` para cualquier sección de la tabla; una dirección no válida lleva
a la portada. Se construyen con `shared/links.ts`.

| Dirección | Qué abre |
| --- | --- |
| `#/expediente/<login>` | El perfil de otra persona |
| `#/calendario/<evento>` | La ficha de ese evento |
| `#/notgames/<n>`, `#/notgames/t<n>`, `#/notgames/review` | Una sala de preguntas, una partida de ajedrez, el Repaso |
| `#/red/<login>` | La red centrada en esa persona |
| `#/avance?plan=…&pop=…&scope=…&paces=1&me=1` | El Avance con esas opciones |
| `#/asistencia/<evento>/<código>` | El enlace del QR: pide confirmar y vuelve a `#/calendario` |
| `#/validar` | La página del staff |
| `#/privacidad` | Privacidad y condiciones (también sin sesión) |
| `#/notgames/git`, `#/notgames/shell` | Direcciones viejas: llevan a `#/cursogit` y `#/cursoshell` |
