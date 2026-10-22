# Textos: pizarras

Generado desde `apps/web/src/shared/i18n/textos/pizarras.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

38 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `cal.title` | Título de la página de pizarras (charlas abiertas sobre un tema) | features/boards/BoardsCalendar | Calendario de pizarras | Whiteboard calendar | Calendari de pissarres | Arbelen egutegia |
| `cal.loading` | Mientras carga el calendario de pizarras | features/boards/BoardsCalendar | Mirando la agenda… | Checking the schedule… | Mirant l'agenda… | Agenda begiratzen… |
| `cal.months` | Nombres de los meses, separados por comas | features/boards/BoardsCalendar | Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre | January,February,March,April,May,June,July,August,September,October,November,December | Gener,Febrer,Març,Abril,Maig,Juny,Juliol,Agost,Setembre,Octubre,Novembre,Desembre | Urtarrila,Otsaila,Martxoa,Apirila,Maiatza,Ekaina,Uztaila,Abuztua,Iraila,Urria,Azaroa,Abendua |
| `cal.monthsShort` | Meses abreviados en mayúsculas, separados por comas | features/boards/BoardCard | ENE,FEB,MAR,ABR,MAY,JUN,JUL,AGO,SEP,OCT,NOV,DIC | JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC | GEN,FEB,MAR,ABR,MAI,JUN,JUL,AGO,SET,OCT,NOV,DES | URT,OTS,MAR,API,MAI,EKA,UZT,ABU,IRA,URR,AZA,ABE |
| `cal.weekdaysShort` | Días abreviados en mayúsculas, de lunes a domingo, separados por comas | features/boards/BoardCard | LUN,MAR,MIÉ,JUE,VIE,SÁB,DOM | MON,TUE,WED,THU,FRI,SAT,SUN | DL,DT,DC,DJ,DV,DS,DG | AL,AR,AZ,OG,OR,LR,IG |
| `cal.legend` | Leyenda del calendario | features/boards/BoardsCalendar | Hoy: marcado en turquesa · Punto: hay pizarra | Today: in turquoise · Dot: there is a whiteboard | Avui: marcat en turquesa · Punt: hi ha pissarra | Gaur: turkesaz markatuta · Puntua: arbela dago |
| `cal.prev` | Botón: mes anterior | features/boards/BoardsCalendar | Mes anterior | Previous month | Mes anterior | Aurreko hilabetea |
| `cal.next` | Botón: mes siguiente | features/boards/BoardsCalendar | Mes siguiente | Next month | Mes següent | Hurrengo hilabetea |
| `cal.nextBoard` | Etiqueta de la próxima pizarra | features/boards/BoardCard | Próxima pizarra | Next whiteboard | Pròxima pissarra | Hurrengo arbela |
| `cal.seats` | Plazas ocupadas y totales | features/boards/BoardCard | {taken} de {capacity} plazas | {taken} of {capacity} seats | {taken} de {capacity} places | {capacity} plazatik {taken} |
| `cal.join` | Botón para apuntarse | features/boards/BoardCard, features/boards/BoardsTour | Apuntarme | Join | Apunta-m'hi | Eman izena |
| `cal.upcoming` | Lista de las próximas pizarras con plaza (sin día elegido) | features/boards/BoardsCalendar | Próximas pizarras con plaza | Upcoming whiteboards with seats | Properes pissarres amb lloc | Leku libreko hurrengo arbelak |
| `cal.pastTitle` | Pizarras: encabezado de las ya pasadas del mes que se ve, debajo de las próximas | features/boards/BoardsCalendar | Ya pasadas | Already held | Ja passades | Dagoeneko eginak |
| `cal.upcomingEmpty` | No hay pizarras próximas con plaza | features/boards/BoardsCalendar | No hay pizarras con plaza en los próximos dos meses. ¿Propones tú una? | No whiteboards with seats in the next two months. Want to propose one? | No hi ha pissarres amb lloc als propers dos mesos. En proposes una? | Ez dago leku libreko arbelik hurrengo bi hilabeteetan. Zuk proposatu nahi duzu bat? |
| `cal.leave` | Botón para desapuntarse | features/boards/BoardCard | Desapuntarme | Leave | Desapunta-me'n | Kendu izena |
| `cal.full` | Pizarra completa | features/boards/BoardCard | Completa | Full | Completa | Beteta |
| `cal.cancel` | Botón para cancelar tu pizarra | features/boards/BoardCard | Cancelar pizarra | Cancel whiteboard | Cancel·la la pissarra | Bertan behera utzi arbela |
| `cal.remove` | Botón de moderación para retirar una pizarra | features/boards/BoardCard | Retirar como moderación | Remove as moderator | Retira com a moderació | Kendu moderazio gisa |
| `cal.removeAsk` | Confirmación antes de retirar una pizarra | features/boards/BoardCard | ¿Retirar la pizarra de {host}? Se cancela y se avisa a quien se había apuntado. | Remove {host}'s whiteboard? It is cancelled and everyone signed up is told. | Vols retirar la pissarra de {host}? Es cancel·la i s'avisa qui s'hi havia apuntat. | {host}(r)en arbela kendu? Bertan behera geratzen da eta izena emandakoei abisatzen zaie. |
| `cal.past` | Pizarra ya pasada | features/boards/BoardCard | Ya pasó | Already held | Ja ha passat | Pasa da |
| `cal.empty` | No hay pizarras ese mes | features/boards/BoardsCalendar | Este mes no hay pizarras. | No whiteboards this month. | Aquest mes no hi ha pissarres. | Hilabete honetan ez dago arbelik. |
| `cal.yours` | Invitación a proponer una pizarra en un hueco | features/boards/BoardsCalendar | Tu pizarra puede estar aquí | Your whiteboard could be here | La teva pissarra pot ser aquí | Zure arbela hemen egon daiteke |
| `cal.pitchTitle` | Título de la invitación a dar una pizarra | features/boards/BoardsCalendar | ¿Dominas un concepto? | Know a concept inside out? | Domines un concepte? | Kontzeptu bat menderatzen duzu? |
| `cal.pitch` | Texto de la invitación a dar una pizarra | features/boards/BoardsCalendar | Da una pizarra, reserva una sala y gana XP ayudando a toda la comunidad. | Run a whiteboard, book a room and earn XP for helping the whole community. | Fes una pissarra, reserva una sala i guanya XP per ajudar tota la comunitat. | Eman arbel bat, erreserbatu gela bat eta irabazi XP komunitate osoari laguntzeagatik. |
| `cal.proposeBtn` | Botón para proponer una pizarra | features/boards/BoardForm, features/boards/BoardsCalendar, features/boards/BoardsTour | Proponer una pizarra | Propose a whiteboard | Proposa una pissarra | Proposatu arbel bat |
| `cal.f.title` | Formulario: título | features/boards/BoardForm | Título | Title | Títol | Izenburua |
| `cal.f.titleHint` | Ejemplo de título | features/boards/BoardForm | malloc: dónde vive tu memoria | malloc: where your memory lives | malloc: on viu la teva memòria | malloc: non bizi den zure memoria |
| `cal.f.topic` | Formulario: tema o proyecto | features/boards/BoardForm | Tema o proyecto | Topic or project | Tema o projecte | Gaia edo proiektua |
| `cal.f.topicHint` | Ejemplo de tema | features/boards/BoardForm | ft_printf | ft_printf | ft_printf | ft_printf |
| `cal.f.place` | Formulario: sala | features/boards/BoardForm | Sala | Room | Sala | Gela |
| `cal.f.placeHint` | Ejemplo de sala | features/boards/BoardForm | Clúster 1, sala de pizarras | Cluster 1, whiteboard room | Clúster 1, sala de pissarres | 1. klusterra, arbelen gela |
| `cal.f.date` | Formulario: día | features/boards/BoardForm | Día | Day | Dia | Eguna |
| `cal.f.start` | Formulario: hora de inicio | features/boards/BoardForm | Desde | From | Des de | Noiztik |
| `cal.f.end` | Formulario: hora de fin | features/boards/BoardForm | Hasta | To | Fins a | Noiz arte |
| `cal.f.capacity` | Formulario: plazas | features/boards/BoardForm | Plazas | Seats | Places | Plazak |
| `cal.f.description` | Formulario: descripción opcional | features/boards/BoardForm | De qué va (opcional) | What it's about (optional) | De què va (opcional) | Zertaz den (aukerakoa) |
| `cal.f.create` | Formulario: botón para proponer | features/boards/BoardForm | Proponer | Propose | Proposa | Proposatu |
| `cal.editTitle` | Título del formulario de edición | features/boards/BoardForm | Cambiar la pizarra | Change the whiteboard | Canvia la pissarra | Aldatu arbela |
