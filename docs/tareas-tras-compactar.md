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

Última puesta al día: 2026-10-17. En producción desde el 2026-10-11.

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

## 2. Plan vigente: revisión completa (pedido el 2026-10-17)

La tanda del buzón (39 puntos, 2026-10-16) está entera desplegada; su detalle
queda en `contexto.md` y en el historial. Alberto pidió después, en un solo
mensaje, una revisión completa. Se hace por bloques; cada bloque termina con
`npm run check`, commit, push y despliegue (como en la tanda del buzón).

- [x] **1. Código muerto, duplicado o simplificable.** `knip` (exportaciones y
      ficheros sin uso), `jscpd` (duplicados) y repaso a mano. Borrar o unir.
- [x] **2. Tests.** Buscar guías profesionales de qué cubrir (normal,
      imprevisible, límite; producción). Escribir `docs/tests.md` con la lista
      de comprobación. Medir cobertura, rellenar huecos. Proteger producción:
      umbral de cobertura en CI y `deploy.sh` no despliega sin tests verdes.
- [ ] **3. Textos en tablas.** Los textos de la web salen de tablas por tema
      (CSV con clave, contexto, es, en, ca, eu) que son la única fuente; un
      plugin de Vite las convierte y cada idioma se carga solo si se usa.
      `docs/textos/` con la tabla legible por tema (generada, con dónde se usa
      cada clave). Comprobación en `npm run check`: claves usadas que faltan,
      claves sin uso y tabla generada al día. Regla estricta en `AGENTS.md`.
- [ ] **4. Claridad del español.** Repasar los textos: frases breves, con
      sentido y bien construidas. Ajustar las traducciones que cambien.
- [ ] **5. Categorías y modos.** Agrupar las pestañas: Expediente · Ayuda
      (sala de espera, tablón, terapia, pizarras) · Calendario · Datos (red,
      clústers, exámenes). Tres modos de interfaz a elegir (simplificado,
      normal, loco por los datos) con la importancia de cada elemento por
      página. `docs/interfaz.md` con el mapa, la importancia y la valoración de
      uso de cada elemento. Regla en `AGENTS.md`: cada funcionalidad nueva dice
      su categoría y en qué modo sale.
- [ ] **6. Demostraciones animadas.** Revisar cómo se hacen, unificar
      criterios y dejar una plantilla (`shared/tour/`) y su guía.
- [ ] **7. README.** Al día con todas las funcionalidades, las categorías y
      los modos.

## 3. A medias o por confirmar con Alberto

- **Comprobar los intentos de examen** (`SELECT COUNT(*) FROM exam_attempts`
  y las claves `exams:%` de `sync_state`). La copia de fondo solo avanza con
  la web sin uso 10 minutos; el 2026-10-17 por la mañana aún no había
  empezado. Si avanza y `exam_attempts` sigue a cero, 42 no manda `teams` en
  `/projects_users`: las estadísticas cuentan por `occurrence` y habría que
  pedir los intentos de otra forma. (Lo donado a la bolsa ya está
  comprobado: se lee bien.)
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
