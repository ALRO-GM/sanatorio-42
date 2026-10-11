# Sanatorio 42

Web para estudiantes de 42. Cuando te atascas en un proyecto ves quién puede
ayudarte (quién lo está haciendo, quién ya lo aprobó, dónde está sentado y si
está de guardia), y alrededor de eso: terapias de grupo, tablón de dudas,
calendario de pizarras, un expediente con XP y la red de correcciones del campus.

Los datos de 42 se copian poco a poco a una base local, así que abrir cualquier
pantalla no gasta peticiones de la API de 42.

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

## Documentación

- [docs/architecture.md](docs/architecture.md): capas, módulos, réplica de 42 y cómo ampliar.
- [docs/api.md](docs/api.md): contrato HTTP.
- [docs/deploy-oracle.md](docs/deploy-oracle.md): despliegue, copias y mantenimiento.
- [AGENTS.md](AGENTS.md): normas del proyecto para asistentes de código.
