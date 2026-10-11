# Sanatorio 42

Web para estudiantes de 42. Cuando te atascas en un proyecto ves quién puede
ayudarte (quién lo está haciendo, quién ya lo aprobó, dónde está sentado y si
está de guardia), y alrededor de eso: terapias de grupo, tablón de dudas,
calendario de pizarras, un expediente con XP y la red de correcciones del campus.

Los datos de 42 se copian poco a poco a una base local, así que abrir cualquier
pantalla no gasta peticiones de la API de 42.

## Funcionalidades

**Sala de espera** (portada). Eliges un proyecto y ves quién puede ayudarte: quién
lo está haciendo, quién ya lo aprobó (*especialista*, o *eminencia* si fue con
125), dónde está sentado y si está de guardia. Incluye el mapa de clusters con
fotos, si ya os habéis corregido antes (o es una "cara nueva") y quién se ofrece
a **preevaluar** proyectos terminados.

**Guardia** (se abre desde "De guardia", en la cabecera). Marcas las medias horas
de hoy en las que te ofreces y un tope de tiempo. Quien lo necesita te reserva un
rato y tú lo aceptas. La sesión solo da XP si se comprueba que estuvisteis en el
campus y las dos partes se valoran. Se puede bloquear a alguien.

**Tablón**. El plan de estudios de cada persona como un grafo por círculos (el
clásico de C o el nuevo de Python, según su plan), con los proyectos del tamaño de
sus horas estimadas y los plazos por *pace*. Cada proyecto tiene dudas con
respuestas y una guía que se edita por propuestas validadas.

**Terapia**. Grupos para días concretos, con puestos reservados en el cluster
(de dos a seis, juntos), cómo lleva el proyecto cada quien, chat del grupo y dos
tipos: para avanzar o de repaso (proyecto terminado, antes de presentarlo).

**Pizarras**. Alguien explica algo a quien se apunte; calendario propio.

**Calendario**. Todo lo tuyo en un sitio: guardia, reservas, terapias, pizarras y
lo de 42 (correcciones, eventos, exámenes). Día, semana o mes, por tipos.

**Avisos y sala del evento**. Unos minutos antes de cada evento salta una ventana
con qué es, dónde y cuándo. Si es con más gente: "lo he visto", "me retraso" o
"no puedo ir" con motivo, y un chat que comparten todos. Pizarras y sesiones de
ayuda validan la asistencia con dos códigos (inicio y fin), a mano o por QR.

**Red de correcciones**. Grafo de burbujas que se recoloca solo con quién ha
corregido a quién en el 42cursus del campus: comunidades, endogamia, lo que cada
quien aprueba como corrector y lo que le aprueban como corregido, los más
estrictos, parejas, proyectos y filtros por fecha, persona, proyecto y veredicto.

**Expediente** (la cruz del logo). Nivel y títulos por XP, estado de salud (a qué
*pace* vas, cuándo caerías al siguiente y cuándo te alcanza el black hole, con
calculadora), tu red de correcciones, logros y ranking. El de los demás se puede
abrir, en versión pública.

**Personalizar** (⚙). Orden de pestañas y de bloques, qué sale plegado y con
cuánta antelación avisar. El orden puede ser manual o automático, según tu uso o
el de la comunidad.

**Buzón** (pie de página). Incidencias y sugerencias con respuesta, y "Denunciar"
en mensajes, pizarras y dudas.

**Panel de gestión** (📊, solo admins). Consumo por persona y por hora con avisos
de exceso, tope de uso que se reparte solo, permisos, bloqueos, buzón, registro
de mensajes y mapa de calor de qué se usa.

Además: español e inglés, modo nocturno y varios campus.

## Decisiones de implementación

- **Réplica local de 42.** La API de 42 da 1 200 peticiones por hora para toda la
  aplicación. En vez de preguntarle en cada pantalla, se copia a SQLite lo que
  hace falta y las lecturas salen de ahí. Solo se guarda lo que la web enseña.
