# Cifrado de datos

Decidido por Alberto el 2026-11-14 («revisa qué datos tendrían que estar
cifrados y hazlo»), a raíz del ticket #113 («problemas legales con los
mensajes: revisar cómo guardarlos cifrados»).

## Por qué

La ley (RGPD, art. 32) no obliga a cifrar en reposo: pide una seguridad
proporcionada al riesgo. Pero si hay una filtración y lo filtrado estaba
cifrado de forma que no se puede leer, no hace falta avisar una a una a las
personas afectadas (art. 34.3.a; a la AEPD, sí). Es decir: cifrar abarata mucho
lo que peor puede salir.

Lo que más fácil se escapa no es el servidor, sino **los ficheros**: la base
(`/data/sanatorio.db`), las copias del servidor (`infra/backups/`) y las que se
lleva el ordenador de Alberto (`infra/scripts/pull-backups.sh`). Por eso hay dos
capas:

1. **Campos cifrados en la base**: lo privado que escribe la gente va cifrado
   con una clave (`DATA_KEY`) que vive solo en `infra/.env` del servidor, fuera
   de la base y de sus copias. Quien tenga la base o una copia sin la clave no
   lee ni un mensaje.
2. **Copias que salen del servidor, cifradas enteras** con una clave pública
   (gpg); la privada solo la tiene Alberto.

Lo que **no** protege: un servidor comprometido mientras funciona (la clave
está en él para poder leer y escribir). Tampoco es cifrado de extremo a
extremo: quien administra sigue pudiendo leer un chat con una denuncia, como
dice el texto legal. Hacerlo de extremo a extremo impediría moderar.

## Inventario

Recorridas todas las migraciones (`apps/api/src/core/db/migrations/`, de la 1
a la 93). Para cada columna con algo de alguien: si se cifra, y por qué.

### Se cifra (texto privado escrito por personas)

| Tabla.columna | Qué es | Por qué |
| --- | --- | --- |
| `event_messages.body` | Mensajes de los chats de eventos, sprints, pizarras, ayudas y conversaciones directas | Lo más privado que hay. No se busca ni se ordena por él |
| `notices.text` | El trozo de texto de un aviso del buzón | Copia los primeros 140 caracteres de un mensaje privado o de una incidencia |
| `tickets.subject`, `tickets.body` | Incidencias, sugerencias y denuncias del buzón | Lo que se cuenta a quien administra, a veces sobre otra persona |
| `tickets.proposal` | La propuesta de una sugerencia | Igual que lo anterior |
| `tickets.answer` | La respuesta de quien administra | Contesta a lo anterior y suele citarlo |
| `user_blocks.reason` | Por qué se bloqueó una cuenta | Nota de moderación sobre una persona |
| `hidden_people.reason` | Por qué se oculta a alguien | Nota de moderación sobre una persona |
| `help_bookings.note` | La nota de quien pide ayuda a quien ayuda | Mensaje privado entre dos |
| `scrum_goals.note`, `scrum_entries.note` | Notas de la agenda | Notas personales; solo las ve su dueño (y su sprint) |
| `scrum_entries.problem_other`, `scrum_entries.solution_other` | El «Otro» de qué te atascó y cómo salir | Texto libre personal (lo demás de la agenda son listas cerradas) |
| `scrum_checkpoints.text` | Un checkpoint propio | Texto libre de la agenda |

Ninguna de estas columnas se busca con `LIKE`, se ordena ni se agrupa: solo se
escriben y se leen enteras. Si un día hiciera falta buscar en ellas, no se
puede en SQL: habría que descifrar en la app (con pocas filas) o guardar aparte
un índice que no deje leer el texto.

### Ya estaba cifrado

| Tabla.columna | Cómo |
| --- | --- |
| `admin_second_factor.secret` | El secreto TOTP del panel, con AES-256-GCM y una clave sacada de `SESSION_SECRET` (`modules/admin/second-factor.ts`), desde la migración 41. Usa la misma pieza de `core/crypto/fields.ts` (`gcmSeal`, `gcmOpen`) con su formato de siempre; pasarlo a `DATA_KEY` no protegería más (esa clave tampoco está en la base) |
| `staff_accounts.key_hash` | Las claves del staff, con hash y sal (no se pueden recuperar ni hace falta) |

### No se cifra

