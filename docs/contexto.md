# Contexto para retomar el trabajo

Resumen de lo decidido y de cómo está el proyecto, para que quien continúe (una
persona o un asistente con el contexto vacío) no tenga que reconstruirlo. Lo que
hace la web está en el [README](../README.md); cómo está montada, en
[architecture.md](architecture.md); el contrato HTTP, en [api.md](api.md). Aquí
va lo que no está en el código.

Última puesta al día: 2026-10-11.

## Quién y cómo

- Autor: Alberto (`albrodri` en 42, `ALRO-GM` en GitHub). Se trabaja en español.
- Repositorio: `git@github.com:ALRO-GM/sanatorio-42.git`, rama `main`.
- **Commits y push solo cuando Alberto lo pide** (lo dice `AGENTS.md`). Etiqueta
  de respaldo anterior a la red de correcciones: `punto-guardado-2026-10-11`.
- Antes de dar algo por hecho: `npm run check` (tipos, lint, formato y tests).
- Los cambios de la web se prueban con `npm run dev:mock` y Chrome sin ventana.

## Estado a 2026-10-11

- **Subido a GitHub**, sin nada pendiente en local a 2026-10-11. Lo último que entró:
  expediente público de otras personas; cabecera fija, guardia desde "De
  guardia" y personalización; módulo `usage` y mapa de calor; avisos, chat de
  evento y asistencia con códigos (`meet`); panel de gestión ampliado (`admin`);
  terapias con chat, progreso, puestos juntos y grupos de repaso; preevaluación;
  franjas pasadas fuera del calendario; README y este documento.
- **Base local** (`apps/api/data/sanatorio.db`): esquema en la versión 17, con
  las 85 915 correcciones del 42cursus de Madrid ya copiadas.

## Despliegue: pendiente de que Oracle dé una máquina

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
- Alternativa si no entra: pasar la cuenta a "Pay As You Go" (las máquinas
  Always Free siguen gratis y suele haber capacidad).

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
  queda vacío desaparece. Puestos: de 2 a 6, mismo cluster, dos filas como mucho
  entre el primero y el último; las plazas son los puestos.
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
- **Expediente ajeno**: no enseña estado de salud ni desglose de XP.
- **Administración**: `albrodri` es admin (`ADMIN_LOGINS` en local y producción).

## Pendiente de confirmar o de hacer

- Que los códigos de asistencia decidan la XP (ahora solo se guardan).
- Si la separación de puestos debe ser de filas contiguas en vez de dos.
- Si el estado de salud de los demás debe verse en su expediente.
- El presupuesto de 30 000 peticiones por hora es una constante
  (`apps/api/src/app/composition.ts`); debería ser un ajuste.
- Trocear en bloques ordenables las páginas que hoy son una sola lista.
- Alberto comentó que una terapia recién creada "no aparecía": en la base está
  bien y sale en lista, calendario y mapa. Se corrigió el filtro de proyecto de
  la pestaña Terapia; falta saber si era eso.
- Rotar el secreto de la app de 42: se llegó a ver en una conversación.

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
