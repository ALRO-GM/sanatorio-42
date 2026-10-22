# Revisión de textos de Sanatorio 42

Revisión de solo lectura de las 20 tablas CSV (2 265 filas más `juego/juego.csv`, 488), del banco de preguntas de Not-games y del curso de git. Cada tabla de abajo lleva la propuesta lista para pegar (es y en como mínimo). Cuando solo se indica un idioma, el otro no cambia.

## 1. Resumen y recuentos

- Filas revisadas: 2 753 (20 CSV de primer nivel + juego). Comprobación automática: ningún `{hueco}` renombrado o ausente entre idiomas, ningún contexto vacío, ninguna clave sin es o sin en.
- Traducciones ausentes: ca y eu vacías en `juego/juego.csv` (488), `legal.csv` (52) y `gestion.csv` (401 de 469; las 68 que sí las llevan son `quota.*`, `staff.*`, `admin.growth.*`, `admin.clicks.*`, `admin.focus.*` y alguna más). En las demás tablas ca y eu están completas.
- Filas con propuesta de cambio en las tablas: 275 filas de tabla (ver tablas; algunas agrupan varias claves con el mismo cambio).
- Problemas sistemáticos (ver §5): puntos suspensivos `...` en en/ca/eu (9 claves × 3 idiomas); apóstrofo `’` frente a `'` (9 en en, 32 en ca); comillas `«»` y `"` en en; `cluster` sin tilde (6 claves); género en títulos y frases (unas 30); plurales con `{n}` (unas 25 claves); `puesto`, `sala`, `corrección/evaluación`, `aviso/recordatorio`, `plan/track/curriculum`, `capital/patrimonio` usados para varios conceptos.
- ca/eu: 1 error de catalán (`net.strict.hint` ca `Suspensos` -> `Suspesos`), 1 de euskera (`health.ask` eu usa tercera persona `nahi ditu` en vez de `nahi dituzu`), `facility.by` ca copia el español, 9 filas ca/eu con `...`.
- Claves: no hay claves sin uso (lo comprueba `npm run textos`). Duplicados evitables: ~55 textos idénticos repartidos en 2-5 claves (ver §3).
- Textos en código: ver §4 (207 `domainError(...)` en la API con texto en español; la web enseña un genérico fuera del español).
- Banco de preguntas: ver §5.


## 2. Tablas: filas a corregir por fichero

La columna «propuesta» es el texto final. `es:`/`en:` indica el idioma. Si una fila agrupa varias claves, el cambio vale para todas.

### comun.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `app.loading`, `sync.copyingStart` (comun); `xp.loading` (expediente); `cal.loading` (pizarras); `projects.loading`, `peers.loading`, `peers.nobody` (sala-de-espera); `board.loading` (tablon); `therapy.loading` (terapia) | en usa tres puntos `...`; es usa `…` (regla del proyecto) | en: cambiar `...` por `…` en todas (p. ej. `Loading…`, `Copying the campus from 42…`) |
| `sync.copying` | en: `{pct} %` con espacio; en inglés va pegado (`focus.stats.position` ya lo hace) | en: `Copying the campus from 42: {pct}%` |
| `nav.tablon` | en `Questions` pero en `welcome.board.title` es `Board` (y `Tablón` en otros sitios) | Unificar. Propuesta: en `Q&A board` en `nav.tablon`, `welcome.board.title`, etc. (ver glosario) |
| `nav.guardia`, `layout.page.guardia`, `welcome.duty.title`, `focus.show.guard` | en mezcla `On duty` (sección) y `Duty` (`focus.show.guard`, `menu.duty`). Sección = sustantivo, estado = adjetivo | en: `nav.guardia` = `Duty`, `layout.page.guardia` = `Duty`; `welcome.duty.title` mantiene `On duty` (es el interruptor) |
| `nav.cat.clusters.hint` | en `on call` en vez de `on duty` | en: `The campus map: who is in, where and on duty` |
| `login.pitch` | en dice `when it's your turn`, es dice `si hoy puedes`: sentido distinto | en: `Stuck? Come in for a consultation: there's always someone on duty. And if you can today, go on duty and lend a hand.` |
| `login.step2d` | en poco natural (`Available peers and their seat`) | en: `Who's available and where they sit` |
| `error.409` | Vaga: no dice qué hacer ni por qué | es: `Ahora mismo no se puede: puede que ya esté lleno o que ya exista. Prueba otra vez en un rato.` en: `That's not possible right now: it may be full or already exist. Try again in a bit.` |
| `error.400` | Vaga | es: `Algo de lo que has escrito no es válido. Revísalo y prueba otra vez.` en: `Something you entered isn't valid. Check it and try again.` |
| `error.network` / `app.serverDown` | Casi duplicados; `caído` suena técnico | `app.serverDown` es: `No se puede conectar con el servidor. Puede que esté arrancando; prueba en un momento.` en: `Can't reach the server. It may be starting up; try again in a moment.` |
| `welcome.duty.body` (en) | usa `«On duty»` (comillas españolas) en texto inglés; el resto de comillas inglesas usa `“ ”` (`demo.staff`) | en: `Switch on “On duty” and mark the half hours when you can help. People will book you and you will earn XP. Whatever is already in your calendar cannot be booked.` |
| `layout.recordStyle.none` (en) | `Their own, each person` forzado | en: `Each person's own` |
| `layout.mode.manual` | `Yo` / `Me` no se entiende fuera de contexto | es: `A mano` en: `By hand` |
| `layout.red.endogamy` | en `Most inbred` puede sonar mal aplicado a personas | es: `Más endogamia` (ok). en: `Most closed circles` (ver `red.csv`) |
| `layout.red.strictest` | `Los más estrictos` con género | es: `Quién es más estricto` en: `Strictest` -> `Who is strictest` |
| `layout.alerts` (es `Avisos`, en `Reminders`) | en distinto de `notices.tab.notices` | ver glosario `Avisos`: en `Notices`; este bloque (aviso previo a un evento) puede ser `Reminders`, pero entonces es `Recordatorios` |
| `settings.detail.datos` | `Loco` con género; es el nombre fijado en AGENTS.md | si se puede cambiar: es `Pasión por los datos`; si no, dejarlo |
| `focus.exit.title` | `Seguro` con género; en `Sure you want to stop?` seco | es: `¿De verdad quieres parar?` en: `Do you really want to stop?` |
| `focus.exit.left` | `Quedan {time}` no concuerda cuando `{time}` es `1 hora`/`1 minuto`/`un momento` | es: `Tiempo de concentración restante: {time}. ¿De verdad hace falta acabar ahora?` en: `Focus time left: {time}. Do you really need to stop now?` |
| `focus.stop` / `focus.screen.exit` / `focus.exit.*` | Mezcla `Acabar`/`parar` | unificar en `Parar`: `focus.stop` es `Parar` ; `focus.screen.exit` es `Parar la sesión` |
| `focus.breakOver` | `¡A por otra!` / en `Ready for another?` no coinciden | en: `Let's go again!` (o es `¿Otra vuelta?`) |
| `campus.other` | Mezcla tú (`Tu campus`) con vosotros (`os juntáis`, `vuestro idioma`) | es: `Tu campus, {campus}, todavía no está en Sanatorio 42: lo que ves es de {tracked}. Si se apuntan cinco personas más de {campus}, lo añadimos; con diez, también el idioma. ¡Corre la voz!` |
| `legal.untranslated` | `castellano` en lugar de `español` (en el resto es `español`/`Spanish`) | es: `Este texto solo está en español y en inglés.` |
| contracciones en en | `I am`, `I cannot`, `You have not` frente a `Can't`, `Don't`, `I'll` | unificar con contracciones (`I'm out of energy`, `I can't focus`, `You haven't accepted this version yet.`) en `focus.reason.*`, `legal.notAccepted`, `login.staff` |
| `welcome.comfort.body` (en) | `colour-blind colours`, `customise`: británico, ok, pero coherente con `settings.cvd`; repetición | en: `In the footer you can change language, theme, text size, colour-blind mode and zen mode. In your menu: the tabs, and this welcome.` |
| claves | Mezcla de idiomas y estilos: `nav.consulta` (sala de espera), `nav.red`, `error.409`, `settings.lang`; `layout.expediente.*` vs `layout.page.*` | Solo informativo; renombrar `nav.consulta` -> `nav.sala` si se hace limpieza |

### buzon.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `notices.kind.clicker_defense` | `se ha defendido` suena a juicio; `partida` (es) vs `review` (en) no coinciden | es: `{from} ha explicado su partida de Code Clicker tras una revisión` en: `{from} explained their Code Clicker run after a review` |
| `chats.kind.direct` | `Directa` queda sin sustantivo fuera de contexto (filtro por tipo) | es: `Mensaje directo` en: `Direct message` |
| `chats.empty` | `desde aquí abajo` / `from down here` depende del diseño y no se entiende en móvil | es: `Todavía no tienes ninguna conversación. Escribe a alguien desde aquí.` en: `You have no conversations yet. Write to someone from here.` |
| `report.why` | `Qué tiene de problemático` es rebuscado | es: `Qué pasa con este mensaje` en: `What is wrong with this message` |
| `report.reason.other` (en `Something else`) vs `meet.reason.other`, `focus.reason.other` (en `Another reason`) | en inconsistente para el mismo es `Otro motivo` | en: `Another reason` en las tres |
| `inbox.kind` / `inbox.kind.issue|idea|report` / `inbox.category.*` | Dos juegos de tipos casi iguales (`Algo no va`/`Fallo`, `Una mejora`/`Mejora de algo que ya hay`); `inbox.kind` es etiqueta y a la vez prefijo | Comprobar en `docs/textos/buzon.md` si `inbox.kind.*` o `inbox.category.*` sobra; si ambos viven, igualar redacción (`Fallo`, `Mejora`, `Denuncia`) |
| `inbox.to` | `Te responde aquí` no dice quién responde | es: `Para: quien administra Sanatorio 42. La respuesta aparece aquí y te llega un aviso al buzón.` en: `To: whoever runs Sanatorio 42. The answer shows up here and you get a notice in your mailbox.` |
| `notices.title` (es `Buzón`) y `focus.show.notices` (en `mailbox`) | En en el buzón es `Mailbox`, y la sección de incidencias `Issues` (clave `inbox.*`) | Mantener `Mailbox` para el buzón; no usar `Inbox` en en |
| `notices.kind.*` (en) | `cannot` frente a contracciones del resto | en: `{from} can't take your booking` |
| `chats.remind` | `Recordármela…` | es: `Recordármelo…` (o `Recordarme responder…`) en: `Remind me…` |

