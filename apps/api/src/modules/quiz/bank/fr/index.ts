/**
 * El banco de Not-games en francés, por concepto. Cada fichero traduce el suyo
 * del español con la misma forma (lo comprueba `tests/unit/quiz-bank-lang.test.ts`).
 */

import type { ConceptText } from '../types.js'
import { ALGORITHMS_FR } from './algorithms.js'
import { C_BASICS_FR } from './c-basics.js'
import { CPP_FR } from './cpp.js'
import { GENERAL_FR } from './general.js'
import { GIT_FR } from './git.js'
import { GRAPHICS_FR } from './graphics.js'
import { NETWORK_FR } from './network.js'
import { PYTHON_FR } from './python.js'
import { UNIX_FR } from './unix.js'

export const BANK_FR: Readonly<Record<string, ConceptText>> = {
  ...GENERAL_FR,
  ...C_BASICS_FR,
  ...UNIX_FR,
  ...ALGORITHMS_FR,
  ...NETWORK_FR,
  ...GRAPHICS_FR,
  ...CPP_FR,
  ...PYTHON_FR,
  ...GIT_FR,
}
