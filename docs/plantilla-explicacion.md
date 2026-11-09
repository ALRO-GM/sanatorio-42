# Plantilla para explicar un concepto en los cursos

Cómo se escribe la parte que enseña de cada unidad de los cursos (shell, git,
Docker, Kubernetes y los que vengan). La forma de las unidades está en
[plantilla-cursos.md](plantilla-cursos.md); el porqué de esta plantilla, con
sus fuentes, en
[referencia/preguntas-investigacion.md](referencia/preguntas-investigacion.md)
(apartado 3). Las preguntas que comprueban cada concepto siguen
[plantilla-preguntas.md](plantilla-preguntas.md). El subagente `didacta`
(`.claude/agents/didacta.md`) escribe y revisa con esta plantilla.

## El modelo, en una frase

Un problema de trabajo real; lo que ya sabes; **un ejemplo resuelto que
ejecuta el motor**, con una predicción antes de ver la salida; **el error
típico, dicho y refutado**; y una prueba donde lo aplicas tú. Luego, Not-games
te lo vuelve a preguntar con otras palabras, mezclado con otros temas.

## Las siete piezas de cada concepto

Encajan en los campos que ya existen (`Theory` de `@sanatorio/course`, más
`example` y la prueba de la unidad): no hace falta cambiar ningún motor.

| # | Pieza | Campo | Qué lleva | Límite |
| --- | --- | --- | --- | --- |
| 1 | Idea en una línea | `theory.what` | Qué **hace**, no qué «es» en abstracto. Si hay un término nuevo, se define aquí y es el único nuevo de la unidad. | 1–2 frases, 30 palabras |
| 2 | Por qué importa | `theory.when` | La situación de trabajo en la que lo usarías (producción, on-call, un repo compartido). | 1 frase, 25 palabras |
| 3 | Demostración | `theory.how` + `example` | 2–5 órdenes reales, de lo más simple a lo combinado, cada una con un comentario de lo que **verás**. En `example` (lo que sale en la pestaña Ejemplo), la pregunta de predicción: «Antes de verlo: …». La salida no se escribe a mano: la pone el motor. | 5 órdenes; comentario ≤ 45 caracteres |
| 4 | Error típico | `theory.problems` | La idea equivocada más común, **cómo se nota** (el mensaje o el síntoma exacto) y cómo se arregla. | 1–2 frases, 35 palabras |
| 5 | Contraste | `theory.whenNot` (o un comentario en `how`) | Un caso vecino donde la cosa cambia: lo absoluto frente a lo relativo, `add` frente a `commit -a`, cuándo es mejor otra orden. | 1–2 frases, 30 palabras |
| 6 | Cómo se ve | `theory.looks` (solo git) | Qué cambia en el dibujo de ramas. | 1 frase |
| 7 | Pregunta de comprobación | Banco de Not-games | Un concepto con al menos una forma de **predicción** o **diagnóstico**, cuya mala principal es el error típico de la pieza 4. | Ver [plantilla-preguntas.md](plantilla-preguntas.md) |

Total de la teoría (todos los campos de `theory`, órdenes y comentarios
incluidos, contadas como `wordsIn`): **130 palabras** como mucho en
principiante, **100** en intermedio y **80** en avanzado (lo que ayuda al
empezar estorba a quien ya sabe; ver Kalyuga, 2003). La frase de `example`,
25 palabras como mucho. La estimación de tiempo (`estimateSeconds`) cuenta
estas palabras, así que cada palabra de más es tiempo de más.

## Reglas de estilo

- **Segunda persona y presente**: «ves», «escribes», «git guarda». Sin
  formas con género cuando se pueda («quien lo use», no «el usuario»).
- **Concreto antes que abstracto**: nombres del mundo del curso
  (`/srv/peer4u`, `libft.h`, `api:1.2`), nunca `foo`, `bar` ni «un fichero
  cualquiera».
- **Un término nuevo por unidad**, definido la primera vez que sale. Lo de
  unidades posteriores no se usa (la regla 2 de la plantilla de cursos).
- **Frases de 20 palabras como mucho.** Una idea por frase.
- **Sin muletillas que juzgan**: nada de «simplemente», «fácil», «obvio»,
  «como todo el mundo sabe». Si fuera obvio no haría falta la unidad.
- **Órdenes tal cual se escriben** (con sus comillas y sus espacios), y los
  números en cifras.
- **El error se cita literal**: «bash: cd: /nginx: No such file or
  directory», no «da un error».
- **Las tres lenguas dicen lo mismo**: mismas órdenes, mismas rutas y mismos
  textos que comprueba la prueba en `es`, `en` y `fr`. Francés tuteando, con
  espacio sin corte antes de `: ; ? ! %` y dentro de « » (ver
  [glosario-frances.md](glosario-frances.md)).
- **Tono**: equipo de programación, cálido y con humor amable; nada de
  hospital.

## Comprobar lo que se afirma

Cada afirmación técnica se comprueba **en el motor del curso** (es lo que verá
la persona) y, si dice algo del mundo real, **en la herramienta de verdad**
(`bash`, `git`, `docker`, `kubectl`) en una carpeta temporal. Si el motor y la
herramienta discrepan, la teoría no afirma lo que solo hace uno de los dos: se
reescribe o se apunta el fallo del motor.

Para ejecutar el motor desde la terminal (fuera de los tests), un guion en la
carpeta temporal con:

```ts
import { run, startOf, unitOf } from '<repo>/packages/shellsim/src/index.ts'
// git: import { run, emptyRepo } from '<repo>/packages/gitsim/src/index.ts'

let world = startOf(unitOf('cd')!)
for (const line of ['pwd', 'cd /var/log', 'pwd']) {
  const result = run(world, line)
  world = result.world
  console.log('$ ' + line + '\n' + result.output.join('\n'))
}
```

