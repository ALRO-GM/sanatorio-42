# Histórico de funcionalidades retiradas

Lo que se llegó a construir y se quitó o se sustituyó: qué hacía, por qué se
fue, qué la reemplaza y dónde volver a verla. Pedido por Alberto
(2026-11-01) para no perder el contexto: una idea que no cuajó puede no estar
madura todavía y merecer otra vuelta.

**Cómo volver a verla.** «Último con ella» es el commit justo anterior al que
la quitó (`git rev-parse <retirada>^`): ahí el código está entero.

```sh
git show <último>:<ruta>                 # leer un fichero tal como estaba
git switch --detach <último>             # o el repositorio entero, sin rama
npm ci && npm run dev:mock               # y verla funcionando con la API de mentira
git switch main                          # volver
```

**Cómo se mantiene.** Cada commit que retira algo lo apunta aquí, en su área,
con el mismo formato (regla en `AGENTS.md`, «Documentación al día»). Lo que
cambia de sitio o de aspecto sin perder lo que hace no entra.

Formato: _introducida_ → _retirada_ → **último con ella**.

## Red y Amigos

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Matriz persona × persona y el selector de vistas | Hasta 150 personas ordenadas por grupo: los grupos cerrados salían como bloques en la diagonal | Pedido por Alberto; con ella se fue la última vista alternativa: ninguna convenció ([red-vistas.md](red-vistas.md)) | Solo el grafo de fuerzas | `b5402b3` 2026-10-30 → `83c4fa5` 2026-10-30 → **`4dd8039`** | `apps/web/src/features/network/GraphViews.tsx`, `NetworkPage.tsx`, `SeatsPage.tsx` |
| «Su red» en anillos (`EgoRings`) | La red de una persona en anillos: más cerca y más gruesa, más unión | No convencía: con alguien elegido, el grafo ya agranda a quien más se une | Radios relativos a la persona elegida (`radiiAround`) | `b5402b3` → `f7b6e7d` 2026-10-30 → **`88c3dc2`** | `features/network/GraphViews.tsx` |
| Cuerdas entre grupos (`Chords`) | Diagrama de cuerdas entre los 10 grupos mayores, con más de 150 personas | No convencían | El grafo; desde `58e5c60`, solo las uniones más fuertes | `b5402b3` → `88c3dc2` 2026-10-30 → **`08f272c`** | `features/network/GraphViews.tsx` |
| Asientos como vista de la Red (`RedPage`) | Interruptor Correcciones \| Asientos dentro de la pestaña Red | Reorganización por tareas: lo que estaba a tres o cuatro niveles sube | Pestaña propia en Campus, luego «Amigos» | `39e6055` 2026-10-25 → `26313ab` 2026-10-29 → **`46ed511`** | `apps/web/src/features/network/RedPage.tsx` |
| Burbujas de Asientos por horas | El área de cada burbuja eran las horas en el clúster | Pedido por Alberto: «ya no son las horas» | La fuerza de sus uniones a la vista | `39e6055` → `e48e77c` 2026-10-29 → **`acdcd57`** | `features/network/SeatsPage.tsx` (`toNode`) |
| Dos flechas paralelas por pareja | Con alguien elegido, una pareja mutua pintaba dos flechas (turquesa y naranja) | Las cifras se pisaban | Una línea partida por la mitad, un color por mitad | `601b891` 2026-10-16 → `dc4b704` 2026-10-25 → **`4778b5a`** | `features/network/ForceGraph.tsx` |
| Mapa de calor sobre el plano del clúster | Las horas de cada puesto, pintadas con las piezas del propio plano | No consta | Rejillas planas en miniatura por clúster, de azul oscuro a rojo (hoy en Clústeres) | `2e972a2` 2026-10-25 → `03b086e` 2026-10-25 → **`5313876`** | `apps/web/src/features/map/SeatHeatMap.tsx` |
| Grafo vacío con las opciones del último | Si los filtros no dejaban a nadie, quedaban los campus, proyectos y meses del último grafo con gente | Con el grafo vacío no quedaba nada a mano | Vuelta sola a la vista de partida, con aviso | `c452aab` 2026-10-25 → `1de7a32` 2026-11-01 → **`c11521b`** | `features/network/NetworkPage.tsx` |

