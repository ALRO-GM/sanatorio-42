/** El Repaso de Not-games en inglés, por concepto, con las mismas claves que el español. */

import { REVIEW_PISCINE_SHELL_EN } from './review-piscine-shell.js'
import { REVIEW_PISCINE_C00_C03_EN } from './review-piscine-c00-c03.js'
import { REVIEW_PISCINE_C04_C07_EN } from './review-piscine-c04-c07.js'
import { REVIEW_PISCINE_C08_C13_EN } from './review-piscine-c08-c13.js'
import { REVIEW_CORE_C_EN } from './review-core-c.js'
import { REVIEW_CORE_ALGO_EN } from './review-core-algo.js'
import { REVIEW_CORE_NET_EN } from './review-core-net.js'
import { REVIEW_CORE_CPP_EN } from './review-core-cpp.js'
import type { ReviewEntry } from '../types.js'
import { REVIEW_A_EN } from './review-a.js'
import { REVIEW_B_EN } from './review-b.js'
import { REVIEW_GIT_EN } from './review-git.js'

export const REVIEW_EN: Readonly<Record<string, ReviewEntry>> = {
  ...REVIEW_A_EN,
  ...REVIEW_B_EN,
  ...REVIEW_GIT_EN,
  ...REVIEW_PISCINE_SHELL_EN,
  ...REVIEW_PISCINE_C00_C03_EN,
  ...REVIEW_PISCINE_C04_C07_EN,
  ...REVIEW_PISCINE_C08_C13_EN,
  ...REVIEW_CORE_C_EN,
  ...REVIEW_CORE_ALGO_EN,
  ...REVIEW_CORE_NET_EN,
  ...REVIEW_CORE_CPP_EN,
}
