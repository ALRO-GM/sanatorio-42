# Revisión de calidad de la web (apps/web) — 2026-10-22

Revisión de solo lectura sobre `apps/web/src` (React 18 + Vite, hash routing, textos en CSV, temas por variables). Herramientas: lectura de `AGENTS.md`, `docs/architecture.md`, `docs/interfaz.md`, `docs/demos.md`, `shared/*` y `app/*`; `jscpd --min-lines 5 --min-tokens 50` (sin `i18n/` ni `mock/`); `knip --workspace apps/web` (limpio); `vite build`; `vitest run tests/ui` (19 ficheros, 73 tests, todos pasan); greps dirigidos. Todo lo que sigue está comprobado en el código; cuando algo es una sospecha sin confirmar, lo digo.

## Resumen

La base es sólida: `useAsync`/`useAction`, `ErrorNote`, `PersonLink`+`Avatar`, `DataTable`+`table-sort`, `InfoTip`+`Tour`, `Blocks`/`registry`, `detail.tsx` (`Show from`), `links.ts`, `usePeopleSearch`+`PersonInput`, `usePulse` y `still.ts` son piezas reutilizables bien hechas y con comentarios del porqué. `knip` no marca nada y no se detecta CSS muerto. Lo que falta, sobre todo, es **subir a `shared/` lo que ya se repite entre funcionalidades**: el grupo de pastillas (37 copias del mismo botón en 31 ficheros), la lista de clasificación (2 copias idénticas de 26 líneas), el reloj/cuenta atrás (3 hooks locales + 7 intervalos a mano y 11 formateos `mm:ss`), el sondeo con `setInterval(reload)` (10 copias), la ventana modal (16 `<dialog>`, 8 copias del mismo `useEffect`), y un `useFormat()` para fechas y números (40 llamadas a `toLocale*`/`Intl` repitiendo opciones, 28 sin locale). En desacoplamiento hay 37 imports entre funcionalidades, un ciclo `alerts ↔ calendar`, 29 componentes de más de 300 líneas y una sección (`ExamsPage`) que viaja en el bundle inicial por un import estático. En accesibilidad lo mejorable es el teclado en menú y pestañas; en CSS, 320 colores fijos de los que unos 25 son semánticos (rojo/verde/naranja) y deberían ser `--danger/--ok/--warn`; en i18n, 198 claves construidas dinámicamente y 7 plurales a mano con cuatro convenciones distintas; en tests, varias secciones solo tienen la prueba de humo.

Hallazgos: duplicación 15 · desacoplamiento 6 · usabilidad/accesibilidad 11 · rendimiento 5 · CSS 6 · i18n 6 · tests 4 (53 en total).

---

## 1. Duplicación

