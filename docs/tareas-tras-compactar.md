# Tareas tras compactar

Lista de lo que hay que hacer nada más retomar el trabajo con el contexto vacío.
Alberto dirá: **"revisa y ejecuta las tareas tras compactar"**. Entonces se lee
este fichero y se hace lo que dice, en orden.

## Cómo se usa

- **Antes de compactar o limpiar el contexto**, quien esté trabajando actualiza
  este fichero: tacha lo hecho, escribe el plan de lo siguiente y deja apuntado
  cualquier cosa a medias (qué fichero, qué faltaba, qué se había decidido).
  También pone al día [contexto.md](contexto.md).
- **Al retomar**, se ejecuta de arriba abajo. Cada tarea se marca (`[x]`) al
  terminarla, con la fecha si importa. Si algo no se puede hacer, se dice y se
  apunta aquí por qué.
- Lo que ya no aplica se borra: este fichero es el plan vigente, no un historial.
- Si una tarea necesita una decisión de Alberto, se le pregunta antes de seguir
  con esa; las demás no esperan.

Última puesta al día: 2026-10-24. En producción desde el 2026-10-11.

## 1. Arranque (siempre, en cada sesión nueva)

- [ ] Leer [contexto.md](contexto.md) entero.
- [ ] Ver qué hay sin subir: `git status --short | wc -l` y `git log --oneline -3`.
- [ ] `npm run check`, para partir de un estado conocido.
- [ ] Decir a Alberto en dos líneas cómo está todo antes de empezar con el plan.

## 2. Plan vigente: revisión completa (pedido el 2026-10-17)

La tanda del buzón (39 puntos, 2026-10-16) está entera desplegada; su detalle
queda en `contexto.md` y en el historial. Alberto pidió después, en un solo
mensaje, una revisión completa. Se hace por bloques; cada bloque termina con
`npm run check`, commit, push y despliegue (como en la tanda del buzón).

- [x] **1. Código muerto, duplicado o simplificable.** `knip` (exportaciones y
      ficheros sin uso), `jscpd` (duplicados) y repaso a mano. Borrar o unir.
- [x] **2. Tests.** Buscar guías profesionales de qué cubrir (normal,
      imprevisible, límite; producción). Escribir `docs/tests.md` con la lista
      de comprobación. Medir cobertura, rellenar huecos. Proteger producción:
      umbral de cobertura en CI y `deploy.sh` no despliega sin tests verdes.
- [x] **3. Textos en tablas.** Los textos de la web salen de tablas por tema
      (CSV con clave, contexto, es, en, ca, eu) que son la única fuente; un
      plugin de Vite las convierte y cada idioma se carga solo si se usa.
      `docs/textos/` con la tabla legible por tema (generada, con dónde se usa
      cada clave). Comprobación en `npm run check`: claves usadas que faltan,
      claves sin uso y tabla generada al día. Regla estricta en `AGENTS.md`.
- [x] **4. Claridad del español.** Repasar los textos: frases breves, con
      sentido y bien construidas. Ajustar las traducciones que cambien.
- [x] **5. Categorías y modos.** Agrupar las pestañas: Expediente · Ayuda
      (sala de espera, tablón, terapia, pizarras) · Calendario · Datos (red,
      clústers, exámenes). Tres modos de interfaz a elegir (simplificado,
      normal, loco por los datos) con la importancia de cada elemento por
      página. `docs/interfaz.md` con el mapa, la importancia y la valoración de
      uso de cada elemento. Regla en `AGENTS.md`: cada funcionalidad nueva dice
      su categoría y en qué modo sale.
- [x] **6. Demostraciones animadas.** Revisar cómo se hacen, unificar
      criterios y dejar una plantilla (`shared/tour/`) y su guía.
- [x] **7. README.** Al día con todas las funcionalidades, las categorías y
      los modos.