- **Lo caro, una vez y despacio.** El histórico (proyectos, correcciones) se copia
  con un cursor guardado, sin tocar una reserva horaria; después solo se pide lo
  que cambia. El repaso completo corre cuando nadie usa la web.
- **Lo que 42 no publica se deduce de los datos**: el plan de cada persona y el
  círculo de cada proyecto (de sus rangos y fechas), la nota mínima de cada
  proyecto (de cómo ha acabado la gente) y el *pace* (de cuándo completó cada
  círculo y de su fecha oficial de black hole).
- **Un suspenso es la nota, no la marca.** 42 guarda "Ok" también en correcciones
  con un 0: el veredicto sale de la nota y la mínima del proyecto.
- **Monolito modular.** Una carpeta por funcionalidad, con su repositorio (SQL),
  su servicio (reglas) y sus rutas; los módulos solo se hablan por su `index`, y
  lo vigila el linter. Un contrato de tipos compartido evita que API y web se
  desincronicen.
- **XP que no se puede puentear.** Cada punto sale de un hecho comprobable (una
  respuesta que resuelve, una sesión con sus dos códigos y valorada por los dos), una sola
  vez por referencia y con topes.
- **SQLite y una sola máquina.** Sin servicios que mantener: un fichero, copias
  con un script y Caddy delante. Cabe en la capa gratuita de Oracle.
- **Sin estado de más en el navegador.** La navegación va en el hash, la
  personalización en `localStorage`, y cada sección se descarga al abrirla.
- **El grafo en `<canvas>`.** Con miles de burbujas el SVG no da abasto; la física
  es `d3-force` y lo que cambia a cada fotograma no pasa por React.
- **Privacidad.** No se guardan correos, teléfonos ni los comentarios de las
  correcciones. El expediente ajeno es una versión recortada.

## Estructura

```
apps/
  api/                 API (Node 22, Fastify, SQLite con libSQL)
    src/
      main.ts          punto de entrada: abre el puerto y arranca la sincronización
      app/             montaje: composición de módulos, CORS, errores, salud
      config/          variables de entorno, validadas al arrancar
      core/            lo que no es de ninguna funcionalidad: base de datos y
                       migraciones, errores, eventos, sesión, contrato de módulo
      integrations/    cliente de la API de 42 (token, límite de peticiones, tipos)
      modules/         una carpeta por funcionalidad (ver abajo)
      cli/             comandos: migrar, estado y avance de la réplica
    tests/             unit/ e integration/
  web/                 web (React 19, Vite, TypeScript)
    src/
      app/             pantalla raíz, secciones y navegación
      features/        una carpeta por funcionalidad
      shared/          cliente de la API (real y simulado), idiomas, hooks, piezas comunes
      styles/
packages/
  contracts/           tipos de cada respuesta de la API; los usan api y web
infra/                 Docker, Caddy, scripts de despliegue y copia, Oracle Cloud
docs/                  arquitectura, contrato de la API y despliegue
```

Módulos de la API (`apps/api/src/modules/`):

| Módulo    | Qué hace                                                            |
| --------- | ------------------------------------------------------------------- |
| `auth`    | Login con OAuth de 42, cookie de sesión firmada                     |
| `replica` | Copia local de 42 y sincronizador; catálogo de campus               |
| `peers`   | Tus proyectos, quién puede ayudarte, tu guardia                     |
| `profile` | Expediente: XP, niveles, títulos, logros, ranking, preferencias     |
| `therapy` | Terapias de grupo                                                   |
| `doubts`  | Tablón de dudas y guía de cada proyecto                             |
| `boards`  | Calendario de pizarras                                              |
| `calendar`| Calendario personal: lo de Sanatorio y lo de 42 (eventos, exámenes, correcciones) |
| `help`    | Guardia: franjas en las que te ofreces, reservas, valoraciones, bloqueos |
| `map`     | Mapa de clusters: ocupación, gente de guardia y puestos reservados  |
| `network` | Red de correcciones: quién ha corregido a quién, comunidades y endogamia |
| `usage`   | Cuánto se usa cada elemento: orden automático y mapa de calor para admins |
| `meet`    | Avisos y chat de cada evento, y las rutas de la asistencia con códigos |
| `notices` | Buzón de avisos de cada persona y el pulso que la web pregunta de fondo |
| `attendance` | Códigos de inicio y fin, tiempo validado, registro de intentos e informe de horas |
| `admin`   | Permisos, bloqueos, buzón de incidencias y denuncias, consumo y presupuesto de peticiones |

