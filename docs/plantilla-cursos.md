# Plantilla de los cursos de Not-games

Hasta octubre de 2026 había un solo curso (git) y cada cosa estaba hecha a su
medida. Con el de shell aparece la plantilla: lo que tiene que cumplir
cualquier curso nuevo y las piezas que ya están hechas para reutilizarlas.
Los cursos que la siguen:

| Curso | Motor | Doc |
| --- | --- | --- |
| Git | `packages/gitsim` | [curso-git.md](curso-git.md) |
| Shell de Linux | `packages/shellsim` | [curso-shell.md](curso-shell.md) |
| Docker | `packages/dockersim` (encima de la shell) | [curso-docker.md](curso-docker.md) |
| Kubernetes | `packages/k8ssim` (encima de la shell; despliega lo que publica el de Docker) | [curso-kubernetes.md](curso-kubernetes.md) |

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
   **Entre cursos no se bloquea** (decidido con Alberto el 2026-11-08): el
   orden sugerido es shell → git → Docker → Kubernetes. Si alguien abre un
   curso sin haber hecho lo que conviene antes (en Docker, al menos el nivel
   principiante de shell), arriba del camino sale una sugerencia clara con
   qué terminar antes y el enlace (`CourseOrderHint` de `shared/course`), y
   puede seguir igualmente. En Kubernetes, lo que se sugiere es el nivel
   principiante de Docker.
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
10. **Cómo se explica y cómo se comprueba.** La teoría y el ejemplo de cada
    unidad siguen [plantilla-explicacion.md](plantilla-explicacion.md) (idea
    en una línea, por qué importa, demostración con predicción, error típico
    con su síntoma, contraste, y límite de palabras por nivel). Las preguntas
    del curso en Not-games siguen [plantilla-preguntas.md](plantilla-preguntas.md):
    la mala principal de cada una es el error típico de su unidad. El porqué,
    con fuentes, en
    [referencia/preguntas-investigacion.md](referencia/preguntas-investigacion.md);
    el subagente `didacta` escribe y revisa con las dos plantillas.

## Tiempo estimado y tiempo real

- **Estimación** (`estimateSeconds` en `packages/course/src/estimate.ts`): cada
  punto suma lo que se lee (teoría, ejemplo, historia y tareas, a 180 palabras
  por minuto), un rato fijo para situarse y probar (2,5 min) y cada orden de la
  solución (40 s, por 1,5 de margen); un punto con remoto, 1,5 min más. Un
  contrarreloj cuenta tres cuartos de su límite por 1,6 (algún intento de más)
  en vez de las órdenes. Las pruebas de grupo del curso de git, 20 min cada
  una. Se redondea al minuto. Los números están en `ESTIMATE`, en un solo sitio,
  y son una suposición de partida.
- Se enseña el total del curso con su reparto (niveles en shell, mundos en
  git), el de cada nivel y bloque, y «~N min» en cada punto sin hacer y dentro
  de cada punto (`shared/course/Estimate.tsx`).
- **Tiempo real** (`shared/course/activeTime.ts`): mientras la vista de un punto
  está abierta, con la pestaña a la vista y con algo de actividad (teclas, ratón,
  desplazarse) en el último minuto, cuenta cada 5 s. Se suma en el navegador
  entre visitas y se manda con el intento como `activeSeconds`; si sale, vuelve
  a cero. La API lo apunta en `course_times` (migración 75) solo cuando el punto
  sale: quién, curso, punto, segundos activos, la estimación de ese momento,
  estrellas y si es la primera vez. Nadie más lo ve.
- **Para qué**: calibrar `ESTIMATE` con la mediana real de cada punto y, más
  adelante, enseñar a cada cual cómo va frente a lo que suele tardar la gente.

## Las piezas

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Reglas | `packages/course` | `commandGoals`, `starsFor`, `timeGoals`, `starsForTime`, `unlocked`, `firstOpen`, `Theory`, `UnitKind` |
| Contrato | `packages/contracts/src/course.ts` | `CourseStars`, `CourseBest`, `CourseRun`, `CourseTier`, `CourseCertificate` |
| Terminal | `apps/web/src/shared/course/Terminal.tsx` | Escribir, historial con flechas, `clear`, órdenes de varias líneas (`>`), número de cada orden que cuenta |
| Estrellas | `apps/web/src/shared/course/Stars.tsx` | `StarRules` (comandos o tiempo), `StarsWhy`, `starText`, `clock` |
| Certificados | `apps/web/src/shared/course/Certificates.tsx` | Los niveles superados, en el curso y en el perfil |
| Estimación | `packages/course/src/estimate.ts`, `apps/web/src/shared/course/Estimate.tsx` | `estimateSeconds`, `ESTIMATE`, `wordsIn`; `CourseEstimate`, `EstimateBadge`, `useDuration` |
| Tiempo activo | `apps/web/src/shared/course/activeTime.ts`, `apps/api/src/modules/shellcourse/course-times.ts` | `useActiveTime`, `activeSecondsOf`, `clearActiveTime`; `course_times` |
| Orden entre cursos | `apps/web/src/shared/course/CourseOrderHint.tsx` | Sugerencia (no bloquea) de qué curso o nivel hacer antes, con enlace; nada si ya está hecho |
| Capítulos | `apps/web/src/shared/course/Chapter.tsx` | `CourseChapter` y `useChapters`: cada mundo o bloque, plegado con su número, de qué trata, para qué sirve en la industria, lo hecho y la gente que pide; de entrada solo el que toca, y uno sin alcanzar no se despliega (pedido por Alberto, 2026-10-30). En git, cada mundo con su color y, en sus pruebas de grupo, quién de tu campus las espera (`GET /gitcourse/gates/:id/people`); en shell, la salida de `tree` en una terminal |
| Estilos | `course-*` en `styles/notgames.css` | Terminal, estrellas, recuento, capítulos |
| Textos comunes | `course.*` en `textos/notgames.csv` | Estrellas, recuento, terminal, tiempo |

## Para hacer un curso nuevo

1. Un paquete `packages/<tema>sim` con el motor (puro, con `LIMITS`) y las
   unidades: preparación, ejemplo, solución, qué se comprueba y textos en
   castellano e inglés. Copia la forma de `packages/shellsim/src/course`. Si
   se juega en una shell, se apoya en `@sanatorio/shellsim` con su punto de
   extensión (`extend.ts`, como hace `packages/dockersim`).
2. Tests del motor: cada unidad se gana con su solución con ★★★ y no empieza
   ganada; formas equivalentes; topes; que el motor no importe nada del
   sistema.
3. Un módulo de la API (`modules/<tema>course`) que vuelve a ejecutar y
   guarda el progreso (migración nueva), con sus rutas en `docs/api.md`,
   en `POOL_ROUTES` y sus tablas en `personal`. Un curso de terminal reutiliza
   el servicio del de shell (`createShellCourseService` con su motor y sus
   tablas, como `modules/dockercourse`).
4. Una pestaña en Not-games con el camino, la unidad (las tres pestañas) y
   los jefes, usando las piezas de `shared/course`; textos en su tabla; un
   recorrido en `tests/ui` y su demostración animada. Si conviene hacer antes
   otro curso, `CourseOrderHint` arriba del camino.