### calendario.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `agenda.waiting` | `Te quedan {time}` no concuerda con `un momento` ni `1 hora` | es: `Lo siguiente, en {time}` en: `Next up in {time}` |
| `agenda.no42` (en) | `Could not` formal, `42 data` seco | en: `Couldn't read the 42 data: you only see Sanatorio events.` |
| `agenda.back` (en) | falta artículo | en: `Back to the calendar` |
| `agenda.seatsOpen` | `{taken} personas` con 1 sale `1 personas` | es: `Apuntadas: {taken} (sin tope)` en: `Signed up: {taken} (no limit)` |
| `agenda.notJoined.event_joined`, `.event_open`, `.exam` | Tres claves con el mismo texto; `event_joined` dice `No te has apuntado` pero es de eventos a los que vas (probablemente inalcanzable) | Unificar en una sola o borrar `event_joined` si no se usa |
| `meet.reply`, `meet.mustReply`, `meet.missed`, `meet.reason.missed` (en `reminder`) | El mismo `aviso` se traduce `reminder`; en el buzón es `notice` | en: `notice` (`Reply to the notice`, `the notice closes when you answer`, `did not answer the notice`) |
| `meet.missed` | Redacción torpe y algo culpabilizadora (`Se te pasó`, `Has quedado como que no asististe`) | es: `No contestaste al aviso y ya ha pasado media hora desde el inicio, así que figuras como ausente.` en: `You didn't answer the notice and half an hour has passed since the start, so you're marked as absent.` |
| `meet.howLong` | `Cuánto` suelto | es: `Cuánto tiempo` en: `How long` |
| `meet.reason.other` (en `Other reason`) | Distinto de `report.reason.other` y `focus.reason.other` | en: `Another reason` |
| `meet.said.absent` (es `No va a poder ir`) vs `chats.said.absent` (es `No puede ir`, en `Cannot make it`) | Mismo estado dicho de tres formas | es: `No puede ir` (ambas) en: `Can't make it` (ambas) |
| `meet.reason.missed` | Clave fuera de patrón: es un `said`, no un `reason` | Renombrar a `meet.said.missed` |
| `meet.att.guestDone` y `meet.qr.end` | Texto idéntico en dos claves | Dejar una sola (`meet.att.validated`) |
| `meet.att.attempts` | Con 1 sale `1 intentos` | es: `Intentos que te quedan con un código equivocado: {n}.` en: `Attempts left with a wrong code: {n}.` |
| `meet.att.locked` | Seco/regañón | es: `Se han agotado los intentos en este evento: ya no se puede validar aquí. Habla con quien organiza.` en: `You have used all your attempts for this event, so you can't validate here any more. Talk to the organiser.` |
| `agenda.hoursMinutes` / `focus.time.hm` | Texto idéntico en dos claves | Una sola clave (`time.hm`) |
| contexto `agenda.notJoined.evaluation` | Texto `—` | Correcto, solo comprobar que el contexto lo explica (lo hace) |

### clusters.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `map.cluster` | `Cluster {n}` sin tilde en es, frente a `Clústeres` en todo lo demás | es: `Clúster {n}` (en: `Cluster {n}`) |
| `map.seatName` | `PC` mezcla `puesto`/`ordenador`/`PC` | es: `{cluster} · Fila {row} · Puesto {seat}` en: `{cluster} · Row {row} · Seat {seat}` |
| `map.unplaced` (en) | `plan` (el resto usa `map`) | en: `Not on the map:` |
| `map.empty` (en) | `floor plan` frente a `map` | en: `No map for this campus yet: it gets drawn as people sit down.` |
| `map.mate.done`, `map.finishedMine` | es `Lo han terminado`/`Terminó tu proyecto` pero el contexto y el resto de la web dicen `aprobó` | `map.mate.done` es: `Lo aprobaron` en: `Passed it`; `map.finishedMine` es: `Aprobaron tu proyecto: {n}` en: `Passed your project: {n}`; `welcome.net.body` (comun) en: `whoever passed your project` |
| `clusters.chatEmpty` | `vosotros dos` (masculino genérico y cambia a plural) | es: `Nadie ha escrito todavía. Lo que pongas solo lo ve quien participa en este chat.` en: `Nobody has written yet. Only the two of you can see what you write.` |
| `facility.by` | `Avisa {login}` se lee como imperativo | es: `Avisó {login} · {when}` en: `Reported by {login} · {when}` |
| `facility.resolve` | Botón con adjetivo, no verbo | es: `Marcar como resuelto` en: `Mark as resolved` |
| `facility.noteRequired` | Seco | es: `Cuéntanos qué pasa` en: `Tell us what's wrong` |
| `facility.send` (es `Avisar`, en `Report`) y `meet.tell` (es `Avisar`, en `Let them know`) | Mismo verbo en es con dos traducciones | Aceptable, solo indicarlo |
| `clusters.count` | Plural con 1 (`1 de 1 personas`) | es: `Con Sanatorio abierto: {online} de {occupied} personas sentadas` en: `Sanatorio open for {online} of {occupied} seated people` |
| `facility.note` (ca = es) y `therapy.note` | `Nota (opcional)` copiado al catalán | ca: `Nota (opcional)` es válido en catalán; falso positivo |

### code-clicker.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `clicker.review.title` | Tono acusador (`no cuadra`) | es: `Un salto raro en tu partida` en: `Something odd in your game` |
| `clicker.review.answer` | es dice `20 letras`, en dice `characters` | es: `Tu explicación (al menos 20 caracteres)` |
| `clicker.review.intro` | `tu capital` pero el juego usa `Patrimonio` (`game.ui.wealth`, `admin.clicker.wealth`) | es: `...un salto en tu patrimonio que no se explica...` en: `...a jump in your wealth that...` |
| `egg.achievement` | Duplicado de `game.ui.gotAchievement` (es `Logro conseguido`) | Usar una sola clave |
| `egg.red` | Duplicado de `game.achievements.pill-red.1` | Usar una sola clave |
| `egg.body` (en) | `Someone opened.` incompleto | en: `Someone opened the door. They offer you two pills and won't let you leave without choosing.` |
| `clicker.review.ask` | Largo para una ventana obligatoria | es: `Cuéntalo: si no hiciste trampas, explica qué pasó; si las hiciste, explica cómo. Si es un método nuevo, no se te penaliza.` |

### demos.csv

(Todas las frases de paso cumplen el tope de 70 caracteres.)

| clave | problema | propuesta |
| --- | --- | --- |
| contexto de `tour.board.*`, `tour.agenda.*`, `tour.record.*`, `tour.mailbox.*` | Contexto con `de el` (`Demostración animada de el tablón`) | Cambiar a `del` en los contextos: `Demostración animada del tablón / del calendario / del expediente / del buzón` |
| `tour.guard.4` (en) | `shift` mientras el resto usa `duty` | en: `Save your duty: you can now be booked.` |
| `tour.guard.8` (en) | `alert` frente a `notice` | en: `Five minutes before, the notice pops up: say if you're going.` |
| `tour.waiting.2` (en) | `on call` | en: `See who is on duty and where they sit.` |
| `tour.waiting.5` (en) | `go on call` | en: `And you? Go on duty from the header.` |
| `tour.waiting.4` (en) | `we tell you in the mailbox` | en: `When they accept, you get a notice in your mailbox.` |
| `tour.therapy.2` | `Únete` (el resto de la web: `Apúntate`/`Apuntarme`) | es: `Apúntate y quedáis en el sitio y la hora acordados.` en: `Sign up and meet at the agreed place and time.` |
| `tour.therapy.3` | `puestos que se toquen` / `seats that touch` raro | es: `¿No hay ninguno? Abre el tuyo: elige puestos juntos.` en: `None yet? Open yours: pick seats side by side.` |
| `tour.network.1`, `tour.network.2`, `tour.network.count`, `tour.network.4` (en) | `corrections` / `correct`; en el resto de en son `evaluations` | en: `Each bubble is a person; each line, evaluations between two.` / `Click a bubble to see who they evaluate with.` / `{n} evaluations` / `...highlight who evaluates most.` |
| `tour.clusters.1` | Llama `sala` a un clúster (`sala` es la sala de espera y la sala de Not-games) | es: `Elige un clúster: ves quién se sienta dónde.` en: `Pick a cluster: see who sits where.` |
| `tour.inbox.text` | `cluster` sin tilde | es: `Me gustaría filtrar por clúster` |
| `tour.notGames.4` | `la buena` ambiguo | es: `Al acabar, ves la respuesta buena y por qué.` en: `When it ends, you see the right answer and why.` |
| `tour.exams.3` (en) | `Marks` (el resto de en: `grades`/`scores`? ver `examenes.csv`) | unificar según glosario |
| `tour.record.3` | `Milestone Deadline` en mayúsculas dentro de es; comprobar con `expediente.csv` | Escribir igual que en `expediente.csv` |

