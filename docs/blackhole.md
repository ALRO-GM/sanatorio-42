# Quién se tragó el black hole

Pedido por Alberto (2026-10-25): en Datos → Avance, las medias de C y de Python
salían manchadas por la gente a la que se tragó el black hole y nunca terminó.
Ahora la media se elige por población y por plan (C o Python, cada uno en su
línea):

1. **Terminado**: quien completó el common core, en C o en Python.
2. **En curso + terminado** (por defecto): quien sigue sin que se lo haya
   tragado el black hole, más quien terminó.
3. **Blackhole**: quien de verdad se fue sin terminar, hasta el día en que salió.

La misma regla quita a quien se fue de la clasificación de quién va más rápido
(que también está en el Avance).

## La regla

Código: `apps/api/src/modules/stats/blackhole.rules.ts` (`coreStatusOf`, sin base
ni red, con sus tests en `tests/unit/blackhole.test.ts`). De cada persona,
con su 42cursus (`cursus_users` del cursus 21):

| Estado | Cuándo |
|---|---|
| `finished` | `grade` es `Transcender`, `Alumni` o `Member` (el nombre antiguo), o `alumni?` es verdadero, **y** tiene aprobados ft_transcendence y el examen 6 (`exam-rank-06` o `42next-exam-rank-06`). Con el grado sin las dos, `unknown` (abajo). |
| `blackholed` | Tiene `end_at`, hace **30 días o más**, y la cuenta está cerrada (`active?` falso). Y no se ha apuntado a nada ni ha movido un proyecto abierto más de 30 días después de `end_at`. |
| `active` | Sin `end_at`, cuenta activa, y la fecha de black hole es futura (o no hay) **o** ha hecho algo en los últimos **120 días**. |
| `unknown` | Todo lo demás: sin copia del cursus; `end_at` reciente; `end_at` con la cuenta abierta; cuenta cerrada sin `end_at`; fecha de black hole pasada y nada hecho en 120 días (congelaciones, días extra sin moverse). |

`unknown` no entra en ninguna media ni en la clasificación; la web dice cuántas
personas son.

«Hacer algo» es apuntarse a un proyecto (`created_at` de `projects_users`) o
que cambie uno que no está aprobado. Cuándo cambió uno aprobado **no** vale:
42 retoca filas aprobadas en lote años después (ver abajo).

## Por qué así: lo que dicen los datos

Comprobado el 2026-10-25 con la base de producción (solo lectura) y 5 páginas
de `GET /v2/cursus/21/cursus_users?filter[campus_id]=22` (Madrid; 7 peticiones
en total con los tokens y una página vacía), cruzadas con la réplica:

- **La fecha de black hole no basta.** Madrid tiene 2 598 personas en el
  42cursus y 1 759 con la fecha ya pasada hace un mes. En una página de esas
  (kickoffs de 2024), **17 de 100** seguían con la cuenta activa, sin `end_at`,
  y con proyectos abiertos y movimiento en octubre de 2026 (días extra, el
  sistema nuevo de pace). Contar la fecha vencida habría dado por absorbida a
  gente que sigue.
- **Lo que 42 hace al echar a alguien es fiable.** De las 311 personas
  `Cadet` con `end_at` de la muestra, las 311 tenían `active?` falso, y en la
  réplica las 311 constaban como inactivas (`users.active = 0`). Ninguna `Cadet`
  con `end_at` tenía la cuenta abierta (solo dos cuentas de staff).
- **`end_at` y la fecha de black hole casi coinciden**: mediana 1 día de
  diferencia (de −190 a +380). 206 salieron en su fecha o después (días extra
  que no bastaron) y **105 más de una semana antes** (se fueron por su cuenta,
  traslados fuera de 42, expulsiones). Las dos cosas son «se fue sin
  terminar»: las dos van en `blackholed`.
- **Actividad después de salir**: 44 de las 311 tienen filas de proyectos
  cambiadas más de 30 días después de `end_at`, pero son proyectos **aprobados**
  tocados en lote por 42 (las mismas horas exactas, p. ej. el 2025-03-12 a las
  10:03:26, el 2023-08-17 y el 2023-08-08). Solo una se apuntó a algo después:
  esa queda en `unknown`.
