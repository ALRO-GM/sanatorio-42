/**
 * La red de asientos como el grafo de la red (`ForceGraph.tsx`): la usan la
 * pestaña Amigos (`SeatsPage.tsx`) y la vista previa de pesos del panel
 * (`SeatWeightsPanel.tsx`).
 */

import type { NetworkLink, NetworkNode, SeatLink, SeatPerson } from '@sanatorio/contracts'

/**
 * Una persona de la red de asientos como burbuja del grafo de la red: el
 * tamaño es la fuerza de sus uniones a la vista (`strength`) y la endogamia
 * guarda lo solo que se sienta (0-100).
 */
function toNode(person: SeatPerson, strength: number): NetworkNode {
  return {
    login: person.login,
    image: person.image,
    external: false,
    given: strength,
    received: 0,
    partners: person.partners,
    endogamy: Math.round(person.alone * 100),
    reciprocity: 0,
    repetition: 0,
    givenPassRate: null,
    receivedPassRate: null,
    community: person.community,
    cohort: null,
    campusId: null,
  }
}

type Shown = { people: readonly SeatPerson[]; links: readonly SeatLink[] }

/**
 * Las burbujas. El tamaño de cada una no son sus horas en el clúster, sino su
 * parte de la cercanía de las uniones a la vista: sumadas todas, cuanto más le
 * toca a alguien, más grande (pedido por Alberto, 2026-10-29).
 */
export function seatNodes(shown: Shown): NetworkNode[] {
  const strength = new Map<string, number>()

  for (const link of shown.links) {
    strength.set(link.source, (strength.get(link.source) ?? 0) + link.closeness)
    strength.set(link.target, (strength.get(link.target) ?? 0) + link.closeness)
  }

  return shown.people.map((person) => toNode(person, strength.get(person.login) ?? 0))
}

/** Las uniones: sin sentido, con la cercanía como cifra. */
export function seatLinks(shown: Shown): NetworkLink[] {
  return shown.links.map((link) => ({
    source: link.source,
    target: link.target,
    forth: link.closeness,
    back: 0,
  }))
}
