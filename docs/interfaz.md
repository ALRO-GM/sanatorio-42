# La interfaz: categorías, modos e importancia de cada elemento

Cómo está organizada la web, qué enseña cada modo y cómo de fácil es usar
cada parte. Es la referencia para decidir dónde va algo nuevo (ver la regla al
final y en `AGENTS.md`).

## Categorías

Arriba hay cuatro pestañas, agrupadas por para qué sirve cada cosa. Si la
categoría abierta tiene varias secciones, salen debajo en una segunda fila. Al
volver a una categoría se abre la última sección que se miró en ella.

| Categoría | Para qué | Secciones | Dónde está |
| --- | --- | --- | --- |
| **Expediente** | Lo tuyo | Expediente (la portada) | `app/sections.ts` |
| **Ayuda** | Quedar con gente: pedir y dar ayuda, aprender y enseñar | Sala de espera · Tablón · Terapia · Pizarras · Not-games · Estadísticas | |
| **Calendario** | Todo lo que tienes, en el tiempo | Calendario | |
| **Clústeres** | El plano del campus: quién está, dónde y de guardia | Clústeres | |
| **Datos** | El campus en cifras | Red · Avance · Exámenes | |

Fuera de las pestañas, a propósito:

| Qué | Dónde | Por qué |
| --- | --- | --- |
| Guardia | «De guardia», en la cabecera | Es un interruptor que se toca a diario, no una página que se visita |
| Buscador de personas, buzón, menú de la cuenta | Cabecera | Se usan desde cualquier sitio |
| Panel de gestión, incidencias, personalizar, bienvenida | Menú de la cuenta | Son de vez en cuando o solo de quien administra |
| Modo, idioma, tema, texto, daltonismo, zen, campus | Pie | Se eligen una vez |
| Privacidad, Code Clicker | Enlace del pie / secreto | No son del uso diario |

## Modos de la interfaz

Se eligen en el pie y en el segundo paso de la bienvenida
(`shared/detail.tsx`). Cada elemento dice desde qué modo sale (`from`).

| Modo | Para quién | Qué enseña |
| --- | --- | --- |
| **Simplificado** | Quien solo quiere ayuda o darla, o se pierde con tanto | Lo esencial: buscar ayuda, ofrecerse, quedar y su calendario. Sin la categoría Datos, sin rankings ni cifras |
| **Normal** | La mayoría | Toda la web con las cifras principales |
| **Loco por los datos** | Quien disfruta mirando cifras | Todo, con rankings, estadísticas y desgloses abiertos |

### Importancia de cada elemento

`S` = sale en los tres modos (esencial), `N` = desde normal, `D` = solo en el
de datos.

