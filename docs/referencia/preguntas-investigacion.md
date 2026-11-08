# Preguntas con malas coherentes y modelo para explicar: investigación

Fecha: 2026-11-08. Documento de referencia para el banco de preguntas de
Not-games ([preguntas.md](../preguntas.md)) y los cursos
([plantilla-cursos.md](../plantilla-cursos.md)). De aquí salen
[plantilla-preguntas.md](../plantilla-preguntas.md),
[plantilla-explicacion.md](../plantilla-explicacion.md) y el subagente
`didacta` (`.claude/agents/didacta.md`).

Cómo se ha comprobado: cada artículo citado tiene su DOI comprobado en
Crossref (título, revista y año) el día de la fecha. De la mayoría se ha
leído el resumen y fuentes que lo citan, no el texto entero; lo que se dice
de cada uno se limita a lo que esas fuentes confirman. Lo que es opinión de
practicantes o de apps va marcado como tal.

## 1. Cómo se escribe una pregunta de opción múltiple

### 1.1 La taxonomía de Haladyna, Downing y Rodriguez (2002)

Haladyna, T. M., Downing, S. M. y Rodriguez, M. C. (2002). *A Review of
Multiple-Choice Item-Writing Guidelines for Classroom Assessment*. Applied
Measurement in Education, 15(3), 309–333.
<https://doi.org/10.1207/S15324818AME1503_5>. Lista de las 31 pautas:
<https://bookdown.org/stefanmosjos/manualesitems/_book/haladyna-2002.html>.

Es la referencia más citada: revisa libros de texto y estudios y deja 31
pautas en cuatro grupos (contenido, formato, estilo y redacción de enunciado y
opciones). Las que más nos importan:

- **Contenido**: una pregunta, un contenido y una sola operación mental (1);
  contenido importante, nada trivial (2); material nuevo (con otras palabras
  que las del libro) para medir algo más que recuerdo literal (3); nada de
  preguntas trampa (7) ni de opinión (6).
- **Enunciado**: la idea central va en el enunciado, no en las opciones (15);
  sin paja (16); **en positivo; si se usa NO o EXCEPTO, con cuidado y
  siempre en mayúsculas y negrita** (17).
- **Opciones**: tantas eficaces como se pueda, pero tres bastan (18); una
  sola buena (19); la buena cambia de sitio (20); orden lógico o numérico
  (21); que no se solapen (22); **homogéneas en contenido y en gramática**
  (23); **de longitud parecida** (24); «ninguna de las anteriores», con
  cuidado (25); **nunca «todas las anteriores»** (26); opciones en positivo
  (27); **sin pistas**: absolutos («siempre», «nunca»), palabras repetidas del
  enunciado solo en la buena, discordancias gramaticales, buena llamativa,
  parejas que se delatan y opciones absurdas (28); **todas las malas
  plausibles** (29) y **sacadas de los errores típicos de quien aprende**
  (30).

### 1.2 Cuántas opciones: Rodriguez (2005)

Rodriguez, M. C. (2005). *Three Options Are Optimal for Multiple-Choice
Items: A Meta-Analysis of 80 Years of Research*. Educational Measurement:
Issues and Practice, 24(2), 3–13.
<https://doi.org/10.1111/j.1745-3992.2005.00006.x>. Resumen divulgativo:
<https://u.osu.edu/cvmofficeofteachingandlearning/2018/02/02/how-many-options-should-a-multiple-choice-question-have-maybe-just-3/>.

Metaanálisis: pasar de cuatro o cinco opciones a tres apenas cambia la
dificultad, la discriminación ni la fiabilidad, porque la cuarta y la quinta
suelen ser malas que nadie elige. Lo que importa es la **calidad** de las
malas, no su número. Para Not-games (cuatro opciones, `OPTIONS = 4` en
`quiz.rules.ts`) la consecuencia es: mejor tres malas buenas que rellenar con
una absurda; si un concepto no da para tres malas plausibles en una forma, esa
forma no se escribe.

### 1.3 La guía del NBME y Case y Swanson