| Qué | Por qué |
| --- | --- |
| Logins (`login`, `*_by`, `helper`, `requester`, `corrector`…) | Se buscan, se cruzan entre tablas y se anonimizan con `UPDATE … WHERE login = ?`. Además, el login es público dentro de 42 |
| Dudas, respuestas y guías del tablón (`doubts`, `doubt_answers`, `guides`, `guide_proposals`, `guide_changes`) | Son públicas para todo el campus dentro de la web |
| Pizarras y sprints (`boards.title`, `boards.description`, `therapy_groups.note`) | Son anuncios públicos dentro de la web |
| Avisos de quien administra (`broadcasts`) | Van a mucha gente a la vez: son anuncios |
| Problemas del edificio (`facility_reports.note`) | Es operativo (una silla rota), lo ve el staff y sale también a Slack |
| `tickets.target`, `tickets.place`, `tickets.reason` | Referencias (`message:12`), el sitio de la web donde se soltó la burbuja y un motivo de una lista cerrada. Se filtran y no son texto de nadie |
| Agenda: `outcome`, `problem`, `solution`, `plan`, `progress` | Listas cerradas y números |
| Code Clicker (`clicker_alerts.evidence`, `clicker_alerts.answer`, `clicker.caught_why`) | Del juego: lo calcula la app (salvo la respuesta a una alerta, sobre una partida). Candidato si un día se ve que la gente escribe ahí cosas personales |
| Informes del staff (`report_exports.content`) | Horas validadas para el staff: se comprueban con su hash y la persona los pidió para darlos |
| Códigos de asistencia (`event_codes`, `staff_checks.code`) | Duran un rato y se buscan por su valor |
| Lo copiado de 42 (`users`, `project_users`, `corrections`…) | Lo publica 42 al campus y volvería en la siguiente copia |
| Estadísticas de uso (`usage_*`, `request_stats`) | Cuentas por sección y hora, sin texto |

## Cómo está hecho

- **Pieza**: `apps/api/src/core/crypto/fields.ts`. AES-256-GCM de `node:crypto`,
  con un iv de 12 bytes al azar por valor y la etiqueta de 16 bytes, que
  detecta cualquier cambio.
- **Formato**: `v1:<huella>:<iv>:<datos>:<etiqueta>`, todo en base64url. La
  huella son 8 caracteres sacados del hash de la clave: dice con cuál se cifró
  sin decir nada de ella. La cabecera `v1:<huella>` va como dato asociado:
  cambiarla también rompe la etiqueta.
- **Lectura tolerante**: lo que no tiene exactamente esa forma es texto de antes
  del cifrado y se devuelve tal cual (también un mensaje viejo que empiece por
  «v1:»). Un valor con esa forma que no se puede abrir (tocado, o de una clave
  que no está) da `SealedFieldError`: mejor un error que un texto a medias.
- **Quién cifra**: cada módulo, en su repositorio o servicio, con el `fields`
  que le pasa `app/composition.ts`. Cada módulo declara sus columnas en
  `sealed` (`AppModule`, `core/module.ts`), como declara `personal`; un test
  (`tests/integration/cifrado-arranque.test.ts`) fija la lista de arriba.
- **Lo que había**: al arrancar (`app/build-app.ts`), `core/crypto/seal-existing.ts`
  cifra lo que quede en claro (o con una clave anterior) en esas columnas, de
  500 en 500. Es idempotente: tras la primera vez solo mira. No es una
  migración porque las migraciones son SQL y no tienen la clave (ni deben). Lo
  apunta en el registro una vez (`cifrado al arrancar`, a nivel `warn`).
- **Descarga y anonimización**: `GET /me/export` da las columnas cifradas en
  claro a su dueño (`modules/legal`, con la lista `sealed`); la nota de una
  reserva sigue yendo solo a quien la escribió. `POST /me/anonymize` cambia los
  logins y no toca el texto, que sigue cifrado y legible.
- **Panel**: «Limpiar datos» enseña la muestra en claro (`sealed` en
  `tableStore`); la moderación de mensajes y el buzón, igual.

## La clave

- `DATA_KEY`: 32 bytes en base64 (`openssl rand -base64 32`), en `infra/.env`
  del servidor. La lee `config/env.ts`, que comprueba que son 32 bytes.
- **En producción no se arranca sin ella** (`NODE_ENV=production`, lo pone la
  imagen de Docker): con un mensaje que dice qué falta. Así nunca se mezcla en
  la base texto cifrado con una clave sin valor.
- En desarrollo, tests y demostración, sin `DATA_KEY` se usa una clave fija de
  pruebas (`DEV_DATA_KEY`), pública. La demostración pública (`/demo/`) no
  pasa por la API: no le afecta.
- **Guárdala también fuera del servidor** (el gestor de contraseñas de Alberto
  y una copia en papel o en un USB aparte), y **nunca** junto a las copias.

### Rotar la clave

1. Genera la nueva: `openssl rand -base64 32`.
2. En `infra/.env`: la nueva en `DATA_KEY` y la vieja en `DATA_KEY_PREVIOUS`
   (si hay varias, separadas por comas).
3. Reinicia la app (`docker compose up -d app`). Al arrancar vuelve a cifrar
   todo con la nueva; el registro dice cuántos valores (`cifrado al arrancar`).
4. Comprueba que no queda nada de la vieja (abajo) y vacía `DATA_KEY_PREVIOUS`.
   Las copias de antes de la rotación siguen necesitando la vieja: guárdala
   mientras quieras poder restaurar alguna.

### Si se pierde la clave

Lo cifrado no se recupera: ni con la base ni con las copias. La app no arranca
con datos de una clave que no tiene («Hay un dato cifrado con una clave que no
está cargada»). Para seguir sin esos textos, con una clave nueva en
`DATA_KEY`, quien despliega los vacía a mano antes de arrancar (sobre una copia
primero):

