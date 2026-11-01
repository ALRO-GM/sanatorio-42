# Revisión de la UX (noviembre de 2026)

Revisión a fondo de la estructura de la web, de lo que enseña cada modo de la
interfaz y de los flujos de trabajo típicos. Hecha el 2026-11-01 sobre la API
de mentira (`vite --mode mock`), en escritorio (1280 px) y móvil (390 px), en
los tres modos y como piscinero. El mapa de qué sale en cada modo está en
`docs/interfaz.md`; aquí, el análisis, lo hecho y lo que queda propuesto.

## Lo que funciona

- **Navegación en dos filas** (cuatro categorías y sus secciones), con la
  última sección de cada categoría recordada y, en el móvil, la barra de abajo.
  Ayuda abre de fábrica Peer to peer: de la portada a quién te ayuda hay un clic
  (y, ahora, a veces ninguno más).
- **La regla de los modos** está centralizada (`shows`, `<Show>`, `from` en
  `app/sections.ts` y `shared/layout/registry.ts`) y una sección escondida sigue
  abriéndose por su dirección, así que los avisos del buzón no se rompen.
- **Estados de carga y error**: casi todo pasa por `useAsync` + `ErrorNote` con
  reintento; ninguna pantalla revisada se queda en blanco.
- **Accesibilidad**: pestañas con `aria-current`, bloques plegables con
  `aria-expanded`, resúmenes en `role="status"`/`aria-live`, iconos con texto.

## Lo que se encontró

### Coherencia entre modos

| Dónde | Problema | Gravedad |
| --- | --- | --- |
| Perfil → estado de salud | «Compararte en Avance» salía en el simplificado, que no tiene la pestaña Campus: un enlace a una sección que el modo esconde | Media |
| Perfil → tu red | La endogamia y «con quién más» salían desde el normal, cuando en la Red esos mismos rankings son del modo de datos | Media |
| Peer to peer | «4 personas pueden ayudarte ahora mismo» justo debajo de «3 disponibles ahora mismo»: dos cifras que se contradicen (la lista es quien hace el proyecto, esté o no disponible, más los seniors disponibles) | Alta |
| Peer to peer (simplificado) | El mapa traía la fila «Resaltar» (tu círculo, tu proyecto, quien lo aprobó, círculos), que es afinar: el plano empujaba la lista de gente hacia abajo | Media |
| Exámenes (datos) | El modo de datos promete «desgloses abiertos», pero los de cada examen salían plegados | Baja |
| Bienvenida (simplificado) | Tras elegir el simplificado en el paso 2, seguía presentando la Red y los clústeres, que ese modo no enseña | Baja |
| Textos de la bienvenida | Decían que el modo, el tema y la comodidad se cambian «en el pie»; desde el 2026-10-29 están en Personalizar («Más ajustes») | Media |
| `docs/interfaz.md` | Filas viejas: «Estadísticas (en Ayuda)», los cursos como pestañas de Not-games, el simplificado «sin Aprender» (tiene el Pomodoro) | Baja |

### Flujos de trabajo

- **Estudiante del cursus que se atasca** (portada → Ayuda → Peer to peer →
  proyecto → pedir ayuda): con un solo proyecto en curso había que elegirlo
  igualmente. Ahora se abre solo.
- **Quien da ayuda (on-call)**: la página empieza por preevaluaciones y un
  editor de franjas de todo el día (muy alto); lo que espera tu respuesta
  (valorar una sesión, aceptar una reserva) quedaba al final, fuera de la
  vista. Ahora un aviso arriba lo dice y baja hasta las reservas.
- **Piscinero**: ve su grafo y su lista de la piscina; la lista de proyectos
  se enseña siempre (no se salta, porque separa lo que cuenta de rushes y
  exámenes). Sin cambios.
- **Primera visita**: condiciones → bienvenida de diez pasos → perfil. La
  bienvenida es larga; ahora al menos no presenta lo que el modo no enseña.
- **Móvil**: la barra de abajo funciona bien. En Peer to peer el mapa ocupa
  la pantalla entera antes de la lista de gente (ver propuestas).
- **Staff** (`#/validar`): pantalla aparte y mínima; no se tocó.

### Otros detalles

- Perfil (normal): «Horas validadas» plegado parecía una etiqueta sin nada
  debajo, sobre todo en el móvil. Ahora lleva una flecha que gira al abrirse.

