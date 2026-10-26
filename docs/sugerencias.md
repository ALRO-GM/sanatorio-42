# Sugerencias de mejora con la burbuja

Pedido por Alberto (2026-10-25): un botón flotante para sugerir mejoras de la
web que se coge y se arrastra hasta lo que se quiere mejorar. Al soltarlo (o
al pulsarlo) se abre un panel con el sitio detectado, el problema y una
propuesta opcional, separados. Corto, claro y nada intrusivo; al mandar, la
burbuja vuelve a su sitio.

## Dónde va y para quién

| Qué | Decisión | Por qué |
| --- | --- | --- |
| Categoría | Cabecera, junto al buzón | Se usa desde cualquier sitio: lo pidió Alberto en la barra de arriba. Es la única excepción a «nada suelto en la cabecera» |
| Sección o bloque | Ni una ni otro: un botón de la cabecera y su panel | Lo que se manda va al buzón que ya hay (Incidencias y sugerencias) |
| Modo | `S` (los tres) | Contar que algo no se entiende es justo para quien se pierde |
| Piscina | Con la clave `tickets` (de serie, sí) | La misma que el buzón de incidencias |

## Cómo se usa

1. **Coger y arrastrar** la bombilla de la cabecera (ratón, dedo o lápiz: eventos
   de puntero, con `touch-action: none` para que el dedo no desplace la página).
   Mientras se arrastra, el sitio de debajo se marca con un borde y su nombre.
2. **Soltar**: se abre el panel junto al punto (en el móvil, abajo a lo
   ancho), con «Dónde: …» y el nombre detectado. «Cambiar» abre la lista de
   secciones y un campo de detalle a mano.
3. **Escribir** «El problema» (5-500) y, si se quiere, «Tu propuesta» (≤ 500).
4. **Enviar**: el panel se cierra, la burbuja vuelve volando a la cabecera
   (de golpe con `prefers-reduced-motion`) y sale «¡Gracias!» un momento.

Con el ratón, arrastrar resulta raro (2026-10-26): un clic en la bombilla la
engancha al puntero (cursor en cruz, el sitio de debajo marcado) y el
siguiente clic la deja ahí y abre el panel; ese clic no llega a lo de debajo.
Un clic sobre la bombilla de la cabecera, el botón derecho o Escape la
devuelven sin abrir nada. Arrastrarla con el ratón sigue funcionando.

Con el panel abierto, pulsar fuera de él lo cierra (con cualquier puntero).

Con el teclado: Intro o Espacio sobre la burbuja abren el panel sin arrastrar,
con el foco en la lista de secciones (la abierta, elegida). Escape cierra el
panel o cancela un arrastre; el foco vuelve a la burbuja.

## Cómo se detecta el sitio

`apps/web/src/features/suggest/detect.ts`, sin React:

1. Del elemento bajo el puntero (`elementFromPoint`) se sube al contenedor con
   sentido más cercano: `[data-feedback]`, `.card`, `.block`, `section`,
   `article`, `dialog`, `form`, `fieldset`, `table`, `figure`, `footer`,
   `nav[aria-label]` o un `role="dialog"`/`"region"`.
2. Su nombre: su `aria-label` o un título suyo (`h1`-`h4`, `.block-head`,
   `legend`, `caption` hijos directos o en su cabecera), sin lo decorativo
   (`aria-hidden`, iconos, botones como el `InfoTip`). Si no tiene, el del
   contenedor de fuera; al final, el nombre de la sección abierta.
3. Los sitios marcados sin título propio se llaman por su texto
   (`suggest.part.*`): `cabecera`, `pie`, `tablon.graph`, `clusters.map`.
4. La ruta del elemento (`selector`): hasta cinco niveles, con clase y
   `:nth-of-type`, cortada en el primer `data-feedback` o `id` estable.

Ganchos `data-feedback` puestos: la cabecera (`cabecera`), el pie (`pie`), cada
bloque de `shared/layout/Blocks.tsx` (`<página>.<bloque>`, p. ej.
`expediente.health`), el grafo del tablón (`tablon.graph`) y el plano de
Clústeres (`clusters.map`). Uno nuevo: `data-feedback="<id>"` en el contenedor y,
si no tiene título, su texto en `PARTS` de `detect.ts` y en la tabla `buzon`.

## Qué se guarda

En la tabla `tickets` (migración 78), como un mensaje más del buzón:
`kind = 'idea'`, `category = 'improvement'`, `section`, el problema en `body`,
la propuesta en `proposal` y el sitio en `place` (JSON):

- `section`, `label` (lo que se enseñó), `detail` (lo escrito a mano o `null`);
- `selector` (vacío si se cambió de sección) y `hash` (la dirección);
- `viewport`, `theme` (`<estilo>-<claro|oscuro>`), `lang`, `mode`;
- `version`: el commit desplegado (`GIT_SHA`), lo pone la API.

**Privacidad**: ni capturas ni texto de la página; solo el nombre del sitio
(un título que ya se ve) y su ruta. La tabla ya está en `personal` del módulo
`admin`: entra en la descarga y el borrado de datos de cada cual.

## Topes

Los del buzón (10 abiertos a la vez, 3 cada 10 minutos) y, además, 10
sugerencias cada 24 horas por persona (`SUGGESTIONS_PER_DAY` en
`modules/admin/suggestions.ts`). Pasados, `409` con el porqué.

## Quien administra

Llegan al buzón del panel (Gestión → Buzón) como «Mejora de algo que ya hay»,
con su sección, la propuesta, el sitio (nombre, detalle, pantalla, estilo,
idioma, modo, versión) y «Ir al sitio», que abre la dirección guardada. Avisa
igual que cualquier mensaje (`ticket_new`).

## API

`POST /tickets/suggestion` (ver `docs/api.md`). Tests:
`apps/api/tests/integration/suggestions.test.ts`,
`apps/api/tests/unit/suggestions.test.ts`, `apps/web/tests/ui/suggest.test.tsx`
y `apps/web/tests/ui/suggest-detect.test.tsx`.

## Límites conocidos

- El sitio es el contenedor con sentido más cercano: dentro de una tarjeta
  grande sin títulos propios se señala la tarjeta entera, no el botón concreto
  (para eso está el detalle a mano).
- Lo dibujado en `<canvas>` (la Red) se ve como un solo sitio.
- Mientras el panel está abierto no se puede volver a arrastrar la burbuja:
  se cierra y se suelta de nuevo, o se usa «Cambiar».