```sql
UPDATE event_messages SET body = NULL WHERE body LIKE 'v1:%';
UPDATE notices SET text = NULL WHERE text LIKE 'v1:%';
-- y lo mismo con cada columna del inventario
```

Por eso la clave se guarda en dos sitios aparte.

### Si se vuelve atrás un despliegue

El código de antes del cifrado no sabe abrir `v1:…`: si `deploy.sh` vuelve a la
imagen anterior tras haber arrancado la nueva, los textos cifrados saldrían
como `v1:…` hasta volver a desplegar la nueva (no se pierde nada). No hay
migración que lo fuerce a restaurar la copia: si hiciera falta, se restaura a
mano la copia de antes del despliegue (`restore.sh`).

## Copias

| Dónde | Cómo va | Por qué |
| --- | --- | --- |
| Servidor, `infra/backups/*.db.gz` | Sin cifrar entera; lo privado, cifrado por campos | Es la que `deploy.sh` restaura sola si un despliegue falla, sin nadie delante. Cifrarla entera pediría la clave privada en el servidor, que es justo lo que no se quiere. Está en la misma máquina que la base y que `DATA_KEY` |
| Servidor, `infra/backups/*.db.gz.gpg` | Cifrada entera con la clave pública de `infra/copias.asc` | Es la que sale de la máquina: la apunta `infra/backups/ultima-cifrada` |
| Ordenador de Alberto (`pull-backups.sh`) | Cifrada entera (`.db.gz.gpg`) | Un portátil perdido con 30 copias era el punto más flojo. Si el servidor aún no cifra, se cifran al llegar; las de antes, también |
| Bucket remoto (`BACKUP_REMOTE`, sin configurar) | Cifrada con frase (gpg simétrico), como antes | Sin cambios |

**Con gpg y no con age**: age no está instalado ni en el servidor ni en el
portátil, y gpg sí (ya lo usaba `backup.sh` para el bucket). Con
`--recipient-file` no hace falta importar la clave en ningún llavero, y el
formato es estándar y verificado (el mensaje lleva su propia comprobación).
openssl no tiene un formato estándar para cifrar un fichero con clave pública:
habría que montarlo a mano.

### Abrir una copia del portátil

```sh
gpg -o sanatorio-20261115-040000.db.gz -d ~/sanatorio-copias/sanatorio-20261115-040000.db.gz.gpg
# pide la frase de la clave privada; después, como siempre:
scp sanatorio-20261115-040000.db.gz ubuntu@<servidor>:/opt/sanatorio/infra/backups/
infra/scripts/restore.sh infra/backups/sanatorio-20261115-040000.db.gz     # en el servidor
```

La copia lleva los campos cifrados: la app que la restaure necesita la misma
`DATA_KEY` (o tenerla en `DATA_KEY_PREVIOUS`).

## Poner en marcha (una vez)

En este orden; nada de esto lo hace el código solo.

1. **Clave de datos** (en el servidor, por SSH):
   `openssl rand -base64 32` y añádela a `/opt/sanatorio/infra/.env` como
   `DATA_KEY=…` (el fichero sigue en modo 600). Guárdala también en el gestor
   de contraseñas y en un sitio aparte. **Antes de desplegar**: la imagen
   nueva no arranca sin ella, y las migraciones del despliegue tampoco.
2. **Clave de las copias** (en el ordenador de Alberto):
   ```sh
   gpg --quick-generate-key "Peer4U copias" default default never   # pide una frase
   gpg --armor --export "Peer4U copias" > infra/copias.asc          # la pública, al repo
   gpg --armor --export-secret-keys "Peer4U copias" > /media/<usb>/peer4u-copias-privada.asc
   ```
   La privada (con su frase) en un sitio aparte, nunca en el servidor ni en el
   repo. Sube `infra/copias.asc` en un commit.
3. **Desplegar** como siempre (skill `desplegar`). Al arrancar, la app cifra
   lo que había; en el registro sale una línea `cifrado al arrancar` con
   cuántos valores por columna.
4. **Comprobar** (en el servidor, solo leyendo):
   ```sh
   cd /opt/sanatorio/infra
   scripts/backup.sh         # dice también «Copia cifrada para sacar de aquí»
   docker compose exec -T app node -e "
     import('@libsql/client').then(async ({ createClient }) => {
       const db = createClient({ url: process.env.DATABASE_URL })
       for (const [t, c] of [['event_messages', 'body'], ['notices', 'text'], ['tickets', 'body']]) {
         const r = await db.execute('SELECT COUNT(*) AS n FROM ' + t + ' WHERE ' + c +
           \" IS NOT NULL AND \" + c + \" NOT LIKE 'v1:%'\")
         console.log(t + '.' + c, 'en claro:', r.rows[0].n)   // 0 en todas
       }
     })"
   ```
   Y en la web: un chat, el buzón de avisos, lo que has mandado al buzón de
   incidencias y «Descargar mis datos» enseñan el texto normal.
5. **En el ordenador**: `infra/scripts/pull-backups.sh`. Trae la cifrada y
   cifra las que ya tenía sin cifrar; `ls ~/sanatorio-copias` solo enseña
   `.db.gz.gpg`. Prueba a abrir una (arriba) para estar seguro de la frase.