## Lo hecho

| Pantalla | Modo | Cambio |
| --- | --- | --- |
| Perfil → estado de salud | Simplificado | Sin «Compararte en Avance» (`HealthCard.tsx`) |
| Perfil → tu red | Normal | Correcciones hechas y recibidas, personas y aprobado/suspenso; la endogamia y «con quién más», solo en datos (`NetworkCard.tsx`) |
| Perfil → horas validadas | Normal y datos | Flecha de desplegable en el título plegado (`styles/admin.css`) |
| Peer to peer | Todos | Con un solo proyecto en curso (estudiante), se abre directamente quién ayuda; «Volver» deja la lista sin rebotar (`ProjectSelect.tsx`, `app/SectionView.tsx`) |
| Peer to peer | Simplificado | Sin el recuento de la lista (`PeerList.tsx`) |
| Peer to peer | Normal y datos | El recuento dice lo que cuenta: «En la lista, N personas: quien lo está haciendo y los seniors disponibles» (`peers.total*`) |
| Mapa (Peer to peer) | Simplificado | Sin «Resaltar» ni «Círculos»: el plano tal cual (`ClusterMapView.tsx`). El ajuste de tamaño sigue si el clúster no cabe |
| On-call | Todos | Aviso arriba «Tienes N reservas esperando tu respuesta» con «Verlas», que baja a las reservas (`Guardia.tsx`, `help.waiting*`) |
| Exámenes | Datos | «En qué intento se aprueba» (el resto) y «Cada intento», abiertos de fábrica (`ExamStatsPanel.tsx`) |
| Bienvenida | Todos | Los pasos siguen el modo elegido (`from` en `SLIDES`); textos del modo y de los ajustes, al día con «Más ajustes» |
| `docs/interfaz.md` | — | Tabla de modos al día con lo de arriba y sin las filas viejas |

Tests: `apps/web/tests/ui/modes-ux.test.tsx` (coherencia de los modos y los dos
flujos) y `exams.test.tsx` (el desglose, abierto en datos y plegable).

## Propuesto, sin hacer

Por riesgo, por tocar zonas de otros o por necesitar una decisión de producto
(las propuestas 1-4 y 7, aprobadas por Alberto, están en «Hecho después»):

5. **Perfil en el simplificado**: un acceso directo «¿Atascado? Busca quién te
   ayuda» bajo el nivel. Hoy hay un clic (Ayuda) y funciona; solo si las
   pruebas con gente dicen que no se encuentra.
6. **Modo de datos en el Avance y los Asientos**: abrir de fábrica «Ver como
   tabla». Son vistas alternativas más que desgloses; no se tocó.

## Hecho después (aprobado por Alberto)

| Propuesta | Cambio |
| --- | --- |
| 1. Peer to peer en el móvil | En ≤ 640 px la lista de gente va antes que el mapa; en escritorio, igual que antes (`PeerList.tsx`, `useMediaQuery`) |
| 2. On-call recogido | El editor enseña las cuatro horas desde ahora y la hora entera de cada cosa más tarde (franja, reserva, corrección); entre tramos, una raya. «Ver el resto del día» / «Ver menos horas» (`shortStarts` en `features/help/time.ts`, `DayEditor.tsx`, `help.wholeDay`, `help.shortDay`) |
| 3. Bienvenida corta | De diez pasos a seis (simplificado) o siete: el modo se elige en el saludo, Proyectos va con Sprints y Pizarras, y el calendario con los ajustes al final (`Welcome.tsx`, textos `welcome.*` en cinco lenguas) |
| 4. Recordar el proyecto | `#/consulta/<id>` (`waitingHref`): al elegir se escribe sin otra entrada en el historial, al volver de otra sección se abre el mismo, y un enlace lo abre si es de tu lista; «Volver» lo olvida (`SectionView.tsx`, `ProjectSelect.tsx`, `Clinic.tsx`) |
| 7. Cabecera de bloque | Abierta: a la izquierda, en versalitas, con aire sobre ella; plegada, la barra de siempre (`styles/layout.css`) |

Tests: `apps/web/tests/ui/ux-propuestas.test.tsx`, `guard-slots.test.tsx`,
`tests/help-slots.test.ts` y `tests/links.test.ts`.
