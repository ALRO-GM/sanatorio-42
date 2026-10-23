# Despliegue en Oracle Cloud Always Free

La app necesita un proceso que viva entre peticiones (el bucle que copia 42) y
un disco (la base SQLite). Una máquina gratuita de Oracle da las dos cosas.

> Esta guía no se ha ejecutado contra una cuenta real de Oracle. Lo comprobado
> en local es la imagen de Docker (construye, arranca sin root y sirve la API y
> la web). Los pasos de la consola y `cloud-init.yaml` hay que validarlos en el
> primer despliegue.

## Antes de empezar

- **Tarjeta.** Oracle la pide para el alta, aunque no cobra.
- **Máquinas ociosas.** Oracle puede reclamar instancias Always Free con muy
  poco uso de CPU, red y memoria durante 7 días, y esta app gasta muy poco.
  Pasar la cuenta a *Pay As You Go* evita esa política y sigue sin costar nada
  mientras no se salga de los límites gratuitos. Confirma la condición vigente
  en la documentación de Oracle antes de decidir.
- **Dominio.** Hace falta uno para el HTTPS. Vale un subdominio gratuito
  (DuckDNS o similar).

## 1. Crear la máquina

En la consola: *Compute → Instances → Create instance*.

- **Imagen**: Ubuntu 24.04.
- **Forma**: `VM.Standard.A1.Flex` (ARM) con 1 OCPU y 6 GB. Si no hay
  capacidad en la región, `VM.Standard.E2.1.Micro` (x86, 1 GB) también sirve,
  mejor con la imagen publicada desde GitHub (paso 5) que construyendo en ella.
- **Red**: IP pública asignada.
- **Clave SSH**: sube la tuya.
- **Advanced options → Management → Cloud-init script**: pega
  `infra/oracle/cloud-init.yaml`. Instala Docker, abre los puertos 80 y 443 en
  el cortafuegos de la máquina, añade swap y programa la copia nocturna.

## 2. Abrir los puertos en la red

*Networking → Virtual cloud networks → tu VCN → Security Lists → Default*.
Añade reglas de entrada desde `0.0.0.0/0` para TCP 80, TCP 443 y UDP 443.

Hacen falta los dos sitios: esta lista y el cortafuegos de la máquina, que ya
abre el cloud-init.

## 3. DNS y app de 42

- Apunta el dominio (registro A) a la IP pública de la máquina.
- En la app de 42 (`profile.intra.42.fr/oauth/applications`), añade la URL de
  retorno `https://<tu-dominio>/api/auth/callback`.

## 4. Arrancar

```sh
ssh ubuntu@<ip>
git clone <url-del-repositorio> /opt/sanatorio
cd /opt/sanatorio/infra
cp .env.example .env && chmod 600 .env
nano .env                      # dominio, credenciales de 42 y SESSION_SECRET
docker compose up -d --build
```

Caddy pide el certificado en el primer arranque. Para comprobar:

```sh
docker compose ps
curl https://<tu-dominio>/api/health/db
docker compose exec app node dist/cli/sync-status.js
```

La copia inicial del campus tarda unas dos horas; la web funciona desde el
primer minuto.

## 5. Actualizar

En la máquina:

```sh
/opt/sanatorio/infra/scripts/deploy.sh
```

La secuencia, con una barrera en cada paso (`set -e`: lo que falla, para):

1. **Cerrojo** (`flock` sobre `/tmp/sanatorio-deploy.lock`): dos despliegues a
   la vez no pueden correr; el segundo sale diciendo que ya hay uno.
2. **`git pull` y espera a la CI** de ese commit. La CI de GitHub, al acabar en
   `main`, publica una etiqueta en el propio repositorio: `ci-ok/<sha>` si todo
   pasó, `ci-ko/<sha>` si algo falló. `deploy.sh` la mira cada 30 s con
   `git ls-remote` por el mismo SSH que el `pull`: **sin la API de GitHub y sin
   su cupo** de 60 consultas por hora. Hasta 20 minutos (`CI_WAIT_S`). Si
   aparece `ci-ko`, o `main` ya apunta a otro commit (la CI se canceló), para y
   lo dice. Solo con GitHub caído: `SIN_CI=1 infra/scripts/deploy.sh`.
