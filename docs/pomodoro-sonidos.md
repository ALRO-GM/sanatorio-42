# Sonidos del Pomodoro

Pedido por Alberto el 2026-10-27: un selector de sonido de fondo en el Pomodoro
con tres tipos (ruido, naturaleza, lo-fi). Se ven los tres; al elegir uno se
queda resaltado con lo que suena y los otros dos se encogen; volver a pulsarlo
pasa a la siguiente opción de ese tipo. El altavoz tachado lo apaga, y se apaga
solo al acabar la concentración.

- Código: `apps/web/src/features/focus/ambience.ts` (motor),
  `FocusSound.tsx` (botones), `ambience-tracks.ts` (lista lo-fi).
- **Ruido** blanco, rosa (filtro de Paul Kellet) y marrón: se genera en el
  navegador, 12 s con el último segundo fundido sobre el principio, sin costura.
- **Naturaleza y lo-fi**: ficheros en `apps/web/public/sounds/focus/`. Suenan
  con dos reproductores que se turnan: 6 s antes del final empieza el otro desde
  el principio y se cruzan los volúmenes. Cambiar de sonido funde en 1,5 s.
- Formato: AAC-LC en `.m4a` (lo reproducen todos los navegadores, también
  Safari), estéreo a 44,1 kHz, 128 kbps: para lo-fi y ambiente es casi
  indistinguible del original y ocupa ~1 MB por minuto. Volumen igualado a
  -18 LUFS (`loudnorm`). El océano se recorta a 5 min.

## Con el móvil bloqueado

Había microcortes con la pantalla bloqueada o la página en segundo plano
(2026-10-27). Por qué y cómo se arregló:

- Búferes pequeños: el contexto de audio iba con la latencia de fábrica
  (`interactive`, para juegos). Al bajar el sistema la prioridad de la página,
  el audio no llegaba a tiempo. Ahora `latencyHint: 'playback'`.
- Temporizadores frenados: el fundido entre vueltas lo lanzaba un `setInterval`,
  que en segundo plano se retrasa (hasta una vez por minuto). Ahora lo lanza el
  `timeupdate` del propio audio, y `ended` por si llega tarde.
- Media Session: título en la pantalla de bloqueo, pausa y seguir; al volver a
  la página se reanuda si el sistema lo había parado (iOS lo hace al bloquear).

## Licencias

Todo es CC0 o dominio público: no hace falta atribución (se cita igualmente).

| Fichero | Título | Autor | Licencia | Origen |
|---|---|---|---|---|
| `rain.m4a` | Rain (Ambient, Not Loopable), versión larga | Ove Melaa | CC0 | https://opengameart.org/content/rain-ambient-not-loopable-2-versions-available |
| `ocean.m4a` | Ocean Waves on a Tropical Beach | Jarrod Stanley / J.D. Savanyu | CC0 | https://commons.wikimedia.org/wiki/File:Ocean_Waves_on_a_Tropical_Beach.ogg |
| `storm.m4a` | Thunderstorm after hot summer day, 01 of 04 | stephan | Dominio público | https://commons.wikimedia.org/wiki/File:Thunderstorm_after_hot_summer_day_17_minutes_01_of_04.ogg |
| `lofi-01.m4a` … `lofi-10.m4a` | Into The Mist, Color Of A Soul, Break From Reality, Dreamshifter, Calm Currents, The Best Of Times, Ocean Breeze, Summer Break, Walking Away, Shimmer | HoliznaCC0 | CC0 1.0 | https://freemusicarchive.org/music/holiznacc0/public-domain-lofi/ |

El orden lo-fi (de más suave a más intensa) salió de medir volumen, ataques y
agudos y de las etiquetas del autor; no se ha escuchado una a una.
