# Plantilla para escribir preguntas

Cómo se escribe una pregunta de conocimiento para el banco de Not-games, sea
de un proyecto de 42, de un curso (shell, git, Docker, Kubernetes) o general.
Complementa el criterio de coherencia de [preguntas.md](preguntas.md) (lo que
ya comprueban los tests) con las reglas de enunciado, de opciones, de dónde
salen las malas y de cómo se varía una pregunta para que no se aprenda de
memoria. Fuentes y porqué en
[referencia/preguntas-investigacion.md](referencia/preguntas-investigacion.md).
El subagente `didacta` (`.claude/agents/didacta.md`) escribe y revisa con
esta plantilla.

## La idea

Un **concepto** no es una pregunta: es lo que se quiere que sepas, con
varias **formas** de comprobarlo (definición, predicción, diagnóstico…),
varias maneras de **decir** cada pregunta y cada buena, y muchas **malas
que salen de errores reales**. Cada vez que sale se monta una pregunta
distinta. Así, para acertar hay que saber la idea, no reconocer la frase.

## Reglas del enunciado

1. **Una sola cosa por pregunta**, importante para el proyecto o el curso;
   nada trivial ni de memoria de detalles que cambian entre versiones.
2. **Se contesta con las opciones tapadas**: quien sabe el tema puede decir
   la respuesta leyendo solo el enunciado. Si no, falta foco.
3. **Corto**: hasta 120 caracteres sin contar el código (`code`). Sin paja,
   sin historias que no hagan falta para contestar.
4. **Bien formado en español**: pregunta con «¿…?», o frase a completar que
   acaba en «…» y que **todas** las opciones completan con concordancia
   (género, número, tiempo verbal). Segunda persona, sin formas con género.
5. **Otras palabras que las del curso**: si la teoría dice «el índice elige
   qué entra en el commit», la pregunta no repite esa frase.
6. **En positivo.** La negativa solo cuando lo que se aprende **es** la
   excepción (ver «Formas negativas»).
7. **Sin pistas**: la buena no aparece escrita en el enunciado ni se deduce
   de él (una definición no se contesta con la palabra preguntada).
8. **Sin trampas ni opiniones**: si quien sabe puede dudar por cómo está
   escrita, se reescribe.

## Reglas de las opciones

1. **Una sola buena.** Ninguna mala es cierta, ni medio cierta, ni cierta en
   otro sistema o versión habitual. Ante la duda, se comprueba en el motor o
   en la herramienta real, y si sigue la duda, la mala se quita.
2. **Mismo tipo que la buena**: si se pregunta una orden, todas son órdenes;
   una salida, salidas; una razón, razones; una cantidad, cantidades en
   cifras. **Misma pinta** (`shapeOf`): o todas con `código` o ninguna.
3. **Longitud parecida**: la buena no es la más larga ni la más matizada
   (los tests lo vigilan: ni más del doble de la media de las malas ni menos
   de un tercio).
4. **Misma gramática**: todas empiezan igual de construidas (todas con verbo,
   o todas con sustantivo) y concuerdan con el enunciado.
5. **Sin absolutos que delatan**: nada de «siempre», «nunca», «todo» solo en
   las malas (o solo en la buena).
6. **Sin palabras gancho**: una palabra del enunciado no aparece solo en la
   buena.
7. **Que no se solapen**: dos malas no pueden ser la misma idea con otras
   palabras (se descartan las dos a la vez).
8. **Prohibidas**: «todas las anteriores», «ninguna de las anteriores»,
   opciones absurdas o de broma, y verdadero o falso disfrazado.
9. **Tres malas buenas mejor que cuatro regulares**: Not-games enseña cuatro
   opciones; si una forma no da para tres malas plausibles, esa forma no se
   escribe.

## De dónde salen las malas

Cada mala tiene que ser **algo que alguien que aprende podría creer**. Al
escribirla se sabe de cuál de estas fuentes sale; si no sale de ninguna,
probablemente es de relleno.

| Fuente | Qué es | Ejemplo (shell / git) |
| --- | --- | --- |
| Concepto vecino | Se confunde con otra orden o idea parecida | `git log` por `git status`; `cd ~` por `cd ..` |
| Sobregeneralizar | Lo que vale en un caso se aplica a todos | «El commit guarda todo lo que hay en la carpeta» |
| Quedarse corto | Se aplica a menos casos de los que toca | «`chmod` solo cambia permisos de ficheros, no de carpetas» |
| Dirección u orden al revés | Origen y destino, padre e hijo, quién se une a quién | `cp destino origen`; leer `640` como otros, grupo, dueño |
| Cuenta a medias | Un paso del cálculo bien y otro mal | `6` = `r-x` (cambiar lo que vale `w` y `x`) |
| Modelo de otro sistema | Lo que pasa en Windows, en otra herramienta, o en la vida diaria | «`Notas.txt` y `notas.txt` son el mismo fichero» |
| Nombre engañoso | Lo que sugiere la palabra y no hace | «`git checkout` comprueba que no haya errores» |
| Síntoma de otro error | El mensaje real de otro fallo | «Hace falta `sudo`» ante un «No such file or directory» |
| Error típico de la teoría | El de la pieza 4 de [plantilla-explicacion.md](plantilla-explicacion.md) | Poner `/` delante sin querer |
| Lo que falla la gente | Las malas más elegidas en Not-games, cuando se midan | — |

