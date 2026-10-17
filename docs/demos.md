# Demostraciones animadas

Cada sección explica cómo se usa con una demostración, no con párrafos de
ayuda: el botón (i) junto al título abre un decorado en miniatura por el que un
ratón de mentira hace lo que haría una persona, con una frase corta por acción.

## Criterios (todas las demostraciones los cumplen)

1. **Una sola idea por paso**: cada acción del ratón lleva su frase, de **70
   caracteres como mucho**, en segunda persona y con verbo («Elige una sala: ves
   quién se sienta dónde.»).
2. **20 segundos de guion como mucho**. El motor lo estira un 50 % para quien
   la ve por primera vez, y cada cual puede acelerarla o frenarla (la API
   aprende la velocidad media y la ajusta, `tours.service.ts`).
3. **Lo que se ve es lo que hay**: las etiquetas salen de las mismas claves que
   la web (`t('map.reportBroken')`), no se inventan. Los logins son inventados.
4. **El ratón solo señala cosas que existen** en la escena en ese momento.
5. **Entre escenas, fundido** (`cut`); dentro de una escena, los cambios con
   `tour-in` para que aparezcan suaves.
6. **Sin movimiento para quien no lo quiere**: con «reducir movimiento» del
   sistema se ven los mismos pasos como lista. Salen solos del guion.
7. **Es un decorado**: nada es un control de verdad ni llama a la API.

Los criterios 1, 2, 4 y 6, que las frases existan en los cuatro idiomas y que
el ratón acabe suelto y la pantalla sin fundido los comprueban
`apps/web/tests/tours.test.ts` y `apps/web/tests/ui/tours.test.tsx`, que
encuentran solas todas las demostraciones.

## Anatomía

Un fichero `src/features/<carpeta>/<Nombre>Tour.tsx` con tres partes:

```tsx
// 1. Lo que cambia en el decorado.
type Clusters = { room: number; open: boolean }
const START: Clusters = { room: 0, open: false }

// 2. El guion: a los N ms, cambia esto. `caption` es el número de la frase
//    (`tour.clusters.N` en la tabla `demos`).
export const TOUR = defineTour<Clusters>('clusters', START, [
  ...click<Clusters>(1000, 'room1', { room: 1 }), // va, pulsa y cambia
  [2400, { caption: 2 }],                         // siguiente frase
  ...cut<Clusters>(5000, { scene: 1, caption: 3, cursor: 'rest' }),
])

// 3. La escena, pintada según cómo va todo (`shot`).
export function ClustersTour() {
  const { t } = useI18n()
  return (
    <Tour tour={TOUR} tab={() => t('nav.clusters')}>
      {(shot) => <span data-tour="room1" className="tour-pill">…</span>}
    </Tour>
  )
}
```

Ayudas del guion (`shared/tour/Tour.tsx`):

| Ayuda | Qué hace |
| --- | --- |
| `click(at, destino, cambio)` | El ratón va al `data-tour` del destino, aprieta, aplica el cambio y suelta |
| `cut(at, cambio)` | Fundido a negro, cambio (normalmente `scene`) y vuelta |
| `typing(at, campo, letras)` | Escribe letra a letra: el campo cuenta cuántas van |
| `[at, { caption: n }]` | Cambia la frase |
| `cursor: 'rest'` | Deja el ratón en reposo, abajo a la derecha |

Props de `<Tour>`: `tour` (de `defineTour`), `tab` (la pestaña que se ve en la
barra de mentira) y `bell` (avisos sin leer en la campana, si hace falta).

## Piezas del decorado

Clases de `styles/tour.css`, que ya se ven bien en todos los estilos y temas:

| Clase | Para |
| --- | --- |
| `tour-row` | Una fila de cosas |
| `tour-card` | Una tarjeta |
| `tour-split` | Dos columnas |
| `tour-pill` (`.on`) | Pastilla o filtro (encendido) |
| `tour-button` | Botón principal |
| `tour-item` (`.on`) | Una fila de lista |
| `tour-avatar` (`--hue`) | Foto de mentira con inicial |
| `tour-muted` | Texto secundario |
| `tour-seats` / `tour-seat` (`.on`, `.busy`, `.glow`, `.broken`) | Puestos del mapa |
| `tour-pop`, `tour-side`, `tour-box` | Ventanita flotante, lateral o de buzón |
| `tour-notice`, `tour-chip`, `tour-code`, `tour-switch`, `tour-input`, `tour-select`, `tour-menu`, `tour-check` | Avisos, etiquetas, códigos y controles |
| `tour-in` | Aparece con un fundido corto |

Si hace falta una pieza nueva, va en `styles/tour.css` con las variables del
tema (nunca un color suelto) y se apunta en esta tabla.

## Añadir una demostración

1. `npm run demo:new -- <nombre> <carpeta> [sección]`, por ejemplo
   `npm run demo:new -- clusters map clusters`. Crea el fichero desde la
   plantilla (`apps/web/tools/plantillas/demo.tsx.txt`) y sus tres primeras
   frases en la tabla `demos`.
2. Dibuja el decorado y escribe el guion siguiendo los criterios.
3. Escribe las frases en la tabla `demos` (español e inglés como mínimo, con su
   contexto) y `npm run textos -- --write`.
4. Ponla junto al título de la sección:

   ```tsx
   <h2>
     {t('clusters.title')}
     <InfoTip title={t('clusters.title')}>
       <ClustersTour />
     </InfoTip>
   </h2>
   ```

5. `npm run check`. Mírala entera en `npm run dev:mock` en claro, en oscuro y en
   el móvil.

## Las que hay

| Demostración | Sección | Pasos |
| --- | --- | --- |
| `waiting` | Sala de espera | Elegir proyecto, ver quién está de guardia, reservar, ponerse de guardia |
| `guard` | Guardia | Marcar medias horas, tope, preevaluar, aceptar una reserva, aviso |
| `board` | Tablón | Elegir proyecto en el grafo, preguntar, marcar la respuesta |
| `therapy` | Terapia | Unirse, abrir un grupo con puestos y días |
| `boards` | Pizarras | Apuntarse, proponer, códigos de asistencia |
| `agenda` | Calendario | Tipos, detalle de un evento, responder al aviso |
| `network` | Red | Burbujas, ficha, buscar, escala de color |
| `clusters` | Clústeres | Sala, resaltar tu proyecto, ficha de un puesto, avisar de una avería |
| `record` | Expediente | Nivel, XP, estado de salud |
| `mailbox` | Buzón | Avisos sin leer y a dónde llevan |
| `inbox` | Incidencias | Escribir y recibir respuesta |
| `helpStats` | Estadísticas | Periodo, cifras de una sección, clasificación con fotos, tu fila, ir a un expediente |
| `notGames` | Not-games | Elegir modo, contestar, ver la buena y por qué, marcador con vidas |

Falta la de Exámenes.
