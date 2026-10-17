# Textos: buzon

Generado desde `apps/web/src/shared/i18n/textos/buzon.csv` con
`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.

121 textos. «—» es que falta la traducción: sale en español.

| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |
| --- | --- | --- | --- | --- | --- | --- |
| `notices.title` | Título del buzón de avisos y conversaciones (cabecera) | app/Header, features/help/GuardTour, features/notices/Mailbox, features/notices/MailboxTour | Buzón | Mailbox | Bústia | Postontzia |
| `notices.open` | Nombre accesible del botón del buzón | app/Header | Abrir el buzón | Open the mailbox | Obre la bústia | Ireki postontzia |
| `notices.openUnread` | Nombre accesible del buzón con avisos sin leer | app/Header | Abrir el buzón: {n} sin leer | Open the mailbox: {n} unread | Obre la bústia: {n} sense llegir | Ireki postontzia: {n} irakurri gabe |
| `notices.empty` | Buzón vacío | features/notices/Mailbox | No tienes ningún aviso. | You have no notices. | No tens cap avís. | Ez duzu abisurik. |
| `notices.readAll` | Botón para marcar todo como leído | features/notices/Mailbox | Marcar todo como leído | Mark all as read | Marca-ho tot com a llegit | Markatu dena irakurrita gisa |
| `notices.save` | Botón para guardar un aviso | features/notices/Mailbox | Guardar | Save | Desa | Gorde |
| `notices.unsave` | Botón para dejar de guardar un aviso | features/notices/Mailbox | Dejar de guardar | Unsave | Deixa de desar | Ez gorde |
| `notices.remove` | Botón para borrar un aviso | features/notices/Mailbox | Borrar | Delete | Esborra | Ezabatu |
| `notices.removeRead` | Botón para borrar los avisos leídos | features/notices/Mailbox | Borrar los leídos ({n}) | Delete read ({n}) | Esborra els llegits ({n}) | Ezabatu irakurritakoak ({n}) |
| `notices.filter` | Filtro de avisos | features/notices/Mailbox | Qué avisos | Which notices | Quins avisos | Zein abisu |
| `notices.filter.all` | Filtro: todos | features/notices/Mailbox | Todos | All | Tots | Denak |
| `notices.filter.saved` | Filtro: guardados | features/notices/Mailbox | Guardados | Saved | Desats | Gordetakoak |
| `notices.noneSaved` | No hay avisos guardados | features/notices/Mailbox | No tienes avisos guardados. | You have no saved notices. | No tens avisos desats. | Ez duzu abisu gordeturik. |
| `notices.unreadMark` | Prefijo accesible de un aviso sin leer | features/notices/Mailbox | Sin leer: | Unread: | Sense llegir: | Irakurri gabe: |
| `notices.someone` | Cuando no se sabe quién provocó el aviso | features/notices/Mailbox | Alguien | Someone | Algú | Norbait |
| `notices.now` | Hace un momento | features/notices/Mailbox | ahora mismo | just now | ara mateix | oraintxe |
| `notices.minutesAgo` | Hace unos minutos | features/notices/Mailbox | hace {n} min | {n} min ago | fa {n} min | duela {n} min |
| `notices.hoursAgo` | Hace unas horas | features/notices/Mailbox | hace {n} h | {n} h ago | fa {n} h | duela {n} h |
| `notices.go.inbox` | Enlace del aviso: ver la respuesta | features/notices/Mailbox | ver la respuesta | see the answer | veure la resposta | ikusi erantzuna |
| `notices.go.gestion` | Enlace del aviso: ir al panel | features/notices/Mailbox | ir al panel | go to the panel | ves al panell | joan panelera |
| `notices.go.guardia` | Enlace del aviso: ir a tu guardia | features/notices/Mailbox | ir a tu guardia | go to your duty | ves a la teva guàrdia | joan zure guardiara |
| `notices.go.tablon` | Enlace del aviso: ir al tablón | features/notices/Mailbox | ir al tablón | go to the board | ves al tauler | joan taulara |
| `notices.go.pizarras` | Enlace del aviso: ir a pizarras | features/notices/Mailbox | ir a pizarras | go to whiteboards | ves a pissarres | joan arbeletara |
| `notices.go.terapia` | Enlace del aviso: ir a terapias | features/notices/Mailbox | ir a terapias | go to therapy | ves a teràpies | joan terapietara |
| `notices.go.calendario` | Enlace del aviso: ir al calendario | features/notices/Mailbox | ir al calendario | go to the calendar | ves al calendari | joan egutegira |
| `notices.kind.ticket_answered` | Aviso: respondieron a tu incidencia | features/notices/Mailbox | {from} ha respondido a lo que enviaste | {from} answered what you sent | {from} ha respost al que vas enviar | {from}(e)k bidali zenuenari erantzun dio |
| `notices.kind.ticket_new` | Aviso para admins: incidencia nueva | features/notices/Mailbox | {from} ha escrito al buzón | {from} wrote to the mailbox | {from} ha escrit a la bústia | {from}(e)k postontzira idatzi du |
| `notices.kind.chat` | Aviso: mensajes nuevos en un chat; {n} es cuántos | features/notices/Mailbox | {from} ha escrito en un chat tuyo ({n}) | {from} wrote in one of your chats ({n}) | {from} ha escrit en un xat teu ({n}) | {from}(e)k zure txat batean idatzi du ({n}) |
| `notices.kind.booking_requested` | Aviso: te piden ayuda | features/help/GuardTour, features/notices/Mailbox, features/notices/MailboxTour | {from} te pide un rato de ayuda | {from} asks you for some help | {from} et demana una estona d'ajuda | {from}(e)k laguntza-tarte bat eskatzen dizu |
| `notices.kind.booking_accepted` | Aviso: aceptaron tu reserva | features/notices/Mailbox | {from} ha aceptado tu reserva | {from} accepted your booking | {from} ha acceptat la teva reserva | {from}(e)k zure erreserba onartu du |
| `notices.kind.booking_declined` | Aviso: rechazaron tu reserva | features/notices/Mailbox | {from} no puede atender tu reserva | {from} cannot take your booking | {from} no pot atendre la teva reserva | {from}(e)k ezin du zure erreserba artatu |
| `notices.kind.booking_cancelled` | Aviso: anularon una reserva | features/notices/Mailbox | {from} ha anulado una reserva | {from} cancelled a booking | {from} ha anul·lat una reserva | {from}(e)k erreserba bat bertan behera utzi du |
| `notices.kind.doubt_answered` | Aviso: respondieron a tu duda | features/notices/Mailbox, features/notices/MailboxTour | {from} ha respondido a tu duda | {from} answered your question | {from} ha respost al teu dubte | {from}(e)k zure zalantzari erantzun dio |
| `notices.kind.doubt_solved` | Aviso: tu respuesta resolvió una duda | features/notices/Mailbox | {from} dice que tu respuesta resolvió su duda | {from} says your answer solved their question | {from} diu que la teva resposta va resoldre el seu dubte | {from}(e)k dio zure erantzunak bere zalantza ebatzi zuela |
| `notices.kind.proposal_accepted` | Aviso: validaron tu cambio en una guía | features/notices/Mailbox | {from} ha validado tu cambio en una guía | {from} validated your change to a guide | {from} ha validat el teu canvi en una guia | {from}(e)k gida bateko zure aldaketa balidatu du |
| `notices.kind.proposal_rejected` | Aviso: rechazaron tu cambio en una guía | features/notices/Mailbox | {from} ha rechazado tu cambio en una guía | {from} rejected your change to a guide | {from} ha rebutjat el teu canvi en una guia | {from}(e)k gida bateko zure aldaketa baztertu du |
| `notices.kind.board_changed` | Aviso: cambió una pizarra | features/notices/Mailbox | {from} ha cambiado la hora o el sitio de una pizarra | {from} changed the time or place of a whiteboard | {from} ha canviat l'hora o el lloc d'una pissarra | {from}(e)k arbel baten ordua edo lekua aldatu du |
| `notices.kind.board_cancelled` | Aviso: se canceló una pizarra | features/notices/Mailbox | {from} ha cancelado una pizarra | {from} cancelled a whiteboard | {from} ha cancel·lat una pissarra | {from}(e)k arbel bat bertan behera utzi du |
| `notices.kind.group_joined` | Aviso: alguien entró en tu grupo | features/notices/Mailbox | {from} se ha apuntado a tu grupo de terapia | {from} joined your therapy group | {from} s'ha apuntat al teu grup de teràpia | {from}(e)k zure terapia-taldean izena eman du |
| `notices.kind.group_closed` | Aviso: se cerró un grupo | features/notices/Mailbox | {from} ha cerrado un grupo de terapia | {from} closed a therapy group | {from} ha tancat un grup de teràpia | {from}(e)k terapia-talde bat itxi du |
| `notices.kind.group_invite` | Aviso: hay un grupo de tu proyecto | features/notices/Mailbox | {from} ha abierto un grupo de terapia de un proyecto que estás haciendo | {from} opened a therapy group for a project you are doing | {from} ha obert un grup de teràpia d’un projecte que estàs fent | {from}(e)k egiten ari zaren proiektu baten terapia-taldea ireki du |
| `notices.kind.clicker_defense` | Aviso para admins: alguien explicó su partida | features/notices/Mailbox | {from} se ha defendido en una revisión de Code Clicker | {from} answered a Code Clicker review | {from} s'ha defensat en una revisió de Code Clicker | {from}(e)k Code Clickerreko berrikuspen bati erantzun dio |
| `inbox.open` | Menú de la cuenta: incidencias y sugerencias | app/Header | Incidencias y sugerencias | Issues and suggestions | Incidències i suggeriments | Gorabeherak eta iradokizunak |
| `inbox.title` | Título del formulario de incidencias | features/admin/Inbox, features/admin/InboxTour | Incidencias y sugerencias | Issues and suggestions | Incidències i suggeriments | Gorabeherak eta iradokizunak |
| `inbox.kind` | Formulario: tipo | features/admin/Inbox | Tipo | Type | Tipus | Mota |
| `inbox.to` | A quién llega y dónde se responde | features/admin/Inbox | Para: quien administra Sanatorio 42. Te responde aquí y te avisa en el buzón. | To: whoever runs Sanatorio 42. You get the answer here, with a notice in your mailbox. | Per a: qui administra Sanatorio 42. Et respon aquí i t'avisa a la bústia. | Norentzat: Sanatorio 42 kudeatzen duenarentzat. Hemen erantzungo dizu eta postontzian abisatuko. |
| `inbox.section` | Formulario: sección afectada | features/admin/Inbox | Sección | Section | Secció | Atala |
| `inbox.section.general` | Sección: toda la web | features/admin/Inbox | Toda la web | The whole site | Tot el web | Web osoa |
| `inbox.category.bug` | Tipo: algo falla | features/admin/Inbox, features/admin/InboxTab, features/admin/InboxTour | Fallo | Bug | Error | Akatsa |
| `inbox.category.improvement` | Tipo: mejorar algo | features/admin/Inbox, features/admin/InboxTab, features/admin/InboxTour | Mejora de algo que ya hay | Improve something that exists | Millora del que ja hi ha | Lehendik dagoen zerbaiten hobekuntza |
| `inbox.category.idea` | Tipo: idea nueva | features/admin/Inbox, features/admin/InboxTab | Idea nueva | New idea | Idea nova | Ideia berria |
| `inbox.category.translation` | Tipo: traducción | features/admin/Inbox, features/admin/InboxTab | Traducción | Translation | Traducció | Itzulpena |
| `inbox.category.other` | Tipo: otra cosa | features/admin/Inbox, features/admin/InboxTab | Otra cosa | Something else | Una altra cosa | Beste zerbait |
| `inbox.body.bug` | Indicación para describir un fallo | features/admin/Inbox | Qué estabas haciendo y qué ha pasado | What you were doing and what happened | Què estaves fent i què ha passat | Zer ari zinen egiten eta zer gertatu da |
| `inbox.body.improvement` | Indicación para una mejora | features/admin/Inbox | Qué cambiarías y por qué | What you would change and why | Què canviaries i per què | Zer aldatuko zenuke eta zergatik |
| `inbox.body.idea` | Indicación para una idea | features/admin/Inbox | Qué te gustaría poder hacer | What you would like to be able to do | Què t'agradaria poder fer | Zer egin ahal izatea gustatuko litzaizuke |
| `inbox.body.translation` | Indicación para una traducción | features/admin/Inbox | Qué texto está mal y cómo debería decir | Which text is wrong and what it should say | Quin text està malament i com hauria de dir | Zein testu dago gaizki eta nola esan beharko luke |
| `inbox.body.other` | Indicación genérica | features/admin/Inbox | Cuéntanos | Tell us | Explica-ho | Kontatu |
| `inbox.kind.issue` | Tipo de envío: algo no va | features/admin/Inbox, features/admin/InboxTab | Algo no va | Something is broken | Alguna cosa no va | Zerbait ez dabil |
| `inbox.kind.idea` | Tipo de envío: mejora | features/admin/Inbox, features/admin/InboxTab | Una mejora | An improvement | Una millora | Hobekuntza bat |
| `inbox.kind.report` | Tipo de envío: denuncia | features/admin/Inbox, features/admin/InboxTab | Denuncia | Report | Denúncia | Salaketa |
| `inbox.bodyLabel` | Formulario: detalle | features/admin/Inbox | Detalle | Details | Detall | Xehetasuna |
| `inbox.send` | Botón de enviar | features/admin/Inbox, features/admin/InboxTour | Enviar | Send | Envia | Bidali |
| `inbox.mine` | Lista de lo que has enviado | features/admin/Inbox | Lo que has enviado | What you have sent | El que has enviat | Bidali duzuna |
| `inbox.none` | No has enviado nada | features/admin/Inbox | Todavía no has enviado nada. | You have not sent anything yet. | Encara no has enviat res. | Oraindik ez duzu ezer bidali. |
| `inbox.pending` | Sin respuesta todavía | features/admin/Inbox | Pendiente de respuesta | Waiting for an answer | Pendent de resposta | Erantzunaren zain |
| `inbox.withdraw` | Botón para retirar un envío | features/admin/Inbox | Retirar | Withdraw | Retira | Kendu |
| `inbox.answer` | Prefijo de la respuesta de admin | features/admin/Inbox | Respuesta: | Answer: | Resposta: | Erantzuna: |
| `report.button` | Botón para denunciar un mensaje | features/admin/ReportButton | Denunciar | Report | Denuncia | Salatu |
| `report.why` | Formulario de denuncia: qué pasa | features/admin/ReportButton | Qué tiene de problemático | What is wrong with it | Què té de problemàtic | Zer du arazotsua |
| `report.send` | Botón para enviar la denuncia | features/admin/ReportButton | Enviar denuncia | Send report | Envia la denúncia | Bidali salaketa |
| `report.reason` | Motivo de la denuncia | features/admin/ReportButton | Motivo | Reason | Motiu | Arrazoia |
| `report.reason.spam` | Motivo: spam | features/admin/InboxTab, features/admin/ReportButton | Spam | Spam | Correu brossa | Spama |
| `report.reason.harassment` | Motivo: acoso | features/admin/InboxTab, features/admin/ReportButton | Acoso | Harassment | Assetjament | Jazarpena |
| `report.reason.insults` | Motivo: insultos | features/admin/InboxTab, features/admin/ReportButton | Insultos | Insults | Insults | Irainak |
| `report.reason.other` | Motivo: otro | features/admin/InboxTab, features/admin/ReportButton | Otro motivo | Something else | Un altre motiu | Beste arrazoi bat |
| `report.whyOptional` | Detalle opcional | features/admin/ReportButton | Algo más que contar (opcional) | Anything else to add (optional) | Alguna cosa més a explicar (opcional) | Beste zerbait kontatzeko (aukerakoa) |
| `report.cancel` | Botón para cancelar | features/admin/ReportButton | Cancelar | Cancel | Cancel·la | Utzi |
| `report.sent` | Confirmación de denuncia | features/admin/ReportButton | Denuncia enviada. Gracias por avisar. | Report sent. Thanks for letting us know. | Denúncia enviada. Gràcies per avisar. | Salaketa bidalita. Eskerrik asko abisatzeagatik. |
| `broadcast.from` | Comunicado de quien administra | features/admin/BroadcastGate | Comunicado de {login} | Message from {login} | Comunicat de {login} | {login}(r)en jakinarazpena |
| `broadcast.must` | El comunicado obliga a elegir | features/admin/BroadcastGate | Elige una opción para cerrar este mensaje. | Pick an option to close this message. | Tria una opció per tancar aquest missatge. | Aukeratu aukera bat mezu hau ixteko. |
| `broadcast.ok` | Botón para dar por leído | features/admin/BroadcastGate | Entendido | Got it | Entesos | Ulertuta |
| `broadcast.later` | Botón para verlo luego | features/admin/BroadcastGate | Ahora no | Not now | Ara no | Orain ez |
| `notices.compose` | Botón para escribir un mensaje | features/notices/Mailbox | Escribir un mensaje | Write a message | Escriu un missatge | Idatzi mezu bat |
| `notices.toAdmin` | Destinatario: administración | features/notices/Mailbox | A quien administra | To the admins | A qui administra | Kudeatzaileari |
| `notices.toPeer` | Destinatario: otra persona | features/notices/Mailbox | A alguien del campus | To someone on campus | A algú del campus | Campuseko norbaiti |
| `notices.peerLabel` | Buscador de destinatario | features/notices/PeerPicker | Busca por login o por nombre | Search by login or name | Cerca per login o per nom | Bilatu loginaren edo izenaren arabera |
| `notices.tab.notices` | Pestaña del buzón: avisos | features/notices/Mailbox | Avisos | Notices | Avisos | Oharrak |
| `notices.tab.chats` | Pestaña del buzón: conversaciones | features/notices/Mailbox | Conversaciones | Conversations | Converses | Elkarrizketak |
| `notices.go.conversations` | Enlace del aviso: abrir la conversación | features/notices/Mailbox | abrir la conversación | open the conversation | obre la conversa | ireki elkarrizketa |
| `notices.kind.chat_reminder` | Recordatorio que te pusiste | features/notices/Mailbox | Recordatorio: tienes pendiente responder a {from} | Reminder: you still have to answer {from} | Et recordo que tens pendent respondre a {from} | Gogoratu: {from} erabiltzaileari erantzuteko duzu |
| `chats.back` | Botón para volver a la lista de conversaciones | features/notices/Conversations | Conversaciones | Conversations | Converses | Elkarrizketak |
| `chats.filter` | Filtro de conversaciones | features/notices/Conversations | Qué conversaciones se ven | Which conversations are shown | Quines converses es veuen | Zein elkarrizketa ikusten diren |
| `chats.state.all` | Filtro: todas | features/notices/Conversations | Todas | All | Totes | Denak |
| `chats.state.unread` | Filtro: sin leer | features/notices/Conversations | No leídas | Unread | No llegides | Irakurri gabeak |
| `chats.state.pending` | Filtro: pendientes de responder | features/notices/Conversations | Pendientes | Pending | Pendents | Zain daudenak |
| `chats.byKind` | Filtro por tipo | features/notices/Conversations | Por tipo | By type | Per tipus | Motaren arabera |
| `chats.allKinds` | Filtro: todos los tipos | features/notices/Conversations | Todos los tipos | All types | Tots els tipus | Mota guztiak |
| `chats.byProject` | Filtro por proyecto | features/notices/Conversations | Por proyecto | By project | Per projecte | Proiektuaren arabera |
| `chats.allProjects` | Filtro: cualquier proyecto | features/notices/Conversations | Cualquier proyecto | Any project | Qualsevol projecte | Edozein proiektu |
| `chats.kind.direct` | Tipo: mensaje directo | features/notices/Conversations | Directa | Direct | Directa | Zuzena |
| `chats.kind.group` | Tipo: grupo de terapia | features/notices/Conversations | Grupo de terapia | Therapy group | Grup de teràpia | Terapia-taldea |
| `chats.kind.board` | Tipo: pizarra | features/notices/Conversations | Pizarra | Whiteboard | Pissarra | Arbela |
| `chats.kind.help` | Tipo: sesión de ayuda | features/notices/Conversations | Sesión de ayuda | Help session | Sessió d'ajuda | Laguntza-saioa |
| `chats.kind.event` | Tipo: evento | features/admin/AdminPage, features/notices/Conversations | Evento | Event | Esdeveniment | Ekitaldia |
| `chats.said.seen` | Respuesta al aviso: lo ha visto | features/notices/Conversations | Lo ha visto | Has seen it | Ho ha vist | Ikusi du |
| `chats.said.late` | Respuesta al aviso: llega tarde | features/notices/Conversations | Se retrasa | Running late | Fa tard | Berandu dator |
| `chats.said.absent` | Respuesta al aviso: no va | features/notices/Conversations | No puede ir | Cannot make it | No hi pot anar | Ezin du joan |
| `chats.said.text` | Mensaje de texto (se abrevia) | features/notices/Conversations | … | … | … | … |
| `chats.empty` | Sin conversaciones | features/notices/Conversations | Todavía no tienes ninguna conversación. Escribe a alguien desde aquí abajo. | You have no conversations yet. Write to someone from down here. | Encara no tens cap conversa. Escriu a algú des d'aquí sota. | Oraindik ez duzu elkarrizketarik. Idatzi norbaiti hemen behetik. |
| `chats.noneShown` | Ninguna cumple los filtros | features/notices/Conversations | Ninguna conversación cumple esos filtros. | No conversation matches those filters. | Cap conversa compleix aquests filtres. | Ez dago iragazki horiek betetzen dituen elkarrizketarik. |
| `chats.pending` | Etiqueta: pendiente de responder | features/notices/Conversations | Pendiente | Pending | Pendent | Zain |
| `chats.markUnread` | Botón para marcar como no leída | features/notices/Conversations | Marcar como no leída | Mark as unread | Marca com a no llegida | Markatu irakurri gabe gisa |
| `chats.unreadCount` | Mensajes sin leer | features/notices/Conversations | {n} sin leer | {n} unread | {n} sense llegir | {n} irakurri gabe |
| `chats.remind` | Botón para programar un recordatorio | features/notices/Conversations | Recordármela… | Remind me… | Recorda-me-la… | Gogorarazi… |
| `chats.remindSet` | Cuándo salta el recordatorio | features/notices/Conversations | Recordatorio: {when} | Reminder: {when} | Recordatori: {when} | Gogorarazpena: {when} |
| `chats.remind.hour` | Recordatorio: en una hora | features/notices/Conversations | Dentro de una hora | In an hour | D'aquí a una hora | Ordubete barru |
| `chats.remind.tomorrow` | Recordatorio: mañana | features/notices/Conversations | Mañana a las 9:00 | Tomorrow at 9:00 | Demà a les 9:00 | Bihar 9:00etan |
| `chats.remind.monday` | Recordatorio: el lunes | features/notices/Conversations | El lunes a las 9:00 | On Monday at 9:00 | Dilluns a les 9:00 | Astelehenean 9:00etan |
| `chats.remind.none` | Quitar el recordatorio | features/notices/Conversations | Quitar el recordatorio | Remove the reminder | Treu el recordatori | Kendu gogorarazpena |
| `chats.project` | Elegir de qué proyecto va la conversación | features/notices/Conversations | ¿De qué proyecto va? | Which project is it about? | De quin projecte va? | Zein proiekturi buruzkoa da? |
