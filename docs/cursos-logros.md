# Juego de los cursos: clasificaciones y logros

Pedido por Alberto el 2026-11-08: que los cuatro cursos de Aprender (shell,
git, Docker y Kubernetes) tengan su parte de juego en Clasificaciones y logros
que se luzcan como título del banner.

Ampliado el 2026-11-13 con el quinto curso, el de NetPractice
([curso-netpractice.md](curso-netpractice.md)): tiene su clasificación y sus
cinco logros con título, banner y XP, como los de Docker y Kubernetes. No
depende de ningún otro curso, así que **no entra en el orden sugerido**: los
logros «de todos» (`courses_explorer`, `courses_all`, `courses_order`) siguen
siendo de los cuatro de siempre, y quien ya los tenía no los pierde.

Los logros no tienen tabla propia: salen de lo que ya guarda cada curso
(`shell_progress`, `git_progress`, `docker_progress`, `k8s_progress`, `net_progress`). Módulo
`modules/courses` (solo lee); las reglas, en `courses.rules.ts`. Ampliado el
2026-11-09 (también pedido por Alberto): los logros dan XP y se celebran en
pantalla al conseguirlos (ver «XP» y «Celebración», más abajo); eso vive en
`modules/profile` y guarda lo celebrado en `unlock_announcements` (migración 90).

## Qué cuenta

| Cifra | Qué es |
| --- | --- |
| Estrellas (puntos) | La mejor nota (1–3) de cada punto superado del camino. Es lo que ordena las clasificaciones de cada curso y del total |
| Superados | Puntos del camino superados |
| Jefes | Shell, Docker, Kubernetes y NetPractice: los contrarrelojes de bloque y los jefes finales de nivel. Git: los repasos de mundo (`w*-world`) y el jefe final (`boss`) |
| Certificados | Shell, Docker, Kubernetes y NetPractice: los tres jefes finales de nivel. Git no tiene niveles: cuenta su jefe final |
| Terminado | El último punto del camino (el jefe final avanzado; en git, `boss`). El camino va en orden: sin los anteriores no se llega |

## Clasificaciones (Campus → Clasificaciones)

Debajo de las de Ayuda y con su mismo periodo (este mes, desde el día 1 en
UTC, o siempre): todos los cursos, uno por curso, jefes vencidos y
certificados. Cada una con las cifras del campus, los 10 primeros con foto y tu
fila aunque no entres. Como en las de Ayuda, solo cuenta la gente del campus
que miras y de tu mundo (un estudiante no ve piscineros ni a nadie oculto), y
se quita antes de poner los puestos. Mientras carga, la animación de progreso
(`HeavyLoad`/`ReloadState`). `GET /courses/ranking` (`docs/api.md`).

## Logros y títulos

27 logros, en el bloque de logros del perfil (en columnas, bajo los de
siempre) y en el perfil público. Cada logro conseguido es también un título:
sale en el desplegable de títulos (solo los conseguidos, para no llenarlo de
apagados) y la API no deja ponerse uno que no se tiene.

| Logro | Cuándo | Título |
| --- | --- | --- |
| `shell_first` · `docker_first` · `k8s_first` · `git_first` | El primer punto del curso | `$ echo hola` · `docker run hello-world` · `kubectl get pods` · `git init` |
| `<curso>_beginner` / `_intermediate` / `_advanced` | Cada certificado de nivel (shell, Docker, Kubernetes) | Pipes bajo control, Script que funciona, Root de corazón; En mi contenedor funciona, Imagen ligera, Capitanía de contenedores; Pods en pie, Rollout sin sustos, Al timón del clúster |
| `<curso>_bosses` | Todos los jefes del curso con tres estrellas | kill -9 a los jefes · Exit code 0 · Cero CrashLoopBackOff · Historial limpio (git: repasos de mundo y jefe final) |
| `net_first` · `net_beginner` / `_intermediate` / `_advanced` · `net_bosses` | Lo mismo en el curso de NetPractice: el primer punto, cada certificado y todos los jefes con tres estrellas | ping 127.0.0.1 · En mi subred funciona, Ruta por defecto, Enruta medio internet · 0 % packet loss |
| `git_group` | Las tres pruebas de grupo de git | Sin conflictos de merge |
| `git_boss` | El jefe final de git | git push --force (con permiso) |
| `courses_explorer` | Empezar los cuatro cursos | Un poco de todo |
| `courses_all` | Terminar los cuatro | De la shell al clúster |
| `courses_order` | Terminarlos en el orden sugerido (shell → git → Docker → Kubernetes), cada uno no antes que el anterior | Pipeline en orden |

