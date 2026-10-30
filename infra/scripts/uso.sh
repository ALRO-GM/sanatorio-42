#!/bin/sh
# Informe de uso de la web (`docs/uso-informe.md`): cifras agregadas, sin
# logins, de solo lectura.
#
# Es lo único que puede ejecutar la llave SSH de solo lectura: en
# `~/.ssh/authorized_keys` va con `command="/opt/sanatorio/infra/scripts/uso.sh",restrict`,
# así que da igual lo que se pida por SSH: se ejecuta esto y nada más (ni
# shell, ni reenvíos, ni copiar ficheros). De lo pedido solo se toman los
# días, hasta dos cifras; lo demás se tira.
set -eu

days=$(printf '%s' "${SSH_ORIGINAL_COMMAND:-30}" | tr -cd '0-9' | cut -c1-2)

exec docker exec -i -w /app sanatorio-app-1 node dist/cli/usage-report.js "${days:-30}"
