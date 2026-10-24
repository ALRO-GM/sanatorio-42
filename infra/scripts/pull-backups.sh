#!/bin/sh
# Trae a este ordenador la última copia de la base que hizo el servidor.
#
# Las copias de infra/backups viven en la misma máquina que la base: si se
# pierde la máquina, se pierden con ella. Esto corre en el ordenador de Alberto
# (no en el servidor) y se las trae por SSH: el servidor no necesita entrar en
# ningún sitio ni guardar más claves.
#
#   infra/scripts/pull-backups.sh              trae la última y guarda las 30 últimas
#   infra/scripts/pull-backups.sh --instalar   además, lo programa cada día (systemd de usuario)
#
# Destino: SANATORIO_COPIAS (por defecto ~/sanatorio-copias), solo legible por
# quien lo ejecuta: la base lleva datos personales. Para restaurar una, se sube
# al servidor y se usa infra/scripts/restore.sh.
set -eu

HOST=${SANATORIO_HOST:-ubuntu@51.170.34.214}
DEST=${SANATORIO_COPIAS:-$HOME/sanatorio-copias}
KEEP=30

if [ "${1:-}" = "--instalar" ]; then
  units="$HOME/.config/systemd/user"
  script=$(realpath "$0")
  mkdir -p "$units"
  cat > "$units/sanatorio-copias.service" << EOF
[Unit]
Description=Trae la última copia de la base de Sanatorio 42

[Service]
Type=oneshot
ExecStart=$script
EOF
  # `Persistent`: si el ordenador estaba apagado a esa hora, se hace al encenderlo.
  cat > "$units/sanatorio-copias.timer" << EOF
[Unit]
Description=Copia diaria de Sanatorio 42 a este ordenador

[Timer]
OnCalendar=*-*-* 05:00
Persistent=true
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now sanatorio-copias.timer
  echo "Programada: systemctl --user list-timers sanatorio-copias.timer"
fi

umask 077
mkdir -p "$DEST"
chmod 700 "$DEST"

# La última buena la apunta backup.sh en infra/backups/ultima.
last=$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$HOST" 'cat /opt/sanatorio/infra/backups/ultima' < /dev/null)
case "$last" in
  backups/sanatorio-*.db.gz) ;;
  *)
    echo "Respuesta rara del servidor: «$last»" >&2
    exit 1
    ;;
esac
name=$(basename "$last")

if [ -f "$DEST/$name" ]; then
  echo "Ya estaba: $DEST/$name"
  exit 0
fi

# Se baja con otro nombre y solo se da por buena si el gzip está entero.
rsync -t --partial "$HOST:/opt/sanatorio/infra/$last" "$DEST/$name.part"
gzip -t "$DEST/$name.part"
mv "$DEST/$name.part" "$DEST/$name"

# shellcheck disable=SC2012
ls -1t "$DEST"/sanatorio-*.db.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "Copia traída y comprobada: $DEST/$name"
