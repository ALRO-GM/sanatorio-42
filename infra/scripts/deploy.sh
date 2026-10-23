#!/bin/sh
# Pone en marcha la última versión en la máquina.
#
#   infra/scripts/deploy.sh
#
# Con APP_IMAGE en infra/.env baja la imagen publicada; sin ella, actualiza el
# código y construye la imagen aquí mismo.
#
# La secuencia, con una barrera en cada paso (`set -e`: lo que falla, para):
#
#   1. Cerrojo: dos despliegues a la vez no pueden correr.
#   2. `git pull` y espera a que la CI de ese commit esté en verde. La CI lo
#      dice con una etiqueta de git (`ci-ok/<sha>` o `ci-ko/<sha>`), que se
#      mira con `git ls-remote` por el mismo SSH que el `pull`: sin la API de
#      GitHub y sin su cupo de 60 consultas por hora.
#      Solo para una emergencia con GitHub caído: SIN_CI=1 infra/scripts/deploy.sh
#   3. Copia de seguridad comprobada (`backup.sh`); sin copia buena no se sigue.
#   4. La imagen que está funcionando se guarda como `sanatorio-42:previous`
#      y se construye (o baja) la nueva, con el commit dentro (GIT_SHA).
#   5. Las migraciones corren aparte, con la imagen nueva, ANTES de tocar el
#      contenedor: si fallan, el viejo sigue sirviendo con el esquema viejo
#      (cada migración es atómica) y se avisa.
#   6. `up -d` y hasta 180 s a que `/health/db` responda con el commit que se
#      acaba de subir y el esquema que el código espera.
#   7. Si no responde: vuelta a la imagen anterior y, si hubo migraciones, a la
#      copia del paso 3 (el código viejo no arranca con un esquema más nuevo).
#      Se avisa a Slack (notify-slack.sh) en cada fallo y al terminar.
set -eu

cd "$(dirname "$0")/.."

REPO=ALRO-GM/sanatorio-42
IMAGE=sanatorio-42:local
PREVIOUS=sanatorio-42:previous
LOCK=/tmp/sanatorio-deploy.lock
# Cuánto se espera a la CI como mucho (segundos), y cada cuánto se mira.
CI_WAIT_S=${CI_WAIT_S:-1200}
CI_EVERY_S=30
# Cuánto se espera a que la app nueva responda. Una migración pesada sobre las
# correcciones (~86 000 filas) puede tardar más de un minuto en esta máquina.
HEALTH_WAIT_S=180
# Una copia de hace menos de esto se da por válida como copia previa al
# despliegue (quien lance `backup.sh && deploy.sh` no hace dos).
BACKUP_FRESH_S=600

started=$(date +%s)

notify() {
  scripts/notify-slack.sh "$1" || true
}

fail() {
  echo "$1" >&2
  notify "Despliegue fallido: $1"
  exit 1
}

# --- 1. Cerrojo ---------------------------------------------------------------
exec 9> "$LOCK"
if ! flock -n 9; then
  echo "Ya hay un despliegue en marcha (cerrojo $LOCK): no se lanza otro." >&2
  exit 1
fi

# --- 2. La CI del commit ------------------------------------------------------
# Espera a que la CI haya puesto su etiqueta al commit. Sale con error si la CI
# falló (`ci-ko`), si `main` ya tiene otro commit (su CI se canceló) o si pasa
# el tope de espera.
wait_for_ci() {
  sha=$1
  end=$((started + CI_WAIT_S))
  echo "Esperando a la CI de $sha (etiqueta ci-ok/$sha, hasta ${CI_WAIT_S} s)..."
  while :; do
    # Una sola conexión por vuelta: las dos etiquetas y la punta de main.
    refs=$(git -C .. ls-remote origin "refs/tags/ci-ok/$sha" "refs/tags/ci-ko/$sha" refs/heads/main 2> /dev/null) || refs=''
    case "$refs" in
      *"refs/tags/ci-ok/$sha"*)
        echo "CI de $sha en verde."
        return 0
        ;;
      *"refs/tags/ci-ko/$sha"*)
        echo "La CI de $sha ha fallado: no se despliega. Mira https://github.com/$REPO/actions" >&2
        return 1
        ;;
    esac
    remote_head=$(printf '%s\n' "$refs" | awk '$2 == "refs/heads/main" { print $1 }')
    if [ -n "$remote_head" ] && [ "$remote_head" != "$sha" ]; then
      echo "main ya tiene un commit más nuevo ($remote_head): la CI de $sha se canceló. Vuelve a desplegar para coger el último." >&2
      return 1
    fi
    if [ "$(date +%s)" -ge "$end" ]; then
      echo "La CI de $sha no ha terminado en ${CI_WAIT_S} s: no se despliega." >&2
      return 1
    fi
    echo "Esperando a la CI de $sha..."
    sleep "$CI_EVERY_S"
  done
}

# --- 3. Copia de seguridad ------------------------------------------------------
# Ruta de la última copia buena si es reciente; vacío si no la hay.
fresh_backup() {
  candidate=$(cat backups/ultima 2> /dev/null || true)
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    age=$(($(date +%s) - $(stat -c %Y "$candidate")))
    if [ "$age" -le "$BACKUP_FRESH_S" ]; then
      printf '%s\n' "$candidate"
    fi
  fi
}