NBME, *Item-Writing Guide* (6.ª edición; antes *Constructing Written Test
Questions for the Basic and Clinical Sciences*, de Case y Swanson):
<https://www.nbme.org/educators/item-writing-guide>. Copia de una edición
anterior: <https://health.uconn.edu/faculty-development/wp-content/uploads/sites/69/2017/06/constructing_written_test_questions.pdf>.

Aporta dos ideas prácticas que usamos tal cual:

- **La regla de tapar las opciones** (*cover-the-options*): con las opciones
  tapadas, quien sabe el tema tiene que poder contestar. Si no, el enunciado
  no está enfocado.
- **Dos familias de fallos técnicos**: los que ayudan a quien sabe hacer
  exámenes sin saber el tema (*testwiseness*: la buena más larga o más
  matizada, absolutos en las malas, palabras del enunciado repetidas en la
  buena, gramática que solo casa con una) y los que añaden **dificultad que
  no tiene que ver con el tema** (enunciados largos, opciones enrevesadas,
  vaguedades como «a menudo», «ninguna de las anteriores», negaciones).

### 1.4 Malas que nacen de errores reales

- Hestenes, D., Wells, M. y Swackhamer, G. (1992). *Force Concept
  Inventory*. The Physics Teacher, 30(3), 141–158.
  <https://doi.org/10.1119/1.2343497>. El inventario obliga a elegir entre el
  concepto newtoniano y la alternativa de «sentido común»: cada mala es una
  concepción errónea documentada con alumnado real (agrupadas en una
  taxonomía de errores).
- Sadler, P. M. (1998). *Psychometric Models of Student Conceptions in
  Science*. Journal of Research in Science Teaching, 35, 265–296.
  PDF: <https://users.nber.org/~sewp/events/2004.05.28/Sadler_PsychometricModels.pdf>.
  Malas «muy atractivas» sacadas de entrevistas: así la pregunta no solo dice
  si aciertas, sino **qué modelo mental tienes** cuando fallas.
- Qian, Y. y Lehman, J. (2017). *Students' Misconceptions and Other
  Difficulties in Introductory Programming: A Literature Review*. ACM
  Transactions on Computing Education, 18(1).
  <https://doi.org/10.1145/3077618>. Clasifica los errores de quien aprende a
  programar en **sintácticos, conceptuales y estratégicos**: una buena guía
  para buscar malas en shell, git, Docker y Kubernetes.
- Gierl, M. J., Bulut, O., Guo, Q. y Zhang, X. (2017). *Developing,
  Analyzing, and Using Distractors for Multiple-Choice Tests in Education: A
  Comprehensive Review*. Review of Educational Research, 87(6), 1082–1116.
  <https://doi.org/10.3102/0034654317726529>. Revisión de cómo se escriben,
  se analizan (qué mala elige quién) y se usan las malas; insiste en que
  escribirlas es lo más caro de una pregunta.
- Alhazmi, E. et al. (2024). *Distractor Generation in Multiple-Choice Tasks:
  A Survey of Methods, Datasets, and Evaluation*. EMNLP 2024.
  <https://doi.org/10.18653/v1/2024.emnlp-main.799>. Estado de la generación
  automática de malas (reglas, similitud, modelos de lenguaje). Útil como
  aviso: lo generado por similitud tiende a dar malas que **también son
  ciertas** o absurdas, así que todo lo generado se revisa a mano.

### 1.5 Preguntas negativas

Haladyna (pauta 17) y el NBME las desaconsejan: suben la dificultad por
lectura, no por contenido, y quien lee deprisa contesta al revés. Los
estudios no coinciden del todo (hay trabajos sin diferencias de dificultad y
otros que ven que inflan la nota y bajan la fiabilidad; por ejemplo Caldwell
y Pate, 2013, <https://doi.org/10.5688/ajpe77471>, con varias pautas
discutidas). Lo que sí coincide en todas las guías:

- Solo si lo que se aprende **es** la excepción (qué *no* copia una rama,
  qué *no* entra en un commit).