Malas que **no** valen, y por qué:

- `/var/log/nginx/..` como mala de «¿adónde te lleva `cd ..` desde
  `/var/log/nginx`?»: es la misma carpeta que la buena. Medio cierta.
- `git commit main.c` como mala de «¿cómo guardas solo `main.c`?»: en git de
  verdad, con un fichero ya seguido, funciona. Cierta en la herramienta real.
- «Borra el disco duro»: absurda; nadie la elige y deja tres opciones.
- «Todas las anteriores»: prohibida.

## Variantes: que no se aprenda la frase

Inspirado en los **modelos de ítem** y los **isomorfos** de la generación
automática de preguntas (Gierl y Lai; Bejar): el mismo conocimiento, preguntado
desde varios lados y con otras palabras, midiendo lo mismo.

### Ángulos del enunciado (cada uno es una `form`)

| Ángulo | Pregunta | Las opciones son |
| --- | --- | --- |
| Definición | «¿Qué hace X?», «X sirve para…» | Efectos o usos |
| Inversa | «Quieres conseguir Y. ¿Qué escribes?» | Órdenes |
| Predicción | «Estás en A y escribes X. ¿Qué pasa / qué imprime?» | Salidas o estados |
| Diagnóstico | «Ves este error/síntoma. ¿Por qué?» | Causas |
| Escenario | Una situación de trabajo corta y qué harías | Acciones |
| Negativa | «¿Cuál NO…?» | Afirmaciones ciertas y una falsa |
| Contraste | «¿Qué diferencia X de Z?» | Diferencias |

Mínimo por concepto: **dos formas de ángulos distintos**, y al menos una de
predicción, diagnóstico o escenario (aplicar, no solo recordar). Mínimo por
forma: **dos maneras de preguntar** (una pregunta y una frase a completar, o
dos paráfrasis) y, cuando la buena se pueda decir de otra forma, **dos
buenas** de la misma pinta y longitud parecida.

### Paráfrasis de la pregunta

Cambia el orden y las palabras, no el contenido: «¿Qué te dice `git
status`?» / «`git status` sirve para ver…». No vale cambiar lo que se
pregunta (eso es otra forma), ni meter una pista en una de las dos.

### Opciones

- **Orden al azar** para cada persona (`orderFor` en `quiz.rules.ts`): no
  hace falta pensar en dónde va la buena.
- **Buenas parafraseadas** en `right` (sale una).
- **Más malas que huecos**: cinco o más por forma (o comunes al concepto),
  para que no salgan siempre las mismas tres.

### Formas negativas

- La negación en **mayúsculas**: «¿Cuál de estas órdenes NO…?», «…todas
  EXCEPTO…».
- **La buena es la única falsa** y las malas son **afirmaciones ciertas**:
  por eso una forma negativa lleva **al menos tres malas propias** de la
  misma pinta que la buena. Si llevara menos, `buildRound` completaría con
  las malas comunes del concepto, que son falsas, y saldrían dos buenas.
- Nunca doble negación: enunciado negativo y opciones en positivo.
- Como mucho una forma negativa por concepto.

### Modelos con huecos

Cuando un concepto se pregunta igual con distintos valores (permisos en
octal, cuántos commits hay tras un `merge`, qué puerto publica un `-p`), se
escribe **un modelo**: el enunciado con huecos, los valores posibles y, para
cada mala, la **regla de error** que la produce. Cada valor sale como una
forma del concepto, con su buena y sus malas propias calculadas por las
reglas. Ver el ejemplo 3.

## Forma de los datos

El banco ya tiene la forma que hace falta (`Concept` en
`apps/api/src/modules/quiz/bank/types.ts`): un concepto con `forms` (cada una
con `ask`, `right` y `wrong` propias), `wrong` comunes, `why`, `level`,
`kind`, `needs` y `code`. Las variantes de esta plantilla caben sin cambiar
nada:

