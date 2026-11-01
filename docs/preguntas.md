# Banco de preguntas de Not-games

El banco vive en `apps/api/src/modules/quiz/bank/` (formato en `types.ts`): cada
entrada es un **concepto** con varias formas de preguntarlo, varias buenas y
muchas malas; cada vez que sale se monta una pregunta distinta (una buena y
tres malas de su misma pinta, `buildRound` en `quiz.rules.ts`). Traducciones
en `bank/en/` y `bank/fr/` (mismas posiciones y cantidades) y Repaso en
`bank/review-*.ts`.

## Criterio de coherencia

Una pregunta no se puede acertar sin saber nada. Para eso:

1. **El tipo de respuesta casa con la pregunta.** Si se pregunta una cantidad
   («¿cuántos…?»), todas las opciones son cantidades, en cifras. Si un
   comando, todas son comandos; si un fichero, ficheros; si «¿qué imprime?»,
   salidas; si «¿por qué?», razones; si «¿qué es X?», definiciones.
2. **La pregunta no delata la respuesta**: la buena no viene escrita en ella,
   ni una definición se contesta con la propia palabra preguntada.
3. **Malas plausibles**: errores que alguien que aprende podría creer, del
   mismo tipo que la buena y de **longitud parecida**: la más larga (o la más
   matizada) no puede ser siempre la buena.
4. **Sin dos buenas**: ninguna mala es también correcta, y las malas comunes
   del concepto valen como malas para todas las formas que las usan.
5. **El `why` es correcto** y explica el porqué en una frase.
6. Una sola pregunta por forma; los números con cifras; todas las buenas de
   una forma con la misma pinta (número, código o texto).
7. Fiel a la realidad: lo que no está claro (un detalle de un enunciado que
   cambia entre versiones) no se pregunta.

## Lo que comprueban los tests

- `tests/unit/quiz-bank.test.ts` y `quiz-bank-lang.test.ts`: ids únicos, tres
  malas de la pinta de cada buena, ninguna buena entre las malas ni escrita en
  la pregunta, números con cifras, slugs que existen, Repaso completo y
  traducciones con la misma forma.
- `tests/unit/quiz-bank-coherence.test.ts` (en es, en y fr): buenas de una
  forma con la misma pinta; a «¿cuántos…?», una cantidad; la buena de texto no
  mide más del doble de la media de las malas que pueden salir con ella (ni
  menos de un tercio); dos conceptos no hacen la misma pregunta (salvo
  «¿qué imprime?» con su código); y la piscina tiene al menos cien conceptos,
  cuatro o más por módulo, que le salen a quien va por ese módulo o por uno de
  después (`fromPiscine` en `bank/piscine-steps.ts`) y a nadie más.

## Quién ve qué

- Sin `needs`: general, a cualquiera.
- `needs.lang`: quien ha tocado ese lenguaje (`languagesOf`); la shell de la
  piscina no cuenta como C.
- `needs.projects`: quien tiene en curso o aprobado alguno de esos slugs. Los
  de la piscina (`c-piscine-shell-00` … `c-piscine-c-13`) piden el módulo y
  todos los siguientes.

## Recuento

Revisión del 2026-11-01: de 175 conceptos se pasó a 478. Se corrigieron 132
de los existentes (sobre todo buenas mucho más largas que sus malas, malas
medio ciertas y preguntas cuyo tipo de respuesta no casaba) y se quitaron 2
que repetían otros generales (`algo-stack`, `algo-sort-complexity`). Nuevos:
97 del common core y 208 de la piscina.

| Parte | Corregidos | Nuevos |
| --- | ---: | ---: |
| General, C (Libft, ft_printf, get_next_line) y Unix (Born2beroot, pipex, minitalk, minishell) | 36 | 24 |
| Algoritmos y gráficos (push_swap, philosophers, so_long, FdF, fract-ol, cub3d, miniRT) | 26 | 25 |
| Redes y web (NetPractice, webserv, ft_irc, Inception, ft_transcendence) | 22 | 21 |
| C++ (CPP 00 a 09), Python y control de versiones | 48 | 27 |
| Piscina: Shell 00 y 01 | — | 52 |
| Piscina: C 00 a C 03 | — | 53 |
| Piscina: C 04 a C 07 | — | 49 |
| Piscina: C 08 a C 13 | — | 54 |