### estadisticas.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `stats.pizarras.seats` | `Apuntados` (masculino) | es: `Inscripciones` en: `Sign-ups` |
| `stats.pizarras.value` | `{n} apuntados` | es: `{n} inscripciones` en: `{n} sign-ups` |
| `stats.pizarras.boards`, `stats.pizarras.extra` (en) | `Boards` (el resto de la web: `Whiteboards`) | en: `Whiteboards given` / `{n} whiteboards` |
| `stats.notgames.people` | `Jugadores` (masculino) | es: `Gente que ha jugado` en: `People who played` |
| `stats.notgames.games` (es `Partidas`, en `Games`) | Vocabulario `partida`/`game`: ver glosario (Not-games usa también `sala`) | Mantener `Partidas`; en `Games` ok |
| `stats.progress.info` | Párrafo de 4 frases largas; la regla de textos.md dice como mucho dos | es: `Cuánto llevabas pasados unos días desde que empezaste, frente a la media y a lo que pide cada pace. Por círculos, cada círculo pesa lo mismo; por horas, cuentan las estimadas por 42.` en: `How far along you were some days after starting, against the average and what each pace asks for. By circles, every circle weighs the same; by hours, the hours estimated by 42 count.` Mover la frase de `De quien no ha entrado en la web...` a otra clave (p. ej. `stats.progress.infoStart`) |
| `stats.progress.noMe` | `cuando 42 da tus proyectos` torpe | es: `Aún no hay datos de tu avance: aparecerán cuando 42 nos envíe tus proyectos.` en: `There is no data on your progress yet: it will appear once 42 sends us your projects.` |
| `stats.progress.plan.classic|next|all` (en `Plan`) y `exams.track.*` (en `track`) | Mismo concepto `plan` con dos palabras en en | en: `plan` en ambas (`Classic plan`, `New plan`, `Plan` en `exams.trackFilter`: `People's plan`) |
| `stats.progress.plan.next` (`Python`) / `exams.plan.next` (`Core en Python`) / `exams.family.next` (`Nexus`) | Mismo concepto con tres nombres | Unificar: `Plan nuevo (Python)`; `Nexus` solo si es el nombre oficial del examen, y entonces explicarlo en el contexto |
| `stats.consulta.value`, `stats.terapia.value`, `stats.notgames.extra`, etc. con `{n}` + sustantivo | Con n=1 sale `1 sesiones`, `1 grupos`, `1 aciertos` | Usar forma con dos claves (`.one`/`.many`, como `until.*`) o forma neutra `Sesiones: {n}` |

### examenes.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `exams.refresh` (`Refrescar`) vs `agenda.refresh`, `meet.att.refresh` (`Actualizar`) | Mismo botón con dos verbos | es: `Actualizar` en: `Refresh`; `exams.refreshIn` es: `Podrás actualizar otra vez en {time}` |
| `exams.people` | `aprobados` con género | es: `Aprobaron {passed} de {people} · {pct}` en: `{passed} passed out of {people} · {pct}` |
| `exams.bh.total` | Redacción rara (`de los que se sabe`) y género | es: `Absorbidas por el black hole: {n} de {known} personas con datos · {pct}` en: `Absorbed by the black hole: {n} of {known} people with data · {pct}` |
| `exams.bh.circles` | `se los lleva` (género y dramático) | es: `En qué círculo ocurre` en: `Circle where it happened` |
| `exams.bh.recent` | `Los últimos absorbidos` | es: `Absorciones recientes` en: `Most recent` |
| `exams.bh.left` | `quedan 1 días` si n=1 | es: `Le quedan: {n} días` (y variante singular) o usar `until.day.*` |
| `exams.circlesHint` (en) | `without extreme cases` | en: `Days from the start (or the previous circle) until it is validated, ignoring outliers. Only people whose milestones are known.` |
| `exams.status.pending|inProgress` | Ok, pero `Dentro` suelto; en `In the exam` | es: `Haciéndolo` en: `Taking it` (opcional) |
| `exams.family.classic` (`De C`) / `exams.family.next` (`Nexus`) | Etiquetas sin contexto ni paralelismo | es: `Exámenes en C` / `Exámenes Nexus` en: `C exams` / `Nexus exams` |
| `exams.kickoffs` (`Kickoffs`) | Anglicismo usado como término de producto | Ver glosario: `kickoff` se queda (es el término de 42) pero nunca `promoción`; comprobar que `grep promoci` no devuelve nada |
| `exams.markLaterHint` | ok | - |
| `exams.updated` (en `marks`) | `marks` British; en el resto de la web no aparece `grades` | Mantener `marks` en todos (glosario) |

### expediente.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `title.interno` | `Interno` masculino | es: `Prácticas de planta` en: `Ward intern` |
| `title.jefe` | `Jefe` masculino | es: `Jefatura de planta` en: `Head of ward` |
| `title.maestro` | `Maestro` masculino | es: `Maestría del código` en: `Code mastery` |
| `title.hacker_etico` | `ético` masculino | es: `Hacker con ética` en: `Ethical hacker` (si `game.busts.1.1` lo repite, cambiar ambos) |
| `title.hacker_poco_etico` | `poco ético`; en `Not so ethical hacker` flojo | es: `Hacker con dudas éticas` en: `Hacker with ethical doubts` |
| `title.hacker_cazado` | Título (`desencriptado`) no explica el motivo | es: `Hacker al descubierto` en: `Hacker exposed` |
| `ach.campus_guardian` | `Guardián` masculino | es: `Guardia del campus` en: `Campus guardian` |
| `xp.loading` (en) | `...` | en: `Fetching your record…` |
| `xp.titles` | `banner` anglicismo | es: `Títulos para lucir en tu perfil` en: `Titles to show on your profile` |
| `rank.place`, `rank.empty` | `Puesto` también significa asiento del clúster | es: `Posición {n}`; `Todavía no hay nadie. El primer lugar está libre.` en: `Rank {n}`; `Nobody yet. First place is free.` |
| `health.unknown` | Cambia de persona (`Si acaba de entrar`); en `If it is new` | es: `42 no da la fecha de inicio en el 42cursus. Si acabas de entrar, prueba dentro de un momento.` en: `42 does not give the 42cursus start date. If you just joined, try again in a moment.` |
| `health.bonus` (en) | `bonus d` es ilegible | es: `Incluye {n} días de bonus sobre tu fecha de inicio. Si 42 te da más, actualiza el plazo.` en: `It includes {n} bonus days on top of your start date. If 42 gives you more, update the deadline.` |
| `health.bonusOther` | `{n} d` abreviado | es: `Incluye {n} días de bonus sobre su fecha de inicio.` en: `Includes {n} bonus days on top of their start date.` |
| `health.summary`, `health.summaryOther`, `health.calcMargin`, `health.calcFaster`, `pace.left`, `pace.late` | `d` por días en frases: seco; `(su plazo...)` en `calcMargin` cambia de persona | `health.summary` es: `Estás en el círculo {circle} y vas a pace {pace}. Lo conservas si lo terminas antes del {date} (quedan {left} días).` en: `You are in circle {circle} at pace {pace}. You keep it if you finish before {date} ({left} days left).` `health.calcMargin` es: `Te sobran {n} días antes del plazo ({date}).` en: `{n} days to spare before the deadline ({date}).` `health.calcFaster` es: `Para pace {pace} llegas {n} días tarde.` en: `For pace {pace} you are {n} days late.` `pace.left` es: `quedan {n} días` en: `{n} days left`; `pace.late` es: `{n} días de retraso` en: `{n} days late` |
| `health.summaryOther`, `health.startedOther`, `health.finishedOther` (en) | Sin sujeto / `Has completed` sin sujeto | `summaryOther` en: `They are in circle {circle} at pace {pace}. They keep it if they finish before {date} ({left} days left).` `startedOther` en: `They started on {date} · day {days} of the cursus` `finishedOther` en: `They have completed the common core: the black hole can no longer reach them.` |
| `health.paceIntraHint`, `hours.hintAll` (en) | Apóstrofo tipográfico `’` (9 casos en todo en, el resto usa `'`) | en: usar `'`: `today's shows how you are doing`, `Everyone's time` |
| `hours.hint` | `cuatro letras` (es) vs `four-character` (en); tres frases | es: `Tu tiempo en pizarras y sesiones de ayuda, validado con los códigos de inicio y fin. Descárgalo para enseñárselo al staff: el nombre del fichero lleva un código de cuatro caracteres para comprobar que es auténtico.` en: `Your time in whiteboards and help sessions, validated with the start and end codes. Download it to show the staff: the file name ends in a four-character code they can use to check it is genuine.` |
| `hours.download` | Técnico | es: `Descargar hoja de cálculo (CSV)` en: `Download spreadsheet (CSV)` |
| `react.code` (`Revisó mi código`) | Primera persona entre reacciones en tercera (`Muy paciente`, `Explica genial`) | es: `Revisó mi código` -> `Buena revisión de código` en: `Great code review` |
| `ach.first_duty` (en `First shift`) | `shift` frente a `duty` | en: `First duty` |
| `xp.rule.board_host` | Larga y rara | es: `+{xp} XP por impartir una pizarra con alguien que valide los dos códigos` en: `+{xp} XP for hosting a whiteboard where someone validates both codes` |

### gestion.csv

Estado de traducciones: 469 filas, todas con es y en; solo 68 tienen ca y eu (las de `quota.*` y `staff.*`, que ve gente que no administra, más `admin.growth.*`, `admin.clicks.*`, `admin.focus.*`, `admin.tab.facility`, `admin.tab.focus` y `admin.cast.addPerson`). Las otras 401 (panel de gestión, `admin.*`) quedan en español a propósito según `docs/textos.md`. Incoherencia: dentro del panel unas pestañas nuevas sí llevan ca/eu y las antiguas no; decidir una regla (propuesta: ca/eu solo en `quota.*` y `staff.*`, y quitarlos de `admin.growth.*`, `admin.clicks.*`, `admin.focus.*`, `admin.tab.facility`, `admin.tab.focus`, `admin.cast.addPerson`, `admin.usage.view.clicks`, `admin.data.kind.focus_sessions*`). Falta además ca/eu en `quota.ticket.etaMinutes` (`{n} min`, vale el español).

Contexto: 80 contextos distintos para 469 filas; muchas filas comparten el mismo (p. ej. 60 filas `Panel de gestión, «Code Clicker»: uso, trampas y sanciones`, 45 `Panel de gestión, «Limpiar datos»: un tipo de dato que se puede borrar`, 27 `...recorridos entre secciones`, 23 `...mapa de calor...`, 22 `...presupuesto de tráfico...`). No dicen qué es cada texto (botón, columna, aviso, qué es `{n}`). Propuesta mecánica: contexto = `<pestaña>: <tipo de elemento> <qué es>`, p. ej. `admin.usage.by.track` -> `Panel > Qué se usa: opción del selector «Agrupar por»`. Prioridad en las filas con huecos (`admin.budget.*`, `admin.cons.*`, `admin.stats.*`, `admin.flows.*`, `admin.clicker.*`).

