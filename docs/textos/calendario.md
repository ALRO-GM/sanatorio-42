# Textos: calendario

Generado desde `apps/web/src/shared/i18n/textos/calendario.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

102 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `agenda.title` | Título de la página del calendario | features/calendar/CalendarPage | Tu calendario | Your calendar | El teu calendari | Zure egutegia |
| `agenda.today` | Botón: volver a hoy | features/calendar/CalendarPage | Hoy | Today | Avui | Gaur |
| `agenda.tabs` | Calendario: las dos vistas de la pestaña | features/calendar/CalendarPage | Qué ver | What to see | Què veure | Zer ikusi |
| `agenda.tab.calendar` | Calendario: la vista del calendario | features/calendar/CalendarPage | Calendario | Calendar | Calendari | Egutegia |
| `agenda.tab.countdowns` | Calendario: la vista de cuentas atrás | features/calendar/CalendarPage | Cuentas atrás | Countdowns | Comptes enrere | Atzerako kontaketak |
| `agenda.view` | Selector de vista: día, semana o mes | features/calendar/CalendarPage | Vista | View | Vista | Ikuspegia |
| `agenda.layout` | Selector de cómo se dibuja el día | features/calendar/CalendarPage | Cómo ver el día | How to see the day | Com veure el dia | Eguna nola ikusi |
| `agenda.layout.list` | Forma del día: lista | features/calendar/CalendarPage | Lista | List | Llista | Zerrenda |
| `agenda.layout.full` | Forma del día: las 24 horas | features/calendar/CalendarPage | Día entero | Whole day | Dia sencer | Egun osoa |
| `agenda.layout.fit` | Forma del día: solo las horas con algo | features/calendar/CalendarPage | Ajustada | Fitted | Ajustada | Doitua |
| `agenda.layout.now` | Forma del día: desde la hora actual | features/calendar/CalendarPage | Desde ahora | From now | Des d'ara | Oraintik |
| `agenda.layout.list.hint` | Explicación de la lista | features/calendar/CalendarPage | Una actividad debajo de otra, con su inicio y su fin | One activity under another, with start and end | Una activitat sota l'altra, amb l'inici i el final | Jarduerak bata bestearen azpian, hasiera eta amaierarekin |
| `agenda.layout.full.hint` | Explicación del día entero | features/calendar/CalendarPage | Todas las horas del día, cada actividad en su franja | Every hour of the day, each activity in its slot | Totes les hores del dia, cada activitat a la seva franja | Eguneko ordu guztiak, jarduera bakoitza bere tartean |
| `agenda.layout.fit.hint` | Explicación del día ajustado | features/calendar/CalendarPage | De la primera actividad a la última: se ven más grandes | From the first activity to the last: they look bigger | De la primera activitat a l'última: es veuen més grans | Lehen jardueratik azkenera: handiago ikusten dira |
| `agenda.layout.now.hint` | Explicación de desde ahora | features/calendar/CalendarPage | Desde la hora actual hasta la última actividad del día | From the current time to the last activity of the day | Des de l'hora actual fins a l'última activitat del dia | Oraingo ordutik eguneko azken jarduerara |
| `agenda.waiting` | Cuánto falta para lo siguiente | features/calendar/DayTimeline | Lo siguiente, en {time} | Next up in {time} | El següent, d'aquí a {time} | Hurrengoa, {time} barru |
| `agenda.nothingLeft` | No queda nada hoy | features/calendar/DayTimeline | Por hoy no te queda nada más | Nothing else for you today | Avui no et queda res més | Gaur ez zaizu ezer gehiago geratzen |
| `agenda.hoursMinutes` | Duración en horas y minutos | features/calendar/DayTimeline | {h} h {m} min | {h} h {m} min | {h} h {m} min | {h} h {m} min |
| `agenda.minutes` | Duración en minutos | features/calendar/DayTimeline | {m} min | {m} min | {m} min | {m} min |
| `agenda.view.day` | Vista: día | features/calendar/CalendarPage | Día | Day | Dia | Eguna |
| `agenda.view.week` | Vista: semana | features/calendar/CalendarPage | Semana | Week | Setmana | Astea |
| `agenda.view.month` | Vista: mes | features/calendar/CalendarPage | Mes | Month | Mes | Hilabetea |
| `agenda.kinds` | Filtro de tipos de evento | features/calendar/CalendarPage | Tipos de evento | Event types | Tipus d'esdeveniment | Ekitaldi motak |
| `agenda.kindsShow` | Calendario: delante de los tipos de evento, para que se vea que filtran | features/calendar/CalendarPage | Ver: | Show: | Mostra: | Erakutsi: |
| `agenda.kind.help` | Tipo de evento: tu on-call y reservas de ayuda | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | On-call | On-call | On-call | On-call |
| `agenda.kind.therapy` | Tipo de evento: sprints | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | Sprints | Sprints | Sprints | Sprintak |
| `agenda.kind.board` | Tipo de evento: pizarras | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | Pizarras | Whiteboards | Pissarres | Arbelak |
| `agenda.kind.evaluation` | Tipo de evento: correcciones de 42 | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | Correcciones | Evaluations | Correccions | Zuzenketak |
| `agenda.kind.event_joined` | Tipo de evento: eventos de 42 a los que vas | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | Eventos a los que vas | Events you're going to | Esdeveniments on vas | Joango zaren ekitaldiak |
| `agenda.kind.event_open` | Tipo de evento: eventos de 42 a los que no te has apuntado | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | Otros eventos de 42 | Other 42 events | Altres esdeveniments de 42 | 42ko beste ekitaldiak |
| `agenda.kind.exam` | Tipo de evento: exámenes de 42 | features/calendar/AgendaTour, features/calendar/CalendarPage, features/calendar/CountdownsView, features/calendar/EventChip, features/calendar/EventDialog | Exámenes | Exams | Exàmens | Azterketak |
| `agenda.loading` | Mientras carga el calendario | features/calendar/CalendarPage | Preparando tu calendario… | Getting your calendar ready… | Preparant el teu calendari… | Zure egutegia prestatzen… |
| `agenda.more` | Cuántos eventos más hay ese día | features/calendar/CalendarPage | +{n} más | +{n} more | +{n} més | +{n} gehiago |
| `agenda.empty` | Día sin nada | features/calendar/CalendarPage, features/calendar/DayTimeline | Nada | Nothing | Res | Ezer ez |
| `agenda.no42` | No se pudo leer 42 | features/calendar/CalendarPage | No se han podido leer los datos de 42: solo ves lo de Peer4U. | Couldn't read the 42 data: you only see Peer4U events. | No s'han pogut llegir les dades de 42: només veus el de Peer4U. | Ezin izan dira 42ko datuak irakurri: Peer4U-koak bakarrik ikusten dituzu. |
| `agenda.from42` | Cuándo se leyeron los datos de 42 | features/calendar/CalendarPage | Eventos, exámenes y correcciones de 42 leídos hace {min} min. | 42 events, exams and evaluations read {min} min ago. | Esdeveniments, exàmens i correccions de 42 llegits fa {min} min. | 42ko ekitaldiak, azterketak eta zuzenketak duela {min} min irakurrita. |
| `agenda.back` | Botón para volver al calendario desde un evento | features/calendar/EventDialog | Volver al calendario | Back to the calendar | Torna al calendari | Itzuli egutegira |
| `agenda.join` | Calendario: botón de la ficha para apuntarse a una pizarra o un grupo | features/calendar/EventDialog | Apuntarme | Join | Apunta'm | Izena eman |
| `agenda.when` | Ficha del evento: cuándo | features/calendar/EventDialog | Cuándo | When | Quan | Noiz |
| `agenda.where` | Ficha del evento: dónde | features/calendar/EventDialog | Dónde | Where | On | Non |
| `agenda.with` | Ficha del evento: con quién | features/calendar/EventDialog | Con | With | Amb | Norekin |
| `agenda.seats` | Ficha del evento: plazas | features/calendar/EventDialog | Plazas | Seats | Places | Plazak |
| `agenda.you` | Tú, en una lista de personas | features/calendar/EventDialog, features/notgames/RoomView, features/notgames/TurnRoomView | Tú | You | Tu | Zu |
| `agenda.seatsOpen` | Gente apuntada sin límite de plazas | features/calendar/EventDialog | Apuntadas: {taken} (sin tope) | Signed up: {taken} (no limit) | Apuntades: {taken} (sense límit) | Izena emanda: {taken} (mugarik gabe) |
| `agenda.seatsOf` | Plazas ocupadas y totales | features/calendar/EventDialog | {taken} de {max} | {taken} of {max} | {taken} de {max} | {max}tik {taken} |
| `agenda.joined` | Estado: te has apuntado | features/calendar/EventDialog | Te has apuntado | You've signed up | T'hi has apuntat | Izena emanda |
| `agenda.notJoined.help` | Estado: reserva pendiente de aceptar | features/calendar/EventDialog | Pendiente de aceptar | Waiting to be accepted | Pendent d'acceptar | Onartzeko zain |
| `agenda.notJoined.therapy` | Estado: no estás en el grupo | features/calendar/EventDialog | No estás en el grupo | You are not in the group | No ets al grup | Ez zaude taldean |
| `agenda.notJoined.board` | Estado: sin plaza en la pizarra | features/calendar/EventDialog | No tienes plaza | You have no seat | No tens plaça | Ez duzu plazarik |
| `agenda.notJoined.evaluation` | Las correcciones no tienen estado (se deja una raya) | features/calendar/EventDialog | — | — | — | — |
| `agenda.notJoined.event_joined` | Estado: no te has apuntado | features/calendar/EventDialog | No te has apuntado | Not signed up | No t'hi has apuntat | Ez duzu izena emanda |
| `agenda.notJoined.event_open` | Estado: no te has apuntado | features/calendar/EventDialog | No te has apuntado | Not signed up | No t'hi has apuntat | Ez duzu izena emanda |
| `agenda.notJoined.exam` | Estado: no te has apuntado | features/calendar/EventDialog | No te has apuntado | Not signed up | No t'hi has apuntat | Ez duzu izena emanda |
| `agenda.open42` | Enlace al evento en la intra de 42 | features/calendar/EventDialog | Abrir en 42 | Open on 42 | Obre a 42 | Ireki 42n |
| `agenda.goTo` | Botón para ir a la sección del evento | features/calendar/EventDialog | Ir a {section} | Go to {section} | Ves a {section} | Joan hona: {section} |
| `meet.alert` | Aviso obligatorio antes de un evento: cuánto falta | features/calendar/EventDialog | Empieza en {minutes} min | Starts in {minutes} min | Comença d'aquí a {minutes} min | {minutes} min barru hasiko da |
| `meet.reply` | Título del aviso al que hay que responder | features/calendar/EventRoom | Responder al aviso | Reply to the notice | Respon a l'avís | Erantzun abisuari |
| `meet.seen` | Respuesta al aviso: voy | features/calendar/AgendaTour, features/calendar/EventRoom, features/help/GuardTour | Voy | Going | Hi vaig | Banoa |
| `meet.mustReply` | Por qué hay que responder el aviso | features/calendar/EventDialog | Di si vas, si te retrasas o si no vas: el aviso se cierra al responder. | Say whether you are going, running late or not going: the notice closes when you answer. | Digues si hi vas, si fas tard o si no hi vas: l'avís es tanca en responder. | Esan bazoazen, berandu zabiltzan edo ez zoazen: abisua erantzutean ixten da. |
| `meet.missed` | No contestaste y se te marca como ausente | features/calendar/EventDialog | No respondiste al aviso y ya ha pasado media hora desde el inicio, así que figuras como ausente. | You didn't answer the notice and half an hour has passed since the start, so you're marked as absent. | No vas responder l'avís i ja ha passat mitja hora des de l'inici, així que figures com a absent. | Ez zenion abisuari erantzun eta ordu erdi igaro da hasi zenetik, beraz absente gisa agertzen zara. |
| `meet.queued` | Cuántos avisos más quedan | features/admin/BroadcastGate, features/calendar/EventDialog | {n} más después | {n} more after this | {n} més després | {n} gehiago gero |
| `meet.late` | Respuesta al aviso: llego tarde | features/calendar/AgendaTour, features/calendar/EventRoom, features/help/GuardTour | Me retraso | I'll be late | Faig tard | Berandu nabil |
| `meet.absent` | Respuesta al aviso: no puedo ir | features/calendar/AgendaTour, features/calendar/EventRoom, features/help/GuardTour | No puedo ir | I can't make it | No hi puc anar | Ezin naiz joan |
| `meet.howLong` | Cuánto tiempo de retraso | features/calendar/EventRoom | Cuánto tiempo | How long | Quant temps | Zenbat denbora |
| `meet.minutes` | Minutos de retraso | features/calendar/EventRoom | {n} min | {n} min | {n} min | {n} min |
| `meet.tell` | Botón para enviar la respuesta | features/calendar/EventRoom | Avisar | Let them know | Avisa | Abisatu |
| `meet.reason.evaluation` | Motivo: corrección | features/calendar/EventRoom, shared/chat/Chat | Estoy en una corrección | I'm in an evaluation | Soc en una correcció | Zuzenketa batean nago |
| `meet.reason.other_event` | Motivo: otro evento | features/calendar/EventRoom, shared/chat/Chat | Estoy en otro evento | I'm at another event | Soc en un altre esdeveniment | Beste ekitaldi batean nago |
| `meet.reason.on_my_way` | Motivo: en camino | features/calendar/EventRoom, shared/chat/Chat | Voy de camino | I'm on my way | Vaig de camí | Bidean noa |
| `meet.reason.transport` | Motivo: el transporte | features/calendar/EventRoom, shared/chat/Chat | El transporte | Transport | El transport | Garraioa |
| `meet.reason.other` | Motivo: otro | features/calendar/EventRoom, shared/chat/Chat | Otro motivo | Another reason | Un altre motiu | Beste arrazoi bat |
| `meet.said.seen` | Lo que respondió alguien: va | features/admin/AdminPage, shared/chat/Chat | Va | Is going | Hi va | Badoa |
| `meet.reason.missed` | Lo que pasó: no respondió | features/calendar/EventRoom, shared/chat/Chat | no respondió al aviso | did not answer the notice | no va responder l'avís | ez zion abisuari erantzun |
| `meet.said.late` | Lo que respondió alguien: llega tarde | features/admin/AdminPage, shared/chat/Chat | Se retrasa {n} min | Will be {n} min late | Fa tard {n} min | {n} min berandu dabil |
| `meet.said.absent` | Lo que respondió alguien: no va | features/admin/AdminPage, shared/chat/Chat | No puede ir | Can't make it | No hi pot anar | Ezin du joan |
| `meet.chat` | Chat del evento | features/admin/AdminPage, shared/chat/Chat | Chat del evento | Event chat | Xat de l'esdeveniment | Ekitaldiaren txata |
| `meet.chatNotice` | Aviso de privacidad del chat | features/notices/Conversations, shared/chat/Chat | Los mensajes se guardan. Quien administra la web puede leerlos si hay una denuncia. | Messages are kept. Whoever runs the site can read them if there is a report. | Els missatges es guarden. Qui administra la web els pot llegir si hi ha una denúncia. | Mezuak gorde egiten dira. Weba kudeatzen duenak irakur ditzake salaketa bat badago. |
| `meet.chatEmpty` | Chat sin mensajes | shared/chat/Chat | Nadie ha escrito todavía. Lo que pongas lo ve toda la gente del evento. | Nobody has written yet. Everyone in the event sees what you post. | Ningú ha escrit encara. El que posis ho veu tota la gent de l'esdeveniment. | Inork ez du oraindik idatzi. Jartzen duzuna ekitaldiko guztiek ikusten dute. |
| `meet.write` | Campo para escribir un mensaje | shared/chat/Chat | Escribe un mensaje… | Write a message… | Escriu un missatge… | Idatzi mezu bat… |
| `meet.att.title` | Apartado de asistencia con códigos | features/alerts/AlertCenter, features/boards/BoardsTour, features/calendar/Attendance | Asistencia | Attendance | Assistència | Bertaratzea |
| `meet.att.hostHint` | Instrucciones para quien organiza | features/calendar/Attendance | Enseña el código de inicio al empezar y el de fin al terminar. Quien asiste lo escribe o escanea el QR; sin los dos no cuenta. | Show the start code at the beginning and the end code when you finish. Attendees type it or scan the QR; without both it does not count. | Ensenya el codi d'inici en començar i el de fi en acabar. Qui hi assisteix l'escriu o escaneja el QR; sense tots dos no compta. | Erakutsi hasierako kodea hastean eta amaierakoa bukatzean. Bertaratzen denak idatzi edo QRa eskaneatzen du; biak gabe ez du balio. |
| `meet.att.start` | Inicio | features/boards/BoardsTour, features/calendar/Attendance | Inicio | Start | Inici | Hasiera |
| `meet.att.end` | Fin | features/calendar/Attendance | Fin | End | Fi | Amaiera |
| `meet.att.startCode` | Código de inicio para validar asistencia | features/boards/BoardsTour, features/calendar/Attendance | Código de inicio | Start code | Codi d'inici | Hasierako kodea |
| `meet.att.endCode` | Código de fin para validar asistencia | features/boards/BoardsTour, features/calendar/Attendance | Código de fin | End code | Codi de fi | Amaierako kodea |
| `meet.att.pending` | Falta el código de fin | features/calendar/Attendance | falta el de fin | end code missing | falta el de fi | amaierakoa falta da |
| `meet.att.minutes` | Minutos validados | features/calendar/Attendance | {n} min | {n} min | {n} min | {n} min |
| `meet.att.refresh` | Botón para ver quién ha validado | features/calendar/Attendance | Actualizar quién ha validado | Refresh who has checked in | Actualitza qui ha validat | Eguneratu nork balidatu duen |
| `meet.att.guestStart` | Instrucción para escribir el código de inicio | features/calendar/Attendance | Escribe el código de inicio que te enseñe quien organiza. | Type the start code the organiser shows you. | Escriu el codi d'inici que t'ensenyi qui organitza. | Idatzi antolatzaileak erakusten dizun hasierako kodea. |
| `meet.att.guestEnd` | Instrucción para escribir el código de fin | features/calendar/Attendance | Empezaste a las {time}. Al terminar, escribe el código de fin. | You started at {time}. When you finish, type the end code. | Vas començar a les {time}. En acabar, escriu el codi de fi. | {time}etan hasi zinen. Bukatzean, idatzi amaierako kodea. |
| `meet.att.guestDone` | Asistencia validada | features/calendar/Attendance | Asistencia validada: {n} min. | Attendance validated: {n} min. | Assistència validada: {n} min. | Bertaratzea balidatuta: {n} min. |
| `meet.att.windowStart` | Cuándo vale el código de inicio | features/calendar/Attendance | El código de inicio vale de {from} a {to}. | The start code works from {from} to {to}. | El codi d'inici val de {from} a {to}. | Hasierako kodeak {from}etatik {to}etara balio du. |
| `meet.att.windowEnd` | Cuándo vale el código de fin | features/calendar/Attendance | El de fin vale cuando han pasado {n} min desde el de inicio, y hasta las {to}. | The end code works {n} min after the start one, and until {to}. | El de fi val quan han passat {n} min des del d'inici, i fins a les {to}. | Amaierakoak hasierakotik {n} min igaro direnean balio du, eta {to}ak arte. |
| `meet.att.attempts` | Intentos que quedan | features/calendar/Attendance | Intentos que te quedan con un código equivocado: {n}. | Attempts left with a wrong code: {n}. | Intents que et queden amb un codi equivocat: {n}. | Kode okerrarekin geratzen zaizkizun saiakerak: {n}. |
| `meet.att.locked` | Sin intentos | features/calendar/Attendance | Se han agotado los intentos en este evento: ya no se puede validar aquí. Habla con quien organiza. | You have used all your attempts for this event, so you can't validate here any more. Talk to the organiser. | S'han esgotat els intents en aquest esdeveniment: ja no es pot validar aquí. Parla amb qui organitza. | Saiakerak agortu dira ekitaldi honetan: ezin da hemen jada balidatu. Hitz egin antolatzen duenarekin. |
| `meet.att.code` | Campo del código | features/calendar/Attendance | Código de cuatro caracteres | Four-character code | Codi de quatre caràcters | Lau karaktereko kodea |
| `meet.att.validate` | Botón para validar el código | features/alerts/AlertCenter, features/boards/BoardsTour, features/calendar/Attendance | Validar | Validate | Valida | Balidatu |
| `meet.qr.start` | Al escanear el QR de inicio | features/alerts/AlertCenter | Código de inicio validado. Al terminar, escanea el de fin. | Start code validated. When you finish, scan the end one. | Codi d'inici validat. En acabar, escaneja el de fi. | Hasierako kodea balidatuta. Bukatzean, eskaneatu amaierakoa. |
| `meet.qr.end` | Al escanear el QR de fin | features/alerts/AlertCenter | Asistencia validada: {n} min. | Attendance validated: {n} min. | Assistència validada: {n} min. | Bertaratzea balidatuta: {n} min. |
| `meet.qr.confirm` | Confirmación al abrir un QR | features/alerts/AlertCenter | ¿Validar tu asistencia con el código {code}? | Validate your attendance with code {code}? | Vols validar la teva assistència amb el codi {code}? | Zure bertaratzea {code} kodearekin balidatu nahi duzu? |
| `event.confirm` | Confirmación de la fecha de un evento nuevo | features/boards/BoardForm, features/therapy/GroupForm | Va a ser el {when}: dentro de {in}. ¿Es correcto? | It will be on {when}: in {in}. Is that right? | Serà el {when}: d'aquí a {in}. És correcte? | {when} izango da: {in} barru. Zuzena da? |
| `event.horizon` | Límite para crear eventos: dos meses | features/boards/BoardForm, features/therapy/GroupForm | Como mucho, con dos meses de antelación | At most two months ahead | Com a màxim, amb dos mesos d'antelació | Gehienez, bi hilabete lehenago |
