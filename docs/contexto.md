# Contexto para retomar el trabajo

Resumen de lo decidido y de cómo está el proyecto, para que quien continúe (una
persona o un asistente con el contexto vacío) no tenga que reconstruirlo. Lo que
hace la web está en el [README](../README.md); cómo está montada, en
[architecture.md](architecture.md); el contrato HTTP, en [api.md](api.md). Aquí
va lo que no está en el código.

Última puesta al día: 2026-10-22.

**Al retomar con el contexto vacío, lo primero es
[tareas-tras-compactar.md](tareas-tras-compactar.md)**: es la lista de lo que hay
que hacer, en orden. Este documento es el porqué; aquel, el qué.

## Quién y cómo

- Autor: Alberto (`albrodri` en 42, `ALRO-GM` en GitHub). Se trabaja en español.
- Repositorio: `git@github.com:ALRO-GM/sanatorio-42.git`, rama `main`.
- **Commits y push solo cuando Alberto lo pide** (lo dice `AGENTS.md`). Etiqueta
  de respaldo anterior a la red de correcciones: `punto-guardado-2026-10-11`.
- Antes de dar algo por hecho: `npm run check` (tipos, lint, formato, código
  sin uso, duplicados, textos y tests).
- Desplegar: `ssh ubuntu@51.170.34.214 "cd /opt/sanatorio && git pull -q
  --ff-only && infra/scripts/backup.sh; infra/scripts/deploy.sh"`. Hacer el
  `git pull` aparte evita reescribir `deploy.sh` mientras se ejecuta. El script
  espera a la CI del commit (no despliega si falla) y vuelve a la imagen
  anterior si la nueva no responde.
- **Cupo de GitHub**: la API pública da 60 consultas por hora a la IP del
  servidor. `deploy.sh` consulta la CI a los 4 minutos y luego una por minuto,
  mira antes el cupo en `/rate_limit` (gratis) y, si solo queda el 10 % de
  reserva, para y dice cuándo se renueva. Alberto pidió (2026-10-22) no pasar
  del 90 %: agrupar los cambios en pocos despliegues.
- Los cambios de la web se prueban con `npm run dev:mock` y Chrome sin ventana.

## Estado a 2026-10-22

- **Despliegue sin preguntar**: Alberto lo autorizó el 2026-10-22 y puso el
  permiso de la orden en su configuración. Cada bloque: `npm run check`,
  commit, push y desplegar.
