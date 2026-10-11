# Rendimiento: antes y después de la revisión

Comparación entre el código anterior a la revisión (`9607be6`) y el actual, a
2026-10-11. Cada cifra dice si está **medida** o **calculada**, y cada mejora
cuenta qué se hacía antes, qué se hace ahora y por qué es más rápido.

## Resumen

| Qué | Antes | Ahora | Mejora |
| --- | --- | --- | --- |
| Detalle de una pareja en la red de correcciones | 15,7 ms | 0,25 ms | 63 veces |
| Con quién se ha corregido una persona | 34,4 ms | 0,36 ms | 95 veces |
| Una escritura suelta en la base | 3,9 ms | 0,04 ms | 100 veces |
| Refrescar un chat con 200 mensajes | 42,4 kB y 0,74 ms | 15 bytes y 0,05 ms | 2 800 veces menos datos |
| Saber si alguien participa en un evento | 2,35 ms y 2,2 peticiones a 42 | 1,26 ms y ninguna | sin gasto de cuota |
| Peticiones de una pestaña en reposo | 60 a la hora | 42 a la hora | un 30 % menos, con buzón y cuota incluidos |
| Peticiones con un chat abierto y callado | 450 a la hora | unas 120 a la hora | 3,7 veces menos |
| Peticiones con la pestaña oculta y un chat abierto | 510 a la hora | 12 a la hora | 42 veces menos |

Las cinco primeras filas están medidas; las tres últimas, calculadas a partir de
los intervalos.

## 1. Estadísticas de la base (medido)

**Dónde**: `core/db/database.ts` (`tune` y `maintain`) y un trabajo cada seis
horas en `modules/replica/index.ts`.

**Antes.** La base nunca había pasado por `ANALYZE`. SQLite decide qué índice
usar con unas estadísticas que guarda en la tabla `sqlite_stat1`; sin ellas no
sabe cuántas filas hay detrás de cada valor y elige por reglas fijas. En la
tabla de correcciones (85 925 filas en Madrid) eso salía mal en dos consultas:

- *Detalle de una pareja* (`corrector = A y corregido = B, o al revés`, ordenado
  por fecha): elegía el índice por fecha, porque le ahorraba ordenar, y recorría
  **todas las correcciones del campus** descartando una a una las que no eran de
  esa pareja.
- *Con quién se ha corregido una persona*: para buscar por `corrector` usaba el
  índice de `corrected` solo por el campus, es decir, otra vez todo el campus.

**Ahora.** Al abrir la base, si no hay estadísticas se ejecuta `ANALYZE` (tarda
milisegundos), y `PRAGMA optimize` las mantiene.

**Por qué mejora.** Con estadísticas, SQLite sabe que una persona tiene decenas
de correcciones y el campus decenas de miles: va derecho por el índice de esa
persona y lee unas pocas filas. El plan de la pareja pasa de «recorrer el índice
de fechas» a «dos búsquedas por índice y juntar». De 15,7 a 0,25 ms y de 34,4 a
0,36 ms. Las consultas no se han tocado: solo cambia cómo las ejecuta SQLite.

Las agregaciones de todo el campus (el grafo entero, el ranking de proyectos) no
cambian, unos 40 ms antes y después: de verdad tienen que leerlo todo.

## 2. WAL en vez del diario clásico (medido)

**Dónde**: `core/db/database.ts` (`tune`), solo para bases en disco.

**Antes.** SQLite estaba en su modo de fábrica (`journal_mode = DELETE`,
`synchronous = FULL`). En ese modo cada escritura crea un fichero de diario con
una copia de lo que va a cambiar, lo fuerza a disco, escribe en la base, la
fuerza a disco y borra el diario. Y mientras alguien escribe, nadie puede leer.

**Ahora.** `journal_mode = WAL` y `synchronous = NORMAL`. Las escrituras se
añaden al final de un fichero aparte (`-wal`) y se pasan a la base de vez en
cuando, por lotes.

**Por qué mejora.** Lo caro de una escritura no es escribir, es esperar a que el
disco confirme (`fsync`). El modo clásico espera varias veces por escritura; WAL
con `NORMAL` espera una vez por lote. De 3,9 a 0,04 ms por escritura. Y lo que
no se ve en esa cifra: con WAL quien lee ve la base como estaba al empezar su
lectura aunque el sincronizador esté escribiendo, así que las visitas ya no
esperan a la copia de 42. Esto último no está medido: es lo que garantiza el
modo.

`NORMAL` con WAL sigue siendo seguro si el proceso se cae; solo un corte de luz
podría perder las últimas escrituras, nunca corromper la base. Las copias
(`VACUUM INTO`) y la restauración ya contaban con los ficheros `-wal` y `-shm`.

## 3. El chat solo pide lo nuevo (medido)

