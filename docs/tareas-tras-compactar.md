# Tareas tras compactar

Lista de lo que hay que hacer nada más retomar el trabajo con el contexto vacío.
Alberto dirá: **"revisa y ejecuta las tareas tras compactar"**. Entonces se lee
este fichero y se hace lo que dice, en orden.

## Cómo se usa

- **Antes de compactar o limpiar el contexto**, quien esté trabajando actualiza
  este fichero: tacha lo hecho, escribe el plan de lo siguiente y deja apuntado
  cualquier cosa a medias (qué fichero, qué faltaba, qué se había decidido).
  También pone al día [contexto.md](contexto.md).
- **Al retomar**, se ejecuta de arriba abajo. Cada tarea se marca (`[x]`) al
  terminarla, con la fecha si importa. Si algo no se puede hacer, se dice y se
  apunta aquí por qué.
- Lo que ya no aplica se borra: este fichero es el plan vigente, no un historial.
- Si una tarea necesita una decisión de Alberto, se le pregunta antes de seguir
  con esa; las demás no esperan.

Última puesta al día: 2026-10-11, con todo el apartado 2 hecho y subido. Queda desplegar.

## 1. Arranque (siempre, en cada sesión nueva)

- [ ] Leer [contexto.md](contexto.md) entero.
- [ ] Reintentos de Oracle: mirar el registro y relanzar el proceso si ha muerto.

  ```sh
  tail -3 ~/.local/share/sanatorio-oracle/oracle-retry.log
  pgrep -af 'retry.sh' || (cd ~/.local/share/sanatorio-oracle && setsid nohup bash ./retry.sh > /dev/null 2>&1 < /dev/null &)
  ```

  Si la última línea dice `Listo. La máquina está en: <IP>`: avisar a Alberto
  para que ponga esa IP en DuckDNS y hacer el despliegue (pasos en `contexto.md`)
  **antes** que cualquier otra tarea de esta lista.

- [ ] Volver a poner el vigilante en segundo plano (la orden exacta está en
      `contexto.md`, "Tareas recurrentes"). Avisa cuando Oracle dé la máquina.
- [ ] Ver qué hay sin subir: `git status --short | wc -l` y `git log --oneline -3`.
- [ ] `npm run check`, para partir de un estado conocido.
- [ ] Decir a Alberto en dos líneas cómo está todo antes de empezar con el plan.

## 2. Plan vigente: revisión antes de desplegar

Tres pasadas cortas, cada una con su commit (y push solo si Alberto lo pide).
No es una reescritura: no se cambia el comportamiento salvo donde se diga.

### 2.0 Dos funcionalidades decididas el 2026-10-11 (van antes que la revisión)

- [x] **La XP de pizarras y de sesiones de ayuda depende de los códigos.**
      Hecho el 2026-10-11, sin subir. Módulo nuevo `modules/attendance`
      (migración 18): ventanas de validez, tope de cinco fallos, registro de
      intentos (`event_checkins`), tiempo validado guardado e informe
      (`GET /events/report`, CSV con `format=csv`; botón en el expediente y en
      "Permisos y bloqueos" del panel). `help.verify` y su trabajo periódico ya
      no existen. Reglas y valores en `attendance.rules.ts` y en `docs/api.md`,
      "Reglas de los códigos".

- [x] **Presupuesto de peticiones de la web, dinámico y regulable a mano.**
      Hecho el 2026-10-11. `modules/admin/budget.rules.ts` y
      migración 19 (`settings`): día ← mes (bytes de salida, 10 TB de fábrica),
      hora ← día, persona ← gente conectada; colchón del 85 %, mínimo y máximo
      por persona, modo ahorro (un cuarto). `PUT /admin/budget` y tarjeta en la
      pestaña "Consumo" con lo gastado, lo que queda y la previsión. El contador
      se recupera de `request_stats` al arrancar (cierra el punto de 2.1).

- [x] **Lo mismo para la API de 42, con aviso y cola.** Hecho el 2026-10-11. `modules/replica/quota.ts` y migración 20: tres escalones (fondo,
      aplazable, crítico), tope diario o mensual regulable (`PUT /admin/quota`),
      cola por orden de llegada guardada en la base, `GET /quota`, rótulo y
      tique de turno en la web (`features/alerts/QuotaNotice.tsx`) y tarjeta en
      la pestaña "Consumo". Tests en `tests/unit/quota.test.ts`.

### 2.1 Seguridad

Hecho el 2026-10-11, salvo lo que espera a Alberto:

- [x] **Bloqueo de cuentas en todas las rutas.** Lo corta el gancho de `admin`
      antes de llegar a ninguna ruta (`modules/admin/index.ts`); solo quedan las
      de `/auth/`. Con test de integración.
- [x] **Límite de mensajes por persona**: ocho por minuto y evento, veinte por
      minuto en total (`meet.service.ts`); tres avisos al buzón cada diez
      minutos (`admin.service.ts`).
- [x] **QR de asistencia.** Ya no valida solo: enseña el código y pide
      confirmar (`AlertCenter.tsx`), porque un enlace con un código equivocado
      gastaba un intento. Cinco fallos por persona y evento.
