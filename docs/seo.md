# Buscadores (SEO)

Qué hace la web para salir en Google y en Bing, y qué queda por hacer fuera
del código. Empezó el 2026-11-02, al día siguiente de pasar a
[peer4u.app](https://peer4u.app).

## El problema

La web de verdad está detrás del inicio de sesión con 42 y sus rutas van con
`#/…`. Un buscador no ve nada detrás del login y no cuenta un `#/…` como una
página distinta. Sin más, de Peer4U solo podría leer la pantalla de entrada,
que además pinta el JavaScript.

## Lo que hay

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Portadas públicas | `apps/web/tools/portada.ts`, textos en `textos/portada/portada.csv` | Al compilar (`vite build`, no la demo) se genera una página por idioma: `/es/`, `/en/`, `/ca/`, `/eu/`, `/fr/`. Son HTML sin JavaScript, con su propia hoja (`portada.css`, sin las de la web). Cuentan qué es Peer4U, qué ofrece y las preguntas frecuentes. «Entrar con 42» lleva a `/?lang=<idioma>`, y la web arranca en ese idioma y lo guarda |
| Enlaces entre idiomas | Cada portada | `hreflang` a las cinco y `x-default` a la española; dirección canónica propia |
| `robots.txt` | Lo genera `portada.ts` | Deja mirar todo menos `/api/` y `/demo/` (datos inventados que no deben salir como si fueran la web). Apunta al sitemap |
| `sitemap.xml` | Lo genera `portada.ts` | La entrada (`/`) y las cinco portadas |
| Cabecera de la web | `apps/web/index.html` | Título descriptivo, canónica `https://peer4u.app/`, Open Graph y tarjeta de Twitter, y datos estructurados `WebSite` para que Google sepa que se llama «Peer4U» (y que «Peer for you» es lo mismo) |
| Datos estructurados de las portadas | `portada.ts` | `WebApplication`: nombre, descripción, gratis, de quién |
| Imagen al compartir | `apps/web/public/og.png` (1200 × 630) | La vista previa en Slack, WhatsApp, LinkedIn… |
| Enlace desde la entrada | `features/auth/Login.tsx` | «Qué es Peer4U» lleva a la portada de su idioma: así el buscador la encuentra también desde la web |
| Servidor | `apps/api/src/core/http/static.ts` | Sirve `/<carpeta>/` con su `index.html` y redirige `/<carpeta>` a `/<carpeta>/` con un `308`, para que cada página tenga una sola dirección |
| Caché del PC | `apps/web/public/sw.js` | El service worker solo toca las navegaciones a la web (`/`) y a la demo. Si no, guardaría una portada como si fuera la web |

Las direcciones de antes (`sanatorio42.duckdns.org`, `www.peer4u.app`)
redirigen con un `301` a peer4u.app (`infra/Caddyfile`), así que lo que ya
tuvieran no se pierde.

Los datos JSON-LD van en un `<script type="application/ld+json">`: el
navegador no lo ejecuta y la política de contenido (`script-src 'self'`) no
lo bloquea. Un test comprueba que las portadas no llevan ningún otro script.

## Cambiar un texto de la portada

Igual que cualquier texto de la web (`docs/textos.md`): la fila en
`textos/portada/portada.csv`, en los cinco idiomas. Algunos los toma de las
tablas de la web, ya traducidos: el botón de entrar, la demo, los nombres de
las secciones y el pie. El título y la descripción tienen un tope (65 y 160
caracteres) para que Google no los corte; lo comprueba `tests/portada.test.ts`.

## Lo que no es código (lo hace Alberto)

1. **Google Search Console**: dar de alta la propiedad de dominio `peer4u.app`.
   Google da un registro TXT, que se pone en Cloudflare (lo puede poner el
   asistente con el token de la zona). Luego se envía
   `https://peer4u.app/sitemap.xml` y se pide indexar `/es/`.
2. **Bing Webmaster Tools**: importar la propiedad desde Search Console.
3. **Enlaces desde fuera**: el README del repositorio, LinkedIn, los Slack de
   los campus y las listas de herramientas para 42. Un enlace desde una web de
   42 es lo que más pesa.

## Qué esperar

Buscando «Peer4U», en días o pocas semanas desde que Google la indexe: es un
nombre único con dominio propio. Las búsquedas genéricas («ayuda proyectos
42») dependen de las portadas y, sobre todo, de los enlaces de fuera.
