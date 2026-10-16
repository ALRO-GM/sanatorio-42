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

Última puesta al día: 2026-10-16. En producción desde el 2026-10-11.

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

## 2. Plan vigente: lo que pidieron en el buzón (decidido el 2026-10-16)

Alberto revisó los 39 puntos sacados de los 64 mensajes del buzón (volcado y
análisis en la conversación del 2026-10-16). **Para esta tanda ha autorizado
commit, push y despliegue de cada funcionalidad** en cuanto pasen los tests
(`npm run check`). Cada punto: código desacoplado en su módulo, tests nuevos,
commit, push y `infra/scripts/deploy.sh` en la máquina. Si un test falla, mirar
si es porque el cambio no estaba previsto en el test o si es un fallo real.
Lo que dependa de muchas llamadas a 42 va al final.

Orden (se marca cada uno al desplegarlo):

**A. Fallos**
- [x] 28 Euskera: `ach.selfless_help` → «Eskuzabaltasun laguntza»; `net.asCorrected.hint` → «Aurkeztutako bereburuko proiektuak».
- [x] 1 Correcciones marcadas «no asistida»: las de 42 dejan de pedir respuesta (`needsReply` en `meet.service.ts`) y una migración borra las marcas `absent/missed` de evaluaciones y sus `event_alerts`.
- [x] 2 Guardia: dejar quitar la media hora en curso (`DayEditor.tsx`) si no hay reserva.
- [x] 5 Buzón: responder un ticket marca leído `ticket_new` de todos los admins; pestañas Pendientes / Cerrados.
- [x] 7 Contraste de las insignias de la Red (`.net-row-badge`): texto según luminancia.
- [x] 19 Guardia: no ofrecer medias horas ocupadas por cualquier cosa del calendario (`busyOf` en `help.service.ts`).
- [x] 4 Calendario: refrescar la agenda si tiene más de 2 min al abrirlo; «actualizado hace X» y botón.
- [x] 8 Título cortado de los comunicados con zoom (`BroadcastGate.tsx`). No reproducido (200–600 %); arreglos preventivos en `dialog.layout-dialog`. Si vuelve a pasar, pedir navegador y zoom.
- [x] 3 Holy graph: bis en la SEED, círculo aprendido con mínimo de personas, grupos «elige uno» en `common-core.ts`, recalcular.
- [x] 34 Fotos de perfil: la CDN de 42 da 403 sin sesión de la intra; ahora las sirve la API (`GET /avatars/:login`, guardadas en `/data/photos`). Subir fotos: no por ahora.
- [x] 6 Grafo de la Red a tirones: medir y optimizar `ForceGraph.tsx`.

**B. Seguridad, moderación y legal**
- [x] 10 Scopes: fijar `public` en el token de la app; Alberto desmarca los permisos sobrantes en la intra.
- [x] 11 web-check: `security.txt`, quitar `via`, HSTS `includeSubDomains`.
- [x] 14 Tipos de denuncia (spam, acoso, insultos, otro) y filtro en el panel.
- [x] 15 Formulario de incidencias: tipo y sección en desplegables, «Para: administración», icono `bicho`.
- [x] 16 Borrar avisos / retirar mensaje propio (15 min, sin respuesta) / admin borra spam.
- [x] 9 Segundo factor (TOTP) para `/admin`, sesión elevada 12 h.
- [x] 12 Página de privacidad y condiciones, aceptación versionada, descarga de datos.
- [x] 13 Trampas de Code Clicker, tres botones: «no es trampa» cierra; «alta probabilidad» abre ventana obligatoria de defensa que llega al admin; «trampa» = **vender todos sus edificios**, aviso temático en el juego («La policía del código te ha requisado las ganancias fraudulentas») y el dinero va a una **bolsa común**. La bolsa se reparte con una imagen temática que aparece por la zona del juego como el commit dorado; al pulsarla da **10 × el commit de la suerte** (el de ganancia, no el frenesí).

**C. Mejoras**
- [x] 17 Explicar guardia, tope y pace (dos números).
- [x] 21 Preevaluaciones: marcar disponibilidad mucho más grande, con icono propio; característica principal.
- [x] 27 Últimas 8 búsquedas en el navegador.
- [ ] 23 Clusters: puesto como enlace (clic central), girar 180°, círculo en el puesto, filtros, brillo dorado por 125.
- [ ] 26 Red: color por sentido y flecha en las líneas de la persona elegida.
- [ ] 20 Guardia y preevaluación brillando en el mapa con filtro; fichas compactas con «Pedir ayuda».
- [ ] 24 Terapias: «proponer puestos», puestos rotos (7 días), avisar a quien hace el mismo proyecto.
- [ ] 25 Calendario: vistas compacta / día / desde ahora.
- [ ] 18 Peticiones de ayuda en ventana obligatoria (recibir y rechazo).
- [ ] 29 Daltónicos, modo zen y demo de bienvenida.
- [ ] 22 Tamaño de texto 90–150 % y móvil.
- [ ] 33 Code Clicker: tope con pace en riesgo, logro por donar.

**D. Muchos datos (al final, poco a poco en horas de poco uso)**
- [ ] 32 Holy graph de correcciones con logros y banner.
- [ ] 30 Estadísticas de exámenes (intentos de 42 en cola de fondo; duración de círculos).
- [ ] 31 Exámenes en vivo: pestaña que se activa cuando empieza un examen en tu campus (sale en el calendario); gente apuntada separada por examen, grado y cursus, del círculo en que está; cada 5 min se actualiza la nota con el último intento.

**Ideas para el futuro (no hacer ahora)**: 35 racha diaria con preguntas; 37 curso de git; 38 presentaciones de Transcendence/outer como evento; 39 Doom 2 (Freedoom) y patitos. **Descartado para siempre**: 36 modo sin conexión con los datos del campus.

Hecho además en esta tanda (fuera de la lista): estilo Bichota, antitrampas
de pulsaciones, política de trampas nueva (venta al 50 % y reparto), ver la
partida de cualquiera y sanción a mano desde el panel. Detalle en `contexto.md`.

Pendientes de antes: rotar el secreto de 42 (Alberto), primera cuenta de staff, Oracle Pay As You Go con presupuesto de 1 €, CSP con sesión iniciada, repaso a ojo de temas y móvil.

## 3. A medias o por confirmar con Alberto

- **Bolsa común de Code Clicker**: con la política nueva ya no se llena y su
  placa no sale. Preguntar a Alberto si se quita del todo (`loot.ts`,
  `clicker_pool`, `POST /clicker/pool/claim`).
- **Saltos de Code Clicker pendientes** en el panel (55 a 2026-10-16): los
  revisa Alberto.
- **Cifras de los límites** (se cambian desde el panel, pestaña "Consumo"): el
  tráfico de salida de Oracle está puesto a 10 TB al mes y se renueva el día 1,
  con el corte fijo al 90 % (9 TB); el tope diario o mensual de
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