- **Terminado**: el grado lo dice sin ambigüedad. En los kickoffs de 2019 (una
  página), 15 `Transcender` y 25 `Alumni` (`alumni?` verdadero, con la cuenta
  abierta o cerrada) junto a 55 `Cadet` con `end_at`.
- **Cuenta cerrada sin `end_at`** (4 de la muestra): unos con la fecha futura y
  proyectos de hace días, otros sin moverse en meses. No se puede decir nada:
  `unknown`.
- `alumnized_at`, `anonymize_date` y `data_erasure_date` vienen en la persona,
  pero no dicen nada nuevo (la de anonimizar va tres años por delante de la
  última conexión, siga o no).

Con la regla, la muestra (495 estudiantes de Madrid) queda así:

| | Terminado | En curso | Blackhole | No se sabe |
|---|---|---|---|---|
| C | 48 | 74 | 290 | 16 |
| Python | 0 | 47 | 18 | 2 |

Y una aproximación para todo Madrid hecha solo con la réplica (2 554 personas
con Libft; terminado = ft_transcendence aprobado, blackhole = `users.active` a
0): C 326 terminados, 309 en curso y 1 610 fuera; Python 2, 239 y 68. Las
cifras de verdad salen de `core_cursus` en cuanto corre la copia (la web enseña
cuánta gente hay en cada media y cuánta queda sin saber).

## De dónde salen los datos y lo que cuesta

La réplica no tenía el grado ni `end_at` de nadie (solo la fecha de black hole
de quien entra en la web, 247 personas, que además no es de fiar). Se añadió:

- Tabla `core_cursus` (migración 77): `user_id`, `login`, `campus_id`,
  `begin_at`, `end_at`, `blackholed_at`, `grade`, `active`, `alumni`.
- `replica/core-cursus.ts`: `GET /v2/cursus/21/cursus_users?filter[campus_id]=…`
  de 100 en 100, un campus por vuelta, **una vez al día por campus**, de fondo y
  solo con cuota (`background`, página a página). Madrid son 26 páginas; los
  cuatro campus copiados, unas **70 peticiones al día** de las 1 200 por hora.
  Ni una petición por persona.
- De paso da el inicio (`begin_at`) de todo el mundo, no solo de quien entra en
  la web: el kickoff y el día 0 del avance son los de verdad.

## Cómo se usa

- Medias: por sitio (`ProgressArea`: cada campus pedido en `campuses[]` y
  todos juntos en `all`), `averages[medida][población][plan]` y su gente en
  `people[población][plan]`; `census[plan][estado]` cuenta a todos.
  La línea de quien se tragó el black hole acaba el día de su `end_at`: después
  no avanza y bajaría la media sin decir nada.
- Con menos de 10 personas (`minPeople`) no hay media: `individuals` trae la
  línea de cada una (sin nombre en `blackholed`) y la web las pinta sueltas.
- La gráfica (pedido de Alberto del 2026-10-25): plan, quién cuenta y campus
  son botones que se encienden a la vez; cada combinación es una línea (ver
  abajo). Por defecto, tu campus: el de tu 42cursus, no el que miras en la web
  (antes salía el de tus preferencias, y quien tenía París elegido veía París).
  Desde el 2026-10-26 se elige uno, varios o todos los campus que sigue la web,
  cada uno en su línea para compararlos (`CampusPicker`, el de la Red: espera
  2 s tras el último clic antes de pedirlos), y aparte «Todos los campus
  juntos», una sola línea. Te comparas con hasta 5 personas, y «Los más rápidos» sugiere a
  quien terminó antes (`GET /stats/progress/fastest`).

## La gráfica: varias líneas a la vez

`apps/web/src/features/stats/progressSeries.ts`. Cada combinación encendida de
plan × quién cuenta × campus (y todos juntos) es una línea, y se distinguen sin
fiarlo todo al color. Con un solo campus:

| | Qué dice | Cómo |
|---|---|---|
| Color | El plan | C azul, Python violeta (con daltonismo, los de Okabe e Ito) |
| Trazo | Quién cuenta | En curso + terminado continuo; terminado a rayas; black hole a puntos |
| Grosor | El campus o todos | El campus grueso y opaco; todos juntos fino y medio transparente |
| Punto al final | Una persona, no una media | La misma línea, más fina |