- **Curso de git (#42) terminado y en producción**: camino de 30 puntos, test
  previo, tres pruebas de grupo y jefe final (`docs/curso-git.md`). Las
  misiones de grupo se comprueban **por persona** (pedido por Alberto: todas
  usan todos los conceptos). En el jefe, puestos a 4 filas y 4 columnas (u
  otro clúster) y sin ver lo que escriben las demás. Migración 62
  (`git_rooms`, `git_room_players`). Demostración `gitCourse`.
- **Tanda de la valoración de uso** hecha (ver `docs/interfaz.md`), con la
  demostración de Exámenes, «Personalizar» desde cada página y el modo de la
  interfaz también en Personalizar.
- Arreglados del apartado 3 del plan: cola de 42 para quien administra desde
  el panel y expediente ajeno en tercera persona. Comprobado que los intentos
  de examen siguen entrando.

## Revisión completa (2026-10-17)

Alberto pidió una revisión de todo; hecha y desplegada por bloques:

- **Código**: `knip` y `jscpd` en `npm run check` y la CI; borrado lo muerto,
  unido lo repetido (`useGateQueue`, `LimitParts`, `Achievements`, `Figure`,
  `shared/day.ts`).
- **Tests**: guía en `docs/tests.md`; tests de pantallas (jsdom + Testing
  Library contra la API simulada) en `apps/web/tests/ui`; mínimos de cobertura
  que solo suben (API 96 %, web 48 % sin contar textos).
- **Textos**: ya no hay texto en el código. Tablas CSV por tema en
  `apps/web/src/shared/i18n/textos/` (y el grupo `juego/` para Code Clicker),
  plugin de Vite, idiomas descargados aparte, `npm run textos` y
  `docs/textos/` generado. Regla estricta en `docs/textos.md` y `AGENTS.md`.
- **Interfaz**: cinco categorías (Expediente, Ayuda, Calendario, Clústeres, Datos) y tres
  modos (simplificado, normal, loco por los datos). Mapa, importancia de cada
  elemento, valoración de uso y regla para lo nuevo en `docs/interfaz.md`.
- **Demostraciones**: `defineTour`, tests que las encuentran solas, plantilla
  con `npm run demo:new`, demo de Clústeres; `docs/demos.md`.
- Peticiones sueltas durante la revisión: tablas ordenables por varias
  columnas con cabecera fija (`DataTable`), apartado de trampas de Code Clicker
  (migración 52, registro de trampas), estado de salud ordenado, y nombres de
  las noticias del juego sacados de con quién se ha corregido cada cual.

## Estado a 2026-10-16

- **Tanda del buzón** (39 puntos sacados de los 64 mensajes): el plan, con lo
  hecho marcado, está en [tareas-tras-compactar.md](tareas-tras-compactar.md),
  apartado 2. Alberto autorizó commit, push y despliegue por cada punto.
- Hechos y en producción los bloques A (fallos) y B (seguridad, moderación y
  legal): correcciones sin falta automática, guardia, buzón de admins, Red,
  holy graph por votos, **fotos servidas por la API** (la CDN de 42 da 403 sin
  sesión), cabeceras, denuncias con motivo, buzón con tipo y sección, borrar y
  guardar avisos, **segundo factor del panel** (TOTP, cada 12 h; si se pierde
  el móvil: `DELETE FROM admin_second_factor WHERE login = '…'` por SSH),
  **privacidad y condiciones** con aceptación y descarga de datos, y la
  **revisión de trampas** de Code Clicker con bolsa común.
- Después, también en producción:
  - **Política de trampas nueva** (Alberto, 2026-10-16; sustituye a la bolsa
    común): en cada trampa contada se vuelve a la última partida buena, se
    venden sus edificios al 50 % de lo que costaron (`SALE_REFUND` en la API =
    `FORCED_REFUND` en la web, un test comprueba que coinciden), se le da ese
    dinero y la misma cantidad se reparte entre quienes juegan con la roja y
    nunca han sido pillados (`pending_gift`, migración 46). Ocho mensajes de la
    policía del código con humor (`police` en `texts.ts`). La bolsa común ya no
    se llena y su placa queda dormida: **falta decidir con Alberto si se quita**.
  - **Antitrampas de pulsaciones** (`clicks.rules.ts`, migración 45): topes
    absolutos de 50/s durante 60 s, 9/s en 30 min, 6/s en 2 h, 4/s en 6 h y
    2/s en 24 h. No se mira segundo a segundo.
  - **Quien administra ve la partida de cualquiera** (botón «Ver su partida»,
    no guarda nada) y puede poner una **sanción a mano** («Sanción a mano» en
    la ficha del jugador; `POST /admin/clicker/sanction`): deja el código que
    se diga, con o sin edificios y mejoras, y un mensaje que sale en el juego.
    Conserva logros, prestigio y la cuenta de la clasificación.
  - **Estilo Bichota**, solo para un expediente: quien entra en ese perfil lo
    ve con su estilo. Es reutilizable para otros perfiles: `EXCLUSIVE_STYLES`
    en `themes/ids.ts` y `styles.rules.ts` en la API (un test comprueba que
    coinciden), `recordStyle` (migración 44).
  - **Code Clicker**: la clasificación ordena por patrimonio (código sin
    gastar más lo que costaron los edificios); el aviso de saltos descuenta los
    repartos cobrados en la última hora (migración 47, `gifts`); el panel
    enseña código, patrimonio, edificios y mejoras de cada persona. La cruz
    abre el juego a las **42** pulsaciones (antes 100); los logros de la cruz
    son 1, 10, 21 y 42, y quien tenía el de 50 recibe **Beta tester** (oculto,
    ya no se consigue; se convierte al cargar la partida, `renamed` en
    `engine.ts`).
  - **Pizarras y terapias**: solo las cambia quien las crea; quien modera solo
    puede retirarlas (`canCancel`, `canClose`) y se apunta como cualquiera.
  - **Mapa**: puestos rotos (migración 48, `broken_seats`, una semana o hasta
    que alguien inicie sesión en él), proponer puestos para una terapia
    (`propose.ts`), girar el plano, círculos y resaltados (`look.ts`).
  - **Ayuda**: las peticiones por contestar y los rechazos o anulaciones salen
    en una ventana que no se salta (migración 49, `news_for`; `GET /help/inbox`).
  - **Code Clicker**: media hora de juego al día si el pace va en riesgo
    (22, 24 o black hole; `limit.ts`, en el navegador) y logros y producción
    por los puntos de evaluación donados a la bolsa de 42 (migración 50; una
    petición al día por persona a `correction_point_historics`, se cuenta lo
    que resta y lleva «pool» en el motivo). Comprobado con datos reales el
    2026-10-17: se leen bien.
  - **Comodidad**: tamaño del texto, daltonismo, modo zen (`shared/comfort.ts`
    y `public/theme.js`), bienvenida (`features/welcome`) y pestañas en
    desplegable en el móvil.
  - **Pizarras**: sin día elegido, las próximas con plaza.
  - **Tablón**: «Mis correcciones», el holy graph de lo corregido (medallas
    por 1, 3, 5 y 10 correcciones; un proyecto sin correcciones en el campus
    en un año se da por retirado) y el título «Maestro del código» (10
    correcciones de un proyecto; lleva al lado en cuántos). Sale de la tabla
    `corrections`, sin pedir nada nuevo a 42.
  - **Exámenes** (sección nueva, módulo `exams`, migración 51): los intentos
    de los Exam Rank (los `teams` de la fila de 42) se guardan al copiar; una
    copia de fondo baja lo antiguo (estado en `sync_state`, claves
    `exams:<campus>:<proyecto>`), solo con cuota de sobra y sin nadie usando
    la web. Estadísticas por examen y duración de círculos (de `user_tracks`).
    En vivo: `GET /exams/live`, quién está apuntado (`/exams/:id/exams_users`)
    y su última nota, refrescado cada 5 min mientras alguien mira; el pulso
    enciende la pestaña («en vivo»). 2026-10-22: el día («hoy», «mañana») se
    cuenta en la hora del campus; la lista junta 42, la agenda copiada y las
    filas de examen de la sesión, con el examen que toca por círculo; quien lo
    cierra sin 100 sale suspenso; refresco cada 5 min también de fondo y botón
    de refrescar, uno por minuto para todo el campus (`sync_state`
    `exams:live:…`), con cuentas atrás de fin y de refresco. **Por confirmar** con datos reales que
    42 manda `teams` en `/projects_users` (si no, cuenta por `occurrence`).
- Base en la versión 51. `npm run check`: 595 tests de la API y 208 de la web.
- El texto legal es de base: conviene que lo revise alguien de leyes.

## Estado a 2026-10-12

- **Revisión de seguridad y refactorización hecha y desplegada** (commits
  `384daf8` a `4eb13fe`). Todo está en [revision-seguridad.md](revision-seguridad.md).
  En corto: una sola comprobación de admin más una barrera global para `/admin`,
  topes por IP en el login, un esquema único de fecha, un test que recorre todas
  las rutas, código muerto fuera, y dos cosas nuevas:
  - **Documentos verificables y cuenta de staff** (módulo `staff`, migración 33,
    pantalla `#/validar`). Las cuentas se crean en el panel, en «Permisos y
    bloqueos». **Aún no hay ninguna creada en producción**: la clave se enseña
    una sola vez y tiene que copiarla Alberto.
  - **Demostración pública** en `/demo/`: la web compilada con la API de mentira
    (`npm run build:demo`, que ya lanza `npm run build`). Sus ajustes van en
    `vite.config.ts`, no en un `.env.demo`: los `.env.*` no entran en git ni en
    la imagen.
- **Copias de seguridad**: no habían funcionado nunca en producción (carpeta de
  root, cron como `ubuntu`). Arreglado el 2026-10-12: `infra/backups` es de
  `ubuntu` y hay una copia comprobada. Siguen estando solo en la misma máquina.
  Para ver si la de anoche salió: `ls -la /opt/sanatorio/infra/backups` y
  `tail /var/log/sanatorio-backup.log`.
- `npm run check` pasa con 483 tests de la API y 125 de la web.
- El aviso `[oauth] /oauth/token respondió 401 … invalid_grant` que sale al
  pasar los tests **no es un fallo**: lo escribe un test que simula a propósito
  que 42 rechaza el canje.
- La imagen se probó en local antes de desplegar con las restricciones nuevas
  del contenedor (`cap_drop: ALL`, `no-new-privileges`).

## Estado a 2026-10-11

- **Todo subido a GitHub** a 2026-10-11 (tarde): la XP por códigos con informe
  de horas (módulo `attendance`), el presupuesto dinámico de peticiones, la
  cuota de 42 con rótulo y cola de turnos, las pasadas de seguridad, rendimiento
  y simplificación, y el borrado a plazo de mensajes. `npm run check` pasa (343
  tests de la API). El antes y el después, en [rendimiento.md](rendimiento.md).
  También el buzón de avisos con el número de sin leer en la cabecera (módulo
  `notices`). **Solo queda desplegar**, cuando Oracle dé la máquina.
- Antes de eso había entrado:
  expediente público de otras personas; cabecera fija, guardia desde "De
  guardia" y personalización; módulo `usage` y mapa de calor; avisos, chat de
  evento y asistencia con códigos (`meet`); panel de gestión ampliado (`admin`);
  terapias con chat, progreso, puestos juntos y grupos de repaso; preevaluación;
  franjas pasadas fuera del calendario; README y este documento.
- **Base local** (`apps/api/data/sanatorio.db`): esquema en la versión 17, con
  las 85 915 correcciones del 42cursus de Madrid ya copiadas. El código va por la
  versión 21: al arrancar el servidor se aplican las migraciones nuevas, la base
  pasa a WAL y se calculan sus estadísticas.

## Despliegue: en producción desde el 2026-10-11

- **https://sanatorio42.duckdns.org** → `51.170.34.214` (Oracle, ARM, 1 OCPU,
  6 GB, 46,6 GB de disco; cuenta en Pay As You Go). DuckDNS solo con IPv4: la
  máquina no tiene IPv6 pública.