| clave | problema | propuesta |
| --- | --- | --- |
| `quota.ticket.yours`, `quota.ticket.foot` | `Su turno` / `Conserve su tique` en usted: rompe el tuteo | es: `Tu turno` y `No hace falta que hagas nada: se actualiza solo. Guarda tu tique.` en: `Your number` / `You do not need to do anything: it updates by itself. Keep your ticket.` (si el usted es el chiste del tique, dejarlo y documentarlo en el contexto) |
| `quota.ticket.title` | `Sala de espera · datos de 42` choca con la sección Sala de espera | es: `Cola · datos de 42` en: `Queue · 42 data` |
| `quota.critical.body` | `no se le pide nada` ambiguo | es: `De momento no se pide nada a 42: todo lo que ves es lo último guardado. Vuelve a la normalidad al empezar la hora.` |
| `admin.tab.inbox`, `admin.inbox.empty`, `admin.data.kind.notices` (en `Inbox`) | `Buzón` del panel (incidencias y denuncias) se confunde con el buzón de cada persona (`Mailbox`) | es: `Incidencias` / `No hay incidencias.` en: `Issues` / `There are no issues.`; `admin.data.kind.notices` en: `Mailbox notices` |
| `admin.data.kind.notices.summary`, `.detail` | `la campana` (la cabecera usa el sobre del buzón) | es: `Los avisos del buzón: te han respondido, te han reservado, hay un mensaje nuevo…` y `Borrarlos vacía el buzón; no toca lo que avisaban...` |
| `admin.clicker.asked`, `admin.cheats.review.asked`, `admin.cheats.review.answered` | `defiende`/`defenderse` suena a juicio; en dice `explain` | es: `Le hemos pedido que lo explique: esperando su respuesta.` / `Tiene que explicarse` / `Ha explicado` |
| `admin.clicker.cheatAsk` | `¿Seguro?` con género | es: `... se le avisa de qué no cuadró. ¿Continuar?` en: `... Continue?` |
| `admin.clicker.why.prestige` vs `admin.clicker.prestige` | `prestigio` frente a `Ascensos` | es: `Más ascensos de los que caben` en: `More ascensions than possible` (comprobar contra `juego.csv`) |
| `admin.clicker.wealth` (`Patrimonio`) vs `admin.clicker.alerts`, `.trace`, `.capital`, `admin.data.kind.clicker_capital`, `clicker.review.intro` (`capital`, en `worth`) | Dos nombres para el mismo concepto | Usar `patrimonio` / `net worth` en todos (`Saltos de patrimonio por mirar`, `Patrimonio a lo largo del tiempo`, `Code Clicker: historial de patrimonio`) |
| `admin.clicker.pardonAsk`, `admin.data.kind.clicker_cheats.detail` | `banner` | es: `su cabecera de perfil` o decidir `banner` como término (glosario) |
| `admin.cons.fortyTwoHint` | `De 1.200 peticiones por hora` con el número escrito en el texto | es: `De {limit} peticiones por hora` en: `Out of {limit} requests per hour` (añadir el hueco) ; igual `admin.quota.cap` (70 % / 90 %) |
| `admin.stats.seen`, `admin.stats.back`, `admin.stats.hidden` (`Viéndola`, `En segundo plano`, `Oculta`) | `Viéndola` no se entiende sin contexto | es: `En primer plano` / `Con otra ventana delante` / `Pestaña oculta` en: `In the foreground` / `Behind another window` / `Tab hidden` |
| `admin.usage.group.casual|regular|heavy` | Masculino plural | es: `Uso ocasional` / `Uso habitual` / `Uso intensivo` en: `Occasional use` / `Regular use` / `Heavy use` |
| `admin.usage.by.track` (en `Curriculum`) | Cuarta forma de decir plan (`plan`, `track`, `curriculum`) | en: `Plan` |
| `admin.usage.by.cohort` (`Año de inicio`), `net.color.cohort` (`Año de llegada`) | Mismo dato, dos nombres | es: `Año de llegada` en: `Arrival year` |
| `admin.people.revoke` (`Quitar`) y `admin.staff.revoke` (`Retirar`), ambos en `Revoke` | Dos verbos para el mismo gesto | es: `Quitar permiso` / `Retirar cuenta`; en: `Revoke access` / `Revoke account` |
| `admin.clicker.view.cheats`, `admin.clicker.caught`, `admin.cheats.times` | Tres claves `Trampas` | Dejar una |
| `admin.inbox.status.open` (es `Pendiente`, en `Open`) | Dos idiomas distintos | en: `Pending` |
| `staff.different` | `Fíate de lo que ves aquí abajo` coloquial | es: `No coincide con el documento emitido: lo han modificado o es otro fichero. Fíate solo de lo que ves aquí debajo.` |
| `admin.budget.level.admin_only`, `.stopped` | Mayúsculas gritando; apóstrofo `’` | es: `Corte al 90 %: se ha llegado al 90 % del tráfico del mes...` ; en: `Cut-off at 90%: 90% of this month's traffic has been reached...` |
| `admin.budget.hint` (cinco frases), `admin.quota.hint`, `admin.data.kind.*.detail` | Párrafos largos | Aceptable en panel de admins, solo se anota |
| `admin.stats.everyone` | `← Todo el mundo` flecha en el texto | es: `Todo el mundo` (flecha como icono) |
| `admin.flows.step` | `De → a` | es: `De … a …` / en: `From … to …` |
| `admin.weekday.*` | Duplica `cal.weekdaysShort` (en mayúsculas) | Reutilizar |
| `admin.segment.*` | Duplica `focus.band.*` (mismos textos) | Una sola familia `band.*` |
| `admin.cheats.writeAll` | `Escribir a estas {n} personas` con n=1 | es: `Escribir a estas personas ({n})` |

### guardia.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `help.status.onDuty`, `help.status.notSeated`, `help.status.offDuty`, `help.status.capReached`, `help.status.bookable` | `Sales de guardia` / `Dejas de salir`: en español `salir de guardia` significa terminarla, lo contrario de lo que se quiere decir | `onDuty` es: `Apareces de guardia: tienes el interruptor encendido y te vemos en {seat}.` `notSeated` es: `Tienes el interruptor encendido, pero no te vemos en ningún puesto del campus. Aparecerás de guardia en cuanto te sientes.` `offDuty` es: `No apareces de guardia: el interruptor de arriba está apagado. Enciéndelo para que te vean quienes buscan ayuda ahora.` `capReached` es: `Ya te han reservado {booked}, tu tope de hoy. Dejas de aparecer para reservas, aunque te queden medias horas marcadas.` `bookable` es: `Te pueden reservar en tus medias horas marcadas, aunque el interruptor esté apagado. Te quedan {left}. Al llegar a tu tope ({max}), dejas de aparecer el resto del día.` (en ya usa `show up`, ok; `onDuty` en: `You show up as on duty: your switch is on and we see you at {seat}.`) |
| `help.booked` | `reservados` con género y sin sustantivo | es: `Reservado ya: {booked}.` en: `Already booked: {booked}.` |
| `help.rateRequester` | `¿Cómo llegó {login}?` / en `How did {login} come in?` incomprensible | es: `¿Cómo fue la sesión con {login}?` en: `How was the session with {login}?` |
| `help.waitingPeer` (en) | `Waiting for {login} to rate to close it.` | en: `Rated. The session closes once {login} rates it.` |
| `help.closedNoXp` | `ya habíais puntuado hoy` (vosotros; `puntuado` vs `valorado`; el motivo real es el tope de la pareja) | es: `Sesión cerrada sin XP: no se validaron los dos códigos (inicio y fin) o esta pareja ya había sumado XP hoy.` en: `Session closed with no XP: the two codes (start and end) were not validated, or this pair had already earned XP today.` |
| `help.bookSent` | `Pedido.` suena a compra; en dice `Sent.` | es: `Petición enviada. {login} tiene que aceptarla; la verás en Guardia.` en: `Request sent. {login} has to accept it; you'll see it under Duty.` |
| `help.bookSend` | `Pedir` pelado | es: `Enviar petición` en: `Send request` |
| `help.preReview.onNone` | `marcado` con género | es: `Te ofreces a preevaluar: saldrás con la marca en cuanto apruebes tu primer proyecto.` |
| `help.preReview`, `peers.preReview`, `peers.preReview.only` (en) | `pre-evaluate`, `pre-evaluates`, `pre-evaluators`, `practice evaluation` y `pre-reviews` mezclados | en: `pre-review` siempre: `I offer to pre-review finished projects` / `Pre-reviews` / `Only pre-reviewers ({n})` |
| `help.busy` (en) | `boards` | en: `...(evaluations, exams, events, therapy or whiteboards)...` |
| `helpGate.accept`/`helpGate.decline` duplican `help.accept`/`help.decline` | Dos claves con el mismo texto | Dejar una sola de cada |
| `help.cancel` (`Anular`) | `Anular` vs `Cancelar` | Mantener `Anular` solo para reservas (glosario) |
| `help.askedTitle` | ok | - |

### sala-de-espera.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `peers.nobody` | es dice `en este turno` y en añade `...`; vocabulario `de guardia`; tono distinto entre idiomas | es: `Ahora mismo no hay nadie de guardia. Puedes volver a mirar más tarde.` en: `Nobody is on duty right now. You can check again later.` |
| `peers.noneFilter` (en) | Falta el punto final | en: `Nobody like that is on duty right now. Try another filter.` |
| `peers.badgeOff` (en `Off shift`) | La web usa `duty` | en: `Off duty` |
| `peers.onlyBookable` (en) | `Only who you can ask` agramatical | en: `Only people you can ask for help ({n})` |
| `peers.groupHint` | `dolencia de guardia` ambiguo, `¿Montáis...?` | es: `Hay {n} pacientes como tú de guardia con el mismo proyecto. ¿Montas una terapia de grupo?` en: `{n} patients like you are on duty on the same project. Start a therapy group?` |
| `peers.crossed` | `{gave}` y `{got}` son números sin sustantivo (`le has corregido 3`) | Comprobar si el valor lleva `veces`; si no, es: `Ya os conocéis: le has corregido {gave} veces y te ha corregido {got}.` en: `You know each other: you evaluated them {gave} times and they evaluated you {got}.` |
| `peers.specialist` (`★`), `peers.eminence` (`✦`) | Símbolos de texto dentro del texto; la regla de iconos es solo `Icon.tsx` | Quitar glifos del texto (es: `Especialista`, `Eminencia`) y pintarlos con icono |
| `peers.eminence` (en `Luminary`) | Cambia el nombre fijado en AGENTS.md (`Eminencia`) | en: `Eminence` (o documentar `Luminary` en el glosario) |
| `peers.totalOf` | `participantes` frente a `personas` | es: `{shown} de {total} personas pueden atenderte ahora mismo.` |
| `projects.loading`, `peers.loading` (en) | `...` | `Loading projects…`, `Checking who's on duty…` |
| `peers.title` (en `Who can see you for`) | `see you` ambiguo | en: `Who can help you with {project}` |

