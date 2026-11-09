/**
 * Revisión del curso de shell (2026-11-09, `docs/revision-cursos/shell.md`):
 * que el motor diga lo que dicen bash y GNU en Ubuntu (mensajes, códigos de
 * salida, formato) y que cada unidad acepte las otras formas buenas de
 * resolverla, no solo la de la solución, y siga rechazando las malas.
 */
import { checkAttempt, run, startOf, unitOf } from '@sanatorio/shellsim'
import type { Unit, World } from '@sanatorio/shellsim'
import { describe, expect, it } from 'vitest'

function unit(id: string): Unit {
  const found = unitOf(id)

  if (found === undefined) throw new Error(`no existe la unidad ${id}`)

  return found
}

/** Ejecuta varias órdenes desde el mundo de una unidad y devuelve lo de la última. */
function sh(id: string, ...entries: string[]): { out: string; code: number; world: World } {
  let world = startOf(unit(id))
  let last = { out: '', code: 0 }

  for (const entry of entries) {
    const result = run(world, entry)

    world = result.world
    last = { out: result.output.join('\n'), code: result.code }
  }

  return { ...last, world }
}

const done = (id: string, entries: string[]): boolean => checkAttempt(unit(id), entries).done

describe('mensajes y formato como GNU', () => {
  it('touch, cp, head, tail, sort, sed y awk firman sus errores como coreutils', () => {
    expect(sh('ls', 'touch /etc/x')).toMatchObject({
      out: "touch: cannot touch '/etc/x': Permission denied",
      code: 1,
    })
    expect(sh('ls', 'touch /nope/x').out).toBe(
      "touch: cannot touch '/nope/x': No such file or directory",
    )
    expect(sh('ls', 'cp /etc/hosts ~/nope/hosts').out).toBe(
      "cp: cannot create regular file '/home/peer/nope/hosts': No such file or directory",
    )
    expect(sh('ls', 'head 2 /etc/hostname').out).toBe(
      "head: cannot open '2' for reading: No such file or directory\n==> /etc/hostname <==\nweb1",
    )
    expect(sh('ls', 'tail /var/log').out).toBe("tail: error reading '/var/log': Is a directory")
    expect(sh('ls', 'sort nada.txt')).toMatchObject({
      out: 'sort: cannot read: nada.txt: No such file or directory',
      code: 2,
    })
    expect(sh('ls', 'sed p nada.txt').out).toBe(
      "sed: can't read nada.txt: No such file or directory",
    )
    expect(sh('ls', "awk '{print}' nada.txt").out).toBe(
      'awk: cannot open "nada.txt" (No such file or directory)',
    )
    // Varios ficheros: una línea en blanco entre cada bloque.
    expect(sh('ls', 'head -n 1 /etc/hostname /etc/hostname').out).toBe(
      '==> /etc/hostname <==\nweb1\n\n==> /etc/hostname <==\nweb1',
    )
  })

  it('chown sin ser root: «Operation not permitted», y sigue con los demás ficheros', () => {
    expect(sh('ls', 'chown peer /etc/hosts')).toMatchObject({
      out: "chown: changing ownership of '/etc/hosts': Operation not permitted",
      code: 1,
    })
    // Lo tuyo a ti mismo o a un grupo tuyo sí se puede (como en Linux).
    expect(sh('ls', 'chown peer:adm ~/notas.txt', 'ls -l ~/notas.txt').out).toContain('peer adm')
    expect(sh('ls', 'chown nadie ~/notas.txt').out).toBe("chown: invalid user: 'nadie'")
    expect(sh('ls', 'chown peer:nogrupo ~/notas.txt').out).toBe(
      "chown: invalid group: 'peer:nogrupo'",
    )
    expect(sh('ls', 'chown -R root ~/proyectos').out.split('\n')).toEqual([
      "chown: changing ownership of '/home/peer/proyectos': Operation not permitted",
      "chown: changing ownership of '/home/peer/proyectos/README.md': Operation not permitted",
    ])
    expect(sh('ls', 'chmod 999 ~/notas.txt').out).toBe("chmod: invalid mode: '999'")
    expect(sh('ls', 'chmod -Rv g+w ~/proyectos', 'ls -l ~/proyectos').out).toContain('-rw-rw-r--')
  })

  it('ls -l alinea sus columnas y con -h el total también va en K', () => {
    expect(sh('ls', 'ls -lh /var/log').out.split('\n')).toEqual([
      'total 16K',
      '-rw-r----- 1 syslog   adm 2.5K Oct 25 09:00 auth.log',
      'drwxr-xr-x 2 www-data adm 4.0K Sep 25 09:00 nginx',
      'drwxr-xr-x 2 deploy   adm 4.0K Sep 25 09:00 peer4u',
      '-rw-r----- 1 syslog   adm  184 Oct 25 09:00 syslog',
    ])
    expect(sh('ls', 'ls -l /var/log').out.split('\n')[0]).toBe('total 16')
  })

  it('ps aux | grep ve también el propio grep (y grep -v grep lo quita)', () => {
    const lines = sh('ls', 'ps aux | grep nginx').out.split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatch(/^peer +\d+ .* S\+ .* grep nginx$/)
    expect(sh('ls', 'ps aux | grep -v grep | grep nginx').out.split('\n')).toHaveLength(1)
    expect(sh('ls', 'ps').out.split('\n').at(-1)).toMatch(/ pts\/0 +00:00:00 ps$/)
    // `pid=` sin cabecera, con la anchura de procps; -p elige aunque no sea de tu terminal.
    expect(sh('ps', 'ps -C python3 -o pid=').out).toBe('   5004')
    expect(sh('ps', 'ps -o user= -p 5004').out).toBe('peer')
    expect(sh('ps', 'ps -eo pid,user,%cpu --sort=-%cpu | head -n 2').out).toBe(
      '    PID USER     %CPU\n   5004 peer     97.3',
    )
    expect(sh('ps', 'pidof python3').out).toBe('5004')
    expect(sh('ps', 'kill -l 9').out).toBe('KILL')
  })

  it('rsync: con barra copia lo de dentro, sin barra la carpeta, y -n --delete cuenta lo que borraría', () => {
    const prep = 'mkdir -p s/a d && echo 1 > s/a/f && echo 1 > d/z'

    expect(sh('ls', prep, 'rsync -a s d', 'ls d d/s').out).toBe('d:\ns  z\n\nd/s:\na')
    expect(sh('ls', prep, 'rsync -a s/ d', 'ls d').out).toBe('a  z')
    expect(sh('ls', prep, 'rsync -a s nueva', 'ls nueva').out).toBe('s')
    // Sin -v, rsync no dice nada; con -n tampoco toca nada.
    expect(sh('ls', prep, 'rsync -an --delete s/ d').out).toBe('')

    const dry = sh('ls', prep, 'rsync -avn --delete s/ d', 'ls d')

    expect(dry.out).toBe('z')

    const listed = sh('ls', prep, 'rsync -avn --delete s/ d').out.split('\n')

    expect(listed.slice(0, 5)).toEqual([
      'sending incremental file list',
      'deleting z',
      './',
      'a/',
      'a/f',
    ])
    expect(listed.at(-1)).toMatch(/^total size is 2 {2}speedup is [\d.]+ \(DRY RUN\)$/)
    // Lo que ya está igual no se vuelve a mandar.
    expect(sh('ls', prep, 'rsync -a s/ d', 'rsync -av s/ d').out.split('\n').slice(0, 2)).toEqual([
      'sending incremental file list',
      '',
    ])
    expect(sh('ls', 'rsync --delete proyectos/ x')).toMatchObject({ code: 1 })
  })

  it('tar avisa de la barra de delante y acaba en 2 si algo falta', () => {
    expect(sh('ls', 'tar -czf c.tgz /etc/nginx').out).toBe(
      "tar: Removing leading `/' from member names",
    )
    expect(sh('ls', 'tar -cfz notas.tar.gz notas.txt')).toMatchObject({
      out: 'tar: notas.tar.gz: Cannot stat: No such file or directory\ntar: Exiting with failure status due to previous errors',
      code: 2,
    })
  })

  it('find: un comodín sin comillas que se expande a varios da el error de GNU', () => {
    expect(sh('ls', 'cd /var/log/nginx', 'find . -name *.log')).toMatchObject({
      out: "find: paths must precede expression: `error.log'\nfind: possible unquoted pattern after predicate `-name'?",
      code: 1,
    })
    // -size cuenta también las carpetas (4096 bytes).
    expect(sh('ls', 'find /var/log -maxdepth 1 -size +3k').out).toBe(
      '/var/log\n/var/log/nginx\n/var/log/peer4u',
    )
    expect(sh('ls', "find ~ -name '*.txt' -print0 | xargs -0 wc -l").out).toContain('notas.txt')
  })

  it('dentro de un guion, bash firma con el guion y la línea', () => {
    expect(sh('ls', `printf '#!/bin/bash\\nset -u\\necho "$1"\\n' > v.sh`, 'bash v.sh').out).toBe(
      'v.sh: line 3: $1: unbound variable',
    )
    expect(sh('ls', "bash -c 'nada'").out).toBe('bash: line 1: nada: command not found')
    expect(sh('ls', 'nada').out).toBe('bash: nada: command not found')
  })

  it('crontab dice qué campo está mal, como cron de Debian', () => {
    expect(sh('ls', "echo '3 30 * * * /x.sh' | crontab -").out).toBe(
      '"-":1: bad hour\nerrors in crontab file, can\'t install.',
    )
    expect(sh('ls', "echo '30 3 * * /x.sh' | crontab -").out).toContain('bad day-of-week')
    expect(sh('ls', "echo '*/5 * * * 1-5 /x.sh' | crontab -").code).toBe(0)
  })

  it('órdenes que faltaban: pushd, su -c, gpasswd, adduser usuario grupo, install, sed \\U', () => {
    expect(sh('ls', 'pushd /var/log', 'popd').out).toBe('~')
    expect(sh('ls', "sudo su -c 'whoami'").out).toBe('root')
    expect(sh('ls', 'sudo gpasswd -a mgarcia www-data', 'id -Gn mgarcia').out).toBe(
      'mgarcia developers www-data',
    )
    expect(sh('ls', 'sudo adduser mgarcia www-data').out).toBe(
      "info: Adding user `mgarcia' to group `www-data' ...",
    )
    expect(
      sh('ls', 'sudo install -m 640 -o root -g adm ~/notas.txt /srv/n.txt', 'ls -l /srv/n.txt').out,
    ).toMatch(/^-rw-r----- 1 root adm /)
    expect(sh('ls', "echo hola | sed 's/.*/\\U&/'").out).toBe('HOLA')
    expect(sh('ls', 'df -h /var/log').out.split('\n')).toHaveLength(2)
    expect(sh('ls', 'gzip -9 notas.txt', 'ls').out).toBe('notas.txt.gz  proyectos')
    expect(sh('ls', 'mv -t proyectos notas.txt', 'ls proyectos').out).toBe('notas.txt  README.md')
  })

  it('sed -i necesita poder escribir en la carpeta, no solo en el fichero', () => {
    expect(sh('ls', "sudo -u deploy sed -i 's/a/b/' /etc/peer4u/app.env")).toMatchObject({
      out: "sed: couldn't open temporary file /etc/peer4u/sedAx3kPq: Permission denied",
      code: 4,
    })
  })
})