Hecho además, a petición durante la revisión: tablas ordenables con cabecera
fija, apartado de trampas de Code Clicker, estado de salud ordenado y nombres
de las noticias del juego por correcciones.

- [x] **Tanda de la valoración de uso** (2026-10-22): las mejoras de la última
      columna de `docs/interfaz.md`, hechas y desplegadas. Queda abierto solo
      el grafo del tablón en móvil (en perspectiva cuesta; falta decidir con
      Alberto cómo verlo). «Endogamia» explicada el 2026-10-24; Not-games ya
      está en castellano e inglés (decisión del 22-oct).

## 2b. Plan vigente: Not-games (pedido el 2026-10-17)

Juego de preguntas de programación para aprender jugando. No se llama «juego»
en ningún sitio visible: la sección es **Not-games**. Decidido (regla de
`docs/interfaz.md`): categoría **Ayuda**, sección propia `notgames`, modo
**normal**.

Lo pedido por Alberto (literal en la conversación del 2026-10-17):
- Preguntas de programación general sacadas de lo que hay que aprender en
  cada proyecto, de lo sencillo a lo complejo, con lo conceptual básico.
- Dos tipos: rápidas (10 s) y largas (30 s o 1 min: razonar o encontrar el
  fallo en un código).
- La misma pregunta planteada de varias formas, respuestas correctas escritas
  de varias formas, incorrectas mezcladas y en orden aleatorio; reserva grande.
- Dificultad de cada pregunta según su porcentaje de fallo, reajustándose.
- Modos: duelo (más aciertos), equipo contra equipo (suma de aciertos), todos
  contra todos; versión competitiva de los tres (penaliza fallar);
  supervivencia con tres vidas hasta que quede uno.
- Según los proyectos de cada cual (no preguntar Python a quien solo hizo C):
  partida con lo que saben todos, solo conceptos genéricos, o un nivel mínimo
  para entrar.

Diseño:
- API, módulo `quiz`: banco tipado en `modules/quiz/bank/*.ts` (un concepto
  = varias formas de preguntarlo, varias respuestas buenas, muchas malas;
  `needs` = proyectos o lenguaje), salas con código, el servidor marca los
  tiempos y corrige (la web nunca recibe la buena antes de tiempo), orden de
  respuestas distinto para cada jugador, estadísticas por concepto para la
  dificultad. Migración 53.
- Web: sección `notgames`: salas abiertas del campus, crear sala, sala de
  espera con equipos, partida (pregunta, código, cuenta atrás, opciones),
  resultado de cada pregunta y clasificación final. Consulta la sala cada
  segundo mientras se juega.

Fases (cada una con check, commit, push y despliegue):
- [x] **F1. API**: banco (formato y primera tanda), elegibilidad, salas y motor
      de partida con los cinco modos, rutas y tests.
- [x] **F2. Web**: sección, salas, partida, resultados; API simulada; textos en
      su tabla; tests de pantalla.
- [x] **F3. Banco grande**: todos los proyectos del common core de los dos
      planes y lo general (git, shell, complejidad, binario…). 152 conceptos,
      528 maneras de preguntar; un test comprueba que los slugs existen.
- [x] **F4. Demostración, documentación** (`docs/api.md`, `docs/interfaz.md`,
      README) y repaso.

## 2c. Plan vigente: tanda del 2026-10-17 (tarde)

Cada bloque con check, commit, push y despliegue (sin empujar mientras un
despliegue espera a la CI).
- [x] **B1. Salir de la sala** de Not-games en cualquier momento (también
      jugando) y **sala vacía = borrada** (en el motor de la API y en el mock).
- [x] **B2. Clústeres a General**: categoría propia arriba (como Calendario).
- [x] **B3. Estadísticas** (pestaña en Ayuda): totales y por persona con
      clasificación de cada sección: sala de espera, tablón, terapia, pizarras
      y Not-games. Nuevo módulo de API `stats`.
