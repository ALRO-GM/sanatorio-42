import type { ReactNode } from 'react'

import type { PoolKey } from '@sanatorio/contracts'

import { usePoolAllows } from '../pool'

/** Lo de dentro sale si quien ha entrado puede verlo (un piscinero, según el panel). */
export function PoolOnly({ k, children }: { k: PoolKey; children: ReactNode }) {
  return usePoolAllows(k) ? children : null
}
