# Startup del Pomodoro

Pedido por Alberto el 2026-10-27: como los Pomodoros en los que se planta un
bosque, aquí cada minuto de concentración sirve para construir una startup,
desde aprender a programar en un garaje hasta el control global, y compararla
con la de los demás.

**Dónde está**: pestaña «Startup» de la ventana del Pomodoro (menú de la
cuenta → Modo concentración), desde el modo normal; y la escena en pequeño
abajo del Pomodoro a pantalla completa. Es parte del Pomodoro, no una sección:
no añade pestañas a la navegación (`docs/interfaz.md`).

## Reglas

- **Moneda**: los minutos de concentración de las sesiones del Pomodoro
  (`focus_sessions`, como en tus estadísticas: la acabada hasta su final, la que
  sigue hasta ahora). Los cuenta la API: el navegador no puede inventarlos.
  Gastar no resta horas del ranking.
- **Catálogo** (`packages/startup/src/data.ts`, todo datos):
  - Aprender, cinco ramas de cinco niveles (30 min … 8 h).
  - Ordenador: del portátil viejo a dos pantallas grandes.
  - Espacio (tras fundar): coworking, oficina, planta, edificio, campus. Da
    sitio a la plantilla (2, 5, 12, 30, 70, 160).
  - Servidores (tras el MVP), que suman a infraestructura.
- **Hitos**, en orden: proyecto propio, MVP, **fundar (se le pone nombre)** y
  control global (tras salir a bolsa, 60 personas, 400 h).
- **Contratar** (tras el MVP): tres candidatos al azar con su especialidad,
  estrellas (1-5, las altas raras) y aspecto; la mitad de las veces de la
  especialidad de la empresa. Volver a sacar cuesta 15 min.
- **Rondas** (tras fundar): presemilla, semilla, A, B, C y salida a bolsa. Cada
  una pide plantilla, espacio y horas, y multiplica la valoración por su
  multiplicador y una suerte de 0,7 a 1,5.
- **El azar** sale de una semilla con el login y lo hecho hasta ahora
  (`seeded` en `engine.ts`): el mismo en la web y en la API, y recargar no lo
  cambia.
- **Valoración**: lo construido por las rondas (×10 con el control global).
- **Ranking** (`GET /startup/ranking`): por horas de concentración y, a
  igualdad, por valoración. Cada mundo ve el suyo (`audience`).

## Los cinco modelos de negocio

La empresa se enfoca según lo aprendido (×2), la plantilla (×3 por estrella) y
los servidores (×2, infraestructura). El que más pesa es su modelo, con su
dibujo y su color:

| Modelo | Qué es | Dibujo |
|---|---|---|
| `front` | Apps y producto de consumo | Ventana, azul |
| `back` | Plataforma y APIs para otras empresas (SaaS) | Llaves, naranja |
| `data` | Datos y analítica | Barras, verde |
| `ai` | Inteligencia artificial | Chispa con nodos, violeta |
| `infra` | Nube e infraestructura | Nube, amarillo |

## Sin idiomas

La interfaz es de dibujos, iconos y cifras (los minutos como `h:mm`). El texto
solo está en los nombres accesibles (lector de pantalla y lo que sale al pasar
el ratón), en `comun.csv` (`startup.*`), y en el nombre que cada cual le pone a
su startup.

## Piezas (para mejorarlas una a una)

- Reglas y cuentas: `packages/startup` (`@sanatorio/startup`), compartido por
  la API (`modules/startup`, migración 82) y la web.
- Dibujos planos en `apps/web/src/features/focus/startup/art/`: `Person`
  (aspecto según `look`, teclea), `Workstation` (crece con el ordenador),
  `ServerRack` (luces), `Building` (según la etapa), `Props` (planta, moneda,
  planeta, libro), `AxisGlyph` (los cinco modelos), `ItemArt` (el dibujo de
  cada tarjeta) y `palette.ts` (colores).
- `StartupScene` compone la escena; `StartupPanel` es la pestaña;
  `StartupStrip`, la escena en el Pomodoro a pantalla completa. Las
  animaciones (`styles/startup.css`) se paran con movimiento reducido y con la
  web quieta.
- Añadir una pieza: una entrada en `ITEMS`, su dibujo en `ItemArt` y su nombre
  accesible en `comun.csv`.
