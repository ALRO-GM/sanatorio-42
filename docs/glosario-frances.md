# Glosario de francés

Referencia corta para quien traduce o revisa la columna `fr` de las tablas
(`apps/web/src/shared/i18n/textos/*.csv`). Cómo se trabaja con ellas:
[docs/textos.md](textos.md). Un término por concepto, el mismo en todas las
tablas.

## Decisiones fijas

Elegidas en la revisión del francés (octubre de 2026), donde las tablas usaban
términos distintos:

| Español | Francés | Notas |
| --- | --- | --- |
| Plan de estudios / plan | **programme** | « Programme classique (C) » / « Nouveau programme (Python) »; selector « Programme ». « Cursus » queda para el 42cursus. |
| Estudiantes / piscineros (grupos) | **Cursus** / **Piscine** | Como etiqueta corta. En frase: « les personnes en cursus », « les personnes en piscine ». |
| Incidencias y sugerencias | **Problèmes et suggestions** | Menú de la cuenta, buzón y texto legal. |
| Ayuda (categoría) | **Entraide** | Sus estadísticas: « Statistiques de l'entraide ». |
| Meta (agenda) | **objectif** | « jalon » solo para los hitos (milestones) de 42. |
| Aviso del buzón | **notification** | |
| Aviso de un evento (hay que responder) | **alerte** | |
| Aviso de quien administra, cuenta atrás, comunicado | **annonce** | Nunca « avis », que son las valoraciones. |
| Pizarra | **tableau blanc** | « animer un tableau blanc ». |
| Puesto / fila | **poste** / **rangée** | « Réseau des postes ». |
| Aprobar / suspender (proyecto, examen, círculo) | **valider**, **validé** / **échec**, **échouer** | « réussir » solo para lo que no es de 42: un quiz, una prueba, una orden. |
| Preevaluar | **pré-corriger**, **pré-correction** | |
| Corrector / corregido | **côté correction** / **côté projet**, « correction faite / reçue » | Sin « correcteur·rice ». |

## Vocabulario de 42

piscine, cursus (el 42cursus), tronc commun, cercle, correction / corriger,
évaluation (cuando el inglés dice evaluation), créneau, Black Hole, kick-off
(masculino), cluster, poste, projet, examen, intra, staff, bocal (solo si sale
en el original), XP, niveau, logtime, barème (hoja de corrección), sujet
(subject), rendu / date de rendu (entrega), examen blanc (simulacro).

## Peer4U

| Español | Francés |
| --- | --- |
| Panel de gestión | panneau d'administration |
| Buzón | boîte de réception |
| Incidencia / denuncia | ticket / signalement |
| Pestaña | onglet |
| Recorridos | Parcours |
| Tope / cuota | plafond / quota |
| Modo ahorro | mode économie |
| Informe de horas | relevé d'heures |
| Cuenta atrás | compte à rebours |
| Compromiso | rendez-vous |
| Atasco | blocage |
| Datos / Avance / Red / grafo | Données / Progression / Réseau / graphe |
| Logros / valoraciones | succès / avis |
| Ajustes / personalizar | Réglages / Personnaliser |
| Modo concentración | Mode concentration |
| Demostración | Démo |
| Duda / propuesta | question / proposition |
| Clasificación / posición | classement / Rang |
| Franja / reserva | créneau / réservation |
| Sesión de ayuda | session d'aide |
| Copiar datos de 42 | importer |
| Pareja | paire |
| Curso / reto / prueba / jefe | cours / défi / épreuve / Boss |
| Certificado | certificat |
| Repositorio / carpeta / home | dépôt / dossier / dossier personnel |
| Pipe / cron / wildcard | tube / tâche planifiée / joker |
| merge / push / staging / detached HEAD | fusionner (merge) / pousser / index / HEAD détachée |
| Guardia como concepto | astreinte (la sección se llama On-call) |
| Not-games: salas, Repaso, modos | salons, Révisions, Duel / Équipes / Tous contre tous / Survie |
| Code Clicker: Pisciner, bolsa de 42 | Piscineux, cagnotte de 42; números largos a la francesa (milliard, billion…) |
| Quien administra | l'admin (juego), la personne qui administre le site (legal) |

Se quedan en inglés, como en es y en: Peer4U, Peer to peer, Sprints, On-call,
Health check, Not-games, Code Clicker, Pomodoro, daily, weekly, checkpoint,
commit, rollback, deadline, deploy, pace, Milestone Deadline, thread, data
race, token, prompt, buffer.

## Texto legal (RGPD)

données personnelles, responsable du traitement, base légale, finalité, durée
de conservation, destinataires, sous-traitant, droit d'accès, droit de
rectification, droit à l'effacement, droit à la limitation du traitement,
droit à la portabilité, droit d'opposition, réclamation auprès de l'autorité
de contrôle (aquí la AEPD española: « Agencia Española de Protección de
Datos » se deja en español).

## Registro y forma

- Tuteo siempre (« tu »). Nada de « vous » salvo a un grupo (« vous le relisez
  en groupe »).
- Sin género cuando se puede: « les personnes inscrites », « qui s'est
  inscrit », « l'équipe »; « étudiant·e » solo si no hay otra salida.
- Mayúsculas con acento: À, É, Ê, Ç.
- Botones con verbo en infinitivo (« M'inscrire », « Enregistrer »).

## Tipografía

`npm run textos` la comprueba en cada celda `fr`:

- U+00A0 (espacio sin corte) antes de `:` y de `%`, y
  dentro de « ».
- U+202F (fino sin corte) antes de `;`, `?` y `!`.
- Miles con U+202F: `1 234`; decimales con coma: `2,5`.
- « » para citar; `…` en vez de `...`; nada de dobles espacios.
- Nunca dentro de código, `{huecos}`, URL ni correos (`10:30`, `http://`,
  `%p` no se tocan).
- Los mismos `{huecos}` que el español; nada de ¿ ¡ ñ.