- [x] **Tope de uso tras un reinicio.** Se recupera de `request_stats`.
- [x] **Registro de mensajes para admins.** Los mensajes se borran a los 90
      días y el registro de intentos de códigos al año; lo dice cada chat.
- [x] **Entradas de texto libre**: nada se pinta como HTML salvo el QR. El CSV
      del informe de horas desactiva las fórmulas.
- [x] **Cabeceras y cookies.** Política de contenido y de permisos en
      `infra/Caddyfile`; el script del tema pasa a `public/theme.js` para no
      necesitar scripts en línea. Las cookies ya eran `__Host-`, `HttpOnly`,
      `Secure` y `SameSite`. **Comprobar en el despliegue** que la web carga
      sin errores de CSP en la consola (fotos de perfil, QR, descarga del CSV).
- [x] `npm audit --omit=dev`: 0 vulnerabilidades (2026-10-11).
- [ ] Recordar a Alberto que **rote el secreto de la app de 42** (se vio en una
      conversación) y actualizar `apps/api/.env` e `infra/.env` con el nuevo.

### 2.2 Rendimiento

Hecho el 2026-10-11:

- [x] **Avisos**: el calendario se pide cada cinco minutos y se mira en el
      navegador cada treinta segundos si algo está a punto de empezar.
- [x] **Chat**: solo se piden los mensajes nuevos (`after`), la espera crece de
      8 a 30 s mientras nadie escribe y no se pregunta con la pestaña oculta.
- [x] **Saber si alguien participa en un evento** se pregunta al módulo de cada
      cosa; el calendario entero solo se calcula para lo de 42.
- [x] **Consultas en la base real**: a la base le faltaban estadísticas (la
      consulta de una pareja en la red recorría todo el campus; con `ANALYZE`
      usa los índices). Ahora se calculan al abrir si faltan y un trabajo las
      mantiene (`core/db/database.ts`). Además la base pasa a **WAL**, para que
      se pueda leer mientras el sincronizador escribe. Índice nuevo para el tope
      de mensajes (migración 21). Las agregaciones de todo el campus tardan unos
      40 ms con 86 000 correcciones: no hace falta más.
- [x] **Tamaño de lo que descarga la web**: unos 135 kB comprimidos al entrar
      (JS y CSS); cada sección va en su trozo y los datos simulados no entran en
      producción. Lo único que sobra son los dos idiomas a la vez (unos 15 kB
      comprimidos) y el generador de QR en el trozo principal: no compensa
      tocarlo ahora.

### 2.3 Simplificar

Hecho el 2026-10-11:

- [x] `Clinic.tsx` partido en `Header.tsx`, `SectionView.tsx` y `Footer.tsx`.
- [x] `shared/api/mock/index.ts` partido por funcionalidad (`peers`, `meet`,
      `admin`, `profile`, `replica`, `help`, `therapy`, `doubts`, `boards`), con
      el estado compartido en `state.ts`.
- [x] `layout.css` repartido en `layout.css`, `alerts.css`, `admin.css` y
      `therapy.css`. Comprobado que el CSS generado tiene las mismas reglas.
- [x] `community.test.ts` partido en un fichero por módulo (`profile`, `admin`,
      `help`, `therapy`, `doubts`, `boards`), con el montaje en
      `tests/helpers/community.ts`. Siguen siendo los mismos tests.
- [x] El chat sale de `EventRoom`: `useThread.ts` y `Chat.tsx` (`ChatRoom` para
      los grupos de terapia).
- [x] `docs/api.md` repasado contra las rutas reales.

## 3. A medias o por confirmar con Alberto

- **Cifras de los límites, por confirmar por Alberto** (se cambian desde el
  panel, pestaña "Consumo", sin tocar código): el tráfico de salida de Oracle
  está puesto a 10 TB al mes y se renueva el día 1; el tope diario o mensual de
  la app de 42 está vacío (solo cuenta la cuota horaria) porque hay que mirarlo
  en la intra.
- **Valores de los códigos de asistencia, por confirmar por Alberto**
  (`attendance.rules.ts`): margen de 10 min, inicio válido hasta 30 min tarde
  (o media sesión), 10 min mínimos entre códigos, fin válido hasta 30 min
  después, cinco fallos.
- En el rótulo de cuota no se dice de cuándo es cada dato, solo que es lo último
  guardado. Si se quiere la fecha exacta, `agenda_users.fetched_at` y
  `sync_state.updated_at` ya la tienen.
- La cola solo deja pasar sin turno a quien administra por configuración
  (`ADMIN_LOGINS`), no a quien recibe el permiso desde el panel.
- El expediente ajeno enseña el estado de salud con los textos en segunda persona
  ("Estás en el círculo…"): cambiarlos a tercera cuando se mira el de otro.

## 4. Antes de la próxima limpieza de contexto

- [ ] Marcar aquí lo hecho y reescribir el apartado 2 con lo que venga después.
- [ ] Apuntar en el apartado 3 lo que quede a medias, con el fichero y el punto exacto.
- [ ] Actualizar [contexto.md](contexto.md): estado, decisiones nuevas y lo subido.
- [ ] `npm run check` y decir a Alberto qué queda sin subir.