Con varios campus, para compararlos, el color pasa a ser el campus (siempre el
mismo para cada uno, por su sitio en la lista: azul, naranja, verde, violeta,
rosa, lima; todos juntos en gris) y, si van los dos planes, el grosor dice el
plan (C grueso, Python fino). El trazo sigue diciendo quién cuenta, y el
nombre del campus va en la leyenda, la ficha y la tabla. La nota bajo la
leyenda cambia con la manera de leerla.

Tú vas en el acento y cada persona con quien te comparas en su color (oro,
naranja, verde, rosa, lima), con su login escrito en la línea. La leyenda
nombra cada línea («C · Terminado · Madrid (93)», «Python · Terminado:
login»), como la ficha al pasar y la tabla. Más de 10 líneas de medias a la vez
no se pintan: se avisa para que quites alguna opción.

**Percentiles 25 y 75** (pedido por Alberto el 2026-10-31): la casilla «Ver
percentiles 25 y 75» (apagada de entrada) pone bajo cada media un tramo tenue
de su color entre los dos, la mitad central de la gente; la ficha al pasar
dice «(P25 … · P75 …)» y la leyenda explica el tramo. Salen de la API
(`ProgressArea.quartiles`), con la misma regla que la media: `null` donde hay
menos de 10 personas. Para no guardar la línea de cada cual, al hacer la foto
cada punto de cada media lleva un histograma de 101 casillas (0 … 100 %) que
se crea con el primer dato y se tira al acabar; el percentil va al % entero.

El eje del tiempo se elige con «Periodo», el selector de toda la web
(`PeriodPicker`, 2026-10-26): el primer mes, los primeros 3, 6, 12 o 24 meses
(por defecto 24), «Todo», hasta el último dato (la API alarga las líneas hasta
quien más tiempo lleva, cada 30 días pasados los dos años), o «Meses…», a
mano: del mes X al Y desde el inicio de cada cual (el eje es el tiempo desde
que empezó cada persona, no fechas de calendario). Con un tramo que no empieza
en 0, el eje empieza en su primer mes, las líneas entran recortadas por el
borde izquierdo y el ratón y el teclado solo van por lo de dentro. Las marcas
de meses van cada 1, 2, 3, 6 o 12 según lo que abarque; un pace más largo que
el periodo se corta en el borde. La elección se guarda en el navegador
(`sanatorio_progress_range` y, los meses a mano, `sanatorio_progress_months`);
lo guardado de antes (8, 15, 18, 22 meses) cae en el siguiente que hay (12 o
24), y lo mismo el `range` de un enlace (`progressHref`).

## Quién terminó Python (2026-10-25)

Alberto creía que alguien había terminado el common core de Python y no salía
la línea «Python · Terminado». Mirado en producción (solo lectura):

- **Sí hay dos**: `smarin-s` (Madrid, kickoff 2026-01-12: ft_transcendence el
  2026-07-22 y el examen 6 nuevo el 2026-08-06, unos 7 meses) y `dmena-li`
  (Barcelona, kickoff 2025-09-22, examen 6 el 2026-08-31, unos 11 meses).
  Las dos con grado `Transcender`, todos los módulos de Python, a-maze-ing,
  codexion, fly-in, call-me-maybe, pac-man, rag-against-the-machine,
  ft_transcendence y el `42next-exam-rank-06`. La regla del grado basta.
- **No salía por el mínimo**: una media necesita 10 personas en cada punto, y
  eran 1 en Madrid y 4 en todos los campus (2 de verdad y 2 mal puestas en
  Python). Ahora, por debajo de 10, va la línea de cada persona.
- **Dos de C salían en Python**: el plan de quien no tiene `user_tracks` se
  adivinaba con «tiene algo `42next-`», y desde el cambio los exámenes
  `42next-exam-rank-0x` los hace todo el mundo. Un traslado `Transcender` con
  solo el examen 6 nuevo (aprobado el día de su `begin_at`) y otro con el
  examen 2 nuevo contaban como Python terminado. Ahora decide la mayoría de
  pistas sin contar los exámenes (en Madrid, una `Alumni` de 2019 que luego
  hizo call-me-maybe sigue en C).
