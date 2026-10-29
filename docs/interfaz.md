# La interfaz: categorías, modos e importancia de cada elemento

Cómo está organizada la web, qué enseña cada modo y cómo de fácil es usar
cada parte. Es la referencia para decidir dónde va algo nuevo (ver la regla al
final y en `AGENTS.md`).

## Categorías

Arriba hay cuatro pestañas, agrupadas por para qué viene cada cual
(reorganización del 2026-10-29, con la teoría en el informe
https://claude.ai/artifact/GdfmhP8oaqqfc8AiwRebwM). Si la
categoría abierta tiene varias secciones, salen debajo en una segunda fila. Al
volver a una categoría se abre la última sección que se miró en ella. El orden
de fábrica es el de la tabla; cada cual puede cambiarlo en Personalizar (ver
abajo).

| Categoría | Para qué | Secciones | Dónde está |
| --- | --- | --- | --- |
| **Yo** | Lo tuyo | Expediente (la portada) · Agenda · Calendario | `app/sections.ts` |
| **Ayuda** | Pedir y dar ayuda, quedar con gente | Sala de espera · Tablón · Terapia · Pizarras · Guardia | |
| **Aprender** | Practicar y concentrarse | Curso de git · Curso de shell · Not-games · Pomodoro | |
| **Campus** | Cómo va el campus y cómo vas tú | Clústeres · Asientos · Avance · Red · Exámenes · Clasificaciones | |

Los cursos eran pestañas de Not-games (sus direcciones viejas,
`#/notgames/git` y `#/notgames/shell`, llevan a las nuevas: `useRoute.ts`), el
Pomodoro solo estaba en el menú de la cuenta (sigue ahí, y su ventanita en la
esquina) y los Asientos eran una vista de la Red.

Fuera de las pestañas, a propósito:

| Qué | Dónde | Por qué |
| --- | --- | --- |
| Interruptor «De guardia» | Cabecera | Se toca a diario; la página de la guardia está en Ayuda |
| Buscador de personas, buzón, menú de la cuenta | Cabecera | Se usan desde cualquier sitio |
| Bicho e interrogante (`docs/sugerencias.md`) | Cabecera, junto al buzón | Pedidos por Alberto: se arrastran hasta cualquier sitio; el bicho, para contar qué falla o qué mejorar; el interrogante, para ver la demostración de ese panel |
| Panel de gestión, incidencias, personalizar, bienvenida, salir | Menú de la cuenta | Solo lo de la cuenta (2026-10-29): el expediente, la guardia y el Pomodoro tienen su pestaña |
| Las cuatro categorías en el móvil | Barra fija abajo (640 px o menos), con icono y nombre | Destinos de primer nivel al alcance del pulgar; la pila de la esquina sube lo que mide la barra. Con 400 px o menos, el interruptor de la guardia va sin su palabra |
| Idioma y campus | Pie | Se eligen una vez; el idioma, donde se suele buscar |
| Modo, tema, texto, daltonismo, zen | Personalizar (pestaña Ajustes y Estilo), con «Más ajustes» en el pie | Un solo sitio para los ajustes (2026-10-29); antes estaban repetidos en el pie |
| Privacidad, Code Clicker | Enlace del pie / secreto | No son del uso diario |

## Modos de la interfaz

Se eligen en el pie y en el segundo paso de la bienvenida
(`shared/detail.tsx`). Cada elemento dice desde qué modo sale (`from`).

| Modo | Para quién | Qué enseña |
| --- | --- | --- |
| **Simplificado** | Quien solo quiere ayuda o darla, o se pierde con tanto | Lo esencial: buscar ayuda, ofrecerse, quedar y su calendario. Sin Campus ni Aprender, sin rankings ni cifras |
| **Normal** | La mayoría | Toda la web con las cifras principales |
| **Loco por los datos** | Quien disfruta mirando cifras | Todo, con rankings, estadísticas y desgloses abiertos |

### Importancia de cada elemento

`S` = sale en los tres modos (esencial), `N` = desde normal, `D` = solo en el
de datos.

| Página | Elemento | Modo | Por qué |
| --- | --- | --- | --- |
| Pestañas | Expediente, Ayuda (las cuatro) y Calendario | S | Son para lo que existe la web |
| Pestañas | Campus (clústeres, avance, red, exámenes, clasificaciones) | N | Informan, no resuelven un atasco |
| Pestañas | Agenda (en Perfil, junto a la portada): metas por proyecto con checkpoints, dailies y weeklies elegidos de listas, y lo de 42 a lo que vas (`docs/agenda.md`) | N | Es tu progreso («lo tuyo»), pero quien solo quiere pedir o dar ayuda no la necesita: como el Avance |
| Agenda | Fijar la entrega de una meta o un evento de 42 como cuenta atrás; «Cuenta atrás» y «Ver el calendario» arriba | N | Bloque de la agenda: reutiliza la ventanita de cuentas atrás, no inventa otra |
| Sprints y Agenda | Tablero del sprint: una fila por persona del grupo con entrega, %, checkpoints, último daily y atasco; en la tarjeta del grupo y enmarcado en cada meta | N | Bloque, no sección: solo lo ve quien está en el grupo, y es para ir a echar una mano |
| Expediente | Nivel, títulos y XP | S | Lo primero que se ve al entrar |
| Expediente | Estado de salud (pace y black hole) | S | Afecta a la vida académica |
| Expediente | Horas validadas (descarga para el staff) | N | Se usa de tarde en tarde |
| Expediente | Cómo se gana XP (y cuánta llevas): se abre al pulsar el número del nivel | S (cerrado) | Detalle, a un clic de donde se mira |
| Expediente | Título y banner: desplegable con el activo a la vista; cada título trae su banner, que se ve también en tu perfil público y en tu ficha | S (cerrado) | Lo tuyo, sin ocupar sitio fijo |
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
| Not-games | Curso de shell: camino por niveles, unidad (teoría, ejemplo, prueba), jefes contrarreloj | N | Aprender jugando, como el curso de git: una pestaña más de Not-games, no una sección |
| Perfil | Certificados del curso de shell (jefes finales superados), en la tarjeta del perfil | S | Lo ganado se enseña donde está el resto de lo tuyo; si no hay ninguno, no ocupa nada |
| Toda la web | Aviso para quien entra desde un campus que aún no se copia (#92) | S | Se ve una vez, arriba, y se cierra: explica por qué ve datos de otro campus |
| Not-games | Repaso: lo fallado con definición y ejemplo | N | Para estudiar después de jugar |
| Not-games | Ajedrez: tablero, relojes, pregunta encima del tablero, estilos de tablero, sonido | N | Un juego más de la sección |
| Menú de la cuenta | Modo concentración (Pomodoro) | S | Para todos: concentrarse no es «de datos» |
| Pomodoro | Pantalla completa con «en concentración · no molestar» y la pregunta al acabar (motivos, diez segundos, seguir con felicitación) | S | Es el propio Pomodoro: ayuda a no rendirse a la primera (#80) |
| Pomodoro | «Tus estadísticas» (pestaña de su ventana): periodo, días, horas, paradas y motivos, y la media del tramo elegido de quienes lo usan | N | Son cifras: el simplificado no las enseña (#80) |
| Pomodoro | «Startup» (pestaña de su ventana): con los minutos de concentración se construye una empresa, del garaje al control global, con ranking; y la escena en pequeño en la pantalla completa (`docs/pomodoro-startup.md`) | N | Es un juego de motivación con cifras: desde el normal, como las estadísticas (pedido por Alberto, 2026-10-27) |
| Panel de gestión | Pestaña Pomodoro: uso por días y horas, paradas, motivos y tramo de gente | Admins | Solo de quien administra (#80) |
| Panel de gestión | Pestaña Piscina: quién entra y el aviso para piscineros con la piscina cerrada (`docs/piscineros.md`) | Admins | Solo de quien administra |
| Panel de gestión | Pestaña Piscina: «Ver como piscinero» y, mientras dura, la franja fija de arriba con «Volver» (`docs/piscineros.md`) | Admins | Bloque de la pestaña Piscina, no una sección: es para comprobar lo que se ha marcado |
| Panel de gestión | Pestaña Personas ocultas: buscar a alguien de cualquier grupo, ocultarlo a estudiantes, piscineros o los dos, con motivo, y la lista con quién y cuándo (`docs/personas-ocultas.md`) | Admins | Pestaña propia y no bloque de Piscina: vale también para estudiantes |
| Toda la web | Ventanita de cuentas atrás, en la pila de la esquina: avisos de quien administra y lo fijado; se arrastra, se reordena, se saca a flotar y se pliega (`docs/avisos-cuenta-atras.md`) | S | Como el Pomodoro: un aviso importante (las taquillas) lo tiene que ver todo el mundo. En el móvil empieza plegada |
| Toda la web | Pila de la esquina (`shared/dock`): las ventanitas flotantes (cuenta atrás, Pomodoro, Code Clicker) en una lista abajo a la izquierda, cada una en su hueco; ver «Ventanitas de la esquina» | S | Pedida por Alberto (2026-10-25): se tapaban entre sí y con la página |
| Calendario | «Cuenta atrás» en la barra (próximo compromiso o una propia) y «Fijar cuenta atrás» en la ficha de cada evento | S | Bloque de Calendario, no sección nueva: lo que se fija sale de ahí |
| Panel de gestión | Pestaña Cuentas atrás: la limpieza de taquillas (solo día y hora) u otro aviso, a un grupo y campus, y cuánta gente lo ha cerrado | Admins | Pestaña propia, al lado de Comunicados: no pide contestar |
| Panel de gestión | Pestaña Mantenimiento: ponerlo y quitarlo, mensaje y hora prevista; mientras dura, franja arriba para quien administra y pantalla «No disponible» con cuenta atrás para el resto (`docs/mantenimiento.md`) | Admins | La pantalla del resto no es una sección: sustituye a toda la web |
| Clústeres | Avisar de un problema (edificio u ordenador) | N | Al lado del plano, donde se ve el puesto |
| Cabecera | Burbuja de sugerencias: se arrastra hasta un sitio (o se pulsa), panel con dónde, el problema y tu propuesta; va al buzón de incidencias como mejora con el sitio (`docs/sugerencias.md`) | S | Contar que algo no se entiende es justo para quien se pierde; pequeña y sin abrir nada hasta que se usa |
| Pestañas | Estadísticas (en Ayuda) | N | Clasificaciones: el simplificado no enseña rankings |
| Estadísticas | Cifras del campus y clasificación de cada sección, con fotos | N | La sección en sí |
| Calendario | Vistas día/semana/mes, tipos de evento (también leyenda) | S | Básico |
| Calendario | Formas del día (lista, entera, ajustada, desde ahora) | N | Comodidad |
| Red | Grafo, filtros, totales, cómo se lee | N | La sección en sí |
| Red y Asientos | Vistas según cuánta gente se mira (`docs/red-vistas.md`): su red en anillos con alguien elegido, matriz por grupos hasta 150 personas, cuerdas entre grupos con más; el grafo de siempre, en todas | N | Pedido por Alberto (2026-10-29): el grafo de fuerzas se vuelve una maraña con mucha gente y no enseña bien a una persona |
| Red, Asientos y Clasificaciones | Primera capa (2026-10-29), una frase arriba: en la Red, cuántas correcciones has hecho y recibido y con cuánta gente; en Asientos, con quién te sueles sentar y cuánto pasas sin nadie cerca; en Clasificaciones, tu mejor puesto | N | Datos rápidos: lo que se viene a mirar, sin leer el grafo ni las listas |
| Red | Endogamia, parejas, los más estrictos, proyectos más corregidos | D | Rankings |
| Red | Asientos: mapa de calor de los puestos bajo el grafo (horas por ordenador, con el plano de cada cual y «Ver como tabla»; `docs/asientos.md`) | N | Bloque de la red de asientos, pedido por Alberto (2026-10-25): el mismo periodo y las mismas horas que el grafo |
| Avance | Tu avance en el common core frente a las medias y los paces, por círculos o por horas estimadas, y con hasta 5 personas (#87; en Datos desde el 2026-10-25). Plan, población (terminado, en curso + terminado, black hole: `docs/blackhole.md`) y campus (por defecto el tuyo; uno, varios o todos, cada uno en su línea, y todos juntos) se encienden a la vez, una línea por combinación. Periodo: los primeros 1–24 meses, todo o del mes X al Y | N | La sección en sí |
| Avance | Tres capas (2026-10-29): la respuesta en una frase arriba («Vas N semanas por delante de la media de tu campus», en verde; por detrás, en ámbar; `progressAnswer.ts`), la gráfica con lo básico a la derecha (medida, plan, periodo, paces) y «Ver a fondo» plegado con quién cuenta, campus y comparar con personas (abierto de fábrica en el modo de datos) | N | Datos rápidos para quien tiene prisa y a fondo para quien quiere más, sin depender del modo |
| Avance | Hitos de cada persona (un punto por día con algo aprobado, y sus proyectos en la ficha) y, de quien terminó, el tramo del 100 % resaltado con un trofeo el día exacto (`docs/blackhole.md`) | N | Pedido por Alberto (2026-10-25): leer la línea de alguien sin abrir su perfil |
| Perfil | «Compararte en Avance» en tu estado de salud: abre el Avance con tu plan, quien sigue y quien se tragó el black hole de tu campus, los paces y tu línea (`progressHref`) | N | Pedido por Alberto (2026-10-25): el estado de salud dice cómo vas; el Avance, frente a quién |
| Avance | De un piscinero: la piscina en vez del common core, lo aprobado de Shell 00 … C 13 por día de piscina frente a la media de su piscina (nada de otras piscinas), y hasta 5 piscineros; sin plan, pace, black hole ni horas (`docs/piscineros.md`) | N | Pedido por Alberto (2026-10-26): el avance de un piscinero es la piscina |
| Tablón | De un piscinero: el grafo de la piscina (azul claro shell, azul oscuro C y, aparte, rushes, BSQ y exámenes) en vez del common core | S | Pedido por Alberto (2026-10-26): es su grafo |
| Avance | «Los más rápidos» (dentro de comparar): quien terminó antes, de tu campus y el primero de cada campus, para añadirlo con un clic | N | Es la misma comparación, para quien no tiene a nadie en mente |
| Avance | Quién va más rápido (bloque bajo la gráfica, antes en Ayuda → Estadísticas): por círculo o %, con plan, kickoff y rangos; tu fila fija | N | Ranking, pero del curso: es lo que se viene a mirar al Avance |
| Clústeres | Mapa, opciones de vista, resaltar | N | La sección en sí |
| Clústeres | Tamaño del plano: «Ajustar» (de fábrica) o «100 %», solo si el clúster no cabe a lo ancho; ajustado, con caras, iniciales o puntos según el sitio (`features/map/fit.ts`, `docs/asientos.md`, «Clústeres grandes») | N | Pedido por Alberto (2026-10-26) al ver París: los clústeres gigantes había que deslizarlos de lado. Va en la fila de los resaltados, a la derecha; también al elegir puestos de un sprint |
| Clústeres | «N de M personas tienen Sanatorio abierto» | D | Cifra |
| Exámenes | Examen en vivo y estadísticas de cada examen | N | La sección en sí |
| Exámenes | En vivo, solo quien ha entrado (apuntarse no es estar; antes de empezar, toda la gente apuntada), ordenados por una barra con la nota de hoy sobre 100: azul mientras siguen dentro (vacía con un brillo hasta que 42 da la nota, al cerrar), verde o roja al aprobar o suspender; la nota de hoy grande y la mejor que han sacado, pequeña en la esquina | N | Pedido por Alberto (2026-10-29): ver de un vistazo cómo va cada cual |
| Exámenes | Último examen acabado (de las dos últimas semanas), bajo el siguiente, con los resultados de quien entró, sus barras y la mejor nota; se quita mientras hay otro en marcha | N | Pedido por Alberto (2026-10-29): que no desaparezca al acabar, para que los amigos lo revisen |
| Exámenes | Cuánto se tarda en cada círculo | D | Estadística |
| Exámenes | Filtros de plan (C o Python), exámenes (C, Nexus o los dos) y kickoffs; un rango por fila con C y Nexus juntos (#81) | N | Es lo que se viene a mirar |
| Exámenes | Cada intento (nota mediana, aprobados, personas), plegado; en qué intento se aprueba, los 3 primeros y el resto al desplegar | D | Detalle (2026-10-25: sin tabla de kickoffs ni black hole, que no eran de fiar) |
| Pie | Idioma y «Más ajustes» (abre Personalizar: modo, tema, texto, daltonismo, zen) | S | Accesibilidad |
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
| Red | 3 | 3 | 3 | Grafo rápido, ficha de cada persona, flechas por sentido | — (2026-10-22: en móvil el grafo va antes que los filtros; 2026-10-24: la escala de la endogamia, de 0 a 100, junto al total y la lista; 2026-10-26: «Personas, como mucho» llega a 1 500, sin «sin límite», y bajo el grafo se dice que se ven las más activas, también en Asientos) |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | — (el clic central tiene su aviso bajo el plano y la ficha del puesto enlaza al expediente) |
| Exámenes | 4 | 4 | 4 | Aviso «en vivo» en la pestaña; notas al momento; demostración | — (2026-10-22: el detalle por intento, solo en el modo de datos; cada examen en vivo va con su nombre; cuentas atrás, botón de refrescar y estado de cada cual, en el mismo bloque) |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Buzón | 5 | 4 | 4 | Número rojo en la cabecera; avisos llevan a su sitio | — (2026-10-22: la pestaña de conversaciones lleva su número de sin leer) |
| Personalizar | 4 | 5 | 4 | Un estudio: la web en pequeño que se ordena arrastrando, y el estilo, el orden y los ajustes al lado (2026-10-25) | Probar con gente si se descubre el asa sin la línea de ayuda |
| Agenda | 4 | 4 | 4 | Todo se elige de listas; los checkpoints de fábrica salen del tipo de proyecto; el sprint se ve enmarcado (2026-10-25, recién hecha) | Probarla con gente: ¿faltan atascos o checkpoints en las listas? |
| Sugerencias (burbuja) | 4 | 4 | 5 | Se ve qué se señala al arrastrar; el panel dice dónde y separa problema y propuesta (2026-10-25, recién hecha) | Probar con gente si se entiende que se arrastra sin la ayuda del título |
| Pie (ajustes) | 4 | 5 | 5 | Todo a la vista y con nombres claros | — (2026-10-22: el modo de la interfaz también está en Personalizar; además, en la bienvenida) |

Las mejoras de la última columna son el punto de partida de la siguiente
tanda; cuando se haga una, se actualiza la fila.

## Personalizar: el estudio

Desde el menú de la cuenta («Personalizar la web») o desde «Ordenar o plegar
estos bloques», al final de cada página con bloques, se abre una sola ventana,
algo menor que la página (`app/studio/`). Todo se guarda al momento y la web de
detrás cambia a la vez; «Listo» solo cierra.

- **A la izquierda, la web en pequeño** (`Miniature.tsx`): la fila de
  categorías, la de pestañas de la abierta y los bloques de la página elegida,
  como tarjetas con su nombre (el de los idiomas) y unas rayas grises por
  cuerpo. No pinta las páginas de verdad. Se entra en cada categoría y pestaña
  tocándola; el on-call, desde su botón, como en la cabecera. Salen todas las
  categorías, pestañas y páginas con bloques registradas (`registry.ts`,
  `app/sections.ts`), también las que el modo de la interfaz esconde ahora.
- **Arrastrar** (`shared/layout/sortable.ts`): todo lo que se mueve tiene un asa
  (los puntos, icono `agarrar`). Con el dedo se coge por el asa, que no deja
  deslizar la página; con el ratón, también por el resto. Una copia flotante
  sigue al puntero y los demás se apartan con una animación corta. Al coger un
  bloque, todos se pliegan en barras de una línea; al soltar se guarda y se
  despliegan. El perfil (la portada) va siempre el primero de su fila de
  pestañas y no tiene asa.
- **Con el teclado**: en el asa, Espacio o Intro lo cogen, las flechas lo
  mueven, Espacio o Intro lo sueltan y Escape lo devuelve a su sitio sin cerrar
  la ventana. Cada paso se anuncia en una región viva.
- **Plegar**: la flecha de cada tarjeta de bloque.
- **A la derecha, las opciones**, en tres pestañas:
  - *Estilo*: una tarjeta por estilo con su muestra (cabecera, tarjeta y botón
    con sus colores, letra y esquinas); las paletas del elegido, como muestras
    redondas iguales en todos los estilos (el nombre, al pasar y en la
    leyenda); el tema (como el sistema, claro, nocturno), y con qué estilo ven
    los demás tu perfil. Un estilo se aplica a toda la página: limitarlo a la
    vista previa obligaría a duplicar cada hoja de estilos.
  - *Orden*: quién decide el orden (a mano, tu uso, la comunidad) y volver al
    orden de fábrica. Si se ordena solo y mueves algo, pasa a «a mano»
    guardando lo que se veía, para que nada salte de sitio.
  - *Ajustes*: el modo de la interfaz, cuánto antes avisar de un evento, los
    iconos de información, el idioma, el tamaño del texto, daltonismo y zen.
- **Móvil**: a pantalla completa, con las opciones arriba y la vista previa
  debajo.

Las categorías no se ordenan solas por uso: el perfil va el primero salvo que
la persona lo mueva a mano (se puede, decidido con Alberto el 2026-10-25) (`categories` en `shared/layout/store.ts`).

## Regla para una funcionalidad nueva

Antes de escribir código, se decide y se apunta aquí (y se dice en la
respuesta a quien la pidió):

1. **Categoría**: a cuál se acerca más por para qué sirve.
   - Lo tuyo (perfil, progreso, agenda, calendario) → **Yo**.
   - Pedir o dar ayuda, quedar con otras personas → **Ayuda**.
   - Practicar, cursos, juegos de preguntas, concentrarse → **Aprender**.
   - Cifras, estadísticas, mapas del campus → **Campus**.
   - Algo con fecha y hora sale además en el calendario.
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
- **Periodo o escalón** (meses, días, «más o menos de algo» en orden):
  `ui/StepPicker`. En escritorio, un `<select>` nativo y compacto; en el móvil
  (640 px o menos), una rueda que se desliza arriba y abajo (`role="spinbutton"`,
  con flechas, `Home` y `End`, y sin animación con movimiento reducido). Es el
  mismo en toda la web: Avance, Red, Asientos (los días), las cifras del
  Pomodoro y las pestañas del panel con periodo. Lo que solo tiene dos opciones («este mes» / «siempre»)
  sigue en pastillas; el capital de Code Clicker también, porque sus tramos
  conviven con fechas a mano y a veces no hay ninguno elegido.
- **Deslizadores** (un tramo o un número en una escala): `ui/RangeSlider`, con
  dos tiradores, o `Slider`, con uno; nunca un `<input type="range">` suelto.
  Lo pidió Alberto (2026-10-26) porque los de antes temblaban y saltaban
  valores. Cómo es:
  - **Cualquier valor de su rejilla** (`min`, `max`, `step`; los porcentajes,
    de uno en uno), no solo los que hay en los datos: esos se pasan en `ticks`
    y salen como marcas. Para recuentos en los que unos pocos valores enormes
    se comerían la barra, `curve="log"` (Red → proyectos).
  - **Ajuste fino**: mientras se arrastra, al alejar el puntero o el dedo de la
    barra (en vertical) se mueve más despacio, en proporción inversa a la
    distancia (a partir de 32 px, hasta ocho veces), y sigue el movimiento
    desde donde empezó a afinar, sin saltar a donde está el puntero. Un aviso
    sobre la barra dice cómo afinar y, afinando, cuánto («Ajuste fino ×4»).
  - **Imán**: se pega a los valores redondos (0, 5, 10… 25, 50, 75, 100 en
    porcentajes) al pasar cerca, sin comerse a sus vecinos; y un valor no se
    deja hasta pasar algo más de medio paso, para que un pulso en la frontera
    no salte entre dos números.
  - **Valor a la vista y a mano**: cada tirador enseña su valor encima; al
    pulsarlo (o con Intro desde el tirador) se escribe el exacto.
  - **Teclado**: flechas ±1 paso, Mayúsculas o Re Pág/Av Pág ±10, Inicio y Fin.
    `role="slider"` con sus `aria-value*` y nombre; los tiradores no se cruzan
    (`minGap`).
  - **Quieto mientras se arrastra**: lo que se enseña no depende de lo que
    llegue de la API hasta soltar, ni cambian sus topes. Si cada cambio
    pregunta a la API, `commit="release"` avisa solo al soltar. El texto que lo
    acompaña va encima o debajo, nunca al lado: si al lado cambiara de ancho
    («9 %» → «14 %»), movería la barra bajo el puntero y el tirador temblaría.
    Sin animaciones con movimiento reducido.
  - Lo que elige un escalón de una lista corta y fija (la velocidad de las
    demos, el mínimo de «Quién suspende más») sigue con un `range` nativo sobre
    el índice: ahí no hay valores intermedios que afinar.
- **Gráficas con opciones**: la gráfica a la izquierda y sus opciones en un
  panel a la derecha (como Red y Avance: `.net-layout`/`.net-rail`,
  `.progress-layout`/`.progress-rail`). La gráfica se queda quieta a la vista
  (`position: sticky`) y, si el panel no cabe, se desplaza él solo: al cambiar
  una opción se ve el efecto sin subir ni bajar. Nada de filas de botones encima
  de la gráfica. En el móvil, la gráfica primero y las opciones debajo,
  compactas. Pedido por Alberto (2026-10-25).
- **Ventanas**: `ui/Modal` (se cierra con su botón, Escape y el fondo; las
  obligatorias con `cancelable={false}`). Para preguntar antes de algo que no se
  deshace, `ui/useConfirm`, nunca `window.confirm`.
- **Cargar datos**: `ui/Async` (cargando, error con reintento y vacío) o, si no
  encaja, `ErrorNote`: un fallo nunca deja la sección en blanco sin decir nada.
- **Clasificaciones**: `ui/RankingList` y `withMe` (tu fila siempre, con «tú»
  en texto). **Personas buscadas**: `ui/PeopleResults` y `usePeopleKeys`.
- **Tiempo**: `hooks/useNow` (un reloj compartido por cadencia) y `time.ts`
  (`clock`, `durationText`). **Sondeo de lo que se mira**: `hooks/usePolling`.
- **Ventanitas flotantes**: `dock/DockItem` (ver «Ventanitas de la esquina»),
  nunca un `position: fixed` propio en una esquina.
- **Fechas y números**: `i18n/useFormat` (o `formatsFor(lang)` fuera de un
  componente), en el idioma elegido. **Plurales**: `tn(clave, n)` con las claves
  `clave.one` y `clave.many`.

## Ventanitas de la esquina

Pedido por Alberto el 2026-10-25: las ventanitas flotantes se tapaban entre
sí (la cuenta atrás desplegada, encima del Pomodoro) y con la página. Ahora
las coloca un gestor común, `shared/dock`: cada una se apunta con
`<DockItem id title size foldedSize>` y el gestor le da un hueco.

| Ventanita | Dónde | En la pila |
| --- | --- | --- |
| Cuenta atrás | `features/countdowns/CountdownDock.tsx` | Sí. No ocupa sitio sin nada que contar ni con la vista de cuentas atrás del calendario abierta |
| Pomodoro | `features/focus/FocusTimer.tsx` | Sí, concentrado y en el descanso. A pantalla completa sale de la pila. El «¡bien hecho!» va en su hueco |
| Code Clicker | `features/clicker/Mini.tsx` | Sí, fuera del juego. Concentrado no sale (es un juego) |
| Etiqueta de la demostración (`/demo/`) | `app/DemoBadge.tsx` | Sí: estaba en la misma esquina y tapaba la pila. Se pliega con su propio botón |
| Avisos de eventos, comunicados, mantenimiento | Ventanas (`ui/Modal`) | No: son ventanas que hay que contestar, no flotan |
| Burbuja de sugerencias y su panel | `features/suggest` | No: vive en la cabecera y el panel sale junto a lo señalado |
| Avisos de un momento (`meet-toast`, logros y fichas de Code Clicker, ficha de un puesto o de una persona) | Cada funcionalidad | No: duran unos segundos o siguen al ratón |
| Franja de «ver como piscinero» | `app/PoolPreviewBar.tsx` | No: es una franja de arriba a abajo, no una ventanita |

Cómo funciona:

- **La pila** sale de la esquina de abajo a la izquierda (donde ya estaban la
  cuenta atrás y Code Clicker) y es una lista: cada ventanita encima de la
  anterior, sin pisarse. En el móvil (hasta 640 px) son filas de píldoras:
  las que caben van una al lado de otra, y ahí empiezan plegadas.
- **Cambiar el orden**: se arrastra por el asa (los seis puntos) o por su
  cabecera. Mientras se arrastra, las demás se apartan para dejarle el hueco
  (con animación, salvo con «reducir movimiento»). Con el teclado, en el asa:
  Espacio la coge, las flechas la mueven (arriba o derecha, lejos de la
  esquina), Espacio la suelta y Escape lo deshace; un lector de pantalla oye
  cada paso.
- **Sacarla de la pila**: soltada lejos de cualquier hueco, flota donde se
  deja. La chincheta («Volver a la esquina») la devuelve a su sitio de antes.
- **Plegar**: cada una tiene su botón; plegada, su hueco encoge. Se pueden
  plegar todas.
- **Nada queda debajo**: la pila dice cuánto mide (`--dock-room`) y la página
  deja ese espacio al final, para poder subir lo último por encima.
- Se recuerda en el navegador (`sanatorio_dock`): el orden (también de las que
  ahora no se ven, para que vuelvan a su sitio), dónde flota cada una y cuáles
  están plegadas. Lo guardado con mala forma se ignora.
