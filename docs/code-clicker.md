# Code Clicker: qué se ha copiado del original y por qué

Code Clicker es la sección secreta de Sanatorio 42: una recreación de Cookie
Clicker con tema de programación. Este documento recoge el análisis del original
y de lo que se ha escrito sobre el género, y qué se ha aplicado de cada cosa. Las
reglas están en `apps/web/src/features/clicker/engine.ts`; la progresión (costes,
producción, umbrales) es la del original y no se toca.

## 1. Qué hace que el original parezca vivo

Cookie Clicker no tiene una sola animación llamativa: tiene muchas pequeñas, y
casi todas dicen algo del estado de la partida.

| En el original | Qué comunica | En Code Clicker |
| --- | --- | --- |
| La galleta crece al pasar el ratón, se encoge al pulsar y rebota | Cada pulsación ha contado | La tecla baja, y rebota con un muelle que se reinicia en cada pulsación |
| Sale un `+N` que sube y se desvanece, y migas que caen | Cuánto ha dado esa pulsación | `+N`, una onda desde el punto pulsado y tres símbolos de código que saltan y caen |
| Rayos de luz que giran detrás de la galleta | Es el centro de la pantalla | Rayos que giran detrás de la tecla; dorados y rápidos durante una racha |
| Un anillo de cursores alrededor que la pulsan por turnos | Cuántos cursores tienes, y que trabajan solos | Dos anillos (hasta 52 cursores) que giran despacio y pulsan en oleada |
| Lluvia de galletas, más densa cuanta más producción | Tu producción por segundo, sin leer el número | Lluvia de código en cuatro densidades; dorada y al doble de velocidad en una racha |
| Leche con oleaje que sube con los logros y cambia de sabor cada 25 | Tus logros, de un vistazo | Un líquido con oleaje que sube con los logros y cambia de bebida cada 25 |
| Una fila por edificio, con su fondo y un muñeco por unidad | Lo que has construido, como un pueblo que crece | Una fila por edificio con fondo propio y una ficha por unidad, que entra con un salto y se mece |
| La galleta dorada aparece poco a poco, se balancea y se va | Hay que estar atento: es azar y dura poco | La pull request dorada aparece, se balancea y se desvanece; al abrirla estalla y dice qué ha dado |
| Productos en gris si no llega, precio en verde o rojo, silueta y `???` si no se conocen | Qué puedes comprar ya y qué hay más allá | Lo mismo, más una barra que se llena según lo cerca que estás de poder pagarlo |
| Las mejoras brillan cuando se pueden comprar | Hay algo nuevo que hacer | Entran con un salto, laten cuando llega el dinero y llevan su barra cuando no |
| La pestaña del navegador dice cuántas galletas tienes | El juego sigue aunque mires otra cosa | La pestaña dice cuántas líneas llevas |
| Con el Grandmapocalypse cambian el fondo, las abuelas y las noticias | Algo va mal, y lo has hecho tú | Cambian los colores, las noticias, las ventanas del campus y los pisciners; al final la tecla te mira |
| Los wrinklers se pegan a la galleta | Te están comiendo producción | Los bugs se pegan alrededor de la tecla y la roen |

## 2. La ficha: saber qué hace algo antes de comprarlo

En el original, al pasar por un edificio sale: nombre, precio, cuántos tienes,
una frase, lo que produce cada uno, lo que producen entre todos con su tanto por
ciento del total y lo producido hasta ahora. En una mejora: nombre, precio, tipo
y efecto. Lo que no se ha descubierto sale como `???`.

Code Clicker enseña todo eso (`cards.ts`, `Card.tsx`) y añade tres cuentas que en
el original hay que hacer de cabeza o con una extensión (`insight.ts`):

- **Cuánto sube la producción** al comprarlo, en líneas por segundo y en tanto
  por ciento. Se calcula comprando de mentira, así que sirve para cualquier
  mejora, también las que interactúan entre sí.
- **Cuánto falta** para poder pagarlo al ritmo actual.
- **En cuánto se paga solo**: precio entre lo que sube la producción. Es la
  cifra que de verdad compara dos compras.

No se destripa nada: un edificio sin descubrir o un logro sin conseguir no
cuentan lo que son, y las mejoras solo salen cuando el juego las desbloquea.

