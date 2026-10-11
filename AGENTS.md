# Instrucciones para agentes de IA

## El proyecto

Sanatorio 42: web para estudiantes de 42. Cuando te atascas en un proyecto
("¿Qué te duele hoy?"), ves quién te puede ayudar: "pacientes como tú" (lo están
haciendo) y "especialistas" (ya lo aprobaron), su puesto en el cluster y si
están "de guardia". Alrededor: terapias de grupo, tablón de dudas, pizarras y
expediente con XP.

## Estructura

Monorepo con workspaces de npm. Ver `README.md` y `docs/architecture.md`.

- `apps/api/`: API. Una carpeta por funcionalidad en `src/modules/`.
- `apps/web/`: web. Una carpeta por funcionalidad en `src/features/`.
- `packages/contracts/`: tipos de las respuestas de la API, compartidos.
- `infra/`: despliegue.

## Reglas de código

- Antes de dar algo por hecho: `npm run check` (tipos, lint, formato y tests).
- Un cambio en la forma de una respuesta empieza en `packages/contracts` y se
  refleja en `docs/api.md`.
- API: `core/` e `integrations/` no importan de `modules/`; de otro módulo solo
  se importa su `index.ts`. El linter lo comprueba.
- API: ningún módulo llama a la API de 42 salvo `replica`. Los demás leen de la
  réplica.
- API: un cambio de esquema es una migración nueva en
  `src/core/db/migrations/`; las existentes no se editan.
- Web: los componentes no llevan texto escrito, usan `t('clave')`. Cada texto
  nuevo va en `shared/i18n/es.ts` y su traducción en `en.ts`.
- Web: solo `shared/api/` habla con la API. Lo que se añada al cliente real se
  añade también al simulado (`mock/`); el tipo `Api` obliga a ello.
- Comentarios en español, explicando el porqué.

## Reglas de producto

- "Eminencia" es quien aprobó un proyecto con 125; está por encima de
  "especialista" y se enseña en dorado.
- Regla de guardia: alguien está "de guardia" solo si `available: true` y
  `location` no es `null`. Está en `onDuty`, en `features/peers/PeerList.tsx`.
- Tono: clínica cálida y con humor amable. Vocabulario: "de guardia", "fuera de
  turno", "fuera del centro", "especialista", "paciente como tú", "sala de
  espera", "terapia de grupo".
- Textos en segunda persona y con lenguaje inclusivo (evitar formas con género
  cuando se pueda).
- La navegación entre secciones va en su propia fila, debajo de la cabecera. El
  expediente no está en esa fila: se abre con la cruz de la cabecera. El
  idioma y campus van en el pie.
- Mapa de clusters: dorado = especialista de guardia, verde = paciente de
  guardia, gris = ocupado sin más. El azul de terapia solo se pinta mientras el
  grupo está reunido (o, al elegir puestos, si choca con el día y la hora).
- Grafo del tablón: es el plan de cada persona, no un catálogo. Turquesa =
  aprobado, blanco = en curso, gris = disponible, gris con candado = aún no.
  Cada proyecto enseña como mucho una marca y solo a quien puede hacer algo con
  ella (`graph` en `doubts.service.ts`). La piscina no sale en ningún sitio.
- Calendario: cada tipo de evento tiene su color e icono (`features/calendar/kinds.ts`
  y las clases `kind-*`). Lo de Sanatorio en tonos fríos, lo de 42 en cálidos;
  borde discontinuo = no estás apuntado.
- Colores: todos salen de las variables de tema de `styles/global.css`
  (`--surface`, `--text`, `--border`…). Un hexadecimal suelto no cambiaría con el
  modo nocturno; solo vale para lo que es igual en los dos temas (post-its,
  códigos de color del mapa y del grafo).
- Paleta: fondo crema, verdes menta y salvia, turquesa de 42 como acento. "No
  disponible" en gris neutro, nunca en rojo.
- La cabecera tiene que caber en una sola fila y todo verse bien en móvil.
- No hagas commits: los hace la persona.

## XP y anti-trampas

- La XP por ayudar en persona solo sale de una sesión reservada, aceptada,
  comprobada (las dos personas en el campus) y valorada por las dos partes. No
  añadas atajos que den XP con un clic.
- Las valoraciones no son notas: describen cómo fue la sesión. No añadas
  opciones negativas, positivas ni neutras.
- Los topes (pareja/día, pareja/semana, diarios) y las faltas están en
  `help.service.ts`, `doubts.service.ts` y `therapy.service.ts`, con su porqué.

## Pendiente

- Probar las secciones con gente real y ajustar textos y límites (plazas, XP).
- Guardar el idioma elegido también en el servidor (`PUT /me/settings` ya lo admite).
- Traducir los mensajes de error de la API; fuera del español se enseña uno genérico.
- Tests de la web (no tiene).