- Código en `/opt/sanatorio`, `infra/.env` copiado desde el equipo de Alberto.
  Para actualizar: `ssh ubuntu@51.170.34.214`, y en `/opt/sanatorio`
  `infra/scripts/deploy.sh` (o `git pull` y `docker compose up -d --build` en `infra/`).
- Los datos de 42 no se bajaron de cero: se importaron los ya copiados en local
  (solo las tablas de la réplica; lo propio de producción no se tocó). La copia
  de antes está en `/opt/sanatorio/infra/backups/antes-de-importar.db`.
- La guardia de límites corre por cron cada cinco minutos
  (`sudo infra/scripts/limits-guard.sh status`).
- **Secreto de 42**: rotado el 2026-10-11, pero el que está puesto se pegó en
  una conversación. Pendiente de rotarlo otra vez, escribiéndolo Alberto
  directamente en `infra/.env` y `apps/api/.env`.
- **Por comprobar con sesión iniciada**: que la consola no dé errores de la
  política de contenido (fotos de perfil, QR, descarga del CSV).
- Los reintentos de Oracle están parados (`oracle-stop`) y ya no hacen falta: las
  "Tareas recurrentes" de más abajo sobre Oracle ya no aplican.

## Cómo se llegó hasta aquí (histórico)

- Dominio: `sanatorio42.duckdns.org`. La URL de retorno ya está en la app de 42.
  En DuckDNS falta poner la IP de la máquina (ahora apunta a la casa de Alberto).
