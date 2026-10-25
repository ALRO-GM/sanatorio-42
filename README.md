# Peer4U

> **Antes se llamaba Sanatorio 42.** En octubre de 2026 dejó la temática de
> hospital por una de programación: Sala de espera → Peer to peer, Tablón →
> Proyectos, Expediente → Perfil, Terapia de grupo → Sprints, Guardia →
> On-call (con «De guardia» → «Disponible»), Especialista → Senior,
> Eminencia → Guru y Paciente como tú → Peer como tú. Las rutas (`#/consulta`,
> `#/tablon`…), el código y buena parte de la documentación técnica conservan
> los nombres de antes.

[![CI](https://github.com/ALRO-GM/sanatorio-42/actions/workflows/ci.yml/badge.svg)](https://github.com/ALRO-GM/sanatorio-42/actions/workflows/ci.yml)
![Node 22](https://img.shields.io/badge/Node-22-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-estricto-3178c6)
![React 19](https://img.shields.io/badge/React-19-149eca)
![SQLite](https://img.shields.io/badge/SQLite-libSQL-003b57)
![Coste](https://img.shields.io/badge/coste_mensual-0_€-0aa5a8)

**La web que le dice a un estudiante de 42 quién puede ayudarle ahora mismo con
su proyecto, y dónde está sentado.** En producción en
[sanatorio42.duckdns.org](https://sanatorio42.duckdns.org) (se entra con la
cuenta de 42).

**¿No tienes cuenta de 42?** Hay una
[demostración con datos inventados](https://sanatorio42.duckdns.org/demo/): la
web entera, sin registrarte y sin que salga nadie real.

![Sala de espera, red de correcciones, tablón y el estilo Espacial](docs/img/portada.webp)

## En un minuto

42 es una escuela de programación sin profesores: se aprende preguntando a quien
tienes al lado. El problema es saber **a quién**. Peer4U lo resuelve con
los datos de la propia escuela y, alrededor, monta lo que hace falta para que la
ayuda ocurra: turnos de on-call, sprints en grupo, pizarras, dudas por proyecto
y un calendario.

Es un proyecto personal de [Alberto](https://github.com/ALRO-GM) (`albrodri` en 42),
hecho de principio a fin: producto, diseño, código, despliegue y operación.

|                         |                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **Qué es**              | Aplicación web completa: API, web, base de datos y despliegue                                         |
| **Tecnología**          | TypeScript de punta a punta · Node 22 y Fastify · React 19 y Vite · SQLite · Docker y Caddy           |
| **Tamaño** | 22 módulos de API, 142 rutas, 52 migraciones, 4 categorías con 13 secciones, 3 modos de interfaz, 5 estilos, 4 idiomas |
| **Calidad** | 918 tests automáticos (97 % de cobertura en la API, mínimos que solo suben), pantallas probadas como las usa una persona, sin código muerto ni duplicado, y un despliegue que no sale sin la CI en verde |
| **Seguridad** | Revisión completa documentada: permisos con doble cerradura, topes de intentos y un test que recorre todas las rutas con entradas imposibles |
| **Datos**               | 193 784 correcciones y 15 032 personas de 4 campus copiadas de la API de 42                           |
| **Rendimiento**         | Consultas hasta 100 veces más rápidas tras la revisión; la portada llega en unos 33 ms                |
| **Coste**               | 0 € al mes. La web se corta sola antes de pasar de la capa gratuita                                   |
| **Recursos que ocupa**  | 57 MiB de memoria y un fichero de 72 MB                                                               |

Lo que este proyecto enseña de quien lo ha hecho:

- **Diseñar con una restricción dura.** La API de 42 da 1 200 peticiones por
  hora para toda la aplicación. La web copia los datos poco a poco a una base
  propia y nunca pregunta a 42 para pintar una pantalla.
- **Medir antes de afirmar.** Cada cifra de este documento dice si está medida,
  calculada o estimada, y cómo se obtuvo.
- **Operar lo que se construye.** Despliegue con una orden, copias de
  seguridad, una guardia que corta el servicio antes de generar un solo céntimo
  de gasto y un panel con el consumo por persona y por hora.
- **Cuidar el detalle.** Grafos interactivos en `<canvas>`, demostraciones
  animadas en vez de textos de ayuda, cinco estilos intercambiables y todo
  usable en el móvil.

## Índice

- [Funcionalidades](#funcionalidades)
  - [Cinco categorías y tres modos](#cinco-categorías-y-tres-modos)
  - [Expediente](#expediente)
  - [Sala de espera](#sala-de-espera)
  - [Guardia](#guardia)
  - [Tablón de dudas](#tablón-de-dudas)
  - [Terapia de grupo](#terapia-de-grupo)
  - [Pizarras](#pizarras)
  - [Not-games](#not-games)
  - [Estadísticas de Ayuda](#estadísticas-de-ayuda)
  - [Calendario](#calendario)
  - [Avisos y sala del evento](#avisos-y-sala-del-evento)
  - [Red de correcciones](#red-de-correcciones)
  - [Clústeres](#clústeres)
  - [Modo concentración (Pomodoro)](#modo-concentración-pomodoro)
  - [Curso de git](#curso-de-git)
  - [Avisos del edificio](#avisos-del-edificio)
  - [Exámenes](#exámenes)
  - [Buscador de personas](#buscador-de-personas)
  - [Demostraciones animadas](#demostraciones-animadas)
  - [Personalizar y estilos](#personalizar-y-estilos)
  - [En el móvil](#en-el-móvil)
  - [Piscineros](#piscineros)
  - [Panel de gestión](#panel-de-gestión)
  - [Validar documentos](#validar-documentos)
  - [Demostración sin cuenta](#demostración-sin-cuenta)
  - [Code Clicker](#code-clicker)
- [Problemas que surgieron y cómo se resolvieron](#problemas-que-surgieron-y-cómo-se-resolvieron)
- [Cómo está hecho](#cómo-está-hecho)
  - [Arquitectura](#arquitectura)
  - [Estructura del repositorio](#estructura-del-repositorio)
  - [Módulos de la API](#módulos-de-la-api)
  - [Decisiones de implementación](#decisiones-de-implementación)
- [Cómo se protege el código](#cómo-se-protege-el-código)
- [Revisión de seguridad](#revisión-de-seguridad)
- [Despliegue](#despliegue)
- [Coste cero garantizado](#coste-cero-garantizado)
- [Rendimiento](#rendimiento)
- [Cuánta gente aguanta sin pagar](#cuánta-gente-aguanta-sin-pagar)
- [Contexto entre sesiones de trabajo](#contexto-entre-sesiones-de-trabajo)
- [Puesta en marcha](#puesta-en-marcha)
- [Estado y límites conocidos](#estado-y-límites-conocidos)
- [Futuras mejoras](#futuras-mejoras)
- [Documentación](#documentación)

## Funcionalidades

Las capturas son del estado actual de la web, con los datos simulados de
`npm run dev:mock`: ninguna persona que aparece es real.

### Cinco categorías y tres modos

Arriba hay cinco pestañas agrupadas por para qué sirve cada cosa: **Expediente**
(lo tuyo), **Ayuda** (sala de espera, tablón, terapia y pizarras: quedar con
gente para pedir y dar ayuda, aprender y enseñar), **Calendario**,
**Clústeres** (el plano del campus) y **Datos** (red, avance y exámenes). La abierta enseña sus secciones en una segunda
fila, y al volver a ella se abre la última que se miró.

Cada cual elige cuánto enseña la web, en el pie o en la bienvenida:
**simplificado** (lo justo para pedir y dar ayuda, sin cifras ni rankings),
**normal** o **loco por los datos** (rankings, estadísticas y desgloses
abiertos). Cada elemento dice desde qué modo sale; el mapa entero, con el porqué
y una valoración de uso de cada pantalla, está en
[docs/interfaz.md](docs/interfaz.md).

### Expediente

Es la portada. Nivel y títulos por XP, estado de salud (a qué _pace_ vas, cuándo
caerías al siguiente y cuándo te alcanza el _black hole_, con calculadora), las
horas validadas con descarga en CSV, tu red de correcciones, logros y ranking.
El expediente de otra persona se puede abrir en una versión pública recortada,
con un botón junto a su nombre para escribirle.

![Expediente](docs/img/expediente.webp)

### Sala de espera

Eliges el proyecto que te duele y ves quién puede atenderte: quién lo está
haciendo (_paciente como tú_), quién ya lo aprobó (_especialista_, o _eminencia_
si fue con 125), en qué puesto está y si está de guardia. El mapa de clusters
lleva las fotos y un código de colores: dorado para especialistas de guardia,
verde para pacientes de guardia y azul para una terapia reunida. También dice si
ya os habéis corregido antes y quién se ofrece a preevaluar proyectos terminados.

![Sala de espera con el mapa de clusters](docs/img/sala-de-espera.webp)

### Guardia

Marcas las medias horas de hoy en las que te ofreces y un tope de tiempo. Quien
lo necesita te reserva un rato y tú lo aceptas. La sesión solo da XP si se
validan los dos códigos (inicio y fin) y las dos partes la valoran. Se puede
bloquear a alguien.

![Guardia](docs/img/guardia.webp)

### Tablón de dudas

El plan de estudios de cada persona dibujado en perspectiva, un círculo por
bandeja: el clásico de C o el nuevo de C y Python, según su plan. Cada proyecto
ocupa lo que sus horas estimadas y enseña sus plazos por _pace_. Dentro, dudas
con respuestas y una guía que se edita por propuestas validadas.

![Tablón de dudas](docs/img/tablon.webp)

### Terapia de grupo

Grupos para días concretos, con puestos reservados en el cluster (de dos a seis,
que se tocan), cómo lleva el proyecto cada quien y chat del grupo. Dos tipos:
para avanzar o de repaso, con el proyecto terminado y antes de presentarlo.

![Terapia de grupo](docs/img/terapia.webp)

### Pizarras

Alguien explica algo a quien se apunte. Calendario propio y asistencia validada
con códigos. Una pizarra no se puede poner a más de 62 días vista, y si la fecha
queda lejos la web pide confirmarla.

![Pizarras](docs/img/pizarras.webp)

### Not-games

Preguntas de programación para aprender con más gente (no es un juego: es
repaso). Se crea una sala y se elige el modo: duelo, equipo contra equipo,
todos contra todos o supervivencia con tres vidas; los tres primeros, también
en competitivo, donde fallar resta. A cada cual le sale lo que ha estudiado: las
preguntas de un proyecto solo salen si todos los de la sala lo han hecho (o
están en él), o se juega solo con lo general; también se puede pedir un círculo
mínimo para entrar.

El banco tiene 175 conceptos de todo el common core de los dos planes, de lo
básico a lo difícil: rápidas (10 s, leer y contestar) y largas (30 s o 1 min,
razonar o encontrar el fallo en un código). Cada concepto se pregunta de varias
formas, con la buena escrita de varias maneras y las malas mezcladas, y cada
cual ve las respuestas en otro orden: memorizar el botón no sirve. La dificultad
de cada pregunta empieza estimada y se reajusta con lo que falla la gente. Al
acabar cada pregunta se ve la buena y por qué. El servidor lleva el reloj y la
partida: nadie puede contestar tarde ni ver la buena antes de tiempo.

Cada cual tiene su **Repaso**: lo que ha fallado en cualquier juego, concepto a
concepto, con qué es, un ejemplo y la pregunta tal como salió. Lo que acierta
después pasa a superado.

**Ajedrez con pregunta.** Dos personas, cada una con su reloj (3, 5, 10 o 15
minutos) y el tablero que prefiera (torneo, madera, océano o contraste). Al
mover, los relojes se paran y sale una pregunta a los dos encima del tablero:
quien acierta primero mueve (aunque sea dos veces seguidas) y quien falla pierde
el 10 % de su tiempo. La mecánica de turnos con pregunta está separada del
ajedrez para reutilizarla en otros juegos. Cada juego tiene su demostración, y
las salas suenan (jugadas, preguntas, aciertos, últimos segundos) salvo que se
silencien.

### Estadísticas de Ayuda

Una pestaña en Ayuda con lo que se mueve en el campus en cada sección (sala de
espera, tablón, terapia, pizarras y Not-games), del mes o desde siempre, y la
clasificación de cada una con la foto de cada cual: quién ayuda más en sesiones
validadas, quién resuelve más dudas, quién va a más terapias, quién reúne a más
gente en sus pizarras y quién gana más partidas. Y, aparte, quién va más rápido
en el curso según el sistema de pace (el % del curso completado y a qué pace). Tu fila sale marcada aunque no
estés entre los diez primeros. Sale desde el modo normal: el simplificado no
enseña rankings.

### Calendario

Todo lo tuyo en un sitio: guardia, reservas, terapias, pizarras y lo de 42
(correcciones, eventos, exámenes). Por día, semana o mes y filtrado por tipos.
Lo de Sanatorio va en tonos fríos y lo de 42 en cálidos.

![Calendario](docs/img/calendario.webp)

### Avisos y sala del evento

Unos minutos antes de cada evento salta una ventana con qué es, dónde y cuándo.
Si es con más gente no se puede cerrar sin contestar: «voy», «me retraso» o «no
puedo ir» con motivo. Cada evento tiene un chat que comparten todos. Pizarras y
sesiones de ayuda validan la asistencia con dos códigos, a mano o por QR. Lo que
le pasa a una persona por lo que hace otra llega a su buzón, con el número de
avisos sin leer en la cabecera.

El buzón tiene además una pestaña de **conversaciones**, como un correo interno:
todos tus chats juntos (con otra persona, de un grupo de terapia, de una
pizarra, de una sesión de ayuda), con cuántos mensajes tienes sin leer en cada
uno. Cada conversación se puede marcar como no leída o como pendiente de
responder, pedir que se te recuerde (dentro de una hora, mañana o el lunes) y
asociar a un proyecto. Se filtran por no leídas, pendientes, tipo y proyecto.
Desde ahí se escribe a quien administra o a alguien del campus, que se busca por
login o por nombre.

### Avance en el common core

Una pestaña en Datos con tu avance desde que empezaste, frente a la media (del
campus o de todos, de un plan o de los dos), a lo que pide cada pace y a quien
quieras comparar. **Por círculos**: el % aprobado de cada círculo, con todos sus
proyectos, y cada círculo pesa igual. **Por horas estimadas**: las horas que 42
estima que dura cada proyecto aprobado, sobre las de todo el common core.

### Red de correcciones

Quién ha corregido a quién, como un grafo de burbujas que se recoloca solo:
comunidades, endogamia, lo que cada quien aprueba como corrector y lo que le
aprueban como corregido, las personas más estrictas, parejas y proyectos. Se
puede elegir una escuela, varias o todas, filtrar por fecha, persona, proyecto y
veredicto, y buscar a alguien dentro del grafo. En escritorio el grafo se queda
anclado y solo se mueve la columna de opciones; en el móvil se amplía y se
desplaza con dos dedos.

![Red de correcciones](docs/img/red.webp)

### Clústeres

El mapa del campus entero. Al pulsar un puesto ocupado, la ficha de esa persona
se queda abierta con sus proyectos y los botones para escribirle o abrir su
expediente. Un punto verde marca a quien tiene Sanatorio abierto. Se puede
resaltar a tu círculo o a quien hace tu proyecto, girar el plano y avisar de un
ordenador que no funciona (se da por arreglado en cuanto alguien inicia sesión
en él).

![Clústeres con una ficha abierta](docs/img/clusters.webp)

### Modo concentración (Pomodoro)

Desde el menú de la cuenta: un rato de concentración (25, 50 o 90 minutos) y su
descanso, con un temporizador grande que flota a la vista. Mientras dura, la web
se queda con las pestañas que elijas, los juegos se callan (sonidos, la
ventanita de Code Clicker, sus noticias y logros) y solo saltan los avisos
elegidos (correcciones, eventos, mensajes, guardia o el resto del buzón); los
obligatorios de un evento con más gente, siempre. Los demás ven «concentrado,
no me distraigas» en tu ficha, tu puesto y la sala de espera.

### Curso de git

En Not-games, la pestaña «Curso de git»: un camino de puntos con forma de ramas
de git, un mundo de un color por cada bloque (raíz, ramas, remotos, reescribir,
deshacer y flujos de trabajo), que se van marcando con estrellas. Cada punto
tiene una animación de la estructura a conseguir, la teoría del comando (para
qué, cómo, cuándo sí y cuándo no, cómo se ve y qué problemas da) y un reto en
una terminal con git simulado. Los retos solo se juegan sentado en un puesto
del clúster. Antes de cada prueba de grupo hay un test de preguntas rápidas
que hay que acertar entero (si no, una hora de espera). Después, la prueba se
juega en grupo, cada cual desde su puesto: una sala, un origin común y una
misión que cada persona tiene que cumplir entera (unir su rama en main;
GitHub flow con `gh pr merge` y un conflicto que resolver; Gitflow con
funcionalidad, hotfix y versión). Al final, el jefe: lejos unas de otras, sin
hablar y en 30 minutos, cada cual deshace un commit roto con `revert`, mete su
funcionalidad en un solo commit con `rebase` y publica su versión. Diseño:
[docs/curso-git.md](docs/curso-git.md).

### Avisos del edificio

Desde Clústeres, «Avisar de un problema»: qué pasa (ordenador; pantalla,
teclado o ratón; red o wifi; baños; temperatura; luz; limpieza u otro), dónde
(si no se dice, tu puesto) y una nota. Lo ve el staff en su página y quien
administra en el panel, y lo dan por resuelto con un botón. Si se configura un
webhook de Slack (`SLACK_WEBHOOK_URL`), cada aviso llega también al canal del
staff.

### Exámenes

Cuando empieza un examen en tu campus, la pestaña de Datos lo avisa «en vivo»:
quién está dentro, de qué examen y círculo, y su última nota, que se pone al día
cada cinco minutos. Debajo, las estadísticas de cada examen (en qué intento se
aprueba y, plegado, la nota mediana de cada intento) y, en el modo de datos, cuánto se tarda en
cada círculo.

### Buscador de personas

En la cabecera. Busca por login o por nombre mientras escribes, sin distinguir
mayúsculas ni acentos, y enseña foto y nombre.

![Buscador de personas](docs/img/buscador.webp)

### Demostraciones animadas

La web no lleva párrafos de ayuda. Junto a cada título hay un icono de
información que abre una demostración: un ratón que hace lo que harías tú, con
una frase corta por acción. La velocidad se puede regular, y la que viene de
fábrica se ajusta sola con lo que elige la comunidad. Todas siguen los mismos
criterios (una frase de 70 caracteres como mucho por acción, 20 s de guion, el
ratón solo hacia lo que existe), que los tests comprueban solos, y una nueva se
empieza con `npm run demo:new` desde una plantilla
([docs/demos.md](docs/demos.md)).

![Demostración del calendario de pizarras](docs/img/demostracion.webp)

### Personalizar y estilos

Orden de pestañas y de bloques, qué sale plegado, con cuánta antelación avisar,
claro o nocturno y el estilo. Hay cinco: **Clínica**, **Terminal**,
**Historial**, **Espacial** y **A tu color**, con ocho paletas. Un estilo es una
carpeta con su manifiesto, su hoja y sus imágenes: para añadir uno no se toca
ningún componente (lo explica
[apps/web/src/themes/README.md](apps/web/src/themes/README.md)).

![Los cinco estilos y la ventana de personalizar](docs/img/estilos.webp)

Idiomas: español, inglés, catalán y euskera, completos salvo el panel de
gestión y el texto legal en catalán y euskera. Los textos no están en el código:
viven en tablas por tema (un CSV con clave, contexto y una columna por idioma)
que se editan como una hoja de cálculo; cada idioma se descarga solo si se usa
([docs/textos.md](docs/textos.md)).

### En el móvil

Todo cabe y todo se puede hacer con el dedo: la cabecera en una fila, las
pestañas deslizables y los grafos con pellizco.

<img src="docs/img/movil.webp" alt="Sala de espera en el móvil" width="300">

### Piscineros

Sanatorio es para estudiantes de 42: al volver de 42 se mira el cursus de cada
cual. Quien tiene el 42cursus entra; quien está en una piscina en curso entra
a una versión solo para piscineros si quien administra la abre; el resto
(Discovery, piscinas antiguas) ve que su cuenta no es de estudiante.

En el panel, pestaña **Piscina**: abrir o cerrar la entrada, el aviso para
piscineros con la piscina cerrada y, pestaña a pestaña y elemento a elemento,
lo que pueden ver (también Code Clicker, Pomodoro, buzón, buscador,
comunicados). La API corta lo que no se permite, no solo la web. Con **Ver
como piscinero**, quien administra ve la web como la vería un piscinero de su
campus, con lo guardado (también con la piscina cerrada), y vuelve desde la
franja de arriba.

Mundos separados: un estudiante no ve a ningún piscinero, y un piscinero solo
ve a los piscineros de su campus, en el mapa, el buscador, las fichas, la sala
de espera, la guardia, la red, el calendario, las clasificaciones y lo que
crea la gente (grupos, pizarras, dudas, salas). Detalle en
[docs/piscineros.md](docs/piscineros.md).

Además, desde la pestaña **Personas ocultas** del panel se puede ocultar a
cualquier persona a uno de los grupos (o a los dos): para ese grupo deja de
existir en toda la web, y ella sigue viéndose y usándola con normalidad
([docs/personas-ocultas.md](docs/personas-ocultas.md)).

### Panel de gestión

Solo para quien administra. Trece pestañas:

| Pestaña              | Qué enseña                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Consumo              | Peticiones y datos por persona y por hora, avisos de exceso y el presupuesto que se reparte solo       |
| Permisos y bloqueos | Quién administra, quién no puede entrar y las cuentas de staff |
| Buzón                | Incidencias, sugerencias y denuncias, con respuesta                                                    |
| Mensajes             | Registro de lo que se escribe en los chats                                                             |
| Qué se usa           | Mapa de calor de cada elemento y grafo de recorridos entre secciones                                   |
| Estadísticas         | Tiempo de uso por persona, quién está conectado ahora y cuánto lleva                                   |
| Code Clicker         | Uso del juego y un apartado de trampas: quién, cuándo, cómo se vio, qué se requisó, indulto, avisos de saltos y un comunicado solo para quienes las hicieron |
| Comunicados          | Mensajes para todo el mundo                                                                            |
| Avisos del edificio  | Problemas de ordenadores o del edificio que manda la gente, para resolverlos
| Pomodoro             | Uso por días y horas, paradas y sus motivos, por tramo de gente
| Piscina              | Quién entra, el aviso de la piscina cerrada y lo que puede ver un piscinero
| Personas ocultas     | Ocultar a alguien (de cualquier grupo) a los estudiantes, a los piscineros o a los dos, con un motivo que solo se ve ahí ([docs/personas-ocultas.md](docs/personas-ocultas.md))
| Limpiar datos        | Borrado a mano de cualquier dato, global o de una persona, entero o desde una fecha                    |

Nada se borra solo: lo único que elimina datos es «Limpiar datos», que antes
enseña en una ventana qué va a borrar y cuánto. Todas las tablas del panel
dejan la cabecera fija al bajar y se ordenan por varias columnas: la última que
se pulsa manda y las anteriores deciden los empates.

![Consumo](docs/img/panel-consumo.webp)

Las estadísticas y los recorridos se pueden acotar con un deslizador doble que
deja fuera a las personas más y menos activas, para que dos o tres no deformen
la media.

![Recorridos entre secciones](docs/img/panel-recorridos.webp)

<details>
<summary>Más capturas del panel: estadísticas, juego y limpieza de datos</summary>

![Estadísticas de uso](docs/img/panel-estadisticas.webp)

![Uso de Code Clicker](docs/img/panel-clicker.webp)

![Limpiar datos](docs/img/panel-datos.webp)

</details>

### Validar documentos

Las horas validadas se descargan en un CSV para enseñárselas al staff de 42. Un
CSV lo edita cualquiera, así que cada descarga lleva un **código de cuatro
caracteres** en el nombre del fichero (`horas-validadas_jdoe_…_K7QF.csv`) y la
web guarda la copia. El staff entra en `/#/validar` con una cuenta que solo
sirve para eso, escribe el código y ve el documento tal como se emitió; si sube
el fichero que le han dado, la web le dice si es idéntico.

![Pantalla del staff con un documento comprobado](docs/img/staff-documento.webp)

Las cuentas de staff las crea quien administra desde el panel. No son de 42, se
entra con una clave que se enseña una sola vez y no llegan a ninguna otra parte
de la web.

![Cuentas de staff en el panel](docs/img/staff-cuentas.webp)

### Demostración sin cuenta

En [`/demo/`](https://sanatorio42.duckdns.org/demo/) está la web entera con
datos inventados: calendario, proyectos, gente, red de correcciones y panel de
gestión. No habla con el servidor y nada de lo que se hace se guarda. Una
cuenta de prueba dentro de la web de verdad enseñaría a la gente real; esto no.

### Code Clicker

<details>
<summary>Un secreto para quien lo encuentre (destripe)</summary>

Un juego incremental escondido en la web: se escribe código, se compran
edificios y mejoras, y llegan noticias según lo que vas consiguiendo. Está
pensado para que apetezca tener Sanatorio abierto: sigue contando en cualquier
sección, con una ventanita flotante que se puede cerrar.

La partida se guarda en el servidor, que revisa cada guardado. Si las cifras no
cuadran (más código del que se ha podido producir, un ritmo imposible, cuentas
que no suman), guarda una copia de la partida, vende los edificios, pone un
título de «hacker» y avisa. Las tres primeras veces dan un logro. Quien
administra puede ver la copia e indultar. El detalle, en
[docs/code-clicker.md](docs/code-clicker.md).

![Code Clicker](docs/img/code-clicker.webp)

</details>

## Problemas que surgieron y cómo se resolvieron

| Problema                                                                                                            | Qué se hizo                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La API de 42 da 1 200 peticiones por hora para toda la aplicación                                                    | Réplica local en SQLite. Las pantallas leen de ahí. Cada petición a 42 pasa por una cuota con tres escalones; lo que puede esperar hace cola y enseña su turno              |
| 42 marca «Ok» también en correcciones con un 0                                                                       | El veredicto sale de la nota y de la mínima del proyecto, que se deduce de cómo ha acabado la gente                                                                         |
| 42 no publica el _pace_, el plan de estudios ni la nota mínima                                                       | Se deducen de los datos: rangos y fechas de los proyectos y la fecha oficial de _black hole_                                                                                |
| Consultas de la red que recorrían todas las correcciones del campus                                                  | `ANALYZE` al abrir la base y `PRAGMA optimize`: de 15,7 a 0,25 ms sin tocar una consulta                                                                                    |
| Mientras se copiaba de 42, las visitas esperaban                                                                     | Base en WAL: quien lee no espera a quien escribe, y cada escritura cuesta 100 veces menos                                                                                   |
| Un chat abierto pedía sus 200 mensajes cada 8 segundos                                                               | Solo se pide lo posterior al último mensaje, la espera crece si nadie escribe y con la pestaña oculta no se pregunta                                                        |
| Oracle respondía «Out of host capacity» para las máquinas gratuitas                                                  | Un guion que reintentaba cada cinco minutos alternando ARM y x86; después, cuenta de pago por uso con una guardia que impide gastar                                         |
| Pasar a pago por uso abre la puerta a una factura                                                                    | Cortes fijos al 90 % y al 95 % de cada límite gratuito, en la web y en la máquina, sin excepciones ni ajustes                                                               |
| Una pizarra creada por error para dentro de años ya no se podía abrir                                                | Tope de 62 días en todos los eventos y confirmación si la fecha queda lejos                                                                                                 |
| Al estrechar la ventana desaparecían botones de la cabecera                                                          | La cabecera cabe en una fila a cualquier ancho; lo que no es esencial va al menú de la cuenta                                                                               |
| El grafo de la red no se leía en los modos claros                                                                    | El lienzo toma sus colores de las variables del estilo puesto, en vez de llevarlos escritos                                                                                 |
| Al anclar el grafo, las opciones de la derecha se superponían                                                        | La columna de opciones pasó a ser una pila con su propio deslizamiento                                                                                                      |
| En el móvil, pellizcar sobre dos nodos los arrastraba                                                                | Dos dedos siempre amplían o desplazan, se toque lo que se toque                                                                                                             |
| Buscar sin acentos con funciones anidadas de SQL reventaba el analizador («parser stack overflow»)                   | La comparación se hace en el servidor con el texto normalizado (NFD, sin marcas)                                                                                            |
| Una división con un parámetro se enlazaba como decimal y agrupaba mal                                                | `CAST(? AS INTEGER)` y un test que lo fija                                                                                                                                  |
| Se podían hacer trampas en el juego editando la partida                                                              | El servidor comprueba cada guardado contra lo que se ha podido producir, guarda copia y deja indultar                                                                       |
| El historial de capital del juego crecía sin fin                                                                     | Se guarda para siempre, pero a escalones: todo el último día, un punto por hora la última semana y uno por día de ahí atrás                                                 |
| Los mensajes se borraban solos al cabo de un tiempo                                                                  | Ya no se borra nada de forma automática; el borrado es una acción de quien administra, con vista previa                                                                     |
| El juego se paraba al cambiar de sección                                                                             | Sigue corriendo en toda la web para quien lo ha encontrado, con una ventanita que se puede cerrar                                                                           |
| Las ruedas del tablón en perspectiva no terminaban de leerse bien                                                    | Menos solape entre bandejas, subida más suave y los círculos aún no alcanzados quedan quietos y con candado                                                                     |
| La textura de papel era un filtro SVG que el navegador recalculaba en cada repintado                                 | Imagen PNG ya hecha y fondos que se mueven con la página                                                                                                                    |
| Un CSV de horas se puede retocar antes de entregarlo | Cada descarga lleva un código de verificación y la web guarda la copia: el staff la ve con una cuenta que solo sirve para eso |
| Quien no es de 42 no podía ver la web | Demostración pública con datos inventados, que no habla con el servidor |
| Un JSON mal escrito o una fecha imposible daban un error interno | Un test recorre todas las rutas con entradas extremas: encontró cinco casos y ya no queda ninguno |
| La comprobación de admin estaba copiada en siete sitios | Una sola función y una barrera global para todo `/admin` |
| La vuelta del login no tenía tope y se podía usar para machacar a 42 | Tope de intentos por IP |
| Las copias nocturnas de producción no se estaban guardando, y nadie lo veía | Apareció al hacer una copia a mano antes de un despliegue. El guion comprueba ahora que puede escribir y limpia lo que deja a medias |
| **Abierto**: en un ordenador de escritorio, trozos rectangulares de la página dejan de pintarse durante un instante  | Sin resolver. En el móvil no pasa y no se reproduce sin tarjeta gráfica. Lo probado y lo que queda por probar, en [docs/bug-trozos-sin-pintar.md](docs/bug-trozos-sin-pintar.md) |

## Cómo está hecho

### Arquitectura

Un monolito modular en una sola máquina. Un proceso de Node sirve la API y los
ficheros de la web; delante, Caddy pone el HTTPS y las cabeceras de seguridad.
La base es un fichero de SQLite.

```mermaid
flowchart LR
  P["Navegador<br/>React 19"] -->|HTTPS| C["Caddy<br/>TLS, CSP, HSTS"]
  C --> A["API Fastify<br/>20 módulos"]
  A --> D[("SQLite en WAL<br/>datos propios y réplica")]
  S["Sincronizador<br/>trabajos de fondo"] --> D
  S -->|"cuota de 1 200/h<br/>con tres escalones"| Q["API de 42"]
  A -. solo el módulo replica .-> Q
  G["Guardia de límites<br/>cron cada 5 min"] -. corta al 90 y 95 % .-> C
```

Por dentro, cada módulo tiene la misma forma, y solo se habla con los demás por
su `index.ts`:

```mermaid
flowchart TB
  subgraph M["Un módulo"]
    R["rutas<br/>validan con zod"] --> SV["servicio<br/>reglas"]
    SV --> RP["repositorio<br/>SQL"]
    SV --> RU["reglas puras<br/>con sus tests"]
  end
  K["packages/contracts<br/>tipos de cada respuesta"] --> R
  K --> W["web: cliente real<br/>y cliente simulado"]
  SV -->|evento| N["notices<br/>buzón de avisos"]
```

### Estructura del repositorio

```
apps/
  api/                 API (Node 22, Fastify, SQLite con libSQL)
    src/
      main.ts          punto de entrada: abre el puerto y arranca la sincronización
      app/             montaje: composición de módulos, CORS, errores, salud
      config/          variables de entorno, validadas al arrancar
      core/            lo que no es de ninguna funcionalidad: base de datos y
                       migraciones, errores, eventos, sesión, contrato de módulo
      integrations/    cliente de la API de 42 (token, límite de peticiones, tipos)
      modules/         una carpeta por funcionalidad (ver abajo)
      cli/             comandos: migrar, estado y avance de la réplica
    tests/             unit/ e integration/
  web/                 web (React 19, Vite, TypeScript)
    src/
      app/             pantalla raíz, secciones y navegación
      features/        una carpeta por funcionalidad
      shared/          cliente de la API (real y simulado), idiomas, hooks, piezas comunes
      themes/          un estilo por carpeta: manifiesto, hoja e imágenes
      styles/          variables y hojas comunes a todos los estilos
packages/
  contracts/           tipos de cada respuesta de la API; los usan api y web
infra/                 Docker, Caddy, scripts de despliegue, copia y guardia de límites
docs/                  arquitectura, contrato de la API, despliegue, rendimiento y contexto
```

Tamaño a 12 de octubre de 2026 (líneas en `src` y en `tests`):

```mermaid
pie showData title Líneas por parte
  "Web" : 45710
  "API" : 23838
  "Tests de la API" : 11702
  "Documentación" : 3729
  "Contrato compartido" : 1903
  "Tests de la web" : 1439
  "Infraestructura" : 613
```

### Módulos de la API

| Módulo       | Qué hace                                                                          |
| ------------ | --------------------------------------------------------------------------------- |
| `auth`       | Login con OAuth de 42, cookie de sesión firmada                                   |
| `replica`    | Copia local de 42, sincronizador, cuota y cola de turnos; catálogo de campus      |
| `peers`      | Tus proyectos, quién puede ayudarte, tu guardia                                   |
| `profile`    | Expediente, XP, títulos, logros, ranking y buscador de personas                   |
| `therapy`    | Terapias de grupo                                                                 |
| `doubts`     | Tablón de dudas y guía de cada proyecto                                           |
| `boards`     | Calendario de pizarras                                                            |
| `calendar`   | Calendario personal: lo de Sanatorio y lo de 42                                   |
| `help`       | Guardia: franjas, reservas, valoraciones y bloqueos                               |
| `map`        | Mapa de clusters: ocupación, gente de guardia y puestos reservados                |
| `network`    | Red de correcciones: quién ha corregido a quién, comunidades y endogamia          |
| `usage`      | Qué se usa: orden automático, mapa de calor, recorridos y tiempo de uso           |
| `meet`       | Avisos y chat de cada evento                                                      |
| `notices`    | Buzón de avisos de cada persona y el pulso que la web pregunta de fondo           |
| `attendance` | Códigos de inicio y fin, tiempo validado, registro de intentos e informe de horas |
| `broadcasts` | Comunicados de quien administra para todo el mundo                                |
| `tours`      | Velocidad de las demostraciones: la de cada persona y la que vota la comunidad    |
| `clicker`    | Partidas del juego, comprobación de trampas e historial de capital                |
| `quiz`       | Not-games: banco de preguntas, salas, partidas y dificultad que se reajusta       |
| `stats`      | Estadísticas de Ayuda: cifras del campus y clasificación de cada sección          |
| `facility`   | Avisos al staff de problemas del edificio y de los ordenadores (y Slack)          |
| `focus`      | Modo concentración (Pomodoro): quién está concentrado y hasta cuándo              |
| `gitcourse`  | Curso de git: progreso del camino, corregido otra vez con el git simulado         |
| `staff` | Documentos con código de verificación y las cuentas de staff que los comprueban |
| `admin`      | Permisos, bloqueos, buzón, consumo, presupuesto de peticiones y limpieza de datos |

Cómo encajan las piezas y cómo añadir una funcionalidad:
[docs/architecture.md](docs/architecture.md).

### Decisiones de implementación

- **Réplica local de 42.** En vez de preguntar a 42 en cada pantalla, se copia a
  SQLite lo que hace falta y las lecturas salen de ahí. Solo se guarda lo que la
  web enseña.
- **Lo caro, una vez y despacio.** El histórico (proyectos, correcciones) se
  copia con un cursor guardado, sin tocar una reserva horaria; después solo se
  pide lo que cambia. El repaso completo corre cuando nadie usa la web.
- **Monolito modular.** Una carpeta por funcionalidad, con su repositorio (SQL),
  su servicio (reglas) y sus rutas. Sin microservicios: una máquina, un proceso.
- **SQLite y una sola máquina.** Sin servicios que mantener: un fichero, copias
  con un script y Caddy delante. Cabe de sobra en la capa gratuita.
- **XP que no se puede puentear.** Cada punto sale de un hecho comprobable (una
  respuesta que resuelve, una sesión con sus dos códigos y valorada por los
  dos), una sola vez por referencia y con topes.
- **Sin estado de más en el navegador.** La navegación va en el hash, la
  personalización en `localStorage`, y cada sección se descarga al abrirla.
- **Los grafos, en `<canvas>`.** Con miles de burbujas el SVG no da abasto; la
  física es `d3-force` y lo que cambia a cada fotograma no pasa por React.
- **Estilos como datos.** Los componentes solo conocen variables; cada estilo
  les da valor desde su carpeta.
- **Privacidad.** No se guardan correos, teléfonos ni los comentarios de las
  correcciones. El expediente ajeno es una versión recortada. Las estadísticas
  de uso solo las ve quien administra.

## Cómo se protege el código

Lo que impide que una funcionalidad nueva rompa otra, por orden de cuándo actúa:

1. **Un contrato de tipos compartido** (`packages/contracts`). La forma de cada
   respuesta se escribe una vez y la usan la API y la web. Si la API cambia una
   respuesta y la web no, no compila.
2. **Cliente simulado obligatorio.** El tipo `Api` obliga a que todo lo que se
   añade al cliente real exista también en el simulado. Por eso la web entera se
   puede probar con `npm run dev:mock`, sin API ni credenciales.
3. **Fronteras que vigila el linter.** `core` e `integrations` no importan de
   los módulos, y de otro módulo solo se importa su `index.ts`
   (`no-restricted-imports` en `eslint.config.js`). Solo `replica` habla con 42.
4. **Entradas validadas.** Las variables de entorno se validan al arrancar y el
   cuerpo de cada petición, con zod en la ruta.
5. **Migraciones inmutables.** Un cambio de esquema es un fichero nuevo; los 52
   existentes no se editan. Se aplican solas al arrancar.
6. **Reglas en funciones puras.** Lo delicado (XP, asistencia, presupuesto,
   trampas, recorridos) vive en ficheros `*.rules.ts` sin base de datos ni
   reloj, con sus tests. Los tests usan un reloj falso: no dependen de la hora.
7. **Tests.** 608 de la API (unidad e integración sobre SQLite en memoria, con
   la API de 42 simulada; cubren el 97 % de las sentencias) y 310 de la web,
   entre ellos los de pantallas: abren cada sección y hacen lo que haría una
   persona (apuntarse, pedir ayuda, ordenar una tabla), buscando por rol y
   nombre como un lector de pantalla. Cada cosa se prueba en cinco familias:
   normal, límite, vacío y enorme, imprevisible y permisos
   ([docs/tests.md](docs/tests.md), con sus fuentes).
8. **Un test que recorre todas las rutas.** Saca la lista de la propia app, así
   que una ruta nueva entra sola: sin sesión tiene que dar 401, lo de `/admin`
   403 a quien no administra, y ninguna entrada puede acabar en un error interno.
9. **Doble cerradura en los permisos.** Lo de admin y lo de staff lo comprueba
   cada servicio y, además, una barrera por la que pasan todas las peticiones.
10. **`npm run check`** antes de dar nada por terminado: tipos, lint, formato,
    código sin uso (`knip`), duplicados (`jscpd`, máximo 1 %), textos al día
    con las tablas y tests. Es lo mismo que pasa la CI.
11. **CI en cada subida** (`.github/workflows/ci.yml`): todo lo anterior, los
    mínimos de cobertura (solo suben), la compilación y que la imagen de Docker
    construye.
12. **El despliegue se protege a sí mismo.** `deploy.sh` no despliega un commit
    cuya CI no haya pasado (la CI lo dice con una etiqueta `ci-ok/<sha>` en el
    propio repositorio; si aún corre, espera), hace una copia comprobada de la
    base, guarda la imagen que funciona, aplica las migraciones aparte antes de
    tocar el contenedor y, si la nueva no contesta en `/health/db` con el
    commit y el esquema esperados, vuelve sola a la anterior (y a la copia, si
    hubo migraciones).
13. **Normas escritas** en [AGENTS.md](AGENTS.md): reglas de código y de
    producto que cualquier persona o asistente lee antes de tocar nada; entre
    ellas, dónde va una funcionalidad nueva (categoría, modo e importancia) y que
    todo texto pasa por las tablas.

Y en producción:

- Contenedor sin root, sin capacidades del sistema y sin escalada de
  privilegios, con tope de 512 MiB y comprobación de salud.
- Política de contenido estricta: ni scripts en línea ni recursos de otros
  dominios, salvo imágenes por HTTPS. HSTS y `frame-ancestors 'none'`.
- Cookie de sesión firmada, `HttpOnly`, `Secure` y `__Host-`. Secretos fuera de
  git, en ficheros con permisos 600.
- Topes de intentos para lo que no tiene sesión (login, clave de staff) y
  presupuesto de peticiones para lo que sí.
- Las respuestas de la API no se guardan en ningún navegador ni caché
  (`no-store`).
- Copias de la base con `VACUUM INTO` (`infra/scripts/backup.sh`) y guion de
  restauración.

## Revisión de seguridad

En octubre de 2026 se revisó todo el código: quién puede entrar a qué, qué pasa
con entradas imposibles, qué código sobraba y si la arquitectura era la adecuada
(lo era, y se dejó). El detalle, con cada hallazgo, su gravedad y su arreglo,
está en [docs/revision-seguridad.md](docs/revision-seguridad.md).

| Qué | Antes | Ahora |
| --- | --- | --- |
| Formas encontradas de provocar un error interno | 5 | 0 |
| Copias de la comprobación de admin | 7 | 1, más una barrera global |
| Sitios donde se validaba una fecha, cada uno a su manera | 5 | 1 |
| Topes para lo que no tiene sesión | ninguno | login y clave de staff, por IP |
| Tests automáticos | 497 | 608 |
| Código duplicado (bloques de 12 líneas o más) | 0,14 % | 0,05 % |
| Vulnerabilidades conocidas en dependencias | 0 | 0 |

Quién llega a qué:

| Quién | Cómo entra | A qué llega |
| --- | --- | --- |
| Sin sesión | — | La web, la demostración y empezar un login |
| Estudiante | OAuth de 42 | Todo menos `/admin` y `/staff` |
| Cuenta bloqueada | OAuth de 42 | Solo a saber que lo está y a salir |
| Admin | OAuth de 42 y el rol | Lo de estudiante y `/admin` |
| Staff | Clave que crea un admin | **Solo** a validar documentos |

Sobre las direcciones: la sección y la persona van en el hash (`#/expediente/jdoe`),
que el navegador no manda al servidor ni a otras webs. Los logins no se cifran
porque en 42 son públicos; se codifican siempre, para que un valor raro no
pueda cambiar la ruta.

## Despliegue

Una máquina de Oracle Cloud (ARM, 1 OCPU, 6 GB de memoria, 46,6 GB de disco) con
Docker: la app en un contenedor y Caddy en otro, con HTTPS automático.

```mermaid
flowchart LR
  A["npm run check"] --> B["git push"]
  B --> C["CI: tipos, lint, formato,<br/>tests, build e imagen"]
  C --> T["etiqueta ci-ok/sha"]
  B --> D["ssh a la máquina<br/>deploy.sh"]
  D --> E["git pull y espera<br/>a ci-ok/sha"]
  T -.-> E
  E --> K["copia comprobada<br/>y docker compose build"]
  K --> F["migraciones aparte<br/>(compose run migrate.js)"]
  F --> U["docker compose up -d"]
  U --> G{"¿/health/db con el<br/>commit y el esquema?"}
  G -->|sí| H["Desplegado"]
  G -->|no en 180 s| I["Imagen anterior<br/>(y copia si hubo migración)"]
```

Actualizar es una orden:

```sh
ssh ubuntu@<ip> 'cd /opt/sanatorio && sh infra/scripts/deploy.sh'
```

La imagen se construye en varias etapas sobre `node:22-slim` y ocupa 415 MB.
También hay un flujo manual (`.github/workflows/deploy.yml`) que publica la
imagen y la despliega por SSH. Guía paso a paso desde cero:
[docs/deploy-oracle.md](docs/deploy-oracle.md).

## Coste cero garantizado

No se paga nada: ni máquina, ni dominio, ni base de datos, ni CI. Y está hecho
para que siga siendo así aunque la cuenta de Oracle sea de pago por uso.

| Qué                          | Dónde                                                        | Qué hace                                                                         |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Corte al 90 %                | `modules/admin/budget.rules.ts` e `infra/scripts/limits-guard.sh` | Solo entra quien administra y se para todo lo automático                         |
| Corte al 95 %                | Los mismos                                                   | No entra nadie; hay que ir por SSH                                               |
| Presupuesto de peticiones    | `budget.rules.ts`                                            | 720 000 al día, repartidas entre quien está conectado (de 240 a 3 000 por persona) |
| Tráfico de salida            | Guardia en la máquina, por cron cada 5 minutos               | Cuenta los bytes de la tarjeta de red contra los 10 TB mensuales                 |
| Cuota de 42                  | `modules/replica`                                            | Reserva horaria para lo crítico y cola con turno para lo demás                   |

Los dos cortes no son regulables y no tienen excepciones: es una norma del
proyecto.

![Uso de cada límite](docs/img/grafico-plan-gratuito.svg)

## Rendimiento

Qué se cambió, cuánto mejoró y cómo se midió. El detalle de cada punto, con el
antes y el porqué, está en [docs/rendimiento.md](docs/rendimiento.md).

![Tiempo por operación, antes y ahora](docs/img/grafico-tiempos.svg)

| Decisión                                           | Antes               | Ahora              | Mejora                    | Cifra     |
| -------------------------------------------------- | ------------------- | ------------------ | ------------------------- | --------- |
| Estadísticas de la base (`ANALYZE`): pareja        | 15,7 ms             | 0,25 ms            | 63 veces                  | Medida    |
| Estadísticas de la base: con quién se ha corregido | 34,4 ms             | 0,36 ms            | 95 veces                  | Medida    |
| WAL en vez del diario clásico: una escritura       | 3,9 ms              | 0,04 ms            | 100 veces                 | Medida    |
| El chat solo pide lo nuevo                         | 42,4 kB y 0,74 ms   | 15 bytes y 0,05 ms | 2 800 veces menos datos   | Medida    |
| La participación se pregunta a su módulo           | 2,35 ms y 2,2 a 42  | 1,26 ms y ninguna  | Sin gasto de cuota de 42  | Medida    |
| Avisos calculados en el navegador                  | 60 peticiones/h     | 12 peticiones/h    | 5 veces menos             | Calculada |
| Un solo pulso de fondo; pestaña en reposo          | 60 peticiones/h     | 42 peticiones/h    | Un 30 % menos             | Calculada |
| Chat abierto y callado                             | 450 peticiones/h    | unas 120           | 3,7 veces menos           | Calculada |
| Pestaña oculta con un chat abierto                 | 510 peticiones/h    | 12 peticiones/h    | 42 veces menos            | Calculada |

![Peticiones de fondo por pestaña](docs/img/grafico-sondeos.svg)

Otras decisiones que cuentan:

- **Cada sección, en su trozo.** Al entrar se descargan 97 kB de JavaScript y
  27 kB de estilos (comprimidos). La red (17 kB), el juego (14 kB), el panel
  (12 kB) y el tablón (9 kB) solo bajan cuando se abren. Los datos simulados no
  entran en producción.
- **El análisis de la red se guarda un minuto** por combinación de filtros, y
  las cuentas las hace la API una vez, no cada navegador.
- **El historial que crece, a escalones.** Un trabajo cada hora deja un punto
  por hora pasado un día y uno por día pasada una semana.
- **Canvas y `ref`.** En los grafos, lo que cambia a cada fotograma no provoca
  repintados de React.
- **Sin nadie mirando, nada se mueve.** Con la pestaña oculta, otra ventana
  delante o 30 s sin tocar nada, todas las animaciones se pausan
  (`shared/still.ts`) y Code Clicker pasa de 10 refrescos por segundo a 1. Las
  animaciones que no paraban nunca (el punto que late, el brillo de las mejoras
  del juego, los degradados del estilo bichota) ahora se mueven unas veces y se
  quedan quietas: una sola animación infinita, aunque sea un punto de 8 px,
  obliga a sacar fotogramas sin descanso. Medido con trazas de Chrome sobre la
  versión de producción: Code Clicker en reposo pasa de componer fotogramas el
  80 % del tiempo a menos del 1 %, y una página con el estilo bichota, de
  rasterizar el 37 % del tiempo a nada.

Medido en producción el 12 de octubre de 2026, desde fuera de la máquina:

| Qué                                      | Valor                             |
| ---------------------------------------- | --------------------------------- |
| Primera respuesta de la portada          | 31 a 35 ms (145 ms en frío)       |
| Primera respuesta de `/api/health`       | 45 ms                             |
| Memoria de la app                        | 57 MiB (Caddy, 19 MiB)            |
| Carga media de la máquina                | 0,1                               |
| Tamaño medio de una respuesta            | 12,6 kB                           |
| Base de datos                            | 72 MB con 193 784 correcciones    |

**Lo que no está medido.** No se ha hecho una prueba de carga con muchas
personas a la vez. Las cifras de la base son de una sola conexión, y las de
peticiones por pestaña salen de los intervalos del código, no de tráfico real.

## Cuánta gente aguanta sin pagar

**Es una estimación.** Sale de dividir cada límite entre el consumo medido en
los dos primeros días de uso real (11 y 12 de octubre de 2026: 12 personas,
16 225 peticiones y 204 MB). Con tan poca gente, la media puede moverse mucho.

Consumo medido por persona y día: **554 peticiones y 10 MB** de media (la que
más, 6 189 peticiones y 124 MB).

| Límite                                | Tope               | Corte (90 %)  | Consumo por persona        | Aguanta, aproximadamente               |
| ------------------------------------- | ------------------ | ------------- | -------------------------- | -------------------------------------- |
| Tráfico de salida de Oracle           | 10 TB al mes       | 300 GB al día | 10 MB al día               | 30 000 personas al día                 |
| Presupuesto de peticiones (propio)    | 720 000 al día     | 648 000       | 554 al día                 | **1 170 personas al día**              |
| Cuota de la API de 42                 | 1 200 a la hora    | 900 sin la reserva | 12 a la hora con agenda al día | Unas 75 a 80 personas a la vez    |
| Memoria y procesador                  | 6 GB y 1 OCPU      |               | 57 MiB con 12 personas     | Sin prueba de carga: no se sabe        |

Cómo leerlo:

- El primer tope que se alcanza es el **presupuesto de peticiones, unas 1 170
  personas al día**. Es un tope propio, puesto en el código con margen, no un
  límite de Oracle: el tráfico de salida da para unas 25 veces más.
- La **cuota de 42** no limita cuánta gente entra, sino cuánta tiene su agenda
  de 42 recién actualizada (tres peticiones por persona cada 15 minutos). Por
  encima de unas 80 personas a la vez, las agendas se actualizan por turno y el
  resto de la web sigue igual, porque lee de la réplica.
- Para pasar de ahí bastaría subir el tope propio, y el tráfico de salida lo
  permitiría. No se ha subido porque no hace falta y porque falta la prueba de
  carga que diga cuánto aguantan la memoria y el procesador.
- Coste por persona: **0 €**, con 12 personas o con 1 170.

## Contexto entre sesiones de trabajo

El proyecto se desarrolla con un asistente de código, cuyo contexto se vacía o
se resume (se «compacta») cada cierto tiempo. Para que eso no cueste decisiones
ni trabajo repetido, lo que hay que recordar vive en el repositorio y no en la
conversación:

| Fichero                                                        | Qué guarda                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                         | Las normas: de código, de producto, de XP y de límites. Se leen siempre                            |
| [docs/contexto.md](docs/contexto.md)                           | El porqué: estado, decisiones tomadas con su motivo, cómo está el despliegue y qué conviene saber  |
| [docs/tareas-tras-compactar.md](docs/tareas-tras-compactar.md) | El qué: el plan vigente con casillas, en orden. Lo hecho se tacha; lo que ya no aplica se borra    |
| `docs/*.md`                                                    | Lo que no cabe en el código: contrato HTTP, arquitectura, rendimiento, despliegue y bugs abiertos  |

El procedimiento es siempre el mismo. Antes de compactar se ponen al día el plan
y el contexto. Al retomar, la orden «revisa y ejecuta las tareas tras compactar»
basta para seguir: se lee el plan y se ejecuta de arriba abajo, marcando cada
tarea. Los comentarios del código explican el porqué y no el qué, así que quien
llega sin contexto entiende también lo que no debe cambiar.

## Puesta en marcha

Hace falta Node 22.

```sh
npm install
cp apps/api/.env.example apps/api/.env     # y rellena las cinco obligatorias
npm run dev                                # API en :3000 y web en :5173
```

La web llama a `/api` y Vite lo reenvía a la API local. En la app de 42 la URL de
retorno para desarrollo es `http://localhost:3000/auth/callback`.

Para trabajar solo en la web, sin API ni credenciales:

```sh
npm run dev:mock
```

| Comando               | Qué hace                                              |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | API y web en modo desarrollo                          |
| `npm run dev:mock`    | Solo la web, con datos simulados en memoria           |
| `npm run check`       | Tipos, lint, formato y tests: lo mismo que pasa la CI |
| `npm test`            | Tests de la API y de la web                           |
| `npm run build`       | Compila la API y la web                               |
| `npm run sync:status` | Cuánto se ha copiado de 42 y de cuándo son los datos  |
| `npm run sync:run`    | Avanza la copia de 42 sin levantar el servidor        |

## Estado y límites conocidos

- En producción desde el 11 de octubre de 2026, con las primeras personas.
- Hay un [bug visual abierto](docs/bug-trozos-sin-pintar.md) en escritorio,
  pendiente de probar en más equipos y navegadores.
- Los avisos necesitan la web abierta: no hay notificaciones _push_.
- La personalización vive en el navegador, no en la cuenta.
- El consumo se mide por peticiones a esta web; el de la API de 42 solo en total.
- Las franjas que cada quien abre en 42 para corregir no se ven: haría falta el
  permiso `projects`, que la aplicación no pide.
- De la red solo se copian las correcciones del 42cursus, no las de la piscina.
- La web tiene tests de sus funciones puras; los componentes se prueban a mano
  con el cliente simulado y un navegador sin ventana.
- Catalán y euskera no cubren todavía todos los textos (874 de 1 215).
- Los mensajes de error de la API solo están en español.

## Futuras mejoras

- Prueba de carga, para cambiar la estimación de capacidad por una medida.
- Reservar una preevaluación como tal, con su propia XP.
- Notificaciones _push_ y recordatorios por correo.
- Guardar la personalización en la cuenta, para llevarla entre dispositivos.
- Desglose del gasto de la API de 42 por funcionalidad.
- Moderación: retirar un mensaje o cerrar una pizarra desde la propia denuncia.
- Aplicación instalable (PWA).
- Tests de componentes y de extremo a extremo.

## Documentación

- [docs/architecture.md](docs/architecture.md): capas, módulos, réplica de 42 y cómo ampliar.
- [docs/api.md](docs/api.md): contrato HTTP.
- [docs/revision-seguridad.md](docs/revision-seguridad.md): la revisión de seguridad, con cada hallazgo y su arreglo.
- [docs/rendimiento.md](docs/rendimiento.md): cada mejora con su antes, su después y cómo se midió.
- [docs/deploy-oracle.md](docs/deploy-oracle.md): despliegue, copias, límites y mantenimiento.
- [docs/code-clicker.md](docs/code-clicker.md): el juego y sus reglas.
- [docs/interfaz.md](docs/interfaz.md): categorías, modos, importancia de cada elemento, valoración de uso y dónde va algo nuevo.
- [docs/tests.md](docs/tests.md): qué cubre cada test, de qué guías sale y cómo se protege producción.
- [docs/textos.md](docs/textos.md) y [docs/textos/](docs/textos/README.md): las tablas de textos e idiomas, y su versión legible con el contexto de cada texto.
- [docs/demos.md](docs/demos.md): criterios, plantilla y pasos para las demostraciones animadas.
- [docs/bug-trozos-sin-pintar.md](docs/bug-trozos-sin-pintar.md): el bug abierto y su tabla de pruebas.
- [apps/web/src/themes/README.md](apps/web/src/themes/README.md): cómo crear un estilo.
- [AGENTS.md](AGENTS.md): normas del proyecto para asistentes de código.
- [docs/contexto.md](docs/contexto.md): estado del trabajo y decisiones tomadas, para retomarlo.
- [docs/tareas-tras-compactar.md](docs/tareas-tras-compactar.md): lo que hay que hacer al retomar, en orden.
