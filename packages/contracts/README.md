# @sanatorio/contracts

El contrato entre `apps/api` y `apps/web`: los tipos de cada respuesta JSON.

- **Solo tipos.** Aquí no hay código que se ejecute, así que ninguna de las dos
  aplicaciones necesita compilar este paquete: se importa con `import type`.
- **Una sola fuente.** Si cambia la forma de una respuesta, se cambia aquí y el
  compilador señala todo lo que hay que tocar en la API y en la web.
- La descripción en prosa de cada ruta está en `docs/api.md`.