3. **Copia de seguridad comprobada**: `backup.sh` (`PRAGMA integrity_check`
   sobre la copia y `gzip -t`), que deja la ruta de la última buena en
   `infra/backups/ultima`. Si ya hay una de hace menos de 10 minutos, vale esa.
   Sin copia buena no se sigue.
4. La imagen que funciona se etiqueta `sanatorio-42:previous` y se construye la
   nueva con el commit dentro (`GIT_SHA`, que `/health/db` devuelve).
5. **Migraciones aparte, antes de tocar el contenedor**:
   `docker compose run --rm app node dist/cli/migrate.js` con la imagen nueva.
   Si fallan, el contenedor viejo sigue sirviendo con el esquema viejo (cada
   migración es atómica), se avisa a Slack y se sale con error.
6. `docker compose up -d` y hasta **180 s** a que `GET /health/db` responda con
   `version` igual al commit subido, `schema.actual === schema.expected` y la
   web (`/`) en 200.
7. Si no responde: vuelta a `sanatorio-42:previous` y, si el paso 5 aplicó
   alguna migración, `restore.sh --yes <copia del paso 3>` (el código anterior
   no arranca con un esquema más nuevo; lo escrito entre la copia y la vuelta
   atrás se pierde). Aviso a Slack con el motivo.

Los avisos salen por `infra/scripts/notify-slack.sh`, que usa el
`SLACK_WEBHOOK_URL` de `infra/.env`; sin webhook no avisa y no pasa nada. Todo
queda en `infra/deploy.log` cuando se lanza con `nohup` (ver `docs/contexto.md`).

Para leer el registro de la app (errores `500` con su `x-request-id`):
`docker logs --since 1h sanatorio-app-1 | grep '"level":50'`. El nivel se
regula con `LOG_LEVEL` en `infra/.env` (`warn` por defecto; `LOG_REQUESTS=true`
registra además cada petición).

**Desde GitHub** (opcional): el workflow `Deploy` construye la imagen para x86
y ARM, la publica en GHCR y lanza ese mismo script por SSH. Necesita:

- Secretos del repositorio: `DEPLOY_HOST`, `DEPLOY_USER` (`ubuntu`) y
  `DEPLOY_SSH_KEY`.
- En `infra/.env` de la máquina: `APP_IMAGE=ghcr.io/<usuario>/<repositorio>:latest`.
- Si el paquete es privado, un `docker login ghcr.io` en la máquina.

## Pay As You Go: no pasar nunca de lo gratuito

Con la cuenta en "Pay As You Go" suele haber capacidad para crear la máquina,
pero lo que pase de la capa gratuita se cobra. Las reglas son fijas y no se
regulan desde ningún panel. Hay dos cortes, y los dos se levantan solos cuando
el límite se renueva:

| Al llegar al | Quién entra | Qué sigue corriendo |
| --- | --- | --- |
| **90 %** | Solo quien administra la web | La web y Caddy, para atenderle. Nada más: ni copia de 42, ni trabajos de fondo, ni actualizaciones automáticas, ni snaps, ni el agente de Oracle, ni la subida de copias |
| **95 %** | Nadie. Solo SSH | Nada: contenedores parados, y también la sincronización de la hora |

Los límites de la capa gratuita y lo que gasta Sanatorio:

| Límite gratuito | 90 % | Qué gasta Sanatorio | Cómo se respeta |
| --- | --- | --- | --- |
| Tráfico de salida: 10 TB al mes | 9 TB | Lo que sirve la web | Los dos cortes de arriba |
| Cómputo ARM: 3 000 h de OCPU al mes | 3 OCPU todo el mes | 1 OCPU (25 %) | `create-instance.sh` se niega a pedir más |
| Memoria ARM: 18 000 h de GB al mes | 21 GB todo el mes | 6 GB (25 %) | Lo mismo |
| Disco: 200 GB entre todos los volúmenes | 180 GB | El de arranque, unos 47 GB | La guardia avisa en su registro |

El tráfico es el único que depende de cuánta gente use la web, y tiene dos
barreras que no dependen una de otra. Entre las dos manda la más estricta.

1. **La web** cuenta todo lo que sirve (con y sin sesión, más un margen por
   respuesta para cabeceras y TLS). Reparte lo que queda hasta el 90 % entre los
   días que faltan del mes, de modo que gastando cada día todo lo permitido no
   se llega. Si aun así se llega, responde `503` a todo el que no administre
   (menos `/health` y las rutas de sesión), deja de hablar con 42 y no lanza
   ningún trabajo de fondo; al 95 %, `503` también a quien administra. Reglas en
   `apps/api/src/modules/admin/budget.rules.ts`.
