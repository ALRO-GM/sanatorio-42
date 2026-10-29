# Vistas de la red: según cuánta gente se mira

Pedido por Alberto (2026-10-29): además del grafo de fuerzas, otras formas de
ver la red de correcciones y la de asientos, según si se mira a una persona, a
un grupo mediano o a mucha gente. El grafo de siempre se ofrece en los tres
casos. Código: `apps/web/src/features/network/GraphViews.tsx`; lo usan
`NetworkPage` y `SeatsPage` (sin dirección, `undirected`).

| Lo que se mira | Vistas (la de fábrica, primero) | Para qué |
| --- | --- | --- |
| Una persona elegida | **Su red** (anillos) · Grafo | Con quién se cruza o se sienta, de un vistazo y en el móvil. Más cerca y más gruesa, unión más fuerte; en correcciones, continua si es mutua y a trazos si va en un solo sentido. Pulsar a alguien pasa a su red |
| Hasta 150 personas a la vista | Grafo · **Matriz** | Persona × persona ordenadas por grupo: los grupos cerrados salen como bloques en la diagonal (endogamia) y lo mutuo, como simetría. Sin maraña. Con 60 o menos, con los nombres |
| Más de 150 | Grafo · **Grupos** (cuerdas) | Cuánto se une cada grupo (comunidad) con los demás y cuánto dentro de sí (la cuerda que vuelve a su arco). Los 10 grupos más grandes con arco propio; el resto, en «Otros» |

Al elegir a alguien se pasa a su red; al soltarlo, a la vista de fábrica de lo
que se ve. Las vistas usan los mismos nodos, uniones y colores que el grafo,
así que los recortes y filtros de cada página valen igual.

Ideas que quedan (del análisis del 2026-10-29): la red sobre el plano del
clúster para los asientos, el calendario de coincidencias (horas × días) al
elegir a alguien, y el diagrama de cuerdas por kickoff o campus además de por
comunidad.
