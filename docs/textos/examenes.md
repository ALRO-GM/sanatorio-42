# Textos: examenes

Generado desde `apps/web/src/shared/i18n/textos/examenes.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

25 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `exams.title` | Título de la página de exámenes | features/exams/ExamsPage | Exámenes | Exams | Exàmens | Azterketak |
| `exams.stats` | Apartado de estadísticas | features/exams/ExamsPage | Estadísticas del campus | Campus statistics | Estadístiques del campus | Campuseko estatistikak |
| `exams.backfill` | Progreso de la copia de intentos antiguos | features/exams/ExamsPage | Copiando los intentos antiguos de 42: {done} de {total} exámenes. Las cifras se irán completando. | Copying old attempts from 42: {done} of {total} exams. Figures will fill in. | Copiant els intents antics de 42: {done} de {total} exàmens. | 42ko saiakera zaharrak kopiatzen: {done} / {total} azterketa. |
| `exams.noStats` | Sin datos de exámenes | features/exams/ExamsPage | Aún no hay intentos de examen copiados en este campus. | No exam attempts copied for this campus yet. | Encara no hi ha intents d’examen copiats en aquest campus. | Oraindik ez dago azterketa saiakerarik kopiatuta campus honetan. |
| `exams.circles` | Cuánto se tarda en cada círculo | features/exams/ExamsPage | Cuánto se tarda en cada círculo | How long each circle takes | Quant es triga en cada cercle | Zirkulu bakoitzean zenbat irauten den |
| `exams.circlesHint` | Cómo se calcula | features/exams/ExamsPage | Días desde que se empieza (o desde el círculo anterior) hasta validarlo, sin los casos extremos. Solo de la gente de la que se saben los hitos. | Days from the start (or the previous circle) until it is validated, without extreme cases. Only people whose milestones are known. | Dies des de l’inici (o el cercle anterior) fins a validar-lo, sense casos extrems. | Hasieratik (edo aurreko zirkulutik) balidatu arteko egunak, muturreko kasurik gabe. |
| `exams.days` | Número de días | features/exams/ExamsPage | {n} días | {n} days | {n} dies | {n} egun |
| `exams.range` | La mitad central de la gente tarda entre esos días | features/exams/ExamsPage | la mitad, entre {p25} y {p75} · {n} personas | half of them between {p25} and {p75} · {n} people | la meitat, entre {p25} i {p75} · {n} persones | erdiak, {p25} eta {p75} artean · {n} pertsona |
| `exams.none` | No hay exámenes hoy | features/exams/ExamsPage | Hoy no hay ningún examen en tu campus. | There is no exam on your campus today. | Avui no hi ha cap examen al teu campus. | Gaur ez dago azterketarik zure campusean. |
| `exams.live` | Examen en curso | features/exams/ExamsPage | En marcha | Live | En marxa | Martxan |
| `exams.next` | Examen de hoy aún no empezado | features/exams/ExamsPage | Hoy | Today | Avui | Gaur |
| `exams.updated` | Hora de las últimas notas | features/exams/ExamsPage | notas de las {time} | marks as of {time} | notes de les {time} | {time}ko notak |
| `exams.track.all` | Plan: todos | features/exams/ExamsPage | Todos | All | Tots | Denak |
| `exams.track.classic` | Plan clásico | features/exams/ExamsPage | Plan clásico | Classic track | Pla clàssic | Plan klasikoa |
| `exams.track.next` | Plan nuevo | features/exams/ExamsPage | Plan nuevo | New track | Pla nou | Plan berria |
| `exams.circleFilter` | Filtro de círculo | features/exams/ExamsPage | Círculo | Circle | Cercle | Zirkulua |
| `exams.allCircles` | Todos los círculos | features/exams/ExamsPage | Todos los círculos | All circles | Tots els cercles | Zirkulu guztiak |
| `exams.nobody` | No se sabe quién se ha apuntado | features/exams/ExamsPage | Aún no se sabe quién está apuntado. | Who is signed up is not known yet. | Encara no se sap qui s’hi ha apuntat. | Oraindik ez da jakiten nor dagoen izena emanda. |
| `exams.noAttempt` | Aún sin entregar | features/exams/ExamsPage | Sin entregar todavía | Nothing handed in yet | Sense entregar encara | Oraindik ezer entregatu gabe |
| `exams.avg` | Intentos de media | features/exams/ExamsPage | {n} intentos de media | {n} attempts on average | {n} intents de mitjana | {n} saiakera batez beste |
| `exams.people` | Cuánta gente aprobó | features/exams/ExamsPage | {passed} aprobados de {people} | {passed} passed out of {people} | {passed} aprovats de {people} | {passed} gainditu, {people}tik |
| `exams.toPass` | En qué intento se aprueba | features/exams/ExamsPage | Aprobado al intento… | Passed on attempt… | Aprovat a l’intent… | Gainditua saiakeran… |
| `exams.byAttempt` | Datos por intento | features/exams/ExamsPage | Cada intento | Each attempt | Cada intent | Saiakera bakoitza |
| `exams.attempt` | Número de intento | features/exams/ExamsPage | {n}.º intento | Attempt {n} | {n}r intent | {n}. saiakera |
| `exams.attemptLine` | Nota media, porcentaje de aprobados y personas de un intento | features/exams/ExamsPage | nota media {mark} · aprueba el {pct} % · {n} personas | average mark {mark} · {pct}% pass · {n} people | nota mitjana {mark} · aprova el {pct} % · {n} persones | batez besteko nota {mark} · %{pct} gainditzen du · {n} pertsona |
