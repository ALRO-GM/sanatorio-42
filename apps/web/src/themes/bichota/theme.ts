import '@fontsource-variable/dancing-script'
import '@fontsource-variable/nunito'

import { EXCLUSIVE_STYLES } from '../ids'
import type { ThemeManifest } from '../types'
import './theme.css'

/**
 * Bichota: el estilo de acamelo, y solo suyo. Lo pidió así en el buzón: negro,
 * rosa y oro, brillante, con el color moviéndose sin parar entre rosas y fucsia,
 * estampado de leopardo con las manchas doradas, títulos en negrita y cursiva y
 * el resto en letra redonda sobre rosa claro.
 */
export const bichota: ThemeManifest = {
  id: 'bichota',
  owners: EXCLUSIVE_STYLES.bichota ?? [],
  name: { es: 'Bichota', en: 'Bichota', ca: 'Bichota', eu: 'Bichota', fr: 'Bichota' },
  hint: {
    es: 'Leopardo, fucsia, negro y oro. Solo tuyo',
    en: 'Leopard, fuchsia, black and gold. Yours only',
    ca: 'Lleopard, fúcsia, negre i or. Només teu',
    eu: 'Lehoinabarra, fuksia, beltza eta urrea. Zuretzat bakarrik',
    fr: 'Léopard, fuchsia, noir et or. Rien que pour toi',
  },
  preview: {
    bg: '#ffe1f0',
    surface: '#ffffff',
    text: '#1a0610',
    accent: 'linear-gradient(135deg, #ff4fb3, #e6007e 50%, #d4a017)',
    font: "'Dancing Script Variable', cursive",
    radius: '1.1rem',
  },
}
