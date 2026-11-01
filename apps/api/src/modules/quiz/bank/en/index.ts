/**
 * El banco de Not-games en inglés, por concepto. Cada fichero traduce el suyo
 * del español con la misma forma (lo comprueba `tests/unit/quiz-bank-lang.test.ts`).
 */

import { PISCINE_SHELL_EN } from './piscine-shell.js'
import { PISCINE_C00_C03_EN } from './piscine-c00-c03.js'
import { PISCINE_C04_C07_EN } from './piscine-c04-c07.js'
import { PISCINE_C08_C13_EN } from './piscine-c08-c13.js'
import type { ConceptText } from '../types.js'
import { ALGORITHMS_EN } from './algorithms.js'
import { C_BASICS_EN } from './c-basics.js'
import { CPP_EN } from './cpp.js'
import { GENERAL_EN } from './general.js'
import { GIT_EN } from './git.js'
import { GRAPHICS_EN } from './graphics.js'
import { NETWORK_EN } from './network.js'
import { PYTHON_EN } from './python.js'
import { UNIX_EN } from './unix.js'

export const BANK_EN: Readonly<Record<string, ConceptText>> = {
  ...GENERAL_EN,
  ...C_BASICS_EN,
  ...UNIX_EN,
  ...ALGORITHMS_EN,
  ...NETWORK_EN,
  ...GRAPHICS_EN,
  ...CPP_EN,
  ...PYTHON_EN,
  ...GIT_EN,
  ...PISCINE_SHELL_EN,
  ...PISCINE_C00_C03_EN,
  ...PISCINE_C04_C07_EN,
  ...PISCINE_C08_C13_EN,
}
