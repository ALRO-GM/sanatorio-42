# Textos: examenes

Generado desde `apps/web/src/shared/i18n/textos/examenes.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

58 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `exams.title` | Título de la página de exámenes | features/exams/ExamsPage | Exámenes | Exams | Exàmens | Azterketak |
| `exams.stats` | Apartado de estadísticas | features/exams/ExamStatsPanel | Estadísticas del campus | Campus statistics | Estadístiques del campus | Campuseko estatistikak |
| `exams.backfill` | Progreso de la copia de intentos antiguos | features/exams/ExamStatsPanel | Copiando los intentos antiguos de 42: {done} de {total} exámenes. Las cifras se irán completando. | Copying old attempts from 42: {done} of {total} exams. Figures will fill in. | Copiant els intents antics de 42: {done} de {total} exàmens. | 42ko saiakera zaharrak kopiatzen: {done} / {total} azterketa. |
| `exams.noStats` | Sin datos de exámenes | features/exams/ExamStatsPanel | Aún no hay intentos de examen copiados en este campus. | No exam attempts copied for this campus yet. | Encara no hi ha intents d'examen copiats en aquest campus. | Oraindik ez dago azterketa saiakerarik kopiatuta campus honetan. |
| `exams.circles` | Cuánto se tarda en cada círculo | features/exams/ExamStatsPanel | Cuánto se tarda en cada círculo | How long each circle takes | Quant es triga en cada cercle | Zirkulu bakoitzean zenbat irauten den |
| `exams.circlesHint` | Cómo se calcula | features/exams/ExamStatsPanel | Días desde que se empieza (o desde el círculo anterior) hasta validarlo, sin los casos extremos. Solo de la gente de la que se saben los hitos. | Days from the start (or the previous circle) until it is validated, ignoring outliers. Only people whose milestones are known. | Dies des de l'inici (o el cercle anterior) fins a validar-lo, sense casos extrems. | Hasieratik (edo aurreko zirkulutik) balidatu arteko egunak, muturreko kasurik gabe. |
| `exams.days` | Número de días | features/exams/ExamStatsPanel | {n} días | {n} days | {n} dies | {n} egun |
| `exams.range` | La mitad central de la gente tarda entre esos días | features/exams/ExamStatsPanel | la mitad, entre {p25} y {p75} · {n} personas | half of them between {p25} and {p75} · {n} people | la meitat, entre {p25} i {p75} · {n} persones | erdiak, {p25} eta {p75} artean · {n} pertsona |
| `exams.none` | No hay exámenes en las próximas 24 horas | features/exams/ExamsPage | No hay ningún examen en tu campus en las próximas 24 horas. | There is no exam on your campus in the next 24 hours. | No hi ha cap examen al teu campus en les properes 24 hores. | Ez dago azterketarik zure campusean hurrengo 24 orduetan. |
| `exams.live` | Examen en curso | features/exams/ExamsPage, features/exams/ExamsTour | En marcha | Live | En marxa | Martxan |
| `exams.next` | Examen que empieza hoy (hora del campus) y aún no ha empezado | features/exams/ExamsPage | Hoy | Today | Avui | Gaur |
| `exams.tomorrow` | Examen que empieza mañana (hora del campus) | features/exams/ExamsPage | Mañana | Tomorrow | Demà | Bihar |
| `exams.updated` | Hora de las últimas notas | features/exams/ExamsPage | notas de las {time} | marks as of {time} | notes de les {time} | {time}ko notak |
| `exams.endsIn` | Cuenta atrás hasta que acaba el examen en marcha | features/exams/ExamsPage | Acaba en {time} | Ends in {time} | Acaba en {time} | {time} barru amaitzen da |
| `exams.endsInLabel` | Nombre del reloj de lo que falta para acabar el examen | features/exams/ExamsPage | Tiempo hasta que acaba el examen | Time until the exam ends | Temps fins que acaba l'examen | Azterketa amaitu arteko denbora |
| `exams.nextRefresh` | Cuenta atrás hasta que la lista y las notas se ponen al día solas | features/exams/ExamsPage | Se pone al día en {time} | Updates in {time} | S'actualitza en {time} | {time} barru eguneratzen da |
| `exams.nextRefreshLabel` | Nombre del reloj de lo que falta para el siguiente refresco | features/exams/ExamsPage | Tiempo hasta el siguiente refresco | Time until the next update | Temps fins a la propera actualització | Hurrengo eguneraketara arteko denbora |
| `exams.refreshIn` | Cuánto falta para poder volver a pulsar Actualizar | features/exams/ExamsPage | Podrás actualizar otra vez en {time} | You can refresh again in {time} | Podràs tornar a actualitzar en {time} | {time} barru berriro eguneratu ahal izango duzu |
| `exams.status.pending` | Estado: apuntado al examen pero aún sin entrar | features/exams/ExamsPage | Sin empezar | Not started | Sense començar | Hasi gabe |
| `exams.status.inProgress` | Estado: haciendo el examen ahora | features/exams/ExamsPage | Haciéndolo | Taking it | Fent-lo | Egiten |
| `exams.status.passed` | Estado: examen cerrado con 100 o más | features/exams/ExamsPage | Aprobado | Passed | Aprovat | Gaindituta |
| `exams.status.failed` | Estado: examen cerrado sin llegar a 100 | features/exams/ExamsPage | Suspenso | Failed | Suspès | Ez gaindituta |
| `exams.track.all` | Plan: todos | features/exams/ExamsPage | Todos | All | Tots | Denak |
| `exams.track.classic` | Plan clásico | features/exams/ExamsPage | Plan clásico | Classic plan | Pla clàssic | Plan klasikoa |
| `exams.track.next` | Plan nuevo | features/exams/ExamsPage | Plan nuevo | New plan | Pla nou | Plan berria |
| `exams.circleFilter` | Filtro de círculo | features/exams/ExamsPage | Círculo | Circle | Cercle | Zirkulua |
| `exams.allCircles` | Todos los círculos | features/exams/ExamsPage | Todos los círculos | All circles | Tots els cercles | Zirkulu guztiak |
| `exams.nobody` | No se sabe quién se ha apuntado | features/exams/ExamsPage | Aún no se sabe quién está apuntado. | Who is signed up is not known yet. | Encara no se sap qui s'hi ha apuntat. | Oraindik ez da jakiten nor dagoen izena emanda. |
| `exams.unknownExam` | Grupo de quien no se sabe qué examen le toca | features/exams/ExamsPage | Examen por saber | Exam not known yet | Examen per saber | Azterketa jakiteke |
| `exams.avg` | Intentos de media | features/exams/ExamStatsPanel | {n} intentos de media | {n} attempts on average | {n} intents de mitjana | {n} saiakera batez beste |
| `exams.people` | Cuánta gente aprobó, y qué parte es | features/exams/ExamStatsPanel | Aprobaron {passed} de {people} · {pct} | {passed} passed out of {people} · {pct} | Han aprovat {passed} de {people} · {pct} | {passed} gainditu, {people}tik · {pct} |
| `exams.toPass` | En qué intento se aprueba | features/exams/ExamStatsPanel, features/exams/ExamsTour | Aprobado al intento… | Passed on attempt… | Aprovat a l'intent… | Gainditua saiakeran… |
| `exams.byAttempt` | Desplegable con los datos de cada intento | features/exams/ExamStatsPanel | Cada intento: nota mediana, aprobados y personas | Each attempt: median mark, passes and people | Cada intent: nota mediana, aprovats i persones | Saiakera bakoitza: nota mediana, gaindituak eta pertsonak |
| `exams.attempt` | Número de intento | features/exams/ExamStatsPanel | {n}.º intento | Attempt {n} | {n}r intent | {n}. saiakera |
| `exams.attemptLine` | Nota mediana, porcentaje de aprobados y personas de un intento | features/exams/ExamStatsPanel | nota mediana {mark} · aprueba el {pct} % · {n} personas | median mark {mark} · {pct}% pass · {n} people | nota mediana {mark} · aprova el {pct} % · {n} persones | nota mediana {mark} · %{pct} gainditzen du · {n} pertsona |
| `exams.trackFilter` | Estadísticas: desplegable del plan que sigue la gente | features/exams/ExamStatsPanel | Plan de la gente | People's plan | Pla de la gent | Jendearen plana |
| `exams.plan.all` | Estadísticas: gente de los dos planes | features/exams/ExamStatsPanel | Toda la gente | Everyone | Tothom | Jende guztia |
| `exams.plan.classic` | Estadísticas: gente del common core antiguo, en C | features/exams/ExamStatsPanel | Core en C | C core | Core en C | C core-a |
| `exams.plan.next` | Estadísticas: gente del common core nuevo, en Python | features/exams/ExamStatsPanel | Core en Python | Python core | Core en Python | Python core-a |
| `exams.familyFilter` | Estadísticas: desplegable de qué exámenes se ven | features/exams/ExamStatsPanel | Exámenes | Exams | Exàmens | Azterketak |
| `exams.family.classic` | Estadísticas: los exámenes del core en C | features/exams/ExamStatsPanel | Exámenes en C | C exams | Exàmens en C | C-ko azterketak |
| `exams.family.next` | Estadísticas: los exámenes del core en Python | features/exams/ExamStatsPanel | Exámenes Nexus | Nexus exams | Exàmens Nexus | Nexus azterketak |
| `exams.family.both` | Estadísticas: los dos tipos de examen, uno al lado del otro | features/exams/ExamStatsPanel | Los dos | Both | Tots dos | Biak |
| `exams.kickoffs` | Estadísticas: desplegable con casillas de las kickoffs (meses en que se empezó) | features/exams/ExamStatsPanel | Kickoffs | Kickoffs | Kickoffs | Kickoff-ak |
| `exams.kickoffPill` | Botón de una kickoff: mes y año, y cuánta gente empezó | features/exams/ExamStatsPanel | {month} · {n} | {month} · {n} | {month} · {n} | {month} · {n} |
| `exams.kickoff.all` | Casilla y texto del desplegable cuando se ven todas las kickoffs juntas | features/exams/ExamStatsPanel | Todas | All | Totes | Denak |
| `exams.kickoff.small` | Rótulo de las kickoffs de muy poca gente, al final del desplegable | features/exams/ExamStatsPanel | {n} más con poca gente | {n} more with few people | {n} més amb poca gent | {n} gehiago, jende gutxirekin |
| `exams.selection` | Cuánta gente entra en lo elegido | features/exams/ExamStatsPanel | {n} personas en lo elegido | {n} people in this selection | {n} persones en el que has triat | {n} pertsona aukeratutakoan |
| `exams.rank` | Fila de un rango: su examen de C y el de Nexus | features/exams/ExamStatsPanel | Rango {n} | Rank {n} | Rang {n} | {n}. maila |
| `exams.otherRank` | Fila de exámenes sin número de rango | features/exams/ExamStatsPanel | Otros | Others | Altres | Besteak |
| `exams.noAttempts` | Un examen de esa fila que nadie de lo elegido ha hecho | features/exams/ExamStatsPanel | Nadie lo ha intentado aún. | Nobody has tried it yet. | Encara no ho ha intentat ningú. | Oraindik inork ez du saiatu. |
| `exams.pct` | Un porcentaje | features/exams/ExamStatsPanel | {n} % | {n}% | {n} % | % {n} |
| `exams.bar` | Una cifra y qué parte es del total | features/exams/ExamStatsPanel | {n} · {pct} | {n} · {pct} | {n} · {pct} | {n} · {pct} |
| `exams.kickoff.chosen` | Texto del desplegable de kickoffs cuando hay varias marcadas | features/exams/ExamStatsPanel | {n} kickoffs | {n} kickoffs | {n} kickoffs | {n} kickoff |
| `exams.moreAttempts` | Desplegable con los intentos a partir del cuarto | features/exams/ExamStatsPanel | Ver {n} intentos más | Show {n} more attempts | Veure {n} intents més | Ikusi {n} saiakera gehiago |
| `exams.markLater` | Examen en vivo: en lugar de la nota de quien sigue dentro | features/exams/ExamsPage | Nota al cerrar | Mark when it closes | Nota en tancar | Nota ixtean |
| `exams.markLaterHint` | Examen en vivo: explicación al pasar el ratón por «Nota al cerrar» | features/exams/ExamsPage | 42 no da la nota de un examen hasta que se cierra. Mientras sigue dentro, se ve la de su último intento (la que figura en 42). | 42 does not give an exam's mark until it closes. While they are still in, you see the one from their last attempt (the one shown on 42). | 42 no dona la nota d'un examen fins que es tanca. Mentre hi és, es veu la del seu últim intent (la que figura a 42). | 42k ez du azterketaren nota ematen itxi arte. Barruan dagoen bitartean, azken saiakerarena ikusten da (42n agertzen dena). |
| `exams.previousMark` | Examen en vivo: quien sigue dentro, con la nota de su último intento cerrado | features/exams/ExamsPage | Último: {n} | Last: {n} | Últim: {n} | Azkena: {n} |
