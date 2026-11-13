# Curso de NetPractice

Un curso para entender las redes IPv4 que pide NetPractice, el proyecto de
redes de 42: direcciones y máscaras, red y broadcast, subredes, switch frente a
router, puerta de enlace, tablas de rutas y por qué dos máquinas se alcanzan o
no (ida **y** vuelta). Pedido por Alberto el 2026-11-13. Sigue la
[plantilla de cursos](plantilla-cursos.md): cada conocimiento tiene **teoría,
ejemplo y prueba**, cada bloque acaba en un **jefe contrarreloj** y cada nivel
en un **jefe final** que da su certificado. Está en Aprender, pestaña «Curso de
NetPractice» (`#/cursonet`), y los certificados salen también en el perfil.

Lo que tiene de distinto de los otros cursos:

- **La prueba no es una terminal: es un esquema de red que se configura.** Se
  ve la red dibujada, con valores bloqueados y valores por rellenar (IP,
  máscara, puerta de enlace, destino y siguiente salto de una ruta), y unos
  objetivos («staging alcanza a db»). Al pulsar «Comprobar», el paquete se
  anima por el esquema y, si no llega, **se para donde muere y dice por qué**.
- **Unidades de cuentas** al principio: dada una dirección con su máscara, sacar
  red, broadcast, primera y última máquina; con los **32 bits a la vista**, que
  se tocan.
- **Las estrellas de una unidad cuentan comprobaciones**, no comandos: ★★★ a la
  primera.

Los escenarios son propios (la oficina y los servidores de Peer4U): **no son
los diez niveles de NetPractice ni sus datos**. Quien lo acabe los resuelve
entendiendo, no de memoria.

## Los niveles

### Principiante: direcciones y la primera red

| Bloque | Unidades (qué pide su prueba) | Jefe (límite) |
| --- | --- | --- |
| 1. Direcciones y máscaras (cuentas) | octetos y la red con /8, /16 y /24 · la máscara como prefijo y en decimal · red y broadcast · primera, última y cuántas caben · máscaras que cortan un octeto (/26, /27) | El inventario de direcciones: tres redes con máscaras distintas (5 min) |
| 2. La misma red | dos máquinas en un cable (una IP de la misma red) · el switch (tres máquinas, una red) · elegir una dirección del rango con una máscara /27 · la de red y la de broadcast no se dan (un /30) · loopback y rangos reservados | La impresora de la sala: un broadcast, una IP repetida y una máscara que no cuadra (5 min) |
| 3. El router | un pie en cada red (numerar sus interfaces) · la puerta de enlace · ida y vuelta (llega, pero no contesta) · montar una red entera detrás del router | El staging no llega a la base de datos (6 min) |
| **Jefe final** | Tu primera oficina: tres redes colgadas de un router, con lo que falta por numerar | 10 min |

### Intermedio: subredes, rutas e internet

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 4. Subredes | partir un /24 en dos /25 · el enlace de /30 entre dos routers · qué máscara para cuántas máquinas (cuentas) · subredes que se pisan | Tres equipos, un solo /24: 100, 50 y 20 direcciones (7 min) |
| 5. Tablas de rutas | una ruta: destino y siguiente salto · la ruta por defecto · la ruta de vuelta · el siguiente salto es un vecino · gana la ruta más concreta | El monitor se ha quedado ciego: tres routers y tres tablas (8 min) |
| 6. Salir a internet | privadas y públicas · la salida (puerta + ruta por defecto) · que internet sepa volver (una ruta que cubra dos redes) | La demo sale en directo (8 min) |
| **Jefe final** | La mudanza: dos plantas, un rango público partido en dos, dos routers y una salida | 12 min |

### Avanzado: diagnóstico y diseño

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 7. Diagnóstico (redes ya numeradas con un fallo) | la máscara que miente · direcciones repetidas · llega, pero no vuelve | Guardia de noche: tres tickets, tres valores mal (8 min) |
| 8. Diseño de direcciones | subredes de tamaños distintos (VLSM) · tres routers en fila · una ruta para cuatro redes (resumir en /22) | El plan de direcciones del campus: 300, 60 y 2 en un /22 (9 min) |
| 9. Varios caminos | bucles (se acaban los saltos) · dos salidas (dentro y fuera) · un servidor visible desde internet | Producción partida en dos (9 min) |
| **Jefe final** | La red entera de Peer4U: zona pública, oficina, centro de datos e internet, a medio numerar y con cuatro valores mal | 15 min |