### tablon.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `board.flag` | Botón que no es verbo (`No es acertado`) y en `This is wrong` | es: `Señalar como incorrecto` en: `Flag as wrong` |
| `board.status.specialist` | Glifo `★` dentro del texto | es: `Especialista` en: `Specialist` (el icono, con `Icon.tsx`) |
| `board.title` (en `Question board`) vs `nav.tablon` (en `Questions`) vs `welcome.board.title` (en `Board`) | Tres nombres en inglés para la misma sección | en: `Board` en nav y bienvenida; `Question board` solo en el título |
| `cgraph.master`, `cgraph.master1` | `Maestro` con género; `banner` anglicismo | es: `Maestría del código en {n} proyectos: puedes lucirla en tu perfil` ; `Maestría del código en un proyecto: puedes lucirla en tu perfil` en: `Code mastery in {n} projects: you can show it on your profile` / `...in one project: ...` |
| `cgraph.intro` | Tres frases largas | es: `Proyectos que puedes corregir, por círculos. El color dice cuántas veces los has corregido; los de trazos los podrás corregir cuando los apruebes.` en: `Projects you can evaluate, by circle. The colour shows how many times you have evaluated each one; dashed ones become available once you pass them.` |
| `graph.expand`, `graph.collapse` | Triángulos `▸ ▾` metidos en el texto | es: `{series}: ver sus {n} módulos` / `{series}: plegar sus {n} módulos` (el triángulo, como icono) |
| `graph.seriesLabel` (en `Tap`) | `Tap` frente a `Click` en las demostraciones | en: `Select to see them one by one` |
| `board.accept` / `board.reject` | `Aceptar`/`Descartar` ok, pero `board.accept` repite `help.accept`, `helpGate.accept` | Una sola clave `common.accept` |
| `graph.circle` | Idéntico a `map.circle` y `health.circle` | Unificar |
| `board.loading`, en | `...` | `Opening the board…` |
| `cgraph.tier2`, `cgraph.tier3` | Mismo texto en dos claves | Intencionado por el color; documentarlo en el contexto |
| `board.reviewBlocked` | Culpabiliza (`Varios cambios que validaste se han retirado`) | es: `Se han retirado varios cambios que validaste, así que de momento no puedes validar ni editar. Podrás volver el {until}.` en: `Several changes you validated were withdrawn, so you can't validate or edit for now. You can come back on {until}.` |
| `board.proposeBlocked` | Culpabiliza (`Te han rechazado varios cambios`) | es: `Varios cambios tuyos no se han aceptado, así que de momento no puedes proponer más. Podrás volver el {until}.` en: `Several of your changes weren't accepted, so you can't suggest more for now. You can come back on {until}.` |

### terapia.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `therapy.pickSeatsHint` | `que se toquen` | es: `Elige de 2 a 6 puestos juntos: al lado, delante, detrás o en diagonal. Cada puesto es una plaza del grupo.` en: `Pick 2 to 6 seats next to each other: beside, in front, behind or diagonal. Each seat is one place in the group.` |
| `therapy.join` (`Unirme al grupo`), `therapy.joinConfirm` (`Apuntarme`, en `Join`), `cal.join` (en `Sign me up`), `agenda.join` (en `Join`) | Cuatro formas para apuntarse | es: `Apuntarme` (y `Apuntarme al grupo` en `therapy.join`); en: `Join` / `Join the group` en todos |
| `therapy.leave` (`Salir del grupo`) y `cal.leave` (`Desapuntarme`, en `Drop out`) | Mismo gesto con dos verbos | es: `Salir del grupo` / `Desapuntarme` -> mantener, pero en: `Leave the group` / `Leave` |
| `therapy.invite` (en) | `Tell who` agramatical | en: `Tell whoever is doing the project` |
| `therapy.placeHint` (es) | `Cluster` sin tilde | es: `Clúster 1 · Planta 2` |
| `therapy.removeAsk` (en) | Apóstrofo `’` | en: `Remove {creator}'s group? It is closed and its members are told.` |
| `therapy.remove` | `Retirar (moderación)` con paréntesis técnico (idéntico en `cal.remove`) | es: `Retirar como moderación` en: `Remove as moderator` |
| `therapy.loading` (en) | `...` | `Looking for groups…` |
| `therapy.moreMembers` | Idéntico a `helpGate.more`, `net.andMore` | Unificar (`common.andMore`) |
| `therapy.members` (`Pacientes del grupo`) | Los grupos de repaso son para quien ya aprobó; `pacientes` no encaja | es: `Gente del grupo` en: `People in the group` |
| `therapy.progress` | Persona cambiada (`Cómo lleva`) | es: `Cómo van con el proyecto` en: `How far along they are` |

### pizarras.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `cal.join` (en `Sign me up`) | Distinto de `agenda.join` (`Join`) | en: `Join` |
| `cal.leave` (en `Drop out`) | Suena a abandonar un curso | en: `Leave` |
| `cal.yours` | `+ Tu pizarra puede estar aquí`: signo `+` dentro del texto, raro | es: `Tu pizarra puede estar aquí` en: `Your whiteboard could be here` |
| `cal.f.placeHint` (es) | `Cluster` sin tilde | es: `Clúster 1, sala de pizarras` |
| `cal.removeAsk` (en) | Apóstrofo `’` | en: `Remove {host}'s whiteboard? It is cancelled and everyone signed up is told.` |
| `cal.remove` | Idéntico a `therapy.remove` | ver terapia |
| `cal.loading` (en) | `...` | `Checking the schedule…` |
| `cal.legend` | La leyenda depende solo del color (`marcado en turquesa`) | es: `Hoy: marcado en turquesa · Punto: hay pizarra` (ok) pero comprobar que el día de hoy también lleve marca no cromática |
| `cal.past` (`Ya pasó`) / `cal.pastTitle` (`Ya pasadas`) | En: `Already happened` vs `Already held` | en: `Already held` en ambas |
| `cal.pitch` | `reserva sala` | es: `Da una pizarra, reserva una sala y gana XP ayudando a toda la comunidad.` |

### red.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `net.given`, `net.received`, `net.tip.counts`, `net.asCorrector.count`, `net.asCorrected.count`, `net.verdictUnknown`, `net.strict.min`, `net.strict.empty`, `net.strict.hint` (es) | Mezcla `evaluar/evaluación` con `corregir/corrección` (el resto de la web) | es: `net.given` `Ha corregido`; `net.received` `Le han corregido`; `net.tip.counts` `Ha corregido {given} · le han corregido {received}`; `net.asCorrector.count` `{n} correcciones hechas`; `net.asCorrected.count` `{n} correcciones recibidas`; `net.verdictUnknown` `Pocas correcciones para dar un porcentaje`; `net.strict.min` `Con al menos {n} proyectos corregidos`; `net.strict.empty` `Nadie ha corregido {n} proyectos o más con estos filtros. Baja el mínimo.`; `net.strict.hint` `Suspensos sobre proyectos ajenos corregidos...` (en puede seguir con `evaluate`) |
| `net.color.endogamy`, `net.endogamy`, `net.total.endogamy`, `net.tip.endogamy`, `net.about.endogamy`, `net.ranking`, `layout.red.endogamy` (en) | `Inbreeding`/`inbred` aplicado a personas suena a ofensivo | en: `Endogamy` (`Campus endogamy`, `Endogamy {n} · {partners} different people`, `Most endogamous`, `Endogamy goes from 0 to 100...`) |
| `net.strict.title`, `layout.red.strictest` | `Los más estrictos` con género | es: `Quién suspende más al corregir` en: `Strictest evaluators` |
| `net.limit.all` | `Todas` / en `Everyone` no dice sin límite | es: `Sin límite` en: `No limit` |
| `net.about.graph`, `net.about.endogamy` | Cuatro frases seguidas, contra la regla de dos | Trocear en tres claves cortas (`.size`, `.link`, `.communities`; `.what`, `.formula`, `.scale`) o convertir en demostración |
| `net.gaveGot`, `net.arrows.gave`, `net.arrows.got`, `net.card.open`, `net.sort.desc`, `net.sort.asc`, `net.topPairsHint` | Flechas `→ ← ↓ ↑` dentro del texto | Sacar las flechas como iconos; dejar el texto limpio (`Las que ha hecho` / `Las que le han hecho`) |
| `net.help` | `clic` / en `click` ok; `encajar` poco claro | es: `Rueda: zoom · arrastra: mover · clic: elegir · doble clic: ver todo` en: `Wheel: zoom · drag: move · click: select · double click: show all` |
| `net.fit` (`Encajar todo`) | `Encajar` poco claro | es: `Ver todo` en: `Show all` |
| `net.legend.unknown` | Duplica `admin.usage.group.unknown` | Unificar (`common.noData`) |
| `net.person.clear`, `net.backToAll` | Mismo texto, dos claves | Una sola |
| `net.projects.hint` | `Pulsa uno` ok | - |
| `net.color.failsGiven`, `net.color.failsReceived` | Largos para un selector | es: `Cuánto suspende` / `Cuánto le suspenden` en: `How much they fail` / `How much they get failed` |

### notgames.csv

