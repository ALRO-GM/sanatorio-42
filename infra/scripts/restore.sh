#!/bin/sh
# Restaura una copia hecha con backup.sh. Para la app, sustituye la base y la
# vuelve a arrancar.
#
#   infra/scripts/restore.sh infra/backups/sanatorio-20261010-040000.db.gz
set -eu

[ $# -eq 1 ] || { echo "Uso: $0 <copia.db.gz>" >&2; exit 1; }
backup=$(realpath "$1")
[ -f "$backup" ] || { echo "No existe $backup" >&2; exit 1; }

cd "$(dirname "$0")/.."

printf 'Se va a sustituir la base actual por %s. ¿Seguir? [s/N] ' "$backup"
read -r answer
[ "$answer" = "s" ] || exit 1

tmp=$(mktemp)
gunzip -c "$backup" > "$tmp"

docker compose stop app
# Los ficheros -wal y -shm son de la base antigua: si se quedan, SQLite los
# aplicaría encima de la restaurada.
docker compose run --rm --no-deps -T --user root --entrypoint sh app \
  -c 'rm -f /data/sanatorio.db /data/sanatorio.db-wal /data/sanatorio.db-shm'
docker compose cp "$tmp" app:/data/sanatorio.db
docker compose run --rm --no-deps -T --user root --entrypoint sh app \
  -c 'chown node:node /data/sanatorio.db'
docker compose start app
rm -f "$tmp"

echo "Base restaurada."
