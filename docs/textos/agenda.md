# Textos: agenda

Generado desde `apps/web/src/shared/i18n/textos/agenda.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

144 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `scrum.title` | Título de la agenda (Scrum individual por proyecto) | features/agenda/AgendaPage | Tu agenda | Your agenda | La teva agenda | Zure agenda |
| `scrum.loading` | Mientras carga la agenda | features/agenda/AgendaPage | Haciendo git pull de tu agenda… | Pulling your agenda… | Fent git pull de la teva agenda… | Zure agenda git pull egiten… |
| `scrum.new` | Botón y título del formulario: poner una meta nueva | features/agenda/AgendaPage, features/agenda/GoalForm | Nueva meta | New goal | Nova fita | Helburu berria |
| `scrum.countdown` | Agenda: botón que abre la ventanita de cuentas atrás (tu próximo compromiso o una propia) | features/agenda/AgendaPage | Cuenta atrás | Countdown | Compte enrere | Atzerako kontaketa |
| `scrum.calendar` | Agenda: botón que lleva al calendario | features/agenda/AgendaPage | Ver el calendario | Open the calendar | Veure el calendari | Ikusi egutegia |
| `scrum.empty` | Agenda sin metas en marcha | features/agenda/AgendaPage | Sin metas en marcha. Elige un proyecto y ponle fecha de deploy. | No goals in progress. Pick a project and give it a deploy date. | Sense fites en marxa. Tria un projecte i posa-li data de deploy. | Ez dago helbururik martxan. Aukeratu proiektu bat eta jarri deploy data. |
| `scrum.noProjects` | Agenda: no hay proyectos que elegir | features/agenda/AgendaPage | No vemos proyectos tuyos todavía. Apúntate a uno en la intra y vuelve. | We cannot see any projects of yours yet. Register for one on the intra and come back. | Encara no veiem projectes teus. Apunta't a un a la intra i torna. | Oraindik ez dugu zure proiekturik ikusten. Eman izena batean intran eta itzuli. |
| `scrum.closed.show` | Agenda: desplegar las metas cerradas | features/agenda/AgendaPage | Ver las cerradas ({n}) | Show closed ones ({n}) | Veure les tancades ({n}) | Ikusi itxitakoak ({n}) |
| `scrum.closed.hide` | Agenda: plegar las metas cerradas | features/agenda/AgendaPage | Ocultar las cerradas ({n}) | Hide closed ones ({n}) | Amagar les tancades ({n}) | Ezkutatu itxitakoak ({n}) |
| `scrum.events` | Agenda: título de lo de 42 a lo que vas en dos semanas | features/agenda/AgendaPage | Lo de 42 a lo que vas | Your 42 events | El de 42 on vas | Joango zaren 42ko ekitaldiak |
| `scrum.events.empty` | Agenda: no hay eventos de 42 en dos semanas | features/agenda/AgendaPage | Nada de 42 en las próximas dos semanas. | Nothing from 42 in the next two weeks. | Res de 42 les properes dues setmanes. | Ezer ez 42tik hurrengo bi asteetan. |
| `scrum.project` | Formulario de meta: campo del proyecto | features/agenda/GoalForm | Proyecto | Project | Projecte | Proiektua |
| `scrum.project.doing` | Formulario de meta: grupo de proyectos que tienes en curso | features/agenda/GoalForm | En curso | In progress | En curs | Martxan |
| `scrum.project.next` | Formulario de meta: grupo de lo siguiente de tu plan | features/agenda/GoalForm | Lo siguiente de tu plan | Next in your plan | El següent del teu pla | Zure planeko hurrengoa |
| `scrum.targetDay` | Meta: el día para el que te la pones | features/agenda/GoalCard, features/agenda/GoalForm | Fecha de entrega | Hand-in date | Data de lliurament | Entrega-data |
| `scrum.progress` | Meta: cuánto llevas | features/agenda/GoalCard, features/agenda/GoalForm | Cuánto llevas | How far along | Quant portes | Zenbat daramazun |
| `scrum.progress.zero` | Avance: 0 % | features/agenda/steps | 0 % · ni un commit | 0 % · not a single commit | 0 % · ni un commit | % 0 · commit bat ere ez |
| `scrum.progress.full` | Avance: 100 % | features/agenda/steps | 100 % · listo para entregar | 100 % · ready to hand in | 100 % · llest per lliurar | % 100 · entregatzeko prest |
| `scrum.progress.change` | Nombre accesible del desplegable para cambiar el avance de una meta | features/agenda/GoalCard | Cambiar cuánto llevas | Change how far along you are | Canviar quant portes | Aldatu zenbat daramazun |
| `scrum.note` | Meta: lo que te queda, en pocas palabras | features/agenda/GoalCard, features/agenda/GoalForm | Lo que queda | What is left | El que queda | Geratzen dena |
| `scrum.note.hint` | Ejemplo del campo de lo que queda | features/agenda/GoalForm | Ej.: el %p y los flags | E.g. %p and the flags | P. ex.: el %p i els flags | Adib.: %p eta flagak |
| `scrum.checkpoints` | Meta: título de la lista de checkpoints | features/agenda/GoalCard, features/agenda/GoalForm | Checkpoints | Checkpoints | Checkpoints | Checkpointak |
| `scrum.check.remove` | Nombre accesible del botón que quita un checkpoint | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Quitar «{name}» | Remove “{name}” | Treure «{name}» | Kendu «{name}» |
| `scrum.check.add` | Botón: añadir el checkpoint elegido | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Añadir | Add | Afegir | Gehitu |
| `scrum.check.pick` | Primera opción del desplegable de checkpoints | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Añade un checkpoint… | Add a checkpoint… | Afegeix un checkpoint… | Gehitu checkpoint bat… |
| `scrum.check.own` | Opción del desplegable: un checkpoint escrito por ti | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Otro (escríbelo) | Other (write it) | Un altre (escriu-lo) | Beste bat (idatzi) |
| `scrum.check.ownText` | Nombre accesible del campo del checkpoint propio | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Tu checkpoint | Your checkpoint | El teu checkpoint | Zure checkpointa |
| `scrum.check.ownHint` | Ejemplo de checkpoint propio | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Ej.: probar con -fsanitize=address | E.g. test with -fsanitize=address | P. ex.: provar amb -fsanitize=address | Adib.: probatu -fsanitize=address-ekin |
| `scrum.create` | Botón: guardar la meta nueva | features/agenda/GoalForm | Poner meta | Set goal | Posar fita | Ezarri helburua |
| `scrum.check.works` | Checkpoint: el código funciona | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | El código funciona | The code works | El codi funciona | Kodeak funtzionatzen du |
| `scrum.check.subject` | Checkpoint: el subject está cubierto entero | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Subject cubierto entero | Subject fully covered | Subject cobert sencer | Subject-a osorik betea |
| `scrum.check.sheet` | Checkpoint: la hoja de corrección está repasada | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Hoja de corrección repasada | Evaluation sheet reviewed | Full de correcció repassat | Zuzenketa-orria berrikusita |
| `scrum.check.norminette` | Checkpoint: pasa la norminette | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Norminette en verde | Norminette passes | Norminette en verd | Norminette berdean |
| `scrum.check.leaks` | Checkpoint: sin leaks ni segfaults | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Sin leaks ni segfaults | No leaks or segfaults | Sense leaks ni segfaults | Leak eta segfault gabe |
| `scrum.check.breakers` | Checkpoint: varios peers han intentado romperlo | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Varios peers han intentado romperlo | Several peers tried to break it | Diversos peers han intentat trencar-lo | Hainbat peerrek apurtzen saiatu dira |
| `scrum.check.git` | Checkpoint: el repo está limpio y subido | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Repo limpio y pusheado | Repo clean and pushed | Repo net i pujat | Repoa garbi eta pusheatuta |
| `scrum.check.slots` | Checkpoint: las franjas de corrección están reservadas | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Slots de corrección reservados | Evaluation slots booked | Slots de correcció reservats | Zuzenketa-slotak erreserbatuta |
| `scrum.check.flags` | Checkpoint: compila con -Wall -Wextra -Werror (y -std=c++98) | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Compila con -Wall -Wextra -Werror | Compiles with -Wall -Wextra -Werror | Compila amb -Wall -Wextra -Werror | -Wall -Wextra -Werror-ekin konpilatzen da |
| `scrum.check.canonical` | Checkpoint de C++: forma canónica ortodoxa en cada clase | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Forma canónica en cada clase | Orthodox canonical form in every class | Forma canònica a cada classe | Forma kanonikoa klase guztietan |
| `scrum.check.pytools` | Checkpoint de Python: pasa flake8 y mypy | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | flake8 y mypy en verde | flake8 and mypy pass | flake8 i mypy en verd | flake8 eta mypy berdean |
| `scrum.check.tests` | Checkpoint: los tests pasan | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Los tests pasan | Tests pass | Els tests passen | Testak gainditzen dira |
| `scrum.check.rebuild` | Checkpoint de sistemas: se monta desde cero sin tocar nada a mano | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Se monta desde cero sin tocar nada | Builds from scratch, hands off | Es munta des de zero sense tocar res | Hutsetik eraikitzen da, ezer ukitu gabe |
| `scrum.check.inputs` | Checkpoint: aguanta entradas malas (mapas rotos, argumentos raros) | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Aguanta mapas y argumentos rotos | Survives broken maps and arguments | Aguanta mapes i arguments trencats | Mapa eta argumentu hautsiei eusten die |
| `scrum.check.window` | Checkpoint gráfico: la ventana se cierra limpia (ESC y la cruz) | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | La ventana se cierra limpia | The window closes cleanly | La finestra es tanca neta | Leihoa garbi ixten da |
| `scrum.check.practice` | Checkpoint de examen: has practicado todos los niveles | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Practicados todos los niveles | Practised every level | Practicats tots els nivells | Maila guztiak landuta |
| `scrum.check.mock` | Checkpoint de examen: simulacro con el reloj en marcha | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Simulacro con el reloj en marcha | Timed mock exam done | Simulacre amb el rellotge en marxa | Erlojupeko simulakroa eginda |
| `scrum.check.registered` | Checkpoint de examen: apuntado en la intra | features/agenda/GoalCard, features/agenda/GoalForm, features/agenda/ScrumTour, shared/agenda/labels | Apuntado al examen en la intra | Registered for the exam on the intra | Apuntat a l'examen a la intra | Azterketan izena emanda intran |
| `scrum.problem.none` | Primera opción del desplegable de atascos: ninguno | features/agenda/EntryForm, features/agenda/ScrumTour, shared/agenda/labels | Sin atascos | No blockers | Sense encallades | Blokeorik ez |
| `scrum.problem.concept` | Atasco: un concepto | features/agenda/EntryForm, shared/agenda/labels | Atascado en un concepto | Stuck on a concept | Encallat en un concepte | Kontzeptu batean trabatuta |
| `scrum.problem.bug` | Atasco: un bug que no encuentras | features/agenda/EntryForm, features/agenda/ScrumTour, shared/agenda/labels | Un bug que no encuentro | A bug I cannot find | Un bug que no trobo | Aurkitzen ez dudan bug bat |
| `scrum.problem.memory` | Atasco: leaks o segfaults | features/agenda/EntryForm, features/agenda/ScrumTour, shared/agenda/labels | Leaks o segfaults | Leaks or segfaults | Leaks o segfaults | Leakak edo segfaultak |
| `scrum.problem.norminette` | Atasco: la norminette | features/agenda/EntryForm, shared/agenda/labels | La norminette | Norminette | La norminette | Norminette |
| `scrum.problem.subject` | Atasco: entender el subject | features/agenda/EntryForm, shared/agenda/labels | Entender el subject | Understanding the subject | Entendre el subject | Subject-a ulertzea |
| `scrum.problem.time` | Atasco: no te dio tiempo | features/agenda/EntryForm, shared/agenda/labels | No me dio tiempo | I ran out of time | No em va donar temps | Ez zitzaidan denborarik iritsi |
| `scrum.problem.motivation` | Atasco: la motivación | features/agenda/EntryForm, shared/agenda/labels | Motivación | Motivation | Motivació | Motibazioa |
| `scrum.problem.waiting` | Atasco: esperando una corrección o un slot | features/agenda/EntryForm, shared/agenda/labels | Esperando corrección o slot | Waiting for an evaluation or slot | Esperant correcció o slot | Zuzenketa edo slot baten zain |
| `scrum.problem.cluster_full` | Atasco: el clúster estaba lleno | features/agenda/EntryForm, shared/agenda/labels | El clúster estaba lleno | The cluster was full | El clúster era ple | Klusterra beteta zegoen |
| `scrum.problem.failed_eval` | Atasco: suspendiste una corrección | features/agenda/EntryForm, shared/agenda/labels | Suspendí una corrección | I failed an evaluation | Vaig suspendre una correcció | Zuzenketa bat gainditu ez nuen |
| `scrum.problem.personal` | Atasco: motivos personales | features/agenda/EntryForm, shared/agenda/labels | Motivos personales | Personal reasons | Motius personals | Arrazoi pertsonalak |
| `scrum.problem.other` | Atasco: otro (se escribe) | features/agenda/EntryForm, features/agenda/ScrumTour, shared/agenda/labels | Otro | Other | Un altre | Beste bat |
| `scrum.solution.none` | Primera opción del desplegable de salidas: aún no lo sabes | features/agenda/EntryForm, shared/agenda/labels | Aún no lo sé | Not sure yet | Encara no ho sé | Oraindik ez dakit |
| `scrum.solution.peer2peer` | Salida: preguntar en Peer to peer | features/agenda/EntryForm, shared/agenda/labels | Preguntar en Peer to peer | Ask on Peer to peer | Preguntar a Peer to peer | Galdetu Peer to peer-en |
| `scrum.solution.book_help` | Salida: reservar ayuda con alguien disponible | features/agenda/EntryForm, shared/agenda/labels | Reservar ayuda | Book help | Reservar ajuda | Laguntza erreserbatu |
| `scrum.solution.pair` | Salida: programar en pareja | features/agenda/EntryForm, shared/agenda/labels | Pair programming con alguien | Pair up with someone | Pair programming amb algú | Norbaitekin pair programming |
| `scrum.solution.sprint` | Salida: pedírselo a tu sprint | features/agenda/EntryForm, shared/agenda/labels | Pedírselo a mi sprint | Ask my sprint | Demanar-ho al meu sprint | Nire sprintari eskatu |
| `scrum.solution.whiteboard` | Salida: ir a una pizarra | features/agenda/EntryForm, shared/agenda/labels | Ir a una pizarra | Go to a whiteboard | Anar a una pissarra | Arbel batera joan |
| `scrum.solution.docs` | Salida: leer la documentación o el man | features/agenda/EntryForm, shared/agenda/labels | Leer la doc o el man | Read the docs or the man page | Llegir la doc o el man | Doka edo man-a irakurri |
| `scrum.solution.debugger` | Salida: depurar con gdb, valgrind o prints | features/agenda/EntryForm, shared/agenda/labels | Depurar: gdb, valgrind, prints | Debug: gdb, valgrind, prints | Depurar: gdb, valgrind, prints | Araztu: gdb, valgrind, prints |
| `scrum.solution.split` | Salida: partir la tarea en trozos | features/agenda/EntryForm, shared/agenda/labels | Partir la tarea en trozos | Split the task | Partir la tasca en trossos | Zeregina zatitu |
| `scrum.solution.rest` | Salida: descansar y volver con la cabeza fresca | features/agenda/EntryForm, shared/agenda/labels | Descansar y volver fresco | Rest and come back fresh | Descansar i tornar fresc | Atseden hartu eta fresko itzuli |
| `scrum.solution.other` | Salida: otra (se escribe) | features/agenda/EntryForm, shared/agenda/labels | Otra | Other | Una altra | Beste bat |
| `scrum.outcome.done` | Cómo fue: lo hiciste | features/agenda/EntryForm, shared/agenda/labels | Hecho | Done | Fet | Eginda |
| `scrum.outcome.partial` | Cómo fue: a medias | features/agenda/EntryForm, shared/agenda/labels | A medias | Halfway | A mitges | Erdizka |
| `scrum.outcome.not_done` | Cómo fue: no lo hiciste | features/agenda/EntryForm, shared/agenda/labels | No lo hice | Not done | No ho vaig fer | Ez nuen egin |
| `scrum.outcome.open` | Cómo fue: aún sin cerrar (lo que te propones hoy) | features/agenda/EntryForm, shared/agenda/labels | Aún en marcha | Still open | Encara en marxa | Oraindik martxan |
| `scrum.kind.daily` | Tipo de entrada: el de un día | features/agenda/EntryForm, features/agenda/GoalCard, features/agenda/ScrumTour, shared/agenda/SprintBoardView | Daily | Daily | Daily | Daily |
| `scrum.kind.weekly` | Tipo de entrada: el de una semana | features/agenda/EntryForm, features/agenda/GoalCard, shared/agenda/SprintBoardView | Weekly | Weekly | Weekly | Weekly |
| `scrum.kindOf.c` | Tipo de proyecto: C | features/agenda/GoalCard | C | C | C | C |
| `scrum.kindOf.graphics` | Tipo de proyecto: gráfico (MiniLibX) | features/agenda/GoalCard | Gráficos | Graphics | Gràfics | Grafikoak |
| `scrum.kindOf.cpp` | Tipo de proyecto: C++ | features/agenda/GoalCard | C++ | C++ | C++ | C++ |
| `scrum.kindOf.python` | Tipo de proyecto: Python | features/agenda/GoalCard | Python | Python | Python | Python |
| `scrum.kindOf.sysadmin` | Tipo de proyecto: sistemas y redes | features/agenda/GoalCard | Sistemas | Sysadmin | Sistemes | Sistemak |
| `scrum.kindOf.exam` | Tipo de proyecto: examen | features/agenda/GoalCard | Examen | Exam | Examen | Azterketa |
| `scrum.kindOf.other` | Tipo de proyecto: otro | features/agenda/GoalCard | Otro | Other | Un altre | Beste bat |
| `scrum.status.done` | Meta cerrada: la entregaste | features/agenda/GoalCard | Entregada | Handed in | Lliurada | Entregatuta |
| `scrum.status.dropped` | Meta cerrada: la dejaste | features/agenda/GoalCard | Dejada | Dropped | Deixada | Utzita |
| `scrum.due.today` | Meta: el día es hoy | shared/agenda/labels | Es hoy | It is today | És avui | Gaur da |
| `scrum.due.left.one` | Meta: falta un día | shared/agenda/labels | Queda {n} día | {n} day left | Queda {n} dia | Egun {n} geratzen da |
| `scrum.due.left.many` | Meta: faltan varios días | features/agenda/ScrumTour, shared/agenda/labels | Quedan {n} días | {n} days left | Queden {n} dies | {n} egun geratzen dira |
| `scrum.due.late.one` | Meta: se pasó hace un día | shared/agenda/labels | Se pasó hace {n} día | {n} day late | Es va passar fa {n} dia | Duela egun {n} pasatu zen |
| `scrum.due.late.many` | Meta: se pasó hace varios días | shared/agenda/labels | Se pasó hace {n} días | {n} days late | Es va passar fa {n} dies | Duela {n} egun pasatu zen |
| `scrum.goal.label` | Nombre accesible de la tarjeta de una meta | features/agenda/GoalCard | Meta: {project} | Goal: {project} | Fita: {project} | Helburua: {project} |
| `scrum.sprint.frame.one` | Marco de la meta: va con tu sprint (tú solo, por ahora) | features/agenda/GoalCard | En tu sprint · {place} · {n} persona | In your sprint · {place} · {n} person | Al teu sprint · {place} · {n} persona | Zure sprintean · {place} · pertsona {n} |
| `scrum.sprint.frame.many` | Marco de la meta: va con tu sprint, con más gente | features/agenda/GoalCard | En tu sprint · {place} · {n} personas | In your sprint · {place} · {n} people | Al teu sprint · {place} · {n} persones | Zure sprintean · {place} · {n} pertsona |
| `scrum.sprint.show` | Botón: ver el tablero del sprint | features/agenda/GoalCard, features/therapy/GroupCard | Ver el tablero | Show the board | Veure el tauler | Ikusi taula |
| `scrum.sprint.hide` | Botón: ocultar el tablero del sprint | features/agenda/GoalCard, features/therapy/GroupCard | Ocultar el tablero | Hide the board | Amagar el tauler | Ezkutatu taula |
| `scrum.sprint.find` | Botón: buscar un sprint de ese proyecto | features/agenda/GoalCard | Buscar sprint | Find a sprint | Buscar sprint | Bilatu sprinta |
| `scrum.entries` | Meta: título de la lista de dailies y weeklies | features/agenda/GoalCard | Dailies y weeklies | Dailies and weeklies | Dailies i weeklies | Daily eta weekly-ak |
| `scrum.entries.more.one` | Botón: ver uno más | features/agenda/GoalCard | Ver {n} más | Show {n} more | Veure'n {n} més | Ikusi {n} gehiago |
| `scrum.entries.more.many` | Botón: ver los demás | features/agenda/GoalCard | Ver {n} más | Show {n} more | Veure'n {n} més | Ikusi {n} gehiago |
| `scrum.entry.planned.one` | Daily: cuántos checkpoints te propusiste (uno) | features/agenda/GoalCard | {n} checkpoint en el plan | {n} checkpoint planned | {n} checkpoint al pla | Checkpoint {n} planean |
| `scrum.entry.planned.many` | Daily: cuántos checkpoints te propusiste (varios) | features/agenda/GoalCard | {n} checkpoints en el plan | {n} checkpoints planned | {n} checkpoints al pla | {n} checkpoint planean |
| `scrum.entry.write` | Botón: apuntar un daily o weekly | features/agenda/GoalCard | Apuntar daily | Log a daily | Apuntar daily | Daily-a idatzi |
| `scrum.entry.title` | Nombre accesible del formulario del daily | features/agenda/EntryForm | Daily de {project} | {project} daily | Daily de {project} | {project}-ren daily-a |
| `scrum.entry.kind` | Nombre accesible de las pastillas daily o weekly | features/agenda/EntryForm | Tipo | Type | Tipus | Mota |
| `scrum.entry.day` | Daily: el día | features/agenda/EntryForm | Día | Day | Dia | Eguna |
| `scrum.entry.week` | Weekly: un día de la semana (se guarda su lunes) | features/agenda/EntryForm | Semana de | Week of | Setmana de | Astea |
| `scrum.entry.outcome` | Daily: si lo hiciste | features/agenda/EntryForm | ¿Lo hiciste? | Did you do it? | Ho vas fer? | Egin zenuen? |
| `scrum.entry.problem` | Daily: qué te atascó | features/agenda/EntryForm, features/agenda/ScrumTour | ¿Qué te atascó? | What blocked you? | Què et va encallar? | Zerk blokeatu zintuen? |
| `scrum.entry.problemOther` | Daily: escribir el atasco «Otro» | features/agenda/EntryForm | ¿Cuál? | Which one? | Quin? | Zein? |
| `scrum.entry.solution` | Daily: cómo podrías desatascarte | features/agenda/EntryForm | ¿Cómo podrías salir? | How could you get unstuck? | Com en podries sortir? | Nola atera zintezke? |
| `scrum.entry.solutionOther` | Daily: escribir la salida «Otra» | features/agenda/EntryForm | ¿Qué harías? | What would you do? | Què faries? | Zer egingo zenuke? |
| `scrum.entry.progress` | Daily: avance de la meta | features/agenda/EntryForm | Cuánto llevas ahora | How far along now | Quant portes ara | Zenbat daramazun orain |
| `scrum.entry.progressSame` | Daily: dejar el avance como está | features/agenda/EntryForm | Igual ({n} %) | Same ({n} %) | Igual ({n} %) | Berdin (% {n}) |
| `scrum.entry.note` | Daily: nota corta opcional | features/agenda/EntryForm | Nota | Note | Nota | Oharra |
| `scrum.entry.noteHint` | Ejemplo de nota del daily | features/agenda/EntryForm | Ej.: valgrind me chiva 3 bloques | E.g. valgrind flags 3 blocks | P. ex.: valgrind em xiva 3 blocs | Adib.: valgrind-ek 3 bloke salatzen ditu |
| `scrum.entry.planDay` | Daily: los checkpoints que te propones hoy | features/agenda/EntryForm | Hoy me propongo | Today I will | Avui em proposo | Gaur hau egingo dut |
| `scrum.entry.planWeek` | Weekly: los checkpoints que te propones esta semana | features/agenda/EntryForm | Esta semana me propongo | This week I will | Aquesta setmana em proposo | Aste honetan hau egingo dut |
| `scrum.entry.save` | Botón: guardar el daily | features/agenda/EntryForm, features/agenda/ScrumTour | Commitear | Commit | Commitejar | Commit egin |
| `scrum.pin` | Botón: fijar la fecha de entrega como cuenta atrás | features/agenda/GoalCard | Fijar cuenta atrás | Pin countdown | Fixar compte enrere | Finkatu atzerako kontaketa |
| `scrum.unpin` | Botón: quitar la cuenta atrás de la meta | features/agenda/GoalCard | Quitar cuenta atrás | Unpin countdown | Treure compte enrere | Kendu atzerako kontaketa |
| `scrum.pin.title` | Título de la cuenta atrás de una meta | features/agenda/GoalCard | Entrega de {project} | {project} hand-in | Lliurament de {project} | {project}-ren entrega |
| `scrum.close.done` | Botón: marcar la meta como entregada | features/agenda/GoalCard | Entregado | Handed in | Lliurat | Entregatuta |
| `scrum.close.dropped` | Botón: dejar la meta | features/agenda/GoalCard | Dejarla | Drop it | Deixar-la | Utzi |
| `scrum.reopen` | Botón: volver a abrir una meta cerrada | features/agenda/GoalCard | Reabrir | Reopen | Reobrir | Berriro ireki |
| `scrum.removeAsk` | Pregunta antes de borrar una meta | features/agenda/GoalCard | ¿Borrar la meta de {project} con sus dailies? Esto no tiene git revert. | Delete the {project} goal and its dailies? There is no git revert for this. | Esborrar la fita de {project} amb els seus dailies? Això no té git revert. | {project}-ren helburua eta bere daily-ak ezabatu? Honek ez du git revert-ik. |
| `scrum.board.title` | Título del tablero del sprint | features/agenda/ScrumTour, shared/agenda/SprintBoardView | Tablero del sprint | Sprint board | Tauler de l'sprint | Sprintaren taula |
| `scrum.board.loading` | Mientras carga el tablero del sprint | shared/agenda/SprintBoardView | Cargando el tablero… | Loading the board… | Carregant el tauler… | Taula kargatzen… |
| `scrum.board.caption` | Leyenda de la tabla del tablero del sprint | shared/agenda/SprintBoardView | Cómo va cada cual con {project} | How everyone is doing with {project} | Com va cadascú amb {project} | Nola doan bakoitza {project}-rekin |
| `scrum.board.who` | Columna: la persona | shared/agenda/SprintBoardView | Quién | Who | Qui | Nor |
| `scrum.board.target` | Columna: fecha de entrega | shared/agenda/SprintBoardView | Entrega | Hand-in | Lliurament | Entrega |
| `scrum.board.progress` | Columna: avance | shared/agenda/SprintBoardView | Avance | Progress | Avenç | Aurrerapena |
| `scrum.board.checkpoints` | Columna: checkpoints hechos | shared/agenda/SprintBoardView | Checkpoints | Checkpoints | Checkpoints | Checkpointak |
| `scrum.board.latest` | Columna: último daily o weekly | shared/agenda/SprintBoardView | Último daily | Latest daily | Últim daily | Azken daily-a |
| `scrum.board.blocker` | Columna: si está atascado | shared/agenda/SprintBoardView | Bloqueo | Blocker | Bloqueig | Blokeoa |
| `scrum.board.you` | Tablero: marca de tu fila | shared/agenda/SprintBoardView | tú | you | tu | zu |
| `scrum.board.noGoal` | Tablero: esa persona no tiene meta del proyecto | shared/agenda/SprintBoardView | Aún sin meta de este proyecto en su agenda. | No goal for this project in their agenda yet. | Encara sense fita d'aquest projecte a la seva agenda. | Oraindik ez du proiektu honen helbururik bere agendan. |
| `scrum.board.doneOf` | Checkpoints hechos de los que hay | features/agenda/GoalCard, shared/agenda/SprintBoardView | {done}/{total} | {done}/{total} | {done}/{total} | {done}/{total} |
| `scrum.board.noDaily` | Tablero: aún no ha apuntado nada | shared/agenda/SprintBoardView | Sin dailies | No dailies | Sense dailies | Daily-rik ez |
| `scrum.board.flowing` | Tablero: sin atascos | shared/agenda/SprintBoardView | Fluyendo | Flowing | Fluint | Jarioan |
| `scrum.board.more` | Botón: ver el detalle de una persona del tablero | shared/agenda/SprintBoardView | Ver lo de {login} | Show {login} | Veure el de {login} | Ikusi {login}-rena |
| `scrum.board.less` | Botón: ocultar el detalle de una persona del tablero | shared/agenda/SprintBoardView | Ocultar lo de {login} | Hide {login} | Amagar el de {login} | Ezkutatu {login}-rena |
| `scrum.board.stuckOn` | Tablero: el primer checkpoint sin hacer | shared/agenda/SprintBoardView | Va por | Working on | Va per | Honetan dabil |
| `scrum.board.plan` | Tablero: cómo piensa desatascarse | shared/agenda/SprintBoardView | Plan para salir | Plan to get unstuck | Pla per sortir-ne | Ateratzeko plana |
