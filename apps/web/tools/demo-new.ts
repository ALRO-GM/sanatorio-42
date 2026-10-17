/**
 * `npm run demo:new -- <nombre> <carpeta> [sección]`: empieza una demostración
 * animada nueva a partir de la plantilla (`tools/plantillas/demo.tsx.txt`).
 *
 *   npm run demo:new -- clusters map clusters
 *
 * Crea `src/features/<carpeta>/<Nombre>Tour.tsx` y añade sus tres primeras
 * frases a la tabla `demos`, con el español y el inglés por rellenar. Lo demás
 * (el decorado, el guion, las frases de verdad y el `InfoTip` de la sección)
 * se hace a mano: los pasos están en `docs/demos.md`.
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = fileURLToPath(new URL('..', import.meta.url))
const [name = '', folder = '', section = folder] = process.argv.slice(2)

if (!/^[a-z][a-zA-Z]*$/.test(name) || !/^[a-z][\w-]*$/.test(folder)) {
  process.stderr.write('Uso: npm run demo:new -- <nombre> <carpeta de features> [sección]\n')
  process.exit(1)
}

const component = name.charAt(0).toUpperCase() + name.slice(1)
const file = join(WEB, 'src/features', folder, `${component}Tour.tsx`)

if (existsSync(file)) {
  process.stderr.write(`Ya existe ${file}\n`)
  process.exit(1)
}

const code = readFileSync(join(WEB, 'tools/plantillas/demo.tsx.txt'), 'utf8')
  .replaceAll('__Tipo__', component)
  .replaceAll('__nombre__', name)
  .replaceAll('__Componente__', component)
  .replaceAll('__seccion__', section)
  .replaceAll('__Descripcion__', `Cómo funciona ${section}: TODO, en una frase.`)

writeFileSync(file, code)

const table = join(WEB, 'src/shared/i18n/textos/demos.csv')
const rows = [1, 2, 3]
  .map(
    (step) =>
      `tour.${name}.${step},Demostración animada de ${section}: frase del paso ${step},` +
      `TODO: frase corta del paso ${step}.,TODO: short sentence for step ${step}.,,`,
  )
  .join('\n')

appendFileSync(table, `${readFileSync(table, 'utf8').endsWith('\n') ? '' : '\n'}${rows}\n`)

process.stdout.write(
  `Creada ${file} y sus frases en demos.csv.\n` +
    'Ahora: el decorado y el guion, las frases (y sus traducciones), el InfoTip de la sección\n' +
    'y `npm run textos -- --write`. Los pasos, en docs/demos.md.\n',
)