- **Gente que entra**: toda la del 42cursus copiado, no solo quien usa
  Peer4U: Madrid 2 598 en `core_cursus`, 2 558 en `users` y 2 557 con
  proyectos (las 40 que faltan no están en la réplica de usuarios). París se
  quedaba en 8 000 filas justas: el tope de 80 páginas de la copia lo cortaba;
  sube a 250. De París solo hay proyectos de quien entra en la web (campus a
  demanda), así que sus medias no son de fiar.

Cifras con la regla (`core_cursus` de 2026-10-25; plan como lo calcula el
avance):

| Campus | Plan | Terminado | En curso | Blackhole | No se sabe |
|---|---|---|---|---|---|
| Madrid | C | 305 | 278 | 1 598 | 113 |
| Madrid | Python | 1 | 224 | 30 | 49 |
| Barcelona | C | 237 | 151 | 925 | 28 |
| Barcelona | Python | 1 | 93 | 27 | 16 |
| Málaga | C | 166 | 148 | 1 075 | 51 |
| Málaga | Python | 0 | 122 | 3 | 25 |
| Urduliz | C | 108 | 68 | 392 | 22 |
| Urduliz | Python | 0 | 45 | 8 | 7 |
| París (cortado) | C | 5 651 | 624 | 1 327 | 398 |

«Los más rápidos» mide de `begin_at` del 42cursus al último aprobado del
último círculo del plan, y solo sugiere a quien tiene al menos la mitad del
plan aprobado en la réplica: un traslado parecería terminar en días.
- Clasificación (`GET /stats/ranking`): solo `active` y `finished` del campus.
- Detalle en `docs/api.md` (Avance).

## La medida por círculos: cada línea cae en las rayas (2026-10-26)

Alberto vio que, midiendo por círculos, las líneas de la gente no coincidían
con las rayas de los círculos del eje: terminar Libft (el primer salto) tiene
que caer justo en «Círculo 0», y terminar todos los proyectos de un círculo,
justo en su raya.

**La regla** (`progress.rules.ts`): el eje tiene marcas fijas, Inicio = 0 y
Círculo k = (k + 1) / 7 (`circleMarks`: 14,3, 28,6, 42,9, 57,1, 71,4, 85,7,
100). Toda línea (la tuya, con quien te comparas, las sueltas, las de quien
terminó con su propio juego y, por tanto, las medias) pesa cada círculo
exactamente 1/7, y las casillas de un círculo se reparten ese 1/7 a partes
iguales: las del plan para quien sigue o se fue, las suyas (`ownUnits`) para
quien terminó. Completar los círculos 0…k deja la línea justo en la marca k.
Los paces por círculos pasan por las mismas marcas.

**Decisiones**:

- **Un círculo sin casillas** en el juego de alguien (un plan viejo, un
  traslado) se da por hecho con el siguiente que tenga: su 1/7 pasa a ese, y
  completar ese círculo cae en su marca (pasa por la del que falta sin
  pararse). Si no hay ninguno después, con el anterior. Antes, el peso era 1 /
  (círculos presentes): con 6, el círculo 0 caía en el 16,7 % y no en el 14,3.
- **Cada versión, en su círculo** (`moved`, `adopted`): en el plan de Python,
  la versión de C de un proyecto cuenta en el círculo que tiene en C. Quien
  empezó en C y pasó a Python hizo Born2beroot (la de C) en el círculo 1 y la
  push_swap de C en el 2, al revés que el plan de Python (42next-push_swap en el
  1, 42next-born2beroot en el 2). Lo que aún no ha hecho va donde iba en su
  plan de antes si ya hizo alguna de esas versiones. En C no se hace al revés:
  nadie de C ha hecho una versión `42next-` de esas.