**Dónde**: `modules/meet/meet.service.ts` (`thread`, parámetro `after`) y
`features/alerts/useThread.ts`.

**Antes.** Con un chat abierto, la web pedía el chat **entero** cada 8 segundos:
hasta 200 mensajes, con su consulta, su búsqueda de fotos de perfil y su JSON,
aunque nadie hubiera escrito. 42,4 kB por sondeo.

**Ahora.** La web recuerda el `id` del último mensaje que tiene y lo manda
(`after`); la API devuelve solo los posteriores. Además la espera crece (8, 12,
18, 27 y 30 segundos) mientras nadie escribe, vuelve a 8 en cuanto llega algo,
y con la pestaña oculta no se pregunta.

**Por qué mejora.** Casi todos los sondeos de un chat no traen nada. Antes esa
nada costaba releer y mandar 200 mensajes; ahora cuesta una consulta por índice
que no encuentra filas y una respuesta de 15 bytes. Y hay menos sondeos: de 450
a unos 120 a la hora con el chat callado.

## 4. La participación se pregunta a quien lo sabe (medido)

**Dónde**: `modules/meet/meet.service.ts` (`assertParticipant`).

**Antes.** Para saber si alguien podía leer o escribir en el chat de una pizarra
se calculaba su **calendario entero** de las próximas dos semanas y se buscaba
ahí el evento. El calendario junta pizarras, terapias, reservas de ayuda y la
agenda de 42 de esa persona, que cuando caduca son tres peticiones a la API de
42. De media, 2,2 peticiones a 42 por comprobación.

**Ahora.** Se mira el tipo de evento y se pregunta solo a su módulo: una pizarra
a `boards`, una reserva a `help`, una terapia a `therapy`. El calendario
completo solo se calcula para lo que es de 42 (correcciones, eventos).

**Por qué mejora.** Se deja de hacer trabajo que no hacía falta, y sobre todo
se deja de gastar cuota de 42 (1 200 peticiones por hora para toda la web) en
algo que no tiene que ver con 42. La cifra en milisegundos es con 42 simulada,
que contesta al instante; contra la de verdad, cada petición ahorrada son
décimas de segundo.

## 5. Los avisos se calculan en el navegador (calculado)

**Dónde**: `features/alerts/AlertCenter.tsx`.

**Antes.** Cada pestaña abierta pedía el calendario cada minuto para ver si algo
estaba a punto de empezar. Es la petición de fondo más cara (la del punto
anterior) y casi siempre devolvía lo mismo.

**Ahora.** El calendario se pide cada cinco minutos y se guarda; cada treinta
segundos se compara la hora con lo guardado, sin pedir nada.

**Por qué mejora.** Lo que cambia cada minuto es la hora, no el calendario. De
60 a 12 peticiones por pestaña y hora, y el aviso sale igual de puntual. A
cambio, algo creado hace menos de cinco minutos puede avisar con ese retraso.

## 6. Un solo pulso de fondo (calculado)

**Dónde**: `modules/notices/index.ts` (`GET /pulse`) y
`shared/hooks/usePulse.ts`.

La revisión ha añadido dos cosas que necesitan preguntar de fondo: el rótulo de
la cuota de 42 y el número de avisos sin leer del buzón. En vez de un sondeo
para cada una, hay una sola petición cada dos minutos que trae las dos, y no se
hace con la pestaña oculta. Son 30 peticiones a la hora, baratas (dos consultas
por índice). Por eso la pestaña en reposo queda en 42 a la hora y no en 24: las
18 de diferencia son el precio del buzón.

## 7. Lo demás

- **Índice para el tope de mensajes** (migración 21): contar los mensajes de
  alguien en el último minuto recorría la tabla entera; ahora va por
  `(login, created_at)`.
- **Descarga al entrar**: unos 135 kB comprimidos, igual que antes. Cada sección
  va en su trozo y los datos simulados no entran en producción.

## Cómo se ha medido

- **Base**: sobre una copia de la base real de desarrollo, con el mismo cliente
  que usa la API. Media de 200 consultas sobre las 40 parejas con más
  correcciones, y de 300 escrituras. «Antes» es la copia sin estadísticas y con
  el diario clásico; «ahora», con `ANALYZE` y WAL.
- **API**: el mismo guion ejecutado sobre los dos commits, con los servicios de
  verdad sobre SQLite en memoria y la API de 42 simulada, en un campus con 40
  pizarras y un chat de 200 mensajes.
- **Web**: cuentas a partir de los intervalos del código, no tráfico real.

## Lo que no se ha medido

- Carga real con gente: no hay tráfico todavía. Las cifras de la base son de una
  sola conexión, sin concurrencia.
- La máquina de producción (Oracle, ARM o x86 pequeña) tendrá otros tiempos
  absolutos; las proporciones deberían mantenerse.
