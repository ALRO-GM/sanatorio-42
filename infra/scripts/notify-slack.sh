#!/bin/sh
# Manda una línea al canal de Slack del staff, por el mismo webhook que usan
# los avisos del edificio (SLACK_WEBHOOK_URL en infra/.env).
#
#   infra/scripts/notify-slack.sh "Desplegado abc1234 en 312 s"
#
# Sin webhook no hace nada y sale bien: avisar es opcional, desplegar no. Y si
# Slack no contesta, tampoco se para nada: se dice y se sigue.
set -eu

cd "$(dirname "$0")/.."

[ $# -ge 1 ] || { echo "Uso: $0 <mensaje>" >&2; exit 1; }

url=$(sed -n 's/^SLACK_WEBHOOK_URL=//p' .env 2> /dev/null | tr -d '"' | head -n 1)
[ -n "$url" ] || exit 0

# Lo justo para que el mensaje sea JSON válido: barras y comillas.
text=$(printf '%s' "$*" | sed 's/\\/\\\\/g; s/"/\\"/g')

curl -fsS -m 10 -X POST -H 'content-type: application/json' \
  --data "{\"text\":\"[sanatorio] $text\"}" "$url" > /dev/null ||
  echo "No se pudo avisar a Slack." >&2