En total: 35 unidades (14 de principiante, 12 de intermedio y 9 de avanzado), 9
jefes y 3 jefes finales: 47 puntos.

## Cómo se explica

Cada unidad sigue [plantilla-explicacion.md](plantilla-explicacion.md): la idea
en una línea, por qué importa, la demostración, el **error típico con su
síntoma literal** (el mensaje que da el simulador) y el contraste, dentro del
límite de palabras de su nivel (130, 100 y 80; un test lo comprueba en
castellano y en inglés).

- **El ejemplo lo ejecuta el motor.** Empieza por la pregunta de predicción
  («Antes de verlo: si leo tuviera 192.168.2.20, ¿dónde moriría el paquete de
  ana?»). En un esquema, al pulsar «Lanzar el paquete» se ve la red **con el
  error típico** (lo cambiado, resaltado), el paquete se para donde muere y se
  lee por qué; después, «Verlo arreglado» anima la misma red bien puesta. La
  red del ejemplo no es la de la prueba, para no regalar la respuesta: son tres
  redes conocidas (`ana — r1 — db`, la de dos routers y la que sale a internet)
  que se repiten, cada vez con un fallo distinto. En las cuentas, el ejemplo es
  una dirección con sus bits y, al destaparla, lo que calcula el motor.
- **Los 32 bits que se tocan** (`Bits.tsx`): cada bit cambia al pulsarlo y
  debajo se ve el número de su octeto; la parte de red y la de máquina van de
  distinto color y con distinto borde, con una raya donde acaba la red. Dos
  botones ponen la máquina toda a 0 o toda a 1, que es justo lo que son la
  dirección de red y la de broadcast. En las preguntas de máscaras, un mando
  mueve cuántos bits son de red y se ve la máscara en sus dos formas y cuántas
  caben.

## El simulador: por qué muere un paquete

`ping` (en `packages/netsim/src/ping.ts`) sigue el paquete salto a salto en la
ida y en la vuelta. Cada nodo decide como una máquina de verdad, con **su** IP,
**su** máscara y **su** tabla:

1. Si el destino es una de sus direcciones, ha llegado.
2. Si el destino cae en la subred de una de sus interfaces, lo entrega por ese
   cable a quien tenga esa IP (a través de los switches que haya).
3. Si no, usa la ruta más concreta que le sirva (el prefijo más largo; la ruta
   por defecto es `/0`) y se lo pasa al siguiente salto, que tiene que ser
   vecino suyo.
4. Sin ruta, lo tira. Una máquina no reenvía lo que no es suyo; un router sí.

Si no llega, la traza dice dónde y con qué código. Esa es la base del curso:

| Código | Qué pasó | Dónde se ve |
| --- | --- | --- |
| `empty` · `bad_ip` · `bad_mask` · `bad_route` | Falta un valor o está mal escrito | Antes de salir, en el nodo |
| `network_address` · `broadcast_address` | La IP es la de red o la de broadcast de su subred | En el nodo |
| `reserved` | Loopback (127.x), 0.x, multicast o reservada | En el nodo |
| `duplicate` | Otra interfaz tiene la misma IP: ninguna de las dos recibe | En los dos nodos |
| `overlap` | Dos interfaces de un router en subredes que se pisan | En el router |
| `no_route` | No es de sus redes y no hay ruta ni puerta que sirva | Donde se queda sin camino |
| `gateway_outside` | El siguiente salto no está en ninguna de sus redes | En quien tiene la ruta |
| `gateway_absent` | Nadie en ese cable tiene la IP del siguiente salto | En quien tiene la ruta |
| `wrong_segment` | Por su máscara cree vecino a un destino que está en otra red | En la máquina de la máscara |
| `nobody` | El destino debería estar en su cable y nadie lo tiene | En el último salto |
| `not_router` | El siguiente salto es una máquina, que no reenvía | En esa máquina |
| `private_internet` | Internet tira las direcciones privadas | En internet |
| `loop` | Da vueltas entre routers y se le acaban los saltos (16) | Donde se acaban |

