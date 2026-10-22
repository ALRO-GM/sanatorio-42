# Textos: clusters

Generado desde `apps/web/src/shared/i18n/textos/clusters.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

72 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `map.title` | Título del mapa de puestos del campus | features/map/ProjectMap | Mapa de los clústeres | Cluster map | Mapa de clústers | Klusterren mapa |
| `map.loading` | Mientras se dibuja el mapa | features/map/ClustersPage, features/map/ProjectMap, features/map/SeatPicker | Dibujando el mapa… | Drawing the map… | Dibuixant el mapa… | Mapa marrazten… |
| `map.empty` | Aún no hay plano del campus | features/map/ClusterMapView | Todavía no hay plano de este campus: se dibuja a medida que la gente se sienta. | No map for this campus yet: it gets drawn as people sit down. | Encara no hi ha plànol d'aquest campus: es va dibuixant a mesura que la gent s'asseu. | Oraindik ez dago campus honen planorik: jendea esertzen den heinean marrazten da. |
| `map.clusters` | Selector de sala | features/map/ClusterMapView | Clústeres | Clusters | Clústers | Klusterrak |
| `map.cluster` | Nombre de una sala del campus (en 42 se llaman así) | features/map/ClustersTour, features/map/seats | Clúster {n} | Cluster {n} | Clúster {n} | {n}. klusterra |
| `map.seatName` | Nombre completo de un puesto: clúster, fila y puesto | features/map/seats | {cluster} · Fila {row} · Puesto {seat} | {cluster} · Row {row} · Seat {seat} | {cluster} · Fila {row} · Lloc {seat} | {cluster} · {row}. ilara · {seat}. postua |
| `map.row` | Fila, abreviado | features/map/ClusterMapView | F{n} | R{n} | F{n} | E{n} |
| `map.rowLong` | Una fila | features/therapy/GroupForm | fila {rows} | row {rows} | fila {rows} | {rows} ilara |
| `map.rowsLong` | Varias filas | features/therapy/GroupForm | filas {rows} | rows {rows} | files {rows} | {rows} ilarak |
| `map.seatFree` | Puesto libre | features/map/ClusterMapView | Libre | Free | Lliure | Libre |
| `map.seatReserved` | Puesto reservado por un grupo de terapia | features/map/ClusterMapView | Reservado por una terapia | Reserved by a therapy group | Reservat per una teràpia | Terapia batek erreserbatuta |
| `map.you` | Tu puesto | features/map/SeatHoverCard, features/notices/Conversations, shared/ui/PersonLink | Tú | You | Tu | Zu |
| `map.duty.patient` | Alguien de guardia que hace tu proyecto | features/map/ClusterMapView, features/map/SeatHoverCard | Paciente de guardia | Patient on duty | Pacient de guàrdia | Pazientea guardian |
| `map.duty.specialist` | Alguien de guardia que aprobó tu proyecto | features/map/ClusterMapView, features/map/SeatHoverCard | Especialista de guardia | Specialist on duty | Especialista de guàrdia | Espezialista guardian |
| `map.reservedFor` | Para qué grupo está reservado y cuándo | features/map/ClusterMapView | Reservado para terapia de {project} · {days} · {start}–{end} | Reserved for {project} therapy · {days} · {start}–{end} | Reservat per a teràpia de {project} · {days} · {start}–{end} | {project} terapiarako erreserbatuta · {days} · {start}–{end} |
| `map.unplaced` | Gente cuyo puesto no sale en el plano | features/map/ClusterMapView | Sin sitio en el plano: | Not on the map: | Sense lloc al plànol: | Planoan lekurik gabe: |
| `map.legend.specialist` | Leyenda: especialista de guardia | features/map/ClusterMapView | Especialista de guardia | Specialist on duty | Especialista de guàrdia | Espezialista guardian |
| `map.legend.patient` | Leyenda: paciente de guardia | features/map/ClusterMapView | Paciente de guardia | Patient on duty | Pacient de guàrdia | Pazientea guardian |
| `map.legend.reserved` | Leyenda: terapia reunida ahora | features/map/ClusterMapView | Terapia en curso | Therapy in session | Teràpia en curs | Terapia abian |
| `map.legend.occupied` | Leyenda: ocupado | features/map/ClusterMapView | Ocupado | Taken | Ocupat | Okupatuta |
| `map.legend.free` | Leyenda: libre | features/map/ClusterMapView | Libre | Free | Lliure | Libre |
| `map.legend.picked` | Leyenda: elegido para un grupo | features/map/ClusterMapView | Elegido | Chosen | Triat | Aukeratuta |
| `map.noProjects` | Esa persona no tiene proyectos en curso | features/map/SeatHoverCard, shared/ui/PersonLink | Sin proyectos en curso | No projects in progress | Sense projectes en curs | Abian den proiekturik gabe |
| `map.legend.clash` | Leyenda: reservado a esa hora | features/map/ClusterMapView | Reservado a esa hora | Reserved at that time | Reservat a aquesta hora | Ordu horretan erreserbatuta |
| `map.profile` | Enlace al perfil | features/map/SeatHoverCard | Ver perfil | View profile | Veure el perfil | Ikusi profila |
| `map.look` | Opciones de vista del plano | features/map/ClusterMapView | Cómo ver el plano | How to see the map | Com veure el plànol | Planoa nola ikusi |
| `map.flip` | Botón para girar el plano | features/map/ClusterMapView | Girar 180° | Rotate 180° | Gira 180° | Biratu 180° |
| `map.circles` | Casilla: marcar el círculo de cada persona | features/map/ClusterMapView | Círculos | Circles | Cercles | Zirkuluak |
| `map.highlight` | Opciones de resaltado | features/map/ClusterMapView, features/map/ClustersTour | Resaltar: | Highlight: | Ressalta: | Nabarmendu: |
| `map.mate.circle` | Resaltar: gente de tu círculo | features/map/ClusterMapView | Mi círculo | My circle | El meu cercle | Nire zirkulua |
| `map.mate.project` | Resaltar: gente de tu proyecto | features/map/ClusterMapView, features/map/ClustersTour | Mi proyecto | My project | El meu projecte | Nire proiektua |
| `map.mate.done` | Resaltar: gente que aprobó tu proyecto | features/map/ClusterMapView | Lo aprobaron | Passed it | L'han aprovat | Gainditu dutenak |
| `map.middleClick` | Truco para abrir un perfil en otra pestaña | features/map/ClusterMapView | Clic central (o Ctrl + clic) en un puesto: abre su expediente en otra pestaña. | Middle click (or Ctrl + click) on a seat opens their record in a new tab. | Clic central (o Ctrl + clic) en un lloc: obre el seu expedient en una altra pestanya. | Erdiko klik (edo Ctrl + klik) postu batean: haren espedientea beste fitxa batean irekitzen du. |
| `map.circle` | Círculo de una persona | features/map/SeatHoverCard, shared/ui/PersonLink | Círculo {n} | Circle {n} | Cercle {n} | {n}. zirkulua |
| `map.proposeNone` | No hay tantos puestos juntos libres | features/map/SeatPicker | No hay tantos puestos juntos libres: prueba con menos. | There are not that many free seats together: try fewer. | No hi ha tants llocs junts lliures: prova amb menys. | Ez dago hainbeste postu libre elkarren ondoan: saiatu gutxiagorekin. |
| `map.proposeHint` | Qué hace proponer puestos | features/map/SeatPicker | Busca puestos juntos, libres y que funcionen, lo más cerca de ti. | Finds free, working seats together, as close to you as possible. | Busca llocs junts, lliures i que funcionin, com més a prop teu millor. | Elkarren ondoko postu libre eta erabilgarriak bilatzen ditu, zugandik ahalik eta hurbilen. |
| `map.propose` | Botón para que la web proponga puestos | features/map/SeatPicker | Proponer puestos | Suggest seats | Proposa llocs | Postuak proposatu |
| `map.proposeHow` | Cuántos puestos proponer | features/map/SeatPicker | Puestos | Seats | Llocs | Postuak |
| `map.legend.broken` | Leyenda: ordenador averiado | features/map/ClusterMapView | No funciona (avisado esta semana) | Not working (reported this week) | No funciona (avisat aquesta setmana) | Ez dabil (aste honetan abisatua) |
| `map.fixed` | Botón: el ordenador ya funciona | features/map/ClusterMapView | Ya funciona | It works now | Ja funciona | Badabil jada |
| `map.reportBroken` | Botón: avisar de que un ordenador no funciona | features/map/ClusterMapView, features/map/ClustersTour | Avisar de que no funciona | Report it is not working | Avisa que no funciona | Ez dabilela abisatu |
| `map.seatBroken` | Etiqueta: ordenador averiado | features/map/ClusterMapView | No funciona | Not working | No funciona | Ez dabil |
| `map.finishedMine` | Cuánta gente cerca aprobó tu proyecto | features/map/SeatHoverCard | Aprobaron tu proyecto: {n} | Passed your project: {n} | Han aprovat el teu projecte: {n} | Zure proiektua gainditu dute: {n} |
| `clusters.title` | Título de la página del mapa | features/map/ClustersPage | Clústeres del campus | Campus clusters | Clústers del campus | Campuseko klusterrak |
| `clusters.count` | Cuánta gente sentada tiene la web abierta | features/map/ClustersPage | Con Sanatorio abierto: {online} de {occupied} personas sentadas | With Sanatorio open: {online} of {occupied} people seated | Amb Sanatorio obert: {online} de {occupied} persones assegudes | Sanatorio irekita dutenak: eserita dauden {occupied} pertsonetatik {online} |
| `clusters.online` | Etiqueta: tiene la web abierta | features/map/SeatHoverCard, features/notices/Conversations, shared/ui/PersonLink | Con Sanatorio abierto | Has Sanatorio open | Amb Sanatorio obert | Sanatorio irekita du |
| `clusters.write` | Botón para escribir a alguien | features/admin/CheatsPanel, features/map/ClustersTour, features/map/SeatHoverCard | Escribir | Message | Escriu-li | Idatzi |
| `map.legend.online` | Leyenda: tiene Sanatorio abierto | features/map/ClusterMapView | Con Sanatorio abierto | Has Sanatorio open | Amb Sanatorio obert | Sanatorio irekita du |
| `clusters.chat` | Chat directo con alguien | features/alerts/Chat | Chat directo | Direct chat | Xat directe | Txat zuzena |
| `clusters.chatEmpty` | Chat directo vacío | features/alerts/Chat | Nadie ha escrito todavía. Lo que pongas solo lo ve quien participa en este chat. | Nobody has written yet. Only the people in this chat can see what you write. | Ningú ha escrit encara. El que posis només ho veu qui participa en aquest xat. | Inork ez du oraindik idatzi. Jartzen duzuna txat honetan parte hartzen dutenek soilik ikusten dute. |
| `facility.open` | Clústeres: botón para avisar al staff de un problema del edificio o de un ordenador | features/map/ClustersPage | Avisar de un problema | Report a problem | Avisar d'un problema | Arazo baten berri eman |
| `facility.title` | Aviso al staff: título del formulario | features/facility/FacilityForm | Avisar al staff | Tell the staff | Avisar l'staff | Staffari jakinarazi |
| `facility.what` | Aviso al staff: qué pasa | features/facility/FacilityForm | ¿Qué pasa? | What is wrong? | Què passa? | Zer gertatzen da? |
| `facility.where` | Aviso al staff: dónde | features/facility/FacilityForm | ¿Dónde? | Where? | On? | Non? |
| `facility.wherePlaceholder` | Aviso al staff: ayuda del campo «dónde» | features/facility/FacilityForm | Si no dices nada, tu puesto | Leave empty for your seat | Si no dius res, el teu lloc | Ezer esaten ez baduzu, zure postua |
| `facility.note` | Aviso al staff: nota opcional | features/facility/FacilityForm | Nota (opcional) | Note (optional) | Nota (opcional) | Oharra (aukerakoa) |
| `facility.noteRequired` | Aviso al staff: nota obligatoria con «otro» | features/facility/FacilityForm | Cuéntanos qué pasa | Tell us what's wrong | Explica'ns què passa | Kontatu iezaguzu zer gertatzen den |
| `facility.send` | Aviso al staff: enviar | features/facility/FacilityForm | Avisar | Report | Avisar | Jakinarazi |
| `facility.sent` | Aviso al staff: confirmación | features/facility/FacilityForm | Aviso enviado al staff. ¡Gracias! | Sent to the staff. Thanks! | Avís enviat a l'staff. Gràcies! | Staffari bidalia. Eskerrik asko! |
| `facility.close` | Aviso al staff: cerrar la confirmación | features/facility/FacilityForm | Cerrar | Close | Tanca | Itxi |
| `facility.none` | Lista de avisos del edificio vacía | features/facility/FacilityList | No hay avisos pendientes. | No pending reports. | No hi ha avisos pendents. | Ez dago jakinarazpenik zain. |
| `facility.by` | Lista de avisos: quién y cuándo | features/facility/FacilityList | Avisó {login} · {when} | Reported by {login} · {when} | Avisat per {login} · {when} | {login}(e)k jakinarazia · {when} |
| `facility.resolvedBy` | Lista de avisos: quién lo resolvió y cuándo | features/facility/FacilityList | resuelto por {by} · {when} | resolved by {by} · {when} | resolt per {by} · {when} | {by}(e)k konponduta · {when} |
| `facility.resolve` | Lista de avisos: darlo por resuelto | features/facility/FacilityList | Marcar como resuelto | Mark as resolved | Marca com a resolt | Markatu konponduta bezala |
| `facility.category.computer` | Tipo de problema: el ordenador | features/facility/FacilityForm, features/facility/FacilityList | Ordenador | Computer | Ordinador | Ordenagailua |
| `facility.category.peripheral` | Tipo de problema: pantalla, teclado o ratón | features/facility/FacilityForm, features/facility/FacilityList | Pantalla, teclado o ratón | Screen, keyboard or mouse | Pantalla, teclat o ratolí | Pantaila, teklatua edo sagua |
| `facility.category.network` | Tipo de problema: la red o el wifi | features/facility/FacilityForm, features/facility/FacilityList | Red o wifi | Network or wifi | Xarxa o wifi | Sarea edo wifia |
| `facility.category.toilets` | Tipo de problema: los baños | features/facility/FacilityForm, features/facility/FacilityList | Baños | Toilets | Lavabos | Komunak |
| `facility.category.temperature` | Tipo de problema: frío o calor | features/facility/FacilityForm, features/facility/FacilityList | Temperatura | Temperature | Temperatura | Tenperatura |
| `facility.category.light` | Tipo de problema: la luz | features/facility/FacilityForm, features/facility/FacilityList | Luz | Light | Llum | Argia |
| `facility.category.cleaning` | Tipo de problema: limpieza | features/facility/FacilityForm, features/facility/FacilityList | Limpieza | Cleaning | Neteja | Garbiketa |
| `facility.category.other` | Tipo de problema: otro | features/facility/FacilityForm, features/facility/FacilityList | Otro | Other | Altre | Bestelakoa |