| Página | Elemento | Modo | Por qué |
| --- | --- | --- | --- |
| Pestañas | Expediente, Ayuda (las cuatro) y Calendario | S | Son para lo que existe la web |
| Pestañas | Datos (red, avance, exámenes) y Clústeres | N | Informan, no resuelven un atasco |
| Expediente | Nivel, títulos y XP | S | Lo primero que se ve al entrar |
| Expediente | Estado de salud (pace y black hole) | S | Afecta a la vida académica |
| Expediente | Horas validadas (descarga para el staff) | N | Se usa de tarde en tarde |
| Expediente | Desglose de la XP | N (cerrado) · D (abierto) | Detalle |
| Expediente | Tu red de correcciones, logros y reacciones, clasificación | N | Es reconocimiento, no utilidad |
| Guardia | Preevaluaciones, franjas de hoy, reservas | S | Es la guardia |
| Guardia | Personas bloqueadas | N | Uso raro |
| Sala de espera | Proyectos, quién ayuda, mapa de dónde se sienta, «solo de guardia», «a quien puedes pedir» | S | Es la sala de espera |
| Sala de espera | Filtro especialistas / pacientes, filtro de preevaluación | N | Afinar |
| Sala de espera | «Os habéis corregido N veces» | D | Curiosidad |
| Tablón | Grafo de tu avance, guía y dudas | S | Es el tablón |
| Tablón | Grafo de tus correcciones (maestro del código) | N | Reconocimiento |
| Terapia y Pizarras | Todo | S | Son quedar |
| Pestañas | Not-games | N | Aprender jugando: no hace falta para pedir ni dar ayuda |
| Not-games | Salas, crear sala, partida y marcador | N | La sección en sí |
| Not-games | Curso de git: camino, animación, teoría y terminal | N | Aprender jugando, como el resto de Not-games |
| Not-games | Curso de git: pruebas de grupo (sala, misiones, origin común) | N | Va con el curso: después del test previo de cada prueba |
| Toda la web | Aviso para quien entra desde un campus que aún no se copia (#92) | S | Se ve una vez, arriba, y se cierra: explica por qué ve datos de otro campus |
| Not-games | Repaso: lo fallado con definición y ejemplo | N | Para estudiar después de jugar |
| Not-games | Ajedrez: tablero, relojes, pregunta encima del tablero, estilos de tablero, sonido | N | Un juego más de la sección |
| Menú de la cuenta | Modo concentración (Pomodoro) | S | Para todos: concentrarse no es «de datos» |
| Pomodoro | Pantalla completa con «en concentración · no molestar» y la pregunta al acabar (motivos, diez segundos, seguir con felicitación) | S | Es el propio Pomodoro: ayuda a no rendirse a la primera (#80) |
| Pomodoro | «Tus estadísticas» (pestaña de su ventana): periodo, días, horas, paradas y motivos, y la media del tramo elegido de quienes lo usan | N | Son cifras: el simplificado no las enseña (#80) |
| Panel de gestión | Pestaña Pomodoro: uso por días y horas, paradas, motivos y tramo de gente | Admins | Solo de quien administra (#80) |
| Panel de gestión | Pestaña Piscina: quién entra y el aviso para piscineros con la piscina cerrada (`docs/piscineros.md`) | Admins | Solo de quien administra |
| Clústeres | Avisar de un problema (edificio u ordenador) | N | Al lado del plano, donde se ve el puesto |
| Pestañas | Estadísticas (en Ayuda) | N | Clasificaciones: el simplificado no enseña rankings |
| Estadísticas | Cifras del campus y clasificación de cada sección, con fotos | N | La sección en sí |
| Calendario | Vistas día/semana/mes, tipos de evento (también leyenda) | S | Básico |
| Calendario | Formas del día (lista, entera, ajustada, desde ahora) | N | Comodidad |
| Red | Grafo, filtros, totales, cómo se lee | N | La sección en sí |
| Red | Endogamia, parejas, los más estrictos, proyectos más corregidos | D | Rankings |
| Avance | Tu avance en el common core frente a la media y los paces, por círculos o por horas estimadas, y con quien te compares (#87; en Datos desde el 2026-10-25) | N | La sección en sí |
| Clústeres | Mapa, opciones de vista, resaltar | N | La sección en sí |
| Clústeres | «N de M personas tienen Sanatorio abierto» | D | Cifra |
| Exámenes | Examen en vivo y estadísticas de cada examen | N | La sección en sí |
| Exámenes | Cuánto se tarda en cada círculo | D | Estadística |
| Exámenes | Filtros de plan (C o Python), exámenes (C, Nexus o los dos) y kickoffs; un rango por fila con C y Nexus juntos (#81) | N | Es lo que se viene a mirar |
| Exámenes | Cada intento (nota mediana, aprobados, personas), plegado; en qué intento se aprueba, los 3 primeros y el resto al desplegar | D | Detalle (2026-10-25: sin tabla de kickoffs ni black hole, que no eran de fiar) |
| Pie | Modo, idioma, tema, texto, daltonismo, zen | S | Accesibilidad |
| Pie | Campus | N | Casi nadie cambia de campus |
| Pie | «Puestos actualizados hace N min» | D | Dato técnico |

Una sección que no toca en el modo elegido sigue abriéndose por su dirección
(un enlace de un aviso, por ejemplo): solo deja de salir en las pestañas.

## Valoración de uso

Cada pantalla, puntuada de 1 a 5 en tres cosas:

- **Encontrar**: se llega sin buscar (pestañas, cabecera, avisos).
- **Destino**: está claro qué hace cada botón y a dónde lleva.
- **Datos**: lo que enseña se entiende a la primera.

Revisado el 2026-10-17 sobre la demostración, en escritorio y móvil; mejoras hechas el 2026-10-22.

| Pantalla | Encontrar | Destino | Datos | Lo que funciona | Lo que mejorar |
| --- | --- | --- | --- | --- | --- |
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | — (2026-10-22: el formulario del pace dice dónde mirarlo en la intra y enlaza; el desglose de XP se abre con un botón con texto; el expediente ajeno habla en tercera persona) |
| Sala de espera | 5 | 5 | 4 | Tarjetas grandes por proyecto; quién ayuda y dónde se sienta en un paso | — (2026-10-22: «Elige un proyecto» encima de la lista, bajo la metáfora) |
| Guardia | 4 | 4 | 4 | Interruptor siempre a mano en la cabecera; «Cómo te ven ahora» explica el estado | — (2026-10-22: un solo aviso bajo las franjas; si hay una valoración pendiente, solo ese) |
| Tablón | 4 | 4 | 4 | Grafo de tu plan con marcas de dónde ayudar | El grafo en perspectiva cuesta en móvil (2026-10-22: los módulos agrupados dicen «ver sus N módulos ▸») |
| Terapia | 4 | 4 | 4 | Tarjeta con dónde, cuándo, quién y cuánto lleva cada cual | — (2026-10-22: se ven cuatro personas y «y N más»; los puestos con borde y texto del tema) |
| Pizarras | 4 | 5 | 5 | Sin día elegido salen las próximas con plaza; «Apuntarme» grande | — (arreglado: el título salía con mayúsculas en cada palabra y las flechas del mes, una encima de otra) |
| Calendario | 5 | 4 | 4 | Todo en un sitio, colores por tipo, «te quedan X para lo siguiente» | — (2026-10-22: en semana el título ocupa hasta dos líneas y los bajitos no repiten la hora; los tipos van en una fila con «Ver:» delante) |
| Red | 3 | 3 | 3 | Grafo rápido, ficha de cada persona, flechas por sentido | — (2026-10-22: en móvil el grafo va antes que los filtros; 2026-10-24: la escala de la endogamia, de 0 a 100, junto al total y la lista) |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | — (el clic central tiene su aviso bajo el plano y la ficha del puesto enlaza al expediente) |
| Exámenes | 4 | 4 | 4 | Aviso «en vivo» en la pestaña; notas al momento; demostración | — (2026-10-22: el detalle por intento, solo en el modo de datos; cada examen en vivo va con su nombre; cuentas atrás, botón de refrescar y estado de cada cual, en el mismo bloque) |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Buzón | 5 | 4 | 4 | Número rojo en la cabecera; avisos llevan a su sitio | — (2026-10-22: la pestaña de conversaciones lleva su número de sin leer) |
| Personalizar | 4 | 4 | 4 | Orden manual, por tu uso o por la comunidad | — (2026-10-22: «Ordenar o plegar estos bloques» al final de cada página con bloques) |
| Pie (ajustes) | 4 | 5 | 5 | Todo a la vista y con nombres claros | — (2026-10-22: el modo de la interfaz también está en Personalizar; además, en la bienvenida) |

Las mejoras de la última columna son el punto de partida de la siguiente
tanda; cuando se haga una, se actualiza la fila.

## Regla para una funcionalidad nueva

Antes de escribir código, se decide y se apunta aquí (y se dice en la
respuesta a quien la pidió):

1. **Categoría**: a cuál se acerca más por para qué sirve.
   - Lo tuyo (perfil, progreso, ajustes de tu cuenta) → **Expediente**.
   - Quedar, pedir o dar ayuda, aprender o enseñar con otras personas →
     **Ayuda**.
   - Algo con fecha y hora → **Calendario** (además de su sección, si la tiene).
   - Cifras, estadísticas, mapas del campus → **Datos**.
   - Si no encaja: cabecera solo si se usa desde cualquier sitio y a diario;
     menú de la cuenta si es de vez en cuando; pie si se elige una vez.
   - Una categoría nueva solo si no encaja en ninguna y tendrá varias
     secciones.
2. **Sección o bloque**: mejor un bloque en una sección que ya existe que una
   sección nueva. Una sección nueva va en `app/sections.ts` con su `category`
   y su `from`.
3. **Modo**: desde cuál sale (`from`), con la pregunta «¿lo necesita quien solo
   quiere ayuda?» → `simple`; «¿lo usa la mayoría?» → `normal`; «¿es una cifra,
   un ranking o un desglose?» → `datos`. En el código, `<Show from="…">` o el
   `from` del bloque en `shared/layout/registry.ts`.
4. **Importancia**: su fila en la tabla de arriba, con el porqué.
5. **Uso**: su fila en la valoración, con lo que se sabe al terminarla.

## Piezas comunes de la web

Antes de escribir una a mano, se usa la que ya existe en `apps/web/src/shared/`:

- **Elegir entre pocas opciones**: con 4 opciones o menos y sitio en la fila,
  pastillas (`ui/PillGroup`; `kind="tabs"` si cambian lo que hay debajo). Con
  más opciones, o dentro de un formulario, un `<select>`. Un desplegable de dos
  opciones cuesta dos clics donde dos pastillas cuestan uno.
- **Ventanas**: `ui/Modal` (se cierra con su botón, Escape y el fondo; las
  obligatorias con `cancelable={false}`). Para preguntar antes de algo que no se
  deshace, `ui/useConfirm`, nunca `window.confirm`.
- **Cargar datos**: `ui/Async` (cargando, error con reintento y vacío) o, si no
  encaja, `ErrorNote`: un fallo nunca deja la sección en blanco sin decir nada.
- **Clasificaciones**: `ui/RankingList` y `withMe` (tu fila siempre, con «tú»
  en texto). **Personas buscadas**: `ui/PeopleResults` y `usePeopleKeys`.
- **Tiempo**: `hooks/useNow` (un reloj compartido por cadencia) y `time.ts`
  (`clock`, `durationText`). **Sondeo de lo que se mira**: `hooks/usePolling`.
- **Fechas y números**: `i18n/useFormat` (o `formatsFor(lang)` fuera de un
  componente), en el idioma elegido. **Plurales**: `tn(clave, n)` con las claves
  `clave.one` y `clave.many`.