| clave | problema | propuesta |
| --- | --- | --- |
| `git.needSeat` (es `un ordenador del clúster`, en `a cluster computer`) | `ordenador` frente a `puesto` en `git.practice`, `git.room.who` | es: `Los puntos y las pruebas cuentan desde un puesto del clúster. Fuera puedes ver la animación y la teoría y practicar los retos.` en: `Points and tests count from a cluster seat. Elsewhere you can watch the animation and theory and practise the challenges.` |
| `notgames.pool.common` | `sabéis todos` con género y vosotros | es: `Lo que sabe todo el grupo` en: `What everyone in the group knows` |
| `notgames.waitHost` | `estéis` (vosotros) | es: `Empieza {host} cuando esté todo el grupo.` en: `{host} starts when everyone is here.` |
| `notgames.minutesN` | `jugador` con género | es: `{n} min por persona` en: `{n} min each` |
| `notgames.chess.question` | `el primero` con género | es: `Relojes parados: ¡quien acierte primero, mueve!` en: `Clocks stopped: first right answer moves!` |
| `notgames.chess.promote` | `Corona:` suelto | es: `Coronar a:` en: `Promote to:` |
| `notgames.lives`, `notgames.secondsLeft`, `git.room.commands` | `1 vidas`, `Quedan 1 segundos`, `1 comandos` | Hacer dos claves (`.one`/`.many`) como `until.*` |
| `notgames.back`, `git.gate.rules` | Flecha `←` en el texto; `git.gate.rules` son tres frases largas | es `notgames.back`: `Salas` (flecha como icono). `git.gate.rules` es: `Antes de la prueba de grupo: 8 preguntas rápidas de lo aprendido, 20 segundos cada una. Hay que acertarlas todas. Si fallas una, puedes repetirlo una hora después; mientras, repasa lo fallado.` |
| `git.room.number` | `nº {n}` / `no. {n}` | es: `n.º {n}` en: `#{n}` |
| `notgames.create`, `git.room.create`; `notgames.join`, `git.room.join`; `notgames.leave`, `git.room.leave`; `notgames.start`, `git.room.start`; `notgames.tab.rooms`, `git.room.list` | Textos idénticos duplicados en dos prefijos | Dejar solo `notgames.*` y reutilizar en el curso de git |
| `notgames.wrong` / `notgames.noAnswer` / `notgames.answered` (`contestar`) vs `board.answer` (`responder`) | `contestar` y `responder` mezclados | Glosario: `responder` en Not-games y avisos también (`Respondido`, `Sin responder`, `Nadie respondió a tiempo`) |
| `notgames.competitive` | El texto describe la regla, la etiqueta corta (`competitiveShort`) repite | Ok |
| `notgames.chess.firstRightMe` | `Acertaste primero: mueves tú.` ok | - |

### animos.csv

Todas las filas tienen ca y eu. Problemas de género, vocabulario y concordancia:

| clave | problema | propuesta |
| --- | --- | --- |
| `cheer.ask.1`, `cheer.thanks.1` | `compañeros` masculino | es: `¿Tienes algún rato libre para ayudar a quien lo necesita?` / `¡Muchas gracias por ayudar al campus!` en: `Got a spare moment to help someone out?` / `Thank you so much for helping the campus!` |
| `cheer.ask.9` | `el doctor eres tú` | es: `¿Y si hoy te toca pasar consulta a ti?` en: `What if you're the one seeing patients today?` |
| `cheer.ask.43` | `generoso` | es: `¿Hoy te sientes con ganas de dar?` en: `Feeling like giving something today?` |
| `cheer.ask.16` | `tú tan fresco` | es: `¡Hala! Cuánta gente atascada y tú con un rato libre.` en: `Wow! So many people stuck and you with some free time.` |
| `cheer.ask.50` | `doctor disponible` | es: `¡Bip, bip! Paciente en espera. ¿Hay alguien de bata blanca?` en: `Beep, beep! Patient waiting. Anyone in a white coat?` |
| `cheer.thanks.2` | `doctor de guardia` | es: `¡Olé! Hoy hay bata blanca de guardia.` en: `Hooray! There's a white coat on duty today.` |
| `cheer.thanks.32` | `Doctor localizado` | es: `¡Qué maravilla! Bata blanca localizada.` en: `How lovely! White coat located.` |
| `cheer.thanks.25` | `agradecidos` masculino | es: `¡Gracias! Que no te falten pacientes con ganas de dar las gracias.` en: `Thanks! May you never lack patients eager to say thank you.` |
| `cheer.thanks.47` | `¡Sí, señor!` masculino | es: `¡Eso sí que sí! Así da gusto venir.` |
| `cheer.thanks.34` | `por tu culpa` | es: `¡Bravísimo! Hoy cae algún leak gracias a ti.` en: `Bravo! A leak will fall today thanks to you.` |
| `cheer.thanks.23` | `Otra vez` presupone que ya lo hizo antes | es: `¡Guau! De guardia otra vez... o por primera vez. Eres de fiar.` o quitar `Otra vez`: `¡Guau! Ya estás de guardia. Eres de fiar.` en: `Wow! On duty. You are reliable.` |
| `cheer.thanks.13`, `cheer.thanks.44` | `cluster` sin tilde | es: `¡Viva! Hay bata blanca en el clúster.` / `¡Gracias! Menos noches en vela en el clúster.` en: `cluster` ok |
| en: `cheer.ask.17`, `.18`, `.36`, `cheer.thanks.2`, `.23`, `.37` | `on call` | `on duty` (`A coffee and half an hour on duty?`, `Knock, knock! Anyone on duty?`, `How about a short duty shift?`, ...) |
| en: `cheer.thanks.6`, `.9`, `.15`, `.29`, `.41` (`Shift booked/open/under way/ready/covered`) | `shift` frente a `duty` | `Duty noted.` / `Your duty is open.` / `Duty under way.` / `Duty ready and heart happy.` / `Duty covered.` |
| `cheer.thanks.12`, `cheer.ask.35` (en `Practice open`, `Opening your practice`) | `practice` ok (consulta) pero `consulta` en la web es `consultation` (login.pitch) | Mantener |

### legal.csv

Estado: 52 filas con es y en; ca y eu vacías en las 52 (decisión documentada en `docs/textos.md` y `legal.untranslated`; incumple la regla «todo texto visible lleva las cuatro lenguas», anotado como excepción).

| clave | problema | propuesta |
| --- | --- | --- |
| `legal.doc.sections.1.body.1` | `con permiso de su aplicación` / `through its app` no se entiende | es: `Sanatorio 42 lo mantiene un estudiante de 42 Madrid (login albrodri). No es un servicio de la Fundación 42 ni de Telefónica, aunque usa la API pública de 42 mediante una aplicación registrada.` en: `Sanatorio 42 is maintained by a 42 Madrid student (login albrodri). It is not run by the 42 Foundation or Telefónica, although it uses the public 42 API through a registered app.` |
| `legal.doc.sections.1.body.2` (en) | Comillas `«»` en inglés | en: `For anything about your data, write from “Issues and suggestions” (your account menu). For a security issue, the address is in /.well-known/security.txt.` |
| `legal.doc.sections.2.body.1` (en) | Comillas `«»` | en: `When you sign in, 42 asks you to share your public profile (the “public” and “profile” scopes). From 42 we copy, for you and the rest of the campus:` |
| `legal.doc.sections.2.body.4.4`, `legal.doc.sections.4.body.1.1` (en) | `doubts` (el resto de en: `questions`) | en: `questions, answers and guides on the board;` / `...which projects you are on, your seat, whether you are on duty and what you post (messages, questions, whiteboards).` |
| `legal.doc.sections.2.body.4.3`, `.3.body.1` (en) | `boards` | en: `whiteboards` |
| `legal.doc.sections.2.body.4.5` (en) | `issue inbox` | en: `what you send through Issues and suggestions, reports and answers to announcements;` |
| `legal.doc.sections.2.body.2.5` (en) | `rank of each circle` | en: `ranks of each circle` |
| `legal.doc.sections.8.body.1.2` (en) | Apóstrofo `’` | en: `No spam and no posting other people's data.` |
| `legal.doc.sections.9.body.1` | `evaluaciones` (la web dice `correcciones`) | es: `Para lo oficial (notas, black hole, correcciones), manda la intra.` |
| `legal.doc.sections.7.body.1.3` (en) | `issue inbox` | en: `Erasure: ask through Issues and suggestions. What you created here is deleted. ...` |

### juego/juego.csv (Code Clicker)

Estado: 488 filas con es y en; ca y eu vacías en las 488 (juego secreto, se descarga aparte; incumple «cuatro lenguas»: anotado como excepción). Contextos todos rellenos.

