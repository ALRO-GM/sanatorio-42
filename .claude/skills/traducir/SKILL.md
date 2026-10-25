---
name: traducir
description: Añadir o cambiar textos de la web (tablas CSV con es/en/ca/eu/fr), traducir el banco de preguntas o el curso de git, y comprobar que nada se queda sin traducir. Úsala para cualquier texto nuevo o cambiado.
---

# Traducir y mantener los textos

Los textos de la web **solo** viven en `apps/web/src/shared/i18n/textos/*.csv`
(una tabla por tema; columnas `clave, contexto, es, en, ca, eu, fr`). Los
componentes usan `t('clave')`. Reglas de redacción: `docs/textos.md`; tono y
vocabulario: `AGENTS.md` («Reglas de producto»).

## Texto nuevo o cambiado en la web

1. Elige la tabla por tema (`comun`, `expediente`, `guardia`, `examenes`…) y
   un prefijo de clave coherente con las de esa tabla.
2. Escribe la fila con **las cinco lenguas** (un test obliga a ca y eu en todo
   lo visible) y un `contexto` que diga dónde sale y qué es cada `{variable}`.
   El francés es obligatorio (`FR_REQUIRED` en `apps/web/tools/textos-cli.ts`):
   natural, tuteando, con los términos y la tipografía de
   `docs/glosario-frances.md` (espacios sin corte antes de `: ; ? ! %` y dentro
   de « »; `npm run textos` lo comprueba).
   Si el contexto lleva comas, va entre comillas dobles.
3. Español: segunda persona, lenguaje inclusivo (evita formas con género),
   comillas «», puntos suspensivos «…», tono de clínica cálida. Inglés natural
   (no literal). Mismos `{placeholders}` en todas las columnas.
4. `npm run textos -- --write` (regenera `docs/textos/*.md`) y `npm run check`.
5. La clave que deja de usarse se borra de la tabla.

## Banco de preguntas (Not-games) y curso de git

- Español en `apps/api/src/modules/quiz/bank/*.ts`; inglés en `bank/en/*.ts`
  y francés en `bank/fr/*.ts`, con **la misma forma** (mismas formas, preguntas, buenas y malas, en el mismo
  orden): se traduce por posición al enseñar (`bank/localize.ts`). El test
  `tests/unit/quiz-bank-lang.test.ts` lo comprueba. Repaso: `bank/review-*.ts`
  y `bank/{en,fr}/review-*.ts`, mismas claves. Lo que falta en francés sale
  en inglés.
- Curso de git: `packages/gitsim/src/levels/*.ts`, `levels/en/*.ts` y
  `levels/fr/*.ts` (`LevelText` por id; misiones por plantilla en
  `en/groups.ts` y `fr/groups.ts`). Tests:
  `apps/api/tests/unit/gitcourse-en.test.ts` y `gitcourse-fr.test.ts`.
  Comandos, ficheros y ramas no se traducen.
- Curso de shell: cada unidad (`packages/shellsim/src/course/*.ts`) y cada
  bloque (`blocks.ts`) llevan `es`, `en` y `fr`. Test:
  `apps/api/tests/unit/shellcourse-fr.test.ts` (misma forma que el inglés).
  Los comandos, las rutas y lo que la prueba comprueba (nombres de fichero,
  textos que hay que escribir) se dejan como en español.
- Reglas del banco: cada forma pregunta una sola cosa; los números, en cifras;
  las malas, de la misma pinta que la buena (`shapeOf`); ninguna respuesta se
  cuela en la pregunta.

## Mensajes de error de la API

Los `DomainError` llegan en español a todo el mundo (pendiente en `AGENTS.md`).
Si tocas uno, que sea claro, sin culpar a la persona y sin detalles internos.

## Para un lote grande

Lanza el subagente `traductor` (en `.claude/agents/`) con la lista de claves o
ficheros; él escribe, pasa `npm run textos -- --write` y `npm run check`.