ensure_backup() {
  copy=$(fresh_backup)
  if [ -z "$copy" ]; then
    scripts/backup.sh
    copy=$(fresh_backup)
  fi
  # Con la guardia al 95 % backup.sh sale bien sin copiar nada: tampoco hay
  # contenedores a los que desplegar.
  [ -n "$copy" ] || fail "no hay copia de seguridad reciente y buena: no se despliega sin ella."
  echo "Copia previa al despliegue: $copy"
}

# --- 6. Salud -------------------------------------------------------------------
# Espera a que la app conteste a /health/db con la base al día y, si se le pasa
# un commit, con ese commit dentro. Es el smoke real: un contenedor que arranca
# con el código viejo, o con el esquema a medias, no cuenta.
last_health=''
healthy() {
  want=${1:-}
  end=$(($(date +%s) + HEALTH_WAIT_S))
  while [ "$(date +%s)" -lt "$end" ]; do
    if last_health=$(docker compose exec -T app node -e "
      const want = process.argv[1]
      fetch('http://127.0.0.1:3000/health/db').then(async (r) => {
        const h = await r.json()
        process.stdout.write(JSON.stringify(h))
        const upToDate = h.schema && h.schema.actual === h.schema.expected
        const sameCommit = want === '' || h.version === want
        const web = await fetch('http://127.0.0.1:3000/').then((w) => w.ok, () => false)
        process.exit(r.ok && upToDate && sameCommit && web ? 0 : 1)
      }, () => process.exit(1))" -- "$want" 2> /dev/null); then
      echo "Salud: $last_health"
      return 0
    fi
    sleep 3
  done
  return 1
}

# --- Secuencia --------------------------------------------------------------------
if grep -Eq '^APP_IMAGE=.+' .env; then
  # La imagen viene de la CI, que ya la probó; no se sabe qué commit lleva.
  sha=''
  ensure_backup
  docker image tag "$IMAGE" "$PREVIOUS" 2> /dev/null || true
  docker compose pull app
else
  git -C .. pull --ff-only
  sha=$(git -C .. rev-parse HEAD)
  if [ "${SIN_CI:-0}" != 1 ]; then
    wait_for_ci "$sha" || fail "la CI de $sha no está en verde."
  else
    echo "SIN_CI=1: se despliega sin mirar la CI." >&2
  fi
  ensure_backup
  # La versión que está funcionando, por si la nueva no arranca.
  docker image tag "$IMAGE" "$PREVIOUS" 2> /dev/null || true
  # El commit va dentro de la imagen: /health/db lo devuelve y aquí se comprueba.
  GIT_SHA=$sha docker compose build app
fi

# --- 5. Migraciones, aparte y antes --------------------------------------------------
# Con la imagen nueva y la base de siempre. Si falla, el contenedor que corre no
# se ha tocado y sigue sirviendo con el esquema de antes.
echo "Aplicando las migraciones pendientes..."
if ! migrated=$(docker compose run --rm --no-deps -T app node dist/cli/migrate.js 2>&1); then
  echo "$migrated" >&2
  fail "las migraciones no se pudieron aplicar; la versión anterior sigue en marcha. $(printf '%s' "$migrated" | tail -n 1)"
fi
echo "$migrated"
case "$migrated" in
  *"Migraciones aplicadas"*) schema_changed=1 ;;
  *) schema_changed=0 ;;
esac

# --- 6. Arranque y smoke -----------------------------------------------------------------
docker compose up -d
docker image prune -f > /dev/null

if healthy "$sha"; then
  took=$(($(date +%s) - started))
  echo "Desplegado y respondiendo (${sha:-imagen publicada}, ${took} s)."
  notify "Desplegado ${sha:-la imagen publicada} en ${took} s."
  exit 0
fi

# --- 7. Vuelta atrás ------------------------------------------------------------------------
echo "La versión nueva no responde en ${HEALTH_WAIT_S} s. Última salud: ${last_health:-sin respuesta}" >&2
echo "Registro de la app:" >&2
docker compose logs --no-color --tail 30 app >&2 || true

if ! docker image inspect "$PREVIOUS" > /dev/null 2>&1; then
  fail "la versión nueva no responde y no hay imagen anterior a la que volver. Mira: docker compose logs app"
fi

echo "Vuelvo a la versión anterior." >&2
docker image tag "$PREVIOUS" "$IMAGE"
restored="la imagen anterior"
if [ "$schema_changed" = 1 ]; then
  # El código anterior no arranca con un esquema más nuevo: se restaura la
  # copia de antes del despliegue. Lo escrito entre la copia y ahora se pierde,
  # pero la web vuelve; la copia queda en infra/backups por si hace falta.
  echo "Hubo migraciones: restauro la copia previa $copy." >&2
  scripts/restore.sh --yes "$copy"
  restored="la imagen anterior y la copia $copy"
else
  docker compose up -d
fi

if healthy; then
  notify "La versión nueva (${sha:-imagen publicada}) no respondía: restaurada $restored. Mira infra/deploy.log."
  echo "Restaurada la versión anterior. Mira por qué falló: docker compose logs app" >&2
  exit 1
fi

fail "ni la versión nueva ni la anterior responden. Mira: docker compose logs app"
