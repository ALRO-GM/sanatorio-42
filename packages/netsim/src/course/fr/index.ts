/**
 * El francés del curso de redes: los textos de cada unidad (por id, uno por
 * nivel) y de cada bloque (por número). Se juntan con el castellano y el
 * inglés en `course/index.ts`.
 */

import type { UnitText } from '../types.js'
import { ADVANCED_FR } from './advanced.js'
import { BEGINNER_FR } from './beginner.js'
import { INTERMEDIATE_FR } from './intermediate.js'

export const UNITS_FR: Record<string, UnitText> = {
  ...BEGINNER_FR,
  ...INTERMEDIATE_FR,
  ...ADVANCED_FR,
}

export const BLOCKS_FR: Record<number, { title: string; pitch: string }> = {
  1: {
    title: 'Adresses et masques',
    pitch:
      'Octets, préfixes, réseau, broadcast et plage : les calculs, avec les 32 bits sous les yeux.',
  },
  2: {
    title: 'Le même réseau',
    pitch: 'Deux machines, un switch et les adresses que tu ne peux pas distribuer.',
  },
  3: {
    title: 'Le routeur',
    pitch: 'Un pied dans chaque réseau, la passerelle et le trajet aller-retour.',
  },
  4: {
    title: 'Sous-réseaux',
    pitch:
      'Couper une plage, liens en /30, combien de machines tiennent et réseaux qui se chevauchent.',
  },
  5: {
    title: 'Tables de routage',
    pitch:
      'Destination et saut suivant, la route par défaut, le chemin du retour et la plus précise.',
  },
  6: {
    title: 'Atteindre internet',
    pitch: 'Privé et public, la sortie et la route qu’internet utilise pour revenir.',
  },
  7: {
    title: 'Diagnostic',
    pitch: 'Lire où le paquet meurt : masques qui mentent, IP en double et réponses perdues.',
  },
  8: {
    title: 'Plan d’adresses',
    pitch: 'Sous-réseaux de tailles différentes, routeurs à la suite et routes qui résument.',
  },
  9: {
    title: 'Plus d’un chemin',
    pitch: 'Boucles, deux sorties et un serveur visible de l’extérieur.',
  },
}
