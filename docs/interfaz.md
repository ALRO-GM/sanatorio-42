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
| **Ayuda** | Quedar con gente: pedir y dar ayuda, aprender y enseñar | Sala de espera · Tablón · Terapia · Pizarras | |
| **Calendario** | Todo lo que tienes, en el tiempo | Calendario | |
| **Datos** | El campus en cifras | Red · Clústeres · Exámenes | |

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
| Pestañas | Datos (red, clústeres, exámenes) | N | Informan, no resuelven un atasco |
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
| Calendario | Vistas día/semana/mes, tipos de evento (también leyenda) | S | Básico |
| Calendario | Formas del día (lista, entera, ajustada, desde ahora) | N | Comodidad |
| Red | Grafo, filtros, totales, cómo se lee | N | La sección en sí |
| Red | Endogamia, parejas, los más estrictos, proyectos más corregidos | D | Rankings |
| Clústeres | Mapa, opciones de vista, resaltar | N | La sección en sí |
| Clústeres | «N de M personas tienen Sanatorio abierto» | D | Cifra |
| Exámenes | Examen en vivo y estadísticas de cada examen | N | La sección en sí |
| Exámenes | Cuánto se tarda en cada círculo | D | Estadística |
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

Revisado el 2026-10-17 sobre la demostración, en escritorio y móvil.

| Pantalla | Encontrar | Destino | Datos | Lo que funciona | Lo que mejorar |
| --- | --- | --- | --- | --- | --- |
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | El estado de salud pide pace y fecha sin decir dónde mirarlos en la intra; la flecha del desglose de XP es pequeña |
| Sala de espera | 5 | 5 | 4 | Tarjetas grandes por proyecto; quién ayuda y dónde se sienta en un paso | «¿Qué te duele hoy?» es una metáfora: sin la (i) no se sabe que hay que elegir proyecto |
| Guardia | 4 | 3 | 3 | Interruptor siempre a mano en la cabecera; «Cómo te ven ahora» explica el estado | Debajo de las franjas se apilan hasta cuatro avisos (ofrecido, reservado, ocupado, valoración pendiente); conviene uno solo, el más importante |
| Tablón | 4 | 4 | 4 | Grafo de tu plan con marcas de dónde ayudar | El grafo en perspectiva cuesta en móvil; los módulos agrupados («Python · 11») no se ve que se pueden abrir |
| Terapia | 4 | 4 | 4 | Tarjeta con dónde, cuándo, quién y cuánto lleva cada cual | Tarjetas largas: con varios grupos hay que bajar mucho; los puestos reservados se leen mal (gris sobre gris) |
| Pizarras | 4 | 5 | 5 | Sin día elegido salen las próximas con plaza; «Apuntarme» grande | — (arreglado: el título salía con mayúsculas en cada palabra y las flechas del mes, una encima de otra) |
| Calendario | 5 | 4 | 3 | Todo en un sitio, colores por tipo, «te quedan X para lo siguiente» | En semana los eventos cortos se cortan («Terap…»); la fila de tipos ocupa dos líneas y no se nota que también filtra |
| Red | 3 | 3 | 3 | Grafo rápido, ficha de cada persona, flechas por sentido | Muchos filtros antes de ver el grafo; «endogamia» necesita la explicación; en móvil el grafo queda muy abajo |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | El clic central para abrir un expediente no se descubre solo (la demostración ya enseña la ficha de un puesto) |
| Exámenes | 4 | 4 | 3 | Aviso «en vivo» en la pestaña; notas al momento | Las estadísticas por intento son densas; falta decir qué examen es cuál si hay varios a la vez |
| Buzón | 5 | 4 | 4 | Número rojo en la cabecera; avisos llevan a su sitio | Avisos y conversaciones en pestañas: las conversaciones se descubren tarde |
| Personalizar | 3 | 4 | 4 | Orden manual, por tu uso o por la comunidad | Escondido en el menú de la cuenta |
| Pie (ajustes) | 3 | 5 | 5 | Todo a la vista y con nombres claros | Está al final de páginas muy largas: el modo y el idioma se descubren tarde (por eso también están en la bienvenida) |

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