- Cada **ángulo** es una `form`.
- Las **paráfrasis** son las entradas de `ask` y de `right`.
- Las malas que solo pegan con una forma (las de una negativa, las de una
  predicción) van en su `wrong`; las que valen para varias, en el `wrong` del
  concepto.
- El `why` explica el error típico en una frase: es la retroalimentación que
  corta el efecto de quedarse con la mala.
- La **pregunta de un curso** va en el banco como cualquier otra: general
  (`needs: {}`) y con el `id` empezando por el del curso (`shell-…`,
  `git-…`, `docker-…`, `k8s-…`), con su entrada de Repaso (`review-*.ts`).
- Las traducciones (`bank/en/`, `bank/fr/`) llevan las mismas formas, en el
  mismo orden y cantidad, como hoy.

Propuesta, **sin implementar**: si hiciera falta medir qué ángulo cuesta más
o qué error comete cada cual, se añadirían a `ConceptForm` dos campos
opcionales, `angle` (los ángulos de la tabla) y `sources` (de qué fuente sale
cada mala, por posición). No cambian cómo se monta una pregunta ni las
traducciones; se añaden solo cuando algo los vaya a leer, para no dejar campos
sin uso.

## Lista de revisión de un concepto

- [ ] Una idea importante; el `id` es estable y dice el tema.
- [ ] Dos formas o más, de ángulos distintos; una de aplicar.
- [ ] Cada forma con dos maneras de preguntar; buenas parafraseadas si se
      puede.
- [ ] Con las opciones tapadas se puede contestar.
- [ ] Cada mala sale de una fuente de la tabla; ninguna es cierta, ni medio
      cierta, ni cierta en la herramienta real.
- [ ] Todas las opciones de una forma: mismo tipo, misma pinta, longitud y
      gramática parecidas; sin absolutos ni palabras gancho.
- [ ] La negativa, si la hay: NO en mayúsculas, tres malas propias ciertas.
- [ ] El `why` explica el error típico en una frase.
- [ ] Lo afirmado, comprobado en el motor del curso o en la herramienta.
- [ ] Inglés y francés con la misma forma; francés con sus espacios.
- [ ] `npm run check` en verde (los tests del banco miran pinta, longitud,
      duplicados y traducciones).

## Ejemplo 1: shell, rutas (`cd`)

Comprueba la unidad `cd` (ver [plantilla-explicacion.md](plantilla-explicacion.md)).
Afirmaciones comprobadas en el motor de shell el 2026-11-08. Está en el banco
(`bank/courses.ts`), junto a `docker-ports` y `k8s-pod-status`.

```ts
{
  id: 'shell-cd-rutas',
  topic: 'shell',
  needs: {},
  kind: 'quick',
  level: 1,
  forms: [
    {
      // Predicción. Con `cd ..` a secas la buena (`/var/log`) estaría escrita
      // dentro del enunciado (`/var/log/nginx`) y el test lo rechaza: por eso
      // `cd ../peer4u`.
      ask: [
        'Estás en `/var/log/nginx` y escribes `cd ../peer4u`. ¿Dónde acabas?',
        'Desde `/var/log/nginx`, `cd ../peer4u` te lleva a…',
      ],
      right: ['`/var/log/peer4u`'],
      // No sube (ignora ..), raíz (cree que .. va arriba del todo), sube dos,
      // casa (lo confunde con ~).
      wrong: ['`/var/log/nginx/peer4u`', '`/peer4u`', '`/var/peer4u`', '`/home/peer/peer4u`'],
    },
    {
      // Diagnóstico
      ask: [
        'Estás en `/var/log` y `cd /nginx` dice «No such file or directory». ¿Por qué?',
        'Desde `/var/log`, `ls` enseña `nginx`, pero `cd /nginx` falla. ¿Qué pasa?',
      ],
      right: ['Con `/` delante, busca `nginx` en la raíz', 'La `/` del principio parte de la raíz'],
      // Síntoma de otro error (permisos), concepto vecino (ls), quedarse corto.
      wrong: [
        'Hace falta `sudo` para entrar en `nginx`',
        'Las carpetas se abren con `ls`, no con `cd`',
        '`cd` no entra en carpetas fuera de tu `home`',
        '`nginx` es un fichero, no una carpeta',
      ],
    },
    {
      // Negativa: la buena es la única que NO lleva; las malas son ciertas.
      ask: [
        'Estás en `/var/log`. ¿Cuál de estas órdenes NO te lleva a `/var/log/nginx`?',
        'Desde `/var/log`, todas te llevan a `/var/log/nginx` EXCEPTO…',
      ],
      right: ['`cd /nginx`'],
      wrong: ['`cd nginx`', '`cd ./nginx`', '`cd /var/log/nginx`', '`cd ../log/nginx`'],
    },
  ],
  // Sin comunes: cada forma lleva las suyas.
  wrong: [],
  why: 'Una ruta con / delante parte de la raíz; sin ella, de donde estás. Y .. sube una carpeta.',
}
```