- `infra/.env` de producción está preparado en local (fuera de git, permisos 600).
- Oracle responde "Out of host capacity" en `eu-madrid-1` para las dos máquinas
  gratuitas. La red y los puertos ya existen (`infra/oracle/create-instance.sh`).
- Hay un proceso en el ordenador de Alberto que lo reintenta cada 5 minutos,
  alternando ARM y x86, independiente de cualquier sesión:
  - registro: `~/.local/share/sanatorio-oracle/oracle-retry.log` (cuando entre,
    la última línea dirá `Listo. La máquina está en: <IP>`);
  - parar: `touch ~/.local/share/sanatorio-oracle/oracle-stop`;
  - si el equipo se reinicia hay que relanzarlo: `cd ~/.local/share/sanatorio-oracle && setsid nohup bash ./retry.sh &`.
- El cliente `oci` está configurado en `~/.oci/` (clave de API propia).
- **Cuando haya IP**: ponerla en DuckDNS (lo hace Alberto) → `ssh ubuntu@<IP>` →
  clonar en `/opt/sanatorio` → copiar `infra/.env` → `docker compose up -d --build`
  → comprobar `https://sanatorio42.duckdns.org/api/health/db`. La copia inicial
  de 42 tarda unas horas; la web funciona desde el primer minuto.
