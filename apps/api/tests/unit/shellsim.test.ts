/**
 * Shell simulada (`packages/shellsim`): que se comporte como bash en lo que
 * enseña el curso, que cada unidad se pueda ganar con su solución (y no
 * empiece ganada) y que el motor no toque el sistema.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BLOCKS,
  checkAttempt,
  exampleOf,
  FINALS,
  goalOf,
  run,
  startOf,
  TIERS,
  unitIn,
  UNITS,
} from '@sanatorio/shellsim'
import type { World } from '@sanatorio/shellsim'
import { describe, expect, it } from 'vitest'

const FIRST = UNITS.find((unit) => unit.id === 'ls') ?? UNITS[0]

if (FIRST === undefined) throw new Error('el curso no tiene unidades')
const START = FIRST

/** Ejecuta varias órdenes desde el mundo de partida y devuelve lo de la última. */
function sh(...entries: string[]): { out: string; code: number; world: World } {
  let world = startOf(START)
  let last = { out: '', code: 0 }

  for (const entry of entries) {
    const result = run(world, entry)

    world = result.world
    last = { out: result.output.join('\n'), code: result.code }
  }

  return { ...last, world }
}

describe('shell simulada: lo básico', () => {
  it('navega, lista y lee', () => {
    expect(sh('pwd').out).toBe('/home/peer')
    expect(sh('cd /var/log/nginx', 'pwd').out).toBe('/var/log/nginx')
    expect(sh('cd /var/log', 'cd ..', 'cd -').out).toBe('/var/log')
    expect(sh('ls /srv/peer4u').out).toBe('health.json  server.js')
    expect(sh('ls /srv/peer4u | cat').out).toBe('health.json\nserver.js')
    expect(sh('ls -a ~').out).toContain('.secreto')
    expect(sh('cat ~/.secreto').out).toContain('commit-early-push-often')
    expect(sh('head -n 2 /etc/passwd').out.split('\n')).toHaveLength(2)
    expect(sh('wc -l < /var/log/nginx/access.log').out).toBe('60')
    expect(sh('ls /nada')).toMatchObject({
      code: 2,
      out: "ls: cannot access '/nada': No such file or directory",
    })
  })

  it('crea, copia, mueve, borra y redirige', () => {
    const made = sh(
      'mkdir -p a/{b,c}',
      'touch a/b/x.txt',
      'cp a/b/x.txt a/c/',
      'mv a/c/x.txt a/c/y.txt',
      'ls -R a',
    )

    expect(made.out).toContain('y.txt')
    expect(sh('echo uno > f', 'echo dos >> f', 'cat f').out).toBe('uno\ndos')
    expect(sh('ls /nada 2> err', 'cat err').out).toContain('No such file')
    expect(sh('ls /nada > todo 2>&1', 'wc -l < todo').out).toBe('1')
    expect(sh('echo hola > f', 'sort f > f', 'wc -c < f').out).toBe('0')
    expect(sh('mkdir d', 'rm d').out).toBe("rm: cannot remove 'd': Is a directory")
    expect(sh("cat > s.txt <<'EOF'\n$HOME\nEOF", 'cat s.txt').out).toBe('$HOME')
    expect(sh('cat > s.txt <<EOF\n$HOME\nEOF', 'cat s.txt').out).toBe('/home/peer')
    expect(sh('touch a.log b.log c.txt', 'echo *.log').out).toBe('a.log b.log')
    expect(sh('echo *.nada').out).toBe('*.nada')
  })

  it('permisos, sudo y usuarios', () => {
    expect(sh('cat /etc/shadow')).toMatchObject({
      code: 1,
      out: 'cat: /etc/shadow: Permission denied',
    })
    expect(sh('ls /root').code).toBe(2)
    expect(sh('touch /srv/x').out).toContain('Permission denied')
    expect(sh('sudo touch /srv/x', 'ls -l /srv/x').out).toMatch(/^-rw-r--r-- 1 root/)
    expect(sh('touch f', 'chmod 750 f', 'ls -l f').out).toMatch(/^-rwxr-x---/)
    expect(sh('touch f', 'chmod u+x,go-r f', 'ls -l f').out).toMatch(/^-rwx-w----/)
    expect(sh('sudo useradd -m -G developers ana', 'id ana').out).toBe(
      'uid=1003(ana) gid=1003(ana) groups=1003(ana),1100(developers)',
    )
    // Sin -a, -G quita los grupos de antes.
    expect(sh('sudo usermod -G www-data mgarcia', 'groups mgarcia').out).toBe(
      'mgarcia : mgarcia www-data',
    )
    expect(sh('sudo -u deploy whoami').out).toBe('deploy')
    expect(sh('sudo -i', 'whoami', 'exit', 'whoami').out).toBe('peer')
  })

  it('filtra texto como en un servidor', () => {
    expect(
      sh("cut -d' ' -f1 /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 1").out,
    ).toBe('     22 10.42.0.7')
    expect(sh("awk '$9 >= 500' /var/log/nginx/access.log | wc -l").out).toBe(
      sh("grep -cE '\" 50[0-9] ' /var/log/nginx/access.log").out,
    )
    expect(sh("awk -F: '$3 >= 1000 {print $1}' /etc/passwd").out).toBe('peer\ndeploy\nmgarcia')
    expect(sh("echo 'a,b;c' | awk -F'[,;]' '{print $3, NF}'").out).toBe('c 3')
    expect(sh("printf 'b\\na\\nb\\n' | sort -u").out).toBe('a\nb')
    expect(sh("echo 'hola mundo' | sed 's/o/0/g'").out).toBe('h0la mund0')
    expect(sh("echo 'clave=valor' | sed -E 's/(\\w+)=(\\w+)/\\2=\\1/'").out).toBe('valor=clave')
    expect(sh("printf '3\\n1\\n2\\n' | paste -sd+ | bc").out).toBe('6')
    expect(sh("echo 'Hola' | tr a-z A-Z").out).toBe('HOLA')
    expect(sh('grep -c ERROR /var/log/peer4u/app.log').out).toBe(
      sh("awk '/ERROR/ {n++} END {print n}' /var/log/peer4u/app.log").out,
    )
    expect(sh('du -sh /var/log/* 2>/dev/null | sort -h | tail -n 1').out).toBe(
      '16K\t/var/log/nginx',
    )
  })

  it('variables, condiciones, bucles y guiones', () => {
    expect(sh('x=3; echo $((x * 2)) ${x:-no} ${y:-no} ${#HOME}').out).toBe('6 3 no 10')
    expect(sh('for i in 1 2 3; do echo -n $i; done').out).toBe('123')
    expect(sh('n=0; while [ $n -lt 3 ]; do n=$((n+1)); done; echo $n').out).toBe('3')
    expect(sh('if [ -f /etc/hosts ]; then echo si; else echo no; fi').out).toBe('si')
    expect(sh('[[ app.log == *.log ]] && echo log').out).toBe('log')
    expect(sh('case b in a) echo A;; b|c) echo BC;; esac').out).toBe('BC')
    expect(sh('f() { local x=dentro; echo $1 $x; }; x=fuera; f hola; echo $x').out).toBe(
      'hola dentro\nfuera',
    )
    expect(sh('false || echo $?').out).toBe('1')
    expect(sh('printf \'a\\nb\\n\' | while read -r l; do echo "[$l]"; done').out).toBe('[a]\n[b]')

    const script =
      'cat > s.sh <<\'EOF\'\n#!/bin/bash\nset -euo pipefail\necho "tengo $# argumentos"\nfalse\necho nunca\nEOF'

    expect(sh(script, './s.sh').code).toBe(126)
    expect(sh(script, 'chmod +x s.sh', './s.sh a b')).toMatchObject({
      code: 1,
      out: 'tengo 2 argumentos',
    })
    expect(sh(script, 'bash s.sh x')).toMatchObject({ code: 1, out: 'tengo 1 argumentos' })
    expect(
      sh("printf '#!/bin/bash\\necho $UNDEF\\n' > u.sh", "bash -c 'set -u; echo $UNDEF'").code,
    ).toBe(1)
    // Una orden a medias pide más.
    expect(run(startOf(START), 'if true; then').incomplete).toBe(true)
  })

  it('procesos, servicios y registros', () => {
    expect(sh('sleep 60 &', 'pgrep -a sleep').out).toMatch(/^\d+ sleep 60$/)
    expect(sh('sleep 60 &', 'sleep 61', 'pgrep sleep').code).toBe(1)
    expect(sh('systemctl is-active nginx').out).toBe('active')
    expect(sh('systemctl stop nginx').out).toContain('Interactive authentication required')
    expect(sh('sudo systemctl stop nginx', 'curl -s localhost').code).toBe(7)
    expect(
      sh(
        'sudo systemctl stop peer4u-api',
        'curl -s -o /dev/null -w "%{http_code}" localhost/api/health',
      ).out,
    ).toBe('502')
    // Restart=always: si matas el proceso de la API, systemd la vuelve a arrancar.
    expect(sh('sudo pkill -9 node', 'systemctl is-active peer4u-api').out).toBe('active')
    expect(
      sh(
        "sudo sed -i 's/PORT=3000/PORT=/' /etc/peer4u/app.env",
        'sudo systemctl restart peer4u-api',
        'journalctl -u peer4u-api -p err -n 1',
      ).out,
    ).toContain('Failed to start peer4u-api')
    expect(sh("echo '0 3 * * * /x.sh' | crontab -", 'crontab -l').out).toBe('0 3 * * * /x.sh')
    expect(sh("echo 'esto no es cron' | crontab -").code).toBe(1)
  })

  it('otras máquinas por la red simulada', () => {
    expect(sh('ssh db1 hostname').out).toBe('db1')
    expect(sh('ssh db1', 'hostname', 'exit', 'hostname').out).toBe('web1')
    expect(sh('scp notas.txt db1:/tmp/', "ssh db1 'cat /tmp/notas.txt'").out).toContain(
      'Bienvenida a web1',
    )
    expect(sh('ssh nadie hostname').code).toBe(255)
    expect(sh('dig +short api.peer4u.dev').out).toBe('10.42.0.10')
    expect(sh('ping -c 1 db1').code).toBe(0)
    expect(sh('curl -s localhost/api/health | jq -r .status').code).toBe(127)
    expect(sh('sudo apt install -y jq', 'curl -s localhost/api/health | jq -r .status').out).toBe(
      'ok',
    )
  })
})

