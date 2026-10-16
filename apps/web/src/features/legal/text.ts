/**
 * El texto de «Privacidad y condiciones», como contenido y no como frases de la
 * interfaz: va aparte de los diccionarios porque es un documento entero.
 *
 * Tiene que decir lo que la web hace de verdad. Si cambia algo de lo que dice
 * (qué se guarda, cuánto, quién lo ve), se cambia aquí **y** la versión
 * (`LEGAL_VERSION` en `modules/legal` de la API): entonces se vuelve a pedir que
 * se acepte.
 *
 * Es un texto de base, escrito con cuidado pero sin abogado: conviene que lo
 * revise alguien de leyes.
 */

export type LegalSection = { heading: string; body: readonly (string | readonly string[])[] }

export type LegalText = {
  title: string
  /** Lo que se enseña antes de aceptar: lo esencial en una lista corta. */
  summary: readonly string[]
  sections: readonly LegalSection[]
}

const es: LegalText = {
  title: 'Privacidad y condiciones de uso',
  summary: [
    'Sanatorio 42 es un proyecto de estudiantes de 42 Madrid. No es un servicio oficial de 42.',
    'Usa los datos que 42 ya publica para el campus (login, foto, proyectos, puesto, correcciones) y lo que hagas aquí (guardia, reservas, mensajes, XP).',
    'No hay publicidad, no se vende nada a nadie y no hay cookies de seguimiento.',
    'Puedes descargar todo lo tuyo cuando quieras y pedir que se borre.',
    'Se pide respeto: el acoso, el spam o hacer trampas pueden acabar en un bloqueo.',
  ],
  sections: [
    {
      heading: 'Quién está detrás',
      body: [
        'Sanatorio 42 lo mantiene un estudiante de 42 Madrid (login albrodri). No es un servicio de la Fundación 42 ni de Telefónica, aunque usa la API pública de 42 con permiso de su aplicación.',
        'Para cualquier cosa sobre tus datos, escribe desde «Incidencias y sugerencias» (menú de tu cuenta). Para un fallo de seguridad, la dirección está en /.well-known/security.txt.',
      ],
    },
    {
      heading: 'Qué datos se usan',
      body: [
        'Al entrar, 42 te pide permiso para darnos tu perfil público (permisos «public» y «profile»). De 42 se copian, para ti y para el resto del campus:',
        [
          'login, nombre, foto y campus;',
          'tus proyectos, su estado y su nota, y tu nivel en el 42cursus;',
          'el puesto en el que estás sentado ahora;',
          'las correcciones que haces y que te hacen (quién, de qué proyecto y con qué nota), que 42 ya enseña al campus;',
          'los eventos y exámenes a los que te apuntas y tus hitos (rangos de cada círculo, fechas de inicio y de black hole).',
        ],
        'Y se guarda lo que haces aquí:',
        [
          'tu guardia, las reservas de ayuda, sus códigos de asistencia y las valoraciones;',
          'la XP y los logros;',
          'los mensajes que escribes en chats de eventos, terapias, pizarras y conversaciones;',
          'las dudas, respuestas y guías del tablón;',
          'lo que mandas al buzón de incidencias, las denuncias y las respuestas a comunicados;',
          'tus preferencias (aspecto, orden de secciones, idioma);',
          'cuánto usas cada sección y cuántas peticiones haces (para repartir los límites de la web y de 42), y tu partida de Code Clicker si juegas.',
        ],
      ],
    },
    {
      heading: 'Para qué',
      body: [
        'Solo para que la web funcione: enseñarte quién puede ayudarte, organizar guardias, terapias y pizarras, contar la XP, moderar y evitar abusos. No se usa para publicidad ni se vende ni se cede a nadie.',
        'La base para tratarlos es tu consentimiento (al entrar y aceptar este texto) y, para la seguridad y la moderación, el interés legítimo de que la web sea un sitio seguro.',
      ],
    },
    {
      heading: 'Quién lo ve',
      body: [
        [
          'El resto de estudiantes ve lo que la web enseña: tu expediente público, en qué proyectos estás, tu puesto, si estás de guardia y lo que publicas (mensajes, dudas, pizarras).',
          'En un chat, los mensajes los ven quienes participan. Quien administra la web puede leerlos si hay una denuncia o para moderar.',
          'Quien administra ve además las estadísticas de uso y el buzón de incidencias.',
          'Las horas de asistencia validadas con códigos se pueden enseñar al staff de 42, por ejemplo para pedir días de compensación.',
        ],
      ],
    },
    {
      heading: 'Dónde y cuánto tiempo',
      body: [
        'Todo está en un servidor de Oracle Cloud en Madrid (Unión Europea). Hay una copia de seguridad diaria en la misma máquina; se guardan las 14 últimas.',
        'Los datos de 42 se actualizan solos mientras 42 los publique. Lo que haces aquí no se borra solo por viejo: se guarda hasta que pidas que se borre o quien administra lo limpie desde el panel.',
      ],
    },
    {
      heading: 'Cookies y almacenamiento',
      body: [
        'Solo las necesarias: la de tu sesión (12 horas), la que protege el inicio de sesión con 42 y, si administras, la del panel. En tu navegador se guardan tus preferencias (idioma, tema, velocidad de las demostraciones). No hay cookies de terceros ni de seguimiento.',
      ],
    },
    {
      heading: 'Tus derechos',
      body: [
        [
          'Acceso: descarga todo lo tuyo con el botón de esta página.',
          'Rectificación: lo que viene de 42 se cambia en la intra; lo de aquí, desde la propia web o pidiéndolo.',
          'Supresión: pídelo desde el buzón de incidencias. Se borra lo que has creado aquí. Tus datos públicos de 42 pueden seguir apareciendo mientras 42 los publique para el campus.',
          'Oposición y limitación: pídelo igual, y se atiende.',
        ],
        'Si crees que no se respetan tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
      ],
    },
    {
      heading: 'Normas de uso',
      body: [
        [
          'Trata bien a la gente: nada de acoso, insultos ni discriminación.',
          'Nada de spam ni de publicar datos de otras personas.',
          'No intentes saltarte los límites, sacar datos en masa ni romper la web. Si encuentras un fallo de seguridad, avisa.',
          'La XP, los logros y Code Clicker no tienen valor oficial. Hacer trampas tiene sus consecuencias en el juego.',
        ],
        'Quien administra puede retirar contenido y bloquear cuentas un tiempo si no se cumplen estas normas.',
      ],
    },
    {
      heading: 'Sin garantías',
      body: [
        'Es un proyecto hecho con cariño y sin ánimo de lucro: puede fallar o tener datos de 42 desfasados. Para lo oficial (notas, black hole, evaluaciones), manda la intra.',
        'Si este texto cambia, se te pedirá aceptarlo otra vez.',
      ],
    },
  ],
}