describe('cada unidad acepta las otras formas buenas', () => {
  it('bloques 1 y 2', () => {
    expect(done('ls', ['ls -la /srv/peer4u'])).toBe(true)
    expect(done('ls', ['cd /srv/peer4u', 'ls -1'])).toBe(true)
    expect(done('ls', ['man ls'])).toBe(false)
    expect(done('cd', ['pushd /var/log/nginx'])).toBe(true)
    expect(done('read', ['cat /var/log/peer4u/app.log | tail -5'])).toBe(true)
    expect(done('read', ['cat /var/log/peer4u/app.log'])).toBe(false)
    expect(
      done('mkdir', ['mkdir -p ~/deploy/{logs,config,releases}', '> ~/deploy/config/app.env']),
    ).toBe(true)
    expect(
      done('glob', [
        'mkdir -p ~/descargas/logs',
        'mv -t ~/descargas/logs ~/descargas/*.log',
        'rm -f ~/descargas/*.png',
      ]),
    ).toBe(true)
    expect(
      done('redirect', [
        'printf "Bienvenida a web1\\nMantenimiento: domingo 03:00\\n" > ~/motd.txt',
      ]),
    ).toBe(true)
  })

  it('bloque 3', () => {
    expect(done('perms', ['groups deploy'])).toBe(true)
    expect(done('perms', ['id -Gn deploy'])).toBe(true)
    expect(done('perms', ['id'])).toBe(false)
    expect(done('chmod', ['chmod u=rwx,go=rx scripts/backup.sh', 'chmod go= secrets.env'])).toBe(
      true,
    )
    expect(done('chown', ["sudo su -c 'chown -R deploy:www-data /srv/site'"])).toBe(true)
    expect(done('chown', ['sudo chown -Rv deploy.www-data /srv/site'])).toBe(true)
    expect(done('chown', ['chown -R deploy:www-data /srv/site'])).toBe(false)
    expect(
      done('users', ['sudo useradd -m -G developers lucia', 'sudo gpasswd -a mgarcia www-data']),
    ).toBe(true)
    expect(
      done('users', ['sudo useradd -m -G developers lucia', 'sudo adduser mgarcia www-data']),
    ).toBe(true)
    expect(
      done('boss3', [
        'sudo groupadd ops',
        'sudo useradd -m -G ops nora',
        'sudo usermod -aG ops peer',
        'sudo install -d -m 770 -g ops /srv/ops',
        'sudo install -m 640 -g ops ~/runbook.md /srv/ops/',
      ]),
    ).toBe(true)
  })

  it('bloques 4 a 6', () => {
    expect(done('cut-tr', ["cut -d: -f1 /etc/passwd | sed 's/.*/\\U&/'"])).toBe(true)
    expect(done('find', ['cd /var/log', "find . -name '*.log' -size +2k"])).toBe(true)
    expect(done('find-exec', ["find ~/cache -name '*.tmp' -mtime +7 -print0 | xargs -0 rm"])).toBe(
      true,
    )
    expect(
      done('boss5', [
        'sudo truncate --size=0 /var/log/peer4u/debug.log',
        'sudo gzip -9 /var/log/nginx/access.log.1 /var/log/nginx/access.log.2',
      ]),
    ).toBe(true)
    expect(done('ps', ['ps -C python3 -o pid= | tr -d " " > ~/pid.txt'])).toBe(true)
    expect(done('ps', ['pidof python3 > ~/pid.txt'])).toBe(true)
    expect(
      done('boss6', [
        'ps -o user= -p $(pgrep -f miner.py) > ~/culpable.txt',
        'sudo pkill stress-ng',
        'sudo pkill -9 -f miner.py',
        'ps -u deploy --no-headers | wc -l > ~/deploy-procs.txt',
      ]),
    ).toBe(true)
  })

  it('bloques 7 a 9', () => {
    expect(done('vars', ['mkdir ~/backups', 'cp ~/notas.txt ~/backups/notas-`date +%F`.txt'])).toBe(
      true,
    )
    expect(done('vars', ['mkdir ~/backups', 'cp ~/notas.txt ~/backups/notas-$(date -I).txt'])).toBe(
      true,
    )
    expect(
      done('journal', [
        'journalctl -xeu peer4u-api',
        "sudo sed -i 's/^PORT=.*/PORT=3000/' /etc/peer4u/app.env",
        'sudo systemctl restart peer4u-api',
      ]),
    ).toBe(true)
    for (const line of [
      '30 03 * * * /home/peer/backup.sh',
      '30 3 * * * bash /home/peer/backup.sh',
      '30 3 * * * /home/peer/backup.sh >> /home/peer/backup.log 2>&1',
      '30 3 * * 0-6 ~/backup.sh',
    ])
      expect(done('cron', [`echo '${line}' | crontab -`]), line).toBe(true)
    expect(done('cron', ["echo '3 30 * * * /home/peer/backup.sh' | crontab -"])).toBe(false)
    expect(done('ssh', ['mkdir ~/restore', "scp 'db1:/var/backups/db/*.sql.gz' ~/restore/"])).toBe(
      true,
    )
    expect(done('ssh', ['scp db1:/var/backups/db/peer4u-2026-10-24.sql.gz ~/restore/'])).toBe(false)
    expect(done('rsync', ['rsync -a --delete /var/www/html/ db1:~/espejo/'])).toBe(true)
    // Sin la barra, rsync deja html dentro de espejo y no lo deja igual.
    expect(done('rsync', ['rsync -av --delete /var/www/html db1:/home/peer/espejo/'])).toBe(false)
    expect(
      done('boss7', [
        'cat > ~/backup.sh <<\'EOF\'\n#!/bin/bash\nmkdir -p /home/peer/backups\nD=/home/peer/backups/proyectos-$(date +%F).tar.gz\ntar -czf $D /home/peer/proyectos\necho "copia: $D"\nEOF',
        'chmod +x ~/backup.sh',
        '~/backup.sh',
      ]),
    ).toBe(true)
  })
})

