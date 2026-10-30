# Vistas de la red: según cuánta gente se mira

> **Retiradas el 2026-10-30** (pedido por Alberto): la Red y Amigos vuelven a
> enseñar solo el grafo de fuerzas (`ForceGraph`). Se probaron la red en
> anillos, la matriz y las cuerdas entre grupos y ninguna convenció; lo de
> abajo queda como registro de lo probado.

Pedido por Alberto (2026-10-29): además del grafo de fuerzas, otras formas de
ver la red de correcciones y la de asientos, según si se mira a un grupo
mediano o a mucha gente. El grafo de siempre se ofrece siempre. Código: `apps/web/src/features/network/GraphViews.tsx`; lo usan
`NetworkPage` y `SeatsPage` (sin dirección, `undirected`).

| Lo que se mira | Vistas (la de fábrica, primero) | Para qué |
| --- | --- | --- |
| Hasta 150 personas a la vista | Grafo · **Matriz** | Persona × persona ordenadas por grupo: los grupos cerrados salen como bloques en la diagonal (endogamia) y lo mutuo, como simetría. Sin maraña. Con 60 o menos, con los nombres |
| Más de 150 | Grafo | Las cuerdas entre grupos se probaron y se quitaron el 2026-10-30: no convencían |

La red de una persona en anillos («Su red») se probó y se quitó el 2026-10-30:
no convencía; con alguien elegido, el grafo ya agranda a quien más se une. Las
vistas usan los mismos nodos, uniones y colores que el grafo,
así que los recortes y filtros de cada página valen igual.

Ideas que quedan (del análisis del 2026-10-29): la red sobre el plano del
clúster para los asientos, el calendario de coincidencias (horas × días) al
elegir a alguien, y el diagrama de cuerdas por kickoff o campus además de por
comunidad.

## Cambios del 2026-10-30 (pedidos por Alberto)

- La Red y Amigos (antes «Asientos») se abren con **tu propia red** elegida; la
  de todo el campus, quitando a la persona (la × en la Red, vaciar el buscador
  en Amigos). En Amigos, «Mi red» vuelve a la tuya.
- **Con alguien elegido, el tamaño de cada burbuja es su unión con esa persona**
  (correcciones en los dos sentidos, o la cercanía), en proporción lineal a la
  más fuerte: si alguien te ha corregido 7 veces y los demás 1, sale mucho más
  grande (`radiiAround` en `ForceGraph.tsx`). Sin nadie elegido, como antes.
- **El grosor de las uniones** va en relación a la más fuerte de lo que se ve,
  de 0,5 a 4 píxeles (`widthOf`): antes, unas pocas tapaban el grafo.
- La línea de «se ven N de M» va debajo del dibujo: encima tapaba el selector
  de vista en el móvil.