- La negación, en **mayúsculas** (y en negrita si el formato lo permite):
  «¿Qué NO…?».
- Nunca dos negaciones (enunciado negativo con opciones negativas).
- Las opciones, en positivo.

### 1.6 Variantes para no aprenderse la frase: modelos de ítem

- Gierl, M. J., Lai, H. y Turner, S. R. (2012). *Using automatic item
  generation to create multiple-choice test items*. Medical Education,
  46(8), 757–765. <https://doi.org/10.1111/j.1365-2923.2012.04289.x>.
- Gierl, M. J. y Lai, H. (2013). *Using Automated Processes to Generate Test
  Items* (módulo ITEMS). Educational Measurement: Issues and Practice, 32(3),
  36–50. <https://doi.org/10.1111/emip.12018>. Versión del NCME:
  <https://ncme.org/wp-content/uploads/2025/10/Module-34-Automated-Item-Generation-Gierl-Lai.pdf>.
- Bejar, I. I. (2002). *Generative Testing: From Conception to
  Implementation*, en Irvine y Kyllonen (eds.), *Item Generation for Test
  Development*, Erlbaum, 199–217. Ficha: <https://www.ets.org/research/policy_research_reports/publications/chapter/2002/ctes.html>.

Generación automática en tres pasos: (1) un **modelo cognitivo** (qué sabe y
cómo razona quien domina el tema, y qué errores comete quien no), (2) un
**modelo de ítem** (una plantilla con huecos: qué partes del enunciado pueden
cambiar y con qué valores) y (3) un programa que rellena los huecos. Bejar
llama **isomorfos** a las preguntas de un mismo modelo que miden lo mismo con
la misma dificultad. Es justo lo que necesitamos para que nadie se aprenda la
frase: el mismo concepto preguntado con otras palabras, otros valores y otras
malas, pero midiendo lo mismo.

### 1.7 Lo que dicen las apps y los practicantes