describe('tilde como bash sin modo POSIX (comprobado con bash 5.2)', () => {
  it('tras el `=` de una palabra con forma de asignación y tras sus `:`', () => {
    expect(sh('ls', 'echo a=~/b a+=~/c PATH=x:~/bin:~').out).toBe(
      'a=/home/peer/b a+=/home/peer/c PATH=x:/home/peer/bin:/home/peer',
    )
    expect(sh('ls', 'X=a:~/b:~', 'echo $X').out).toBe('a:/home/peer/b:/home/peer')
    expect(sh('ls', 'export Y=$HOME:~/bin', 'echo $Y').out).toBe('/home/peer:/home/peer/bin')
    expect(sh('ls', 'echo ~root/x a=~root ~nadie').out).toBe('/root/x a=/root ~nadie')
  })

  it('no con comillas, ni en medio de otra palabra, ni tras un `=` que no sigue a un nombre', () => {
    expect(
      sh(
        'ls',
        'echo "a=~/b" a="~/b" a=\\~/b x~/b a:~/c a=x=~/b 1a=~/b --from-env-file=~/x -f=~ a=b~/c',
      ).out,
    ).toBe('a=~/b a=~/b a=~/b x~/b a:~/c a=x=~/b 1a=~/b --from-env-file=~/x -f=~ a=b~/c')
    // En una asignación de verdad, solo tras el primer `=` y los `:`.
    expect(sh('ls', 'Z=a=~/z', 'echo $Z').out).toBe('a=~/z')
  })
})

