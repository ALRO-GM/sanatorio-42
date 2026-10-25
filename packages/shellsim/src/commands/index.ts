/**
 * Todos los programas de la shell simulada, por nombre, más `man` y `help`.
 * Lo que no está aquí (ni en las órdenes de la shell de `interp.ts`) da
 * «command not found», como en un servidor mínimo.
 */

import { AWK_COMMANDS } from './awk.js'
import { FILE_COMMANDS } from './files.js'
import { NET_COMMANDS } from './net.js'
import { SED_COMMANDS } from './sed.js'
import { KNOWN, SYSTEM_COMMANDS } from './system.js'
import { TEXT_COMMANDS } from './text.js'
import type { CommandFn } from './types.js'
import { Fail } from '../fs.js'

/** Una línea de qué hace y las opciones que más se usan (en inglés, como `man`). */
const MAN: Record<string, string> = {
  ls: 'ls [-l] [-a] [-h] [-t] [-S] [-r] [-R] [FILE]...  list directory contents\n  -l long format, -a include hidden (.files), -h human sizes, -t by time, -S by size, -r reverse',
  cd: 'cd [DIR]  change the working directory (~ home, - previous, .. parent)',
  pwd: 'pwd  print the current working directory',
  cat: 'cat [-n] [FILE]...  concatenate files and print them (-n number lines)',
  head: 'head [-n N] [FILE]...  first N lines (default 10)',
  tail: 'tail [-n N] [-n +N] [-f] [FILE]...  last N lines (+N: from line N on; -f follow)',
  less: 'less FILE  page through a file (here: prints it all)',
  wc: 'wc [-l] [-w] [-c] [FILE]...  count lines, words and bytes',
  mkdir: 'mkdir [-p] DIR...  make directories (-p: parents too, no error if it exists)',
  touch: 'touch FILE...  create empty files or update their time',
  cp: 'cp [-r] [-a] [-v] SRC... DEST  copy files (-r directories, -a keep owner/mode/time)',
  mv: 'mv SRC... DEST  move or rename',
  rm: 'rm [-r] [-f] [-v] FILE...  remove files (-r directories: there is no undo)',
  rmdir: 'rmdir DIR...  remove empty directories',
  ln: 'ln -s TARGET LINK  make a symbolic link',
  echo: 'echo [-n] [-e] TEXT...  print text (-n no newline, -e interpret \\n \\t)',
  printf: "printf FORMAT [ARG]...  formatted output: %s %d %5.2f %-10s, e.g. printf '%s\\n' a b",
  chmod: 'chmod [-R] MODE FILE...  change permissions: 755, 640, u+x, go-w, a=r',
  chown: 'chown [-R] USER[:GROUP] FILE...  change owner (root only)',
  chgrp: 'chgrp [-R] GROUP FILE...  change group',
  find: 'find [PATH...] [-name GLOB] [-type f|d] [-size +10M] [-mtime +7] [-user U] [-delete] [-exec CMD {} \\;]',
  grep: 'grep [-i] [-v] [-n] [-c] [-r] [-l] [-w] [-o] [-E] [-A N] [-B N] PATTERN [FILE]...  print lines that match',
  sort: 'sort [-n] [-r] [-u] [-h] [-k N] [-t SEP] [FILE]...  sort lines (-n numbers, -h 1K/1M/1G, -k column)',
  uniq: 'uniq [-c] [-d] [-u]  collapse repeated adjacent lines (sort first!) (-c count)',
  cut: 'cut -d SEP -f LIST | -c LIST [FILE]...  pick columns: cut -d: -f1 /etc/passwd',
  tr: "tr [-d] [-s] SET1 [SET2]  translate or delete characters: tr a-z A-Z, tr -d '\\r'",
  sed: "sed [-n] [-i] [-E] 's/OLD/NEW/g' [FILE]...  stream editor: substitute, delete (3d, /re/d), print (-n '5,10p')",
  awk: "awk [-F SEP] [-v VAR=X] 'PATTERN { ACTION }' [FILE]...  columns and sums: awk '{print $1}', awk '$9==500', awk '{s+=$2} END {print s}'",
  xargs: 'xargs [-n N] [-I {}] CMD  build commands from input lines: ... | xargs rm',
  tee: 'tee [-a] FILE...  copy input to files and to the output',
  diff: 'diff [-u] A B  compare two files line by line',
  tar: 'tar -czf ARCHIVE.tar.gz PATH...  create;  tar -tzf A  list;  tar -xzf A [-C DIR]  extract',
  gzip: 'gzip [-k] [-d] FILE  compress to FILE.gz (-k keep original, -d decompress)',
  du: 'du [-s] [-h] [-a] [-d N] [PATH]...  disk usage (du -sh * | sort -h)',
  df: 'df [-h]  free disk space per filesystem',
  ps: 'ps aux | ps -ef | ps -u USER | ps -o pid,cmd --sort=-%cpu  list processes',
  top: 'top  processes by CPU (here: one snapshot)',
  kill: 'kill [-15|-9|-HUP] PID...  send a signal (TERM asks nicely, KILL forces, HUP reloads)',
  pkill: 'pkill [-f] [-SIGNAL] PATTERN  signal processes by name',
  pgrep: 'pgrep [-a] [-f] [-u USER] PATTERN  find process ids by name',
  systemctl:
    'systemctl status|start|stop|restart|reload|enable|disable|is-active|list-units [--failed] UNIT',
  journalctl:
    'journalctl [-u UNIT] [-n N] [-p err] [--since "1 hour ago"] [-e] [-f]  read the system log',
  crontab:
    'crontab -l | crontab FILE | crontab -r  scheduled tasks: MIN HOUR DAY MONTH WEEKDAY COMMAND',
  sudo: 'sudo [-u USER] CMD | sudo -i  run as root (or another user)',
  ssh: 'ssh [USER@]HOST [CMD]  open a session on another machine (exit to come back) or run one command',
  scp: 'scp [-r] SRC [USER@]HOST:DEST  copy files between machines',
  rsync:
    'rsync -av [--delete] [-n] SRC/ [USER@]HOST:DEST/  sync directories (trailing / = contents)',
  curl: "curl [-s] [-I] [-i] [-o FILE] [-f] [-w '%{http_code}'] URL  talk HTTP",
  ping: 'ping -c N HOST  is it reachable?',
  dig: 'dig [+short] NAME  ask DNS for an address',
  ss: 'ss -tlnp  listening TCP ports and their processes (-p needs root)',
  id: 'id [USER]  user and group ids',
  useradd: 'useradd [-m] [-s SHELL] [-G G1,G2] NAME  create a user (root)',
  usermod: 'usermod -aG GROUP USER  add to a group (without -a it REPLACES the groups)',
  export: 'export NAME=VALUE  set an environment variable for programs',
  test: 'test EXPR | [ EXPR ]  -f file, -d dir, -z empty, -n not empty, = != strings, -eq -lt -gt numbers',
  apt: 'apt update | apt install [-y] PKG | apt remove PKG | apt list --installed',
  history: 'history [N]  commands typed so far',
  man: 'man CMD  this help (short version)',
  which: 'which CMD  where a command is',
  alias: "alias NAME='CMD'  shortcut for a command",
  date: "date [+FORMAT]  current date: date +%F, date '+%F %T'",
  jq: "jq [-r] FILTER  read JSON: jq .status, jq -r '.items[].name'",
  free: 'free -h  memory',
  uptime: 'uptime  time up and load average',
}