## Ayuda, asistencia y correcciones

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Segundo código de asistencia (el de fin) | XP y tiempo solo con un código al empezar y otro al terminar | El segundo costaba conseguirlo y lo que se premia es venir | Un solo código, válido desde 10 min antes hasta el final; cuenta hasta la hora de fin. Los de fin viejos se siguen aceptando | `caecf00` 2026-10-11 (obligatorio para la XP en `f2443e5`) → `c11521b` 2026-11-01 → **`58e5c60`** | `apps/api/src/modules/attendance/attendance.service.ts`, `attendance.rules.ts`, `apps/web/src/features/calendar/Attendance.tsx` |
| Valorar tras una corrección de 42 (#91) | Tras corregir o ser corregido, una ventana preguntaba cuánto se entendió; iba a reacciones, «Cómo llegas» y `UnderstoodCard` | Valorar solo se hace en Ayuda, como antes. La migración 66 borra la tabla de la 65 | Nada | `09997f0` 2026-10-22 → `8a389a1` 2026-10-22 → **`1df3349`** | `apps/web/src/features/network/CorrectionGate.tsx`, `apps/api/src/modules/network/feedback.service.ts`, `apps/web/src/features/profile/UnderstoodCard.tsx` |
| «No asistido» automático | Sin respuesta en media hora a un aviso de evento (también correcciones), se marcaba como no asistido | Solo señalaba a quien no tenía la web abierta (43 casos en producción) | Solo un recordatorio antes; la migración 35 borra esas marcas | `ebd2ae7` 2026-10-11 → `8c1845c` 2026-10-16 → **`2f0f6b4`** | `apps/api/src/modules/meet/meet.service.ts` |
| Comprobar la ayuda por los puestos | La XP de una sesión pedía que las dos personas estuvieran sentadas en el campus en esa franja | No consta, más allá del cambio | Los códigos de asistencia | `d0865ee` 2026-10-11 → `f2443e5` 2026-10-11 → **`9607be6`** | `apps/api/src/modules/help/help.service.ts` |
| Borrado automático de lo viejo | Mensajes de chat a los 90 días y registro de códigos al año (`purge()`) | Se decidió que no se borra nada por viejo | Borrado a mano en Gestión › Limpiar datos | `3d6a18a` 2026-10-11 → `c2ea770` 2026-10-12 → **`65b165e`** | `apps/api/src/modules/meet/meet.service.ts`, `attendance/attendance.service.ts`, `notices/notices.service.ts` |
| Conversaciones dentro de Clústeres y `GET /chats` | Los chats directos vivían en la sección de clústeres | No consta, más allá de «dejan de vivir en los clústers» | Pestaña Conversaciones del buzón y `GET /conversations` | `07ee0e2` 2026-10-12 → `7c24fd1` (API) y `22570a3` 2026-10-13 (web) → **`49ddb22`** (API) / **`7c24fd1`** (web) | `apps/web/src/features/map/ClustersPage.tsx` |
| Medallas de «Mis correcciones» | Una medalla por proyecto según las veces corregido (1, 3, 5, 10) | No consta | El álbum de correcciones: cromos, rarezas y clasificaciones | `af7fd87` 2026-10-17 → `b2f9073` 2026-11-01 → **`cc9fc44`** | `apps/web/src/features/doubts/CorrectionGraph.tsx`, `corrections.ts` |

## Code Clicker

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Bolsa común | Lo confiscado por trampas iba a una bolsa que se cobraba como placa (10 commits de suerte) | Dejó de llenarse el 2026-10-16; cobrarla al guardar borraba `pool_bonus` y daba falsas trampas de «rate» (migración 63) | El reparto a quien no hace trampas | `6b84343` 2026-10-16 → `6f1bbbe` 2026-10-22 → **`7a2f979`** | `apps/web/src/features/clicker/loot.ts`, `apps/api/src/modules/clicker/clicker.service.ts`, `cheat.rules.ts` |
| Primera política antitrampas | Venta forzosa al 50 % solo desde la tercera trampa; luego, confiscar los edificios sin devolver nada | Pedido por Alberto | En cada trampa, vuelta a la última partida buena, venta al 50 % y lo mismo repartido entre quien juega limpio (migración 46) | `c2ea770` 2026-10-12 / `6b84343` → `d4fa377` 2026-10-16 → **`c0f2163`** | `apps/api/src/modules/clicker/clicker.service.ts` |
| Puerta a los 100 clics y logro de 50 | La cruz abría el juego a los 100 clics, con logros a 1, 10 y 50 | No consta | 42 clics, logros a 21 y 42; el de 50 pasó a «Beta tester» (ya no se consigue) | `0fade72` 2026-10-12 → `9deb68d` 2026-10-16 → **`1b72bc8`** | `apps/web/src/features/clicker/EasterEgg.tsx`, `data.ts` |

## Pomodoro y Startup

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Escena plana en SVG de la Startup | La oficina y las cartas dibujadas en SVG con microanimaciones | No consta | Motor isométrico en píxeles (hoy, la oficina viva) | `437ccea` 2026-10-27 → `225664c` 2026-10-28 → **`3370a21`** | `apps/web/src/features/focus/startup/StartupScene.tsx`, `startup/art/Building.tsx`, `startup/art/Person.tsx` |
| Pomodoro como ventana (`FocusDialog`) | El Pomodoro, con «Tus estadísticas», era una ventana del menú de la cuenta | Reorganización por tareas | Página propia en Aprender (`FocusPage`); en el menú volvió como atajo en `88c3dc2` | `460dc9c` 2026-10-18 → `291592c` 2026-10-29 → **`26313ab`** | `apps/web/src/features/focus/FocusDialog.tsx` |
| Duraciones fijas de 25, 50 y 90 min | Tres botones de duración | No consta | Rueda de 5 en 5 minutos hasta 240 | `460dc9c` → `03cecb3` 2026-10-27 → **`ff5956b`** | `features/focus/FocusDialog.tsx` |

## Navegación y móvil

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Desplegable de pestañas en el móvil | En el teléfono, las pestañas eran un `<select>` | No consta | Las pestañas deslizables de antes | `592639c` 2026-10-17 → `ee919c5` 2026-10-17 → **`be4a94f`** | `apps/web/src/app/Nav.tsx`, `styles/layout.css` |
| Categorías Expediente / Ayuda / Calendario / Datos (y Clústeres aparte) | La primera agrupación de pestañas, que sustituyó a 8 pestañas planas | Informe de arquitectura: agrupar por lo que se viene a hacer | Yo / Ayuda / Aprender / Campus | `e7ff4f6` 2026-10-17 → `46ed511` 2026-10-29 → **`22cb544`** | `apps/web/src/app/sections.ts` |
| Ajustes en el pie | Modo, tema, tamaño de texto, daltonismo y zen en el pie | Un solo sitio para los ajustes: estaban repetidos | Personalizar; el pie solo guarda idioma y campus | `592639c` / `e7ff4f6` → `58ab059` 2026-10-29 → **`ce05d63`** | `apps/web/src/app/Footer.tsx`, `shared/ui/DetailSelect.tsx` |
| Personalizar como lista con flechas | Ordenar con flechas en una lista; los temas de VS Code en un desplegable | No consta | El estudio con la web en miniatura para arrastrar, y tarjetas de estilos | `caecf00` 2026-10-11 → `4577f32` 2026-10-25 → **`a179ff6`** | `apps/web/src/shared/layout/LayoutSettings.tsx` |

## Exámenes, Avance y cursos

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Black hole y kickoffs comparadas en Exámenes | Absorbidos por círculo, por mes, recientes y más cercanos; tabla de kickoffs | La fecha de black hole que da 42 no es de fiar | Nada | `e5bc751` 2026-10-22 (#81) → `4778b5a` 2026-10-25 → **`57721b0`** | `apps/web/src/features/exams/ExamStatsPanel.tsx`, `apps/api/src/modules/exams/exams.rules.ts` |
| Nota en vivo de quien sigue en el examen | Se leía de `teams_uploads` | Comprobado en producción: 42 no da nota hasta cerrar el intento; gastaba cuota en balde | «Nota al cerrar» | `22eb0be` 2026-10-22 → `16d9b7a` 2026-10-22 → **`22eb0be`** | `apps/api/src/modules/exams/exams.live.ts`, `integrations/forty-two/client.ts` |
| Examen en vivo con toda la gente apuntada | Listaba a quien se había apuntado | Alberto: «apuntarse no es estar» | Solo quien ha entrado, con barra de progreso | `4cedf62` 2026-10-22 → `7e63591` 2026-10-29 → **`f9c048a`** | `apps/web/src/features/exams/ExamsPage.tsx` |
| Avance de la piscina frente a piscinas anteriores | La media de las piscinas del campus de los últimos 3 años, y su gente | Solo consta el título: «solo con la propia piscina» | Solo tu propia piscina | `5d6919a` 2026-10-26 → `aa62835` 2026-10-26 → **`5d6919a`** | `apps/api/src/modules/stats/piscine.service.ts` |
| Opción de plan «Los dos» en Avance | Juntaba los dos planes en una opción | No consta | Botones independientes, una línea por combinación | `a530a74` 2026-10-22 → `28aa8b1` 2026-10-25 → **`a179ff6`** | `apps/web/src/features/stats/ProgressPage.tsx` |
| Terminal del curso de git apagada sin puesto | Sin sentarse en el clúster no se podía escribir en la terminal | No se podía ni hacer el primer commit (#86) | Se practica en cualquier sitio; el punto solo cuenta desde un puesto | `ec58e81` 2026-10-18 → `d3b47d5` 2026-10-22 → **`3b9a8b0`** | `apps/web/src/features/gitcourse/LevelView.tsx` |

## Infraestructura

| Funcionalidad | Qué hacía | Por qué se quitó | La sustituye | Commits | Ficheros |
| --- | --- | --- | --- | --- | --- |
| Topes diarios y mensuales de la cuota de 42 | Repartían la cuota por día y por mes | 42 solo tiene 1 200 por hora (se renuevan a la hora en punto) y 2 por segundo | Topes por hora, por función y por persona (`api_usage`, migración 81) | `f2443e5` 2026-10-11 → `907f793` 2026-10-27 → **`e0825ce`** | `apps/api/src/modules/replica/quota.ts`, `apps/web/src/features/admin/QuotaCard.tsx` |

## Ideas descartadas sin código

- **Franjas para corregir de 42**: enseñar las franjas que cada quien abre para
  corregir. Haría falta el permiso `projects` y un token por persona, que la
  aplicación no pide ([contexto.md](contexto.md)).

## Notas

- `8a389a1` y `03b086e` tienen como primer padre un merge (`1df3349`,
  `5313876`): ese merge es el «último con ella».
- La matriz, los anillos y las cuerdas llegaron juntos en `b5402b3` y se
  fueron por orden: cuerdas (`88c3dc2`), anillos (`f7b6e7d`) y matriz
  (`83c4fa5`).
- Reunido el 2026-11-01 repasando los 490 commits (asunto y cuerpo), los
  ficheros borrados y los docs de contexto; cada «último con ella» se
  comprobó con `git rev-parse`.
