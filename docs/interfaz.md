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
| **Datos** | El campus en cifras | Red · Exámenes | |

Fuera de las pestañas, a propósito:

| Qué | Dónde | Por qué |
| --- | --- | --- |
| Guardia | 4 | 4 | 4 | Interruptor siempre a mano en la cabecera; «Cómo te ven ahora» explica el estado | — (2026-10-22: un solo aviso bajo las franjas; si hay una valoración pendiente, solo ese) |
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
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | — (2026-10-22: el formulario del pace dice dónde mirarlo en la intra y enlaza; el desglose de XP se abre con un botón con texto; el expediente ajeno habla en tercera persona) |
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | — (2026-10-22: el formulario del pace dice dónde mirarlo en la intra y enlaza; el desglose de XP se abre con un botón con texto; el expediente ajeno habla en tercera persona) |
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | — (2026-10-22: el formulario del pace dice dónde mirarlo en la intra y enlaza; el desglose de XP se abre con un botón con texto; el expediente ajeno habla en tercera persona) |
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | — (2026-10-22: el formulario del pace dice dónde mirarlo en la intra y enlaza; el desglose de XP se abre con un botón con texto; el expediente ajeno habla en tercera persona) |
| Expediente | 5 | 4 | 4 | Es la portada; nivel y título claros; estado de salud con calculadora | — (2026-10-22: el formulario del pace dice dónde mirarlo en la intra y enlaza; el desglose de XP se abre con un botón con texto; el expediente ajeno habla en tercera persona) |
| Guardia | 4 | 4 | 4 | Interruptor siempre a mano en la cabecera; «Cómo te ven ahora» explica el estado | — (2026-10-22: un solo aviso bajo las franjas; si hay una valoración pendiente, solo ese) |
| Guardia | 4 | 4 | 4 | Interruptor siempre a mano en la cabecera; «Cómo te ven ahora» explica el estado | — (2026-10-22: un solo aviso bajo las franjas; si hay una valoración pendiente, solo ese) |
| Sala de espera | 5 | 5 | 4 | Tarjetas grandes por proyecto; quién ayuda y dónde se sienta en un paso | — (2026-10-22: «Elige un proyecto» encima de la lista, bajo la metáfora) |
| Sala de espera | 5 | 5 | 4 | Tarjetas grandes por proyecto; quién ayuda y dónde se sienta en un paso | — (2026-10-22: «Elige un proyecto» encima de la lista, bajo la metáfora) |
| Sala de espera | 5 | 5 | 4 | Tarjetas grandes por proyecto; quién ayuda y dónde se sienta en un paso | — (2026-10-22: «Elige un proyecto» encima de la lista, bajo la metáfora) |
| Tablón | 4 | 4 | 4 | Grafo de tu plan con marcas de dónde ayudar | El grafo en perspectiva cuesta en móvil (2026-10-22: los módulos agrupados dicen «ver sus N módulos ▸») |
| Tablón | 4 | 4 | 4 | Grafo de tu plan con marcas de dónde ayudar | El grafo en perspectiva cuesta en móvil (2026-10-22: los módulos agrupados dicen «ver sus N módulos ▸») |
| Terapia y Pizarras | Todo | S | Son quedar |
| Pestañas | Not-games | N | Aprender jugando: no hace falta para pedir ni dar ayuda |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Not-games | 4 | 4 | 4 | Modos explicados al elegir; cuenta atrás con la hora del servidor; el porqué de cada respuesta | Preguntas solo en español (2026-10-22: creando una sala, las abiertas se ven al lado) |
| Menú de la cuenta | Modo concentración (Pomodoro) | S | Para todos: concentrarse no es «de datos» |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | — (el clic central tiene su aviso bajo el plano y la ficha del puesto enlaza al expediente) |
| Pestañas | Estadísticas (en Ayuda) | N | Clasificaciones: el simplificado no enseña rankings |
| Estadísticas | Cifras del campus y clasificación de cada sección, con fotos | N | La sección en sí |
| Calendario | 5 | 4 | 4 | Todo en un sitio, colores por tipo, «te quedan X para lo siguiente» | — (2026-10-22: en semana el título ocupa hasta dos líneas y los bajitos no repiten la hora; los tipos van en una fila con «Ver:» delante) |
| Calendario | 5 | 4 | 4 | Todo en un sitio, colores por tipo, «te quedan X para lo siguiente» | — (2026-10-22: en semana el título ocupa hasta dos líneas y los bajitos no repiten la hora; los tipos van en una fila con «Ver:» delante) |
| Red | 3 | 3 | 3 | Grafo rápido, ficha de cada persona, flechas por sentido | «Endogamia» necesita la explicación (2026-10-22: en móvil el grafo va antes que los filtros) |
| Red | 3 | 3 | 3 | Grafo rápido, ficha de cada persona, flechas por sentido | «Endogamia» necesita la explicación (2026-10-22: en móvil el grafo va antes que los filtros) |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | — (el clic central tiene su aviso bajo el plano y la ficha del puesto enlaza al expediente) |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | — (el clic central tiene su aviso bajo el plano y la ficha del puesto enlaza al expediente) |
| Exámenes | 4 | 4 | 4 | Aviso «en vivo» en la pestaña; notas al momento; demostración | — (2026-10-22: el detalle por intento, solo en el modo de datos; cada examen en vivo va con su nombre) |
| Exámenes | 4 | 4 | 4 | Aviso «en vivo» en la pestaña; notas al momento; demostración | — (2026-10-22: el detalle por intento, solo en el modo de datos; cada examen en vivo va con su nombre) |
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
| Red | 3 | 3 | 3 | Grafo rápido, ficha de cada persona, flechas por sentido | «Endogamia» necesita la explicación (2026-10-22: en móvil el grafo va antes que los filtros) |
| Clústeres | 4 | 4 | 4 | Plano fiel, leyenda, resaltar a tu círculo o proyecto | — (el clic central tiene su aviso bajo el plano y la ficha del puesto enlaza al expediente) |
| Exámenes | 4 | 4 | 4 | Aviso «en vivo» en la pestaña; notas al momento; demostración | — (2026-10-22: el detalle por intento, solo en el modo de datos; cada examen en vivo va con su nombre) |
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