- Alberto va a pasar la cuenta a "Pay As You Go" (2026-10-11) para tener
  capacidad. Condición suya, **estricta**: no pagar nunca. Al 90 % de cualquier
  límite gratuito solo entra quien administra y se para todo lo automático; al
  95 % no entra nadie y hay que ir por SSH. Está en la web y en una guardia de
  la máquina. Ver `docs/deploy-oracle.md`, "Pay As You Go".

## Tareas recurrentes al retomar una sesión

Al empezar con el contexto vacío, antes de nada:

1. **Comprobar los reintentos de Oracle** y, si el proceso ha muerto, relanzarlo:

   ```sh
   tail -3 ~/.local/share/sanatorio-oracle/oracle-retry.log
   pgrep -af 'retry.sh' || (cd ~/.local/share/sanatorio-oracle && setsid nohup bash ./retry.sh > /dev/null 2>&1 < /dev/null &)
   ```

   Si la última línea dice `Listo. La máquina está en: <IP>`, seguir con el
   despliegue (más abajo) en vez de relanzar nada.

2. **Volver a poner el vigilante** (tarea en segundo plano de la sesión: avisa
   cuando Oracle dé la máquina o si los reintentos se paran; no gasta nada
   mientras espera):

   ```sh
   L=~/.local/share/sanatorio-oracle/oracle-retry.log
   alive() { for p in $(pgrep -x bash); do [ "$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null)" = "bash ./retry.sh " ] && return 0; done; return 1; }
   until grep -q "Listo. La máquina" "$L" 2>/dev/null || ! alive; do sleep 60; done
   grep -q "Listo. La máquina" "$L" && echo "MAQUINA CREADA" || echo "LOS REINTENTOS SE HAN PARADO"; tail -4 "$L"
   ```

   Ojo al matar procesos con `pkill -f`: el patrón también casa con la propia
   orden. Usar el truco del corchete (`pkill -f '[r]etry.sh'`) o el PID.

3. **Ver qué hay sin subir**: `git status --short | wc -l` y `git log --oneline -3`.

4. **Comprobar que el servidor local sigue vivo**, si Alberto está probando:
   `curl -s localhost:3000/health` (API) y `curl -sI localhost:5173` (web).

Y al cerrar cada tanda de cambios: `npm run check`, actualizar este documento y
decir a Alberto qué queda sin subir. Para probar la web se arrancan `vite --mode
mock --port 5198` y un Chrome sin ventana en el puerto 9333, y se paran al acabar.

Alberto pidió además **guardar margen de uso de la sesión** para poder hacer el
despliegue cuando llegue la máquina: los reintentos ya no gastan nada, pero no
conviene agotar la sesión en otras tareas si él avisa de que va justa.

## Decisiones tomadas con Alberto

