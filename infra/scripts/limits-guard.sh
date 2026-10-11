#!/bin/sh
# Guardia de los límites del plan gratuito de Oracle, a nivel de máquina.
#
# Con la cuenta en "Pay As You Go", pasarse de lo gratuito se cobra. La regla es
# no llegar nunca, con dos cortes que se levantan solos al renovarse el límite:
#
#   - Al 90 %: solo entra quien administra la web. Se para todo lo que corre sin
#     que nadie lo pida: actualizaciones automáticas, snaps, el agente de Oracle,
#     la subida de copias. La web deja de hablar con 42 y de lanzar sus trabajos.
#   - Al 95 %: se paran los contenedores. No entra nadie; solo queda el SSH.
#
# La web ya aplica los dos cortes con el tráfico que ella cuenta
# (`modules/admin/budget.rules.ts`). Esta guardia es la segunda barrera y no
# depende de la web: cuenta lo que sale de verdad por la tarjeta de red (también
# lo que la web no ve: Caddy, TLS, SSH, actualizaciones). Lo que decide se lo
# deja escrito a la web en un fichero, y entre las dos manda la más estricta.
#
# La lanza cron cada cinco minutos, como root (ver infra/oracle/cloud-init.yaml):
#
#   infra/scripts/limits-guard.sh           comprueba y, si toca, corta o levanta
#   infra/scripts/limits-guard.sh status    solo dice cómo va
#
# Límites del plan (Always Free) que vigila:
#
#   - Tráfico de salida: 10 TB al mes (mes natural, UTC). Cortes a 9 y 9,5 TB.
#   - Cómputo ARM (A1): 3 000 horas de OCPU y 18 000 de GB al mes. Una máquina
#     encendida todo el mes gasta 744 por OCPU y por GB: como mucho 3 OCPU y
#     21 GB para no pasar del 90 %. Se comprueba y se avisa; parar contenedores
#     no ahorra cómputo, así que por esto no se para nada.
#   - Disco: 200 GB entre todos los volúmenes. Aviso por encima de 180 GB.
#
# Lo que sigue saliendo aun con todo cortado, porque sin ello no se podría
# entrar a arreglarlo: el SSH, la renovación de la dirección de red (DHCP) y
# esta guardia, que no usa la red. Son bytes, no megas.
set -eu

LIMIT_BYTES=${EGRESS_LIMIT_BYTES:-10000000000000}
ADMIN_ONLY_PERCENT=90
STOP_PERCENT=95
MAX_OCPUS=3
MAX_MEMORY_GB=21
MAX_DISK_GB=180

STATE_DIR=${GUARD_STATE_DIR:-/var/lib/sanatorio-guard}
COMPOSE_DIR=${GUARD_COMPOSE_DIR:-/opt/sanatorio/infra}
# Para las pruebas: de dónde se lee el contador y qué se ejecuta en vez de lo real.
TX_FILE=${GUARD_TX_FILE:-}
COMPOSE=${GUARD_COMPOSE:-docker compose}
SYSTEMCTL=${GUARD_SYSTEMCTL:-systemctl}
# Donde la web lee lo que dice la guardia: dentro del volumen de datos de la app.
LEVEL_FILE=${GUARD_LEVEL_FILE:-}

# Lo que corre solo y habla con internet. Se para y se bloquea al primer corte.
QUIET_UNITS="
  apt-daily.timer apt-daily-upgrade.timer apt-daily.service apt-daily-upgrade.service
  unattended-upgrades.service packagekit.service
  snapd.socket snapd.service snapd.snap-repair.timer
  snap.oracle-cloud-agent.oracle-cloud-agent.service
  snap.oracle-cloud-agent.oracle-cloud-agent-updater.service
  motd-news.timer fwupd-refresh.timer ua-timer.timer esm-cache.service
  update-notifier-download.timer update-notifier-motd.timer
  apport-autoreport.timer apport-autoreport.service whoopsie.service
"
# Y con el corte total, también la hora: un mes sin sincronizarla no rompe nada.
STOP_UNITS="chrony.service systemd-timesyncd.service"

log() { echo "$(date -u '+%F %T') $*"; }

if [ -z "$TX_FILE" ]; then
  # La tarjeta por la que se sale a internet.
  iface=$(ip -o route get 1.1.1.1 | sed -n 's/.* dev \([^ ]*\).*/\1/p')
  TX_FILE="/sys/class/net/$iface/statistics/tx_bytes"
fi
if [ -z "$LEVEL_FILE" ]; then
  LEVEL_FILE="$(docker volume inspect sanatorio_data -f '{{ .Mountpoint }}' 2> /dev/null || echo "$STATE_DIR")/guard-level"
fi

mkdir -p "$STATE_DIR"
state="$STATE_DIR/egress"
level_state="$STATE_DIR/level"
quieted="$STATE_DIR/quieted"

