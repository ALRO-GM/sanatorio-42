# Textos: examenes

Generado desde `apps/web/src/shared/i18n/textos/examenes.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

36 textos. «—» es que falta la traducción: sale en español.

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
| `exams.none` | No hay exámenes en las próximas 24 horas | features/exams/ExamsPage | No hay ningún examen en tu campus en las próximas 24 horas. | There is no exam on your campus in the next 24 hours. | No hi ha cap examen al teu campus en les properes 24 hores. | Ez dago azterketarik zure campusean hurrengo 24 orduetan. |
| `exams.live` | Examen en curso | features/exams/ExamsPage, features/exams/ExamsTour | En marcha | Live | En marxa | Martxan |
| `exams.next` | Examen que empieza hoy (hora del campus) y aún no ha empezado | features/exams/ExamsPage | Hoy | Today | Avui | Gaur |
| `exams.tomorrow` | Examen que empieza mañana (hora del campus) | features/exams/ExamsPage | Mañana | Tomorrow | Demà | Bihar |
| `exams.updated` | Hora de las últimas notas | features/exams/ExamsPage | notas de las {time} | marks as of {time} | notes de les {time} | {time}ko notak |
| `exams.endsIn` | Cuenta atrás hasta que acaba el examen en marcha | features/exams/ExamsPage | Acaba en {time} | Ends in {time} | Acaba en {time} | {time} barru amaitzen da |
| `exams.endsInLabel` | Nombre del reloj de lo que falta para acabar el examen | features/exams/ExamsPage | Tiempo hasta que acaba el examen | Time until the exam ends | Temps fins que acaba l’examen | Azterketa amaitu arteko denbora |
| `exams.nextRefresh` | Cuenta atrás hasta que la lista y las notas se ponen al día solas | features/exams/ExamsPage | Se pone al día en {time} | Updates in {time} | S’actualitza en {time} | {time} barru eguneratzen da |
| `exams.nextRefreshLabel` | Nombre del reloj de lo que falta para el siguiente refresco | features/exams/ExamsPage | Tiempo hasta el siguiente refresco | Time until the next update | Temps fins a la propera actualització | Hurrengo eguneraketara arteko denbora |
| `exams.refresh` | Botón para pedir ya la lista y las notas (una vez por minuto para todo el campus) | features/exams/ExamsPage | Refrescar | Refresh | Actualitza | Freskatu |
| `exams.refreshIn` | Cuánto falta para poder volver a pulsar Refrescar | features/exams/ExamsPage | Puedes volver a refrescar en {time} | You can refresh again in {time} | Pots tornar a actualitzar en {time} | {time} barru freskatu dezakezu berriro |
| `exams.status.pending` | Estado: apuntado al examen pero aún sin entrar | features/exams/ExamsPage | Sin empezar | Not started | Sense començar | Hasi gabe |
| `exams.status.inProgress` | Estado: haciendo el examen ahora | features/exams/ExamsPage | Dentro | In the exam | Dins | Barruan |
| `exams.status.passed` | Estado: examen cerrado con 100 o más | features/exams/ExamsPage | Aprobado | Passed | Aprovat | Gaindituta |
| `exams.status.failed` | Estado: examen cerrado sin llegar a 100 | features/exams/ExamsPage | Suspenso | Failed | Suspès | Ez gaindituta |
| `exams.track.all` | Plan: todos | features/exams/ExamsPage | Todos | All | Tots | Denak |
| `exams.track.classic` | Plan clásico | features/exams/ExamsPage | Plan clásico | Classic track | Pla clàssic | Plan klasikoa |
| `exams.track.next` | Plan nuevo | features/exams/ExamsPage | Plan nuevo | New track | Pla nou | Plan berria |
| `exams.circleFilter` | Filtro de círculo | features/exams/ExamsPage | Círculo | Circle | Cercle | Zirkulua |
| `exams.allCircles` | Todos los círculos | features/exams/ExamsPage | Todos los círculos | All circles | Tots els cercles | Zirkulu guztiak |
| `exams.nobody` | No se sabe quién se ha apuntado | features/exams/ExamsPage | Aún no se sabe quién está apuntado. | Who is signed up is not known yet. | Encara no se sap qui s’hi ha apuntat. | Oraindik ez da jakiten nor dagoen izena emanda. |
| `exams.unknownExam` | Grupo de quien no se sabe qué examen le toca | features/exams/ExamsPage | Examen por saber | Exam not known yet | Examen per saber | Azterketa jakiteke |
| `exams.avg` | Intentos de media | features/exams/ExamsPage | {n} intentos de media | {n} attempts on average | {n} intents de mitjana | {n} saiakera batez beste |
| `exams.people` | Cuánta gente aprobó | features/exams/ExamsPage | {passed} aprobados de {people} | {passed} passed out of {people} | {passed} aprovats de {people} | {passed} gainditu, {people}tik |
| `exams.toPass` | En qué intento se aprueba | features/exams/ExamsPage, features/exams/ExamsTour | Aprobado al intento… | Passed on attempt… | Aprovat a l’intent… | Gainditua saiakeran… |
| `exams.byAttempt` | Datos por intento | features/exams/ExamsPage | Cada intento | Each attempt | Cada intent | Saiakera bakoitza |
| `exams.attempt` | Número de intento | features/exams/ExamsPage | {n}.º intento | Attempt {n} | {n}r intent | {n}. saiakera |
| `exams.attemptLine` | Nota media, porcentaje de aprobados y personas de un intento | features/exams/ExamsPage | nota media {mark} · aprueba el {pct} % · {n} personas | average mark {mark} · {pct}% pass · {n} people | nota mitjana {mark} · aprova el {pct} % · {n} persones | batez besteko nota {mark} · %{pct} gainditzen du · {n} pertsona |
