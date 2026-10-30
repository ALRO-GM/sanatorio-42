# Informe de uso para Claude

Pedido por Alberto (2026-10-30): que Claude pueda mirar por su cuenta cómo se
usa la web (qué secciones, qué caminos, qué se pulsa, cuánta cuota de 42 se
gasta) para mejorar la organización y los recursos, sin que nadie tenga que
lanzar nada y de forma segura.

## Qué saca

`apps/api/src/cli/usage-report.ts`, en JSON, de los últimos N días (1–90, 30
de fábrica):

| Campo             | De dónde               | Qué es                                                                     |
| ----------------- | ---------------------- | -------------------------------------------------------------------------- |
| `dailyPeople`     | `usage_time`           | Gente distinta cada día                                                    |
| `sections`        | `usage_time`           | Por sección o elemento: gente, clics, horas a la vista, de fondo y ocultas |
| `byHour`          | `usage_time`           | Gente y horas a la vista por hora (UTC)                                    |
| `flows`           | `usage_flows`          | Los 80 caminos más andados de una sección a otra                           |
| `clickedElements` | `usage_click_elements` | Los 200 elementos más pulsados, y si son botones                           |
| `counters`        | `usage_counts`         | Contadores de uso de siempre                                               |
| `apiByFeature`    | `api_usage`            | Peticiones a la API de 42 por función y día                                |

## Por qué es seguro

- **Sin datos personales**: ni un login. Lo que tiene menos de 3 personas
  detrás no sale (`MIN_PEOPLE`).
- **Solo lee**: abre la base con el cliente a pelo (no con `openDatabase`, que
  migra) y solo acepta consultas `SELECT`.
- **Una llave que solo sirve para esto**: en el servidor, la llave
  `~/.ssh/peer4u_uso` (la de este ordenador) va en `authorized_keys` con
  `command="/opt/sanatorio/infra/scripts/uso.sh",restrict`. Con ella no hay
  shell, ni reenvío de puertos, ni copia de ficheros: cualquier cosa que se
  pida ejecuta `infra/scripts/uso.sh`, que solo toma los días (dos cifras) de
  lo pedido. Si la llave se pierde, lo peor que se puede hacer con ella es
  leer este informe; se revoca borrando su línea de `authorized_keys`.

## Cómo se usa

```sh
ssh -i ~/.ssh/peer4u_uso -o IdentitiesOnly=yes ubuntu@51.170.34.214 30 > uso.json
```

En local, contra una copia: `npm run uso:report -w @sanatorio/api -- 7`.

Para que Claude lo lance sin preguntar, una regla en los permisos de Claude
Code que permita solo ese comando (`Bash(ssh -i ~/.ssh/peer4u_uso:*)`): con
la llave restringida, no permite nada más en el servidor.
