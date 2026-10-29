# Tareas tras compactar (2026-10-29)

En producción hasta 22cb544. Si la CI falla: `gh run view --job <id> --log-failed`
(gh instalado en `~/.local/bin` con la sesión de ALRO-GM).

## Reorganización de la web (pedida por Alberto el 2026-10-29)

Informe con la teoría y el mapa: https://claude.ai/artifact/GdfmhP8oaqqfc8AiwRebwM
Ejemplo del estilo base (claro, oscuro, móvil): https://claude.ai/artifact/WuVSadwa7zy7e2AiuijDkP

Mapa acordado (Calendario en Yo, confirmado por Alberto):

| Categoría | Pestañas |
| --- | --- |
| Yo (portada) | Expediente · Agenda · Calendario |
| Ayuda | Sala de espera · Tablón · Terapia · Pizarras · Guardia |
| Aprender | Curso de git · Curso de shell · Not-games · Pomodoro |
| Campus | Clústeres · Asientos · Avance · Red · Exámenes · Clasificaciones |

Fases, cada una con check, commit, push y despliegue:

1. **(Hecha, 46ed511) Categorías** (`app/sections.ts`, `shared/layout/registry.ts`, textos
   `nav.cat.*`, Nav, Miniature, tours que nombran categorías, mock de piscina,
   `docs/interfaz.md`): Yo, Ayuda, Aprender, Campus; Guardia como pestaña de
   Ayuda; Estadísticas → Clasificaciones en Campus. Los órdenes guardados con
   las categorías viejas no deben romper nada.
2. **(Hecha) Sacar lo escondido**: cursos de git y de shell como secciones propias de
   Aprender (hoy pestañas de Not-games; `#/notgames/git` y `#/notgames/shell`
   redirigen); Pomodoro como página de Aprender (ajustes, Startup, cifras; la
   ventanita de la esquina se queda); Asientos como sección de Campus (hoy
   pestaña de Red). Permisos de piscina (`POOL_KEY`) de cada sección nueva.
3. **(Hecha en parte: menú y barra del móvil; falta llevar los ajustes del pie a Personalizar) Cabecera y menú**: menú del avatar solo de la cuenta (Personalizar,
   Bienvenida, Gestión, Salir); los ajustes del pie, en Personalizar; en el
   móvil, barra inferior con las cuatro categorías.
4. **Estilo base profesional**: un estilo nuevo por defecto como el ejemplo
   (Inter, grises neutros, turquesa #0F766E / #2DD4BF en oscuro, bordes de 1 px,
   radio 12, cifras tabulares). Los estilos actuales siguen en Personalizar.
5. **Tres capas de datos** en Campus: la respuesta en una frase, el gráfico
   con opciones a la derecha, «Ver a fondo» plegado.

## Dominio Peer4U.app (cuando Alberto lo compre)

Caddyfile con el dominio nuevo, redirección desde el viejo, URI de vuelta de
la aplicación OAuth de 42, CORS y `PUBLIC_URL`/cookies en `infra/.env`.

## Pendiente de antes

- Historial de asientos: `npm run sync:status`.
- Startup del Pomodoro: ajustar precios cuando haya uso.
