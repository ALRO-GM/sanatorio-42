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

Última puesta al día: 2026-10-11, antes de la primera limpieza de contexto.

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

- [ ] **La XP de pizarras y de sesiones de ayuda depende de los códigos.**
      Alberto quiere pedir *compensation days* al staff de 42 con estos datos,
      así que el cálculo del tiempo tiene que aguantar una discusión:
  - Sin los dos códigos validados (inicio y fin) no hay XP ni tiempo contado.
    Sustituye a la comprobación por puestos en `help` (`verify`, `creditHelp`) y
    al reparto de `boards` (`unsettledEndedBefore`, `markSettled`).
  - El tiempo es el intervalo entre los dos códigos de cada persona, recortado
    al horario del evento con un margen (proponer 10 min antes y después), y
    nunca más que la duración prevista. Guardar el tiempo validado, no solo las horas.
  - Para que no se pueda hacer trampa: los códigos caducan (el de inicio solo
    vale alrededor de la hora de inicio; el de fin, desde un mínimo de tiempo
    transcurrido), tope de intentos fallidos por persona y evento, y un registro
    de cada validación (quién, cuándo, qué código).
  - Un informe exportable (CSV) por persona y por periodo: evento, fecha,
    inicio, fin, minutos validados, con quién. Es lo que se llevaría al staff.
  - Tests de los bordes: llegar tarde, irse antes, validar fuera de plazo,
    repetir el código, grupo con varias personas.
  - Ficheros: `modules/meet/meet.service.ts` (tabla `event_attendance`),
    `modules/help/help.service.ts`, `modules/boards/boards.service.ts`,
    `modules/profile/xp.rules.ts`.

- [ ] **Presupuesto de peticiones dinámico y regulable a mano.** Que nunca se
      llegue al máximo y la web se quede colgada horas o días:
  - Hoy es una constante (30 000/hora en `app/composition.ts`) repartida entre
    quienes están conectados (`modules/admin/admin.service.ts`, `automaticLimit`).
  - Pasar a un presupuesto **diario** guardado en la base y editable desde el
    panel. El de cada hora sale de lo que queda del día entre las horas que
    faltan, con un colchón (proponer no gastar nunca más del 85 %); el de cada
    persona, de ese entre la gente conectada.
  - Lo mismo para la API de 42 (1 200/hora): si queda poco, se frenan primero
    los trabajos de fondo (copia, repaso) y después lo que pida la gente.
  - Ajuste manual desde el panel: presupuesto diario, colchón, mínimo y máximo
    por persona, y un botón de "modo ahorro" que lo baje todo de golpe.
  - Enseñar en el panel lo gastado hoy, lo que queda y la previsión de fin de día.
  - **Límites reales** (respondido por Alberto el 2026-10-11): el de Oracle es
    enorme y no se espera llegar, pero se limita igual. Si un límite es mensual
    (tráfico de salida de Oracle: 10 TB al mes en la capa gratuita; comprobarlo),
    el presupuesto de cada día es **lo que queda del mes entre los días que
    faltan para que se renueve**. Lo mismo con la API de 42 (1 200/hora y el
    tope diario o mensual que tenga la aplicación; comprobarlo en la intra).
  - **Cuando la API de 42 va justa**: avisar a los estudiantes con un rótulo en
    la web y dejar pasar solo lo crítico. Hay que clasificar cada llamada a 42:
    crítico (entrar, ver quién puede ayudarte y dónde está) frente a aplazable
    (repaso de correcciones, horas de proyectos, hitos, agenda de 42). Lo
    aplazable se sirve con lo último guardado y se dice de cuándo es.
  - **Cola por orden de llegada** para lo que tenga que esperar: cada estudiante
    entra en una cola FIFO y, si le toca esperar, ve **su número y por cuál va la
    cola**, con estética de sala de espera de hospital, como un tique de turno
    ("Su turno: A-042 · Atendiendo: A-037 · tiempo estimado"). Encaja con el
    tema de la web. La cola se guarda en el servidor (que un reinicio no la
    desordene) y avanza sola según se libera cuota; la pantalla se actualiza
    sin recargar. Quien administra no hace cola.
  - Tests: reparto del mes entre los días que quedan, cambio de mes, entrada y
    salida de la cola en orden, y que lo crítico pasa aunque haya cola.

### 2.1 Seguridad