Abajo, por tema y por proyecto (el primer slug de `needs.projects`; en la
piscina y en los CPP, el módulo donde se ve). Para rehacerlas, agrupa `BANK`
por `topic` y por ese slug.

Total: 478; generales: 49; por lenguaje: c 10, python 17

| Tema | Conceptos |
| --- | ---: |
| shell | 48 |
| c++ | 42 |
| git | 28 |
| cadenas | 24 |
| ficheros | 18 |
| memoria | 17 |
| python | 17 |
| recursividad | 13 |
| argumentos | 13 |
| listas | 12 |
| gráficos | 12 |
| redes | 12 |
| algoritmos | 11 |
| concurrencia | 11 |
| procesos | 10 |
| sistema | 9 |
| números | 9 |
| punteros a función | 9 |
| funciones | 8 |
| web | 8 |
| caracteres | 8 |
| árboles | 8 |
| estructuras | 7 |
| punteros | 7 |
| señales | 7 |
| trazado de rayos | 7 |
| http | 7 |
| contenedores | 7 |
| bases | 7 |
| binario | 6 |
| makefile | 6 |
| fractales | 6 |
| raycasting | 6 |
| irc | 6 |
| permisos | 6 |
| tipos | 5 |
| grafos | 4 |
| sockets | 4 |
| bucles | 4 |
| macros | 4 |
| compilación | 4 |
| complejidad | 3 |
| aritmética | 3 |
| arrays | 3 |
| modelos de lenguaje | 2 |
| ssh | 2 |
| norma | 2 |
| cabeceras | 2 |
| variables | 1 |
| json | 1 |
| condiciones | 1 |
| compilar | 1 |

| Proyecto (slugs que lo piden) | Conceptos |
| --- | ---: |
| 42cursus-fdf | 4 |
| 42cursus-fract-ol | 6 |
| 42cursus-ft_printf | 6 |
| 42cursus-get_next_line | 6 |
| 42cursus-libft | 8 |
| 42cursus-minishell | 7 |
| 42cursus-minishell, pipex | 1 |
| 42cursus-philosophers | 4 |
| 42cursus-philosophers, codexion | 7 |
| 42cursus-push_swap | 4 |
| 42cursus-push_swap, 42next-push_swap | 5 |
| a-maze-ing | 2 |
| a-maze-ing, fly-in | 2 |
| born2beroot, 42next-born2beroot | 9 |
| c-piscine-c-00 | 16 |
| c-piscine-c-01 | 13 |
| c-piscine-c-02 | 12 |
| c-piscine-c-03 | 12 |
| c-piscine-c-04 | 12 |
| c-piscine-c-05 | 13 |
| c-piscine-c-06 | 12 |
| c-piscine-c-07 | 12 |
| c-piscine-c-08 | 9 |
| c-piscine-c-09 | 9 |
| c-piscine-c-10 | 9 |
| c-piscine-c-11 | 9 |
| c-piscine-c-12 | 10 |
| c-piscine-c-13 | 8 |
| c-piscine-shell-00 | 28 |
| c-piscine-shell-01 | 24 |
| call-me-maybe | 3 |
| cpp-module-00 | 7 |
| cpp-module-01 | 4 |
| cpp-module-02 | 5 |
| cpp-module-03 | 3 |
| cpp-module-04 | 5 |
| cpp-module-05 | 4 |
| cpp-module-06 | 4 |
| cpp-module-07 | 3 |
| cpp-module-08 | 4 |
| cpp-module-09 | 3 |
| cub3d | 5 |
| cub3d, so_long | 1 |
| ft_irc | 6 |
| ft_transcendence | 7 |
| inception | 4 |
| inception, ft_transcendence | 4 |
| minirt | 6 |
| minirt, cub3d | 1 |
| minitalk | 5 |
| minitalk, 42cursus-minishell | 1 |
| netpractice | 8 |
| netpractice, webserv, ft_irc, inception, ft_transcendence | 1 |
| pipex | 3 |
| pipex, 42cursus-minishell | 7 |
| so_long | 4 |
| so_long, 42cursus-fdf, 42cursus-fract-ol, cub3d, minirt | 4 |
| webserv | 6 |
| webserv, ft_irc | 3 |
| webserv, ft_transcendence | 2 |