El texto de cada código está en la tabla de textos (`net.death.*`), en los cinco
idiomas, con sus datos («r2 no tiene ruta hacia 10.0.1.10»).

### Lo que el simulador hace distinto de una red de verdad

- **No hay NAT**: como en NetPractice, internet tira cualquier paquete con una
  dirección privada (origen o destino). La unidad de privadas y públicas lo
  dice.
- **Una IP repetida no llega a ningún sitio.** En una red de verdad contestaría
  una de las dos, a ratos.
- **Dos interfaces de un mismo router no pueden estar en subredes que se
  pisan**: el router entero deja de reenviar.
- **Un nodo mal configurado no manda ni recibe nada**, aunque el fallo esté en
  otra de sus interfaces.
- Solo IPv4, sin ARP, sin DHCP y sin VLAN: un switch une todo lo que cuelga de él.

## Estrellas y tiempo

- **Unidades**: por comprobaciones (`checkGoals` de `@sanatorio/course`, la
  regla hermana de `commandGoals`): ★★★ a la primera, ★★☆ con hasta tres
  comprobaciones y ★☆☆ con más. Cuenta cada vez que se pulsa «Comprobar»,
  acierte o no; rellenar, borrar y tocar los bits no cuenta. Se guarda la mejor
  vez.
- **Jefes**: por tiempo (`timeGoals`), con el reloj de la API.
- **Se comprueba lo que hace la red, no lo que se escribió**: en un esquema vale
  cualquier configuración con la que se cumplan los objetivos (cualquier
  dirección del rango, `default` o `0.0.0.0/0`, una ruta que resuma). En las
  cuentas, la respuesta la calcula el motor; una IP vale con espacios
  alrededor, y cada forma de máscara es la suya (`/26` no vale donde se pide
  `255.255.255.192`).

## Tiempo estimado

Con el modelo común (`docs/plantilla-cursos.md`), a 2026-11-13. En vez de
órdenes se cuenta lo que se rellena: dos campos valen por una orden.

| Nivel | Bloques | Tiempo |
| --- | --- | --- |
| Principiante | 37 + 30 + 28 min, y el jefe final | ~1 h 50 min |
| Intermedio | 31 + 32 + 26 min, y el jefe final | ~1 h 46 min |
| Avanzado | 28 + 31 + 29 min, y el jefe final | ~1 h 49 min |
| **Todo el curso** | | **~5 h 25 min** |

## Orden entre cursos

No sugiere hacer antes ningún otro curso (`CourseOrderHint` no sale): las redes
no dependen de la shell, de git ni de Docker. Por eso tampoco entra en los
logros del orden sugerido ([cursos-logros.md](cursos-logros.md)). Dentro del
curso, el camino se abre de uno en uno.

## Logros y títulos

Cinco, como los de Docker y Kubernetes ([cursos-logros.md](cursos-logros.md)):
el primer punto (`net_first`, «ping 127.0.0.1»), cada certificado
(`net_beginner` «En mi subred funciona», `net_intermediate` «Ruta por defecto»,
`net_advanced` «Enruta medio internet») y todos los jefes con tres estrellas
(`net_bosses`, «0 % packet loss»). Dan XP (10, 25, 40, 60 y 50), se celebran al
conseguirlos y su banner es el de las máquinas unidas a un router. El curso
tiene además su clasificación en Campus → Clasificaciones.

## Cómo está hecho