Cuántas preguntas distintas salen: la primera forma, 2 enunciados × 1 buena
× 4 combinaciones de tres malas = 8; la segunda, 2 × 2 × 4 = 16; la
negativa, 2 × 1 × 4 = 8. Con el orden al azar, nadie ve dos veces la misma
pantalla seguida.

## Ejemplo 2: git, el índice (`git add`)

Comprueba el punto `w0-add` del curso de git. La salida de la predicción es
la del motor de git (ver [plantilla-explicacion.md](plantilla-explicacion.md)).

```ts
{
  id: 'git-index',
  topic: 'git',
  needs: {},
  kind: 'quick',
  level: 1,
  forms: [
    {
      // Definición
      ask: ['¿Para qué sirve el índice (staging area) de git?', 'El índice de git sirve para…'],
      right: ['Elegir qué cambios entran en el próximo commit', 'Preparar lo que guardará el próximo commit'],
    },
    {
      // Predicción
      ask: [
        'Cambias `a.txt` y `b.txt`, haces `git add a.txt` y un commit. ¿Qué dice después `git status`?',
      ],
      right: ['Que `b.txt` sigue con cambios sin preparar'],
      wrong: [
        'Que `b.txt` también entró en el commit',
        'Que `a.txt` sigue con cambios sin preparar',
        'Que `b.txt` está preparado para el commit',
        'Que `git status` no tiene nada que decir',
      ],
    },
    {
      // Escenario (inversa)
      ask: [
        'Has tocado `main.c` y `notas.txt`, y solo quieres guardar `main.c`. ¿Qué haces?',
        'Para que el commit lleve `main.c` y no `notas.txt`, escribes…',
      ],
      right: ['`git add main.c` y luego `git commit`'],
      wrong: [
        '`git add .` y luego `git commit`',
        '`git commit -a` y luego `git push`',
        '`git status` y luego `git commit`',
        '`git push` y luego `git add main.c`',
      ],
    },
    {
      // Negativa: las malas son cosas que add sí hace.
      ask: ['¿Cuál de estas cosas NO hace `git add`?', '`git add` hace todo esto EXCEPTO…'],
      right: ['Guardar el cambio en la historia (`git log`)'],
      wrong: [
        'Preparar un fichero nuevo para el `commit`',
        'Preparar los cambios de un fichero ya seguido',
        'Hacer que `git status` lo enseñe como preparado',
        'Elegir qué entra en el próximo `commit`',
      ],
    },
  ],
  // Comunes: valen para la definición (concepto vecino, sobregeneralizar).
  wrong: [
    'Guardar una copia de seguridad de la carpeta',
    'Listar los commits de la rama actual',
    'Subir los cambios al repositorio remoto',
    'Apuntar qué ficheros ignora git',
  ],
  why: 'git add solo prepara: el commit guarda lo preparado, y lo que no añadiste se queda fuera.',
}
```

La definición no lleva malas propias: usa las comunes, todas de texto como
su buena. La negativa lleva cuatro propias, ciertas y con código como su
buena, así que nunca se mezcla con las comunes.

## Ejemplo 3: un modelo con huecos (permisos en octal)

Enunciado: «Tras `chmod {modo} informe.txt`, ¿qué enseña `ls -l` al
principio de la línea?». Valores: `640`, `755`, `600`, `644`, `700`. La buena
la da el motor (comprobado: `640` → `-rw-r-----`, `755` → `-rwxr-xr-x`, igual
que en bash). Cada mala sale de una regla de error:

| Regla | Qué cree quien la elige | `640` da |
| --- | --- | --- |
| Orden al revés | Las cifras van otros, grupo, dueño | `----r--rw-` |
| Cuenta a medias | `w` vale 1 y `x` vale 2 | `-r-xr-----` |
| Confundir con la máscara | Las cifras dicen lo que se **quita** | `---x-wxrwx` |
| Solo el dueño | La primera cifra vale para todos | `-rw-rw-rw-` |

Cada valor es una forma del concepto (`ask` con el valor puesto, su `right` y
sus cuatro malas propias). Se escriben a mano o con una función en el propio
fichero del banco que devuelva las formas, la misma para `en` y `fr` con su
enunciado traducido. Si dos reglas dan lo mismo para un valor, se quita la repetida y, si quedan
menos de tres, ese valor no se usa. Y si una regla da la propia buena, se
quita: con `700`, cambiar lo que valen `w` y `x` deja el `7` igual (`rwx`), y
esa «mala» sería `-rwx------`, la buena.
