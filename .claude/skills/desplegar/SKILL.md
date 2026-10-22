---
name: desplegar
description: Subir a GitHub y desplegar Sanatorio 42 en producción de forma segura (check en verde, push, despliegue desacoplado del SSH, vigilancia hasta «Desplegado y respondiendo», cupo de GitHub). Úsala para cada despliegue.
---

# Desplegar a producción

Servidor: `ubuntu@51.170.34.214`, repo en `/opt/sanatorio`. La máquina hace
`git pull`, espera a que la CI de GitHub esté en verde para ese commit,
construye la imagen y recrea el contenedor (`infra/scripts/deploy.sh`), con
copia de seguridad previa (`infra/scripts/backup.sh`).

## Antes

1. `npm run check` entero en verde (skill `comprobar`).
2. Commit con mensaje en español que explique el porqué; sin push a medias.
3. **Agrupa**: si hay varios cambios listos, un solo push y un solo
   despliegue. No lances otro mientras uno espera a la CI.
4. **Cupo de GitHub**: la API pública da 60 consultas/hora a la IP del
   servidor; `deploy.sh` ya para si solo queda el 10 % y dice a qué hora se
   renueva. Un despliegue gasta ~6–17. No consultes la API de GitHub desde
   local salvo `/rate_limit` (gratis) o para leer el fallo de una CI.

## Cómo

```sh
git push -q origin main
ssh -o ConnectTimeout=10 ubuntu@51.170.34.214 "cd /opt/sanatorio && git pull -q --ff-only && (setsid nohup sh -c 'infra/scripts/backup.sh; infra/scripts/deploy.sh' > infra/deploy.log 2>&1 < /dev/null &) ; echo lanzado" < /dev/null
```

Desacoplado del SSH a propósito: dos despliegues murieron al cortarse la
conexión. Vigila en segundo plano hasta que acabe (unos 8–15 min):

```sh
for i in $(seq 1 40); do line=$(ssh -o ConnectTimeout=10 ubuntu@51.170.34.214 'tail -1 /opt/sanatorio/infra/deploy.log' < /dev/null 2>/dev/null); case "$line" in *Desplegado*|*fallado*|*Vuelve*|*rror*) echo "$line"; exit 0;; esac; sleep 60; done
```

## Después

```sh
ssh ubuntu@51.170.34.214 'docker inspect sanatorio-app-1 --format "{{.State.StartedAt}} {{.State.Health.Status}}"; cd /opt/sanatorio && git log --oneline -1' < /dev/null
```

`healthy`, hora de arranque reciente y el commit esperado. Si no, mira
`infra/deploy.log` y los registros: `docker logs --since 10m sanatorio-app-1`.

## Si la CI falla

Lee el fallo (una consulta): `curl -s https://api.github.com/repos/ALRO-GM/sanatorio-42/commits/<sha>/check-runs | jq '.check_runs[] | {name, conclusion}'` y el job con `…/actions/jobs/<id>` → `steps`. Arregla, `check`, commit, push y vuelve a lanzar. No desplieges nunca con la CI en rojo (`deploy.sh` lo impide).

## Lo que no se hace

- Escribir en la base de datos de producción por SSH (bloqueado): las
  respuestas del buzón, indultos, etc., se hacen desde el panel.
- Cambiar `infra/` para pedir a Oracle más que la capa gratuita.
- Desplegar sin copia de seguridad (`backup.sh` va delante siempre).

Para delegar, lanza el subagente `desplegador` con el commit a desplegar.
