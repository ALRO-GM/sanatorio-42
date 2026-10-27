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
import { agendaMock } from './agenda'
import { boardsMock } from './boards'
import { clickerMock } from './clicker'
import { countdownsMock } from './countdowns'
import { doubtsMock } from './doubts'
import { examsMock } from './exams'
import { helpMock } from './help'
import { meetMock } from './meet'
import { peersMock } from './peers'
import { profileMock } from './profile'
import { quizMock } from './quiz'
import { statsMock } from './stats'
import { turnsMock } from './turns'
import { facilityMock } from './facility'
import { focusMock } from './focus'
import { hiddenMock, withHidden } from './hidden'
import { poolMock } from './pool'
import { gitCourseMock } from './gitcourse'
import { shellCourseMock } from './shellcourse'
import { gitRoomsMock } from './gitrooms'
import { replicaMock } from './replica'
import { apiUsageMock } from './api-usage'
import { staffMock } from './staff'
import { therapyMock } from './therapy'

/**
 * Cada trozo es una funcionalidad; juntos tienen que cumplir `Api` entero. Las
 * personas ocultas van por encima: quitan a quien no se ve de lo que enseña gente.
 */
export const mockApi: Api = withHidden({
  ...peersMock,
  ...meetMock,
  ...adminMock,
  ...profileMock,
  ...replicaMock,
  ...apiUsageMock,
  ...helpMock,
  ...therapyMock,
  ...doubtsMock,
  ...examsMock,
  ...boardsMock,
  ...clickerMock,
  ...staffMock,
  ...quizMock,
  ...statsMock,
  ...turnsMock,
  ...facilityMock,
  ...focusMock,
  ...poolMock,
  ...hiddenMock,
  ...gitCourseMock,
  ...shellCourseMock,
  ...gitRoomsMock,
  ...countdownsMock,
  ...agendaMock,
})
