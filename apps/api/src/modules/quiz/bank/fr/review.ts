/** El Repaso de Not-games en francés, por concepto, con las mismas claves que el español. */

import type { ReviewEntry } from '../types.js'
import { REVIEW_A_FR } from './review-a.js'
import { REVIEW_B_FR } from './review-b.js'
import { REVIEW_GIT_FR } from './review-git.js'

export const REVIEW_FR: Readonly<Record<string, ReviewEntry>> = {
  ...REVIEW_A_FR,
  ...REVIEW_B_FR,
  ...REVIEW_GIT_FR,
}
