# Tests: qué se prueba y cómo

Guía de lo que tiene que cubrir cada test de Sanatorio 42 y de qué protege a
producción. Es de obligado cumplimiento para cualquier cambio (ver `AGENTS.md`).

## De dónde sale

Resumen de guías profesionales, adaptado a este proyecto:

- **Particiones de equivalencia y valores límite** (ISTQB, técnicas de caja
  negra): se agrupan las entradas que se comportan igual, se prueba una de
  cada grupo y, sobre todo, los bordes. Los fallos se concentran justo antes y
  justo después de cada límite.
  ([TechTarget](https://www.techtarget.com/searchsoftwarequality/tip/How-to-make-use-of-specification-based-test-techniques),
  [ejemplo de API](https://testwithpinpoint.com/blog/boundary-value-analysis))
- **Pruebas negativas y de entradas hostiles** (OWASP WSTG 4.7): lo que no es
  del tipo, lo que sobra, lo inyectado (HTML, SQL), los métodos y parámetros
  manipulados. ([OWASP WSTG, validación de entradas](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/README))
- **Cobertura como señal, no como meta** (Google Testing Blog, 2020): el 60 %
  es aceptable, el 75 % encomiable y el 90 % ejemplar; lo nuevo no puede bajar
  el listón del equipo. ([Code Coverage Best Practices](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html))
- **Probar lo que hace la gente, no las tripas** (Testing Library, Kent C.
  Dodds): cuanto más se parece un test al uso real, más confianza da; sobre
  todo integración. ([The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications))
- **Los tests intermitentes no se ignoran** (Google Testing Blog): uno que
  falla a veces suele esconder una carrera en el código de verdad.
  ([Flaky tests](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html))
  Ejemplo real de aquí: el test del interruptor de guardia destapó que la
  respuesta tardía de lo guardado pisaba lo que la persona acababa de pulsar.

## Qué tiene que cubrir cada test

Cada función, ruta o pantalla nueva se prueba con las cinco familias. Si una no
aplica, se dice por qué en el propio test.

| Familia | Qué es | Ejemplos de aquí |
| --- | --- | --- |
| **Normal** | El uso esperado, con datos corrientes | Apuntarse a una pizarra con plazas; pedir ayuda a alguien de guardia |
| **Límite** | El valor justo en el borde y el siguiente por cada lado | Plazas: la última libre y la primera que sobra. Fechas: medianoche, 29 de febrero, cambio de año. Texto: longitud máxima y uno más |
| **Vacío y enorme** | Nada, cero, lista vacía; lo muy grande | Sin proyectos; 10 000 personas; un cuerpo de 1 MB; 10¹⁵ líneas en Code Clicker |
| **Imprevisible** | Lo que no es del tipo, lo hostil, el orden raro | `"abc"` donde va un número; negativos; `<script>`; dos pulsaciones a la vez; una respuesta que llega tarde; 42 caída o respondiendo 429 |
| **Permisos** | Quién puede y quién no | Sin sesión → 401; otra persona → 403; staff fuera de `/staff` → rechazo; admin sin segundo factor |

Y además, según lo que sea:

- **Reglas con dinero o XP** (XP, topes, Code Clicker): que no se pueda ganar
  dos veces lo mismo, que el tope corte en el valor exacto y que una trampa
  conocida no cuele.
- **Lo que habla con 42**: sin cuota, 42 caída, página vacía, paginación con
  la última página justa, y que no se llame a 42 desde donde no toca (los tests
  lo prohíben salvo en `replica`).
- **Migraciones**: que se aplican sobre la base de la versión anterior con
  datos dentro, no solo sobre una vacía.
- **Fechas y zonas horarias**: el día del calendario es el de la hora del
  navegador; los instantes viajan en UTC.

## Dónde va cada test

| Tipo | Dónde | Con qué |
| --- | --- | --- |
| Reglas puras de la API | `apps/api/tests/unit/*.test.ts` | La base en memoria |
| Rutas de la API de punta a punta | `apps/api/tests/integration/` | `makeApp` y `inject`, con 42 simulada |
| Todas las rutas contra entradas extremas | `apps/api/tests/integration/routes.test.ts` | Automático: una ruta nueva entra sola |
| Funciones de la web | `apps/web/tests/*.test.ts` | Node |
| Pantallas y recorridos de la web | `apps/web/tests/ui/*.test.tsx` | jsdom, Testing Library y la API de mentira |

Los tests de pantallas buscan como lo haría una persona: por rol y nombre
accesible (`getByRole('button', { name: … })`), con los textos de las tablas (`virtual:textos/es`), nunca
por clases CSS. Si algo no se puede encontrar así, es un fallo de
accesibilidad y se arregla en la web (así salió el `role="switch"` del
interruptor de guardia).

`tests/ui/sections.test.tsx` abre todas las secciones de `sections.ts` y
comprueba que no hay excepciones, errores de React ni claves de texto sin
traducir. Una sección nueva entra sola.

## Cómo se protege producción

1. **`npm run check`** antes de dar nada por hecho: tipos, lint, formato,
   código sin uso (`knip`), duplicados (`jscpd`, máximo 1 %) y tests.
2. **CI en cada subida** (`.github/workflows/ci.yml`): lo mismo, más los
   mínimos de cobertura (`npm run test:coverage`) y que la imagen de Docker
   construya.
3. **Mínimos de cobertura** en `apps/*/vitest.config.ts` (`thresholds`). Solo
   suben: si un cambio los baja, faltan tests de lo nuevo. A día de hoy:
   API 96 % de líneas y 89 % de ramas; web 48 % de líneas, ya sin contar los textos (sube con cada
   pantalla probada).
4. **`deploy.sh` no despliega un commit sin la CI en verde**: si aún corre,
   espera; si ha fallado, se niega. Solo en una emergencia con GitHub caído:
   `SIN_CI=1`.
5. **Vuelta atrás automática**: antes de construir guarda la imagen que
   funciona; si la nueva no contesta en `/health/db`, vuelve a la anterior.
6. **Copia de la base antes de cada despliegue** (`backup.sh`), y las
   migraciones nunca se editan: solo se añaden.

## Cómo se ejecutan

```sh
npm run check              # todo lo rápido, antes de cada commit
npm run test:coverage      # tests con los mínimos de cobertura, como la CI
npx vitest run tests/ui    # (en apps/web) solo las pantallas
npm run deadcode           # código sin uso
npm run duplicates         # código repetido
```