- [ ] **B4. Ajedrez** en Not-games: varios tableros (estilos) elegibles, reloj;
      al mover, el reloj se para y sale una pregunta a los dos: el primero que
      acierta mueve (y le corre el tiempo); si fallas, mueve el rival y pierdes
      el 10 % de tu tiempo. La mecánica de turnos con pregunta, **separada y
      reutilizable** (`quiz/turns`), para más juegos de turnos.
- [ ] **B5. Demostración animada** de cada juego nuevo (ajedrez).
- [ ] **Fotos** de cada jugador en clasificaciones y marcadores (`Avatar`). Hecho en el marcador de Not-games; falta en las clasificaciones nuevas.
- [ ] **B7. Repaso** (pestaña en Not-games, de cada persona): los conceptos que
      ha fallado (de cualquier juego), con **definición y ejemplo** para
      estudiarlos. Añadir `definition` y `example` a los 152 conceptos del
      banco (test que lo exija) y guardar los fallos por persona
      (`quiz_answers` + concepto, o tabla `quiz_misses`).
- [ ] **B6. Sonidos y animaciones** en los juegos: cronómetros, pulsaciones,
      acierto/fallo.
- [x] **Buzón**: resumen dado a Alberto (13 abiertos: #42 #45 #48 #50 #65 #69
      #70 #71 #75 #76 #77 #78 #79). Esperar a que diga cuáles y cómo; #48
      (Python 06 bis en el círculo 0) es un fallo: arreglarlo.

## 2d. Plan vigente: pedido el 2026-10-18 (por orden)

- [x] **G1. Guardia: error al guardar a las 23:30** («windows.0.end: hora no
      válida»): la franja que acaba a medianoche (24:00 / 00:00). Arreglarlo en
      API y web, con test.
- [x] **G2. Guardia: elegir horas como en el calendario**: rejilla de medias
      horas por día; **arrastrar** para marcar dónde apareces, **varias franjas**
      por día. Slots de 30 min.
- [x] **C1. Calendario** (era la clase `.day` de las terapias pisando la vista de un día): con «día entero», «ajustada» o «desde ahora» en un
      solo día y poco día por delante, se ve mal: barra de desplazamiento y
      todo muy comprimido. Que ocupe bien el alto.
- [x] **B4**: ajedrez (hecho el 2026-10-18). API hecha y probada (`modules/quiz/games/`,
      `turns.rules.ts`, migración 55, 17 tests en `tests/unit/turns.test.ts`),
      **sin commit**. Falta: web (lobby con «Ajedrez», tablero con varios
      estilos de tablero, relojes, pregunta entre jugadas, coronación),
      cliente + mock, textos, test de pantalla, docs (api.md, README, interfaz).
- [x] B5 demo del ajedrez · [x] B6 sonidos (salas) y animaciones (ajedrez) ·
      [x] B7 Repaso · [x] fotos en clasificaciones y marcadores.
- [x] **Buzón** (decidido por Alberto): hacer todas hasta las medianas
      incluidas: [x] #48 (ya arreglado por la tabla de partida; test añadido), [x] #75 (pizarras de más
      cercana a más lejana y después las pasadas), [x] #76 (avisos que abren el
      evento en el calendario para apuntarse), [x] #78 (botón a la intra, en tu expediente), [x] #70
      (ficha al pasar el ratón por un login, componente único), [x] #79
      (clasificación de quién va más rápido según el pace, desde su inicio),
      [x] #71 (panel: uso por campus elegibles y usuarios totales/nuevos por día),
      [x] #77 [HECHO: módulo `facility` nuevo: tabla facility_reports (migración 57),
      POST /facility/reports, listas en /admin/facility y /staff/facility, resolver;
      Slack opcional con SLACK_WEBHOOK_URL; web: botón en Clústeres, pestaña en el
      panel y lista en la página del staff] (avisar al staff de problemas de ordenadores/edificio con opciones
      claras; Slack si hay webhook), [x] #69 (mapa de calor de clics por elemento y
      por cuadrícula normalizada móvil/ordenador).
      [x] **#65 Pomodoro** [HECHO: módulo `focus` (tabla focus, migración 59,
      GET/PUT/DELETE /me/focus); se ve en PersonCard, Peer y ocupante del mapa;
      web: temporizador flotante, ajustes en el menú de la cuenta, nav reducida a
      lo elegido, juegos y avisos silenciados salvo lo elegido; los avisos
      obligatorios de eventos siguen]: individual y llamativo; los demás ven «estoy
      concentrado, no me distraigas» (en su ficha, mapa, sala de espera…); la
      web se simplifica a lo que la persona elija ver (p. ej. avisos de
      correcciones o eventos) y silencia juegos y demás avisos; configurable.
      Descartadas: #50 y #45.