El avance de un logro sin conseguir se enseña como «lo que llevas / la meta»:
puntos del nivel para un certificado, jefes con tres estrellas, cursos
empezados o terminados, y cursos terminados seguidos en el orden sugerido.

## Banners

Cada título de los cursos trae el banner de su curso (`styles/banners.css`,
por el prefijo del id): el `$ _` de la terminal en shell, ramas en git,
contenedores apilados en Docker, un panal en Kubernetes, máquinas unidas a un
router en NetPractice y la bandera de cuadros en los de todos. El color dice lo conseguido: acento para el primer punto,
verde para principiante y las pruebas de grupo, dorado para avanzado y el jefe
final de git, y el color de peligro para todos los jefes con tres estrellas. El
icono es el de la pestaña del curso (`shared/courseTitles.ts`).

## XP

Cada logro de los cursos da XP una sola vez, y cuenta para el nivel
(`COURSE_XP` en `modules/profile/xp.rules.ts`):

| Logro | XP |
| --- | --- |
| `<curso>_first` (el primer punto; también `net_first`) | 10 |
| `<curso>_beginner` · `_intermediate` · `_advanced` (cada certificado; también los de `net`) | 25 · 40 · 60 |
| `<curso>_bosses` (todos los jefes con tres estrellas; también `net_bosses`) | 50 |
| `git_group` (las tres pruebas de grupo) · `git_boss` (el jefe final) | 40 · 60 |
| `courses_explorer` (empezar los cuatro) | 20 |
| `courses_all` (terminar los cuatro) | 100 |
| `courses_order` (en el orden sugerido) | 50 |

Los 22 de los cuatro cursos suman 885 XP y, con los cinco de NetPractice (185),
los 27 suman 1 070: el nivel 6 entero, más que una sesión de ayuda
suelta pero menos que lo que da ayudar a menudo, que es para lo que está la
web. No entra en la clasificación de quién ayuda más (`HELP_KINDS`).

Cómo se cobra: al mirar el expediente o lo desbloqueado, la API apunta en
`xp_events` (`kind: course_achievement`, `ref` = el id del logro) la XP de cada
logro conseguido que aún no la tenía. La restricción única
`(login, kind, ref)` hace que no se cobre dos veces aunque lleguen dos
peticiones a la vez, y como sale de lo superado, también la cobra quien ya los
tenía antes de que dieran XP (nadie escribe a mano en la base). Si se cambia una
cifra, lo ya cobrado se queda como estaba. En «Cómo se gana XP» sale como «+10
XP o más por cada logro de los cursos» y en la lista de logros, cada uno con la
suya.

## Celebración

Al conseguir algo que trae título y banner nuevos sale una ventana
(`features/unlocks/UnlockCelebration.tsx`) con el banner (con un pequeño salto
y un brillo, sin movimiento para quien lo pide menos), lo conseguido, la XP que
da, «Lucirlo ahora» (se pone el título) y «Ahora no». Si hay varias, una detrás
de otra, diciendo cuántas quedan. Es un `<dialog>` modal (`shared/ui/Modal`):
el foco queda dentro, va a «Lucirlo ahora» y Escape la cierra.

Qué se celebra: los logros de los cursos, los títulos de nivel (del 2 en
adelante) y el de maestro del código. Los de Code Clicker no: ya los anuncia
su juego al pillarte.

Cuándo se mira: al abrir la web y tras cada punto superado de un curso (el
cliente de la API avisa al recibir un intento superado; la sala de una prueba
de grupo de git, una vez por sala: `shared/unlocks.ts`). Espera a que acaben la
bienvenida y el Pomodoro.

Cómo se sabe que es nuevo: lo guarda la API (`GET /me/unlocks`,
`POST /me/unlocks/seen`), no el navegador, así que no se repite al recargar ni
en otro dispositivo. La primera vez que se pregunta por alguien, todo lo que ya
tenía se apunta como celebrado sin enseñarlo (una fila con `unlock = ''` dice
que esa primera cuenta ya se hizo): quien ya tenía logros no recibe una lluvia
de ventanas. Como la web pregunta nada más abrirse, lo que se consiga después
ya sale.

En la demostración: con `?logro` en la dirección sale una al abrir, y el primer
punto superado del curso de Kubernetes (el que la persona de la demo no ha
empezado) da su logro y su ventana.

## Dudas abiertas

- Las cifras de XP son a ojo: se ajustarán al ver cómo se usa.
- Si la primera pregunta de alguien falla (sin conexión) y supera un punto
  antes de la siguiente, ese primer logro entra en la primera cuenta y no se
  celebra (la XP sí se cobra).