y se ejecuta desde la raíz del repo con
`npx tsx --conditions=source <guion>.ts` (la condición `source` hace que
importe los `.ts` de los paquetes sin compilarlos).

Ojo con git: desde el 2026-11-09 el motor contesta como git 2.4x en inglés,
como los de shell y Docker (`git status` dice «Changes to be committed:» y
«nothing to commit, working tree clean»), pero resumido: sin hashes largos, sin
fechas y sin las líneas de ayuda «(use "git add" …)». La teoría cita los
mensajes tal como los da el motor; lo que el motor hace distinto de git a
sabiendas está en [curso-git.md](curso-git.md) («Lo que el simulador hace
distinto»).

## Lista de revisión de una unidad

- [ ] La idea cabe en una línea y dice qué hace.
- [ ] El porqué es una situación de trabajo, no «es importante».
- [ ] El ejemplo lo ejecuta el motor, va de lo simple a lo combinado y su
      texto pregunta qué pasará antes de verlo.
- [ ] El error típico está dicho, con su síntoma literal y su arreglo.
- [ ] Hay un contraste con el caso vecino.
- [ ] No usa nada que no se haya enseñado antes.
- [ ] Dentro del límite de palabras de su nivel.
- [ ] `es`, `en` y `fr` dicen lo mismo, con las mismas órdenes.
- [ ] Lo afirmado se ha comprobado en el motor (y en la herramienta real si
      habla de ella).
- [ ] Hay una pregunta en el banco cuya mala principal es el error típico.

## Ejemplo completo: shell, rutas absolutas y relativas (`cd`)

Unidad `cd` del bloque 1 (`packages/shellsim/src/course/beginner.ts`). Lo que
sigue es cómo quedaría siguiendo la plantilla; la salida es la del motor,
ejecutada el 2026-11-08.

- **Idea** (`what`): `cd` te cambia de carpeta. Una ruta que empieza por `/`
  es absoluta y parte de la raíz; si no, es relativa y parte de donde estás.
- **Por qué** (`when`): en un servidor te mueves todo el rato entre `/var/log`
  y `/srv`; saber desde dónde parte cada ruta evita tocar el sitio
  equivocado.
- **Demostración** (`how`):

  ```text
  cd /var/log    # absoluta: da igual dónde estés
  cd nginx       # relativa: /var/log/nginx
  cd ..          # sube una: /var/log
  cd ~           # vuelves a tu carpeta
  ```

  `example`: «Antes de verlo: estás en /var/log/nginx y escribes cd .. ¿Qué
  dirá pwd?». Lo que enseña el motor:

  ```text
  $ cd /var/log
  $ pwd
  /var/log
  $ cd nginx
  $ pwd
  /var/log/nginx
  $ cd ..
  $ pwd
  /var/log
  ```

- **Error típico** (`problems`): poner `/` delante sin querer. Desde
  `/var/log`, `cd /nginx` busca nginx en la raíz y responde «bash: cd:
  /nginx: No such file or directory». Quita la `/`: `cd nginx`.
- **Contraste** (`whenNot`): en un guion, mejor la ruta absoluta: una
  relativa depende de la carpeta desde la que se ejecute.
- **Pregunta de comprobación**: la del ejemplo 1 de
  [plantilla-preguntas.md](plantilla-preguntas.md) (predicción con `cd ..` y
  diagnóstico del `cd /nginx`).

Unas 120 palabras de teoría en español: dentro del límite de principiante.

## Ejemplo completo: git, el índice (`git add`)

Punto `w0-add` del mundo 0 (`packages/gitsim/src/levels/basics.ts`). Salida
del motor de git, ejecutada el 2026-11-09.

- **Idea** (`what`): entre tus ficheros y el commit está el índice. `git add`
  elige qué cambios entran en el próximo commit; lo que no añades se queda
  fuera.
- **Por qué** (`when`): tras un rato tocando varias cosas, haces commits
  limpios: uno por cambio.
- **Demostración** (`how`):

  ```text
  echo hola > a.txt
  echo adios > b.txt
  git add a.txt              # solo a.txt al índice
  git status                 # qué entra y qué no
  git commit -m "Primero"
  ```

  `example`: «Antes de verlo: cambias a.txt y b.txt pero solo añades a.txt.
  Tras el commit, ¿qué dirá git status?». Lo que enseña el motor:

  ```text
  $ git add a.txt
  $ git status
  On branch main
  Changes to be committed:
          new file:   a.txt

  Untracked files:
          b.txt
  $ git commit -m "Primero"
  [main c1] Primero
   1 file changed, 1 insertion(+)
   create mode 100644 a.txt
  $ git status
  On branch main
  Untracked files:
          b.txt

  nothing added to commit but untracked files present (use "git add" to track)
  ```

- **Error típico** (`problems`): creer que el commit guarda todo lo que hay en
  la carpeta. Se nota en que, tras el commit, `git status` sigue enseñando
  b.txt en «Untracked files». Añádelo y haz otro commit.
- **Contraste** (`whenNot`): `git add .` añade todo de golpe, también lo que
  no querías (binarios, `.o`, claves). Mira `git status` antes.
- **Cómo se ve** (`looks`): el índice no se dibuja; es lo que irá dentro del
  próximo círculo.
- **Pregunta de comprobación**: la del ejemplo 2 de
  [plantilla-preguntas.md](plantilla-preguntas.md).

Unas 120 palabras de teoría: dentro del límite de principiante.
