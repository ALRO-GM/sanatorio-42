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

Actualiza el código, reconstruye, y espera a que la app responda.

**Desde GitHub** (opcional): el workflow `Deploy` construye la imagen para x86
y ARM, la publica en GHCR y lanza ese mismo script por SSH. Necesita:

- Secretos del repositorio: `DEPLOY_HOST`, `DEPLOY_USER` (`ubuntu`) y
  `DEPLOY_SSH_KEY`.
- En `infra/.env` de la máquina: `APP_IMAGE=ghcr.io/<usuario>/<repositorio>:latest`.
- Si el paquete es privado, un `docker login ghcr.io` en la máquina.

## Copias de seguridad

```sh
infra/scripts/backup.sh                       # a infra/backups/, guarda las 14 últimas
infra/scripts/restore.sh infra/backups/<copia>.db.gz
```

El cloud-init programa una cada noche a las 04:00. Esas copias están en la
misma máquina que la base: para sacarlas fuera, configura `rclone` con un bucket
(Oracle Object Storage tiene capa gratuita) y define `BACKUP_REMOTE` en el cron.

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
