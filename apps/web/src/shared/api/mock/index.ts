/**
 * API de mentira, en memoria. Es lo que usa `npm run dev:mock`.
 *
 * Se puede crear, unirse y responder, y todo se pierde al recargar. Las reglas
 * de verdad (plazas, permisos, XP) viven en la API; aquí solo hay lo justo para
 * que cada pantalla se pueda probar sin servidor. Al cumplir el tipo `Api`, el
 * compilador avisa si se queda atrás respecto al contrato.
 */

import type { Api } from '../types'
import { adminMock } from './admin'
import { boardsMock } from './boards'
import { clickerMock } from './clicker'
import { doubtsMock } from './doubts'
import { examsMock } from './exams'
import { helpMock } from './help'
import { meetMock } from './meet'
import { peersMock } from './peers'
import { profileMock } from './profile'
import { replicaMock } from './replica'
import { staffMock } from './staff'
import { therapyMock } from './therapy'

/** Cada trozo es una funcionalidad; juntos tienen que cumplir `Api` entero. */
export const mockApi: Api = {
  ...peersMock,
  ...meetMock,
  ...adminMock,
  ...profileMock,
  ...replicaMock,
  ...helpMock,
  ...therapyMock,
  ...doubtsMock,
  ...examsMock,
  ...boardsMock,
  ...clickerMock,
  ...staffMock,
}