- **Libft, como tarde cuando se apuntó a lo siguiente** (`settled`): nadie se
  apunta a ft_printf sin Libft. 42 reescribió en lote el `updated_at` de Libft
  el 2023-08-08 (638 filas en Madrid, sin `created_at`), y la línea de esa
  gente empezaba por ft_printf o get_next_line (un escalón de 4,8 %) y no por
  Libft. Ahora Libft cuenta cuando se apuntó al primer proyecto de otro
  círculo o, si no se sabe, un día antes de aprobarlo. Una fila de Libft que
  sí dice cuándo se apuntó, y es después (lo repitió), se queda como está.
- **Escalones en la web** (`stepped`, `progressTrace.ts`): las líneas de una
  persona (la tuya, con quien te comparas y las sueltas) se dibujan con los
  días exactos de sus hitos y en escalones: se quedan en su valor y suben de
  golpe el día que aprobó. El escalón de completar un círculo cae en su raya
  ese día, sin la rampa desde el punto de 15 días anterior. Las medias siguen
  cada 15 días y en rampa.
- Lo que no cambia: por horas, igual que antes; quien terminó acaba en el
  100 % el día que terminó; las piscinas y lo que no es del plan no entran (las
  filas solo son de proyectos del plan y de ft_transcendence y el examen 6).
  `upTo` con «lo más corto» solo vale ya para las horas.

**Medido en producción** (solo lectura; Madrid entero, 1 877 líneas de C y 321
de Python; las fechas de rango son las de `user_tracks` de quien entra en la
web, en C solo kickoffs desde 2024, que antes 42 puso los rangos a posteriori;
«por debajo»: su línea, al día siguiente de validar el rango k, aún no llega a
la marca k):

| | Antes | Ahora |
|---|---|---|
| C: el primer salto no es Libft | 599 (32 %) | 6 |
| C: el primer salto no cae en «Círculo 0» | 582 | 6 |
| Python: el primer salto no cae en «Círculo 0» | 3 | 0 |
| Python: por debajo al validar el rango 1 | 19 de 71 | 3 |
| C: por debajo al validar el rango 0 / 1 / 2 | 6 / 11 / 13 de 68 | 3 / 9 / 12 |
| Quien terminó, con su juego sin algún círculo (C) | 5, fuera de las marcas (3 con 6 círculos: el 0 en el 16,7 %) | en las marcas |
| Quien terminó y acaba en el 100 % | 308 de 308 | 308 de 308 |

Ejemplos: cdonaire, jvizcain y acaire-d (Python, kickoff 2025-09-29)
validaron el rango 1 con la Born2beroot de C y sin push_swap; su línea se
quedaba en el 24,8 % y no en la raya del 28,6. Ahora cae en ella. dabel-co y
lvarela (C, terminaron) tenían Libft el día 856 y el 1 374 (la reescritura de
2023): su línea empezaba en el 4,8 % y tenía un salto del 14,3 % años después.
Ahora Libft va el día 26 y el 134, el primero. dmena-li (Python) tenía Libft
el día 75, después de Born2beroot y ft_printf; ahora, el 41.

**Lo que queda, y por qué**:

- **RAG against the machine es del círculo 4** (con el examen 4, NetPractice
  y Pac-Man): ahí se hace. Los datos lo enseñaban más tarde (de las 5 personas
  con el rango 4, 4 lo validaron sin RAG) porque mucha gente lo entrega después
  del examen 4. La tabla de partida de `curriculum.ts` fija los círculos 4 a 6
  de Python: 4 = examen 4, NetPractice, Pac-Man y RAG; 5 = examen 5, Inception,
  The Answer Protocol y Agent Smith; 6 = examen 6 y ft_transcendence.
- En Python, 2 de 18 validaron el rango 3 sin Fly-in o sin Call Me Maybe (los
  aprobaron después), 3 de 41 el 2 sin el módulo 10 y 1 de 3 el 5 sin Agent
  Smith. Puede que 42 pida solo parte del círculo; con tan pocos casos, se deja.
- `updated_at_42` es el último cambio de la fila, no el primer aprobado: quien
  repite un proyecto (Born2beroot, so_long) o lo vio corregido otra vez lo
  tiene más tarde, y su línea llega a la raya de ese círculo ese día, después
  de validar el rango. Solo se corrige Libft, que siempre va primero; en otros
  círculos los planes viejos tenían los proyectos en otro sitio (miniRT era
  del 2) y no se puede deducir.