describe('curso de shell: las unidades', () => {
  it('hay tres niveles con sus bloques, jefes y jefes finales', () => {
    expect(new Set(UNITS.map((unit) => unit.id)).size).toBe(UNITS.length)
    for (const block of BLOCKS) {
      const units = UNITS.filter((unit) => unit.block === block.n)

      expect(
        units.filter((unit) => unit.kind === 'unit').length,
        `bloque ${block.n}`,
      ).toBeGreaterThanOrEqual(3)
      expect(
        units.filter((unit) => unit.kind === 'boss'),
        `bloque ${block.n}`,
      ).toHaveLength(1)
    }
    for (const tier of TIERS)
      expect(UNITS.find((unit) => unit.id === FINALS[tier])?.kind).toBe('final')
    for (const unit of UNITS) {
      // Cada conocimiento: teoría, ejemplo y prueba; cada jefe: historia, tareas y reloj.
      for (const lang of ['es', 'en']) {
        const text = unitIn(unit, lang)

        if (unit.kind === 'unit') {
          expect(text.theory?.how.length, unit.id).toBeGreaterThan(0)
          expect(unit.example?.length, unit.id).toBeGreaterThan(0)
        } else {
          expect(text.tasks?.length, unit.id).toBeGreaterThan(0)
          expect(unit.limit, unit.id).toBeGreaterThan(0)
        }
      }
    }
  })

  it('en francés, mientras no tenga sus textos, el curso sale en inglés; en catalán, en castellano', () => {
    for (const unit of UNITS) {
      expect(unitIn(unit, 'fr'), unit.id).toBe(unit.en)
      expect(unitIn(unit, 'ca'), unit.id).toBe(unit.es)
    }
  })

  it('cada unidad se gana con su solución, con tres estrellas, y no empieza ganada', () => {
    for (const unit of UNITS) {
      expect(checkAttempt(unit, [], 0).done, unit.id).toBe(false)
      expect(checkAttempt(unit, unit.solution, 0), unit.id).toMatchObject({ done: true, stars: 3 })
      expect(goalOf(unit).par, unit.id).toBeGreaterThanOrEqual(0)
    }
  }, 30_000)

  it('los ejemplos se ejecutan sin romper el simulador', () => {
    for (const unit of UNITS)
      for (const step of exampleOf(unit))
        expect(step.output.join('\n'), `${unit.id}: ${step.line}`).not.toMatch(/error inesperado/)
  })

  it('los guiones se comprueban por lo que hacen, no por cómo se escriben', () => {
    const unit = UNITS.find((each) => each.id === 'if')

    if (unit === undefined) throw new Error('falta if')

    const other =
      "printf '#!/bin/bash\\n[[ -e /etc/peer4u/app.env ]] && echo ok && exit 0\\necho falta\\nexit 1\\n' > ~/check.sh"

    expect(checkAttempt(unit, [other], 0)).toMatchObject({ done: true, stars: 3 })
    expect(checkAttempt(unit, ["printf '#!/bin/bash\\necho ok\\n' > ~/check.sh"], 0)).toMatchObject(
      { done: false, misses: ['probe:2'] },
    )
  })
})

describe('shell simulada: no toca el sistema', () => {
  it('el motor y la plantilla no importan nada que lea ficheros, abra procesos o ejecute código', () => {
    for (const pkg of ['shellsim', 'course']) {
      const root = fileURLToPath(new URL(`../../../../packages/${pkg}/src`, import.meta.url))
      const sources = readdirSync(root, { recursive: true, encoding: 'utf8' })
        .filter((path) => path.endsWith('.ts'))
        .map((path) => readFileSync(join(root, path), 'utf8'))

      expect(sources.length).toBeGreaterThan(pkg === 'course' ? 2 : 10)
      for (const source of sources) {
        for (const [, from] of source.matchAll(/from '([^']+)'/g))
          expect(from).toMatch(/^(\.\.?\/|@sanatorio\/course$)/)
        // (`process.` con algo detrás: un texto como «para el proceso yes.» no es código.)
        expect(source).not.toMatch(
          /\beval\(|new Function|require\(|import\(|\bprocess\.\w|globalThis|new RegExp\(/,
        )
      }
    }
  })
})
