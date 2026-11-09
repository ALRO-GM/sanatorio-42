# Topes por persona

Pedido por Alberto (2026-11-09): poder cambiar desde el panel de gestión cuántos
mensajes puede mandar alguien y, en general, cualquier tope que se le ponga a una
persona, para todo el mundo o solo para alguien. Lo que protege la máquina o el
plan sigue sin regularse.

## Cómo funciona

- Cada tope regulable está en `apps/api/src/core/limits.ts` (`ACTION_LIMITS`):
  clave, valor de fábrica (el que había escrito en su servicio, sin cambiar),
  márgenes (mínimo y máximo que admite el panel) y unidad.
- Lo puesto se guarda en `action_limits` (migración 89): `login = ''` es lo de
  todo el mundo; un login, lo de esa persona.
- Manda lo más concreto: **persona > todo el mundo > fábrica**. Quitar lo de una
  persona la devuelve a lo de todo el mundo, no a fábrica.
- La tabla se lee entera y se guarda en memoria un minuto. Un cambio desde el
  panel vale al momento (la API tiene una sola copia del registro, que se olvida
  al cambiar algo); uno hecho a mano en la base, en un minuto como mucho.
- Los servicios montados sueltos (tests de un servicio) usan `fixedLimits`, los
  de fábrica. La aplicación les pasa el registro de verdad desde `composition.ts`.
- Panel: pestaña **Límites** (`features/admin/LimitsPanel.tsx`). La tabla
  enseña cada tope con su unidad, lo de fábrica y lo de todo el mundo; se edita
  lo de todo el mundo o, eligiendo a alguien con el buscador de personas, lo
  suyo. «Por defecto» quita lo de esa fila; «Todo por defecto» quita todos los
  topes propios de la persona. Arriba salen quienes tienen alguno.
- Rutas (solo admins, con segundo factor): `GET /admin/action-limits?login=`,
  `PUT /admin/action-limits` y `DELETE /admin/action-limits/:login`
  (`docs/api.md`).

## Inventario

Medido el 2026-11-09 buscando topes, cuotas y máximos en `apps/api/src`.

### Regulables desde la pestaña Límites

| Tope (clave) | De fábrica | Dónde se aplica | Por qué existe |
| --- | --- | --- | --- |
| `messages.perMinute` | 20 por minuto | `meet.service.ts`, `send` (chats de eventos y conversaciones del buzón) | Que nadie inunde los chats |
| `messages.perMinuteChat` | 8 por minuto | ídem, a un mismo chat | Ídem, en una sola conversación |
| `tickets.open` | 10 a la vez | `admin.service.ts`, `assertRoom` | El buzón no es un chat |
| `tickets.per10Minutes` | 3 cada 10 min | ídem | Que no se llene de golpe |
| `suggestions.perDay` | 10 al día (24 h) | `admin.service.ts`, sugerencias de la burbuja | Una tarde de pruebas llenaría la bandeja |
| `brokenSeats.active` | 10 a la vez (una semana) | `map.service.ts`, `reportBroken` | No llenar el mapa de cruces |
| `doubts.perDay` | 10 al día | `doubts.service.ts`, `create` | Post-its, no spam |
| `help.activeRequests` | 3 a la vez (por día) | `help.service.ts`, reservar | Que nadie acapare a quien ayuda |
| `therapy.openGroups` | 3 a la vez | `therapy.service.ts`, crear sprint | Grupos reales, no huecos |
| `boards.upcoming` | 5 a la vez | `boards.service.ts`, proponer pizarra | Ídem |
| `facility.perDay` | 10 al día (24 h) | `facility.service.ts`, avisar al staff | El staff los lee a mano |
| `agenda.activeGoals` | 8 a la vez | `agenda.service.ts`, crear o reabrir meta | Una agenda que se pueda seguir |
| `countdowns.pins` | 12 a la vez | `countdowns.service.ts`, fijar | La ventanita tiene que caber |

### Regulables, pero en otro sitio del panel

