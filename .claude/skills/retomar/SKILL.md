---
name: retomar
description: Retomar el trabajo en Sanatorio 42 con el contexto vacío (leer contexto.md y tareas-tras-compactar.md, comprobar el estado, seguir el plan) y, antes de compactar, dejarlo todo apuntado. Úsala al empezar una sesión o cuando se diga «revisa y ejecuta las tareas tras compactar».
---

# Retomar y dejar apuntado

## Al retomar

1. Lee `docs/contexto.md` entero y `docs/tareas-tras-compactar.md`.
2. Estado: `git status --short | wc -l`, `git log --oneline -3`, y qué hay en
   producción: `ssh ubuntu@51.170.34.214 'cd /opt/sanatorio && git log --oneline -1' < /dev/null`.
3. `npm run check` para partir de un estado conocido.
4. Di en dos líneas cómo está todo y sigue el plan de arriba abajo, marcando
   cada tarea (`[x]`) al acabarla. Lo que necesite una decisión de Alberto se
   pregunta; lo demás no espera.

## Antes de compactar o limpiar el contexto

- `docs/tareas-tras-compactar.md`: tachar lo hecho, escribir el plan de lo
  siguiente y lo que queda a medias (fichero y punto exacto).
- `docs/contexto.md`: estado, decisiones nuevas y lo subido.
- Decir qué queda sin subir.