- Las medias no caen en las rayas (son medias), y van cada 15 días.

## Horas del common core

Cada cual se mide sobre su propio plan: de cada hueco cuentan las horas de la
versión que hizo (la vieja o la de `42next-`, o el proyecto que eligió de un
grupo como so_long/FdF/fract-ol); de lo que no ha hecho, las del más corto. Con
lo más corto de cada hueco (horas que da 42 en `projects.hours`; los exámenes
casi no tienen):

| Círculo | C (clásico) | Python (nuevo) |
|---|---|---|
| 0 | 70 | 70 |
| 1 | 160 | 160 |
| 2 | 163 | 173 |
| 3 | 280 | 280 |
| 4 | 400 | 350 |
| 5 | 468 | 403 |
| 6 | 245 | 0 |
| **Total** | **1 786 h** | **1 436 h** |

El de Python está incompleto: del círculo 4 en adelante el plan nuevo se
aprende de los votos de quien llega (pocos aún) y del 6 solo se conoce el
examen. Con la push_swap nueva (70 h en vez de 50), una persona típica de
Python suma 1 456 h. Las ~2 000 h que calculaba Alberto se acercan, pero de
cada grupo a elegir cuenta uno solo (pipex o minitalk, cub3d o miniRT, ft_irc o
webserv) y casi ningún examen tiene horas en 42; los proyectos de un mismo
grupo pesan casi lo mismo, así que elegir uno u otro apenas mueve el total.

El eje del Avance por horas va en horas del plan de quien mira; cada línea va en
% de su propio plan, así que con los dos planes cada línea es correcta aunque
los totales difieran.

## Terminar pide ft_transcendence y el examen 6 (2026-10-25)

Alberto vio que la media «Terminado» subía y no pasaba del círculo 5. Quien
terminó tiene que haber llegado arriba: ft_transcendence y el examen del
círculo 6 son imprescindibles. Mirado en producción (solo lectura):

**Quién tiene el grado sin las dos pruebas** (fuera de París), y qué se hace:

| Caso | Personas | Qué es | Queda |
|---|---|---|---|
| `Alumni` de 2017-2018 (y uno de 2020) sin ft_transcendence ni examen 6 | Madrid 3 (mrodrigu, tholzheu, sraccah), Barcelona 4 (jagarcia, thdelmas, ydemange, crfernan) | Plan de antes de 2020 (fillit, lem_in, corewar, wolf3d…): terminaron otro common core | `unknown` |
| Con el examen 6, sin ft_transcendence | Barcelona 2 (abambi, tmeizo; kickoff 2020, ft_services y ft_containers) | Plan de 2020: ni rastro de transcendence en la réplica | `unknown` |
| Cuentas de pruebas o de staff | Madrid madridqa, madridqa2, sultan; Barcelona qa-bcn, fletcher, oktorok; Málaga tmalaga, totodile | 1 a 31 proyectos, grado puesto a mano | `unknown` |
| París | 5 862 de 6 057 | La réplica de París solo tiene proyectos de quien entra en la web | `unknown` |

Ninguno pasa a `active`: no siguen en este common core, y en una media lo
bajarían todo. Python no cambia: smarin-s y dmena-li tienen las dos.

| Campus | Plan | Terminado antes | Terminado ahora |
|---|---|---|---|
| Madrid | C | 305 | 299 |
| Madrid | Python | 1 | 1 |
| Barcelona | C | 237 | 228 |
| Barcelona | Python | 1 | 1 |
| Málaga | C | 166 | 164 |
| Urduliz | C | 108 | 108 |
| París | C | 6 056 | 195 |

(Plan como lo deduce el Avance; París, cortado.)

**Por qué la media no pasaba del círculo 5** (Madrid C: como mucho 84,4 %,
y el círculo 5 acaba en el 85,7 %):

1. Cada cual se medía contra el plan de hoy. Quien terminó en 2021-2023 hizo
   ft_server, ft_services, libasm o ft_containers, y no tiene NetPractice, el
   CPP 09 o la versión nueva de un proyecto: se quedaba en el 80-95 %.