| clave | problema | propuesta |
| --- | --- | --- |
| `game.ui.rank` | `Puesto` (en `Rank`) choca con puesto = asiento | es: `Posición` en: `Rank` |
| `game.ui.recompileAsk` | `¿Seguro?` con género | es: `¿De verdad? Vuelves a cero líneas. Subes a prestigio {n}.` en: `Really? You go back to zero lines. You reach prestige {n}.` |
| `game.ui.capital`, `game.ui.policeJump` (`capital`, en `Worth`/`capital`) vs `game.ui.wealth` (`Patrimonio`, `Net worth`) | Dos nombres | es: `Patrimonio: {n} (lo que tienes, lo que costó lo comprado y lo que deben los bugs)`; `tu patrimonio pasó de {from} a {to}...`; en: `Net worth: {n} (...)`, `your net worth went from...` |
| `game.ui.policeMoney` | `las {people} personas` con 1 sale `1 personas` | es: `...y otras tantas se reparten entre quienes juegan limpio ({people}).` en: `...shared among those who play fair ({people}).` |
| `game.buildings.cluster.1`, `.2` | `Cluster`, `clusters` (plural incorrecto en español, sin tilde) | es: `Clúster` / `clústeres`; en `Cluster`/`clusters` |
| `game.news.early.*`, `game.news.mid.*`, `.late.*`, `.one.*`, `.two.*`, `.three.*`, `.cycles.*` (en) | Citas con comillas simples `'...'` mientras el resto de en usa `“ ”` o `" "` | en: `“...”` en todas (p. ej. `News: {name} says your code is “not bad for a pisciner”.`) |
| `game.busts.1.2`, `.2.2`, `.3.2`, `.5.2`, `.9.2` (en) | Comillas rectas `"` | en: `“Ethical hacker”`, `“sold”`, `“pull”` |
| `game.busts.*` (es y en) | `banner` | es: `cabecera de tu perfil` o `banner` si es término; unificar con `xp.titles` |
| `game.busts.2.1` (en `Not so ethical hacker`), `title.hacker_poco_etico` | Ver expediente | en: `Hacker with ethical doubts` |
| `game.busts.7.2`, `game.busts.13.2` | Tono: condescendiente (`Uno de los fáciles`, `Solo nos decepcionamos`) para quien reincide muchas veces | es 7.2: `Van {n}. Con el tiempo que le estás echando a esto ya habrías aprobado un proyecto.` es 13.2: `{n}. Vendido todo. Aquí seguiremos, tú y nosotros, hasta que alguien se canse. Nosotros somos un servidor: no nos cansamos.` |
| `game.news.cycles.2.6` | en `calls you 'sir'` pierde el juego del `usted` y es masculino | en: `You have recompiled so many times that time now addresses you formally.` |
| `game.news.mid.16` | `el conserje` | es: `el personal de conserjería pide que dejes de escribir a partir de las tres de la mañana. «Es por el ruido».` en: `the front desk asks you to stop typing after three in the morning. “It's the noise.”` |
| `game.news.three.7` (en) | `behavior` americano; resto británico | en: `undefined behaviour: reality does not guarantee the result.` |
| `game.ui.spectating` (en) | Apóstrofo `’` | en: `Watching {login}'s game: nothing you touch here is saved anywhere.` |
| `game.ui.statPrestige` (`Prestigio`) vs `admin.clicker.prestige` (`Ascensos`) | Dos nombres | es: `Prestigio` en ambos |
| `game.ui.play` (`Código`, `Code`) | Etiqueta ambigua | es: `Escribir código` en: `Write code` |
| `game.achievements.pill-red.1` y `egg.red` | Texto idéntico en dos claves | Una sola |
| `game.ui.gotAchievement` y `egg.achievement` | Texto idéntico | Una sola |
| `game.ui.limitBody` | `Hoy irías a pace {pace}` es críptico | es: `Hoy bajarías a pace {pace}: con el pace en riesgo, Code Clicker se juega media hora al día. Tu partida sigue escribiendo código sola; vuelve mañana o, mejor, avanza un proyecto.` en: `You would drop to pace {pace} today: ...` |


## 3. Glosario recomendado (un término por concepto)

| Concepto | Término recomendado (es / en) | Archivos que se desvían |
| --- | --- | --- |
| Revisión de un proyecto por otra persona | `corrección` / `evaluation` | red.csv (`evaluar/evaluación` en `net.given`, `net.received`, `net.tip.counts`, `net.asCorrector.count`, `net.asCorrected.count`, `net.verdictUnknown`, `net.strict.*`), legal (`evaluaciones`), demos en (`corrections` en `tour.network.*`), comun en (`focus.show.corrections` = `Evaluations` ok) |
| Asiento físico | `puesto` / `seat` | `rank.place`, `game.ui.rank` usan `puesto` para posición (usar `posición`/`rank`); `map.seatName` y `git.needSeat` usan `PC` / `ordenador` |
| Ordenador | `ordenador` solo para la máquina averiada (`map.seatBroken`, `facility.category.computer`) | clusters, notgames |
| Edificio con ordenadores | `clúster` / `cluster` (tilde en es, plural `clústeres`) | `map.cluster`, `therapy.placeHint`, `cal.f.placeHint`, `tour.inbox.text`, `game.buildings.cluster.*`, `cheer.thanks.13/44`; `tour.clusters.1` lo llama `sala` |
| Lugar de Not-games | `sala` (de juego) / `room`; `partida` / `game` para la ronda | evitar `sala` para clúster; `sala de espera` solo para esa sección (quota.ticket.title la reutiliza) |
| Estar disponible para ayudar | `de guardia` / `on duty`; la sección `Guardia` / `Duty` | en usa `on call`, `shift` en demos, animos, comun (`nav.cat.clusters.hint`); es usa `salir de guardia` mal en `help.status.*` |
| No disponible | `fuera de turno` / `off duty`; lejos del campus `fuera del centro` / `off campus` | `peers.badgeOff` en `Off shift` |
| Aviso (notificación) | `aviso` / `notice` | `meet.*`, `layout.alerts`: `reminder`; `agenda`/`tour.guard.8`: `alert`; `recordatorio` solo para el que programa la persona (`chats.remind*`) |
| Buzón de avisos | `buzón` / `mailbox` | `admin.tab.inbox` y `admin.inbox.*` lo llaman `Buzón`/`Inbox` para las incidencias (usar `Incidencias`/`Issues`); `admin.data.kind.notices` dice `la campana` |
| Apuntarse | `apuntarse` / `join` (o `sign up`) | cal.join (`Sign me up`), therapy.join (`Unirme`), agenda.join |
| Responder | `responder` / `answer` | notgames y `meet` usan `contestar` |
| Actualizar | `actualizar` / `refresh` | `exams.refresh` (`Refrescar`) |
| Aprobar un proyecto | `aprobar` / `pass` | clusters (`terminó`, `Lo han terminado`), `welcome.net.body` en `finished` |
| Plan de estudios | `plan` / `plan` | exams en `track`, admin en `Curriculum`, `stats.progress.plan` |
| Primer mes de promoción | `kickoff` / `kickoff` (no `promoción`; ya se cumple) | - |
| Año de llegada | `Año de llegada` / `Arrival year` | `admin.usage.by.cohort` (`Año de inicio`) |
| Valor de la partida de Code Clicker | `patrimonio` / `net worth` | `clicker.review.*`, `game.ui.capital`, `game.ui.policeJump`, `admin.clicker.alerts/trace/capital`, `admin.data.kind.clicker_*` (`capital`/`worth`) |
| Subida del juego | `prestigio` / `prestige` | `admin.clicker.prestige` (`Ascensos`) |
| Cabecera del perfil | decidir: `banner` o `cabecera del perfil` | xp.titles, cgraph.master*, admin.clicker.pardonAsk, game.busts.* |
| Quien administra | `quien administra` / `whoever runs the site` | ok; `administrator(s)` solo en `admin.only`, `admin.people.admins` |
| Tablón | `Tablón` / `Board` en navegación; `Tablón de dudas` / `Question board` en el título | `nav.tablon` en `Questions` |
| Duda | `duda` / `question` | legal en `doubts` |
| Pizarra | `pizarra` / `whiteboard` | `boards` en estadisticas, tablon, guardia, legal |
| Preevaluar | `preevaluar` / `pre-review` | guardia, sala-de-espera (`pre-evaluate`, `practice evaluation`) |
| Mostrar | `enseñar` y `mostrar` conviven; fijar `enseñar` | no urgente |
| Tuteo | siempre tú | `quota.ticket.*` (usted), `campus.other`, `clusters.chatEmpty`, `notgames.waitHost`, `peers.groupHint` (vosotros) |
| Idioma del texto legal | `español` | `legal.untranslated` y docs/textos.md dicen `castellano` |
| Contracciones en inglés | siempre con contracción (`can't`, `I'm`) | `focus.reason.*`, `legal.notAccepted`, `login.staff`, `notices.kind.booking_declined` |
| Ortografía inglesa | británica (`colour`, `customise`, `organiser`, `behaviour`) | `behavior` en `game.news.three.7`; `color` en banco |
| Comillas en inglés | `“ ”` | `«»` en `welcome.duty.body`, `legal.*`, gitsim; `'...'` en `game.news.*`; `"..."` en `game.busts.*` |
| Puntos suspensivos | `…` | `...` en en/ca/eu de 9 claves |

## 4. Textos escritos en el código

### 4.1 Web (`apps/web/src`, .ts/.tsx fuera de tests)

La regla «los textos solo viven en las tablas» se cumple en los componentes: no hay JSX con texto español. Quedan estos casos:

| Fichero | Texto | Propuesta |
| --- | --- | --- |
| `apps/web/src/shared/api/http.ts:54` | `No se puede conectar con el servidor` (error de red) | Usar `t('error.network')` (ya existe) |
| `apps/web/src/main.tsx:15` | `Falta el elemento #root en index.html` | Error de desarrollo, no llega a pantalla; dejar |
| `apps/web/src/themes/*/theme.ts` | Nombre y descripción de cada estilo en es/en/ca/eu dentro del propio fichero (`Clínica`, `Crudo`, `Sobrio`, `Cálido`, `Ciencia ficción`, `Lleopard…`), `Océano`, `Ámbar` | Pasar a una tabla `estilos.csv` o dejarlo documentado como excepción |
| `apps/web/src/shared/i18n/index.tsx` | `Español`, `Català`... (autónimos) | Correcto |
| `apps/web/src/shared/api/mock/*.ts` (133 literales en 18 ficheros: `data.ts` 20, `gitcourse.ts` 25, `quiz.ts` 23, `admin.ts` 13, `meet.ts` 9, `staff.ts` 7, `state.ts` 7...) | Datos y errores de la demostración pública, siempre en español: p. ej. `Ese código no corresponde a ningún documento emitido`, `El grupo está completo`, `Para cambiar una duda resuelta, primero reábrela`, `Esa trampa ya no está`, `Cuéntalo con un poco más de detalle`, `Solo quien abrió el grupo puede cambiarlo` | Los errores del mock imitan los de la API: en la demo se ven en español aunque se cambie de idioma. Mismo tratamiento que los de la API (ver 4.2) |

### 4.2 API (`apps/api/src`)

Hay **207 llamadas a `domainError(code, message)`** con mensaje en español (más 9 `new DomainError`). Reparto: `help.service` 22, `therapy.service` 19, `quiz/games/turns.service` 18, `doubts.service` 17, `boards.service` 16, `quiz.service` 13, `gitcourse/rooms` 13, `admin.service` 13, `clicker.service` 11, `staff.service` 9, `attendance.service` 9, `profile/xp.service` 7, `meet.service` 6. AGENTS.md ya lo apunta como pendiente (fuera del español se enseña uno genérico). Los más visibles (los ve cualquier persona en un uso normal):

