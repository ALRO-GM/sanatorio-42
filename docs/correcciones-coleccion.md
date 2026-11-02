# El álbum de correcciones

«Mis correcciones», en el tablón (`apps/web/src/features/doubts/CorrectionGraph.tsx`,
reglas en `corrections.ts`; API en `apps/api/src/modules/collection/`). Pedido
por Alberto (2026-11-01): la vista era un holy graph de medallas por colores,
«sosa». El objetivo es que cada cual quiera tener **al menos una corrección de
cada proyecto que puede corregir** y que le pique encontrar las que le faltan.

## La teoría, en corto

| Idea | Qué dice | Cómo se usa aquí |
| --- | --- | --- |
| **Álbum de cromos por sets** | Coleccionar engancha cuando el conjunto es finito y se ve entero: los huecos en silueta dicen qué falta y completar un set es un hito propio (álbumes de Panini, Pokédex) | Cada proyecto que puedes corregir es un cromo; cada círculo, una colección. Lo que te falta sale en silueta (a trazos, con su nombre: hay que saber qué buscar) |
| **Efecto de progreso dotado** (Nunes y Drèze, 2006) | Con parte del camino ya hecho se termina más a menudo | El álbum empieza con lo que ya corregiste: tu % real desde el primer día. Nada inventado: el progreso es el de verdad |
| **Gradiente de meta** (Hull; Kivetz, 2006) | Cuanto más cerca se ve el final, más esfuerzo | «Siguiente objetivo»: la colección a la que **menos** le falta («Te falta 1 para completar el círculo 2: minitalk») y el cromo más cercano a subir de nivel |
| **Octalysis** (Yu-kai Chou) | Ocho motores: sentido, desarrollo/logro, creatividad, posesión, influencia social, escasez, curiosidad, pérdida | Logro (colecciones y niveles), posesión (tu álbum), influencia social (comparación con tu gente), escasez (rareza), curiosidad (siluetas). **No** usamos la pérdida ni la evitación (white hat frente a black hat) |
| **Rareza de logros** (Steam, Xbox, PlayStation) | Enseñar qué % de jugadores lo tiene hace valioso lo difícil y da un objetivo a quien ya tiene lo fácil | Rareza por proyecto: de quien lo puede corregir (lo aprobó), qué % lo ha corregido alguna vez. Común, poco común, raro, legendario; sin etiqueta con menos de 5 personas |
| **Niveles de insignia** (Duolingo, Strava) | Una insignia que sube de nivel sigue motivando después de conseguirla | Los niveles de siempre (1, 3, 5, 10 correcciones): bronce, plata, oro y maestría, en el borde, los puntos y el brillo del cromo |
| **Recompensa al completar** | El cierre de un set merece un momento propio | Al completar una colección, un aviso y los cromos dan un salto; una sola vez (se recuerda en el navegador) y sin animación con movimiento reducido |
| **Comparación social** (Festinger) | Compararse con gente parecida motiva; con gente lejana, desanima | Puesto entre tu gente cercana (las 10 con las que más cerca y más tiempo te has sentado, como en Amigos; si faltan, con las que más te has corregido), tu kickoff, tu círculo y todo el campus |

## Lo que se evita (y por qué)

- **Rachas y pérdida**: nada de «vas a perder tu racha» ni cromos que caducan.
  Un cromo conseguido no se pierde aunque el proyecto se retire. Corregir
  depende de que alguien pida corrección: castigar no poder sería injusto.
- **Presión tóxica**: el ranking va en el modo de datos, abierto solo para
  quien lo elige; en el normal, un resumen con tu puesto; en el simplificado,
  nada. Los puestos solo cuentan lo que se ve: nada de «eres el último» en rojo.
- **Dark patterns**: sin recompensas variables (cajas sorpresa), sin cuentas
  atrás, sin notificaciones para volver, sin XP por corregir (la XP sigue las
  reglas de `AGENTS.md`). Nada empuja a corregir peor ni más rápido.
- **Retos imposibles**: los exámenes no son cromos (no se corrigen entre peers)
  y lo retirado del campus (nadie lo corrige desde hace un año) no deja hueco.
  Lo que aún no has aprobado sale con candado y no cuenta para el %.

**Pros**: da un motivo concreto para corregir lo que menos se corrige (que es
justo lo que más falta le hace al campus) y se basa en datos que ya tenemos.
**Contras**: la rareza y los puestos necesitan la copia de correcciones al
día; con un campus pequeño la rareza dice poco (por eso el mínimo de 5), y
corregir no siempre está en tu mano (por eso no hay rachas).

## Modos

| Modo | Qué enseña |
| --- | --- |
| Simplificado | El álbum (colecciones, cromos, siluetas, niveles), tu progreso y la celebración |
| Normal | Además, el siguiente objetivo (colección más cercana, cromo más raro a tu alcance, nivel más cercano) y cómo vas en cada grupo |
| Datos | Además, la rareza de cada cromo y la clasificación de completitud por grupo |

## Las cuentas (API: `GET /corrections/collection`, `docs/api.md`)

- **Cromo**: proyecto del plan (los dos planes del common core; en la piscina,
  sus proyectos) que la persona aprobó, sin exámenes; cuenta si sigue vivo en
  el campus o si ya lo corrigió. Completitud = cromos con al menos una
  corrección / cromos posibles.
- **Grupos**: cercanía como en la Red (correcciones entre las dos, en los dos
  sentidos); kickoff, la misma que el Avance; círculo, el de la réplica sin
  preguntar a 42; campus, tu mundo (estudiantes o piscineros).
- **Quién sale**: `seesFor` (`core/audience.ts`). Quien no se ve no sale ni
  cuenta, tampoco en la rareza; los puestos, sin huecos.
- **Cuota de 42**: cero. Todo es de la réplica y de la copia de correcciones;
  lo del campus se calcula una vez cada 10 minutos.
