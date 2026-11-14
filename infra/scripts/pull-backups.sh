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
# quien lo ejecuta: la base lleva datos personales. Y cifradas enteras con la
# clave pública de infra/copias.asc (`.db.gz.gpg`): un portátil perdido no da
# la base. Las cifra el servidor (backup.sh); si aún no lo hace, se cifran al
# llegar, y las de antes, también. Para restaurar una (docs/cifrado.md):
#   gpg -o sanatorio-….db.gz -d sanatorio-….db.gz.gpg      (pide la frase)
# se sube al servidor y se usa infra/scripts/restore.sh.
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

# La clave pública de las copias (la privada no hace falta para cifrar: solo
# para abrir una, a mano). Con ella aquí no se queda nada sin cifrar.
KEY=$(dirname "$(realpath "$0")")/../copias.asc
has_key() { grep -q 'BEGIN PGP PUBLIC KEY BLOCK' "$KEY" 2> /dev/null; }

# Cifra una copia que llegó (o se quedó) sin cifrar y borra la de en claro.
seal() {
  gpg --batch --yes --trust-model always --recipient-file "$KEY" --encrypt -o "$1.gpg.part" "$1"
  mv "$1.gpg.part" "$1.gpg"
  rm -f -- "$1"
}

# Las que se trajeron antes del cifrado, sin cifrar: se cifran ahora.
if has_key; then
  for old in "$DEST"/sanatorio-*.db.gz; do
    [ -f "$old" ] || continue
    seal "$old"
    echo "Cifrada la copia de antes: $old.gpg"
  done
fi

remote() {
  ssh -o BatchMode=yes -o ConnectTimeout=20 "$HOST" "cat /opt/sanatorio/infra/backups/$1 2> /dev/null || true" < /dev/null
}

# La última cifrada en el servidor (backup.sh, con la clave pública del repo).
# Si el servidor aún no cifra, la última buena sin cifrar.
last=$(remote ultima-cifrada)
case "$last" in
  backups/sanatorio-*.db.gz.gpg) ;;
  *) last=$(remote ultima) ;;
esac
case "$last" in
  backups/sanatorio-*.db.gz.gpg | backups/sanatorio-*.db.gz) ;;
  *)
    echo "Respuesta rara del servidor: «$last»" >&2
    exit 1
    ;;
esac
name=$(basename "$last")
plain=${name%.gpg}

if [ -f "$DEST/$name" ] || [ -f "$DEST/$plain.gpg" ]; then
  echo "Ya estaba: $DEST/$plain.gpg"
  exit 0
fi

# Se baja con otro nombre y solo se da por buena entera: la cifrada, si es un
# mensaje de gpg para una clave pública; la de en claro, si el gzip está bien.
rsync -t --partial "$HOST:/opt/sanatorio/infra/$last" "$DEST/$name.part"
case "$name" in
  *.gpg)
    if ! gpg --batch --list-packets "$DEST/$name.part" 2> /dev/null | grep -q 'pubkey enc packet'; then
      echo "La copia cifrada no parece un mensaje de gpg: $DEST/$name.part" >&2
      exit 1
    fi
    mv "$DEST/$name.part" "$DEST/$name"
    ;;
  *)
    gzip -t "$DEST/$name.part"
    mv "$DEST/$name.part" "$DEST/$name"
    if has_key; then
      seal "$DEST/$name"
      name=$name.gpg
    else
      echo "Sin clave pública en $KEY: la copia se queda SIN CIFRAR (docs/cifrado.md)." >&2
    fi
    ;;
esac

# Se guardan las KEEP últimas, cifradas o no.
# shellcheck disable=SC2012
ls -1t "$DEST"/sanatorio-*.db.gz "$DEST"/sanatorio-*.db.gz.gpg 2> /dev/null |
  tail -n +$((KEEP + 1)) | xargs -r rm --
echo "Copia traída y comprobada: $DEST/$name"