Cómo encajan las piezas y cómo añadir una funcionalidad:
[docs/architecture.md](docs/architecture.md).

## Puesta en marcha

Hace falta Node 22.

```sh
npm install
cp apps/api/.env.example apps/api/.env     # y rellena las cinco obligatorias
npm run dev                                # API en :3000 y web en :5173
```

La web llama a `/api` y Vite lo reenvía a la API local. En la app de 42 la
URL de retorno para desarrollo es `http://localhost:3000/auth/callback`.

Para trabajar solo en la web, sin API ni credenciales:

```sh
npm run dev:mock
```

## Comandos

| Comando               | Qué hace                                                |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | API y web en modo desarrollo                            |
| `npm run dev:mock`    | Solo la web, con datos simulados en memoria             |
| `npm run check`       | Tipos, lint, formato y tests: lo mismo que pasa la CI   |
| `npm test`            | Tests de la API                                         |
| `npm run build`       | Compila la API y la web                                 |
| `npm run sync:status` | Cuánto se ha copiado de 42 y de cuándo son los datos    |
| `npm run sync:run`    | Avanza la copia de 42 sin levantar el servidor          |

## Despliegue

Una máquina con Docker: la app en un contenedor y Caddy delante con HTTPS
automático. Guía paso a paso para Oracle Cloud Always Free en
[docs/deploy-oracle.md](docs/deploy-oracle.md).

## Estado y límites conocidos

- La asistencia por códigos se guarda y se enseña, pero aún no decide la XP.
- Los avisos necesitan la web abierta: no hay notificaciones *push*.
- La personalización vive en el navegador, no en la cuenta.
- El consumo se mide por peticiones a esta web; el de la API de 42 solo en total.
- Las franjas que cada quien abre en 42 para corregir no se ven: haría falta el
  permiso `projects`, que la aplicación no pide.
- De la red solo se copian las correcciones del 42cursus, no las de la piscina.
- La web solo tiene tests de sus funciones puras; los componentes se prueban a mano.

## Futuras mejoras

- Que los códigos de asistencia cuenten para la XP de pizarras y ayuda.
- Reservar una preevaluación como tal, con su propia XP.
- Notificaciones *push* y recordatorios por correo.
- Guardar la personalización en la cuenta, para llevarla entre dispositivos.
- Presupuesto de peticiones configurable desde el panel, no en el código.
- Desglose del gasto de la API de 42 por funcionalidad.
- Moderación: retirar un mensaje o cerrar una pizarra desde la propia denuncia.
- Aplicación instalable (PWA) y mejor uso con el móvil en el campus.
- Tests de componentes y de extremo a extremo.

## Documentación

- [docs/architecture.md](docs/architecture.md): capas, módulos, réplica de 42 y cómo ampliar.
- [docs/api.md](docs/api.md): contrato HTTP.
- [docs/deploy-oracle.md](docs/deploy-oracle.md): despliegue, copias y mantenimiento.
- [AGENTS.md](AGENTS.md): normas del proyecto para asistentes de código.
- [docs/contexto.md](docs/contexto.md): estado del trabajo y decisiones tomadas, para retomarlo.
- [docs/tareas-tras-compactar.md](docs/tareas-tras-compactar.md): lo que hay que hacer al retomar, en orden.
