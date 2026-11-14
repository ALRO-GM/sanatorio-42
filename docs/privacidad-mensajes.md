# Mensajes: qué exige la ley y qué hace Peer4U

Pedido en el buzón (#113, 2026-11): «problemas legales con los mensajes:
revisar cómo guardarlos cifrados, investigar qué exige la ley». Esto es el
resultado de la revisión (2026-11-14). No es asesoría jurídica: es lo que dice
el texto de las normas aplicado a lo que hace hoy el código. Alberto decidió
el mismo día cifrar lo privado: hechos los puntos 1 y 3 del plan (copias y
campos de la base, [cifrado.md](cifrado.md)); el 2 (plazo) no se hace: Alberto decidió no borrar mensajes viejos.

## Qué se guarda

Los mensajes de los chats de eventos, sprints y pizarras y los de las
conversaciones (`event_messages`, migración 15; las conversaciones directas
usan la misma tabla con su id, migración 34), además de las dudas, respuestas y
guías del tablón. Van en claro en la base SQLite del servidor, que está en un
volumen de Docker en la máquina de Oracle (Madrid). Nada se borra solo por
viejo (decisión de 2026-10-12, en `historico-retiradas.md`); quien administra
puede borrar a mano en Gestión › Limpiar datos.

## Qué exige la ley

- **RGPD, art. 32** (seguridad del tratamiento): «medidas técnicas y
  organizativas apropiadas para garantizar un nivel de seguridad adecuado al
  riesgo». Cita el cifrado como ejemplo («entre otros, si procede»), **no como
  obligación**. Lo que se exige es proporcionalidad: valorar el riesgo (qué
  datos, cuánta gente, qué pasaría si se filtran) y poner medidas acordes.
- **RGPD, art. 5.1.f** (integridad y confidencialidad) y **art. 25**
  (protección de datos desde el diseño): el mismo principio, sin técnica
  concreta.
- **RGPD, art. 34.3.a**: si hay una brecha y los datos estaban cifrados de
  forma que quien los tenga no pueda leerlos, no hace falta avisar una por una
  a las personas afectadas (a la AEPD, sí, en 72 horas, art. 33). Es la razón
  práctica más fuerte para cifrar: abarata una filtración.
- **RGPD, art. 5.1.e** (limitación del plazo de conservación): los datos se
  guardan solo el tiempo necesario para su fin. Hoy los mensajes no tienen
  plazo. Para la XP y las horas hay un motivo (reconstruir el historial); para
  el texto de un chat de una pizarra de hace un año, menos.
- **LOPDGDD** (Ley Orgánica 3/2018): adapta el RGPD y no añade ninguna
  obligación de cifrado para una web privada como esta. El Esquema Nacional de
  Seguridad (que sí concreta medidas) es solo para el sector público y sus
  proveedores.
- **Secreto de las comunicaciones** (art. 18.3 de la Constitución): protege
  frente a quien intercepta, no frente al servicio que la gente usa a
  sabiendas. Que quien administra pueda leer un chat si hay una denuncia o para
  moderar está dicho en el texto legal (apartado «Quién lo ve») y se acepta al
  entrar; eso es lo que la ley pide: que se sepa.

Conclusión: **la ley no obliga a cifrar los mensajes en reposo**. Obliga a una
seguridad proporcionada al riesgo, a decir quién los lee y a no guardarlos más
de lo necesario. Con lo que ya hay (abajo), la parte de seguridad se sostiene;
los dos puntos flojos son las copias fuera del servidor y el plazo.

## Qué hace hoy Peer4U

- Conexión cifrada (HTTPS con HSTS); la base no está abierta a internet (solo
  la app le habla, dentro de Docker); el panel de administración pide segundo
  factor (`revision-seguridad.md`).
- Los volúmenes de Oracle Cloud (arranque y bloque) van cifrados en reposo por
  defecto (AES-256, claves de Oracle): quien se llevara el disco físico no lo
  leería. Conviene confirmarlo en la consola (Block Volume › cifrado).
- Descarga de todo lo propio (`GET /me/export`) y anonimización de la cuenta
  (`POST /me/anonymize`): el login pasa a `anon-…` en todas las tablas de la
  app, también en los mensajes; el texto de cada mensaje se queda, para que
  las conversaciones de los demás sigan teniendo sentido (`docs/contexto.md`,
  «Datos personales»).
- Texto legal: dice qué se guarda (mensajes incluidos), quién los ve y que
  quien administra puede leerlos con una denuncia; el chat lo recuerda
  (`meet.chatNotice`).
- Copias: cada día en el servidor (`infra/backups/`, comprimidas, sin cifrar) y
  en el ordenador de Alberto (`pull-backups.sh`, carpeta solo legible por él,
  sin cifrar). **Es el sitio por donde más fácil se escaparían los mensajes**:
  un portátil perdido con 30 copias de la base.

## Plan propuesto (1 y 3 hechos el 2026-11-14; el 2, descartado por Alberto)

De más barato y útil a menos:

1. **Cifrar las copias que salen del servidor.** `pull-backups.sh` las guarda
   cifradas con `age` (clave pública en el servidor o en el script; la privada,
   solo en el ordenador de Alberto y en un sitio aparte), o confirmar que el
   disco del portátil va cifrado (LUKS/FileVault). Una tarde de trabajo, sin
   tocar la app ni la base.
2. **Poner plazo a los mensajes.** Por ejemplo, los chats de eventos y
   pizarras a los 12 meses del evento, y las conversaciones a los 12 meses del
   último mensaje, salvo los que tengan una denuncia abierta. Ya se quitó un
   borrado automático (a los 90 días) el 2026-10-12; volver a ponerlo es una
   decisión de producto. Sería un trabajo periódico en `jobs` de `meet` (se
   para con el corte de los límites) y una línea en el texto legal.
3. **Cifrar el cuerpo de los mensajes en la base** (opcional). AES-256-GCM con
   `node:crypto`, clave `MESSAGES_KEY` en `infra/.env` (fuera de la base y de
   las copias), cada texto guardado como `v1:<iv>:<datos>:<etiqueta>` para poder
   cambiar de clave. Se leería y escribiría solo dentro del módulo `meet`
   (`meet.service.ts` y `conversations.ts`, que también lee el último mensaje
   de cada conversación; la moderación sigue funcionando: el servidor descifra), con una migración
   de datos que cifra lo que ya hay y tests de las cinco familias. Protege las
   copias y el fichero de la base, **no** un servidor comprometido (la clave
   está en la misma máquina). Un par de días, y una clave más que guardar: si
   se pierde, se pierden los mensajes.

Lo que **no** se propone: cifrado de extremo a extremo. Impediría moderar y
atender denuncias, que es lo que el texto legal promete, y obligaría a
gestionar claves en cada navegador. Desproporcionado para chats de un campus.

Si se hace la 1 o la 3, el apartado «Seguridad» del texto legal
(`legal.doc.sections.10.*` en `textos/legal.csv`) lo cuenta, y la versión del
texto sube para que se vuelva a aceptar.
