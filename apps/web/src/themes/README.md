# Estilos

Cada estilo de la web es una carpeta de aquí. La persona elige el suyo en
**Personalizar**; se escribe en `data-style` de `<html>` y se guarda en el
navegador (`shared/theme`).

```
themes/
  index.ts            la lista de estilos, en el orden del selector
  types.ts            qué lleva un manifiesto
  clinica/
    theme.ts          el manifiesto: nombre, muestra, letras, paletas, iconos
    theme.css         los colores y lo que cambia en los componentes
    assets/           texturas, dibujos e imágenes del estilo
```

## Añadir un estilo

1. Copia la carpeta del que más se parezca y cámbiale el nombre. El nombre es el
   `id` del estilo: minúsculas y guiones.
2. En `theme.ts`: pon el `id`, el nombre y la descripción (en español, y en los
   idiomas que quieras), la muestra del selector y las letras. Las letras se
   importan ahí mismo (`import '@fontsource-variable/…'`, tras instalarlas con
   `npm install --workspace apps/web`): así cada estilo trae las suyas y el
   navegador solo baja las del que se usa.
3. En `theme.css`: todo va bajo `:root[data-style='<id>']`, y el modo nocturno,
   bajo `:root[data-style='<id>'][data-theme='dark']`. Tiene que verse bien en
   los dos.
4. Mete en `assets/` las texturas e imágenes y úsalas desde el CSS con
   `url('./assets/…')`.
5. Apunta el estilo en `index.ts`.

No hay que tocar ningún componente ni ningún otro fichero.

## Qué puede cambiar un estilo

Casi todo se hace dando valor a variables. Los componentes ya las usan.

- **Colores** (`styles/theme.css`): `--bg`, `--surface`, `--surface-2`,
  `--surface-3`, `--border`, `--border-strong`, `--text` … `--text-4`,
  `--accent`, `--accent-hover`, `--accent-soft`, `--accent-text`, `--on-accent`,
  los estados (`--ok`, `--warn`, `--danger`, cada uno con su `-soft`), `--gold`,
  `--shadow` y `--glow`.
- **Letra y formas** (`styles/styles.css`): `--font`, `--font-display`,
  `--font-mono`, `--display-weight`, `--display-spacing`, `--eyebrow-font`,
  `--eyebrow-transform`, `--radius`, `--radius-sm` y el trazo de los iconos
  (`--icon-stroke`, `--icon-cap`, `--icon-join`).
- **La piel** (`styles/styles.css`, aplicada en `styles/skin.css`):
  `--page-image` y `--page-size` (el fondo de la página), `--surface-image` y
  `--surface-size` (la textura de las tarjetas), `--card-shadow`,
  `--border-style`, `--primary-image` y `--primary-shadow` (el botón principal),
  `--appbar-bg` y `--banner-image`.
- **El escenario** (`styles/styles.css`): la zona donde se pintan los grafos,
  que es oscura también en modo claro para que los colores de los nodos se
  distingan. `--stage-bg` (el fondo: un degradado o una textura), `--stage-text`
  y `--stage-muted` (las letras), `--stage-link` (las líneas), `--stage-halo`
  (el borde de las letras, del color del fondo) y `--stage-accent` (lo elegido).
  Se ponen una vez, en el bloque de claro: valen igual de noche.
- **Las ruedas del tablón** (`styles/styles.css`, usadas en
  `styles/doubt-graph.css`): `--ring-from` y `--ring-to` son el color del
  círculo de dentro y el del de fuera; los de en medio salen de mezclarlos, un
  paso cada uno. `--ring-shade` es con qué se oscurecen las paredes de cada
  rueda (un tono oscuro del estilo en claro, negro de noche) y `--orb-done`, el
  color de un proyecto aprobado. Las caras, lo aprobado y los cantos se calculan
  solos a partir de esos y de los colores del tema.

Lo que no se pueda decir con una variable se escribe como una regla más en el
`theme.css` del estilo, siempre bajo su `:root[data-style='<id>']`. Las clases
que más se repiten: `.card`, `button.primary`, `.pill` (y `.pill.active`),
`.tab`, `.badge`, `.chip`, `.eyebrow`, `.appbar`, `.brand-mark`, `.banner`,
`.stat-card`, los campos (`input`, `select`, `textarea`) y las ventanas
(`dialog.layout-dialog`).

## Paletas

Un estilo puede dejar elegir color. En su manifiesto, `palettes` es una lista en
la que cada paleta da valor a variables de CSS (`vars`); el `theme.css` calcula
sus colores a partir de ellas. `libre` lo hace con `--hue` y `--chroma`. La
primera de la lista es la de fábrica.

## Iconos e imágenes

- `icons`: para dibujar a su manera alguno de los iconos de `shared/ui/Icon`.
  La clave es el nombre del icono y el valor, sus trazos, en la misma rejilla de
  24 × 24 y sin colores.
- `images`: imágenes por nombre para lo que haya que poner desde un componente
  y no desde el CSS.

## Los que hay

- `clinica`: la sala de un hospital nuevo. Turquesa, blanco y relieve.
- `terminal`: una consola. Letra de máquina, líneas rectas y colores de editor.
- `historial`: el expediente en papel. Pluma, papel pautado y notas con celo.
- `libre`: sobrio y sin color propio; se elige paleta.
