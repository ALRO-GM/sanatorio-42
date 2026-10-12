# Revisión de seguridad y refactorización (octubre de 2026)

Qué se revisó, qué se encontró, qué se cambió y por qué. Está hecha el 12 de
octubre de 2026 sobre el commit `0709b5a`; lo que sale de ella son los commits
`384daf8` a `4eb13fe`.

- [Resumen](#resumen)
- [Cómo se hizo](#cómo-se-hizo)
- [La arquitectura, ¿es la adecuada?](#la-arquitectura-es-la-adecuada)
- [Lo que se encontró y lo que se hizo](#lo-que-se-encontró-y-lo-que-se-hizo)
- [Permisos: quién puede qué](#permisos-quién-puede-qué)
- [Direcciones: qué se ve y qué no](#direcciones-qué-se-ve-y-qué-no)
- [Documentos verificables y cuenta de staff](#documentos-verificables-y-cuenta-de-staff)
- [Demostración pública](#demostración-pública)
- [Tests](#tests)
- [Lo que se deja como está, y por qué](#lo-que-se-deja-como-está-y-por-qué)
- [Pendiente](#pendiente)

## Resumen

La base era sólida: sesión firmada con HMAC y comparación en tiempo constante,
OAuth con `state` y PKCE, todo el SQL con parámetros, validación con zod, cabeceras
de seguridad en el proxy y ninguna vulnerabilidad conocida en las dependencias.
No hizo falta rehacer la arquitectura.

Lo que sí había eran **grietas en los bordes**, y casi todas las encontró un test
nuevo que recorre todas las rutas con entradas imposibles:

| Qué | Antes | Ahora |
| --- | --- | --- |
| Formas encontradas de provocar un error interno | 5 | 0 |
| Copias de la comprobación de admin | 7 | 1, más una barrera global |
| Sitios donde se validaba una fecha, cada uno a su manera | 5 | 1 |
| Topes para lo que no tiene sesión | ninguno | login y clave de staff, por IP |
| Tests de la API | 381 | 483 |
| Tests de la web | 116 | 125 |
| Cobertura de la API (sentencias / ramas) | sin medir | 96,8 % / 90,1 % |
| Código duplicado (jscpd, bloques de 12 líneas o más) | 0,14 % | 0,05 % |

Y dos cosas nuevas que se pidieron: un **código de verificación** en el CSV de
horas con una **cuenta de staff** que solo sirve para comprobarlo, y una
**demostración pública** con datos inventados.

## Cómo se hizo

1. **Lectura** de lo que decide quién entra: montaje de la app, sesión, cookies,
   OAuth, el gancho que corta a bloqueados y aplica el presupuesto, y cada
   fichero de rutas.
2. **Herramientas**: `npm audit` (dependencias), `knip` (código que nadie usa),
   `jscpd` (código duplicado) y la cobertura de `vitest`.
3. **Búsquedas dirigidas**: SQL montado con texto, HTML inyectado, enlaces
   construidos con datos de fuera, entradas de ruta sin validar.
4. **Un test que no se fía de nadie** (`tests/integration/routes.test.ts`):
   saca de la propia app la lista de rutas y a cada una le manda parámetros,
   consultas y cuerpos extremos. Lo que no cumple, falla con su nombre.
5. **Por partes**: cinco cambios independientes, cada uno con su `npm run check`
   en verde y su push.

## La arquitectura, ¿es la adecuada?

Sí, y se deja como está. Es un monolito modular: una carpeta por funcionalidad
con sus rutas, su servicio y su SQL; los módulos solo se hablan por su
`index.ts`, y lo vigila el linter. Para una sola máquina, una sola persona
manteniéndolo y unos cientos de personas usándolo, partirlo en servicios solo
añadiría piezas que vigilar.

Lo que se ha movido es poco y va en la misma dirección que ya llevaba:

- **Lo que es de todos, al núcleo.** La comprobación de admin (`core/actor.ts`),
  el esquema de fecha (`core/validation.ts`), el tope de intentos
  (`core/rate-limit.ts`). Estaban repetidos o no existían.
- **Dos cerraduras para lo importante.** Lo de admin y lo de staff lo comprueba
  cada servicio *y* una barrera global por la que pasan todas las peticiones. Si
  a una ruta nueva se le olvida, la barrera sigue ahí; si la barrera se rompe,
  los servicios siguen comprobando.
- **Las direcciones de la web, en un fichero** (`shared/links.ts`).

Una dependencia que conviene conocer: el gancho global vive en el módulo `admin`
y por eso se registra antes que los demás (`app/composition.ts`). Está escrito
en su cabecera.

## Lo que se encontró y lo que se hizo

Por gravedad. «Dónde» es el fichero principal del arreglo.

| # | Gravedad | Qué pasaba | Qué se hizo | Dónde |
| --- | --- | --- | --- | --- |
| 1 | Media | Un JSON mal escrito, un cuerpo de más de 64 kB o un tipo de contenido desconocido acababan en un **500** en vez de un 400, 413 o 415 | Los rechazos del propio servidor conservan su código, con un mensaje fijo que no cita lo recibido | `core/http/errors.ts` |
| 2 | Media | `GET /admin/stats` y `/admin/flows` daban **500** con una fecha imposible (`2026-13-45`): se miraba la forma, no que el día existiera | Un solo esquema de día, que exige que la fecha exista (`2026-02-31` tampoco pasa) | `core/validation.ts` |
| 3 | Media | `POST /events/alerts/ack` sin cuerpo daba **500** | Sin cuerpo, lo rechaza la validación con un 400 | `modules/meet/index.ts` |
| 4 | Media | La vuelta de 42 (`/auth/callback`) canjea un código contra su servidor y no tenía tope: se podía usar para machacarlo desde nuestra IP | Tope de 200 pasos de login por IP cada diez minutos | `modules/auth/auth.routes.ts` |
| 5 | Media | La comprobación de admin estaba copiada en siete servicios. Bastaba olvidarla en una ruta nueva para dejarla abierta | Una función (`assertAdmin`) y, además, todo `/admin/…` se rechaza a quien no administra antes de llegar al servicio | `core/actor.ts`, `modules/admin/index.ts` |
| 6 | Baja | Tres rutas pasaban `Number(id)` a la base sin validar (`NaN` con un id de texto) | `idParam`, como el resto | `modules/broadcasts`, `modules/admin` |
| 7 | Baja | Un `%` suelto en la dirección (`#/expediente/%`) dejaba **la web en blanco** | Descodificar no lanza: da `null` | `shared/links.ts` |
| 8 | Baja | Los logins iban a las direcciones sin codificar | Todas las direcciones se construyen en un sitio, siempre codificadas | `shared/links.ts` |
| 9 | Baja | Las respuestas de la API no decían nada sobre guardarse; un navegador compartido podía conservar datos de otra persona | `Cache-Control: private, no-store` por defecto | `modules/admin/index.ts` |
| 10 | Baja | La consulta de quién administra no miraba el rol, solo que hubiera una fila | Filtra por `role = 'admin'` | `modules/admin/admin.service.ts` |
| 11 | Baja | El contenedor de la app corría sin root, pero con las capacidades de fábrica | Sin capacidades, sin escalada de privilegios y con tope de procesos | `infra/compose.yml` |
| 12 | Limpieza | Seis funciones que nadie llamaba y dos tipografías que no se usaban | Fuera | varios |
| 13 | Limpieza | El selector de periodo del panel, copiado en tres pestañas; dos utilidades de 42, en dos ficheros | Un componente y un fichero | `admin/RangePills.tsx`, `forty-two/headers.ts` |

De los cinco errores internos (filas 1 a 3), ninguno filtraba datos ni se saltaba
permisos: eran respuestas feas a peticiones mal hechas. Pero un 500 es
exactamente lo que busca quien tantea una web, y ahora no hay ninguno.

### Lo que se comprobó y estaba bien

- **Inyección de SQL**: todo el SQL va con parámetros. Lo que se interpola son
  trozos escritos en el código (nombres de tabla, listas de `?`).
- **XSS**: React escapa todo. El único HTML inyectado es el QR, que genera una
  librería a partir de un texto nuestro. Los enlaces externos son a la intra de
  42 y los construye el servidor.
- **CSRF**: la cookie es `SameSite=Lax` y `__Host-`, la API solo entiende JSON y
  otra web no puede mandar JSON sin permiso de CORS, que solo tienen los
  orígenes de la lista.
- **Sesión**: firmada, con caducidad dentro de la firma, `HttpOnly` y `Secure`.
- **CSV**: las celdas que empiezan por `=`, `+`, `-` o `@` salen desactivadas.
- **Cabeceras** (Caddy): CSP sin scripts en línea, HSTS, `nosniff`,
  `frame-ancestors 'none'`, `Referrer-Policy` y `Permissions-Policy`.
- **Dependencias**: `npm audit` no encuentra ninguna vulnerabilidad.

## Permisos: quién puede qué

| Quién | Cómo entra | A qué llega |
| --- | --- | --- |
| Nadie (sin sesión) | — | La web, la demostración, `/health`, y empezar un login |
| Estudiante | OAuth de 42 | Todo menos `/admin/…` y `/staff/…` |
| Estudiante con la cuenta bloqueada | OAuth de 42 | Solo `/auth/…`, para saber que lo está y poder salir |
| Admin | OAuth de 42, y estar en `ADMIN_LOGINS` o tener el rol | Lo de estudiante y `/admin/…` |
| Staff | Clave que crea un admin | **Solo** `/staff/…` y `/auth/…` |

Los cortes del plan mandan sobre todo lo anterior: al 90 % de un límite solo
pasa quien administra; al 95 %, nadie.

Cada fila tiene su test, que recorre todas las rutas: sin sesión todo da 401, lo
de `/admin` da 403 a quien no administra, una cuenta bloqueada recibe 403 en
todas, y con una sesión de staff ninguna ruta de la gente contesta otra cosa que
401 o 403.

## Direcciones: qué se ve y qué no

- **La sección y la persona van en el hash** (`#/expediente/jdoe`). El navegador
  no manda esa parte al servidor: ni queda en los registros de Caddy, ni sale en
  la cabecera `Referer` al seguir un enlace a otra web.
- **Los logins no se cifran, y es a propósito.** En 42 un login es un
  identificador público: sale en la intra y en cada puesto. Cifrarlo en la
  dirección no protegería nada y rompería los enlaces que la gente se pasa. Lo
  que sí se hace es **codificarlo siempre**, para que un valor raro no pueda
  cambiar la ruta.
- **Lo que no puede ir en una dirección no va**: la sesión viaja en una cookie
  `HttpOnly`; la clave de staff, en el cuerpo de un POST; el código de asistencia
  del QR, en el hash.
- **Los ids de la API son números correlativos** y no se ocultan: lo que decide
  si puedes ver una pizarra o un grupo es el permiso, que se comprueba en cada
  petición, no que no adivines el número.

## Documentos verificables y cuenta de staff

**El problema.** Las horas validadas se descargan en un CSV para enseñárselas al
staff de 42 (por ejemplo, para pedir días de compensación). Un CSV lo edita
cualquiera con un bloc de notas.

**La solución.** La web guarda una copia de cada documento que emite, con un
código de cuatro caracteres:

```
horas-validadas_jdoe_2026-09-12_2026-10-12_K7QF.csv
```

El código va en el nombre del fichero, en su última línea y en la cabecera
`X-Verification-Code`. El staff entra en `/#/validar`, escribe el código y ve
**el documento tal como se emitió**: de quién es, de qué periodo, cuántos
minutos y cada fila. Si además sube el fichero que le han dado, la web le dice si
es idéntico.

Decisiones:

- **El código no es un secreto.** Solo identifica el documento. Lo que protege
  es que la copia buena está en el servidor y que solo la ve el staff. Por eso
  cuatro caracteres bastan: 31⁴ = 923 521 códigos, de un alfabeto sin 0/O ni
  1/I/L para que se pueda dictar.
- **El staff no puede probar códigos al azar**: 60 comprobaciones cada diez
  minutos por cuenta. Recorrerlos todos llevaría más de cien días seguidos, y
  cada intento queda apuntado.
- **El mismo documento, el mismo código.** Descargar dos veces las mismas horas
  no gasta otro código. Cada persona puede emitir 40 documentos distintos al día.
- **La cuenta de staff no es de 42.** La crea quien administra desde el panel
  (Permisos y bloqueos → Cuentas de staff) y se entra con una clave de 256 bits
  que se enseña **una sola vez**: en la base queda su resumen (scrypt con sal).
  Así no hace falta que el staff autorice la aplicación en su cuenta de 42.
- **Esa sesión no sirve para nada más.** Dura dos horas, es `SameSite=Strict`, y
  cualquier ruta que no sea `/staff/…` la rechaza: una por una al leer la sesión,
  y todas juntas en la barrera global.
- **Retirar una cuenta corta al momento**, también las sesiones que ya estaban
  abiertas.
- **Comparar ficheros perdona lo que no importa** (la marca de UTF-8, el tipo de
  salto de línea, espacios al final) y nada más: una cifra cambiada, una fila de
  más o un espacio delante de una celda son «no coincide».

Tablas: `report_exports`, `staff_accounts` y `staff_checks` (migración 33).
Módulo: `apps/api/src/modules/staff`. Contrato: [api.md](api.md#documentos-verificables-y-staff).

Lo que **no** hace: no impide que alguien entregue un documento auténtico de
otra persona (el staff ve de quién es), ni dice nada de documentos emitidos antes
de esta revisión, que no tienen código.

## Demostración pública

**El problema.** Para entrar hace falta una cuenta de 42. Quien no la tiene (un
recruiter, alguien de otra escuela) no puede ver nada.

**Lo que no se ha hecho, y por qué.** Una cuenta de prueba dentro de la web de
verdad vería a la gente real: fotos, puestos, quién corrige a quién. Sería abrir
los datos de los estudiantes a cualquiera.

**Lo que se ha hecho.** La web ya tenía una API de mentira completa, en memoria,
para desarrollar sin servidor. Ahora se compila una segunda vez con ella y se
sirve en [`/demo/`](https://sanatorio42.duckdns.org/demo/): la web entera, con
calendario, proyectos, gente, red de correcciones y panel de gestión inventados.

- **No habla con la API.** Comprobado en un navegador: recorriendo las secciones,
  ninguna petición sale de `/demo/`.
- **No comparte almacenamiento con la web de verdad**, aunque esté en el mismo
  dominio: todo lo que guarda lleva el prefijo `demo:`.
- **Se nota que es una demo**: una etiqueta en la esquina lo dice y lleva a la
  web de verdad.
- **No cuesta nada mantenerla**: el compilador obliga a que la API de mentira
  tenga todo lo que tiene la real, así que la demo no se queda atrás.

## Tests

| Fichero | Qué prueba |
| --- | --- |
| `integration/routes.test.ts` | Todas las rutas: 401 sin sesión, 403 en `/admin`, 403 a bloqueados, y ningún 5xx con 14 valores de parámetro, 5 consultas y 15 cuerpos extremos. Tope de login por IP. `no-store` |
| `integration/staff.test.ts` | La cuenta de staff de punta a punta: crear, entrar, que no llegue a nada más, retirar, cookie retocada; descarga con código, comprobación y comparación |
| `integration/limits.test.ts` | Los cortes del 90 % y 95 % justo en los bordes; la base caída |
| `unit/staff.test.ts` | Reglas del código, del nombre del fichero, de la comparación y del CSV; topes diarios y por ventana en su valor exacto |
| `unit/validation.test.ts` | El esquema de día, textos, ids, `assertAdmin` y el paso de error a respuesta |
| `unit/rate-limit.test.ts` | El tope de intentos: bordes de la ventana y memoria acotada |
| `web/tests/links.test.ts`, `staff.test.ts` | Direcciones codificadas y lo que el staff teclea |

Cada uno prueba primero lo esperado y después el borde: el valor justo en el
límite y el siguiente, lo vacío, lo enorme, lo negativo y lo que no es del tipo
que toca.

Dos tests existentes se cambiaron porque el comportamiento cambió a propósito
(el CSV ahora lleva su línea de código, y hay tres tablas nuevas). Un test nuevo
falló por culpa del propio test (su azar de mentira se repetía cada 31 códigos) y
se corrigió el test, no el código.

## Lo que se deja como está, y por qué

- **La sesión no se puede revocar una a una.** Va entera en la cookie firmada y
  dura doce horas. A cambio no hay tabla de sesiones que consultar en cada
  petición. Una cuenta bloqueada sí se corta al momento, porque el bloqueo se
  mira en la base.
- **El fichero de la guardia, si trae basura, no corta.** Es deliberado: la web
  lleva su propia cuenta del tráfico y manda el peor de los dos, y la guardia
  corta además por su lado en la máquina.
- **`style-src 'unsafe-inline'`** en la política de contenido: React pone estilos
  en línea para anchos y colores calculados. Los scripts en línea siguen
  prohibidos, que es lo que importa.
- **Los topes por IP viven en memoria.** Con un solo proceso basta; al reiniciar
  se pierde la cuenta de una ventana.

## Pendiente

- Rotar el secreto de la app de 42: lo hace Alberto, escribiéndolo directamente
  en `infra/.env` (ver [contexto.md](contexto.md)).
- Los mensajes de error de la API siguen solo en español.
- Tests de componentes de la web: hoy se prueban sus funciones puras y, a mano,
  con el navegador sin ventana.
- Una prueba de carga.
