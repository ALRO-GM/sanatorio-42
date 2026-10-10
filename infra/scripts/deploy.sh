#!/bin/sh
# Pone en marcha la última versión en la máquina.
#
#   infra/scripts/deploy.sh
#
# Con APP_IMAGE en infra/.env baja la imagen publicada; sin ella, actualiza el
# código y construye la imagen aquí mismo.
set -eu

cd "$(dirname "$0")/.."

if grep -Eq '^APP_IMAGE=.+' .env; then
  docker compose pull app
  docker compose up -d
else
  git -C .. pull --ff-only
  docker compose up -d --build
fi

docker image prune -f >/dev/null

# Espera a que la app conteste antes de dar el despliegue por bueno.
for _ in $(seq 1 30); do
  if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/health/db').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))" 2>/dev/null; then
    echo "Desplegado y respondiendo."
    exit 0
  fi
  sleep 2
done

echo "La app no responde. Mira: docker compose logs app" >&2
exit 1
