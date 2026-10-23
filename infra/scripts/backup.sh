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
# La copia se comprueba antes de darla por buena (`PRAGMA integrity_check` sobre
# la copia y `gzip -t` sobre el comprimido), y la ruta de la última buena queda
# en infra/backups/ultima: es la que `deploy.sh` restaura si hay que volver
# atrás.
#
# Si existe BACKUP_REMOTE (un destino de rclone, p. ej. un bucket de Oracle
# Object Storage: `oci:sanatorio-backups`), la copia se sube también allí. Una
# copia que vive en la misma máquina que la base no protege de perder la máquina.
# Lo que sale de la máquina sale cifrado (AES-256 con gpg) con la frase de
# BACKUP_PASSPHRASE_FILE; sin ella no se sube nada. Para restaurar una de fuera:
#   gpg --batch --pinentry-mode loopback --passphrase-file <frase> \
#     -o sanatorio-….db.gz -d sanatorio-….db.gz.gpg
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
# quedó de una vez anterior. Con sus -wal y -shm, que la comprobación puede
# dejar.
cleanup() {
  docker compose exec -T app sh -c 'rm -f /data/backup.db /data/backup.db-wal /data/backup.db-shm' > /dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

# Después del VACUUM, la propia copia pasa por `integrity_check`: una copia
# corrupta que se descubre al restaurar no sirve de nada.
docker compose exec -T app node -e "
  import('@libsql/client').then(async ({ createClient }) => {
    const db = createClient({ url: process.env.DATABASE_URL })
    await db.execute(\"VACUUM INTO '/data/backup.db'\")
    db.close()

    const copy = createClient({ url: 'file:/data/backup.db' })
    const check = await copy.execute('PRAGMA integrity_check')
    copy.close()
    const verdict = check.rows.map((row) => String(row.integrity_check)).join('; ')
    if (verdict !== 'ok') {
      process.stderr.write('La copia no pasa integrity_check: ' + verdict + '\n')
      process.exit(1)
    }
  })
"
docker compose cp app:/data/backup.db "$file"
gzip "$file"
gzip -t "$file.gz"

# La última copia buena, para quien tenga que restaurar sin preguntar.
printf '%s\n' "$file.gz" > backups/ultima

# Se guardan las 14 últimas. Los nombres los pone este script (fecha y hora, sin
# espacios ni rarezas), así que `ls` por fecha vale.
# shellcheck disable=SC2012
ls -1t backups/sanatorio-*.db.gz | tail -n +15 | xargs -r rm --
echo "Copia guardada y comprobada en infra/$file.gz"

if [ -n "${BACKUP_REMOTE:-}" ] && [ "$guard_level" -ge 90 ]; then
  echo "Corte por los límites del plan: la copia no se sube a $BACKUP_REMOTE."
elif [ -n "${BACKUP_REMOTE:-}" ] && ! [ -r "${BACKUP_PASSPHRASE_FILE:-}" ]; then
  # La base lleva datos personales: sin cifrar no sale de aquí.
  # Se avisa sin fallar: la copia local está hecha y un despliegue no debe
  # pararse por esto.
  echo "Sin BACKUP_PASSPHRASE_FILE legible: la copia no se sube a $BACKUP_REMOTE." >&2
elif [ -n "${BACKUP_REMOTE:-}" ]; then
  gpg --batch --yes --pinentry-mode loopback --passphrase-file "$BACKUP_PASSPHRASE_FILE" \
    --symmetric --cipher-algo AES256 -o "$file.gz.gpg" "$file.gz"
  # El cifrado sube, y aquí se queda solo el de siempre.
  rclone copy "$file.gz.gpg" "$BACKUP_REMOTE"
  rm -f "$file.gz.gpg"
  echo "Copia cifrada y subida a $BACKUP_REMOTE"
fi