- **Solo 42cursus**: la piscina (`cursus_id` 9 y 66) no sale en ningún sitio.
- **Guardia**: no se puede abrir una media hora ya empezada; la XP exige
  presencia comprobada y valoración de las dos partes.
- **Mapa**: los puestos de una terapia solo se pintan en azul mientras el grupo
  está reunido.
- **Terapias**: por fechas concretas, no por día de la semana. Un grupo que se
  queda vacío desaparece. Puestos: de 2 a 6 que se tocan (mismo cluster y cada
  uno pegado a otro, también en diagonal), para poder hablarse; las plazas son
  los puestos.
- **Grupos de repaso**: "terminado al 100 %" es lo que declara cada persona, no
  lo que conste en 42.
- **Pace**: tabla de plazos por círculo (`apps/web/src/shared/pace.ts`). Si 42
  da una fecha de black hole posterior a la de la tabla, es la real: la
  diferencia son días extra (bonus, compensación, *freeze*) y retrasa todos los
  plazos. Es decir, los plazos se cuentan hacia atrás desde el black hole.
- **Red de correcciones**: las cuentas borradas (`3b3-…`) cuentan como del
  campus; quien viene de fuera solo sale como vecino. Un suspenso es la nota por
  debajo de la mínima del proyecto, no la marca del corrector. Corrector y
  corregido se enseñan siempre por separado.
- **Franjas para corregir de 42**: descartado por ahora; exigiría el permiso
  `projects` y guardar tokens de cada persona.
- **Expediente ajeno**: enseña el estado de salud; no el desglose de XP ni las
  preferencias.
- **Asistencia y XP**: la XP de pizarras y ayuda depende de los códigos de
  inicio y fin, con un cálculo de tiempo robusto: Alberto quiere usarlo para
  negociar *compensation days* con el staff de 42. Hecho; ante la duda se cuenta
  menos. Ya no se comprueba por puestos que las dos personas estén en el campus.
- **Consumo**: el presupuesto de peticiones tiene que ser dinámico (según lo que
  quede del día y la gente conectada) y regulable a mano, para no llegar nunca
  al máximo. Un límite mensual se reparte entre los días que quedan hasta que
  se renueve. Si la API de 42 va justa: aviso a los estudiantes, solo pasan las
  llamadas críticas y el resto espera en una cola por orden de llegada, que
  enseña a cada quien su número y por cuál va, como un tique de sala de espera
  de hospital. Hecho.
- **Administración**: `albrodri` es admin (`ADMIN_LOGINS` en local y producción).

## Pendiente de confirmar o de hacer

El plan con sus casillas está en [tareas-tras-compactar.md](tareas-tras-compactar.md).
En resumen: queda desplegar. Alberto dio por buenos los valores propuestos de
los códigos y de los límites (2026-10-11); el tope de la app de 42 sigue vacío
hasta que lo mire en la intra. Sigue pendiente rotar
el secreto de la app de 42, que se llegó a ver en una conversación.

## Cosas que conviene saber

- La API de 42 da 1 200 peticiones por hora para toda la app. Con las
  credenciales de la aplicación solo se han hecho consultas de lectura.
- 42 no publica: el *pace*, la nota mínima de los proyectos, ni el plan de
  estudios. Se deducen (ver README, "Decisiones de implementación").
- `GET /v2/scale_teams` admite `range[id]` y `range[updated_at]`; con
  `filter[cursus_id]=21` deja fuera la piscina.
- El servidor de desarrollo (`tsx watch`) se reinicia al tocar cualquier fichero
  de la API y aplica las migraciones al arrancar.
- Vite puede quedarse sirviendo un módulo vacío si lee un fichero a medio
  escribir: se arregla tocándolo otra vez.
- Los tests de la API no pueden depender de la hora real: usan un reloj falso.
- La base va en WAL: junto a `sanatorio.db` hay un `-wal` y un `-shm`. Para
  copiarla a mano, `VACUUM INTO` o `sqlite3 … ".backup"`, no `cp`.
- La web lleva política de contenido (`infra/Caddyfile`): nada de scripts en
  línea ni de recursos de otros dominios, salvo imágenes por https.