- [x] **Curso de git, fases** (diseño en `docs/curso-git.md`, investigación hecha):
      [x] GC1 motor `packages/gitsim` + tests · [x] GC2 niveles (mundos 0–5) +
      camino, animación, teoría y terminal + progreso en la API (re-ejecuta) +
      exigir puesto en el clúster · [x] GC3 preguntas de git en el banco + test
      previo (100 %, 1 h de espera) · [x] GC4 salas de grupo (remoto común,
      cada cual su repo, en paralelo; misiones sobre origin, `gh pr merge`) · [x] GC5 jefe final (4 filas y 4
      columnas, 30 min, sin ver a las demás) y pruebas de grupo con misiones por
      persona (pedido por Alberto el 2026-10-22: todas usan todos los conceptos) · [x] GC6 demostración, docs y repaso.
- [x] **#42 Curso de git** (grande, especificación de Alberto del 2026-10-18):
      - Solo desde un ordenador de un clúster (con sesión en un puesto).
      - Estética de juego: un **camino con puntos** con forma de ramas de git
        de colores, que se marcan al completarlos.
      - **Terminal simplificada** para escribir los comandos (git simulado).
      - Cada punto: 1) explicación con **animación** de la estructura de ramas
        a conseguir; 2) **teoría** del comando (uso, cuándo, para qué, cuándo
        no, cómo se ve en las ramas, qué problemas da); 3) **reto**: recrear una
        estructura de ramas y/o archivos.
      - Antes: **investigar** cursos de git y flujos asentados, sintetizar los
        conceptos, repartirlos por **niveles** (cada nivel, un punto gordo con
        pasos intermedios) y ver cómo los juegos usan el camino para enganchar.
      - Pasos que enseñan conceptos; puntos que unifican varios; unos en
        solitario y otros **en grupo en ordenadores del clúster, en paralelo**;
        cada X conceptos, **prueba de grupo**: eliges entre el mínimo de
        personas o más, y recreáis una estructura de ramas.
      - **Jefe final**: todos los conceptos; cada cual en ordenadores separados
        **al menos 4 filas y 4 columnas**, sin comunicarse y con tiempo límite.
      - Antes de cada nivel de grupo, **test de preguntas rápidas con 100 % de
        acierto**; si fallas, no se repite en **una hora** (se puede repasar).

## 2e. Plan vigente: tanda del 2026-10-22 (buzón y traducción)

Cada punto, al validarlo con tests: commit, push y despliegue (no uno gigante),
respetando el cupo de GitHub (ver `contexto.md`).

- [x] Revisar textos, preguntas (números en cifras, sin respuesta en la
      pregunta, opciones resaltadas) y traducir **solo a inglés y español**
      (no al serbio): banco de Not-games, Repaso y curso de git (niveles y
      misiones), desplegado. Las rondas se traducen al enseñarlas (`bank/localize.ts`,
      cabecera `x-lang` → `Actor.lang`).
