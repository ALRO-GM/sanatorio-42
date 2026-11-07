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

Todo de la réplica: la página no pide nada a 42. Lo de las piscinas pasadas
lo copia de fondo el historial de piscinas (abajo).

| Dato | De dónde |
| --- | --- |
| Quién es de la piscina y cuándo empezó | `pool_members` (los de ahora) y `piscine_members` (el historial), en la piscina elegida (`samePool`: a menos de una semana del primer día) |
| Horas de cada día en los ordenadores | `seat_sessions` (la copia de puestos en vivo) y `piscine_sessions` (el historial), sin repetir sesión, por día en la hora del campus. Cada sesión cuenta como mucho 12 h, como en la red de asientos |
| Aislamiento y con cuánta gente se sentó cerca | La red de asientos (`seatingOf`) de todo el campus en la piscina, con las dos fuentes: la parte de sus horas sin nadie cerca |
| Correcciones hechas y recibidas | `corrections` del campus y `piscine_activity` (`given`, `received`), sin repetir corrección |
| Exámenes | `exam_attempts` y las filas de los exámenes de la piscina, y `piscine_activity` (`exam`) |
| Proyectos aprobados | Los 16 que cuentan para el Avance de la piscina (Shell 00 … C 13), de la réplica y de `piscine_activity` (`passed`) |

La piscina, sin elegirla, es la más reciente de las 10 últimas: los días en
que empezaron 20 personas o más. Se puede elegir otra. Hasta el 2026-11-07 era
la del día en que empezó más gente; con los tres años del historial esa era
una de 2024, sin nada copiado, y la pestaña salía vacía.

## El historial de piscinas

Pedido por Alberto el 2026-11-06 para ver y comparar las últimas 10 piscinas
de Madrid. De las piscinas pasadas no había nada:
- `pool_members` guarda 60 días (y decide quién ve a quién);
- el historial de puestos es solo de alumnos del 42cursus;
- las correcciones de la piscina se copian de 90 días.

Lo copia `replica/piscine-history.ts`, solo para Madrid. Es un trabajo de
volumen (`piscines` en `BULK_ORDER`, detrás de las correcciones y antes del
historial de asientos), con el sitio guardado en `sync_state`
(`piscine-history:22`):

1. **Quién**: quién empezó la C Piscine en los últimos tres años
   (`cursus/9/cursus_users`). Luego, cada día, los de los últimos 60. Las
   piscinas son los días con 20 personas o más empezando; se miran las 10 últimas.
2. **Cada piscina**, de la más nueva a la más vieja:
   - sus sesiones cerradas en los puestos (`campus/22/locations` del mes),
     solo de sus piscineros;
   - sus correcciones (`scale_teams` de la C Piscine).

   La que está en curso se completa una vez al día, hasta 6 h antes de ahora.
   Hasta el 2026-11-07 se repasaba cada minuto (su final se movía con el
   reloj): gastó 7 300 peticiones en un día sin pasar a las piscinas viejas.
3. **Lo aprobado y los intentos de examen** de cada proyecto de la piscina
   (`projects_users`); luego, cada día, lo que ha cambiado.

Va en tablas propias (`piscine_members`, `piscine_sessions`,
`piscine_activity`, migración 85), para no cambiar la red de asientos ni quién
ve a quién. La primera vez son unas 2 000 peticiones, con la cuota que sobra:
hasta que acaba, las piscinas viejas salen sin horas (la comparación lo
avisa).

## Comparar piscinas

`GET /stats/dropout/compare?starts=…` con los mismos ajustes: cada piscina
elegida y todas juntas (`summarize`, por día de piscina y no por fecha):
- **cuánta gente sigue** al acabar cada día, de 0 a 28, sin los confirmados
  (y, aparte, sin los probables). Quien no vino nunca cuenta como que lo dejó
  el día 0;