| Tope | De fábrica | Dónde | Notas |
| --- | --- | --- | --- |
| Peticiones por hora de cada persona | Automático: lo de la hora repartido entre quien está conectado, entre 240 y 3 000 | `admin.service.ts` (`perPerson`, `user_limits`) | Pestaña Consumo: tope a mano por persona (`PUT /admin/limits`) y mínimo y máximo en el presupuesto. Es reparto del plan, por eso no se mezcla con los de aquí |
| Llamadas a la API de 42 por persona y por funcionalidad | Sin tope | `replica/api-usage.ts` | Panel de la cuota de 42 (`PUT /admin/api-usage/limits`) |

### No regulables

| Tope | Valor | Dónde | Por qué no |
| --- | --- | --- | --- |
| Corte del plan al 90 % (solo quien administra) y al 95 % (nadie) | 90 % / 95 % | `admin/budget.rules.ts` (`STOP_SHARE`, `HARD_STOP_SHARE`), `app/build-app.ts` (`guardLevelFrom`), `infra/scripts/limits-guard.sh` | Pasarse se cobra. Regla de `AGENTS.md`: ni regulable ni con excepciones |
| Cuota de la API de 42 | 1 200/h, 2/s | `integrations/forty-two/throttle.ts`, `replica/budget.ts` | La pone 42; pasarse corta a todo el mundo |
| Recursos de Oracle (OCPU, memoria, disco) | 90 % de la capa gratuita | `limits-guard.sh` | Ídem, se cobra |
| Intentos por IP sin sesión (login, clave de staff) | 200 / 10 por ventana | `auth.routes.ts` | Protegen contra fuerza bruta; sin sesión no hay persona a quien regular |
| Segundo factor | 5 fallos en 15 min | `admin/second-factor.ts` | Seguridad |
| Códigos de llegada fallidos | 5 por evento | `attendance.rules.ts` | Anti-trampas de la XP |
| Topes de XP (dudas resueltas, revisiones, sesiones de sprint al día, pareja/día y pareja/semana de ayuda) y faltas | varios | `doubts.service.ts`, `therapy.service.ts`, `help.service.ts` | Anti-trampas (`AGENTS.md`, «XP y anti-trampas»): subirlos regala XP |
| Intentos de los cursos (shell, git, Docker, Kubernetes) y órdenes de las salas de git | 30 / 20 cada 10 min, 60/min | `shellcourse`, `gitcourse`, `rooms.ts`… | Cada intento vuelve a ejecutar hasta 300 órdenes: protegen la CPU de la máquina |
| Análisis nuevos de la red y de asientos | 20/min | `network.service.ts`, `seating.service.ts` | Cálculo caro: CPU |
| Telemetría de uso y errores de la web | 40/min, 10/min | `usage/index.ts`, `client-errors/index.ts` | Protegen la base de envíos automáticos |
| Documentos y comprobaciones del staff | 40/día, 60 cada 10 min | `staff.service.ts` | Cuentas de staff, no personas de la web |
| Tamaños de lo que se manda (largo de textos, ficheros, partidas) y de lo que se devuelve (listas) | varios | cada esquema de zod | Forma de los datos, no un tope a una persona |
| Plazas de un sprint, jugadores de una sala | 6, 20 | `therapy.service.ts`, `quiz.service.ts` | Son del grupo, no de una persona |

## Corte al 90 %: comprobado

- La guardia de la máquina (`limits-guard.sh`, cron cada cinco minutos) escribe
  el porcentaje en `guard-level`; la API lo lee con cada puesta al día de los
  ajustes (como mucho cada minuto, `SETTINGS_TTL_MS`) y además lleva su propia
  cuenta del tráfico (`levelOf`). Manda el peor de los dos.
- Con el corte puesto, el gancho `onRequest` de `admin/index.ts` da 503 con
  `Retry-After` a quien no administra (al 95 %, a todo el mundo) y
  `halted()` para los trabajos de fondo (`build-app.ts`, réplica de 42).
- Probado en `tests/integration/limits.test.ts` y `lifecycle.test.ts` justo en
  los bordes (89,9 → nada; 90 → solo admins; 95 → nadie) y en
  `tests/unit/admin.test.ts` (`halted`).
