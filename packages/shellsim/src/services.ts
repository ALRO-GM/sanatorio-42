/**
 * Servicios (lo que haría systemd) sobre el mundo simulado: arrancar,
 * parar, reiniciar, y qué pasa cuando muere su proceso. Un servicio arranca
 * solo si su configuración está bien (`needs`): si no, queda `failed` y deja
 * el porqué en el registro, que es lo que se mira con `journalctl` en una
 * guardia de verdad.
 */

import { lookup } from './fs.js'
import { own } from './limits.js'
import type { Machine, Proc, Service } from './model.js'

type ServiceLog = (unit: string, prio: number, msg: string, machine: Machine) => void

const root = (machine: Machine) =>
  own(machine.users, 'root') ?? {
    name: 'root',
    uid: 0,
    home: '/root',
    shell: '/bin/bash',
    groups: ['root'],
  }

/** Lo que falla en la configuración de un servicio, o `null` si arranca. */
export function configError(machine: Machine, service: Service): string | null {
  for (const need of service.needs ?? []) {
    const found = lookup(machine, root(machine), need.path)

    if (found?.node.kind !== 'file' || !found.node.text.includes(need.contains)) return need.error
  }

  return null
}

function serviceProc(machine: Machine, service: Service, clock: number): Proc {
  return {
    pid: machine.nextPid++,
    ppid: 1,
    user: service.user,
    cmd: service.exec,
    cpu: service.cpu ?? 0.3,
    mem: service.mem ?? 1.2,
    rss: Math.round((service.mem ?? 1.2) * 40_000),
    state: 'S',
    tty: '?',
    service: service.name,
    start: clock,
  }
}

export function startService(
  machine: Machine,
  service: Service,
  clock: number,
  log: ServiceLog,
): boolean {
  if (service.active) return true
  log('systemd', 6, `Starting ${service.name}.service - ${service.description}...`, machine)

  const error = configError(machine, service)

  if (error !== null) {
    service.active = false
    service.failed = true
    log(service.name, 3, error, machine)
    log(
      'systemd',
      3,
      `${service.name}.service: Main process exited, code=exited, status=1/FAILURE`,
      machine,
    )
    log('systemd', 3, `${service.name}.service: Failed with result 'exit-code'.`, machine)
    log('systemd', 3, `Failed to start ${service.name}.service - ${service.description}.`, machine)

    return false
  }
  service.active = true
  service.failed = false
  machine.procs.push(serviceProc(machine, service, clock))
  log('systemd', 6, `Started ${service.name}.service - ${service.description}.`, machine)

  return true
}

export function stopService(machine: Machine, service: Service, log: ServiceLog): void {
  if (!service.active) return
  log('systemd', 6, `Stopping ${service.name}.service - ${service.description}...`, machine)
  machine.procs = machine.procs.filter((proc) => proc.service !== service.name)
  service.active = false
  log('systemd', 6, `${service.name}.service: Deactivated successfully.`, machine)
  log('systemd', 6, `Stopped ${service.name}.service - ${service.description}.`, machine)
}

/** Lo que pasa cuando matan el proceso de un servicio: o vuelve (Restart=always) o queda caído. */
export function serviceDied(
  machine: Machine,
  name: string,
  signal: string,
  clock: number,
  log: ServiceLog,
): void {
  const service = own(machine.services, name)

  if (!service?.active) return
  if (machine.procs.some((proc) => proc.service === name)) return
  log('systemd', 4, `${name}.service: Main process exited, code=killed, status=${signal}`, machine)
  if (service.restart === true) {
    log('systemd', 6, `${name}.service: Scheduled restart job, restart counter is at 1.`, machine)
    machine.procs.push(serviceProc(machine, service, clock))
    log('systemd', 6, `Started ${name}.service - ${service.description}.`, machine)

    return
  }
  service.active = false
  service.failed = true
  log('systemd', 3, `${name}.service: Failed with result 'signal'.`, machine)
}