- `packages/netsim`: el motor, en TypeScript puro (sin ficheros, sin red de
  verdad y sin `eval`; un test lo comprueba) y con topes (`limits.ts`: nodos,
  interfaces, rutas, cables, saltos, largo de un campo y de un intento).
  - `ip.ts`: leer y escribir direcciones y máscaras, red, broadcast, rango,
    cuántas caben, la máscara justa para tantas máquinas, privadas y reservadas.
  - `model.ts`: la red como datos planos (nodos `host`, `router`, `switch` e
    `internet`, con sus interfaces y rutas; cables) y la traza de un ping.
  - `ping.ts`: la validación de cada nodo y el viaje del paquete.
  - `course/`: las unidades (`beginner.ts`, `intermediate.ts`, `advanced.ts`),
    los bloques, la estimación y `check.ts`. Un esquema se escribe **resuelto**
    (`build.ts` lo deja en pocas líneas) y se dice qué valores se vacían
    (`fields`) o con qué valor roto empiezan (`start`): la solución no se
    escribe aparte, y el objetivo sale de lanzar los pings sobre ella (si la
    red resuelta no los cumple, o la de partida ya los cumple, la unidad falla
    al cargarse).
- `apps/api/src/modules/netcourse`: el mismo servicio que los cursos de
  terminal (`createShellCourseService` con este motor y sus tablas, migración
  92). Lo que viaja en un intento son las **comprobaciones** hechas: cada vez
  que se pulsó «Comprobar», todos los campos en JSON. La API las vuelve a mirar
  en orden hasta la primera que acierta y cuenta cuántas hicieron falta.
- `apps/web/src/features/netcourse`: el camino pintado como una red
  (`NetCourseTab.tsx`), la unidad (`UnitView.tsx`), el ejemplo (`Example.tsx`),
  la prueba (`Challenge.tsx` con `SchemeBoard.tsx` o `CalcBoard.tsx`), el
  dibujo (`Diagram.tsx`, SVG), la animación (`frames.ts`, `Trip.tsx`) y los bits
  (`Bits.tsx`). Estilos en `styles/netcourse.css`.

### En el móvil y para todo el mundo

- El esquema se pinta a tamaño fijo (la letra no baja de 12 px) y, si no cabe,
  **se desplaza dentro de su caja**, nunca la página. Debajo, los objetivos y
  las fichas se apilan en una columna.
- Lo que se rellena son campos de formulario de verdad, con su nombre («IP de
  cache», «Destino de la ruta 1 de r1»), no partes del dibujo: se usan con
  teclado y con lector de pantalla. Intro comprueba.
- Lo que hay que rellenar no se distingue solo por el color: va subrayado en el
  dibujo; la parte de máquina de los bits, con borde discontinuo.
- Con «reducir movimiento», el paquete no se anima: se ve dónde acaba y la
  misma explicación.
- Con el dedo, los bits y el botón de ver cada objetivo miden 44 px.

## Tests

- `apps/api/tests/unit/netsim.test.ts`: las cuentas, cada muerte del paquete
  con su código, los topes, lo imprevisible y que el motor no importa nada del
  sistema.
- `apps/api/tests/unit/netsim-course.test.ts`: cada punto se gana con su
  solución con ★★★ y no empieza ganado; valen otras soluciones correctas; las
  estrellas cuentan las comprobaciones; el ejemplo llega y con su error típico
  muere; forma del camino, nombres que caben en el dibujo y textos en los dos
  idiomas dentro del límite.
- `apps/api/tests/unit/netcourse.test.ts`: el servicio (orden, volver a mirar,
  la mejor vez, reloj de los jefes, certificado, logros, topes).
- `apps/web/tests/ui/netcourse.test.tsx` y `tests/netcourse-frames.test.ts`: el
  recorrido entero, las cuentas con sus bits, un esquema con routers, un jefe y
  los fotogramas del paquete.

## Dudas abiertas

- **Las comprobaciones fallidas las cuenta el navegador.** La API vuelve a
  mirar todas las que recibe y no se fía del resultado, pero quien mande a mano
  solo la buena se lleva ★★★ (como quien copia la solución en un curso de
  terminal). Contarlas en el servidor pediría una llamada por comprobación.
- Los límites de los jefes y las estimaciones son de partida: se ajustarán con
  `course_times` (curso `net`).
- No hay francés en las unidades (se enseña el inglés) ni preguntas del curso
  en Not-games todavía.
