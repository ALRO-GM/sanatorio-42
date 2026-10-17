#!/bin/sh
# Pone en marcha la última versión en la máquina.
#
#   infra/scripts/deploy.sh
#
# Con APP_IMAGE en infra/.env baja la imagen publicada; sin ella, actualiza el
# código y construye la imagen aquí mismo.
#
# Dos protecciones, para que a producción solo llegue lo probado:
#
# - No construye un commit cuya CI (tipos, lint, código sin uso, duplicados,
#   tests y build) no haya pasado en GitHub. Si aún está corriendo, espera.
#   Solo para una emergencia con GitHub caído: SIN_CI=1 infra/scripts/deploy.sh
# - Si la versión nueva no contesta, vuelve sola a la anterior.
set -eu

cd "$(dirname "$0")/.."

REPO=ALRO-GM/sanatorio-42
IMAGE=sanatorio-42:local
# Solo se puede volver atrás con la imagen que se construye aquí.
BUILT_HERE=0

# Espera a que la CI de ese commit termine. Sale con error si falla o tarda
# más de 20 minutos. La API pública de GitHub da 60 consultas por hora: con una
# cada 30 s caben de sobra.
wait_for_ci() {
  sha=$1
  for _ in $(seq 1 40); do
    runs=$(curl -fsS "https://api.github.com/repos/$REPO/commits/$sha/check-runs") || runs=''
    total=$(printf '%s' "$runs" | jq -r '.total_count // 0' 2>/dev/null || echo 0)
    pending=$(printf '%s' "$runs" | jq -r '[.check_runs[] | select(.status != "completed")] | length' 2>/dev/null || echo 1)
    failed=$(printf '%s' "$runs" | jq -r '[.check_runs[] | select(.status == "completed" and .conclusion != "success" and .conclusion != "skipped")] | length' 2>/dev/null || echo 0)

    if [ "$failed" != 0 ]; then
      echo "La CI de $sha ha fallado: no se despliega. Mira https://github.com/$REPO/actions" >&2
      return 1
    fi
    if [ "$total" != 0 ] && [ "$pending" = 0 ]; then
      echo "CI de $sha en verde."
      return 0
    fi
    echo "Esperando a la CI de $sha..."
    sleep 30
  done
  echo "La CI de $sha no ha terminado en 20 minutos: no se despliega." >&2
  return 1
}

healthy() {
  for _ in $(seq 1 30); do
    if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/health/db').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))" 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if grep -Eq '^APP_IMAGE=.+' .env; then
  docker compose pull app
  docker compose up -d
else
  git -C .. pull --ff-only
  if [ "${SIN_CI:-0}" != 1 ]; then
    wait_for_ci "$(git -C .. rev-parse HEAD)"
  else
    echo "SIN_CI=1: se despliega sin mirar la CI." >&2
  fi
  # La versión que está funcionando, por si la nueva no arranca.
  docker image tag "$IMAGE" sanatorio-42:previous 2>/dev/null || true
  BUILT_HERE=1
  docker compose up -d --build
fi

docker image prune -f >/dev/null

# Espera a que la app conteste antes de dar el despliegue por bueno.
if healthy; then
  echo "Desplegado y respondiendo."
  exit 0
fi

if [ "$BUILT_HERE" = 1 ] && docker image inspect sanatorio-42:previous >/dev/null 2>&1; then
  echo "La versión nueva no responde: vuelvo a la anterior." >&2
  docker image tag sanatorio-42:previous "$IMAGE"
  docker compose up -d
  if healthy; then
    echo "Restaurada la versión anterior. Mira por qué falló: docker compose logs app" >&2
    exit 1
  fi
fi

echo "La app no responde. Mira: docker compose logs app" >&2
exit 1
