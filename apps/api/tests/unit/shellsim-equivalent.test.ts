/**
 * Formas equivalentes: en el curso de shell cuenta lo que consigues, no cómo
 * lo escribes. Cada variante de aquí resuelve su unidad con las mismas
 * estrellas que la solución de referencia (`docs/curso-shell.md`).
 */
import { checkAttempt, UNITS } from '@sanatorio/shellsim'
import { describe, expect, it } from 'vitest'

const VARIANTS: Record<string, string[][]> = {
  ls: [['ls /srv/peer4u/'], ['ls -1 /srv/peer4u'], ['ls /srv/../srv/peer4u']],
  cd: [['cd /var/log/nginx/'], ['cd ~/../../var/log/nginx']],
  read: [
    ['tail -5 /var/log/peer4u/app.log'],
    ['tail -n5 /var/log/peer4u/app.log'],
    ['cat /var/log/peer4u/app.log | tail -n 5'],
  ],
  mkdir: [
    ['mkdir -p ~/deploy/{logs,config,releases}', 'touch ~/deploy/config/app.env'],
    ['mkdir -p ~/deploy/logs ~/deploy/config ~/deploy/releases', '> ~/deploy/config/app.env'],
  ],
  redirect: [
    ["printf 'Bienvenida a web1\\nMantenimiento: domingo 03:00\\n' > ~/motd.txt"],
    ["cat > ~/motd.txt <<'EOF'\nBienvenida a web1\nMantenimiento: domingo 03:00\nEOF"],
  ],
  chmod: [
    ['chmod u=rwx,go=rx ~/scripts/backup.sh', 'chmod go-r ~/secrets.env'],
    ['chmod +x ~/scripts/backup.sh', 'chmod 0600 ~/secrets.env'],
  ],
  pipes: [
    ['cat /var/log/nginx/access.log | wc -l'],
    ["grep -c '' /var/log/nginx/access.log"],
    ["awk 'END {print NR}' /var/log/nginx/access.log"],
  ],
  grep: [
    ['grep -w ERROR /var/log/peer4u/app.log'],
    ["awk '/ERROR/' /var/log/peer4u/app.log"],
    ['cat /var/log/peer4u/app.log | grep "ERROR"'],
  ],
  'sort-uniq': [
    ["awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -3"],
    ["cut -d ' ' -f 1 /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n3"],
  ],
  sed: [
    ["sed -i 's/info/debug/' ~/app.env"],
    ["sed -i -e 's|LOG_LEVEL=info|LOG_LEVEL=debug|' ~/app.env"],
  ],
  awk: [
    ['awk \'$9 == "200" { total += $10 } END { print total }\' /var/log/nginx/access.log'],
    ["grep '\" 200 ' /var/log/nginx/access.log | awk '{s+=$10} END {print s}'"],
  ],
  find: [
    ["find /var/log -type f -name '*.log' -size +2k"],
    ['find /var/log -name "*.log" -size +2k -print'],
  ],
  'find-exec': [
    ["find ~/cache -name '*.tmp' -mtime +7 -exec rm {} \\;"],
    ["find ~/cache -name '*.tmp' -mtime +7 | xargs rm"],
  ],
  tar: [
    ['mkdir ~/backups', 'tar -C /etc -czf ~/backups/nginx-conf.tar.gz nginx'],
    ['mkdir ~/backups', 'tar czf ~/backups/nginx-conf.tar.gz /etc/nginx/'],
  ],
  kill: [
    ['pkill -x yes', 'pkill -KILL -f miner'],
    ['kill $(pgrep yes)', 'kill -9 $(pgrep -f miner.py)'],
  ],
  'exit-codes': [
    [
      '[ -f /etc/peer4u/app.env ] && touch ~/listo.txt',
      '[ -e /etc/peer4u/old.env ] || touch ~/fallo.txt',
    ],
    [
      'if test -f /etc/peer4u/app.env; then touch ~/listo.txt; fi',
      'if [ ! -f /etc/peer4u/old.env ]; then touch ~/fallo.txt; fi',
    ],
  ],
  loops: [
    ['for c in ~/configs/*.conf; do cp "$c" "$c".bak; done'],
    ['ls ~/configs/*.conf | while read -r f; do cp "$f" "$f.bak"; done'],
  ],
  systemctl: [['sudo systemctl enable --now nginx.service']],
  cron: [
    ["echo '30 3 * * * ~/backup.sh' | crontab -"],
    ["(crontab -l; echo '30  3  *  *  *  /home/peer/backup.sh') | crontab -"],
  ],
  curl: [
    ['curl -s localhost/api/health > ~/health.json'],
    ['wget -q -O ~/health.json http://localhost/api/health'],
  ],
  ssh: [
    ['mkdir ~/restore', 'rsync -a db1:/var/backups/db/peer4u-2026-10-24.sql.gz ~/restore/'],
    ['mkdir ~/restore && cd ~/restore && scp peer@db1:/var/backups/db/peer4u-2026-10-24.sql.gz .'],
  ],
}

describe('curso de shell: formas equivalentes', () => {
  for (const [id, variants] of Object.entries(VARIANTS)) {
    it(id, () => {
      const unit = UNITS.find((each) => each.id === id)

      if (unit === undefined) throw new Error(`falta ${id}`)
      for (const variant of variants)
        expect(checkAttempt(unit, variant, 0), variant.join(' ; ')).toMatchObject({
          done: true,
          stars: 3,
        })
    })
  }

  /** Más pasos también resuelven, aunque con menos estrellas: cada paso que cambia algo cuenta. */
  const LONGER: Record<string, string[]> = {
    cd: ['cd /var/log', 'cd nginx'],
    ls: ['cd /srv/peer4u', 'ls'],
    systemctl: ['sudo systemctl start nginx', 'sudo systemctl enable nginx'],
    sed: ["sed 's/=info/=debug/' ~/app.env > /tmp/x && mv /tmp/x ~/app.env"],
    curl: ['cd ~ && wget -q -O health.json http://localhost/api/health'],
  }

  for (const [id, entries] of Object.entries(LONGER)) {
    it(`${id}, con más pasos`, () => {
      const unit = UNITS.find((each) => each.id === id)

      if (unit === undefined) throw new Error(`falta ${id}`)
      expect(checkAttempt(unit, entries, 0)).toMatchObject({ done: true, stars: 2 })
    })
  }

  it('equivocarse y luego hacerlo bien también vale (aunque con menos estrellas)', () => {
    const unit = UNITS.find((each) => each.id === 'chmod')

    if (unit === undefined) throw new Error('falta chmod')

    const slow = checkAttempt(
      unit,
      [
        'chmod 777 ~/secrets.env',
        'chmod 644 ~/scripts/backup.sh',
        'chmod 755 ~/scripts/backup.sh',
        'chmod 600 ~/secrets.env',
      ],
      0,
    )

    expect(slow).toMatchObject({ done: true, stars: 2, commands: 4 })
    // Lo que falla no cuenta.
    expect(
      checkAttempt(
        unit,
        ['chmod 755 ~/nada', 'chmod 755 ~/scripts/backup.sh', 'chmod 600 ~/secrets.env'],
        0,
      ),
    ).toMatchObject({ stars: 3, commands: 2 })
  })

  it('una respuesta escrita a mano no vale si la unidad pide calcularla', () => {
    const unit = UNITS.find((each) => each.id === 'du-df')

    if (unit === undefined) throw new Error('falta du-df')
    expect(checkAttempt(unit, ['echo videos > ~/mayor.txt'], 0)).toMatchObject({
      done: false,
      misses: ['requires:du'],
    })
  })
})
