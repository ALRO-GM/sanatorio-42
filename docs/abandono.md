# Abandono de la piscina

Pedido por Alberto el 2026-11-06: estimar quién de los piscineros ha dejado la
piscina, con qué probabilidad y cuándo, y con qué se relaciona (horas en los
ordenadores, aislamiento, correcciones, proyectos aprobados).

- **Dónde**: pestaña **Abandono** en Campus (`#/abandono`, modo normal).
- **Quién la ve**: quien administra, la vista sin límites del dueño y, si el
  panel lo permite (permiso `abandono`, cerrado de entrada), los piscineros.
  Un estudiante, no.
- **Código**: API `GET /stats/dropout` (`modules/stats/dropout.service.ts`,
  reglas en `dropout.rules.ts`, contrato `packages/contracts/src/dropout.ts`);
  web `features/dropout/`.

## De dónde salen los datos

Todo de la réplica, sin pedir nada a 42:

| Dato | De dónde |
| --- | --- |
| Quién es de la piscina y cuándo empezó | `pool_members`, en la piscina elegida (`samePool`: a menos de una semana del primer día) |
| Horas de cada día en los ordenadores | `seat_sessions` (el historial de los puestos), por día en la hora del campus. Cada sesión cuenta desde que se vio y como mucho 12 h, como en la red de asientos |
| Aislamiento y con cuánta gente se sentó cerca | La red de asientos (`seatingOf`) de todo el campus en la piscina: la parte de sus horas sin nadie cerca |
| Correcciones hechas y recibidas | `corrections` del campus en la piscina |
| Proyectos aprobados | Los 16 que cuentan para el Avance de la piscina (Shell 00 … C 13) |

La piscina, sin elegirla, es la del día en que empezó más gente
(`poolAnchorOf`). Se puede elegir otra entre los días en que empezaron 5
personas o más.

## Cuándo se da por abandonado

Un día cuenta como venido con 15 minutos o más en un ordenador. El día de hoy
no cuenta como falta: aún no ha acabado. Se miran los días seguidos sin venir
desde el último que vino hasta ayer.

- **Confirmado** (`gone`, 100 %):
  - falta el viernes, el sábado, el domingo y el lunes siguiente. El viernes
    es el examen y casi todo el mundo entra;
  - o falta cinco días entre semana seguidos.
- **Probabilidad**, si no está confirmado: `1 − e^(−λ)`. Cada día que falta suma a λ:
  - **entre semana**: 0,35 más hasta 0,5 según las horas que venía de media
    entre semana (8 h o más, el 0,5 entero). Quien venía una hora al día y
    falta un día puede volver mañana; quien venía diez, es más raro;
  - **viernes**: 1 más, por el examen;
  - **sábado o domingo**: 0,4 por la parte de fines de semana que solía venir.
    Quien no venía en fin de semana no suma nada: faltar el fin de semana no es
    señal de nada.
- **Estado**:

  | Estado | Cuándo |
  | --- | --- |
  | `gone` | Abandono confirmado |
  | `likely` | Probable: 70 % o más |
  | `doubt` | En duda: del 35 % al 70 % |
  | `active` | Sigue viniendo: menos del 35 % |
  | `never` | No ha venido nunca, y ya ha pasado algún día entre semana |

  Quien vino el día del examen final (día 25) o después terminó la piscina:
  `active`, sin riesgo. Las faltas se miran hasta el lunes siguiente (día 28).
- **Cuándo lo dejó**: entre su último día y el siguiente
  (`leftBetween`; «del jueves 8 al viernes 9»), nunca un solo día. Solo con
  el abandono confirmado o probable. La semana de piscina (1–4) es la de ese
  primer día sin venir.
- **Razones** que se enseñan:
  - `missedWeekend` y `missedWeek`: las dos confirmaciones;
  - `missedFriday`: faltó al viernes de examen;
  - `heavyUser` y `lightUser`: venía 6 h o más, o 2 h o menos;
  - `weekendOnly`: solo ha faltado el fin de semana;
  - `recent`: vino hoy o ayer;
  - `finished`: llegó al examen final.

## Factores y correlaciones

De cada piscinero (`DropoutFactors`):
- **abandono**: `gone` (0 o 1) y `risk` (0–100);
- **horas**: `totalHours`, `avgHours` (media de los días que vino) y
  `firstWeekHours`;
- **asistencia**: `attendance` (% de días entre semana que vino, hasta que lo
  dejó) y `weekendShare`;
- **compañía**: `isolation` (% de horas sin nadie cerca) y `partners`;
- **correcciones**: `given` y `received`;
- **proyectos**: `passed`.

- **Tabla de correlaciones**: Pearson entre cada pareja de factores, de −100 a
  100, con la gente que ha venido alguna vez (`sample`). La web enseña |r| de 0
  a 100 y el sentido aparte. Al elegir dos factores, la gráfica de dispersión
  con un punto por persona.
- **Factores comunes**:
  - `pairs`: cada pareja de factores (sin `gone` ni `risk`) se junta en uno,
    con la media de los dos normalizados, cada uno en el sentido en que va con
    el abandono. Se dice cuánto se parecen entre ellos, la relación de cada
    uno con el abandono confirmado, la de los dos juntos y lo que se gana al
    juntarlos.
  - `groups`: los factores unidos por |r| ≥ 60 entre ellos, y la relación del
    grupo junto con el abandono.

Con pocas personas, o con pocos abandonos confirmados, las correlaciones dicen
poco; la web enseña con cuánta gente se han hecho.

## Lo que no hace

- No avisa a nadie ni cambia nada: solo mide.
- No sabe de quien trabaja con su portátil fuera de los ordenadores del
  campus: para la piscina, venir es sentarse en un puesto.
- No mira piscinas de antes de que existiera el historial de puestos
  (`seat_sessions`, desde octubre de 2026).
- Se calcula por campus y piscina y se guarda 10 minutos.
