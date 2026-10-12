# Bug abierto: trozos de pantalla sin pintar

**Estado**: sin resolver. Visto en un ordenador de escritorio; en móvil no
pasa. Falta probar en otros ordenadores y navegadores (tabla del final).

## Qué se ve

Partes rectangulares de la página dejan de pintarse durante un instante, o se
quedan así hasta que algo obliga a repintar (mover el ratón, deslizar):

- En el **mapa de clusters**: un rectángulo de la tarjeta desaparece y se ve
  el fondo de la página (la textura de papel) donde debería ir la tarjeta
  lisa.
- En las **demostraciones** (el icono de información junto a cada título):
  bandas verticales y horizontales en negro, o con lo que hay detrás de la
  ventana, cruzando el decorado.
- Antes de tener fotos se describió como «ventanas de un plano inferior que
  pasan a primer plano unas centésimas y vuelven atrás». Lo más probable es que
  sea lo mismo.

Las dos fotos que lo documentan se hicieron con el estilo **Historial**, en
claro, sobre la imagen de un proyector (el arcoíris de las fotos es del
proyector, no del fallo).

## Dónde se ha visto

| Sitio                        | Con qué intensidad                         |
| ---------------------------- | ------------------------------------------ |
| Demostraciones animadas      | Muy visible                                |
| Puestos del mapa de clusters | Sutil, de vez en cuando                    |
| Móvil                        | No pasa                                    |

## Qué creemos que es

Los rectángulos tienen bordes rectos y tamaños regulares: es la pinta de las
**baldosas** en que el navegador trocea la página para pintarla con la tarjeta
gráfica. Cuando una baldosa no llega a pintarse, se ve lo que hay debajo (otra
capa) o nada (negro). No es un problema del orden de las capas en el CSS, sino
de que el navegador no da abasto o falla al pintar alguna.

No está confirmado: **no se ha podido reproducir** en el navegador de pruebas
con el que se desarrolla, que pinta sin tarjeta gráfica. Capturando una
demostración fotograma a fotograma ahí, no aparece.

## Qué se ha probado, y no lo ha arreglado

Por orden. Cada cambio se desplegó y el fallo siguió.

1. **Capas fijas en demostraciones y puestos** (commit `0756861`). Hipótesis: lo
   que se anima cambia de capa mientras dura la animación y, en ese ir y venir,
   se pinta encima lo de debajo. Se dejó cada pieza animada en su capa desde el
   principio (`isolation: isolate`, `contain: paint`, `will-change`), y el puesto
   que se levanta, siempre por encima de sus vecinos.
   Ficheros: `styles/tour.css` (final), `styles/map.css` (final).
2. **Textura de papel como imagen** (commit `db1ce5d`). Hipótesis: en Historial
   la textura era un SVG con un filtro de ruido (`feTurbulence`), que el
   navegador recalcula en cada baldosa; estaba en la página, en cada tarjeta y en
   las ventanas. Se cambió por un PNG ya hecho.
3. **Fondos con textura que van con la página** (mismo commit). Con
   `background-attachment: fixed` la página entera se repinta en cada
   movimiento; los estilos con textura (Historial, Terminal, A tu color) pasaron
   a `scroll` (`--page-attachment`).
4. **Sin desenfoque en las tarjetas de Espacial** (mismo commit).

Tras el paso 2 se comprobó que la textura nueva carga y que no queda ningún
filtro SVG en las hojas de estilos.

## Qué queda por mirar

Sospechosos que siguen en la web, de más a menos probable:

- **La cabecera** (`.appbar`, en `styles/system.css`): es `position: sticky`
  con `backdrop-filter: blur(14px)`. Desenfocar lo de detrás es de lo más caro
  que hay para la tarjeta gráfica, está en todas las páginas y encima de todo.
  Es el primer candidato. Probar a quitarle el `backdrop-filter`.
- **Las ventanas** (`dialog::backdrop` y `dialog.layout-dialog`): las
  demostraciones van dentro de una, y es donde más se nota.
- **El fondo de la página**: varias capas de degradados (`--page-image`), en
  Clínica todavía con `fixed`.
- **Sombras grandes y difusas** en tarjetas (`--card-shadow`) y ventanas.
- **El juego**, para quien eligió la pastilla roja: sigue corriendo en toda la
  web y repinta su ventanita cada segundo. Probar con un usuario sin el juego, o
  cerrando la ventanita.
- **El proyector**: si el fallo solo aparece con la segunda pantalla conectada,
  el sospechoso es el equipo (controlador de la gráfica, duplicado de
  pantalla), no la web.

## Cómo probarlo

Para acotar si es de la web, del navegador o del equipo:

1. Abrir una demostración (el icono de información junto al título de una
   sección) y dejarla correr dos veces.
2. Ir a Clusters y pasar el ratón por los puestos ocupados.
3. Repetir cambiando **una sola cosa** cada vez:
   - el estilo (Personalizar la web): Clínica, Terminal, Historial, Espacial, A
     tu color;
   - claro y nocturno;
   - con y sin la aceleración por hardware del navegador (en Chrome:
     Configuración → Sistema → «Usar aceleración por hardware»). **Si sin ella
     desaparece, queda confirmado que es de la tarjeta gráfica**;
   - con el proyector conectado y sin él;
   - con la ventana a pantalla completa y en pequeño.
4. En Chrome, abrir `chrome://gpu` y copiar el bloque «Graphics Feature
   Status» y el modelo de la gráfica.

## Resultados

Rellenar una fila por prueba.

| Equipo y sistema | Gráfica | Navegador y versión | Estilo | Aceleración | Proyector | ¿Pasa? | Notas |
| ---------------- | ------- | ------------------- | ------ | ----------- | --------- | ------ | ----- |
| (el de las fotos) |        |                     | Historial, claro | sí | sí | sí | demostraciones y clusters |
|                  |         |                     |        |             |           |        |       |

## Lo que cambiaría el diagnóstico

- Pasa también **sin** aceleración por hardware → no es de baldosas: hay que
  volver a mirar el orden de las capas.
- Pasa solo en **un** equipo → controlador de la gráfica o el proyector.
- Pasa solo en **un** navegador → fallo de ese navegador; se busca qué
  propiedad lo dispara y se evita.
- Pasa solo en **un** estilo → algo de la hoja de ese estilo
  (`apps/web/src/themes/<estilo>/theme.css`).
