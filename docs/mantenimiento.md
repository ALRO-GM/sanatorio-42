# Modo mantenimiento

Pedido por Alberto el 2026-10-25: desde el panel, poner la web en
mantenimiento para que a la gente le salga que no está disponible, con una
hora y una cuenta atrás hasta que acabe.

## Qué ve cada cual

- **Quien no administra** (con sesión o sin ella): una pantalla entera con
  «No disponible: estamos en labores de mantenimiento», el mensaje que haya
  puesto quien administra y, si hay hora prevista, la cuenta atrás («Volvemos
  en 1:29:58», «Hacia las 14:00»). Pasada la hora y sin quitarlo, sale «Ya
  debería estar al caer». Cada 30 s (y con «Volver a mirar») pregunta si ha
  acabado; al acabar, la web vuelve sola, sin recargar.
- **Sin sesión**, además, un enlace discreto «Entrar (administración)»: es como
  entra quien administra. Si entra alguien que no administra, vuelve a la
  pantalla de mantenimiento.
- **Quien administra** usa la web como siempre, con una franja arriba
  («Mantenimiento activado…», la cuenta atrás e «Ir al panel») para que no se le
  olvide quitarlo.

## Panel

Pestaña **Mantenimiento** del panel de gestión (`MaintenancePanel.tsx`):
mensaje opcional (hasta 500 caracteres), hora prevista opcional (día y hora, o
los atajos +30 min, +1 h, +2 h y +4 h), «Poner en mantenimiento», «Guardar
cambios» y «Quitar el mantenimiento». Cambiar el mensaje o la hora no cambia
desde cuándo está puesto.

La hora prevista es eso, prevista: al llegar no se quita solo. Tiene que estar
en el futuro y a menos de una semana.

## Cómo funciona

- Se guarda en la tabla `settings` (clave `maintenance`), así que sobrevive a
  un reinicio o a un despliegue. Sin migración. Se lee con una caché de 10 s
  que el panel olvida al cambiarlo (`modules/admin/maintenance.ts`).
- El gancho de peticiones de `modules/admin/index.ts` (el mismo que aplica los
  límites del plan y los bloqueos) contesta `503` con `Retry-After` y
  `{ "error": "maintenance", "message", "until" }` a quien no administra.
- Siguen abiertas: `/health…` (la mira Caddy), `/auth/…` (entrar, salir y
  `GET /auth/me`), `GET /maintenance`, `POST /client-errors`,
  `GET /pool/notice` y todo lo que no es una ruta de la API (la propia web, que
  es la que pinta la pantalla).
- La web pregunta `GET /maintenance` al arrancar, antes de montar nada
  (`shared/maintenance.ts`). Si una petición cualquiera vuelve con el `503` de
  mantenimiento (`onMaintenance` en `shared/api/http.ts`), pasa a la pantalla
  al momento. A quien administra, el pulso (`maintenance` en `GET /pulse`) le
  pone al día la franja si otra persona lo pone o lo quita.
- En la API simulada, con `?mantenimiento` en la dirección quien mira no
  administra y la web está en mantenimiento con dos horas por delante.

Rutas en [api.md](api.md#modo-mantenimiento-modulesadminmaintenancets).

## Límites

- El corte del plan (`service_stopped`, al 90 % y al 95 %) es otra cosa y va
  antes: si los dos están puestos, manda el del plan.
- Un piscinero lo ve igual que un estudiante: `/maintenance` está en
  `POOL_BASE`.
- La página del staff (`#/validar`) también se queda sin API mientras dura:
  sus rutas `/staff/…` no están entre las abiertas.