En pantalla táctil no hay "pasar por encima": el primer toque enseña la ficha y
el segundo compra.

## 3. Qué dicen los análisis del género

- **El bucle es de esperar, no de pulsar.** El estudio de CHI 2018 sobre 66
  juegos del género ("Playing to Wait") describe cómo pasan a quien juega de
  jugar a planificar: se empieza pulsando y se acaba decidiendo qué comprar y
  volviendo a mirar. De ahí que la tienda tenga que explicar bien cada compra.
- **Coste exponencial, producción lineal.** Es la base matemática (Pecorella,
  "The Math of Idle Games"): cada unidad cuesta un 15 % más y produce lo mismo,
  así que siempre hay algo casi al alcance y nunca se termina. Las mejoras que
  doblan sirven para que la producción alcance de nuevo a los costes.
- **Siempre un objetivo cerca.** Lo que retiene es ver el siguiente hito a punto
  de caer. Por eso hay barra de nivel, barras de "cuánto te falta" en la tienda
  y la silueta de los dos edificios siguientes.
- **Recompensa de razón variable.** La pull request dorada sale cuando quiere y
  da cosas distintas: es lo único del juego que no se puede planificar, y lo
  que hace que se mire la pantalla.
- **Respuesta inmediata y exagerada** ("juice"): que cada acción tenga varias
  señales a la vez (movimiento, número, partículas, sonido) aunque el efecto
  real sea pequeño.
- **El giro oscuro.** La curiosidad por lo que viene después sostiene el juego
  cuando los números ya no dicen nada.
- **Prestigio.** Cuando la espera se hace larga, empezar de cero con ventaja
  vuelve a dar la sensación de avance rápido del principio.

## 4. Lo que no se ha hecho, a propósito

- **Nada que empuje a volver por obligación**: ni avisos fuera de la web, ni
  producción que se pierde si no entras, ni rachas diarias. Es un juego
  escondido en una herramienta de estudio, no un producto que viva de retener.
- **El sonido viene apagado.** Está (sintetizado, sin ficheros), pero en un
  cluster no se enciende solo.
- **No se han copiado imágenes ni código del original.** Los dibujos son
  vectoriales y están en `art.tsx` y `scene.tsx`.
- **Faltan del original**: minijuegos, mejoras celestiales, temporadas y el
  dragón.

## Fuentes

- Alharthi, Alsaedi, Toups Dugas, Tanenbaum y Hammer, "Playing to Wait: A
  Taxonomy of Idle Games", CHI 2018: <https://doi.org/10.1145/3173574.3174195>
- Anthony Pecorella, "The Math of Idle Games, Part I":
  <https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i>
- Eric Guan, "Idle Game Design Principles":
  <https://ericguan.substack.com/p/idle-game-design-principles>
- "Cookie Clicker & the Strange Satisfaction of Doing Almost Nothing":
  <https://mechanicsofmagic.com/2025/05/24/cookie-clicker-satisfaction-of-doing-nothing/>
- Wiki de Cookie Clicker (leche, edificios, producción):
  <https://cookieclicker.wiki.gg/wiki/Milk>, <https://cookieclicker.wiki.gg/wiki/Building>

## Guardado

La partida se guarda en el navegador cada 10 s y en la API cada minuto, al
ocultar la pestaña y al salir del juego. El tiempo con la web cerrada no
produce; con la pestaña abierta, sí (también de noche).

Al entrar se sigue con la copia del navegador si salió de la misma `rev` que
tiene la API (es la misma partida, guardada aquí después) y es de la misma
persona (`sanatorio_clicker_owner`); si no, con la de la API. Arreglado el
2026-10-26: con la pestaña abierta toda la noche, la sesión (12 h) caducaba de
madrugada, los guardados en la API fallaban sin avisar y por la mañana se
entraba con el último guardado bueno: se perdían esas horas. Una partida
rechazada por trampa no se recupera así: al volver a guardarla, la API la
rechaza otra vez.

## Trampas

La partida la lleva el navegador, así que quien quiera puede tocarla. La API no
juega, pero comprueba en cada guardado que las cuentas salen
(`apps/api/src/modules/clicker/cheat.rules.ts`):

- Lo que hay sin gastar más lo que costó lo que se tiene no puede pasar de lo
  escrito en la partida. Los edificios los cuenta la API; las mejoras, la web.