- [x] Indulto de Code Clicker: ya no devuelve una partida más atrasada que la de
      ahora. **Lo pulsa Alberto en el panel** (filas: dstanimi #1, reiascan #6,
      ilopez-f #8 y #39, acanadil #10, dparra-s #13, acuevas #40, legomez #41,
      albrodri #38 y #42). Fuera: autoclickers (clicks), vistebel, salegari, stelescu.
- [x] #88 ajedrez: jaque sin pregunta, otra pregunta si nadie contesta (hasta 2),
      quién mueve encima del tablero. · [x] #89 repaso de la partida.
- [x] #68 cifras en las flechas de la red. · [x] #82 · [x] #86 · [x] #92.
- [x] #87 gráfica de avance (`stats/progress.*`, `GET /stats/progress`).
- [x] **#81 exámenes** (unido y desplegado el 2026-10-23): kickoff por mes y año (inicio = `begin_at` o primer
      proyecto, como en el avance), C frente a Python/Nexus lado a lado (rank 3
      con rank 3 Nexus…), todos los intentos (sin tope en 6), agujero negro por
      círculo, historial de absorbidos y de los más cercanos, total y %.
      Revisar también que salga toda la gente.
- [x] **#80 pomodoro** (unido y desplegado el 2026-10-23): pantalla completa «Enfocado, no molestar»; al salir,
      motivos y 10 s para pensarlo; estadísticas (admin y de cada cual) por
      día/hora/uso/cancelaciones/motivos, por fechas, con comparación a la media
      (doble deslizador por percentil de uso).
- [x] **#91** ventana de valorar tras una corrección de 42: hecha y desplegada,
      y **quitada** el mismo día por decisión de Alberto (solo se valora en la
      pestaña Ayuda). La migración 65 creó la tabla; la 66 la borra.

Las ramas de agentes están todas unidas; sus worktrees se borraron el 2026-10-24.
- [ ] **Cerrar y contestar** #42, 46, 48, 50, 69, 70, 71, 76, 77, 79, 83: la
      escritura remota en la base de datos está bloqueada; respuestas en el
      scratchpad `answer.mjs` o desde el panel.

## 2f. Plan vigente: revisión completa y flujo de trabajo (pedido el 2026-10-22, noche)

Alberto pidió revisar todo el código (seguridad, calidad, textos, legibilidad,
usabilidad, desacoplamiento, duplicación, generalización), analizar el flujo
de desarrollo seguro y constante, y crear skills y subagentes para lo
recurrente. Hecho el 22-23 de octubre:

- [x] Cinco revisiones de solo lectura; informes en `docs/revision-2026-10/`
      (índice y plan por tandas en su `README.md`).
- [x] Skills (`.claude/skills/`: nueva-funcionalidad, traducir, migracion,
      comprobar, revisar, desplegar, paralelo, retomar) y subagentes
      (`.claude/agents/`: implementador, traductor, probador, revisor,
      desplegador), apuntados en `AGENTS.md`. **Ojo**: los subagentes del
      repo no aparecen como tipo de agente hasta la siguiente sesión; mientras,
      se lanza `general-purpose` con la instrucción de leer su fichero.
- [x] `docs/flujo-de-trabajo.md`.
- [x] Máquina de Oracle ampliada al máximo gratis (4 OCPU, 24 GB, 200 GB).
- [x] Tanda 1 de seguridad (desplegada): motor del Clicker en
      `packages/clicker` y producción calculada en la API; `/admin/usage/heatmap`.
- [x] Tanda 2 (desplegada): barrera `/admin/` sobre la ruta descodificada; ids
      de evento a medias sin 500.
- [x] Tanda 3 (desplegada): Slack escapado, `SESSION_SECRET` ≥ 32, salas
      visibles solo para su campus o su gente.
- [x] Unidas y desplegadas (23-oct por la mañana): textos (es/en + ca/eu
      completos), operación (logger a warn + x-request-id, migración aparte
      con vuelta atrás, `ci-ok/<sha>`, `/health/db` con sha), datos
      personales (M6), y los refactors de la API (helpers de filas, `inList`,
      caché TTL, guarda de jobs, `isoAt`/`given`, regla de 42, índice y
      LIMIT en estadísticas), B4 (bloqueos cortan DMs), hooks de git y
      `check:quick` (`npm run hooks`). El estado por hallazgo está en
      `docs/revision-2026-10/README.md`.