- **SuperMemo / Anki**: Wozniak, P. (1999). *Effective learning: Twenty rules
  of formulating knowledge*. <https://www.supermemo.com/en/archives1990-2015/articles/20rules>.
  Entender antes de memorizar; **principio de información mínima** (cada
  tarjeta, una cosa pequeña); evitar listas y conjuntos. El manual de Anki
  (<https://docs.ankiweb.net/getting-started.html>) recomienda varias tarjetas
  de la misma información (anverso y reverso, por ejemplo): un mismo
  conocimiento desde varios lados.
- **Andy Matuschak**, *How to write good prompts* (2020):
  <https://andymatuschak.org/prompts/>. Opinión de practicante muy citada:
  cada pregunta enfocada en una idea, precisa (una sola respuesta sin
  ambigüedad), que obligue a **recuperar** y no a reconocer, y varias
  preguntas desde ángulos distintos para un mismo concepto.
- **Quizlet**: su equipo explica que la opción múltiple se puede acertar por
  descarte y que eligen el formato según lo que ya sabe cada cual
  (<https://medium.com/tech-quizlet/selecting-question-formats-to-maximize-the-testing-effect-7917226a2667>).
  Según notas de terceros, las malas salen de las respuestas de otras
  tarjetas del mismo conjunto
  (<https://notes.andymatuschak.org/zPY3itD88kpA9AepbKQaKfG>): así son del
  mismo tipo, pero a veces son demasiado fáciles de descartar. Es lo que hace
  Not-games con las malas comunes de un concepto, y por eso exigimos que sean
  de la misma pinta.
- **Duolingo**: Settles, B. y Meeder, B. (2016). *A Trainable Spaced
  Repetition Model for Language Learning*. ACL 2016.
  <https://doi.org/10.18653/v1/P16-1174>. Calcula la «vida media» de cada
  palabra en la memoria de cada cual y la repasa cuando está a punto de
  olvidarse. Para nosotros: la dificultad de un concepto se reajusta con lo
  que falla la gente (`level`), y lo fallado vuelve.
- **Kahoot**: enunciado de hasta 120 caracteres y respuestas de hasta 75
  (respuesta del soporte en su comunidad:
  <https://support.kahoot.com/hc/en-us/community/posts/360029139073-Not-enough-space-for-questions-Answers>).
  La lección de un formato con reloj: pregunta y opciones cortas, que se lean
  dentro del tiempo.
- **Brilliant**: trata cada mala como síntoma de un error concreto y revisa
  cada problema buscando las concepciones erróneas probables
  (<https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/>,
  <https://brilliant.org/practice/guides/trust-and-methodology/>).

### 1.8 Qué aprende quien contesta (no solo qué se mide)

- Little, J. L., Bjork, E. L., Bjork, R. A. y Angello, G. (2012).
  *Multiple-Choice Tests Exonerated, at Least of Some Charges*. Psychological
  Science, 23(11), 1337–1344. <https://doi.org/10.1177/0956797612443370>. Con
  **malas competitivas** (plausibles de verdad), la opción múltiple obliga a
  recuperar por qué cada mala es mala, y mejora el recuerdo de lo relacionado.
- Marsh, E. J., Roediger, H. L., Bjork, R. A. y Bjork, E. L. (2007). *The
  memorial consequences of multiple-choice testing*. Psychonomic Bulletin &
  Review, 14(2), 194–199. <https://doi.org/10.3758/BF03194051>. Efecto
  negativo: quien duda puede quedarse con la mala como cierta. Se corta con
  **retroalimentación inmediata**: por eso cada concepto lleva su `why`.
- Butler, A. C. (2018). *Multiple-choice testing in education: Are the best
  practices for assessment also good for learning?* Journal of Applied
  Research in Memory and Cognition, 7(3), 323–331.
  <https://doi.org/10.1016/j.jarmac.2018.07.002>. Lo bueno para medir es casi
  siempre bueno para aprender: formato simple, sin trampas, tres malas
  plausibles, nada de «todas/ninguna», y revisar las respuestas después.

## 2. Cómo se explica

- **Ejemplos resueltos** — Sweller, J. y Cooper, G. A. (1985). *The Use of
  Worked Examples as a Substitute for Problem Solving in Learning Algebra*.
  Cognition and Instruction, 2(1), 59–89.
  <https://doi.org/10.1207/s1532690xci0201_3>. Al empezar se aprende más
  estudiando un problema resuelto que buscando la solución a ciegas: la
  búsqueda gasta la memoria de trabajo.
- **Retirar la ayuda poco a poco** — Renkl, A. y Atkinson, R. K. (2003).
  *Structuring the Transition From Example Study to Problem Solving in
  Cognitive Skill Acquisition*. Educational Psychologist, 38(1), 15–22.
  <https://doi.org/10.1207/S15326985EP3801_3>. Del ejemplo entero al problema
  entero quitando pasos resueltos uno a uno.
- **Inversión por pericia** — Kalyuga, S., Ayres, P., Chandler, P. y
  Sweller, J. (2003). *The Expertise Reversal Effect*. Educational
  Psychologist, 38(1), 23–31. <https://doi.org/10.1207/S15326985EP3801_4>. Lo
  que ayuda a quien empieza estorba a quien ya sabe: en el nivel avanzado,
  menos explicación y más problema.
- **Practicar recuperando** — Roediger, H. L. y Karpicke, J. D. (2006).
  *Test-Enhanced Learning*. Psychological Science, 17(3), 249–255.
  <https://doi.org/10.1111/j.1467-9280.2006.01693.x>. Una semana después
  recuerda más quien se examinó que quien volvió a estudiar.
- **Intercalar** — Rohrer, D. y Taylor, K. (2007). *The shuffling of
  mathematics problems improves learning*. Instructional Science, 35,
  481–498. <https://doi.org/10.1007/s11251-007-9015-8>. Mezclar tipos de
  problema obliga a elegir el método, y se recuerda mejor una semana después.
- **Las seis estrategias** — Weinstein, Y., Madan, C. R. y Sumeracki, M. A.
  (2018). *Teaching the science of learning*. Cognitive Research: Principles
  and Implications, 3, 2. <https://doi.org/10.1186/s41235-017-0087-y>. Resumen
  de The Learning Scientists: práctica espaciada, intercalada, recuperación,
  elaboración (preguntarse por qué y cómo), **ejemplos concretos** y doble
  codificación (texto e imagen).
- **Primeros principios** — Merrill, M. D. (2002). *First principles of
  instruction*. Educational Technology Research and Development, 50(3),
  43–59. <https://doi.org/10.1007/BF02505024>. Lo que comparten los modelos de
  diseño instruccional: se aprende cuando hay un **problema real**, se
  **activa** lo que ya se sabe, se **demuestra** lo nuevo, quien aprende lo
  **aplica** y lo **integra** en su trabajo.
- **PRIMM** — Sentance, S., Waite, J. y Kallia, M. (2019). *Teaching computer
  programming with PRIMM: a sociocultural perspective*. Computer Science
  Education, 29(2–3), 136–176. <https://doi.org/10.1080/08993408.2019.1608781>.
  Predecir qué hará el código, ejecutarlo, investigarlo, modificarlo y hacer
  uno propio. Lo que más valora el profesorado: **predecir antes de
  ejecutar**.
- **Problemas de Parsons** — Parsons, D. y Haden, P. (2006). *Parson's
  Programming Puzzles: A Fun and Effective Learning Tool for First Programming
  Courses*. ACE 2006. <https://crpit.scem.westernsydney.edu.au/abstracts/CRPITV52Parsons.html>.
  Ordenar líneas dadas en vez de escribirlas: menos carga y se puede
  incluir a propósito una línea con el error típico.
- **Explicar el error antes de que se instale** — Muller, D. A., Sharma, M.
  D. y Reimann, P. (2008). *Raising cognitive load with linear multimedia to
  promote conceptual change*. Science Education, 92(2), 278–296.
  <https://doi.org/10.1002/sce.20244>. Un vídeo que plantea y refuta la idea
  equivocada enseña más que uno que solo cuenta lo correcto (y quien lo ve
  dice esforzarse más). Resumen de la línea de trabajo:
  <https://perticles.blogspot.com/2008/01/muller-sharma-reimann-jcal-2008.html>.

## 3. El modelo elegido

**Primeros principios de Merrill como esqueleto, con un ejemplo resuelto
ejecutado, predicción al estilo PRIMM y el error típico refutado; y la
práctica de recuperación espaciada e intercalada en Not-games.**

Por qué este y no otro:

1. **Ya es la forma de nuestros cursos.** Teoría + ejemplo + prueba es
   demostrar y aplicar (Merrill); los jefes contrarreloj son el problema real
   que integra; «se apoya en lo anterior» es activar. No hay que cambiar
   motores ni pantallas, solo cómo se escribe cada parte.
2. **Ejemplo resuelto antes que problema**, porque la gente llega sin saber
   (Sweller y Cooper). Lo tenemos gratis y sin desfase: el ejemplo lo ejecuta
   el motor.
3. **Predecir antes de ver la salida** (PRIMM) convierte el ejemplo en
   práctica de recuperación y destapa el error típico en el momento.
4. **Nombrar y refutar el error típico** (Muller; inventarios de conceptos):
   ese mismo error es la mala principal de las preguntas del concepto, así
   explicación y pregunta se refuerzan.
5. **Recuperar, espaciar e intercalar** fuera del curso (Roediger y Karpicke,
   Rohrer y Taylor): Not-games mezcla conceptos de varios temas y vuelve a
   preguntarlos con otras palabras, que es lo que evita aprenderse la frase.
6. **Menos ayuda al avanzar** (Renkl y Atkinson, Kalyuga): en principiante el
   ejemplo va completo y comentado; en avanzado, más corto, y la prueba pide
   combinar.

Lo que se descarta: la explicación larga antes de tocar nada (carga alta, se
olvida), el «descubre tú solo» al empezar (búsqueda a ciegas) y las preguntas
de definición memorizada como única forma de comprobar.
