import ca from 'virtual:textos/ca'
import en from 'virtual:textos/en'
import es from 'virtual:textos/es'
import eu from 'virtual:textos/eu'

import { pickTree } from '../src/shared/i18n/tree'

const DICTS: Record<string, Record<string, string>> = { es, en, ca, eu }

/** El `tree` de `useI18n` para un idioma, sin montar React. */
export const treeOf =
  (lang: string) =>
  (prefix: string): { value: unknown; translated: boolean } =>
    pickTree(DICTS[lang], es, prefix, lang === 'es')