2. La línea de cada cual acaba hoy. Los últimos días de la curva solo tenían a
   quien empezó hace más tiempo (planes viejos, menos %): Barcelona bajaba del
   89,3 % al 56,5 % al final.
3. El grado sin las pruebas (arriba): gente al 0-30 % dentro de la media.

**Ahora** (`progress.rules.ts`, `ownUnits`; `progress.service.ts`):

- Quien terminó se mide contra **lo que hizo hasta terminar**: las casillas
  que tenía aprobadas el día que terminó (`finishedOn`: lo último que aprobó
  del último círculo del plan; sin nada de él, lo último aprobado). Por
  círculos, cada círculo pesa 1/7 (ver «La medida por círculos»); por horas, sus horas sobre
  las de lo que hizo. Su línea llega al 100 % ese día, de las dos maneras, y
  ahí se queda. Lo que hizo después (un proyecto suelto años más tarde) no la
  mueve. Quien sigue o se fue se mide contra el plan, como antes.
- En la media «Terminado», quien ya terminó cuenta como 100 % los días que aún
  no ha vivido: si no, el final de la curva era de unos pocos.
- Lo aprobado que se está repitiendo (`validated` con nota, aunque el estado
  no sea `finished`) cuenta como aprobado: a smarin-s le faltaba agent-smith
  (98, `searching_a_group`), que fue lo que le validó el rango 5.

Con los datos de producción (C, campus copiados salvo París):

| | Antes: máximo | Antes: al final | Ahora: al final |
|---|---|---|---|
| Madrid | 84,4 % | 80,7 % | 100 % |
| Barcelona | 89,3 % | 56,5 % | 100 % |
| Málaga | 94,9 % | 94,2 % | 100 % |
| Urduliz | 94,7 % | 93,7 % | 100 % |

Por horas, igual: cada línea acaba en su 100 % (las horas de lo que hizo) y
el eje sigue en las horas de quien mira, sin reescalar (Alberto lo prefiere
así aunque una media acabe un poco por debajo de arriba).

### smarin-s y dmena-li

- **smarin-s** salía con 96,4 % por círculos y 94 % por horas: agent-smith
  (círculo 5 del plan de Python, aprendido de un solo voto) tenía nota 98 y
  `validated`, pero estado `searching_a_group` (se volvió a apuntar), y no
  contaba. Con lo que hizo hasta terminar (el examen 6 del 2026-08-06), 100 %;
  sus horas son 1 701.
- **dmena-li** ya llegaba al 100 % con el plan de hoy. Las 1 456 h eran las de
  un plan sin ft_transcendence (antes del último arreglo, 1 701 − 245), y la
  ficha enseñaba las horas del plan (o del eje), no las suyas. Ahora cada línea
  lleva sus horas (`hours`): 1 681 h, lo que hizo.

## Hitos de cada línea

Cada línea de una persona (la tuya, con quien te comparas y las sueltas de una
media con poca gente) trae `milestones`: un `{ day, projects, value }` por día
en que aprobó algo que mueve su línea, con el nombre de cada proyecto y el %
en que queda. La web pone un punto en cada uno y, al pasar o con el teclado,
los nombra en la ficha, y dibuja la línea en escalones por esos días (ver «La
medida por círculos»). Las medias no llevan. Las de quien se tragó el black
hole también, sin login: los proyectos solos no dicen quién es, y su línea ya
se veía. Quien no se ve (mundos separados, ocultos) no sale, como su línea.

Tamaño (`GET /stats/progress`, sin comprimir / con gzip, que pone Caddy): con
medias de 10 o más, tu línea y cinco personas, 28 KB / 1,9 KB (13 KB / 1,2 KB
sin hitos); si todas las medias son de personas sueltas (un campus casi vacío),
hasta 100 KB / 2,5 KB.

## Límites

- La copia es de los campus copiados (`trackedCampusIds`). Quien vino de otro
  campus y no está en su 42cursus copiado queda `unknown`.
- El estado se recalcula con el avance (cada 30 minutos, todos los campus a la vez) y la copia
  es diaria: quien sale hoy tarda hasta 30 días (el margen) en contar como
  absorbido.
- Quien se fue por su cuenta antes de su fecha cuenta como «blackhole»: los
  datos no distinguen el motivo.
