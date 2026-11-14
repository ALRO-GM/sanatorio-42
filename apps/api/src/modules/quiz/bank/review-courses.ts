/**
 * Repaso de Not-games: los conceptos de los cursos de shell, Docker y
 * Kubernetes (`courses.ts`), NetPractice (`course-net.ts`) y RAG
 * (`course-rag.ts`). Lo que se ve en «Repaso» si se fallan.
 */

import type { ReviewEntry } from './types.js'

export const REVIEW_COURSES: Record<string, ReviewEntry> = {
  'shell-cd-rutas': {
    title: 'Rutas absolutas y relativas',
    definition:
      'Una ruta que empieza por / es absoluta: parte de la raíz. Sin la /, es relativa: parte de la carpeta en la que estás. Y .. es la carpeta de arriba.',
    example: 'cd /var/log && cd nginx → /var/log/nginx; cd /nginx → «No such file or directory»',
  },
  'docker-ports': {
    title: 'Publicar un puerto (-p)',
    definition:
      'docker run -p A:B une el puerto A de tu máquina con el B del contenedor. Desde tu máquina se llama a localhost:A.',
    example: 'docker run -d -p 8080:80 nginx && curl localhost:8080',
  },
  'k8s-pod-status': {
    title: 'El STATUS de un Pod',
    definition:
      'CrashLoopBackOff: el contenedor arranca y muere una y otra vez (mira kubectl logs --previous). ErrImagePull o ImagePullBackOff: la imagen no se puede bajar (nombre o etiqueta mal, o sin publicar).',
    example: 'kubectl get pods → api-… 0/1 CrashLoopBackOff',
  },

  // Curso de NetPractice (`course-net.ts`).
  'net-network-address': {
    title: 'La dirección de red',
    definition:
      'La dirección de red es la IP con los bits de máquina a 0. La máscara dice cuántos bits son de red: no siempre son los tres primeros números.',
    example: '172.20.7.9/16 → 172.20.0.0; 192.168.1.77/26 → 192.168.1.64',
  },
  'net-mask-valid': {
    title: 'Una máscara válida',
    definition:
      'Una máscara son unos seguidos y luego ceros. Se escribe como prefijo (/27) o en decimal (255.255.255.224); en un octeto solo valen 0, 128, 192, 224, 240, 248, 252, 254 y 255.',
    example: '/27 = 255.255.255.224; 255.255.255.100 no es una máscara',
  },
  'net-hosts-fit': {
    title: 'Cuántas máquinas caben',
    definition:
      'Con h bits de máquina caben 2^h − 2 (la de red y la de broadcast no se dan). Para elegir máscara cuenta también el router, que gasta una.',
    example: '/27 → 30 máquinas; 31 direcciones → /26 (62)',
  },
  'net-unusable-address': {
    title: 'Direcciones que no se dan',
    definition:
      'La dirección de red (máquina a 0), la de broadcast (máquina a 1) y los rangos reservados como el loopback 127.x no se pueden poner a una máquina.',
    example: '10.0.0.4/30 → solo valen 10.0.0.5 y 10.0.0.6',
  },
  'net-switch-role': {
    title: 'El switch',
    definition:
      'Un switch une las máquinas de una misma red. No tiene IP, ni rutas, ni hace de puerta de enlace: si una máquina no contesta, mira su IP y su máscara.',
    example: 'ana, leo y cache en un switch, todas en 10.0.1.0/24',
  },
  'net-gateway-side': {
    title: 'La puerta de enlace, en tu red',
    definition:
      'La puerta de enlace es la IP del router en la red de la máquina: un vecino de su cable. La cara del router en la otra red no le sirve.',
    example: 'ana 10.0.1.10/24 → puerta 10.0.1.1 (no 10.0.2.1)',
  },
  'net-route-destination': {
    title: 'El destino de una ruta',
    definition:
      'El destino de una ruta es una red con su prefijo, con los bits de máquina a 0, o default (0.0.0.0/0), que vale para todo lo que no tiene otra ruta.',
    example: '10.0.2.0/24 via 10.0.0.2; default via 10.0.0.2',
  },
  'net-return-path': {
    title: 'Ida y vuelta',
    definition:
      'Un ping es una ida y una vuelta, y cada nodo decide con su configuración. Si la ida llega y la vuelta muere, el fallo está en el destino o en las rutas hacia el origen.',
    example: 'vuelta: r2 no tiene ruta hacia 10.0.1.10 → ruta en r2 hacia 10.0.1.0/24',
  },
  'net-longest-prefix': {
    title: 'Gana la ruta más concreta',
    definition:
      'Si varias rutas sirven para un destino, el router usa la de prefijo más largo, esté donde esté en la tabla. La ruta por defecto (/0) es la última opción.',
    example: '10.0.0.0/16 y 10.0.5.0/24: hacia 10.0.5.7 gana la /24',
  },
  'net-internet-exit': {
    title: 'Salir a internet',
    definition:
      'El router sale con una ruta por defecto hacia el proveedor, que es su vecino en el cable de salida. Fuera solo viajan direcciones públicas: en el simulador no hay NAT.',
    example: 'r1: default via 163.5.20.1; 172.20.0.5 → internet la tira',
  },
  'net-mask-too-wide': {
    title: 'La máscara demasiado ancha',
    definition:
      'Con una máscara demasiado ancha, una máquina cree vecino lo que está en otra red: lo busca en su cable y nunca se lo pasa a la puerta de enlace.',
    example: 'ana 10.0.1.10/16 → busca 10.0.2.10 en su cable; con /24, va por r1',
  },
  'net-supernet': {
    title: 'Resumir rutas',
    definition:
      'Varias redes seguidas que salen por el mismo vecino caben en una ruta de prefijo más corto, si la primera empieza en un múltiplo del bloque: cuatro /24 son una /22.',
    example: '10.8.0.0/24 … 10.8.3.0/24 → 10.8.0.0/22; 10.8.1.0/22 no es una red',
  },
  'net-routing-loop': {
    title: 'Bucles de rutas',
    definition:
      'Si dos routers se señalan el uno al otro para el mismo destino, el paquete va y viene hasta que se le acaban los saltos (el TTL) y se tira.',
    example: 'r1: default via r2; r2: 10.0.3.0/24 via r1 → bucle',
  },
  'net-vlsm-order': {
    title: 'Subredes de tamaños distintos',
    definition:
      'Cada subred empieza en un múltiplo de su tamaño. Repartiendo de la más grande a la más pequeña, todas caben alineadas y sin huecos.',
    example: '192.168.10.0/24 → .0/25 (100), .128/26 (50), .192/27 (20)',
  },

  // Curso de RAG (`course-rag.ts`).
  'rag-context': {
    title: 'Buscar antes de responder',
    definition:
      'Sin contexto, un modelo contesta de memoria, con aplomo y con datos que pueden ser viejos. RAG busca los trozos que tocan en tus documentos y se los da para que responda leyendo y cite.',
    example: 'trozos = buscar(pregunta, k=3); respuesta = modelo(trozos + pregunta)',
  },
  'rag-corpus-filter': {
    title: 'Qué se indexa',
    definition:
      'Lo que indexas puede acabar en una respuesta. Fuera los secretos (.env), el ruido (.lock) y las preguntas de evaluación, que inflan la nota.',
    example: 'docs/*.md y src/**/*.py, sí; .env, poetry.lock y eval/, no',
  },
  'rag-chunk-cut': {
    title: 'El corte que parte la respuesta',
    definition:
      'Si un corte parte la frase de la respuesta, ningún trozo la tiene entera y no hay búsqueda que la salve. Se arregla con trozos más grandes o con un poco de solape.',
    example: 'trozos de 10 palabras → «Se pierde al trocear»; con solape, entera',
  },
  'rag-normalize': {
    title: 'Normalizar los tokens',
    definition:
      'Normalizar quita lo que no importa al comparar palabras: mayúsculas, acentos y plurales. Sin eso, «LIMITE» y «Límite» son palabras distintas.',
    example: '«LIMITE DE TAMANO» → limite, tamano → encuentra «Límite de tamaño»',
  },
  'rag-idf': {
    title: 'IDF: la palabra rara decide',
    definition:
      'IDF mide cuánto distingue una palabra: casi cero si sale en todos los trozos, alto si sale en pocos. En BM25 multiplica a cada término.',
    example: 'idf = ln(1 + (N − df + 0,5) / (df + 0,5))',
  },
  'rag-bm25-k1': {
    title: 'BM25: k1',
    definition:
      'k1 dice cuánto sigue sumando repetir una palabra en un trozo. Con k1 alto gana quien más la repite; con k1 bajo, la repetición se satura enseguida.',
    example: 'k1 = 3 → gana el .lock que repite «retry»; k1 = 0,4 → gana la guía',
  },
  'rag-search-kind': {
    title: 'Léxica, semántica o híbrida',
    definition:
      'La léxica (BM25) acierta con palabras e identificadores exactos; la semántica (embeddings), con otras palabras u otro idioma. La híbrida junta las dos listas.',
    example: '«backoff_seconds» → léxica; «volver a intentarlo» → semántica',
  },
  'rag-rrf': {
    title: 'Fusión por rangos (RRF)',
    definition:
      'RRF junta dos listas mirando solo los puestos: cada trozo suma 1/(k + puesto) por cada lista en la que sale. Sumar BM25 y coseno no vale: son escalas distintas.',
    example: '1.º y 3.º con k = 60 → 1/61 + 1/63',
  },
  'rag-prompt-budget': {
    title: 'El presupuesto del prompt',
    definition:
      'El prompt se llena en orden: lo fijo (instrucciones y pregunta) y cada trozo con su etiqueta, mientras quepa. El primero que no cabe corta, así que se llena del mejor al peor.',
    example: '100 tokens, 40 fijos, trozos de 25 → entran 2',
  },
  'rag-idk': {
    title: 'Saber decir «no lo sé»',
    definition:
      'El respaldo mínimo es cuánto tiene que apoyar el contexto una respuesta para darla. Por debajo, el bot dice «no lo sé» en vez de contestar lo más parecido.',
    example: '«¿Cuánto cuesta la licencia?» → «No lo sé»',
  },
  'rag-recall-mrr': {
    title: 'recall@k, MRR y precisión',
    definition:
      'recall@k: en qué parte de las preguntas está el trozo bueno entre los k primeros. MRR: la media de 1/puesto del primer acierto. Precisión@k: qué parte de los k sirve.',
    example: 'puestos 1, 2 y 4 → MRR = (1 + 1/2 + 1/4) / 3 = 0,58',
  },
  'rag-eval-split': {
    title: 'Afinar sin sobreajustar',
    definition:
      'Se afina con las preguntas de desarrollo y con la media de varios grupos (validación cruzada). Las de prueba se miran una vez, al final: si se afina con ellas, dejan de medir.',
    example: 'grupos 1,00, 0,50 y 0,60 → vale 0,70',
  },
  'rag-cache': {
    title: 'Caché de consultas',
    definition:
      'La caché devuelve la respuesta de una pregunta ya hecha sin buscar ni generar. Se vacía al reindexar, o servirá respuestas viejas, y su clave es la pregunta normalizada.',
    example: 'clave = pregunta normalizada; reindexar → vaciar la caché',
  },
  'rag-api': {
    title: 'La API de un RAG',
    definition:
      'La API valida antes de trabajar: una consulta vacía o un k fuera de rango son un 422, no una búsqueda que tumbe el servicio.',
    example: 'POST /answer con k = 1000 → 422 k_out_of_range',
  },
  'rag-stages': {
    title: 'Diagnóstico por etapas',
    definition:
      'Una respuesta mala se pierde en una etapa: si la frase no está entera en un trozo, el troceado; si no está entre los k, la búsqueda; si no entra, el prompt; si entra y no sale, la generación.',
    example: '¿entero? → ¿entre los k? → ¿en el prompt? → ¿en la respuesta?',
  },
}
