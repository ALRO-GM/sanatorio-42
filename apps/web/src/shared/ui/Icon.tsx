import type { ReactNode } from 'react'

import { useShownTheme } from '../theme'

/**
 * Los iconos de la web: un solo juego, dibujado a propósito, en vez de emojis.
 *
 * Los emojis cambian de aspecto en cada sistema, no siguen el color del tema y
 * mezclados parecen un collage. Estos comparten rejilla (24 × 24), grosor y
 * remates redondos, y se pintan con `currentColor`, así que toman el color del
 * texto que los rodea en claro y en oscuro.
 *
 * El motivo es el de Peer4U: gente que se ayuda (dos peers conectados, la
 * ficha de un perfil, el busca del on-call) y lo que se estudia (corchetes de
 * código en la pizarra, nodos de un grafo, el cursor de una terminal).
 *
 * Para añadir uno: dibújalo en la misma rejilla, solo con trazos, y apúntalo
 * aquí. No pongas colores dentro.
 */
const PATHS = {
  // --- Secciones -------------------------------------------------------------
  /** Peer to peer (la sección `consulta`): dos peers que se pasan algo. */
  consulta: (
    <>
      <circle cx="5.5" cy="12" r="2.8" />
      <circle cx="18.5" cy="12" r="2.8" />
      <path d="M9.5 9.5h5l-1.6-1.6M14.5 14.5h-5l1.6 1.6" />
    </>
  ),
  /** Tablón: una nota con la esquina doblada. */
  tablon: (
    <>
      <path d="M5 4h14v9l-6 6H5z" />
      <path d="M13 19v-6h6" />
      <path d="M8.5 8.5h7M8.5 12h2.5" />
    </>
  ),
  /** Categoría «Datos»: un gráfico de barras sobre su eje. */
  cifras: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  /** Terapia de grupo: tres personas. */
  terapia: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="4.8" cy="10.5" r="1.9" />
      <circle cx="19.2" cy="10.5" r="1.9" />
      <path d="M2 18.5a3.4 3.4 0 0 1 2.8-3.3M22 18.5a3.4 3.4 0 0 0-2.8-3.3" />
    </>
  ),
  /** Pizarras: una pizarra con código. */
  pizarras: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M12 16v4M8 20h8" />
      <path d="M10 8l-2 2 2 2M14 8l2 2-2 2" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
      <path d="M8 14h3M8 17h6" />
    </>
  ),
  /** Agenda (Scrum individual): una tablilla con dos checkpoints marcados y uno pendiente. */
  agenda: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9.5 3h5v3h-5z" />
      <path d="M8 10.5l1.2 1.2 2-2M8 15l1.2 1.2 2-2M13.5 11h3M13.5 15.5h3" />
    </>
  ),
  /** Red de correcciones: nodos unidos. */
  red: (
    <>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="8" r="2.3" />
      <circle cx="11" cy="18" r="2.3" />
      <path d="M8.3 6.4l7.4 1.2M7 8.1l3 7.8M16.6 9.9l-4.2 6.2" />
    </>
  ),
  /** On-call (la sección `guardia`): la campana que avisa. */
  guardia: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0M12 3v2" />
    </>
  ),
  /** Perfil (la sección `expediente`): la ficha con tu foto y tus datos. */
  expediente: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10.5" r="2.2" />
      <path d="M5.8 16a3.4 3.4 0 0 1 6.4 0M14 10h4M14 13.5h3" />
    </>
  ),
  /** Panel de gestión. */
  gestion: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V7M17 20v-9" />
    </>
  ),

  // --- Cabecera y acciones ---------------------------------------------------
  buzon: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 7.5l8.5 6 8.5-6" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h8M18 18h2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="15" cy="18" r="2" />
    </>
  ),
  salir: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  abajo: <path d="M6 9l6 6 6-6" />,
  /** Volver: una flecha a la izquierda. */
  atras: <path d="M19 12H5M11 6l-6 6 6 6" />,
  /** Ir a más: una flecha a la derecha. */
  adelante: <path d="M5 12h14M13 6l6 6-6 6" />,
  /** Se abre fuera de la web (la intra): una flecha que sale de la caja. */
  fuera: (
    <>
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M17 14v5H5V7h5" />
    </>
  ),
  /** Eminencia: un destello de cuatro puntas. */
  chispa: (
    <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  hecho: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  aviso: (
    <>
      <path d="M12 4l9 15.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  campana: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  // Sonido de los juegos: el altavoz con ondas, y tachado si está apagado.
  altavoz: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  silencio: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  chat: (
    <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  ),
  lapiz: (
    <>
      <path d="M4 20h4L18.5 9.5l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </>
  ),
  bandera: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  candado: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  /** Preevaluar: una tablilla de corrección con su visto. */
  preevaluar: (
    <>
      <path d="M8.5 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-2" />
      <path d="M9 3h6v3H9z" />
      <path d="M8.5 13.5l2.5 2.5 4.5-5" />
    </>
  ),
  /** Borrar: una papelera. */
  papelera: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  estrella: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" />,
  lupa: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.6-4.6" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3M12.5 15H17" />
    </>
  ),

  // --- Avisos de un evento ---------------------------------------------------
  visto: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  ausente: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.7 5.7l12.6 12.6" />
    </>
  ),
  /** El asa de lo que se arrastra (las ventanitas de la esquina): seis puntos. */
  asa: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="3" />,
  /** Fijar una cuenta atrás (`features/countdowns`): una chincheta. */
  chincheta: <path d="M9 3.5h6M10 3.5v5.5l-3.5 4h11L14 9V3.5M12 13v7.5" />,
  /** El modo mantenimiento: una llave inglesa. */
  llave: (
    <path d="M14.7 3.6a5 5 0 0 0-4.3 6.8L3.8 17a2.2 2.2 0 0 0 3.1 3.1l6.6-6.6a5 5 0 0 0 6.8-4.3l-3 1.6-2.4-.8-.8-2.4z" />
  ),

  // --- Cómo te ayudaron y cómo llegaste --------------------------------------
  bicho: (
    <>
      <path d="M8 10a4 4 0 0 1 8 0v4a4 4 0 0 1-8 0z" />
      <path d="M8 12H4.5M19.5 12H16M8 15l-3 2M16 15l3 2M9.5 7L7.5 5M14.5 7l2-2M12 10v8" />
    </>
  ),
  idea: (
    <>
      <path d="M8 14a6 6 0 1 1 8 0c-.7.7-1 1.5-1 3H9c0-1.5-.3-2.3-1-3z" />
      <path d="M10 20.5h4" />
    </>
  ),
  corazon: <path d="M12 20s-7-4.5-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.5 12 20 12 20z" />,
  pregunta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.8M12 17h.01" />
    </>
  ),
  despegue: <path d="M7 17L17 7M9 7h8v8" />,
  capas: (
    <>
      <path d="M12 4l8 4-8 4-8-4z" />
      <path d="M4 12l8 4 8-4M4 16l8 4 8-4" />
    </>
  ),

  // --- Logros ----------------------------------------------------------------
  escudo: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
  medalla: (
    <>
      <circle cx="12" cy="14.5" r="5" />
      <path d="M8.5 3l3.5 6.5L15.5 3" />
    </>
  ),
  /** El asa de lo que se arrastra (Personalizar): dos columnas de puntos. */
  agarrar: (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ),
  /** El black hole: un pozo. */
  pozo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 11.5v1" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

type IconProps = {
  name: IconName
  /** Lado, en píxeles. Por defecto, el del texto que lo rodea. */
  size?: number
  className?: string
}

/**
 * Un icono del juego de la web. Es decorativo: el nombre accesible lo pone el
 * botón o el texto que lo acompaña.
 */
export function Icon({ name, size, className }: IconProps) {
  // Un estilo puede dibujar un icono a su manera; si no, vale el de siempre.
  const own = useShownTheme().icons?.[name]

  return (
    <svg
      className={`icon ${className ?? ''}`}
      viewBox="0 0 24 24"
      width={size ?? '1.15em'}
      height={size ?? '1.15em'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {own ?? PATHS[name]}
    </svg>
  )
}
