#!/bin/sh
# Copia de seguridad de la base, en caliente.
#
# `VACUUM INTO` saca una copia consistente aunque el servidor esté escribiendo,
# cosa que un `cp` del fichero no garantiza. Lo que de verdad importa de la
# copia es lo que es nuestro (guardias, XP, grupos, dudas, pizarras): la réplica
# de 42 se puede volver a bajar.
#
#   infra/scripts/backup.sh              deja la copia en infra/backups/
#
# Si existe BACKUP_REMOTE (un destino de rclone, p. ej. un bucket de Oracle
# Object Storage: `oci:sanatorio-backups`), la copia se sube también allí. Una
# copia que vive en la misma máquina que la base no protege de perder la máquina.
set -eu

cd "$(dirname "$0")/.."

# Con un corte por los límites del plan no sale nada de la máquina: al 95 % no
# hay ni contenedores a los que pedir la copia, y al 90 % la copia se hace pero
# no se sube. Lo dice la guardia (infra/scripts/limits-guard.sh).
guard_level=$(cat /var/lib/sanatorio-guard/level 2> /dev/null || echo 0)
if [ "$guard_level" -ge 95 ]; then
  echo "Servicio parado por los límites del plan: no se hace copia."
  exit 0
fi

stamp=$(date +%Y%m%d-%H%M%S)
file="backups/sanatorio-$stamp.db"
mkdir -p backups

# Antes de pedirle nada a la base: si aquí no se puede escribir, la copia se
# quedaría hecha dentro del contenedor y sin salir. Pasó: la carpeta era de root
# y el cron corre como otro usuario, y ninguna copia llegó a guardarse.
if ! [ -w backups ]; then
  echo "No se puede escribir en infra/backups ($(id -un)). Arréglalo con:" >&2
  echo "  sudo chown $(id -un) $(pwd)/backups" >&2
  exit 1
fi

# La copia se hace primero dentro del contenedor. Pase lo que pase después, ese
# temporal se borra al salir: si se quedara, la siguiente copia fallaría con
# «output file already exists». Y se borra también antes de empezar, por si
# quedó de una vez anterior.
cleanup() {
  docker compose exec -T app rm -f /data/backup.db > /dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

docker compose exec -T app node -e "
  import('@libsql/client').then(async ({ createClient }) => {
    const db = createClient({ url: process.env.DATABASE_URL })
    await db.execute(\"VACUUM INTO '/data/backup.db'\")
    db.close()
  })
"
docker compose cp app:/data/backup.db "$file"
gzip "$file"

# Se guardan las 14 últimas.
ls -1t backups/sanatorio-*.db.gz | tail -n +15 | xargs -r rm --
echo "Copia guardada en infra/$file.gz"

if [ -n "${BACKUP_REMOTE:-}" ] && [ "$guard_level" -ge 90 ]; then
  echo "Corte por los límites del plan: la copia no se sube a $BACKUP_REMOTE."
elif [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$file.gz" "$BACKUP_REMOTE"
  echo "Copia subida a $BACKUP_REMOTE"
fi