describe('sed r, R y w como GNU sed 4.9', () => {
  const FILES = "printf 'uno\\ndos\\ntres\\n' > f; printf 'E1\\nE2\\n' > x"

  it('`r` mete el fichero tras la línea, en el orden de `a`, también con `d` y `-n`', () => {
    expect(sh('ls', FILES, "sed '/dos/r x' f").out).toBe('uno\ndos\nE1\nE2\ntres')
    expect(sh('ls', FILES, "sed '$r x' f").out).toBe('uno\ndos\ntres\nE1\nE2')
    expect(sh('ls', FILES, "sed -e '1r x' -e '1a hola' f").out).toBe('uno\nE1\nE2\nhola\ndos\ntres')
    expect(sh('ls', FILES, "sed -e '1r x' -e 1d f").out).toBe('E1\nE2\ndos\ntres')
    expect(sh('ls', FILES, "sed -n '1r x' f").out).toBe('E1\nE2')
    expect(sh('ls', FILES, "sed '1rx' f").out).toBe('uno\nE1\nE2\ndos\ntres')
    expect(sh('ls', FILES, "sed -i '1r x' f", 'cat f').out).toBe('uno\nE1\nE2\ndos\ntres')
  })

  it('`r` de lo que no se puede leer no mete nada; el nombre llega hasta el final de la línea', () => {
    expect(sh('ls', FILES, "sed '2r nada' f")).toMatchObject({ out: 'uno\ndos\ntres', code: 0 })
    // `x; p` es el nombre entero: no existe y `p` no se ejecuta.
    expect(sh('ls', FILES, "sed '1r x; p' f").out).toBe('uno\ndos\ntres')
    expect(sh('ls', FILES, 'sed r f')).toMatchObject({
      out: 'sed: -e expression #1, char 1: missing filename in r/R/w/W commands',
      code: 1,
    })
    expect(sh('ls', FILES, "sed '1r /tmp' f")).toMatchObject({
      out: 'sed: read error on /tmp: Is a directory',
      code: 4,
    })
  })

  it('`R` mete una línea del fichero en cada vuelta', () => {
    expect(sh('ls', FILES, "sed 'R x' f").out).toBe('uno\nE1\ndos\nE2\ntres')
  })

  it('`w` y `s///w` escriben lo elegido; el fichero se crea aunque no se escriba nada', () => {
    expect(sh('ls', FILES, "sed -n '/o/w out' f", 'cat out').out).toBe('uno\ndos')
    expect(sh('ls', FILES, "sed 's/o/0/w cambios' f", 'cat cambios').out).toBe('un0\nd0s')
    expect(sh('ls', FILES, "sed -n '/zzz/w vacio' f", 'wc -c vacio').out).toBe('0 vacio')
    expect(sh('ls', FILES, "sed -n '1w /dev/stdout' f").out).toBe('uno')
    expect(sh('ls', FILES, "sed 'w /nada/out' f")).toMatchObject({
      out: "sed: couldn't open file /nada/out: No such file or directory",
      code: 4,
    })
    expect(sh('ls', FILES, 'touch ro; chmod 444 ro', "sed 'w ro' f")).toMatchObject({
      out: "sed: couldn't open file ro: Permission denied",
      code: 4,
    })
  })
})