| Origen | Mensaje actual | Propuesta (es, tono sin culpa) |
| --- | --- | --- |
| auth | `No hay sesión iniciada` | `Tu sesión ha caducado. Vuelve a entrar con 42.` |
| auth | `La sesión de login no es válida o ha caducado` | `El inicio de sesión ha caducado. Prueba otra vez.` |
| auth | `Tu cuenta está bloqueada: {motivo}` | `Tu cuenta está bloqueada ({motivo}). Escribe a quien administra si crees que es un error.` |
| help | `Ya tienes varias reservas hoy` / `Ya tienes {booked} minutos reservados hoy` / `Ya tienes una reserva hoy con {x}` | `Hoy ya tienes el máximo de reservas. Prueba mañana.` / `Hoy ya has reservado {booked} min: es el máximo.` / `Hoy ya tienes una reserva con {x}.` |
| help | `Ya habías valorado esa sesión` | `Esa sesión ya está valorada.` |
| help | `No puedes reservarte a ti` / `No puedes bloquearte a ti` | `Elige a otra persona.` / `No puedes bloquearte a ti.` |
| help | `Podrás valorarla cuando termine la franja` | `Podrás valorarla cuando termine la franja.` |
| help/attendance | `Valida primero el código de inicio`, `Todavía es pronto para validar el código de inicio`, `Los códigos los valida quien asiste, no quien organiza` | `Primero hay que validar el código de inicio.` / `Aún es pronto para validar el código de inicio.` / `Los códigos los valida quien asiste.` |
| therapy | `Ya tienes varios grupos abiertos. Cierra alguno antes`, `El grupo está completo`, `No quedan plazas`, `Este grupo es de repaso: es para quien ya tiene el proyecto terminado al 100 %` | Mantener (claros); añadir punto final a todos (hoy hay mezcla con y sin punto) |
| doubts | `Ya has puesto muchas dudas hoy. Mañana más` | `Hoy has puesto ya muchas dudas. Mañana puedes seguir.` |
| doubts | `Solo quien puso la duda puede quitarla / darla por resuelta / cambiarla` | Mantener |
| boards | `Una pizarra dura entre unos minutos y cuatro horas`, `La pizarra tiene que ser en el futuro` | Mantener |
| quiz | `No juegas en esta sala`, `La partida ya ha empezado`, `Un duelo es de dos personas`, `La supervivencia es de dos personas o más`, `Solo quien creó la sala puede empezar`, `Esa sala ya no existe` | Mantener |
| gitcourse | `Ya estás en otra sala del curso: sal de ella antes` | `Ya estás en otra sala del curso. Sal de ella antes de entrar en esta.` |
| clicker | `Ya elegiste, y no hay vuelta atrás` | `Ya elegiste pastilla y no se puede cambiar.` |
| staff | `Esa cuenta de staff ya no tiene acceso`, `Solo para cuentas de staff`, `Esta cuenta solo sirve para validar documentos` | Mantener |
| general | `Esto no existe`, `Ese aviso no existe`, `Ese grupo no existe` | `No hemos encontrado eso.` (unificar los 4 `... no existe`) |
| general | `No conocemos a {login}` / `No conocemos a nadie con ese login` | Mantener |
| validación | `{what} "{raw}" no existe` (comillas rectas) | usar `«{raw}»` |

Mensajes de integración (`ApiError` en `integrations/forty-two`, `modules/auth/oauth-client.ts`) están en español y son técnicos (`La respuesta de /oauth/token no trae access_token`); no llegan a pantalla, solo a logs. Dejarlos.

Propuesta general: dar a cada `domainError` un código estable (`help.max_bookings`) y que la web lo traduzca con claves `err.*` en `comun.csv`, como ya hace con `error.409/403/404/400`.

## 5. Problemas sistemáticos

### 5.1 Tablas (CSV)

1. `...` (tres puntos) en en, ca y eu, y `…` en es: `app.loading`, `sync.copyingStart`, `xp.loading`, `cal.loading`, `projects.loading`, `peers.loading`, `peers.nobody`, `board.loading`, `therapy.loading`. Cambiar en las tres columnas.
2. Apóstrofo tipográfico `’` en 9 textos en (resto `'`): `health.paceIntraHint`, `hours.hintAll`, `admin.budget.level.admin_only`, `admin.budget.level.stopped`, `admin.budget.hint`, `game.ui.spectating`, `legal.doc.sections.8.body.1.2`, `cal.removeAsk`, `therapy.removeAsk`. En ca hay 32 con `’` y 284 con `'`: unificar a `'`.
3. Número + sustantivo sin plural (`1 sesiones`, `1 intentos`, `quedan 1 días`): `agenda.seatsOpen`, `meet.att.attempts`, `exams.bh.left`, `stats.*.value/.extra`, `notgames.lives`, `notgames.secondsLeft`, `git.room.commands`, `admin.cheats.writeAll`, `game.ui.policeMoney`, `clusters.count`, `exams.avg`. Solución: pares `.one`/`.many` como ya hace `until.*`.
4. Masculino genérico que tiene alternativa: `Maestro del código`, `Interno de planta`, `Jefe de planta`, `Guardián del campus`, `Loco por los datos`, `Hacker ético`, `Apuntados`, `Jugadores`, `Los más estrictos`, `Ocasionales/Habituales/Intensivos`, `Seguro` (en 3 diálogos), `compañeros`, `generoso`, `doctor`, `agradecidos`, `tú tan fresco`.
5. Botones sin verbo: `facility.resolve` (`Resuelto`), `board.flag` (`No es acertado`), `help.bookSend` (`Pedir`), `layout.mode.manual` (`Yo`).
6. Símbolos dentro del texto (la regla del proyecto es solo iconos de `Icon.tsx`): `★` `✦` (`peers.specialist`, `peers.eminence`, `board.status.specialist`), flechas `← → ↑ ↓ ▸ ▾ ↗` (`record.backToMine`, `record.intra`, `net.gaveGot`, `net.arrows.*`, `net.card.open`, `net.sort.*`, `notgames.back`, `graph.expand/collapse`, `admin.stats.everyone`, `admin.flows.step`), `+` (`cal.yours`).
7. `cluster` sin tilde y `clusters` en plural: ver glosario.
8. Contextos pobres: gestion.csv (469 filas, 80 contextos distintos). Contextos con `de el` en demos.csv (`tour.board.*`, `tour.agenda.*`, `tour.record.*`, `tour.mailbox.*`).
9. Mismos textos repetidos en varias claves que podrían ser una: `Cancelar` (4), `Aceptar`/`Rechazar` (`help.*`, `helpGate.*`, `board.accept`), `Entendido` (5), `Cerrar` (4), `Guardar`, `Borrar` (3), `Todos/Todas` (9), `Desde`/`Hasta` (5 y 5), `y {n} más` (3), `Círculo {n}` (3), `Periodo` (6), `Persona`/`Personas` (6), `Empezar`, `Salir`, `Crear una sala`, `Entrar`, `Salas`, `Anterior`/`Siguiente` (4), `{h} h {m} min` (2), `Asistencia validada: {n} min.` (2), `Con Sanatorio abierto` (2), `Paciente de guardia`/`Especialista de guardia` (4), `Libre` (2), `Logro conseguido` (2), `La pastilla roja` (2), `Volver a todo el campus` (2), `Se enseñan las {n} más recientes.` (2). Se pueden dejar si el contexto cambia, pero entonces el contexto debe decirlo.
10. Convención de claves: mezcla de español e inglés y de nivel (`nav.consulta` = sala de espera; `nav.cat.*`; `layout.expediente.*` y `layout.page.*`; `error.409`; `cheer.ask.N`). Dentro de `notgames.csv` hay dos prefijos (`notgames.*` y `git.*`) y `notgames.chess.*`/`notgames.end.*`. Solo informativo: no se renombra sin tocar el código.
11. Longitud: textos de más de dos frases contra `docs/textos.md`: `stats.progress.info`, `cgraph.intro`, `net.about.graph`, `net.about.endogamy`, `hours.hint`, `git.gate.rules`, `admin.budget.hint`, `welcome.*.body` (ok).

### 5.2 Banco de preguntas de Not-games (`apps/api/src/modules/quiz/bank`)

- Cobertura: los 12 ficheros por tema tienen traducción inglesa completa (175 conceptos con las mismas claves; `review-a/b/git` otros 175 conceptos en `en/review-*.ts`), sin huecos.
- Tipografía: el español usa `...` (53 ocurrencias; salvo en código C/C++ que es correcto), comillas rectas `"` (86, la mayoría en código) y `«»` (35) mezcladas en el texto narrativo. Unificar el texto narrativo a `«»` y `…`.
- En inglés: `«»` se mantiene (17) en citas de textos españoles (aceptable en `gitsim`), pero en el banco debería ser `“ ”`; `...` 21 veces; mezcla `color`/`colour` (14 y 7: aquí `color` se refiere a nombres en código como `gfx-color`, y prosa como `the color comes from`) -> usar `colour` en prosa.
- Comprobar en el banco: las preguntas de ejemplo tienen `ask` con varias formas, sin género; no se han encontrado `cluster` sin tilde ni `evalu`.
- Revisión de fondo (corrección técnica de respuestas) queda fuera de este alcance.

### 5.3 Curso de git (`packages/gitsim/src/levels`)

- `en/` traduce `basics.ts`, `groups.ts` y `shared.ts`; no hay `en/build.ts` ni `en/gates.ts` (27 y 112 líneas): comprobar si contienen texto de pantalla (`gates.ts` 27 líneas, `build.ts` 112).
- Los textos de `groups.ts` español usan `«…»` para citar nombres de misión (`«- coordinación»`, `«Rompe {n}»`) y en inglés se copian tal cual con `«»`: el inglés debería llevar `“ ”`. Mezcla de texto español dentro del inglés a propósito (nombres de ficheros del ejemplo), pero conviene mantenerlo igual en las dos para que la comprobación de la misión coincida.
- Los mensajes de misión usan `{login}` y `{n}` correctamente en los dos idiomas.
- Vocabulario: `puesto` y `ordenador` conviven con `git.needSeat` (ver glosario).
