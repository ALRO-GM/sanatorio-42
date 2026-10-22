/** El Repaso de Not-games en inglés, por concepto, con las mismas claves que el español. */

import type { ReviewEntry } from '../types.js'
import { REVIEW_A_EN } from './review-a.js'
import { REVIEW_B_EN } from './review-b.js'
import { REVIEW_GIT_EN } from './review-git.js'

export const REVIEW_EN: Readonly<Record<string, ReviewEntry>> = {
  ...REVIEW_A_EN,
  ...REVIEW_B_EN,
  ...REVIEW_GIT_EN,
}