- **abandonos** por semana de piscina y por cambio de día de la semana;
- **cómo eran** quienes lo dejaron (confirmados y probables) frente a quienes
  siguen: medias de horas, asistencia, aislamiento, correcciones, aprobados y
  día medio en que lo dejaron;
- las **horas copiadas** de cada una (`sessionHours`): con 0, aún faltan datos.

## Cuándo se da por abandonado

Un día cuenta como venido con 15 minutos o más en un ordenador, **o con un
examen o una corrección ese día** (2026-11-06). Hacen falta las dos cosas
porque de los piscineros no hay historial de puestos: el historial copiado
hacia atrás es solo de alumnos del 42cursus, así que solo está lo que ve la
copia en vivo de cada 2 minutos. Los puestos de examen no siempre salen ahí.
- **Examen**: los intentos de los exámenes de la piscina (`exam_attempts`) y
  sus filas de proyecto, por la fecha de su último cambio.
- **Corrección**: en la piscina se corrige en persona, así que cuentan las
  hechas y las recibidas.

Quien está hoy en el examen de la piscina (o lo ha hecho) sale con riesgo 0 y
la razón `inExam`. El día de hoy no cuenta como falta: aún no ha acabado. Se miran los días seguidos sin venir
desde el último que vino hasta ayer.

- **Confirmado** (`gone`, 100 %):
  - falta el viernes, el sábado, el domingo y el lunes siguiente. El viernes
    es el examen y casi todo el mundo entra;
  - o falta cinco días entre semana seguidos.
- **Probabilidad**, si no está confirmado: `1 − e^(−λ)`. Estos son los valores
  de fábrica; todos se pueden cambiar en la web (ver «Ajustar el cálculo»).
  Cada día que falta suma a λ:
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
  - `finished`: llegó al examen final;
  - `inExam`: está hoy en el examen.

## Ajustar el cálculo

Pedido por Alberto el 2026-11-06: poder cambiar todo lo que se tiene en
cuenta y ver al momento cómo se reorganiza. En la página, el bloque **Ajustar
el cálculo** tiene un deslizador por ajuste (`DropoutTuning`):
- lo que pesa faltar entre semana: `weekdayBase` y `weekdayHours`, con
  `fullDayHours` como lo que cuenta como día entero;
- lo que pesa faltar el viernes (`fridayExtra`) y el fin de semana
  (`weekendWeight`);
- cuándo se confirma: `weekMissed` (días entre semana seguidos) y
  `fridayToMonday`;
- los umbrales: `likely` y `doubt`.

Además, un **peso por factor**, de −2 a 2:
- horas totales, horas al día y horas de la primera semana;
- asistencia y parte en fin de semana;
- aislamiento y gente cerca;
- correcciones hechas y recibidas;
- aprobados.

Cada peso suma a λ lo que la persona se aparta de la media de su piscina, en
desviaciones (`profileLambda`). Con peso positivo, tener más sube el riesgo; con
negativo, lo baja. Por ejemplo, aislamiento a +1 sube el riesgo a quien se
sienta solo, y aprobados a −1 se lo baja a quien va adelantado. Con
pesos, alguien que viene cada día puede tener riesgo, pero no «cuándo lo
dejó»: eso solo sale con algún día sin venir. De fábrica, todos a 0.

Los ajustes van en la consulta (solo los que cambian) y se guardan en el
navegador. Las horas y los factores se guardan 10 minutos en el servidor:
mover un deslizador solo rehace el riesgo, los estados, los totales y las
correlaciones, y la web lo pide 250 ms después de soltarlo.

## Totales

Arriba, de la gente que ves (`counts`):
- piscineros;
- abandonaron, probables y en duda;
- siguen, no vinieron nunca y en el examen.

Cada cifra filtra la tabla. Con los ajustes cambian al momento.

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
- Solo mira las 10 últimas piscinas, y el historial solo se copia de Madrid.
- Se calcula por campus y piscina y se guarda 10 minutos.