2. **La máquina** (`infra/scripts/limits-guard.sh`, cada cinco minutos por cron)
   cuenta lo que sale de verdad por la tarjeta de red, también lo que la web no
   ve (Caddy, SSH, actualizaciones). Al 90 % se lo dice a la web
   (`/data/guard-level`) y para y bloquea todo lo que corre solo en la máquina;
   al 95 % para los contenedores. El día 1 lo deshace todo.

Con el corte del 90 %, quien administra y no tenga la sesión abierta no verá la
web: tiene que entrar directamente por `https://<dominio>/api/auth/login`.

```sh
sudo infra/scripts/limits-guard.sh status     # cómo va el mes y si hay corte
tail /var/log/sanatorio-limits.log            # qué ha hecho la guardia
cat /var/lib/sanatorio-guard/quieted          # qué ha parado y volverá a arrancar
```

El cloud-init instala el cron. En una máquina creada antes de que existiera:

```sh
echo '*/5 * * * * root /opt/sanatorio/infra/scripts/limits-guard.sh >> /var/log/sanatorio-limits.log 2>&1' \
  | sudo tee /etc/cron.d/sanatorio-limits
```

**Lo que sigue saliendo con todo cortado**, porque sin ello no se podría entrar
a arreglarlo: el SSH, la renovación de la dirección de red (DHCP) y, entre el
90 y el 95 %, lo que pida quien administra y la renovación del certificado de
Caddy. Son kilobytes; para eso está el 5 % de margen.

Para levantar un corte antes de tiempo (solo si la cuenta estaba mal), por SSH:
la web, subiendo `monthlyBytes` en la fila `budget` de la tabla `settings`; la
guardia, poniendo a cero el segundo número de `/var/lib/sanatorio-guard/egress`
y lanzándola a mano, que lo deshace todo ella.

**Lo que no cubre nada de esto**: lo que se cree a mano en la consola de Oracle
(otra máquina, un balanceador, más disco, una base de datos). Conviene poner
además un **presupuesto con alerta** en la consola (Billing → Budgets): 1 € al
mes con aviso por correo al primer céntimo. Oracle no para nada por su cuenta,
pero así te enteras el mismo día. No crear recursos que no sean "Always Free
eligible".

## Copias de seguridad

```sh
infra/scripts/backup.sh                       # a infra/backups/, comprobada, guarda las 14 últimas
infra/scripts/restore.sh infra/backups/<copia>.db.gz
infra/scripts/restore.sh --yes <copia>        # sin preguntar (lo usa deploy.sh al volver atrás)
```

Cada copia pasa `PRAGMA integrity_check` y `gzip -t` antes de darse por buena;
la ruta de la última buena queda en `infra/backups/ultima`.

El cloud-init programa una cada noche a las 04:00. Esas copias están en la
misma máquina que la base: para sacarlas fuera, configura `rclone` con un bucket
(Oracle Object Storage tiene capa gratuita) y define `BACKUP_REMOTE` en el cron,
junto con `BACKUP_PASSPHRASE_FILE`: un fichero solo legible por el usuario del
cron con la frase (`openssl rand -base64 48 > ~/.sanatorio-backup-frase && chmod
600 …`). Lo que sube va cifrado con ella (AES-256, gpg) y sin ella no sube nada.
Guarda la frase también fuera de la máquina: sin ella las copias de fuera no se
pueden abrir.

Lo que importa de la copia es lo propio (guardias, XP, grupos, dudas,
pizarras). La réplica de 42 se puede volver a bajar.

## Mantenimiento

| Para                          | Comando (desde `infra/`)                              |
| ----------------------------- | ----------------------------------------------------- |
| Ver logs                      | `docker compose logs -f app`                          |
| Estado de la réplica          | `docker compose exec app node dist/cli/sync-status.js` |
| Reiniciar                     | `docker compose restart app`                          |
| Cambiar una variable          | editar `.env` y `docker compose up -d`                |

Si se cambia `SESSION_SECRET`, todas las sesiones abiertas dejan de valer.

## Otra máquina

Nada de esto es específico de Oracle salvo los pasos 1 y 2. En cualquier
servidor con Docker valen los pasos 3 a 5 tal cual.
