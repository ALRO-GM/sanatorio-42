# Rendimiento: antes y después de la revisión

Comparación entre el código anterior a la revisión (`9607be6`) y el actual, a
2026-10-11. Cada cifra dice si está **medida** o **calculada**.

## Resumen

| Qué | Antes | Ahora | Mejora |
| --- | --- | --- | --- |
| Detalle de una pareja en la red de correcciones | 15,7 ms | 0,25 ms | 63 veces |
| Con quién se ha corregido una persona | 34,4 ms | 0,36 ms | 95 veces |
| Una escritura suelta en la base | 3,9 ms | 0,04 ms | 100 veces |
| Refrescar un chat con 200 mensajes | 42,4 kB y 0,74 ms | 15 bytes y 0,05 ms | 2 800 veces menos datos |
| Saber si alguien participa en un evento | 2,35 ms y 2,2 peticiones a 42 | 1,26 ms y ninguna | sin gasto de cuota |
| Peticiones de una pestaña en reposo | 60 a la hora | 24 a la hora | 2,5 veces menos |
| Peticiones con un chat abierto y callado | 450 a la hora | unas 120 a la hora | 3,7 veces menos |
| Peticiones con la pestaña oculta y un chat abierto | 510 a la hora | 12 a la hora | 42 veces menos |

## Base de datos (medido)

Sobre una copia de la base real de desarrollo (85 925 correcciones de Madrid),
con el mismo cliente que usa la API. Media de 200 consultas sobre las 40
parejas con más correcciones, y de 300 escrituras.

- **Estadísticas.** La base nunca había pasado por `ANALYZE`, así que SQLite
  elegía índices a ciegas: para una pareja recorría todas las correcciones del
  campus por fecha, y para una persona usaba el índice de la otra columna. Con
  estadísticas usa el índice bueno. Ahora se calculan al abrir si faltan y un
  trabajo las mantiene cada seis horas.
- **WAL y `synchronous = NORMAL`.** Con el diario clásico cada escritura espera
  a que el disco confirme dos veces; con WAL, una vez por lote. Además se puede
  leer mientras el sincronizador escribe, que antes no. Esto último no está
  medido: es lo que garantiza el modo.
- Las agregaciones de todo el campus (el grafo entero, el ranking de proyectos)
  no cambian: unos 40 ms antes y después. No necesitaban más.

## API (medido)

Con los servicios de verdad sobre SQLite en memoria y la API de 42 simulada,
en un campus con 40 pizarras y un chat de 200 mensajes.

- **Refrescar un chat.** Antes cada sondeo devolvía el chat entero; ahora la web
  dice cuál es el último mensaje que tiene y recibe solo los posteriores.
- **Participación en un evento.** Antes se calculaba el calendario entero de la
  persona, que incluye su agenda de 42: de media 2,2 peticiones a 42 por
  comprobación (tres cada vez que la agenda caducaba). Ahora se pregunta al
  módulo de la pizarra, la reserva o la terapia. La cifra en milisegundos es
  con 42 simulada, que contesta al instante; contra la de verdad cada petición
  son décimas de segundo y sale de las 1 200 por hora de toda la web.

## Web (calculado a partir de los intervalos)

- **Avisos.** El calendario se pedía cada minuto desde cada pestaña; ahora cada
  cinco, y si algo está a punto de empezar se mira en el navegador. Es la
  petición más cara de las que se repiten.
- **Chat.** De cada 8 segundos fijos a una espera que crece hasta 30 mientras
  nadie escribe y vuelve a 8 cuando llega algo. Con la pestaña oculta no se
  pregunta.
- **Lo que se ha añadido.** El rótulo de la cuota de 42 pregunta cada cinco
  minutos (12 a la hora), y ya está contado en las cifras de arriba.
- **Descarga al entrar**: unos 135 kB comprimidos, igual que antes. Cada sección
  va en su trozo.

## Lo que no se ha medido

- Carga real con gente: no hay tráfico todavía. Las cifras de la base son de una
  sola conexión, sin concurrencia.
- La máquina de producción (Oracle, ARM o x86 pequeña) tendrá otros tiempos
  absolutos; las proporciones deberían mantenerse.