- [ ] **Bloqueo de cuentas en todas las rutas.** Hoy solo se aplica donde se pide
      el "actor" (`modules/auth/session.ts`). Buscar las rutas que usan solo
      `session.user(request)` (expediente público, `GET /usage`, salud…) y hacer
      que una cuenta bloqueada no pase por ninguna. Con test.
- [ ] **Límite de mensajes por persona** en el chat de eventos y en el buzón
      (`modules/meet`, `modules/admin`): tantos por minuto y por evento.
- [ ] **QR de asistencia.** Abrir `#/asistencia/<evento>/<código>` valida solo.
      Decidir si basta (hay que tener sesión y estar apuntado) o si se pide
      confirmar con un botón. Comprobar que el código no se puede adivinar por
      fuerza bruta: hoy no hay tope de intentos en `POST /events/checkin`.
- [ ] **Tope de uso tras un reinicio.** El contador vive en memoria
      (`admin.service.ts`): al reiniciar se pone a cero. Recuperarlo de
      `request_stats` al arrancar, o dejar escrito que se acepta.
- [ ] **Registro de mensajes para admins.** Quién lo ve, cuánto tiempo se
      guardan los mensajes y si hay que avisarlo en la web. Proponer un plazo de
      borrado.
- [ ] **Entradas de texto libre**: revisar que nada de lo que escribe la gente
      (chat, buzón, notas, dudas) se pinta como HTML. El único
      `dangerouslySetInnerHTML` es el QR (`features/alerts/Attendance.tsx`).
- [ ] **Cabeceras y cookies** en producción: repasar `infra/Caddyfile` y las
      opciones de la cookie de sesión.
- [ ] `npm audit`: ver qué sale y qué es aplicable.
- [ ] Recordar a Alberto que **rote el secreto de la app de 42** (se vio en una
      conversación) y actualizar `apps/api/.env` e `infra/.env` con el nuevo.

### 2.2 Rendimiento

- [ ] **Avisos**: cada pestaña pide el calendario cada minuto
      (`features/alerts/AlertCenter.tsx`). Pedirlo cada varios minutos y calcular
      en el navegador cuándo toca avisar.
- [ ] **Chat**: se pide cada 8 segundos mientras está abierto. Subir el intervalo
      con la pestaña en segundo plano y no pedir si no ha cambiado nada (por
      ejemplo, con el id del último mensaje).
- [ ] **Saber si alguien participa en un evento** calcula su calendario entero
      (`meet.service.ts`, `assertParticipant`). Comprobarlo directamente según el
      tipo de evento.
- [ ] Medir en la base real las consultas de la red y del panel de consumo con
      `EXPLAIN QUERY PLAN`, por si falta algún índice.
- [ ] Tamaño de lo que descarga la web: `npm run build` y mirar los trozos.

### 2.3 Simplificar

- [ ] Partir `apps/web/src/app/Clinic.tsx` (cabecera, secciones y pie).
- [ ] Partir `apps/web/src/shared/api/mock/index.ts` por funcionalidad.
- [ ] `apps/web/src/styles/layout.css` se ha vuelto cajón de sastre: repartir en
      `alerts.css`, `admin.css` y `therapy.css`, manteniendo el orden de la cascada
      (comprobar que el CSS generado no cambia, como se hizo con `global.css`).
- [ ] Partir `apps/api/tests/unit/community.test.ts` (unas 2 000 líneas) en un
      fichero por módulo.
- [ ] `EventRoom` hace de sala de evento y de chat de grupo: separar el chat en su
      propio componente.
- [ ] Repasar `docs/api.md` contra las rutas reales, por si algo quedó sin apuntar.

## 3. A medias o por confirmar con Alberto

- Cifras exactas de los límites (tráfico mensual de Oracle y tope de la app de 42):
  comprobarlas al implementar el presupuesto (ver 2.0).
- Margen de tiempo y caducidad de los códigos de asistencia (ver 2.0): los
  valores propuestos son un punto de partida.
- El expediente ajeno enseña el estado de salud con los textos en segunda persona
  ("Estás en el círculo…"): cambiarlos a tercera cuando se mira el de otro.

## 4. Antes de la próxima limpieza de contexto

- [ ] Marcar aquí lo hecho y reescribir el apartado 2 con lo que venga después.
- [ ] Apuntar en el apartado 3 lo que quede a medias, con el fichero y el punto exacto.
- [ ] Actualizar [contexto.md](contexto.md): estado, decisiones nuevas y lo subido.
- [ ] `npm run check` y decir a Alberto qué queda sin subir.
