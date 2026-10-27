# Consumo de la API de 42

Pedido por Alberto el 2026-10-27: saber a qué se va la cuota de 42 por función
(pestañas y componentes de la web, trabajos de fondo) y por persona, y poder
poner topes por hora para que nadie se la coma.

## La cuota de 42

- **1 200 peticiones por hora** para toda la aplicación, que **vuelven enteras a
  cada hora en punto** (UTC; comprobado el 2026-10-26 con
  `x-hourly-ratelimit-remaining`), y **2 por segundo**. Lo que no se gasta en una
  hora se pierde.
- 42 **no tiene topes diarios ni mensuales**. El panel tenía campos de «tope
  diario» y «tope mensual» (y su reparto entre los días del mes): se quitaron el
  2026-10-27. Lo que quede guardado de ellos en `settings` se ignora.
- El panel (Consumo → Cuota de la API de 42) enseña lo gastado en la hora sobre
  1 200, cuándo vuelve, el límite por segundo, el ritmo de la copia, quién espera
  turno y el modo ahorro. Lo de hoy sale solo como dato.

## Quién y qué gasta

- `integrations/forty-two/usage-context.ts`: un `AsyncLocalStorage` con
  `{ feature, login }` que sigue a cada petición por sus promesas.
  - **Web**: el gancho `onRequest` de `build-app.ts` pone la función (primer
    tramo de la ruta: `network`, `boards`…; `/stats/progress` es `progress`) y la
    persona de la sesión.
  - **Trabajos periódicos**: `job:<usage>` (campo `usage` del trabajo) o
    `job:<módulo>`.
  - **Bucle de la copia**: `sync:<tipo>` (`locations`, `delta`, `backfill`,
    `project`, `catalog`). Si una tarea de la copia la lanza una visita, cuenta
    para quien la ha lanzado.
  - **Cola de la cuota**: `queue:<tarea>` a nombre de quien esperaba.
- El cliente avisa al medidor (`ApiMeter`) antes de pedir (`check`) y en cada
  intento que sale (`count`). `replica/api-usage.ts` lo cuenta en memoria y lo
  guarda cada minuto en `api_usage` (hora, función, login; migración 81; `''` es
  trabajo de fondo). Se guarda 90 días.

## Topes por hora

- **General por persona**, **por persona** (manda sobre el general) y **por
  función** (todas las personas juntas, también trabajo de fondo). Se guardan en
  `settings` (`apiLimits`).
- Valen para la hora en curso y vuelven a la hora en punto. Tras un reinicio se
  leen de la base los totales de la hora.
- Al llegar, la petición a 42 **no sale**: un `ApiError` 429 que no se reintenta.
  Quien la pedía sirve lo guardado (la mayoría) o da un 503 con el motivo.
- Quien administra no tiene tope de persona; los de función valen para todos.

## Panel

Consumo → «A qué se va la cuota de 42» (`ApiUsagePanel.tsx`): barras apiladas por
hora (por función, o por persona si se elige una función; más de ocho se juntan
en «El resto»), con las opciones a la derecha (periodo de 1 h a una semana,
función, persona, tope general) y dos tablas, por función y por persona, donde
se pulsa un nombre para filtrar y «Poner tope» para cambiar el suyo.

`GET /admin/api-usage` y `PUT /admin/api-usage/limits` en `docs/api.md`.

## Correcciones de París (2026-10-27)

La gráfica de la Red de París caía desde mayo de 2026 porque la copia del
histórico se había parado: a un tramo de ids abierto (`range[id]=X,2000000000`)
42 tarda 30-50 s en contestar y la espera es de 15 s. Ahora el histórico y el
repaso van por tramos de 100 000 ids (2-3 s cada uno), y el final lo marca la
última corrección creada en 42. Lo de antes de octubre de 2019 es poco porque
París empezó el 42cursus (cursus 21) entonces: lo anterior es del cursus antiguo
y no se copia.
