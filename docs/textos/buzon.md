# Textos: buzon

Generado desde `apps/web/src/shared/i18n/textos/buzon.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

132 textos. «—» es que falta la traducción: sale en español (en francés, en inglés).

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera | Francés |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `notices.title` | Título del buzón de avisos y conversaciones (cabecera) | app/Header, features/help/GuardTour, features/notices/Mailbox, features/notices/MailboxTour | Buzón | Mailbox | Bústia | Postontzia | Boîte de réception |
| `notices.open` | Nombre accesible del botón del buzón | app/Header | Abrir el buzón | Open the mailbox | Obre la bústia | Ireki postontzia | Ouvrir la boîte de réception |
| `notices.openUnread` | Nombre accesible del buzón con avisos sin leer | app/Header | Abrir el buzón: {n} sin leer | Open the mailbox: {n} unread | Obre la bústia: {n} sense llegir | Ireki postontzia: {n} irakurri gabe | Ouvrir la boîte de réception (non lus : {n}) |
| `notices.empty` | Buzón vacío | features/notices/Mailbox | No tienes ningún aviso. | You have no notices. | No tens cap avís. | Ez duzu abisurik. | Tu n'as aucune notification. |
| `notices.readAll` | Botón para marcar todo como leído | features/notices/Mailbox | Marcar todo como leído | Mark all as read | Marca-ho tot com a llegit | Markatu dena irakurrita gisa | Tout marquer comme lu |
| `notices.unsave` | Botón para dejar de guardar un aviso | features/notices/Mailbox | Dejar de guardar | Unsave | Deixa de desar | Ez gorde | Ne plus garder |
| `notices.removeRead` | Botón para borrar los avisos leídos | features/notices/Mailbox | Borrar los leídos ({n}) | Delete read ({n}) | Esborra els llegits ({n}) | Ezabatu irakurritakoak ({n}) | Supprimer les notifications lues ({n}) |
| `notices.filter` | Filtro de avisos | features/notices/Mailbox | Qué avisos | Which notices | Quins avisos | Zein abisu | Quelles notifications |
| `notices.filter.all` | Filtro: todos | features/notices/Mailbox | Todos | All | Tots | Denak | Toutes |
| `notices.filter.saved` | Filtro: guardados | features/notices/Mailbox | Guardados | Saved | Desats | Gordetakoak | Gardées |
| `notices.noneSaved` | No hay avisos guardados | features/notices/Mailbox | No tienes avisos guardados. | You have no saved notices. | No tens avisos desats. | Ez duzu abisu gordeturik. | Tu n'as aucune notification gardée. |
| `notices.unreadMark` | Prefijo accesible de un aviso sin leer | features/notices/Mailbox | Sin leer: | Unread: | Sense llegir: | Irakurri gabe: | Non lue : |
| `notices.someone` | Cuando no se sabe quién provocó el aviso | features/notices/Mailbox | Alguien | Someone | Algú | Norbait | Quelqu'un |
| `notices.now` | Hace un momento | features/notices/Mailbox | ahora mismo | just now | ara mateix | oraintxe | à l'instant |
| `notices.minutesAgo` | Hace unos minutos | features/notices/Mailbox | hace {n} min | {n} min ago | fa {n} min | duela {n} min | il y a {n} min |
| `notices.hoursAgo` | Hace unas horas | features/notices/Mailbox | hace {n} h | {n} h ago | fa {n} h | duela {n} h | il y a {n} h |
| `notices.go.inbox` | Enlace del aviso: ver la respuesta | features/notices/Mailbox | ver la respuesta | see the answer | veure la resposta | ikusi erantzuna | voir la réponse |
| `notices.go.gestion` | Enlace del aviso: ir al panel | features/notices/Mailbox | ir al panel | go to the panel | ves al panell | joan panelera | aller au panneau |
| `notices.go.guardia` | Enlace del aviso: ir a tu on-call | features/notices/Mailbox | ir a tu on-call | go to your on-call | ves al teu on-call | joan zure on-call-era | aller à ton on-call |
| `notices.go.tablon` | Enlace del aviso: ir a proyectos | features/notices/Mailbox | ir a proyectos | go to projects | ves a projectes | joan proiektuetara | aller aux projets |
| `notices.go.pizarras` | Enlace del aviso: ir a pizarras | features/notices/Mailbox | ir a pizarras | go to whiteboards | ves a pissarres | joan arbeletara | aller aux tableaux blancs |
| `notices.go.terapia` | Enlace del aviso: ir a sprints | features/notices/Mailbox | ir a sprints | go to sprints | ves a sprints | joan sprintetara | aller aux sprints |
| `notices.go.calendario` | Enlace del aviso: ir al calendario | features/notices/Mailbox | ir al calendario | go to the calendar | ves al calendari | joan egutegira | aller au calendrier |
| `notices.kind.ticket_answered` | Aviso: respondieron a tu incidencia | features/notices/Mailbox | {from} ha respondido a lo que enviaste | {from} answered what you sent | {from} ha respost al que vas enviar | {from}(e)k bidali zenuenari erantzun dio | {from} a répondu à ton message |
| `notices.kind.ticket_new` | Aviso para admins: incidencia nueva | features/notices/Mailbox | {from} ha escrito al buzón | {from} wrote to the mailbox | {from} ha escrit a la bústia | {from}(e)k postontzira idatzi du | {from} a écrit à l'équipe |
| `notices.kind.chat` | Aviso: mensajes nuevos en un chat; {n} es cuántos | features/notices/Mailbox | {from} ha escrito en un chat tuyo ({n}) | {from} wrote in one of your chats ({n}) | {from} ha escrit en un xat teu ({n}) | {from}(e)k zure txat batean idatzi du ({n}) | {from} a écrit dans une de tes discussions ({n}) |
| `notices.kind.booking_requested` | Aviso: te piden ayuda | features/help/GuardTour, features/notices/Mailbox, features/notices/MailboxTour | {from} te pide un rato de ayuda | {from} asks you for some help | {from} et demana una estona d'ajuda | {from}(e)k laguntza-tarte bat eskatzen dizu | {from} te demande un moment d'aide |
| `notices.kind.booking_accepted` | Aviso: aceptaron tu reserva | features/notices/Mailbox | {from} ha aceptado tu reserva | {from} accepted your booking | {from} ha acceptat la teva reserva | {from}(e)k zure erreserba onartu du | {from} a accepté ta réservation |
| `notices.kind.booking_declined` | Aviso: rechazaron tu reserva | features/notices/Mailbox | {from} no puede atender tu reserva | {from} can't take your booking | {from} no pot atendre la teva reserva | {from}(e)k ezin du zure erreserba artatu | {from} ne peut pas honorer ta réservation |
| `notices.kind.booking_cancelled` | Aviso: anularon una reserva | features/notices/Mailbox | {from} ha anulado una reserva | {from} cancelled a booking | {from} ha anul·lat una reserva | {from}(e)k erreserba bat bertan behera utzi du | {from} a annulé une réservation |
| `notices.kind.doubt_answered` | Aviso: respondieron a tu duda | features/notices/Mailbox, features/notices/MailboxTour | {from} ha respondido a tu duda | {from} answered your question | {from} ha respost al teu dubte | {from}(e)k zure zalantzari erantzun dio | {from} a répondu à ta question |
| `notices.kind.doubt_solved` | Aviso: tu respuesta resolvió una duda | features/notices/Mailbox | {from} dice que tu respuesta resolvió su duda | {from} says your answer solved their question | {from} diu que la teva resposta va resoldre el seu dubte | {from}(e)k dio zure erantzunak bere zalantza ebatzi zuela | {from} dit que ta réponse a résolu sa question |
| `notices.kind.proposal_accepted` | Aviso: validaron tu cambio en una guía | features/notices/Mailbox | {from} ha validado tu cambio en una guía | {from} validated your change to a guide | {from} ha validat el teu canvi en una guia | {from}(e)k gida bateko zure aldaketa balidatu du | {from} a validé ta modification dans un guide |
| `notices.kind.proposal_rejected` | Aviso: rechazaron tu cambio en una guía | features/notices/Mailbox | {from} ha rechazado tu cambio en una guía | {from} rejected your change to a guide | {from} ha rebutjat el teu canvi en una guia | {from}(e)k gida bateko zure aldaketa baztertu du | {from} a refusé ta modification dans un guide |
| `notices.kind.board_changed` | Aviso: cambió una pizarra | features/notices/Mailbox | {from} ha cambiado la hora o el sitio de una pizarra | {from} changed the time or place of a whiteboard | {from} ha canviat l'hora o el lloc d'una pissarra | {from}(e)k arbel baten ordua edo lekua aldatu du | {from} a changé l'heure ou le lieu d'un tableau blanc |
| `notices.kind.board_cancelled` | Aviso: se canceló una pizarra | features/notices/Mailbox | {from} ha cancelado una pizarra | {from} cancelled a whiteboard | {from} ha cancel·lat una pissarra | {from}(e)k arbel bat bertan behera utzi du | {from} a annulé un tableau blanc |
| `notices.kind.group_joined` | Aviso: alguien entró en tu grupo | features/notices/Mailbox | {from} se ha apuntado a tu sprint | {from} joined your sprint | {from} s'ha apuntat al teu sprint | {from}(e)k zure sprintean izena eman du | {from} a rejoint ton sprint |
| `notices.kind.group_closed` | Aviso: se cerró un grupo | features/notices/Mailbox | {from} ha cerrado un sprint | {from} closed a sprint | {from} ha tancat un sprint | {from}(e)k sprint bat itxi du | {from} a fermé un sprint |
| `notices.kind.group_invite` | Aviso: hay un grupo de tu proyecto | features/notices/Mailbox | {from} ha abierto un sprint de un proyecto que estás haciendo | {from} opened a sprint for a project you are doing | {from} ha obert un sprint d'un projecte que estàs fent | {from}(e)k egiten ari zaren proiektu baten sprinta ireki du | {from} a ouvert un sprint sur un projet que tu fais |
| `notices.kind.clicker_defense` | Aviso para admins: alguien explicó su partida | features/notices/Mailbox | {from} ha explicado su partida de Code Clicker tras una revisión | {from} explained their Code Clicker run after a review | {from} ha explicat la seva partida de Code Clicker després d'una revisió | {from}(e)k Code Clickerreko bere partida azaldu du berrikuspen baten ondoren | {from} a expliqué sa partie de Code Clicker après une vérification |
| `inbox.open` | Menú de la cuenta: incidencias y sugerencias | app/Header | Incidencias y sugerencias | Issues and suggestions | Incidències i suggeriments | Gorabeherak eta iradokizunak | Problèmes et suggestions |
| `inbox.title` | Título del formulario de incidencias | features/admin/Inbox, features/admin/InboxTour | Incidencias y sugerencias | Issues and suggestions | Incidències i suggeriments | Gorabeherak eta iradokizunak | Problèmes et suggestions |
| `inbox.kind` | Formulario: tipo | features/admin/Inbox | Tipo | Type | Tipus | Mota | Type |
| `inbox.to` | A quién llega y dónde se responde | features/admin/Inbox | Para: quien administra Peer4U. La respuesta aparece aquí y te llega un aviso al buzón. | To: whoever runs Peer4U. The answer shows up here and you get a notice in your mailbox. | Per a: qui administra Peer4U. La resposta apareix aquí i t'arriba un avís a la bústia. | Norentzat: Peer4U kudeatzen duenarentzat. Erantzuna hemen agertuko da eta abisu bat iritsiko zaizu postontzira. | Destinataire : les personnes qui administrent Peer4U. La réponse s'affiche ici et tu reçois une notification dans ta boîte de réception. |
| `inbox.section` | Formulario: sección afectada | features/admin/Inbox | Sección | Section | Secció | Atala | Section |
| `inbox.section.general` | Sección: toda la web | features/admin/Inbox | Toda la web | The whole site | Tot el web | Web osoa | Tout le site |
| `inbox.category.bug` | Tipo: algo falla | features/admin/Inbox, features/admin/InboxTab, features/admin/InboxTour | Fallo | Bug | Error | Akatsa | Bug |
| `inbox.category.improvement` | Tipo: mejorar algo | features/admin/Inbox, features/admin/InboxTab, features/admin/InboxTour | Mejora de algo que ya hay | Improve something that exists | Millora del que ja hi ha | Lehendik dagoen zerbaiten hobekuntza | Amélioration de l'existant |
| `inbox.category.idea` | Tipo: idea nueva | features/admin/Inbox, features/admin/InboxTab | Idea nueva | New idea | Idea nova | Ideia berria | Nouvelle idée |
| `inbox.category.translation` | Tipo: traducción | features/admin/Inbox, features/admin/InboxTab | Traducción | Translation | Traducció | Itzulpena | Traduction |
| `inbox.category.other` | Tipo: otra cosa | features/admin/Inbox, features/admin/InboxTab | Otra cosa | Something else | Una altra cosa | Beste zerbait | Autre chose |
| `inbox.body.bug` | Indicación para describir un fallo | features/admin/Inbox | Qué estabas haciendo y qué ha pasado | What you were doing and what happened | Què estaves fent i què ha passat | Zer ari zinen egiten eta zer gertatu da | Ce que tu faisais et ce qui s'est passé |
| `inbox.body.improvement` | Indicación para una mejora | features/admin/Inbox | Qué cambiarías y por qué | What you would change and why | Què canviaries i per què | Zer aldatuko zenuke eta zergatik | Ce que tu changerais et pourquoi |
| `inbox.body.idea` | Indicación para una idea | features/admin/Inbox | Qué te gustaría poder hacer | What you would like to be able to do | Què t'agradaria poder fer | Zer egin ahal izatea gustatuko litzaizuke | Ce que tu aimerais pouvoir faire |
| `inbox.body.translation` | Indicación para una traducción | features/admin/Inbox | Qué texto está mal y cómo debería decir | Which text is wrong and what it should say | Quin text està malament i com hauria de dir | Zein testu dago gaizki eta nola esan beharko luke | Le texte qui est faux et ce qu'il devrait dire |
| `inbox.body.other` | Indicación genérica | features/admin/Inbox | Cuéntanos | Tell us | Explica-ho | Kontatu | Raconte-nous |
| `inbox.kind.issue` | Tipo de envío: algo no va | features/admin/Inbox, features/admin/InboxTab | Fallo | Bug | Error | Akatsa | Bug |
| `inbox.kind.idea` | Tipo de envío: mejora | features/admin/Inbox, features/admin/InboxTab | Mejora | Improvement | Millora | Hobekuntza | Amélioration |
| `inbox.kind.report` | Tipo de envío: denuncia | features/admin/Inbox, features/admin/InboxTab | Denuncia | Report | Denúncia | Salaketa | Signalement |
| `inbox.bodyLabel` | Formulario: detalle | features/admin/Inbox | Detalle | Details | Detall | Xehetasuna | Détails |
| `inbox.mine` | Lista de lo que has enviado | features/admin/Inbox | Lo que has enviado | What you have sent | El que has enviat | Bidali duzuna | Ce que tu as envoyé |
| `inbox.none` | No has enviado nada | features/admin/Inbox | Todavía no has enviado nada. | You have not sent anything yet. | Encara no has enviat res. | Oraindik ez duzu ezer bidali. | Tu n'as encore rien envoyé. |
| `inbox.pending` | Sin respuesta todavía | features/admin/Inbox | Pendiente de respuesta | Waiting for an answer | Pendent de resposta | Erantzunaren zain | En attente de réponse |
| `inbox.answer` | Prefijo de la respuesta de admin | features/admin/Inbox | Respuesta: | Answer: | Resposta: | Erantzuna: | Réponse : |
| `report.button` | Botón para denunciar un mensaje | shared/ui/ReportButton | Denunciar | Report | Denuncia | Salatu | Signaler |
| `report.why` | Formulario de denuncia: qué pasa | shared/ui/ReportButton | Qué pasa con este mensaje | What is wrong with this message | Què passa amb aquest missatge | Zer gertatzen da mezu honekin | Quel est le problème avec ce message |
| `report.send` | Botón para enviar la denuncia | shared/ui/ReportButton | Enviar denuncia | Send report | Envia la denúncia | Bidali salaketa | Envoyer le signalement |
| `report.reason.spam` | Motivo: spam | features/admin/InboxTab, shared/ui/ReportButton | Spam | Spam | Correu brossa | Spama | Spam |
| `report.reason.harassment` | Motivo: acoso | features/admin/InboxTab, shared/ui/ReportButton | Acoso | Harassment | Assetjament | Jazarpena | Harcèlement |
| `report.reason.insults` | Motivo: insultos | features/admin/InboxTab, shared/ui/ReportButton | Insultos | Insults | Insults | Irainak | Insultes |
| `report.reason.other` | Motivo: otro | features/admin/InboxTab, shared/ui/ReportButton | Otro motivo | Another reason | Un altre motiu | Beste arrazoi bat | Autre raison |
| `report.whyOptional` | Detalle opcional | shared/ui/ReportButton | Algo más que contar (opcional) | Anything else to add (optional) | Alguna cosa més a explicar (opcional) | Beste zerbait kontatzeko (aukerakoa) | Autre chose à ajouter (facultatif) |
| `report.sent` | Confirmación de denuncia | shared/ui/ReportButton | Denuncia enviada. Gracias por avisar. | Report sent. Thanks for letting us know. | Denúncia enviada. Gràcies per avisar. | Salaketa bidalita. Eskerrik asko abisatzeagatik. | Signalement envoyé. Merci de l'avoir fait remonter. |
| `broadcast.from` | Comunicado de quien administra | features/admin/BroadcastGate | Comunicado de {login} | Message from {login} | Comunicat de {login} | {login}(r)en jakinarazpena | Annonce de {login} |
| `broadcast.must` | El comunicado obliga a elegir | features/admin/BroadcastGate | Elige una opción para cerrar este mensaje. | Pick an option to close this message. | Tria una opció per tancar aquest missatge. | Aukeratu aukera bat mezu hau ixteko. | Choisis une option pour fermer ce message. |
| `broadcast.later` | Botón para verlo luego | features/admin/BroadcastGate | Ahora no | Not now | Ara no | Orain ez | Pas maintenant |
| `notices.compose` | Botón para escribir un mensaje | features/notices/Mailbox | Escribir un mensaje | Write a message | Escriu un missatge | Idatzi mezu bat | Écrire un message |
| `notices.toAdmin` | Destinatario: administración | features/notices/Mailbox | A quien administra | To the admins | A qui administra | Kudeatzaileari | Aux personnes qui administrent |
| `notices.toPeer` | Destinatario: otra persona | features/notices/Mailbox | A alguien del campus | To someone on campus | A algú del campus | Campuseko norbaiti | À quelqu'un du campus |
| `notices.peerLabel` | Buscador de destinatario | features/notices/PeerPicker | Busca por login o por nombre | Search by login or name | Cerca per login o per nom | Bilatu loginaren edo izenaren arabera | Cherche par login ou par nom |
| `notices.tab.notices` | Pestaña del buzón: avisos | features/notices/Mailbox | Avisos | Notices | Avisos | Oharrak | Notifications |
| `notices.tab.chats` | Pestaña del buzón: conversaciones | features/notices/Mailbox | Conversaciones | Conversations | Converses | Elkarrizketak | Discussions |
| `notices.go.conversations` | Enlace del aviso: abrir la conversación | features/notices/Mailbox | abrir la conversación | open the conversation | obre la conversa | ireki elkarrizketa | ouvrir la discussion |
| `notices.kind.chat_reminder` | Recordatorio que te pusiste | features/notices/Mailbox | Recordatorio: tienes pendiente responder a {from} | Reminder: you still have to answer {from} | Et recordo que tens pendent respondre a {from} | Gogoratu: {from} erabiltzaileari erantzuteko duzu | Rappel : tu dois encore répondre à {from} |
| `chats.back` | Botón para volver a la lista de conversaciones | features/notices/Conversations | Conversaciones | Conversations | Converses | Elkarrizketak | Discussions |
| `chats.filter` | Filtro de conversaciones | features/notices/Conversations | Qué conversaciones se ven | Which conversations are shown | Quines converses es veuen | Zein elkarrizketa ikusten diren | Quelles discussions afficher |
| `chats.state.all` | Filtro: todas | features/notices/Conversations | Todas | All | Totes | Denak | Toutes |
| `chats.state.unread` | Filtro: sin leer | features/notices/Conversations | No leídas | Unread | No llegides | Irakurri gabeak | Non lues |
| `chats.state.pending` | Filtro: pendientes de responder | features/notices/Conversations | Pendientes | Pending | Pendents | Zain daudenak | En attente |
| `chats.byKind` | Filtro por tipo | features/notices/Conversations | Por tipo | By type | Per tipus | Motaren arabera | Par type |
| `chats.allKinds` | Filtro: todos los tipos | features/notices/Conversations | Todos los tipos | All types | Tots els tipus | Mota guztiak | Tous les types |
| `chats.byProject` | Filtro por proyecto | features/notices/Conversations | Por proyecto | By project | Per projecte | Proiektuaren arabera | Par projet |
| `chats.allProjects` | Filtro: cualquier proyecto | features/notices/Conversations | Cualquier proyecto | Any project | Qualsevol projecte | Edozein proiektu | N'importe quel projet |
| `chats.kind.direct` | Tipo: mensaje directo | features/notices/Conversations | Mensaje directo | Direct message | Missatge directe | Mezu zuzena | Message privé |
| `chats.kind.group` | Tipo: sprint en grupo | features/notices/Conversations | Sprint | Sprint | Sprint | Sprinta | Sprint |
| `chats.kind.board` | Tipo: pizarra | features/notices/Conversations | Pizarra | Whiteboard | Pissarra | Arbela | Tableau blanc |
| `chats.kind.help` | Tipo: sesión de ayuda | features/notices/Conversations | Sesión de ayuda | Help session | Sessió d'ajuda | Laguntza-saioa | Session d'aide |
| `chats.kind.event` | Tipo: evento | features/admin/AdminPage, features/notices/Conversations | Evento | Event | Esdeveniment | Ekitaldia | Événement |
| `chats.said.seen` | Respuesta al aviso: lo ha visto | features/notices/Conversations | Lo ha visto | Has seen it | Ho ha vist | Ikusi du | A vu le message |
| `chats.said.late` | Respuesta al aviso: llega tarde | features/notices/Conversations | Se retrasa | Running late | Fa tard | Berandu dator | Sera en retard |
| `chats.said.absent` | Respuesta al aviso: no va | features/notices/Conversations | No puede ir | Can't make it | No hi pot anar | Ezin du joan | Ne peut pas venir |
| `chats.said.text` | Mensaje de texto (se abrevia) | features/notices/Conversations | … | … | … | … | … |
| `chats.empty` | Sin conversaciones | features/notices/Conversations | Todavía no tienes ninguna conversación. Escribe a alguien desde aquí. | You have no conversations yet. Write to someone from here. | Encara no tens cap conversa. Escriu a algú des d'aquí. | Oraindik ez duzu elkarrizketarik. Idatzi norbaiti hemendik. | Tu n'as encore aucune discussion. Écris à quelqu'un à partir d'ici. |
| `chats.noneShown` | Ninguna cumple los filtros | features/notices/Conversations | Ninguna conversación cumple esos filtros. | No conversation matches those filters. | Cap conversa compleix aquests filtres. | Ez dago iragazki horiek betetzen dituen elkarrizketarik. | Aucune discussion ne correspond à ces filtres. |
| `chats.pending` | Etiqueta: pendiente de responder | features/notices/Conversations | Pendiente | Pending | Pendent | Zain | En attente |
| `chats.markUnread` | Botón para marcar como no leída | features/notices/Conversations | Marcar como no leída | Mark as unread | Marca com a no llegida | Markatu irakurri gabe gisa | Marquer comme non lue |
| `chats.unreadCount` | Mensajes sin leer | features/notices/Conversations | {n} sin leer | {n} unread | {n} sense llegir | {n} irakurri gabe | Non lus : {n} |
| `chats.remind` | Botón para programar un recordatorio | features/notices/Conversations | Recordármelo… | Remind me… | Recorda-m'ho… | Gogorarazi… | Me le rappeler… |
| `chats.remindSet` | Cuándo salta el recordatorio | features/notices/Conversations | Recordatorio: {when} | Reminder: {when} | Recordatori: {when} | Gogorarazpena: {when} | Rappel : {when} |
| `chats.remind.hour` | Recordatorio: en una hora | features/notices/Conversations | Dentro de una hora | In an hour | D'aquí a una hora | Ordubete barru | Dans une heure |
| `chats.remind.tomorrow` | Recordatorio: mañana | features/notices/Conversations | Mañana a las 9:00 | Tomorrow at 9:00 | Demà a les 9:00 | Bihar 9:00etan | Demain à 9 h |
| `chats.remind.monday` | Recordatorio: el lunes | features/notices/Conversations | El lunes a las 9:00 | On Monday at 9:00 | Dilluns a les 9:00 | Astelehenean 9:00etan | Lundi à 9 h |
| `chats.remind.none` | Quitar el recordatorio | features/notices/Conversations | Quitar el recordatorio | Remove the reminder | Treu el recordatori | Kendu gogorarazpena | Supprimer le rappel |
| `chats.project` | Elegir de qué proyecto va la conversación | features/notices/Conversations | ¿De qué proyecto va? | Which project is it about? | De quin projecte va? | Zein proiekturi buruzkoa da? | C'est à propos de quel projet ? |
| `suggest.open` | Burbuja de sugerencias de la cabecera: su nombre y el título de su panel | features/suggest/SuggestBubble, features/suggest/SuggestPanel | Sugerir una mejora | Suggest an improvement | Suggerir una millora | Hobekuntza bat iradoki | Suggérer une amélioration |
| `suggest.hint` | Burbuja de sugerencias: lo que sale al pasar el ratón | features/suggest/SuggestBubble | Arrástrala hasta lo que mejorarías, o púlsala | Drag it onto what you would improve, or click it | Arrossega-la fins al que milloraries, o prem-la | Arrastatu hobetuko zenukeen tokira, edo sakatu | Fais-la glisser sur ce que tu améliorerais, ou clique dessus |
| `suggest.where` | Panel de sugerencia: delante del sitio detectado | features/suggest/SuggestPanel | Dónde: | Where: | On: | Non: | Où : |
| `suggest.change` | Panel de sugerencia: cambiar el sitio detectado | features/suggest/SuggestPanel | Cambiar | Change | Canvia | Aldatu | Modifier |
| `suggest.section` | Panel de sugerencia: lista de secciones | features/suggest/SuggestPanel | Sección | Section | Secció | Atala | Section |
| `suggest.detail` | Panel de sugerencia: precisar el sitio a mano | features/suggest/SuggestPanel | Detalle (opcional) | Detail (optional) | Detall (opcional) | Xehetasuna (aukerakoa) | Précision (facultatif) |
| `suggest.detail.example` | Panel de sugerencia: ejemplo de detalle | features/suggest/SuggestPanel | Ej.: el filtro de seniors | E.g. the seniors filter | P. ex.: el filtre de seniors | Adib.: seniorren iragazkia | Ex. : le filtre des seniors |
| `suggest.problem` | Panel de sugerencia: qué problema tuviste | features/suggest/SuggestPanel | El problema | The problem | El problema | Arazoa | Le problème |
| `suggest.problem.example` | Panel de sugerencia: ejemplo de problema | features/suggest/SuggestPanel | Ej.: no veo a quién preguntar | E.g. I can’t see who to ask | P. ex.: no veig a qui preguntar | Adib.: ez dut ikusten nori galdetu | Ex. : je ne vois pas à qui demander |
| `suggest.proposal` | Panel de sugerencia: cómo lo arreglarías | features/suggest/SuggestPanel | Tu propuesta (opcional) | Your proposal (optional) | La teva proposta (opcional) | Zure proposamena (aukerakoa) | Ta proposition (facultatif) |
| `suggest.proposal.example` | Panel de sugerencia: ejemplo de propuesta | features/suggest/SuggestPanel | Ej.: un botón más grande arriba | E.g. a bigger button at the top | P. ex.: un botó més gran a dalt | Adib.: botoi handiago bat goian | Ex. : un bouton plus grand en haut |
| `suggest.thanks` | Burbuja de sugerencias: después de mandar una | features/suggest/SuggestBubble | ¡Gracias! La verás en el menú de tu cuenta | Thanks! You’ll find it in your account menu | Gràcies! La veuràs al menú del teu compte | Eskerrik asko! Zure kontuaren menuan ikusiko duzu | Merci ! Tu la retrouveras dans le menu de ton compte |
| `suggest.part.header` | Sitio de una sugerencia: la cabecera | features/suggest/detect | Barra de arriba | Top bar | Barra de dalt | Goiko barra | Barre du haut |
| `suggest.part.footer` | Sitio de una sugerencia: el pie | features/suggest/detect | Pie de la página | Page footer | Peu de pàgina | Orri-oina | Pied de page |
| `suggest.part.graph` | Sitio de una sugerencia: el grafo de Proyectos | features/suggest/detect | Grafo de tus proyectos | Your projects graph | Graf dels teus projectes | Zure proiektuen grafoa | Graphe de tes projets |
| `suggest.part.map` | Sitio de una sugerencia: el plano de Clústeres | features/suggest/detect | Plano del clúster | Cluster map | Plànol del clúster | Klusterraren planoa | Plan du cluster |
| `suggest.proposalShort` | Buzón: delante de la propuesta de una sugerencia | features/admin/Inbox, features/admin/InboxTab | Propuesta: | Proposal: | Proposta: | Proposamena: | Proposition : |
| `suggest.goPlace` | Buzón del panel: abrir el sitio de una sugerencia | features/admin/InboxTab | Ir al sitio | Go there | Ves-hi | Joan hara | Y aller |