const man: CommandFn = (ctx) => {
  const name = ctx.args.find((arg) => !arg.startsWith('-'))

  if (name === undefined)
    throw new Fail("What manual page do you want?\nFor example, try 'man man'.")

  const page = MAN[name]

  if (page === undefined) {
    if (COMMANDS[name] === undefined) throw new Fail(`No manual entry for ${name}`, 16)
    ctx.io.out(`${name}: see '${name} --help' (no short page in this sandbox)\n`)

    return 0
  }
  ctx.io.out(`${name.toUpperCase()}(1)\n\nNAME\n  ${page}\n`)

  return 0
}

const help: CommandFn = (ctx) => {
  ctx.io.out(
    'GNU bash, version 5.2 (peer4u-sandbox)\nShell commands: cd pwd export unset set read source alias history type test [ [[ if for while case function\n' +
      'Programs: ls cat head tail wc mkdir touch cp mv rm ln chmod chown find grep sort uniq cut tr sed awk xargs tee diff tar gzip du df\n' +
      '          ps top kill pkill pgrep systemctl journalctl crontab sudo id useradd usermod apt ssh scp rsync curl ping dig ss ip jq\n' +
      "Type 'man NAME' for a short page.\n",
  )

  return 0
}

/** `service nginx restart` = `systemctl restart nginx`. */
const service: CommandFn = (ctx) => {
  const [name, verb = 'status'] = ctx.args

  if (name === undefined)
    throw new Fail(
      'Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]',
    )

  return ctx.sh.runArgv(['systemctl', verb, name], ctx.io)
}

export const COMMANDS: Record<string, CommandFn> = {
  ...FILE_COMMANDS,
  ...TEXT_COMMANDS,
  ...SED_COMMANDS,
  ...AWK_COMMANDS,
  ...SYSTEM_COMMANDS,
  ...NET_COMMANDS,
  man,
  help,
  service,
}

for (const name of Object.keys(COMMANDS)) KNOWN.add(name)
