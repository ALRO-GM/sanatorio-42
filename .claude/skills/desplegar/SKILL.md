---
name: desplegar
description: Subir a GitHub y desplegar Sanatorio 42 en producción de forma segura (check en verde, push, despliegue desacoplado del SSH con copia, migración aparte y vuelta atrás, vigilancia hasta «Desplegado y respondiendo»). Úsala para cada despliegue.
---

# Desplegar a producción

Servidor: `ubuntu@51.170.34.214`, repo en `/opt/sanatorio`. La máquina hace
`git pull` y lanza `infra/scripts/deploy.sh`, que en orden y con una barrera
en cada paso (detalle en `docs/deploy-oracle.md` §5):

1. Cerrojo (`flock`): no corren dos despliegues a la vez.
2. Espera a que la CI de GitHub deje la etiqueta `ci-ok/<sha>` en el repo (la
   mira con `git ls-remote` por SSH: **sin la API de GitHub ni su cupo**). Si
   aparece `ci-ko/<sha>`, o `main` ya tiene otro commit, para y lo dice.
3. Copia de seguridad comprobada (`backup.sh`); sin copia buena no sigue.
4. Imagen actual etiquetada `previous`; construye la nueva con `GIT_SHA`.
5. Migraciones aparte (`compose run … migrate.js`) antes de tocar el
   contenedor; si fallan, el viejo sigue sirviendo y avisa a Slack.
6. `up -d` y hasta 180 s a que `/health/db` responda con ese commit y el
   esquema esperado.
7. Si no: vuelve a `previous` y, si hubo migraciones, restaura la copia
   (`restore.sh --yes`). Avisa a Slack.

## Antes

1. `npm run check` entero en verde (skill `comprobar`).
2. Commit con mensaje en español que explique el porqué; sin push a medias.
3. **Agrupa**: si hay varios cambios listos, un solo push y un solo
   despliegue. No lances otro mientras uno espera a la CI (el cerrojo lo
   rechazaría igual).
4. **Cupo de GitHub**: `deploy.sh` ya no gasta nada de la API. Desde local solo
   se consulta para leer el fallo de una CI (una o dos llamadas) y sin pasar del
   90 % de las 60/hora.

## Cómo

```sh
git push -q origin main
ssh -o ConnectTimeout=10 ubuntu@51.170.34.214 "cd /opt/sanatorio && git pull -q --ff-only && (setsid nohup infra/scripts/deploy.sh > infra/deploy.log 2>&1 < /dev/null &) ; echo lanzado" < /dev/null
```

Desacoplado del SSH a propósito: dos despliegues murieron al cortarse la
conexión. `deploy.sh` hace él la copia (ya no hace falta `backup.sh;` delante).
Vigila en segundo plano hasta que acabe (unos 8–15 min):

```sh
for i in $(seq 1 40); do line=$(ssh -o ConnectTimeout=10 ubuntu@51.170.34.214 'tail -1 /opt/sanatorio/infra/deploy.log' < /dev/null 2>/dev/null); case "$line" in *Desplegado*|*fallado*|*Restaurada*|*rror*|*"no se despliega"*) echo "$line"; exit 0;; esac; sleep 60; done
```

## Después

```sh
ssh ubuntu@51.170.34.214 'docker inspect sanatorio-app-1 --format "{{.State.StartedAt}} {{.State.Health.Status}}"; cd /opt/sanatorio && git log --oneline -1' < /dev/null
curl -s https://sanatorio42.duckdns.org/api/health/db
```

`healthy`, hora de arranque reciente y `version` igual al commit esperado,
con `schema.actual === schema.expected`. Si no, mira `infra/deploy.log` y los
registros: `docker logs --since 10m sanatorio-app-1` (los `500` salen como
líneas JSON con `"level":50` y su `reqId`, el mismo `x-request-id` que vio la
persona).

## Si la CI falla

`deploy.sh` lo dice («La CI de <sha> ha fallado», etiqueta `ci-ko/<sha>`).
Lee el fallo (una consulta): `curl -s https://api.github.com/repos/ALRO-GM/sanatorio-42/commits/<sha>/check-runs | jq '.check_runs[] | {name, conclusion}'` y el job con `…/actions/jobs/<id>` → `steps`. Arregla, `check`, commit, push y vuelve a lanzar. No desplieges nunca con la CI en rojo (`deploy.sh` lo impide; `SIN_CI=1` solo con GitHub caído).

## Lo que no se hace

- Escribir en la base de datos de producción por SSH (bloqueado): las
  respuestas del buzón, indultos, etc., se hacen desde el panel.
- Cambiar `infra/` para pedir a Oracle más que la capa gratuita.
- Desplegar sin copia de seguridad (`deploy.sh` la hace y no sigue sin ella).

Para delegar, lanza el subagente `desplegador` con el commit a desplegar.