const en: LegalText = {
  title: 'Privacy and terms of use',
  summary: [
    'Sanatorio 42 is a student project at 42 Madrid. It is not an official 42 service.',
    'It uses the data 42 already publishes to the campus (login, photo, projects, seat, evaluations) and what you do here (on-duty slots, bookings, messages, XP).',
    'No ads, nothing is sold to anyone and there are no tracking cookies.',
    'You can download everything about you at any time and ask for it to be deleted.',
    'Be respectful: harassment, spam or cheating can lead to a block.',
  ],
  sections: [
    {
      heading: 'Who runs it',
      body: [
        'Sanatorio 42 is maintained by a 42 Madrid student (login albrodri). It is not run by the 42 Foundation or Telefónica, although it uses the public 42 API through its app.',
        'For anything about your data, write from «Issues and suggestions» (your account menu). For a security issue, the address is in /.well-known/security.txt.',
      ],
    },
    {
      heading: 'What data is used',
      body: [
        'When you sign in, 42 asks you to share your public profile (the «public» and «profile» scopes). From 42 we copy, for you and the rest of the campus:',
        [
          'login, name, photo and campus;',
          'your projects, their status and mark, and your 42cursus level;',
          'the seat you are sitting at right now;',
          'the evaluations you give and receive (who, which project, which mark), which 42 already shows to the campus;',
          'the events and exams you sign up for and your milestones (rank of each circle, start and black hole dates).',
        ],
        'And we keep what you do here:',
        [
          'your on-duty slots, help bookings, their attendance codes and ratings;',
          'XP and achievements;',
          'the messages you write in event, therapy, board and direct chats;',
          'doubts, answers and guides on the board;',
          'what you send to the issue inbox, reports and answers to announcements;',
          'your preferences (look, section order, language);',
          'how much you use each section and how many requests you make (to share the site and 42 limits fairly), and your Code Clicker game if you play.',
        ],
      ],
    },
    {
      heading: 'What for',
      body: [
        'Only to make the site work: showing who can help you, organising on-duty slots, therapy groups and boards, counting XP, moderating and preventing abuse. It is not used for advertising and is never sold or shared.',
        'The legal basis is your consent (when you sign in and accept this text) and, for security and moderation, the legitimate interest of keeping the site safe.',
      ],
    },
    {
      heading: 'Who sees it',
      body: [
        [
          'Other students see what the site shows: your public record, which projects you are on, your seat, whether you are on duty and what you post (messages, doubts, boards).',
          'In a chat, messages are seen by its participants. Whoever runs the site can read them when there is a report, or to moderate.',
          'Whoever runs the site also sees usage statistics and the issue inbox.',
          'Attendance hours validated with codes can be shown to 42 staff, for example to ask for compensation days.',
        ],
      ],
    },
    {
      heading: 'Where and for how long',
      body: [
        'Everything lives on an Oracle Cloud server in Madrid (European Union). There is a daily backup on the same machine; the last 14 are kept.',
        'Data from 42 refreshes itself while 42 publishes it. What you do here is not deleted just because it is old: it is kept until you ask for it to be deleted or whoever runs the site cleans it from the panel.',
      ],
    },
    {
      heading: 'Cookies and storage',
      body: [
        'Only the necessary ones: your session (12 hours), the one that protects signing in with 42 and, if you run the site, the panel one. Your browser keeps your preferences (language, theme, demo speed). There are no third-party or tracking cookies.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        [
          'Access: download everything about you with the button on this page.',
          'Rectification: data from 42 is changed on the intra; data from here, on the site itself or by asking.',
          'Erasure: ask from the issue inbox. What you created here is deleted. Your public 42 data may keep appearing while 42 publishes it to the campus.',
          'Objection and restriction: ask the same way and it will be handled.',
        ],
        'If you think your rights are not respected, you can complain to the Spanish Data Protection Agency (aepd.es).',
      ],
    },
    {
      heading: 'Rules of use',
      body: [
        [
          'Treat people well: no harassment, insults or discrimination.',
          'No spam and no posting other people’s data.',
          'Do not try to bypass limits, scrape data or break the site. If you find a security issue, report it.',
          'XP, achievements and Code Clicker have no official value. Cheating has consequences in the game.',
        ],
        'Whoever runs the site can remove content and block accounts for a while if these rules are not followed.',
      ],
    },
    {
      heading: 'No guarantees',
      body: [
        'This is a non-profit project made with care: it may fail or show outdated 42 data. For anything official (marks, black hole, evaluations), the intra rules.',
        'If this text changes, you will be asked to accept it again.',
      ],
    },
  ],
}

/** El texto en un idioma. En catalán y euskera, el castellano (el documento no está traducido). */
export function legalText(lang: string): { text: LegalText; translated: boolean } {
  if (lang === 'en') return { text: en, translated: true }

  return { text: es, translated: lang === 'es' }
}
