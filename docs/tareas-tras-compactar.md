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

Última puesta al día: 2026-10-22. En producción desde el 2026-10-11.

## 1. Arranque (siempre, en cada sesión nueva)

- [ ] Leer [contexto.md](contexto.md) entero.
- [ ] Reintentos de Oracle: mirar el registro y relanzar el proceso si ha muerto.

  ```sh
  tail -3 ~/.local/share/sanatorio-oracle/oracle-retry.log
  pgrep -af 'retry.sh' || (cd ~/.local/share/sanatorio-oracle && setsid nohup bash ./retry.sh > /dev/null 2>&1 < /dev/null &)
  ```

  Si la última línea dice `Listo. La máquina está en: <IP>`: avisar a Alberto
  para que ponga esa IP en DuckDNS y hacer el despliegue (pasos en `contexto.md`)
  **antes** que cualquier otra tarea de esta lista.

- [ ] Volver a poner el vigilante en segundo plano (la orden exacta está en
      `contexto.md`, "Tareas recurrentes"). Avisa cuando Oracle dé la máquina.
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
      columna de `docs/interfaz.md`, hechas y desplegadas. Quedan abiertas solo
      las que dicen sin «—»: grafo del tablón en móvil, «endogamia» en la Red y
      las preguntas de Not-games en otros idiomas (el banco está en castellano).

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

## 3. A medias o por confirmar con Alberto

- ~~Intentos de examen~~: comprobado el 2026-10-22: la copia de fondo acabó el
  2026-10-17 (25 829 intentos) y siguen entrando (81 desde el 18).
- **Bolsa común de Code Clicker**: con la política nueva ya no se llena y su
  placa no sale. Preguntar a Alberto si se quita del todo (`loot.ts`,
  `clicker_pool`, `POST /clicker/pool/claim`).
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
