# Plantilla de los cursos de Not-games

Hasta octubre de 2026 había un solo curso (git) y cada cosa estaba hecha a su
medida. Con el de shell aparece la plantilla: lo que tiene que cumplir
cualquier curso nuevo y las piezas que ya están hechas para reutilizarlas.
Los dos cursos que la siguen son [el de git](curso-git.md) y
[el de shell](curso-shell.md).

## Las reglas

1. **Unidad = teoría + ejemplo + prueba.** Cada conocimiento nuevo es una
   unidad con esas tres partes, en ese orden y en pestañas (`1. Teoría`,
   `2. Ejemplo`, `3. Prueba`):
   - **Teoría** con la misma forma en todos los cursos (`Theory` de
     `@sanatorio/course`): para qué sirve, cómo se usa (órdenes de ejemplo),
     cuándo usarlo y, si toca, cuándo no y con qué tener cuidado. Cada curso
     puede añadir lo suyo (git: «cómo se ve en las ramas»).
   - **Ejemplo** ejecutado de verdad por el motor del curso (no texto escrito
     a mano): en git, la animación de la solución; en shell, unas órdenes que
     se «escriben» solas con su salida real. Así nunca se desfasa.
   - **Prueba** en una terminal con el mismo motor. El objetivo **sale de
     ejecutar la solución** de la unidad, nunca se escribe a mano.
2. **Se apoya en lo anterior.** El camino se abre de uno en uno (`unlocked` y
   `firstOpen` de `@sanatorio/course`): una unidad solo usa lo enseñado antes
   y lo combina.
3. **Bloques con jefe.** Cada bloque (de tres a seis unidades) acaba en un
   **jefe contrarreloj** que junta todo lo del bloque en una historia de
   trabajo («el disco está al 97 %»), sin teoría ni ejemplo: historia, tareas
   y reloj.
4. **Niveles con jefe final.** Cada nivel (principiante, intermedio,
   avanzado) acaba en un **jefe final** más largo; superarlo es el
   **certificado** del nivel, que sale en el perfil (`CourseCertificate`).
5. **Estrellas a la vista desde el principio** (`StarRules`), con un
   desplegable que explica qué cuenta, y el porqué al acabar (`StarsWhy`):
   - Por **comandos** en las unidades (`commandGoals`): ★★★ con tantos como
     la solución, ★★☆ hasta la mitad más uno, ★☆☆ con más. Lo que solo mira
     y lo que falla no cuenta; las **formas equivalentes cuentan igual** (un
     test por curso lo comprueba con variantes).
   - Por **tiempo** en los jefes (`timeGoals`): ★★★ en la mitad del límite,
     ★★☆ hasta tres cuartos, ★☆☆ dentro del límite. Pasado, no hay punto.
6. **La API no se fía de la web.** La web juega con el motor en el navegador
   y manda las órdenes; la API las **vuelve a ejecutar** con el mismo motor,
   calcula las estrellas y, en los contrarrelojes, **mide el tiempo con su
   reloj** (apunta la salida al empezar). Se guarda la mejor vez.
7. **El motor es puro y con topes.** Un paquete de TypeScript sin `fs`,
   procesos, red ni `eval` (un test lo comprueba), con topes de tamaño, de
   salida y de trabajo (`limits.ts`) para que nada de lo que se escriba cuelgue
   la pestaña o la API, y con la API limitando los intentos por persona.
8. **Textos**: lo de la interfaz, en las tablas de textos (cuatro idiomas). El
   contenido de las unidades vive con el motor, en castellano e inglés (como el
   banco de preguntas); en catalán y euskera se enseña el castellano.
9. **Tono**: equipo de programación (on-call, producción, despliegues), en
   segunda persona y sin formas con género cuando se pueda.

## Las piezas

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Reglas | `packages/course` | `commandGoals`, `starsFor`, `timeGoals`, `starsForTime`, `unlocked`, `firstOpen`, `Theory`, `UnitKind` |
| Contrato | `packages/contracts/src/course.ts` | `CourseStars`, `CourseBest`, `CourseRun`, `CourseTier`, `CourseCertificate` |
| Terminal | `apps/web/src/shared/course/Terminal.tsx` | Escribir, historial con flechas, `clear`, órdenes de varias líneas (`>`), número de cada orden que cuenta |
| Estrellas | `apps/web/src/shared/course/Stars.tsx` | `StarRules` (comandos o tiempo), `StarsWhy`, `starText`, `clock` |
| Certificados | `apps/web/src/shared/course/Certificates.tsx` | Los niveles superados, en el curso y en el perfil |
| Estilos | `course-*` en `styles/notgames.css` | Terminal, estrellas, recuento |
| Textos comunes | `course.*` en `textos/notgames.csv` | Estrellas, recuento, terminal, tiempo |

## Para hacer un curso nuevo

1. Un paquete `packages/<tema>sim` con el motor (puro, con `LIMITS`) y las
   unidades: preparación, ejemplo, solución, qué se comprueba y textos en
   castellano e inglés. Copia la forma de `packages/shellsim/src/course`.
2. Tests del motor: cada unidad se gana con su solución con ★★★ y no empieza
   ganada; formas equivalentes; topes; que el motor no importe nada del
   sistema.
3. Un módulo de la API (`modules/<tema>course`) que vuelve a ejecutar y
   guarda el progreso (migración nueva), con sus rutas en `docs/api.md`,
   en `POOL_ROUTES` y sus tablas en `personal`.
4. Una pestaña en Not-games con el camino, la unidad (las tres pestañas) y
   los jefes, usando las piezas de `shared/course`; textos en su tabla; un
   recorrido en `tests/ui` y su demostración animada.
