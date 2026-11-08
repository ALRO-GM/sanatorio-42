/** El Repaso de Not-games en francés, por concepto, con las mismas claves que el español. */

import { REVIEW_PISCINE_SHELL_FR } from './review-piscine-shell.js'
import { REVIEW_PISCINE_C00_C03_FR } from './review-piscine-c00-c03.js'
import { REVIEW_PISCINE_C04_C07_FR } from './review-piscine-c04-c07.js'
import { REVIEW_PISCINE_C08_C13_FR } from './review-piscine-c08-c13.js'
import { REVIEW_CORE_C_FR } from './review-core-c.js'
import { REVIEW_CORE_ALGO_FR } from './review-core-algo.js'
import { REVIEW_CORE_NET_FR } from './review-core-net.js'
import { REVIEW_CORE_CPP_FR } from './review-core-cpp.js'
import type { ReviewEntry } from '../types.js'
import { REVIEW_A_FR } from './review-a.js'
import { REVIEW_B_FR } from './review-b.js'
import { REVIEW_COURSES_FR } from './review-courses.js'
import { REVIEW_GIT_FR } from './review-git.js'

export const REVIEW_FR: Readonly<Record<string, ReviewEntry>> = {
  ...REVIEW_A_FR,
  ...REVIEW_B_FR,
  ...REVIEW_GIT_FR,
  ...REVIEW_COURSES_FR,
  ...REVIEW_PISCINE_SHELL_FR,
  ...REVIEW_PISCINE_C00_C03_FR,
  ...REVIEW_PISCINE_C04_C07_FR,
  ...REVIEW_PISCINE_C08_C13_FR,
  ...REVIEW_CORE_C_FR,
  ...REVIEW_CORE_ALGO_FR,
  ...REVIEW_CORE_NET_FR,
  ...REVIEW_CORE_CPP_FR,
}