- [x] Hecho y desplegado el 23-oct (tarde, sin agentes): B1 (documento de
      horas por `POST /events/report/csv`), B3, bajos de juegos (irse = perder,
      cerrojo del Clicker, `slugParam`, tramo del Pomodoro ≥ 5, `TourName`, tope
      de claves de uso), B6 (análisis de la red por persona), B7 (tope de
      telemetría), B8 (copias de fuera cifradas con gpg; falta crear el
      destino), B9 (`externalHref`), B10 (`paintable`), test `docs/api.md` ↔
      rutas, mínimos de cobertura de la web a 64 %, A2 + L4 (`createLate`,
      módulo `presence`, `replica.points`, ESLint en `app/`).
- [x] Base reutilizable de la web (los diez de `calidad-web.md`, rama
      `base-web`), unida y desplegada el 23-oct. M7: anonimizar (API, botón en
      Privacidad, texto legal y versión 2026-10-23).
- [x] Recorridos: asistencia, guardia, pizarra, terapia, tablón y test del
      cliente real, y el secreto de la cruz hasta Code Clicker.
- [ ] Queda: monitor externo (cuenta gratuita: Alberto),
      destino
      de las copias fuera de la máquina (bucket gratuito de Oracle + rclone +
      frase: decisión y pasos con Alberto).

## 3. A medias o por confirmar con Alberto

- ~~Intentos de examen~~: comprobado el 2026-10-22: la copia de fondo acabó el
  2026-10-17 (25 829 intentos) y siguen entrando (81 desde el 18).
- ~~Bolsa común de Code Clicker~~: quitada el 2026-10-22 (migración 63). No
  estaba dormida (9,9·10¹⁵ líneas) y cobrarla a la vez que se guardaba daba
  trampas que no lo eran.
- **Saltos de Code Clicker pendientes** en el panel (55 a 2026-10-16): los
  revisa Alberto.
- **Cifras de los límites** (se cambian desde el panel, pestaña "Consumo"): el
  tráfico de salida de Oracle está puesto a 10 TB al mes y se renueva el día 1,
  con el corte fijo al 90 % (9 TB); el tope diario o mensual de
  la app de 42 está vacío (solo cuenta la cuota horaria) porque hay que mirarlo
  en la intra.
- **Valores de los códigos de asistencia**: Alberto los dio por buenos el 2026-10-11 (ver `contexto.md`); se dejan apuntados por si cambian
  (`attendance.rules.ts`): margen de 10 min, inicio válido hasta 30 min tarde
  (o media sesión), 10 min mínimos entre códigos, fin válido hasta 30 min
  después, cinco fallos.
- En el rótulo de cuota no se dice de cuándo es cada dato, solo que es lo último
  guardado. Si se quiere la fecha exacta, `agenda_users.fetched_at` y
  `sync_state.updated_at` ya la tienen.
- ~~La cola solo deja pasar sin turno a quien administra por configuración~~:
  arreglado el 2026-10-22, también pasa quien tiene el permiso desde el panel
  (copia de `adminLogins` que se refresca como mucho cada minuto, en
  `app/composition.ts`).
- ~~El expediente ajeno en segunda persona~~: arreglado el 2026-10-22 (claves
  `health.*Other`).

## 4. Antes de la próxima limpieza de contexto

- [ ] Marcar aquí lo hecho y reescribir el apartado 2 con lo que venga después.
- [ ] Apuntar en el apartado 3 lo que quede a medias, con el fichero y el punto exacto.
- [ ] Actualizar [contexto.md](contexto.md): estado, decisiones nuevas y lo subido.
- [ ] `npm run check` y decir a Alberto qué queda sin subir.