### D1. El grupo de pastillas (filtro/segmento/pestañas) se escribe a mano 37 veces
- **Dónde**: 37 ocurrencias en 31 ficheros del patrón `className={\`pill ${x === option ? 'active' : ''}\`}` + `aria-pressed` o `role="tab"`/`aria-selected`. Entre ellas: `features/profile/LeaderboardCard.tsx:41-56`, `features/stats/HelpStatsPage.tsx:37-54`, `features/focus/FocusStatsView.tsx:50-66`, `features/admin/RangePills.tsx` (ya es un componente, pero solo para días), `features/notices/Mailbox.tsx:128-141` y `:169`, `features/admin/AdminPage.tsx:88`, `features/admin/UsageTab.tsx:20-32`, `features/admin/InboxTab.tsx:34-46`, `features/admin/ClickerPanel.tsx:66-78`, `features/gitcourse/LevelView.tsx:46-58`, `features/notgames/NotGamesPage.tsx:95`, `features/focus/FocusDialog.tsx:88`, `features/calendar/CalendarPage.tsx:181/200-206/230`, `features/network/NetworkPage.tsx:379/490`, `features/exams/ExamsPage.tsx:212`, `features/doubts/DoubtBoard.tsx:82`, `features/doubts/HolyGraph.tsx` (3), `features/map/ClusterMapView.tsx` (5), `features/admin/GrowthPanel.tsx`, `features/admin/CheatsPanel.tsx`, `features/admin/FlowsPanel.tsx`, `features/admin/ClickMap.tsx`, `features/admin/UsageHeatmap.tsx`, `features/admin/LimitParts.tsx`, `features/boards/BoardsCalendar.tsx`, `features/therapy/GroupForm.tsx`, `features/facility/FacilityForm.tsx`, `features/alerts/Attendance.tsx`, `features/clicker/CapitalHistory.tsx`, `features/clicker/CodeClicker.tsx`, `features/notgames/TurnRoomView.tsx:206`, `features/notgames/RoomView.tsx`, `features/notgames/SoundToggle.tsx`, `features/peers/PeerList.tsx`, `features/help/DayEditor.tsx`. `shared/ui/ProjectPills.tsx` es el único genérico y solo sirve para proyectos.
- **Qué pasa**: cada copia repite el `map`, la clase `active`, el `aria-*` y el `onClick`; 9 de ellas son `role="tablist"` sin `aria-controls` (solo 4 ficheros en toda la web lo usan) y sin flechas de teclado (no hay ningún `ArrowLeft`/`ArrowRight` en el código).
- **Propuesta**: `shared/ui/PillGroup.tsx`:
  ```ts
  type PillGroupProps<T extends string | number> = {
    options: readonly T[]
    value: T | null
    onChange: (next: T) => void
    /** aria-label del grupo. */
    label: string
    /** Texto de cada opción (normalmente `t(\`…${option}\`)`). */
    text: (option: T) => ReactNode
    /** `group` (filtro, aria-pressed) o `tabs` (tablist con aria-selected y flechas). */
    kind?: 'group' | 'tabs'
    className?: string
    children?: ReactNode // botones extra al final, como hoy RangePills
  }
  ```
  Reescribir `RangePills` y `ProjectPills` sobre él; sustituir las 37 copias.
- **Beneficio**: una sola implementación accesible (flechas en pestañas, `aria-controls`), coherencia visual y un sitio donde decidir pastillas vs. select (ver U8).
- **Riesgo**: bajo; mecánico. Los tests por rol (`getByRole('tab'|'button', {pressed})`) siguen valiendo.
- **Esfuerzo**: M.

### D2. Lista de clasificación (rango + medalla + Avatar + PersonLink + valor) duplicada
- **Dónde**: `features/profile/LeaderboardCard.tsx:65-75` y `features/stats/HelpStatsPage.tsx:100-121` (jscpd: 26 líneas / 298 tokens idénticas, incluida la fila `.row.plain.me` y el `medal medal-${rank}`); variantes a mano en `features/notgames/RoomView.tsx:399-410` (`quiz-ranking`), `features/clicker/CodeClicker.tsx:1211-1216` (`cc-board`, con la misma lógica "si no estoy en el top, me añado al final") y `features/network/NetworkPage.tsx:608`.
- **Qué pasa**: la lógica "top N + mi fila si no salgo" está en LeaderboardCard:28-31, HelpStatsPage:72-75 y CodeClicker:1211 por separado.
- **Propuesta**: `shared/ui/RankingList.tsx` con `rows: readonly {login; image; rank}[]`, `me`, `value: (row) => ReactNode`, `extra?: (row) => ReactNode`, `emptyText`, `label`; y un helper `withMe(rows, mine)` en el mismo fichero.
- **Beneficio**: una fila de clasificación idéntica en expediente, estadísticas, not-games y Code Clicker; arregla de paso U4 (marcar "tú" siempre con texto).
- **Riesgo**: bajo. **Esfuerzo**: S.

### D3. Cuenta atrás / reloj: tres hooks locales y siete intervalos a mano
- **Dónde**: hooks locales `useNow` (`features/exams/ExamsPage.tsx:94-110`), `useCountdown` (`features/gitcourse/GateView.tsx:210-224`), `useLeft` (`features/gitcourse/GroupRoom.tsx:121-136`); intervalos inline con `setNow(Date.now())`: `features/notgames/RoomView.tsx:253-262` (200 ms), `features/notgames/TurnRoomView.tsx:333` y `:429`, `features/focus/FocusTimer.tsx:57`, `features/focus/FocusExit.tsx:50`, `features/alerts/AlertCenter.tsx:89` (`tick`), `features/calendar/DayTimeline.tsx:39` (60 s), `features/welcome/Welcome.tsx:80`. Formato `m:ss`/`h:mm:ss`/`h mm min` escrito 11 veces: `ExamsPage.tsx:113-124` (`remaining`), `TurnRoomView.tsx:32`, `FocusTimer.tsx:14`, `GateView.tsx:144`, `GroupRoom.tsx:238`, `CodeClicker.tsx:122`, `clicker/insight.ts:79-81`, `admin/StatsPanel.tsx:28`, `staff/code.ts:24`, `focus/FocusStatsView.tsx:80`, `profile/HealthCard.tsx:22`.
- **Propuesta**: `shared/hooks/useNow.ts`: `useNow(everyMs: number, { active = true, offset = 0 } = {}): number` implementado con un único `setInterval` compartido por cadencia (`useSyncExternalStore`), y `shared/time.ts` con `clock(seconds)` → `4:59` / `1:05:09` y `durationText(t, seconds)` → «3 h 05 min» (hoy `insight.ts`, `StatsPanel`, `staff/code.ts` y `FocusStatsView` lo hacen cada uno a su manera, con y sin textos del CSV).
- **Beneficio**: N relojes en pantalla = 1 intervalo; mismo formato en toda la web; quita 3 hooks y ~60 líneas.
- **Riesgo**: bajo; los offsets de servidor (`offset` en RoomView/GroupRoom) caben como parámetro. **Esfuerzo**: S/M.

### D4. Sondeo «cada N segundos si la pestaña está visible» copiado 10 veces
- **Dónde**: `features/peers/PeerList.tsx:66-75`, `features/map/ProjectMap.tsx:29-37`, `features/admin/StatsPanel.tsx:401-407` (OnlineCard), `features/notgames/NotGamesPage.tsx:131-137`, `features/notgames/RoomView.tsx:67-76`, `features/notgames/TurnRoomView.tsx:81-90`, `features/gitcourse/GroupRoom.tsx:188-197`, `features/network/NetworkPage.tsx:168-176` (mientras copia), `features/settings/Settings.tsx:89` y `features/alerts/AlertCenter.tsx:88` (estos dos **sin** la comprobación `document.hidden`).
- **Propuesta**: `shared/hooks/usePolling.ts`: `usePolling(fn: () => unknown, everyMs: number | null, { whileHidden = false } = {})`, o una opción `every` en `useAsync(fn, deps, { every })`. Documentar en AGENTS que el sondeo de una pantalla que se está mirando va por ahí y lo de fondo por `usePulse`.
- **Beneficio**: una sola política (visibilidad, limpieza) y dos fugas de petición en segundo plano arregladas (Settings, AlertCenter).
- **Riesgo**: bajo. **Esfuerzo**: S.

### D5. Ventanas modales: 16 `<dialog>` con el mismo armazón
- **Dónde**: `<dialog>` en `shared/ui/InfoTip.tsx`, `shared/layout/LayoutSettings.tsx`, `features/notices/Mailbox.tsx`, `features/admin/{BroadcastGate,DataPanel,Inbox}.tsx`, `features/calendar/EventDialog.tsx`, `features/clicker/{Bust,EasterEgg,ReviewGate}.tsx`, `features/focus/{FocusDialog,FocusExit,FocusScreen}.tsx`, `features/help/HelpGate.tsx`, `features/legal/LegalGate.tsx`, `features/welcome/Welcome.tsx`. 13 usan la clase `layout-dialog`, 9 `layout-head` con el botón `link` + `Icon cerrar`; el efecto `if (dialog.current?.open === false) dialog.current.showModal()` está copiado literal en 8 (`DataPanel:212`, `Inbox:43`, `Bust:45`, `FocusDialog:49`, `FocusExit:43`, `Mailbox:54`, `LayoutSettings:49`, `InfoTip:32`) y con variantes en otros 6.
- **Propuesta**: `shared/ui/Modal.tsx`: `Modal({ title, onClose, className, children, closeOnBackdrop = true, cancelable = true })` que pinte `<dialog className="layout-dialog">` + `layout-head` + cuerpo, abra con `showModal()` al montar y gestione `onCancel`/clic en fondo; y `useGateQueue` siguiendo igual para las obligatorias (ya existe y está bien).
- **Beneficio**: mismo comportamiento de cierre en todas (hoy solo InfoTip cierra al pulsar el fondo; 7 no tienen `onCancel`), y un sitio para el foco inicial (U2).
- **Riesgo**: medio solo en las ventanas obligatorias (no deben poder cerrarse): `cancelable={false}`. **Esfuerzo**: M.

### D6. Estados cargando / error / vacío escritos a mano con tres envoltorios distintos
- **Dónde**: 35 `t('app.loading')` en features; envoltorios `<p>` (`LeaderboardCard.tsx:58`), `<p className="estado">` (`HelpStatsPage.tsx:53`, 25 sitios), `<p className="muted">` (`GroupRoom.tsx:201`); 69 condiciones `loading ?`/`loading &&`/`data === undefined`; `ErrorNote` en 79 ficheros, pero 6 que usan `useAsync` no miran nunca `error` (`features/campus/OtherCampusNotice.tsx:24`, `features/doubts/HolyGraph.tsx:198` (la salud: sin ella se pintan plazos sin pace sin avisar), `features/legal/LegalPage.tsx:14`, `features/clicker/CapitalHistory.tsx:59`, `features/profile/AskedCard.tsx:14` (a propósito, con comentario), `features/settings/Settings.tsx:29`).
- **Propuesta**: `shared/ui/Async.tsx`: `<Async state={useAsyncResult} empty={(data) => boolean} emptyText loadingText>{(data) => …}</Async>` que pinte `estado` cargando, `ErrorNote` con reintento y el vacío; o, menos invasivo, `renderAsync(state, { empty, children })`.
- **Beneficio**: los tres estados siempre iguales y visibles; los 6 fallos silenciosos salen a la luz.
- **Riesgo**: bajo. **Esfuerzo**: M (muchos sitios, cada uno trivial).

### D7. Lista de personas encontradas en tres sitios
- **Dónde**: `features/profile/PersonFinder.tsx:140-160`, `features/notices/PeerPicker.tsx:55-73` (jscpd 13 líneas) y `shared/ui/PersonInput.tsx:97-115`: mismo `<li>` con `Avatar 32/28` + `<strong>login</strong><small>name</small>` y `finder.none`.
- **Propuesta**: `shared/ui/PeopleResults.tsx` `({ people, onPick, active?, idPrefix?, size })` usado por los tres; PersonFinder y PeerPicker podrían ser el propio `PersonInput` con `onPick`.
- **Beneficio**: una sola lista con `role="listbox"` y teclado (hoy solo PersonInput lo tiene). **Riesgo**: bajo. **Esfuerzo**: S.

### D8. Ficha de persona: chips de proyectos y badges repetidos
- **Dónde**: `shared/ui/PersonLink.tsx:103-127` y `features/map/SeatHoverCard.tsx:100-116` (jscpd 9 líneas: `seat-projects` + `chip` + `map.noProjects`); ambas pintan Avatar + login + asiento + badges (`map.you`, círculo, guardia).
- **Propuesta**: `shared/ui/ProjectChips.tsx` `({ projects, emptyText })` y un `PersonCardBody` compartido que use `SeatHoverCard` para lo específico del mapa.
- **Beneficio**: la ficha al pasar el ratón es la misma en mapa y en el resto. **Riesgo**: bajo. **Esfuerzo**: S.

### D9. Cabecera del expediente duplicada entre el propio y el ajeno
- **Dónde**: `features/profile/Expediente.tsx:90-108` y `features/profile/PublicRecord.tsx:78-96` (jscpd 15 líneas: `record-head`, `record-name`, `level`, `xp-line` con `xp.max`/`xp.progress`).
- **Propuesta**: `features/profile/RecordHead.tsx` `({ login, image, title, level, xp, next, actions?: ReactNode, aside?: ReactNode })`.
- **Beneficio**: un cambio de diseño del expediente se hace una vez. **Riesgo**: nulo. **Esfuerzo**: S.

### D10. Cifras del panel: `Figure` existe pero no se usa en todas partes
- **Dónde**: `features/admin/Figure.tsx` (eyebrow + strong) se usa en admin; las tres cifras `seen/back/hidden` se montan igual en `ClickerPanel.tsx:111-137`, `:217-230` y `StatsPanel.tsx:133-141` (jscpd); mientras, `HelpStatsPage.tsx:82-93` usa un `<dl>` propio y `ExamStatsPanel.tsx` monta 9 `eyebrow` + `strong` a mano (líneas 239, 280, 297, 320, 352, 403, 433, 443, 472).
- **Propuesta**: mover `Figure` a `shared/ui/Stat.tsx` (`{ label, value, hint?, strong? }`) y un `UsageFigures({ totals })` en admin para las tres repetidas.
- **Beneficio**: mismas tarjetas de cifra en admin, estadísticas y exámenes. **Riesgo**: nulo. **Esfuerzo**: S.

### D11. Las tres «salas» (quiz, ajedrez, git) repiten carga, sondeo, barra y salida
- **Dónde**: `features/notgames/RoomView.tsx:50-118` vs `features/notgames/TurnRoomView.tsx:64-135` (jscpd 35 líneas: `load`/`take`/`setError`, efecto de sondeo, `room === null ? loading : ErrorNote`, `quiz-room-bar` con `back-btn` + `SoundToggle` + `leave`) y `features/gitcourse/GroupRoom.tsx:180-205`; además `RoomView.tsx:300-316` vs `TurnRoomView.tsx:455-468` (barra `quiz-timer` + `quiz-prompt` + `quiz-code`).
- **Propuesta**: `features/notgames/useRoom.ts` `useRoom<T extends { status }>(id, fetch: (id) => Promise<T>, onRoom?)` → `{ room, error, action, run, leave, reload }`; componentes `RoomBar` y `QuestionPrompt({ question, left, share })`.
- **Beneficio**: ~80 líneas menos y un solo sitio para la cadencia del sondeo. **Riesgo**: bajo. **Esfuerzo**: M.

### D12. Lista de personas de exámenes duplicada
- **Dónde**: `features/exams/ExamStatsPanel.tsx:516-527` y `features/exams/ExamsPage.tsx:245-257` (`exam-people` con Avatar 32 + `PersonLink className=""` + `exam-badges` + círculo).
- **Propuesta**: `features/exams/ExamPeople.tsx` `({ people, badges: (p) => ReactNode, rowClass? })`. **Esfuerzo**: S. **Riesgo**: nulo.

### D13. Selector de pace duplicado
- **Dónde**: `features/doubts/HolyGraph.tsx:789-804` y `features/profile/HealthCard.tsx:414-432` (jscpd 8 líneas: `<select>` sobre `PACES` con `pace.none` y `pace.option`).
- **Propuesta**: `features/profile/PaceSelect.tsx` `({ value, onChange, required?, label })` (o en `shared/ui` si el tablón no debe depender de profile; ver A1). **Esfuerzo**: S.

### D14. Query de la red construida tres veces en el cliente
- **Dónde**: `shared/api/client.ts:231-258` (`getNetwork`, `getNetworkPair`, `getNetworkStrictest`: mismos `if (params.from !== undefined) query.set(...)` para from/to/projectId/verdict/campuses).
- **Propuesta**: `function networkQuery(params: NetworkParams, extra: Record<string,string> = {}): URLSearchParams` en `client.ts`. **Esfuerzo**: S. **Riesgo**: nulo (el mock no cambia).

### D15. Pequeños clones restantes (jscpd)
- `features/admin/CheatsPanel.tsx:53-58` ≈ `features/admin/ClickerPanel.tsx:46-50` (el `pardon` con `window.confirm`), y `CheatsPanel.tsx:89-98` ≈ `:171-180` (la columna `seized` definida igual en `peopleColumns` y `logColumns`): extraer `const seizedColumn` y un `usePardon()`.
- `features/calendar/AgendaTour.tsx:103-108` ≈ `features/help/GuardTour.tsx:182-187`; `features/admin/FlowsPanel.tsx:83-95` ≈ `:288-300`; `features/admin/BroadcastsTab.tsx:160-169` ≈ `CheatsPanel.tsx:340-348`; `features/clicker/cards.ts` (datos del juego, 2 clones internos); `features/network/PersonPanel.tsx:49-55` ≈ `features/profile/NetworkCard.tsx:29-34` (cálculo `partners` a partir de `links`: candidato a `network/partnersOf(links, login)`).
- **Esfuerzo**: S cada uno. Son 27 clones en total con el umbral bajo (0,47 % de líneas), un nivel bajo.

---

## 2. Desacoplamiento

### A1. 37 imports entre funcionalidades y un ciclo
- **Dónde** (`grep "from '../<otra>/"` en `features/`):
  - `admin` → clicker (`ClickerPanel.tsx:10-11` CapitalChart, CapitalHistory), facility (`AdminPage.tsx:18`), focus (`FocusPanel.tsx:7-8`), notices (`CheatsPanel.tsx:12`), profile (`AdminPage.tsx:12` HoursReport)
  - `alerts` → admin (`Chat.tsx:9` ReportButton), calendar (`AlertCenter.tsx:12` EventDialog)
  - `calendar` → alerts (`EventDialog.tsx:6-7` eligible, EventRoom) ⇒ **ciclo alerts ↔ calendar**
  - `boards`, `doubts` → admin (`BoardCard.tsx:9`, `DoubtDetailCard.tsx:8` ReportButton)
  - `focus` → admin (`FocusMyStats.tsx:7` SegmentSlider)
  - `auth`, `staff` → settings (`Login.tsx:3-4`, `StaffPage.tsx:14-15` LangSelect, ThemeSelect); `staff` → facility; `welcome` → settings (DetailSelect)
  - `notices` → alerts (`Conversations.tsx:12-13` Chat, useThread); `therapy` → alerts (`GroupCard.tsx:11` Chat), map (`GroupCard.tsx:3`, `GroupForm.tsx:11-13` ClusterMapView, SeatPicker, seats)
  - `peers` → help (`PeerList.tsx:14` BookHelp), map (`PeerList.tsx:15` ProjectMap); `help` → peers (`Guardia.tsx:13` availability-events)
  - `profile` → help (`AskedCard.tsx:4` tags), network (`NetworkCard.tsx:5-6` Meter, VerdictStats), notices
  - `map`, `profile`, `admin` → `notices/conversations` (`openChat`: **permitido por AGENTS**); `map` → facility; `notgames` → gitcourse
- **Qué pasa**: hay módulos «compartidos de hecho» que viven en una funcionalidad: `admin/ReportButton` (3 consumidores), `admin/SegmentSlider`, `settings/{LangSelect,ThemeSelect,DetailSelect}`, `alerts/{Chat,useThread}`, `network/{Meter,VerdictStats}`, `map/seats`. El linter solo vigila fronteras en la API (`eslint.config.js:58-86`); en la web no hay regla.
- **Propuesta**: (1) mover a `shared/ui/`: `ReportButton`, `SegmentSlider`, `LangSelect`, `ThemeSelect`, `DetailSelect`; `Chat`+`useThread` a `shared/chat/`; `map/seats.ts` a `shared/seats.ts`; (2) romper el ciclo moviendo `eligible.ts`+`EventRoom` a `calendar` o `shared`; (3) regla `no-restricted-imports` para `apps/web/src/features/**`: de otra funcionalidad solo `index.ts`, con las excepciones documentadas (`notices/conversations`).
- **Beneficio**: cada funcionalidad se puede mover o borrar sin tirar de otras; el linter lo mantiene.
- **Riesgo**: bajo (solo rutas de import). **Esfuerzo**: M.

### A2. 29 componentes de más de 300 líneas; cinco de ellos son «todo en uno»
- **Dónde** (líneas): `clicker/CodeClicker.tsx` 1379, `network/ForceGraph.tsx` 1175, `network/NetworkPage.tsx` 918, `doubts/HolyGraph.tsx` 879, `notgames/TurnRoomView.tsx` 644, `profile/HealthCard.tsx` 584, `admin/AdminPage.tsx` 559, `exams/ExamStatsPanel.tsx` 536, `notgames/RoomView.tsx` 462, `notgames/NotGamesPage.tsx` 461, `admin/StatsPanel.tsx` 445, `map/ClusterMapView.tsx` 440, `therapy/GroupForm.tsx` 433, `admin/ClickerPanel.tsx` 419, `admin/FlowsPanel.tsx` 403, `notices/Conversations.tsx` 370, `calendar/CalendarPage.tsx` 367, `stats/ProgressCard.tsx` 354, `gitcourse/GroupRoom.tsx` 354, `clicker/scene.tsx` 352, `admin/CheatsPanel.tsx` 349, `doubts/GuidePanel.tsx` 334, `peers/PeerList.tsx` 325, `shared/layout/LayoutSettings.tsx` 323, `gitcourse/LevelView.tsx` 323, `clicker/art.tsx` 322, `shared/ui/Icon.tsx` 319 (legítimo: es el catálogo), `gitcourse/GitCourseTab.tsx` 318, `notices/Mailbox.tsx` 308.
- **Qué pasa**: `NetworkPage.tsx` es **una sola función** de 818 líneas con 11 `useState`, 4 `useEffect` y 10 formateos de fecha/número; `HolyGraph` igual (1 exportada, 8 `useState`); `CodeClicker` 18 `useState`, 9 `useEffect`, 18 `Date.now()`; `AdminPage` ya separa `ConsumptionTab/PeopleTab/MessagesTab` pero en el mismo fichero (323-559). Mezclan datos (api/useAsync), estado de filtros, formateo y pintado.
- **Propuesta**: `NetworkPage` → `useNetworkFilters()` (estado + `change`), `NetworkFilters.tsx` (los 4 selects y pastillas de 379-500), `NetworkBlocks.tsx` (los bloques de `<Blocks>`); `HolyGraph` → `useHolyGraphState()` + `GraphRing.tsx`; `AdminPage` → `PeopleTab.tsx`, `MessagesTab.tsx`; `TurnRoomView` → `ChessClocks.tsx`, `MoveList.tsx`; `CodeClicker` → `useClickerLoop()` (los intervalos de 431-580) y `ClickerBoard.tsx`.
- **Beneficio**: ficheros revisables y testeables por partes. **Riesgo**: medio (mucho estado compartido; hacerlo con los tests UI delante). **Esfuerzo**: L.

### A3. `ExamsPage` viaja en el bundle inicial por un import estático
- **Dónde**: `app/SectionView.tsx:1` `import { ExamsPage } from '../features/exams/ExamsPage'` (antes incluso del import de React, fuera de la lista de `lazy` de las líneas 16-55). Comprobado en `dist/assets/index-*.js` (303 kB, 90 kB gzip): contiene `ExamStatsPanel`.
- **Qué pasa**: contradice el comentario de 13-15 («solo la portada viaja con la web»): exámenes son 813 líneas de TSX que paga todo el mundo. Además, la portada hoy es Expediente (`HOME`), que **sí** es lazy, mientras `PeerList`/`ProjectSelect` (consulta) son estáticos.
- **Propuesta**: `const ExamsPage = lazy(...)` como las demás; valorar hacer estático `Expediente` (la portada real) y lazy `PeerList`.
- **Beneficio**: bundle inicial más pequeño y la portada sin segunda descarga. **Riesgo**: nulo. **Esfuerzo**: S.

### A4. `Clinic.tsx` concentra los estados de todas las ventanas flotantes
- **Dónde**: `app/Clinic.tsx:59-96` (`focusProject`, `campusVersion`, `customizing`, `welcoming`, `box`, `chat`, `focusOpen`) + `usePulse` + 4 gates + `Welcome` + `AlertCenter` + `LayoutSettings` + `Mailbox`/`Inbox` (282 líneas).
- **Propuesta**: `app/Overlays.tsx` con un `useReducer` de «qué ventana está abierta» (`'notices' | 'inbox' | 'customize' | 'welcome' | 'focus' | null`) y los `onOpenChat`/`onOpenCustomize`; `Clinic` queda con ruta, perfil y campus.
- **Beneficio**: ventanas mutuamente excluyentes por construcción; `Clinic` legible. **Riesgo**: bajo. **Esfuerzo**: M.

### A5. Dos sitios con su propio `saving` en vez de `useAction`
- **Dónde**: `features/settings/Settings.tsx:30-40` (`saving` + try/finally) y `features/peers/AvailabilityToggle.tsx:22` (`saving`, `notice`), frente a 48 ficheros que ya usan `useAction` (`shared/hooks/useAsync.ts:69-95`).
- **Propuesta**: usar `useAction` (`busy`, `error`) y `ErrorNote` en ambos. **Esfuerzo**: S. **Riesgo**: nulo.

### A6. Tipos duplicados frente a `contracts`: no hay problema relevante
- **Dónde**: 124 `type X = {` en `features/`; solo `features/map/SeatFace.tsx:6` repite `login: string` como prop. No encontré estructuras de respuesta copiadas de `@sanatorio/contracts`. Es un punto a favor (lo apunto para que quede verificado).

---

## 3. Usabilidad y accesibilidad

### U1. El menú de la cuenta no se maneja con flechas ni mueve el foco
- **Dónde**: `app/UserMenu.tsx:30-47` (solo `Escape` y clic fuera); `role="menu"`/`menuitem` en 67-85.
- **Qué pasa**: con `role="menu"` el lector de pantalla espera flechas, `Home`/`End` y foco en el primer elemento al abrir; hoy hay que tabular por los items y al cerrar el foco no vuelve al botón.
- **Propuesta**: `shared/hooks/useMenuKeys(ref, open)` (flechas, Home/End, foco al abrir, devolver foco al cerrar) reutilizable por `PersonFinder` y `Nav` si hace falta.
- **Beneficio**: menú usable con teclado y lector. **Riesgo**: nulo. **Esfuerzo**: S.

### U2. Pestañas con `role="tab"` sin teclado ni `aria-controls`
- **Dónde**: 9 `tablist` (`admin/AdminPage.tsx`, `admin/ClickerPanel.tsx:66`, `admin/InboxTab.tsx:34`, `admin/UsageTab.tsx:20`, `clicker/CodeClicker.tsx`, `focus/FocusDialog.tsx:88`, `gitcourse/LevelView.tsx:46`, `notgames/NotGamesPage.tsx:95`, `notices/Mailbox.tsx:128`); ningún `ArrowLeft`/`ArrowRight` en el código; `aria-controls` solo en 4 ficheros (`PersonInput`, `Expediente`, `RankCard`, `HealthCard`), ninguno de ellos una tablist; ningún `role="tabpanel"`.
- **Propuesta**: resolverlo una vez en `PillGroup kind="tabs"` (D1): flechas, `aria-controls`/`id`, `tabIndex` roving.
- **Beneficio**: patrón WAI-ARIA completo en las 9. **Esfuerzo**: incluido en D1.

### U3. Ventanas: foco inicial y cierre inconsistentes
- **Dónde**: 16 `<dialog>`; 0 `autoFocus`; clic en el fondo cierra solo en `shared/ui/InfoTip.tsx:60-63`; `onCancel` en 9 de 16 (faltan `Inbox`, `LayoutSettings`, `Bust`, `Mailbox`, `DataPanel`, `FocusDialog`, `InfoTip`, que se apoyan en `onClose`).
- **Qué pasa**: el foco cae en el primer control enfocable (el botón de cerrar en las de `layout-head`), no en el contenido; cerrar tocando fuera funciona en una y no en las demás.
- **Propuesta**: `Modal` (D5) con `initialFocus` opcional y fondo clicable por defecto salvo en las obligatorias. **Esfuerzo**: incluido en D5.

### U4. «Tú» en las clasificaciones solo por color
- **Dónde**: `features/profile/LeaderboardCard.tsx:67` marca con la clase `me` (`styles/help.css:155` fondo `--accent-soft`) sin texto; `features/stats/HelpStatsPage.tsx:110` sí añade el chip `stats.you`; `notgames.css:101` y `clicker.css:382` también solo con borde/fondo (`RoomView.tsx:231/403`, `CodeClicker.tsx:1215`).
- **Propuesta**: en `RankingList` (D2) pintar siempre el chip «tú» (clave `map.you`, ya existe) además del fondo. **Esfuerzo**: S. **Beneficio**: no depende del color (daltonismo, modo zen).

### U5. Confirmaciones destructivas con `window.confirm`
- **Dónde**: 11 sitios: `boards/BoardCard.tsx:116`, `boards/BoardForm.tsx:87`, `admin/InboxTab.tsx:153`, `admin/SanctionForm.tsx:23`, `admin/CheatsPanel.tsx:54`, `admin/ClickerPanel.tsx:47/52`, `therapy/GroupCard.tsx:260/277`, `therapy/GroupForm.tsx:230`, `clicker/CodeClicker.tsx:1128`.
- **Qué pasa**: funciona y es accesible, pero no sigue el tema, no se puede probar bien en jsdom sin mock de `confirm`, y el texto del botón («Aceptar/Cancelar») lo pone el navegador en su idioma.
- **Propuesta**: `shared/ui/useConfirm()` sobre `Modal` (D5) con `{ title, body, okText, danger }` → `Promise<boolean>`. **Beneficio**: coherencia y botón con verbo («Borrar la pizarra»). **Riesgo**: bajo. **Esfuerzo**: M.

### U6. Seis fallos de carga que no se enseñan a nadie
- **Dónde**: ver D6 (`OtherCampusNotice`, `HolyGraph` salud, `LegalPage`, `CapitalHistory`, `Settings` campus, `AskedCard` a propósito).
- **Qué pasa**: en `HolyGraph.tsx:198` si `getHealth` falla, el grafo sale sin pace ni plazos y parece que no los hay. En `LegalPage.tsx:14` el documento legal no aparece sin explicación.
- **Propuesta**: `ErrorNote` con reintento en los que importan (HolyGraph, LegalPage, Settings); comentario explícito «informativo, si falla no sale» en los otros, como ya hace `AskedCard.tsx:17`. **Esfuerzo**: S.

### U7. `InfoTip` con un párrafo en vez de demostración
- **Dónde**: `stats/ProgressCard.tsx:96`, `admin/UsageHeatmap.tsx:59`, `help/Guardia.tsx:110` (bloqueadas), `profile/AskedCard.tsx:26`, `profile/HoursReport.tsx:29`, `profile/LeaderboardCard.tsx:38`.
- **Qué pasa**: AGENTS exige «demo animada y sin más texto que el de la demo» para cada sección; estos son **bloques**, no secciones, así que es defendible, pero la regla no distingue. Las 12 secciones de `SECTIONS` con `inNav` sí tienen su `*Tour`.
- **Propuesta**: apuntar en `docs/demos.md` que un bloque puede llevar un párrafo (≤ 2 frases) o hacer mini-demos para los dos más visibles (clasificación, progreso). **Esfuerzo**: S (doc) / M (demos).

### U8. Pastillas y `<select>` para la misma clase de elección
- **Dónde**: tras el cambio de hoy, exámenes usa `<select>` para plan/familia/kickoffs (`exams/ExamsPage.tsx:216`, `exams/ExamStatsPanel.tsx:61-66` con `text={(value) => t(\`exams.plan.${value}\`)}`), igual que red (`NetworkPage.tsx:435-497`, 4 selects) y tablón (`HolyGraph.tsx:791`); calendario (`CalendarPage.tsx:181-230`), buzón (`Mailbox.tsx:128/169`), Pomodoro (`FocusStatsView.tsx:50`) y clasificaciones usan pastillas para 2-4 opciones. 43 `<select>` en total.
- **Qué pasa**: no hay criterio escrito; un `<select>` de 2 opciones (ExamsPage track) cuesta dos clics donde dos pastillas cuestan uno.
- **Propuesta**: regla en `docs/interfaz.md`: ≤ 4 opciones y espacio → `PillGroup`; más opciones o en formulario → `SelectField` (`shared/ui/SelectField.tsx` `{ label, value, options, text, onChange }`, que ya está medio hecho en `ExamStatsPanel.tsx:61`). **Esfuerzo**: S (regla) + M (aplicar).

### U9. Riesgos en móvil: tablas sin desplazamiento y anchos mínimos
- **Dónde**: `<table>` sin `.table-scroll` en `features/stats/ProgressCard.tsx` y `features/admin/UsageHeatmap.tsx` (los otros dos, `ExamStatsPanel` y `FocusStatsView`, sí lo llevan; `DataTable` siempre); `styles/calendar.css:398` `.timeline.week { min-width: 700px }` (requiere que el padre haga scroll horizontal; no lo he comprobado en pantalla); `styles/admin.css:266` `repeat(24, 1fr)` (mapa de calor por horas: 24 columnas en 360 px ≈ 15 px cada una); 19 breakpoints distintos (560 ×8, 760 ×5, 640, 520, 1000 ×3…, además 420, 460, 600, 700, 720, 800, 860, 900, 960, 980, 1320).
- **Propuesta**: envolver las dos tablas en `.table-scroll`; definir 3 breakpoints como variables documentadas (`--bp-phone 560`, `--bp-tablet 760`, `--bp-wide 1000`) y usar solo esos. **Esfuerzo**: S (tablas) / M (breakpoints).

### U10. Contraste de `--text-4` en texto
- **Dónde**: `styles/theme.css:30` `--text-4: #98a59f` sobre `--bg #f6f8f7` ≈ 2,4:1 (cálculo WCAG); se usa como **color de texto** en `base.css:201` (`.footer`), `base.css:336` (`.badge.subtle`), `admin.css` (4), `calendar.css`, `sections.css`, `layout.css`, `map.css`, `system.css:498`. `--text-3` (#66756e) queda en ≈ 4,5:1, justo en el límite AA.
- **Propuesta**: reservar `--text-4` para rayas/iconos decorativos y pasar los textos (pie, `badge.subtle`) a `--text-3`; o subir `--text-4` a ≈ #7f8d86 (≈ 3,3:1, suficiente para texto grande/secundario). Revisar lo mismo en los 6 temas de `themes/`. **Esfuerzo**: S. **Riesgo**: cambio visual leve.

### U11. Movimiento reducido: bien cubierto, pero por dos caminos
- **Dónde**: CSS: 12 bloques `@media (prefers-reduced-motion)`; JS: 6 `window.matchMedia('(prefers-reduced-motion: reduce)')` (`shared/tour/Tour.tsx:141`, `doubts/HolyGraph.tsx:67`, `doubts/DoubtBoard.tsx:48`, `clicker/EasterEgg.tsx:38`, `clicker/PillRain.tsx:22`, `network/ForceGraph.tsx:823`) además de `shared/still.ts` (quietud por inactividad) y `useMediaQuery`.
- **Propuesta**: `shared/motion.ts` con `prefersStill(): boolean` y `usePrefersStill()` (sobre `useMediaQuery`) y usarlo en los 6. **Beneficio**: una sola fuente, y que las demos (`Tour`) reaccionen si cambia la preferencia en caliente (hoy `useState` inicial). **Esfuerzo**: S.

---

## 4. Rendimiento

### R1. Bundle inicial de 303 kB (90 kB gzip) y una sola hoja de 185 kB
- **Dónde**: `dist/assets/index-*.js` 303 kB (incluye `ExamsPage`, A3), `dist/assets/index-*.css` 185 kB (las 23 hojas de `styles/` juntas: 12 901 líneas; `clicker.css` 2010 y `notgames.css` 1066 también se cargan para quien nunca abre esas secciones; solo hay otra hoja partida de 46 kB). Siguientes: `AdminPage` 72 kB, `NetworkPage` 55 kB, `CodeClicker` 43 kB, `DoubtBoard` 34 kB; `ca`/`eu` 90 kB cada uno (solo al elegirlos); textos `es` 71 kB.
- **Propuesta**: (1) lazy `ExamsPage`; (2) importar `clicker.css`, `notgames.css`, `network.css`, `doubt-graph.css`, `admin.css`, `map.css` desde su módulo de sección en vez de `styles/index.css` (Vite las parte por chunk; hay que respetar el orden de cascada: `system.css`/`skin.css`/`comfort.css` siguen globales y ganan por ir después). Quitaría ~6 000 líneas (~45 %) de la hoja inicial.
- **Beneficio**: primera pintura más rápida en móvil. **Riesgo**: medio (cascada): comprobar con los 6 temas. **Esfuerzo**: M.

### R2. Varios intervalos simultáneos que repintan componentes grandes
- **Dónde**: `notgames/RoomView.tsx:257` repinta `Question` cada 200 ms durante toda la pregunta; `TurnRoomView.tsx` tiene 3 `setInterval` (81, 333, 429) a la vez; `CodeClicker.tsx` 6 (431, 461, 476, 479, 530, 576); `AlertCenter.tsx:88-89` dos; `FocusTimer`, `FocusExit`, `DayTimeline`, `Welcome` uno cada uno. Con la sala de ajedrez abierta y el Pomodoro puesto hay 5-6 relojes independientes.
- **Propuesta**: `useNow` compartido (D3) con un intervalo por cadencia; en `Question` bajar a 1 s salvo los últimos 3 s (ya existe `ticking` para eso en `RoomView.tsx:273`).
- **Beneficio**: menos trabajo en segundo plano (encaja con la filosofía de `still.ts`). **Esfuerzo**: incluido en D3.

### R3. Claves por índice en listas que cambian
- **Dónde**: 30 `key={index}`; la mayoría en listas estáticas o decorativas (cabeceras de días, `aria-hidden`, SVG de `scene.tsx`), que están bien. A revisar las que reordenan o borran: `notgames/RoomView.tsx:417` (jugadores), `notgames/TurnRoomView.tsx:223` (jugadas), `gitcourse/GateView.tsx:196` (respuestas), `admin/StatsPanel.tsx:298`, `admin/ClickMap.tsx:84`, `exams/ExamStatsPanel.tsx:259`.
- **Propuesta**: clave por `login`/`id`/`ply` donde exista. **Esfuerzo**: S. **Riesgo**: nulo.

### R4. `Date.now()` en el cuerpo del render
- **Dónde**: `clicker/CodeClicker.tsx` (18 referencias), `TurnRoomView.tsx` (5), `RoomView.tsx` (3), `FocusTimer.tsx` (3), `ExamsPage.tsx` (3), más 7 ficheros con 2. Parte son dentro de efectos, pero las de render hacen el componente no determinista (cada render pinta distinto aunque no cambie nada) y complican los tests con reloj falso.
- **Propuesta**: tomar `now` de `useNow` (D3) y pasar el instante a las funciones puras (`remaining(iso, now)` como ya hace `ExamsPage.tsx:113`). **Esfuerzo**: S/M.

### R5. Lo que ya está bien (modelo)
- `ForceGraph.tsx` cumple AGENTS (canvas, todo lo que cambia por fotograma en refs, `ResizeObserver`, scroll `passive`). `Header.tsx:93-103` escucha `scroll` con `passive` y `setScrolled` solo cambia al cruzar 4 px (React descarta el mismo valor). `usePulse` se para con la pestaña oculta. `PersonLink` cachea fichas 30 s. `SectionView` carga 13 secciones con `lazy`. `useAsync` conserva los datos al recargar (sin parpadeo). No es hallazgo: es la referencia.

---

## 5. CSS

### C1. 320 colores fijos fuera de `theme.css`; unos 25 son semánticos y deberían ser variables
- **Dónde** (por fichero: clicker 117, notgames 52, doubt-graph 21, map 20, comfort 16, tour 15, sections 15, calendar 13, alerts 13, tweaks 11, system 11, styles 10, admin 9, base 7, network 6, profile 5, help 5, therapy 1, layout 1). Admitidos por AGENTS: paleta propia del clicker, códigos del mapa (`map.css:15-19`), tipos del calendario (`calendar.css:7-32`), daltonismo (`comfort.css`), post-its (`sections.css:344-387`, `alerts.css:156-188`), tableros de ajedrez (`notgames.css:316-337`).
  **No admitidos** (mismo significado, distinto hex, no cambian en nocturno):
  - Rojo/peligro: `admin.css:116,146,213` `#d9534f`; `network.css:555,691` `#d9534f`; `admin.css:237`, `alerts.css:255,362` `#e5484d`; `profile.css:34,157` `#c0392b`; `base.css:558` `#8f4a41` → `--danger`.
  - Verde/ok: `help.css:162`, `network.css:552,697` `#3fae74`; `alerts.css:218` `#2f8f5b`; `base.css:283,448` `#4a8f6a`; `base.css:345` `#6fbf8f`; `sections.css:251,410` `#2f7a55` → `--ok`.
  - Naranja/aviso: `alerts.css:74,221`, `admin.css:93` `#b3621a`; `help.css:66-72` `#d9822b`; `admin.css:195` `#e8952c` → `--warn`.
  - Blanco/negro fijos sobre acento: `alerts.css:118,256`, `admin.css:238,743-744`, `therapy.css:112`, `system.css:203,522,892`, `tour.css:100,256,277,451,530` → `--on-accent`/`--surface`.
  - Medallas/chips `system.css:572-581` (`#f1cf6b`, `#ced6d2`, `#e3ad84`) → añadir `--gold-soft`, `--silver`, `--bronze` al tema.
  - Tema «terminal» de repaso en `notgames.css:802-924` (`#1e1e24`, `#e6e6e6`, `#ff8a80`, `#7ee787`…): no cambia con el modo claro.
- **Propuesta**: sustituir los ~40 valores de arriba por variables; añadir al tema las 4 que faltan; dejar un comentario «fijo a propósito» en los admitidos (como hace `map.css`).
- **Beneficio**: nocturno y daltonismo coherentes (hoy `comfort.css` corrige `--danger` pero no estos). **Riesgo**: bajo. **Esfuerzo**: M.

### C2. 32 `!important`, la mitad son parches de especificidad
- **Dónde**: justificados: `comfort.css` (10: debe ganar a todo, y es la última), `sections.css:788-789`, `clicker.css:874` (`animation: none` en reduced-motion). Parches: `clicker.css:214-215, 285-286, 1146-1147, 1191-1192` (position/z-index), `clicker.css:565, 698` (border-radius), `clicker.css:1739, 1742` (color), `layout.css:16, 62, 234` (padding de `.block` que pisa `.card`), `system.css:237` (padding 0), `system.css:604`, `sections.css:419, 1429`.
- **Propuesta**: subir especificidad con el selector del contenedor (`.block .card { padding: … }`) o mover la regla detrás en `index.css`. **Esfuerzo**: S. **Riesgo**: visual leve; comprobar en los 6 temas.

### C3. `index.css`: el orden real no es el que dicen los comentarios
- **Dónde**: `styles/index.css:46-52`: el comentario «Comodidad… La última, para ganar a todo» va seguido de `notgames.css` y `stats.css`, y `comfort.css` llega después; `notgames.css` y `stats.css` van **detrás** de `system.css` («lo último, para que mande sobre lo de cada sección») y `skin.css`, así que sus reglas ganan a las del sistema visual, al contrario que las demás secciones.
- **Propuesta**: mover `notgames.css` y `stats.css` junto a las demás secciones (antes de `system.css`) y dejar el comentario de comodidad pegado a su import. Comprobar que nada de notgames dependía de ganar a `system.css`. **Esfuerzo**: S. **Riesgo**: bajo-medio (puede destapar reglas que hoy ganan por orden).

### C4. `sections.css` (1625 líneas) mezcla seis secciones y pisa a hojas que ya existen
- **Dónde**: `sections.css` contiene terapias, formularios, tablón, pizarras (`.cal-*` 467-535), expediente y pie, además de `.exams-subtitle` (1043); mientras tanto existen `therapy.css`, `profile.css`, `calendar.css` y `help.css` con partes de esas mismas secciones. `tweaks.css` (145 líneas) también agrupa cosas sin relación (eminencia, días de terapia, nocturno, etiqueta demo).
- **Propuesta**: repartir `sections.css` en `boards.css`, `doubts.css`, `forms.css`, `footer.css` y fundir lo de terapia/expediente en sus hojas; `tweaks.css` → cada retoque a su hoja (su razón de existir era el orden, que se resuelve con la posición en `index.css`). **Esfuerzo**: M. **Riesgo**: orden de cascada; hacerlo hoja a hoja con los tests de estilos (`tests/styles.test.ts`).

### C5. Clases sin uso: no se detectan
- **Dónde**: 867 clases extraídas de `styles/*.css` cotejadas contra todo el TSX/TS/HTML: solo 2 candidatas (`kind-event_joined`, `kind-event_open`), que se construyen como `kind-${event.kind}` (`features/calendar/EventChip.tsx`). Punto a favor; lo apunto para que no se repita el trabajo.

### C6. Variables de tema redefinidas localmente para componentes concretos
- **Dónde**: `sections.css:344-348` redefine `--text`, `--text-2`, `--text-3`, `--surface`, `--border` dentro del post-it (razonable: papel amarillo en los dos modos); `styles.css:43-57` define `--stage-*` y `--ring-*` con hex (escenario de la red). `network.css:921-924` usa `var(--stage-gave, #7ff3ee)` con fallback duplicado del valor.
- **Propuesta**: documentar en `theme.css` las «islas» que no siguen el modo (post-it, escenario) y quitar los fallbacks duplicados. **Esfuerzo**: S.

---

## 6. i18n

### I1. 198 claves construidas dinámicamente que la comprobación de textos no puede verificar
- **Dónde**: `grep "t(\`"` → 198 ocurrencias en ~65 ficheros. Las que dependen de **datos de la API** son las de riesgo: `stats/HelpStatsPage.tsx:80-117` (`stats.${section.id}.${total.key}`, `.rank`, `.value`, `.extra`), `admin/StatsPanel.tsx:103-104`, `admin/UsageHeatmap.tsx:47-52`, `admin/InboxTab.tsx:110` (`nav.${ticket.section}`), `notices/Mailbox.tsx:193-200` (`notices.kind.${notice.kind}`, `notices.go.${…}`), `notices/Conversations.tsx:75-240`, `alerts/Chat.tsx:44`, `calendar/EventChip.tsx:38`, `exams/ExamsPage.tsx:255-256`, `map/SeatHoverCard.tsx:101`, `profile/Achievements.tsx:40-43` (`ach.${entry.id}`), `profile/title.ts:14`, `facility/FacilityList.tsx:41`. Las de enumeraciones cerradas en el código (`nav.${id}`, `layout.${page}.${id}`, `exams.plan.${value}`) son seguras mientras la lista esté en TS.
- **Qué pasa**: si la API añade un `kind` nuevo, en pantalla sale la clave cruda (`i18n/index.tsx:116` devuelve la clave), y `npm run textos` no lo ve. `tests/ui/sections.test.tsx:44` detecta claves visibles solo en lo que se pinta con el mock.
- **Propuesta**: helper tipado `tk<K extends string>(prefix, value: K)` cuyo argumento sea una unión de `contracts` y un test `tests/i18n-enums.test.ts` que, para cada enum exportado de `packages/contracts` que se usa como sufijo (`NoticeKind`, `AgendaKind`, `ExamStatus`, `HelpTag`, `AchievementId`…), compruebe que existe `prefijo.valor` en `textos/*.csv`. **Beneficio**: el CSV y los contratos no se desincronizan. **Esfuerzo**: M.

### I2. Plurales a mano con cuatro convenciones
- **Dónde**: `doubts/CorrectionGraph.tsx:29` (`master1`/`master`), `doubts/HolyGraph.tsx:140,147,393` (`graph.one.*`/`graph.count.*`), `therapy/GroupForm.tsx:169` (`rowLong`/`rowsLong`), `profile/Expediente.tsx:157` (`gotOnce`/`gotTimes`), `shared/until.ts:31` (`.one`/`.many`).
- **Propuesta**: `tn(key, n, vars?)` en `shared/i18n` que elija `key.one`/`key.many` (vía `Intl.PluralRules(localeOf(lang))`, que para eu/ca/es/en devuelve `one`/`other`) y renombrar esas claves al sufijo único; `textos.ts` puede exigir que si existe `.one` exista `.many`. **Beneficio**: una regla, y preparado para idiomas con más formas. **Esfuerzo**: S.

### I3. Formato de números y fechas: sin locale en 28 sitios y opciones repetidas en 40
- **Dónde**: `toLocaleString()` **sin** locale (usa el del navegador, no el idioma elegido): 28 llamadas en `admin/QuotaCard.tsx:77-84`, `admin/FlowsPanel.tsx:115,188,254`, `admin/UsageHeatmap.tsx:147`, `admin/DataPanel.tsx:86,159,225,256`, `admin/AdminPage.tsx:151-217`, `admin/BudgetCard.tsx:81-86`, `network/NetworkPage.tsx:305-306`. Con locale pero repitiendo opciones: 32 `toLocale(Date|Time)String(localeOf(lang), {…})` (8 veces exactamente `{ hour: '2-digit', minute: '2-digit' }`: `ExamsPage:142`, `Conversations:71`, `Attendance:20`, `FocusScreen:67`, `GateView:35`, `Chat:77`, `FocusBadge:13`, `calendar/dates.ts:72`) y 9 `new Intl.*Format(localeOf(lang), …)` creados en cada render (`ExamStatsPanel:41,255,502`, `CheatsPanel:35,39`, `ClickerPanel:39,43`, `CapitalChart:56`, `ReviewGate:35`).
- **Propuesta**: `shared/i18n/useFormat.ts`: `useFormat()` → `{ number(n), compact(n), percent(x), time(iso), date(iso, 'short'|'medium'|'weekday'), dateTime(iso) }` memoizado por `lang`. Sustituir las 69 llamadas. **Beneficio**: el idioma elegido manda en todo; formateadores creados una vez. **Esfuerzo**: M. **Riesgo**: nulo.

### I4. Alias innecesario `locale = localeOf`
- **Dónde**: `features/calendar/dates.ts:68` `export const locale = localeOf`, usado en 7 sitios de calendario (`dates.ts:72-122`, `CalendarPage.tsx:122,262,322`, `DayTimeline.tsx:85`). **Propuesta**: importar `localeOf` directamente (o `useFormat`). **Esfuerzo**: S.

### I5. Huecos `{x}` sin sustituir pasan en silencio
- **Dónde**: `shared/i18n/index.tsx:120-123` deja `{nombre}` tal cual si falta la variable; `tests/i18n.test.ts:19` compara los huecos **entre idiomas**, pero no contra las llamadas `t('k', {…})`.
- **Propuesta**: en desarrollo (`import.meta.env.DEV`) `console.warn` si el resultado contiene `{\w+}`; `tests/ui/sections.test.tsx` ya espía `console.error`, bastaría añadir `warn` para que falle el test. **Esfuerzo**: S.

### I6. Textos en código: limpio
- **Dónde**: el grep de literales con tildes/palabras en JSX y en `title|placeholder|aria-label` no devuelve nada salvo `alerts/Attendance.tsx:147` `placeholder="ABCD"` (ejemplo de código, correcto) y la marca `Sanatorio <b>42</b>` (`Header.tsx:138`). Los textos del juego van por su propio CSV (`clicker/texts.ts`). Punto a favor.

---

## 7. Tests

### T1. Secciones con solo la prueba de humo
- **Dónde**: `tests/ui/sections.test.tsx` abre las 15 secciones (sin errores de consola ni claves sin traducir: muy buena red). Recorridos reales (`openApp`): expediente 7, notgames 4, estadísticas 3, gestión 2, exámenes 2, terapia/pizarras/guardia/consulta/clústeres/calendario 1. **Sin recorrido de interacción**: tablón (`features/doubts`: crear duda, guía, grafo, responder); red (`panels.test.tsx` solo comprueba que se pinta; sin filtros ni ficha de persona); clústeres (ídem; sin resaltar ni avisar de un puesto roto); buzón (abre y cambia pestaña; no lee un aviso ni responde en una conversación); terapia (abre/cierra el formulario; no crea grupo ni se apunta); ventanas obligatorias `HelpGate`, `BroadcastGate`, `ReviewGate` (`render.tsx:answerGates` las pulsa a ciegas; solo `LegalGate` tiene test propio); `Login` (`features/auth`), `Welcome` (solo se abre), `settings` (idioma sí en `flows.test.tsx:89`; tema, modo, daltonismo y campus no), `UserMenu` con teclado.
- **Propuesta** (orden por valor): tablón (crear duda → aparece en el grafo → responder), terapia (crear grupo con puesto → apuntarse → sale en calendario), buzón (aviso → ir a su sitio; conversación → enviar), gates (responder a una petición de ayuda y a un comunicado), red (filtro de periodo cambia totales; clic en nodo abre ficha). **Esfuerzo**: M cada uno (el harness `openApp`/`settle`/`must` ya lo hace fácil).

### T2. Consultas por texto frente a rol
- **Dónde**: 71 `*ByText` frente a 171 `*ByRole` en `tests/ui`; concentradas en `notgames.test.tsx` (15), `exams.test.tsx` (10), `modes.test.tsx` (7). Casos frágiles: `notgames.test.tsx:44` `findByText(/Pregunta 1 de/)` (español literal; rompe si cambia la redacción, y no pasa por `text(key)`); `exams.test.tsx:61-62` `getByText('Exam Rank 03 · 42next')` (depende de un separador de presentación). Bien: la mayoría usan el helper `text(key)`/`pattern(key)` sobre el CSV.
- **Propuesta**: regla en `docs/tests.md`: el texto solo por `text(key)`; para contar filas, `getAllByRole('listitem')` dentro de `within(list)`. Corregir `notgames.test.tsx:44`. **Esfuerzo**: S.

### T3. Sin tests de teclado ni de foco en ventanas y menú
- **Dónde**: ningún test pulsa `Escape`, flechas o `Tab` sobre `UserMenu`, los `tablist` ni los `<dialog>` (solo `person-input.test.tsx` prueba flechas en el combobox y `guard-slots.test.tsx:26` el teclado en las franjas).
- **Propuesta**: al hacer `PillGroup`/`Modal`/`useMenuKeys` (D1, D5, U1), un test por componente en `tests/ui/` con `userEvent.keyboard`. **Esfuerzo**: S cada uno.

### T4. Umbrales de cobertura bajos para la web
- **Dónde**: `vitest.config.ts:28` `lines 48, statements 48, functions 44, branches 78` («solo suben»). Las funciones puras tienen 36 ficheros de tests en `tests/`; lo que baja la media son las secciones de T1.
- **Propuesta**: cada recorrido nuevo de T1 sube `lines` 2-3 puntos; fijar el objetivo 60/60/55/80 para la siguiente tanda. **Esfuerzo**: incluido en T1.

---

## Los 10 mejores refactors por beneficio/esfuerzo

1. **`PillGroup`** (D1 + U2 + U8): 37 copias → 1 componente accesible con pestañas por teclado. M.
2. **`useNow` + `shared/time.ts`** (D3 + R2 + R4): 3 hooks + 7 intervalos + 11 formateos → 1 hook con un solo intervalo. S/M.
3. **`usePolling`** (D4): 10 copias, dos de ellas sin parar en segundo plano. S.
4. **Lazy `ExamsPage`** (A3 + R1): una línea; quita ~800 líneas de TSX del bundle inicial. S.
5. **`useFormat()`** (I3 + I4): 28 números sin locale y 40 formateos repetidos → el idioma elegido manda. M.
6. **`RankingList` + `withMe`** (D2 + U4): 2 copias idénticas y 3 variantes → una fila de clasificación con «tú» en texto. S.
7. **`Modal` + `useConfirm`** (D5 + U3 + U5): 16 ventanas con el mismo armazón, 11 `window.confirm`. M.
8. **Mover los compartidos de hecho a `shared/` + regla eslint** (A1): ReportButton, SegmentSlider, LangSelect/ThemeSelect/DetailSelect, Chat/useThread, seats; romper alerts↔calendar. M.
9. **Colores semánticos a variables** (C1): ~40 hex de rojo/verde/naranja/blanco → `--danger/--ok/--warn/--on-accent`, + `--silver/--bronze`. M.
10. **`Async` / `ErrorNote` en los 6 silenciosos + `tn()` plural** (D6 + U6 + I2): estados visibles y plurales con una sola regla. S/M.

## Componentes y patrones ya bien hechos (modelo a seguir)

- `shared/hooks/useAsync.ts`: tres estados, descarta respuestas viejas por turno, conserva datos al recargar; `useAction` para acciones. Comentarios del porqué.
- `shared/ui/ErrorNote.tsx` + `errorText`: un solo aviso de error con reintento, usado en 79 ficheros.
- `shared/ui/PersonLink.tsx` + `Avatar.tsx` + `FocusBadge.tsx`: la persona siempre igual en toda la web, con ficha al pasar el ratón y caché de 30 s.
- `shared/ui/PersonInput.tsx` + `usePeopleSearch.ts`: combobox completo (roles, `aria-activedescendant`, flechas, Enter, debounce, respuestas tardías descartadas).
- `shared/ui/DataTable.tsx` + `shared/table-sort.ts`: tabla ordenable por varias columnas con `aria-sort`, cabecera `<th scope>`, orden recordado; lógica pura testeada.
- `shared/ui/InfoTip.tsx` + `shared/tour/Tour.tsx` + `defineTour`: ayuda como demostración, con lista en movimiento reducido y test que valida las demos.
- `shared/layout/{Blocks,registry,store}`: bloques ordenables/plegables declarados en un sitio, con uso contado.
- `shared/detail.tsx` (`Show from`) y `app/sections.ts` (`SECTIONS`/`CATEGORIES` tipados con `satisfies`): los modos y la navegación salen de datos, no de `if`s.
- `shared/links.ts` + `decodePart`: direcciones en un sitio y a prueba de `%` sueltos.
- `shared/hooks/usePulse.ts`, `shared/still.ts`, `shared/hooks/useGateQueue.ts`: fondo y quietud centralizados; las ventanas obligatorias comparten la cola.
- `features/network/ForceGraph.tsx`: canvas con todo lo que cambia por fotograma en refs, `ResizeObserver` y scroll pasivo.
- `features/admin/RangePills.tsx`, `features/admin/Figure.tsx`, `shared/ui/ProjectPills.tsx`: ya son el germen de `PillGroup` y `Stat`.
- `tests/ui/render.tsx` (`openApp`, `settle`, `answerGates`) + `sections.test.tsx` (ninguna sección rompe, ninguna clave sin traducir a la vista) + `tests/i18n.test.ts` (huecos iguales en los 4 idiomas): un arnés que hace barato añadir recorridos.
- Sin textos en código, sin CSS muerto, `knip` limpio, 73 tests UI en verde.
