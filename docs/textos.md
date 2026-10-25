# Textos e idiomas

Todos los textos de la web están en **tablas**, una por tema, en
`apps/web/src/shared/i18n/textos/*.csv`. Son la única fuente: el código no lleva
texto escrito, solo claves (`t('cal.join')`). Para cambiar o traducir un texto
se edita la tabla y nada más; la web lo toma de ahí.

La versión para leer cómodamente, con dónde se usa cada clave, está en
[docs/textos/](textos/README.md). Se genera sola: no se edita a mano.

## Cómo es una tabla

Un CSV normal, que se abre con cualquier hoja de cálculo (LibreOffice,
Google Sheets, Excel) o con un editor de texto:

| clave | contexto | es | en | ca | eu | fr |
| --- | --- | --- | --- | --- | --- | --- |
| `cal.join` | Botón para apuntarse | Apuntarme | Sign me up | Apunta-m'hi | Eman izena | M'inscrire |

- **clave**: `tema.cosa`. No se cambia nunca sin cambiar también el código.
- **contexto**: qué es y dónde sale, en pocas palabras. Obligatorio: es lo que
  necesita quien traduce para no equivocarse.
- **es**: el español, idioma de referencia. Obligatorio.
- **en, ca, eu, fr**: las traducciones. Si una celda se deja vacía, ese idioma
  enseña el español; el francés, el inglés (y si tampoco hay inglés, el
  español). El inglés es obligatorio salvo en el panel de gestión.
- **fr**: el francés, para que la web sirva en la sede de 42 en Francia. Es
  obligatorio como el inglés (salvo en el panel de gestión): `FR_REQUIRED`
  está a `true` en `apps/web/tools/textos-cli.ts`. Se tutea, como en el resto
  de 42 en Francia. Los términos y la tipografía, en el
  [glosario de francés](glosario-frances.md).
- `{login}`, `{n}`…: huecos que rellena la web. Cada traducción tiene que llevar
  los mismos huecos que el español (se comprueba). Un número se escribe a la
  manera del idioma (`51.300`, `51,300`, `51 300`) sin hacer nada; los huecos
  `{year}`, `{code}` e `{id}` (y los que acaban en `Year`, `Code` o `Id`) van
  tal cual, para que un año no salga como `2,026`.
- Las listas separadas por comas (`cal.months`) llevan los mismos elementos en
  todos los idiomas.

## Las tablas

| Tabla | Qué textos |
| --- | --- |
| `comun` | Navegación, cabecera, pie, entrada, bienvenida, errores, personalizar |
| `avisos` | Pantalla de mantenimiento y ventanita de cuentas atrás |
| `expediente` | Perfil: XP, títulos, logros, clasificación, estado de salud, horas |
| `sala-de-espera` | Elegir proyecto, quién ayuda, interruptor de guardia |
| `guardia` | Tu guardia, reservas de ayuda, valoraciones, preevaluaciones |
| `tablon` | Grafo de proyectos, guías, dudas y respuestas |
| `terapia` | Grupos de terapia |
| `agenda` | La agenda: metas, checkpoints, dailies, listas de atascos y salidas, y el tablero del sprint |
| `pizarras` | Calendario de pizarras |
| `calendario` | Tu calendario, avisos de eventos, chats y códigos de asistencia |
| `buzon` | Avisos, conversaciones, incidencias y denuncias |
| `red` | Red de correcciones |
| `clusters` | Mapa de los clústeres |
| `examenes` | Exámenes en vivo y estadísticas |
| `demos` | Frases de las demostraciones animadas |
| `gestion` | Panel de gestión y página del staff (en español a propósito) |
| `code-clicker` | Lo del juego que sale fuera del juego |
| `animos` | Las cien frases de ánimo de la guardia |
| `legal` | El texto de privacidad y condiciones (español e inglés) |
| `juego/juego` | Todo Code Clicker: tienda, logros, noticias del rótulo… |

## Textos largos y grupos

Una lista o un documento se guarda en muchas filas con una clave por niveles;
los números son posiciones, desde 1: `cheer.ask.7` es la séptima frase de
ánimo, `legal.doc.sections.2.heading` el título del segundo apartado. El código
pide el prefijo entero (`tree('cheer.ask')`) y rehace la lista
(`shared/i18n/tree.ts`). Para añadir una frase basta una fila con el número
siguiente.

Las tablas de una subcarpeta (`textos/juego/`) son un **grupo**: no viajan con
la web, sino con la parte que las usa (`virtual:textos/juego/es`). Así los
cientos de frases del juego solo se descargan al jugar.

## Regla estricta

**Cada cambio en un texto de la web pasa por las tablas**, sin excepción:

1. Un texto nuevo es una fila nueva, con su contexto y, como mínimo, el español
   el inglés y el francés. Si se sabe, también catalán y euskera.
2. Cambiar un texto es cambiar su celda. Si cambia el sentido (no solo la
   forma), se cambian también las traducciones o se vacían para que salga el
   español hasta que alguien las haga.
3. Una clave que el código deja de usar se borra de la tabla.
4. Después de tocar una tabla: `npm run textos -- --write` para poner al día
   `docs/textos/`, y `npm run check`.

`npm run textos` (dentro de `npm run check` y de la CI) falla si:

- el código pide una clave que no está en ninguna tabla;
- hay claves en las tablas que el código no usa;
- una clave se repite, no tiene contexto o no tiene español;
- falta el inglés o el francés fuera del panel de gestión;
- una traducción no conserva los huecos del español;
- el francés no sigue su tipografía: espacio sin corte (U+00A0) antes de `:`
  y `%` y dentro de « », fino sin corte (U+202F) antes de `;` `?` `!` y en los
  miles, `…`, sin ¿ ¡ ñ ni comillas inglesas (`tools/textos-fr.ts`; deja en
  paz el código, las URL, los huecos y las horas como `10:30`);
- un texto cuenta algo en plural («{n} días») y no tiene sus formas `.one` y
  `.many` (ver «Singular y plural»);
- `docs/textos/` no está al día con las tablas.

## Singular y plural

Un texto que cuenta algo («3 días», «1 persona») tiene dos filas: `clave.one`
y `clave.many`, y el código lo pide con `tn('clave', n)` (`shared/i18n`), que
elige con las reglas de cada idioma (`Intl.PluralRules`):

| clave | es | en | fr |
| --- | --- | --- | --- |
| `pace.left.one` | queda {n} día | {n} day left | encore {n} j |
| `pace.left.many` | quedan {n} días | {n} days left | encore {n} j |

- En español, inglés, catalán y euskera, `one` es solo el 1. En francés,
  también el 0 y lo que no llega a 2: «0 personne», «1,5 tentative».
- Las dos formas llevan `{n}` (en francés, `one` también sirve para el 0). Si
  la cantidad que manda es otro hueco (`{capacity}`, `{total}`), se pasa dos
  veces: `tn('cal.seats', capacity, { taken, capacity })`.
- Donde hay dos cantidades, una manda y la otra se escribe como etiqueta
  («Personas: {people} · uniones: {links}»), que vale con cualquier número.
- `npm run textos` avisa de un texto que pone un hueco delante de un nombre en
  plural (`{n} días`, `{total} personas`) sin sus formas `.one` y `.many`
  (`tools/textos-plural.ts`). La lista de nombres es cerrada para no dar
  falsos avisos; lo que nunca vale 1 va en `ALWAYS_MANY`, con su porqué. Code
  Clicker (`game.*`) no pasa por `tn`: sus números grandes eligen el sufijo con
  `game.scale.*` y `game.scaleOne.*` (`short` en `features/clicker/texts.ts`).

## Cómo se escriben

- Frases breves, en segunda persona y sin género cuando se puede («quien se ha
  apuntado», no «los apuntados»).
- Una idea por frase. Si una explicación necesita más de dos frases, sobra algo
  o tiene que ser una demostración animada.
- Las palabras de la casa, siempre iguales: de guardia, fuera de turno,
  especialista, paciente como tú, sala de espera, terapia de grupo, pizarra,
  clústeres, pace, black hole.
- Botones con verbo («Apuntarme», «Guardar cambios»), no con sustantivo.

## Cómo llega a la web

El plugin de `apps/web/tools/textos.ts` convierte las tablas en un módulo por
idioma (`virtual:textos/es`, `virtual:textos/en`…). El español viaja con la web;
los demás se descargan solo al elegirlos, unos 20 KB comprimidos cada uno.
Nunca se pinta un idioma a medias: `main.tsx` descarga el elegido (y su
`fallback`) antes de pintar, y al cambiar de idioma se sigue viendo el anterior
hasta que llegan los dos (`I18nProvider`). Así nadie ve un instante el español,
ni el inglés de reserva del francés. Al
editar una tabla con `npm run dev` abierto, la web se recarga con el texto
nuevo.

Añadir un idioma: una columna nueva en todas las tablas, su código en
`LANG_CODES` (`tools/textos.ts`) y su nombre en `LANG_NAMES`
(`tools/textos-cli.ts`), su entrada en `LANGS` (`src/shared/i18n/index.tsx`),
su formato de fechas en `locale.ts`, el tipo `Lang` de `packages/contracts` y
el `z.enum` de `PUT /me/settings` (`modules/profile/xp.service.ts`). Los
estilos (`src/themes/*/theme.ts`) llevan nombre y descripción por idioma.

## El francés y su idioma de reserva

Un idioma puede tener en `LANGS` un `fallback`: donde le falta un texto, se
enseña el de ese idioma antes que el español. El francés lo tiene puesto al
inglés (`fallback: 'en'`): al elegir «Français» se descargan los dos y cada
clave sale en francés, si no en inglés y si no en español. Un idioma que aún
se traduce lleva `unlisted: true` en `LANGS` y no sale en el selector. Un texto largo
(`tree`, como el legal) que sale del inglés dice `translated: false`, y la web
avisa de que no está en ese idioma. Lo mismo hace Code Clicker
(`features/clicker/texts.ts`). Los cursos de git y de shell ya tienen su
francés (`levels/fr/` en `packages/gitsim`; `fr` en cada unidad y bloque de
`packages/shellsim`): `courseLang` y `courseText` (`packages/course`) lo eligen
y, si a algo le faltara, sacan el inglés. En la API, la
cabecera `x-lang: fr` se lee como inglés para las preguntas de Not-games.

El francés está completo y revisado (octubre de 2026): `FR_REQUIRED = true`
en `tools/textos-cli.ts`, así que `npm run textos` lo exige en cada clave
visible, y ya se ofrece en el selector de idioma.
