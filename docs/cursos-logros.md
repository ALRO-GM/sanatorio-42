# Juego de los cursos: clasificaciones y logros

Pedido por Alberto el 2026-11-08: que los cuatro cursos de Aprender (shell,
git, Docker y Kubernetes) tengan su parte de juego en Clasificaciones y logros
que se luzcan como título del banner.

No hay tabla nueva (la migración 89 quedó reservada y sin usar): todo sale de
lo que ya guarda cada curso (`shell_progress`, `git_progress`,
`docker_progress`, `k8s_progress`). Módulo `modules/courses` (solo lee); las
reglas, en `courses.rules.ts`.

## Qué cuenta

| Cifra | Qué es |
| --- | --- |
| Estrellas (puntos) | La mejor nota (1–3) de cada punto superado del camino. Es lo que ordena las clasificaciones de cada curso y del total |
| Superados | Puntos del camino superados |
| Jefes | Shell, Docker y Kubernetes: los contrarrelojes de bloque y los jefes finales de nivel. Git: los repasos de mundo (`w*-world`) y el jefe final (`boss`) |
| Certificados | Shell, Docker y Kubernetes: los tres jefes finales de nivel. Git no tiene niveles: cuenta su jefe final |
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

22 logros, en el bloque de logros del perfil (en columnas, bajo los de
siempre) y en el perfil público. Cada logro conseguido es también un título:
sale en el desplegable de títulos (solo los conseguidos, para no llenarlo de
apagados) y la API no deja ponerse uno que no se tiene.

| Logro | Cuándo | Título |
| --- | --- | --- |
| `shell_first` · `docker_first` · `k8s_first` · `git_first` | El primer punto del curso | `$ echo hola` · `docker run hello-world` · `kubectl get pods` · `git init` |
| `<curso>_beginner` / `_intermediate` / `_advanced` | Cada certificado de nivel (shell, Docker, Kubernetes) | Pipes bajo control, Script que funciona, Root de corazón; En mi contenedor funciona, Imagen ligera, Capitanía de contenedores; Pods en pie, Rollout sin sustos, Al timón del clúster |
| `<curso>_bosses` | Todos los jefes del curso con tres estrellas | kill -9 a los jefes · Exit code 0 · Cero CrashLoopBackOff · Historial limpio (git: repasos de mundo y jefe final) |
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
contenedores apilados en Docker, un panal en Kubernetes y la bandera de cuadros
en los de todos. El color dice lo conseguido: acento para el primer punto,
verde para principiante y las pruebas de grupo, dorado para avanzado y el jefe
final de git, y el color de peligro para todos los jefes con tres estrellas. El
icono es el de la pestaña del curso (`shared/courseTitles.ts`).

## Dudas abiertas

- Los logros no dan XP: son reconocimiento, como los títulos de Code Clicker.
- No avisan al conseguirlos: se ven en el perfil y en el desplegable.