- Lo escrito desde el último guardado no puede pasar de lo que da tiempo, con
  la mejor racha, las pulsaciones contadas y los bugs que había pegados. El
  tiempo es el del servidor, así que adelantar el reloj no sirve.
- Las líneas por segundo y el prestigio no pueden pasar de lo que cabe con lo
  escrito en total.

Los márgenes son anchos a propósito: pillar a quien no ha hecho nada sale más
caro que dejar pasar una trampa pequeña. Quien se sepa las reglas puede ir algo
más rápido de lo normal sin que se note; lo que no puede es dar un salto.

Qué pasa al pillar una:

1. **Primera**: no se guarda, la partida vuelve a la buena, título «Hacker
   ético» en el banner y logro.
2. **Segunda**: el título pasa a «Hacker poco ético», y otro logro.
3. **Tercera**: «Hacker desencriptado», el último logro, y se venden todos los
   edificios a la mitad de lo que costaron (lo normal es un 25 %). Las mejoras
   se quedan.
4. **De la cuarta en adelante**: se vende todo otra vez, el título lleva al lado
   las veces que van, y sale uno de diez mensajes, cada vez más cansados.

El título se pone solo en el banner cada vez; quien quiera puede cambiarlo por
otro en su expediente. En el panel de gestión, la pestaña Code Clicker enseña a
quién se ha pillado, cuántas veces y por qué la última.

### Indulto

Cada partida rechazada se guarda tal como llegó. Si resulta que no era trampa,
quien administra la indulta desde la ficha de esa persona en el panel: esa
partida pasa a ser la que está en curso, se le descuenta la trampa, se anula la
venta pendiente y el banner vuelve al título que tenía. La copia se borra.

### Capital

El capital es todo lo que vale una partida: las líneas sin gastar, lo que costó
lo comprado y lo que devolverán los bugs. Comprar no lo mueve y aplastar un bug
tampoco, así que jugando limpio sube poco a poco y un salto se ve.

La web lo apunta cada segundo y lo manda con cada guardado. La API mira esos
segundos al llegar y guarda el historial para siempre, cada vez con menos
detalle: lo del último día, un punto cada diez segundos; lo de la última
semana, uno por hora; lo anterior, uno por día. Es lo que pinta la gráfica de
las estadísticas, en escala logarítmica, con tramos de un toque, dos fechas a
mano y arrastrar para acercarse. Si en diez segundos o
menos el capital se multiplica por tres o más y el guardado no se ha dado por
trampa, queda un aviso en el panel con el segundo a segundo de alrededor. No
castiga a nadie: es para mirarlo. Una pull request dorada con racha de
pulsaciones puede dar un salto así jugando limpio, y el aviso lo dice.

## El juego sigue fuera de su sección

Quien eligió la roja lleva el juego puesto en toda la web, no solo en su
sección: está pensado para que se tenga Sanatorio abierto, no solo el juego.
En cualquier otra sección sigue haciendo cuentas (una vez por segundo, que
basta) y guardando, y en la pila de ventanitas de la esquina (`shared/dock`)
sale una con las líneas que se llevan; concentrado (Pomodoro), no. Pulsarla lleva al juego; la cruz la quita, y se vuelve a poner con el
botón «Ventanita» del juego. Las pull requests doradas siguen saliendo solo
dentro del juego: fuera no se ven, así que se pierden.

## Noticias y café

El rótulo de noticias va en grande, como el de un informativo, con una raya que
dice cuánto falta para la siguiente (unos veinte segundos). Salen barajadas y no
se repite ninguna hasta haberlas dado todas. Hay una tanda por época de la
partida, otra por cada fase de la singularidad y cuatro más que entran al
recompilar la realidad, según el prestigio que se lleve (1, 5, 25 y 100): cada
una más desmedida que la anterior.

La gente que sale en las noticias es la de cada jugador: las personas con las
que más se ha corregido (le corrigieron o las corrigió), de más a menos. Si son
pocas, se completa con quienes más corrigen en su campus (`namesFor` en
`clicker.service.ts`).

El café del fondo es líquido de verdad: tres olas que se cruzan, burbujas y, de
vez en cuando, un chorro que cae y salpica. Cada patito de goma comprado flota
en él (hasta cuatro a la vez).