# Para y bloquea unas unidades. Las que estaban en marcha se apuntan, para
# arrancar después solo esas. Se repite en cada pasada mientras dure el corte,
# por si algo las ha vuelto a activar.
quiet() {
  for unit in $1; do
    if $SYSTEMCTL is-active --quiet "$unit" 2> /dev/null; then
      grep -qx "$unit" "$quieted" 2> /dev/null || echo "$unit" >> "$quieted"
    fi
    $SYSTEMCTL mask --now "$unit" > /dev/null 2>&1 || true
  done
}

# Deshace `quiet`: lo desbloquea todo y arranca lo que estaba en marcha.
wake() {
  for unit in $QUIET_UNITS $STOP_UNITS; do
    $SYSTEMCTL unmask "$unit" > /dev/null 2>&1 || true
  done
  if [ -f "$quieted" ]; then
    while read -r unit; do
      $SYSTEMCTL start "$unit" > /dev/null 2>&1 || true
    done < "$quieted"
    rm -f "$quieted"
  fi
}

month=$(date -u +%Y-%m)
tx=$(cat "$TX_FILE")
saved_month=$month
total=0
last=$tx

if [ -f "$state" ]; then
  # Tres palabras: el mes, lo gastado en él y el contador de la última vez.
  read -r saved_month total last < "$state"
fi

# El contador de la tarjeta vuelve a cero al reiniciar la máquina: si es menor
# que la última vez, todo lo que marca es nuevo.
if [ "$tx" -ge "$last" ]; then
  delta=$((tx - last))
else
  delta=$tx
fi

if [ "$saved_month" != "$month" ]; then
  # Mes nuevo: el límite se ha renovado.
  total=0
  delta=0
fi

total=$((total + delta))
percent=$((total * 100 / LIMIT_BYTES))
previous=0
[ -f "$level_state" ] && previous=$(cat "$level_state")

if [ "$total" -ge $((LIMIT_BYTES / 100 * STOP_PERCENT)) ]; then
  level=$STOP_PERCENT
elif [ "$total" -ge $((LIMIT_BYTES / 100 * ADMIN_ONLY_PERCENT)) ]; then
  level=$ADMIN_ONLY_PERCENT
else
  level=0
fi

if [ "${1:-}" = "status" ]; then
  log "tráfico de $month: $total de $LIMIT_BYTES bytes ($percent %)"
  case "$previous" in
    "$ADMIN_ONLY_PERCENT") log "CORTE AL $ADMIN_ONLY_PERCENT %: solo entra quien administra" ;;
    "$STOP_PERCENT") log "PARADO: corte al $STOP_PERCENT %, contenedores detenidos" ;;
  esac
  exit 0
fi

echo "$month $total $tx" > "$state.tmp"
mv "$state.tmp" "$state"

if [ "$level" -ge "$ADMIN_ONLY_PERCENT" ]; then
  [ "$previous" -ge "$ADMIN_ONLY_PERCENT" ] ||
    log "CORTE AL $ADMIN_ONLY_PERCENT %: tráfico de $month al $percent %. Solo entra quien administra; se para lo automático."
  quiet "$QUIET_UNITS"
  echo "$level" > "$LEVEL_FILE"
fi

if [ "$level" -ge "$STOP_PERCENT" ]; then
  if [ "$previous" -lt "$STOP_PERCENT" ]; then
    log "CORTE AL $STOP_PERCENT %: tráfico de $month al $percent %. Se paran los contenedores hasta el mes que viene."
    (cd "$COMPOSE_DIR" && $COMPOSE stop)
  fi
  quiet "$STOP_UNITS"
fi

if [ "$level" -eq 0 ] && [ "$previous" -ne 0 ]; then
  # Solo se levanta lo que cortó la guardia, y solo con el límite renovado.
  log "Límite renovado ($month, $percent %). Se levanta el corte."
  rm -f "$LEVEL_FILE"
  wake
  [ "$previous" -lt "$STOP_PERCENT" ] || (cd "$COMPOSE_DIR" && $COMPOSE start)
fi

echo "$level" > "$level_state"

# Lo que no se arregla parando: se avisa, para que se corrija la máquina.
if [ -z "${GUARD_TX_FILE:-}" ]; then
  if [ "$(uname -m)" = "aarch64" ]; then
    ocpus=$(nproc)
    memory=$(awk '/MemTotal/ { printf "%d", $2 / 1024 / 1024 + 0.5 }' /proc/meminfo)
    [ "$ocpus" -le "$MAX_OCPUS" ] || log "AVISO: $ocpus OCPU; más de $MAX_OCPUS pasan del 90 % del cómputo gratuito."
    [ "$memory" -le "$MAX_MEMORY_GB" ] || log "AVISO: $memory GB de memoria; más de $MAX_MEMORY_GB pasan del 90 % gratuito."
  fi

  disk=$(lsblk -bdno SIZE,TYPE | awk '$2 == "disk" { sum += $1 } END { printf "%d", sum / 1000000000 }')
  [ "$disk" -le "$MAX_DISK_GB" ] || log "AVISO: $disk GB de disco; más de $MAX_DISK_GB pasan del 90 % de los 200 GB gratuitos."
fi
