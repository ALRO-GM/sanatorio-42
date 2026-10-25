/**
 * El intérprete: recorre el árbol de una orden y la ejecuta sobre el mundo.
 * Tuberías (la salida de uno es la entrada del siguiente), redirecciones,
 * listas con `&&` y `||`, bucles, condiciones, funciones y guiones. Las
 * órdenes de la propia shell (`cd`, `export`, `read`, `exit`…) viven aquí; los
 * programas (`ls`, `grep`, `systemctl`…), en `commands/`.
 *
 * Nada de esto toca el ordenador: todo lee y escribe en `World`.
 */

import { COMMANDS } from './commands/index.js'
import type { Io, ShellApi } from './commands/types.js'
import { getopts, Stream } from './commands/types.js'
import { ArithError, arith, expandPattern, expandWord, globMatch, UnboundError } from './expand.js'
import type { ExpandEnv } from './expand.js'
import {
  baseOf,
  can,
  childrenOf,
  ENOENT,
  Fail,
  lookup,
  normalize,
  readText,
  writeText,
} from './fs.js'
import { Budget, drop, LIMITS, own, reserved } from './limits.js'
import type { Machine, Session, User, World } from './model.js'
import { EPOCH, ShellError } from './model.js'
import { Incomplete, parse } from './parse.js'
import type { AndOr, Command, List, Pipeline, Redir, Simple } from './parse.js'
import { testExpr } from './test.js'

/** Salir de un guion, de una función o de un bucle. */
class Exit extends Error {
  constructor(readonly code: number) {
    super('exit')
  }
}
class Return extends Error {
  constructor(readonly code: number) {
    super('return')
  }
}
class Break extends Error {
  constructor(
    readonly levels: number,
    readonly cont: boolean,
  ) {
    super('break')
  }
}

/** Lo que se ve en la pantalla, en orden: de la salida normal o de la de errores. */
type Line = { text: string; err: boolean }

type Frame = { args: string[]; locals: Map<string, string | undefined>[] }

export class Shell implements ShellApi {
  readonly budget = new Budget()
  readonly screen: Line[] = []
  private screenChars = 0
  depth = 0
  frames: Frame[] = [{ args: [], locals: [] }]
  /** Quién ejecuta de verdad (sudo lo cambia mientras dura su comando). */
  private as: string[] = []
  private lastBg = ''
  /** Dentro de una condición (`if`, `&&`, `||`, `!`) un fallo no para el guion (`set -e`). */
  private guarded = 0
  private name = 'bash'
  private nest = 0
  /** Las tuberías de la orden que cuentan para las estrellas (ver `pipeline`). */
  counted = 0

  constructor(readonly world: World) {}

  /* ---------- Lo que ven los comandos ---------- */

  session = (): Session => this.world.session
  machine = (): Machine => {
    const machine = own(this.world.machines, this.world.session.host)

    if (machine === undefined) throw new ShellError('peer4u-sandbox: máquina perdida')

    return machine
  }
  user = (): User => {
    const name = this.as.at(-1) ?? this.world.session.user
    const user = own(this.machine().users, name)

    if (user === undefined) throw new Fail(`${name}: no such user`)

    return user
  }
  now = (): number => EPOCH + this.world.clock
  abs = (path: string): string =>
    normalize(path, this.world.session.cwd, this.homeOf(this.world.session.user))

  private homeOf(name: string): string {
    return own(this.machine().users, name)?.home ?? '/'
  }

  pid = (machine = this.machine()): number => machine.nextPid++

  log = (unit: string, prio: number, msg: string, machine = this.machine()): void => {
    machine.journal.push({ t: this.world.clock, unit, prio, msg })
  }

  pushSession = (host: string, user: string): void => {
    const machine = own(this.world.machines, host)
    const account = machine === undefined ? undefined : own(machine.users, user)

    if (machine === undefined || account === undefined)
      throw new Fail(`${user}@${host}: Permission denied (publickey).`, 255)
    this.world.stack.push(this.world.session)
    this.world.session = freshSession(host, account, this.world.session.history)
  }

  runArgv = (argv: string[], io: Io, as?: string): number => {
    const umask = this.world.session.umask

    // Como sudo: la umask de quien llama, pero sin dejar nada escribible por el grupo ni el resto.
    if (as !== undefined) {
      this.as.push(as)
      this.world.session.umask = umask | 0o022
    }
    try {
      return this.dispatch(argv, io)
    } finally {
      if (as !== undefined) {
        this.as.pop()
        this.world.session.umask = umask
      }
    }
  }

  runRemote = (host: string, user: string, src: string, io: Io): number => {
    const saved = this.world.session
    const stack = this.world.stack.length

    this.pushSession(host, user)
    try {
      return this.source(src, io)
    } catch (signal) {
      if (signal instanceof Exit) return signal.code
      throw signal
    } finally {
      this.world.stack.length = stack
      this.world.session = saved
    }
  }

  /* ---------- Pantalla ---------- */

  private print(text: string, err: boolean): void {
    if (text === '') return
    if (this.screenChars > LIMITS.output) return
    this.screenChars += text.length
    if (this.screenChars > LIMITS.output) {
      this.screen.push({ text: text.slice(0, 200), err })
      this.screen.push({ text: '… (peer4u-sandbox: salida cortada)\n', err: true })

      return
    }
    this.screen.push({ text, err })
  }

  terminal(): Io {
    return {
      stdin: new Stream(''),
      tty: true,
      out: (text) => {
        this.print(text, false)
      },
      err: (text) => {
        this.print(text, true)
      },
    }
  }

  /* ---------- Variables ---------- */

  expandEnv(io: Io): ExpandEnv {
    return {
      budget: this.budget,
      get: (name) => this.getVar(name),
      set: (name, value) => {
        this.setVar(name, value)
      },
      positional: () => this.frame().args,
      special: (name) => this.special(name),
      home: () => this.homeOf(this.world.session.user),
      substitute: (src) => this.substitute(src, io),
      glob: (pattern) => this.glob(pattern),
      nounset: () => this.world.session.opts.nounset,
    }
  }

  private frame(): Frame {
    return this.frames.at(-1) ?? { args: [], locals: [] }
  }

  getVar(name: string): string | undefined {
    const session = this.world.session

    return own(session.vars, name) ?? own(session.env, name)
  }

  setVar(name: string, value: string, exported = false): void {
    if (reserved(name)) throw new Fail(`bash: ${name}: no vale como nombre de variable`)
    if (value.length > LIMITS.varChars)
      throw new ShellError(
        `peer4u-sandbox: ${name} es demasiado larga: como mucho ${LIMITS.varChars} caracteres`,
      )

    // Las locales de una función (`local`) son variables normales: al salir
    // de la función vuelven a su valor de antes (`callFunction`).
    const session = this.world.session

    if (exported || Object.hasOwn(session.env, name)) {
      session.env[name] = value
      drop(session.vars, name)
    } else session.vars[name] = value
  }

  private special(name: string): string | undefined {
    const args = this.frame().args

    switch (name) {
      case '?':
        return String(this.world.session.status)
      case '#':
        return String(args.length)
      case '@':
      case '*':
        return args.join(' ')
      case '$':
        return '4242'
      case '!':
        return this.lastBg
      case '0':
        return this.name
      case '-':
        return 'hB'
      case 'RANDOM': {
        this.world.seed = (this.world.seed * 1103515245 + 12345) % 2147483648

        return String(this.world.seed % 32768)
      }
      case 'PWD':
        return this.world.session.cwd
      case 'OLDPWD':
        return this.world.session.oldpwd
      case 'HOSTNAME':
        return this.world.session.host
      case 'UID':
        return String(this.user().uid)
      case 'SECONDS':
        return String(this.world.clock)
      default:
        return /^\d$/.test(name) ? args[Number(name) - 1] : undefined
    }
  }

  private glob(pattern: string): string[] {
    const absolute = pattern.startsWith('/')
    const parts = pattern.split('/').filter((part) => part !== '')
    let found = [absolute ? '/' : '']

    for (const part of parts) {
      const next: string[] = []

      for (const base of found) {
        const dir = base === '' ? this.world.session.cwd : this.abs(base)

        if (!/[*?[]/.test(part)) {
          const path =
            base === ''
              ? part.replace(/\\(.)/g, '$1')
              : `${base === '/' ? '' : base}/${part.replace(/\\(.)/g, '$1')}`

          if (lookup(this.machine(), this.user(), this.abs(path)) !== null) next.push(path)
          continue
        }

        let names: string[]

        try {
          const at = lookup(this.machine(), this.user(), dir)

          if (at?.node.kind !== 'dir' || !can(this.user(), at.node, 'r')) continue
          names = childrenOf(this.machine(), at.path)
        } catch {
          continue
        }
        for (const name of names) {
          if (name.startsWith('.') && !part.startsWith('.')) continue
          if (globMatch(part, name, this.budget))
            next.push(base === '' ? name : `${base === '/' ? '' : base}/${name}`)
        }
      }
      found = next
      if (found.length === 0) return []
    }

    return found.filter((path) => path !== '' && path !== '/').sort()
  }

  /* ---------- Ejecutar ---------- */

  /** Ejecuta el código de una orden (o de un guion) en esta shell. */
  source(src: string, io: Io): number {
    if (++this.depth > LIMITS.depth)
      throw new ShellError(
        'peer4u-sandbox: demasiada profundidad (¿un guion que se llama a sí mismo?)',
      )
    try {
      return this.list(parse(src), io)
    } finally {
      this.depth--
    }
  }

  private list(list: List, io: Io): number {
    let code = 0

    for (const item of list) code = this.andOr(item, io)

    return code
  }

  private andOr(node: AndOr, io: Io): number {
    if (node.bg) return this.background(node, io)

    const guard = node.rest.length > 0
    let code: number

    if (guard) this.guarded++
    try {
      code = this.pipeline(node.first, io)
      for (const [index, { op, pipe }] of node.rest.entries()) {
        if ((op === '&&') === (code === 0)) {
          // El último de la lista sí puede parar el guion con `set -e`.
          if (index === node.rest.length - 1) this.guarded--
          try {
            code = this.pipeline(pipe, io)
          } finally {
            if (index === node.rest.length - 1) this.guarded++
          }
        }
      }
    } finally {
      if (guard) this.guarded--
    }

    return code
  }

  /** `orden &`: se ejecuta, pero queda un proceso suyo (un `sleep` dura lo que dice). */
  private background(node: AndOr, io: Io): number {
    const machine = this.machine()
    const pid = this.pid()
    const first = node.first.cmds[0]
    const text = first?.t === 'simple' ? first.words.join(' ') : 'bash'
    const sleep = /^sleep (\d+)$/.exec(text)

    this.lastBg = String(pid)
    io.err(`[1] ${pid}\n`)
    machine.procs.push({
      pid,
      ppid: 4242,
      user: this.user().name,
      cmd: text,
      cpu: 0,
      mem: 0.1,
      rss: 1024,
      state: 'S',
      tty: 'pts/0',
      start: this.world.clock,
      ...(sleep === null ? {} : { until: this.world.clock + Number(sleep[1]) }),
    })
    if (sleep === null) {
      this.andOr({ ...node, bg: false }, io)
      // Lo que no es un `sleep` acaba enseguida en el simulador.
      machine.procs = machine.procs.filter((proc) => proc.pid !== pid)
    }
    this.world.session.status = 0

    return 0
  }

  private pipeline(pipe: Pipeline, io: Io): number {
    // Lo que se escribe en la terminal cuenta por tuberías: cada una que sale
    // bien y no es solo mirar es un comando (lo de dentro de un bucle o un
    // guion no suma aparte).
    const top = this.depth === 1 && this.nest === 0

    if (top) this.nest++
    if (pipe.neg) this.guarded++

    let code = 0
    const codes: number[] = []

    try {
      let input = io.stdin

      pipe.cmds.forEach((cmd, index) => {
        const last = index === pipe.cmds.length - 1
        let buffer = ''
        const stage: Io = {
          stdin: input,
          tty: last && io.tty === true,
          out: last
            ? io.out
            : (text) => {
                buffer += text
                if (buffer.length > LIMITS.fileChars * 4)
                  throw new ShellError('peer4u-sandbox: demasiado texto por la tubería')
              },
          err: io.err,
        }

        codes.push(this.command(cmd, stage))
        input = new Stream(buffer)
      })
      code = codes.at(-1) ?? 0
      if (this.world.session.opts.pipefail)
        code = [...codes].reverse().find((each) => each !== 0) ?? 0
    } finally {
      if (pipe.neg) this.guarded--
      if (top) this.nest--
    }
    if (pipe.neg) code = code === 0 ? 1 : 0
    if (top && code === 0 && !lookingOnly(pipe)) this.counted++
    this.world.session.status = code
    if (code !== 0 && this.world.session.opts.errexit && this.guarded === 0 && !pipe.neg)
      throw new Exit(code)

    return code
  }

  private command(cmd: Command, io: Io): number {
    this.budget.command()
    if (cmd.t === 'simple') return this.simple(cmd, io)
    if (cmd.t === 'func') {
      this.world.session.funcs[cmd.name] = cmd.body

      return 0
    }

    return this.withRedirs(cmd.redirs, io, (inner) => {
      switch (cmd.t) {
        case 'group':
          return cmd.subshell
            ? this.subshell(() => this.list(cmd.body, inner))
            : this.list(cmd.body, inner)
        case 'if': {
          for (const clause of cmd.clauses) {
            this.guarded++

            let test: number

            try {
              test = this.list(clause.cond, inner)
            } finally {
              this.guarded--
            }
            if (test === 0) return this.list(clause.body, inner)
          }

          return cmd.otherwise === null ? 0 : this.list(cmd.otherwise, inner)
        }
        case 'for': {
          const env = this.expandEnv(inner)
          const items =
            cmd.items === null
              ? this.frame().args
              : cmd.items.flatMap((word) => expandWord(word, env))

          return this.loop(items.length, (i) => {
            this.setVar(cmd.name, items[i] ?? '')

            return this.list(cmd.body, inner)
          })
        }
        case 'cfor': {
          const env = this.expandEnv(inner)

          arith(cmd.init, env)

          return this.loop(
            Infinity,
            () => {
              if (cmd.test.trim() !== '' && arith(cmd.test, env) === 0) return null

              const code = this.list(cmd.body, inner)

              arith(cmd.step, env)

              return code
            },
            () => {
              arith(cmd.step, env)
            },
          )
        }
        case 'while':
          return this.loop(Infinity, () => {
            this.guarded++

            let test: number

            try {
              test = this.list(cmd.cond, inner)
            } finally {
              this.guarded--
            }
            if ((test === 0) === cmd.until) return null

            return this.list(cmd.body, inner)
          })
        case 'case': {
          const env = this.expandEnv(inner)
          const word = expandWord(cmd.word, env, { split: false, glob: false }).join(' ')

          for (const arm of cmd.arms)
            if (
              arm.patterns.some((pattern) =>
                globMatch(expandPattern(pattern, env), word, this.budget),
              )
            )
              return this.list(arm.body, inner)

          return 0
        }
        case 'arith': {
          const value = arith(cmd.expr, this.expandEnv(inner))

          return value === 0 ? 1 : 0
        }
        case 'cond':
          return this.cond(cmd.words, inner)
      }
    })
  }

  /** Un bucle con tope de vueltas; `step` devuelve `null` para salir. */
  private loop(count: number, step: (i: number) => number | null, onContinue?: () => void): number {
    let code = 0

    for (let i = 0; i < count; i++) {
      if (i >= LIMITS.loop)
        throw new ShellError(
          `peer4u-sandbox: más de ${LIMITS.loop} vueltas en un bucle: se para aquí`,
        )
      this.budget.tick(10)
      try {
        const result = step(i)

        if (result === null) break
        code = result
      } catch (signal) {
        if (!(signal instanceof Break)) throw signal
        if (signal.levels > 1) throw new Break(signal.levels - 1, signal.cont)
        if (!signal.cont) break
        onContinue?.()
      }
    }

    return code
  }

  private cond(words: string[], io: Io): number {
    const env = this.expandEnv(io)
    // `[[ ]]`: sin división en palabras ni ficheros; el lado derecho de == es un patrón.
    const args: string[] = []

    for (const [index, word] of words.entries()) {
      const previous = words[index - 1]

      if (previous === '==' || previous === '!=' || previous === '=')
        args.push(`\u0000${expandPattern(word, env)}`)
      else if (previous === '=~')
        args.push(`\u0001${expandWord(word, env, { split: false, glob: false }).join(' ')}`)
      else args.push(...expandWord(word, env, { split: false, glob: false }))
    }

    return testExpr(args, this, true)
  }

  private subshell(fn: () => number): number {
    const saved = JSON.stringify(this.world.session)

    try {
      return fn()
    } catch (signal) {
      if (signal instanceof Exit) return signal.code
      throw signal
    } finally {
      const history = this.world.session.history

      this.world.session = JSON.parse(saved) as Session
      this.world.session.history = history
    }
  }

  private substitute(src: string, io: Io): string {
    let out = ''
    const inner: Io = {
      stdin: new Stream(''),
      out: (text) => {
        out += text
        if (out.length > LIMITS.varChars * 2)
          throw new ShellError('peer4u-sandbox: $(…) devuelve demasiado texto')
      },
      err: io.err,
    }

    this.subshell(() => this.source(src, inner))

    return out.replace(/\n+$/, '')
  }

  /* ---------- Redirecciones ---------- */

  private withRedirs(redirs: Redir[], io: Io, fn: (io: Io) => number): number {
    if (redirs.length === 0) return fn(io)

    const env = this.expandEnv(io)
    let current: Io = { ...io }
    const writes: { path: string; shown: string; text: string; append: boolean }[] = []

    for (const redir of redirs) {
      if (redir.op === '<<') {
        const body = redir.body?.text ?? ''
        const text = redir.body?.expand === true ? heredoc(body, env) : body

        current = { ...current, stdin: new Stream(text) }
        continue
      }

      const targets = expandWord(redir.target, env)

      if (targets.length !== 1) throw new Fail(`bash: ${redir.target}: ambiguous redirect`)

      const target = targets[0] ?? ''

      if (redir.op === '<<<') {
        current = { ...current, stdin: new Stream(`${target}\n`) }
        continue
      }
      if (redir.op === '>&') {
        if (target === '1') current = { ...current, err: current.out }
        else if (target === '2') current = { ...current, out: current.err, tty: false }
        else if (target !== '-') throw new Fail(`bash: ${target}: ambiguous redirect`)
        continue
      }
      if (redir.op === '<') {
        current = {
          ...current,
          stdin: new Stream(
            readText(this.machine(), this.user(), this.abs(target), 'bash', target),
          ),
        }
        continue
      }

      const path = this.abs(target)
      const append = redir.op === '>>' || redir.op === '&>>'
      const sink = (text: string) => {
        const entry = writes.find((each) => each.path === path)

        if (entry === undefined) throw new ShellError('peer4u-sandbox: redirección perdida')
        entry.text += text
        if (entry.text.length > LIMITS.fileChars)
          throw new ShellError(
            `peer4u-sandbox: ${target} sería demasiado grande: como mucho ${LIMITS.fileChars} caracteres`,
          )
      }

      if (path === '/dev/null') {
        const drop = () => undefined

        if (redir.op === '&>' || redir.op === '&>>')
          current = { ...current, out: drop, err: drop, tty: false }
        else if (redir.fd === 2) current = { ...current, err: drop }
        else current = { ...current, out: drop, tty: false }
        continue
      }
      if (path === '/dev/stderr') {
        current = { ...current, out: io.err, tty: false }
        continue
      }
      // Como en bash, `>` vacía el fichero antes de ejecutar (`sort f > f` lo deja vacío).
      writeText(this.machine(), this.user(), path, '', {
        append: true,
        cmd: 'bash',
        shown: target,
        now: this.now(),
        umask: this.world.session.umask,
      })
      if (!append)
        writeText(this.machine(), this.user(), path, '', {
          cmd: 'bash',
          shown: target,
          now: this.now(),
          umask: this.world.session.umask,
        })
      if (!writes.some((each) => each.path === path))
        writes.push({ path, shown: target, text: '', append: true })
      if (redir.op === '&>' || redir.op === '&>>')
        current = { ...current, out: sink, err: sink, tty: false }
      else if (redir.fd === 2) current = { ...current, err: sink }
      else current = { ...current, out: sink, tty: false }
    }

    try {
      return fn(current)
    } finally {
      for (const write of writes)
        writeText(this.machine(), this.user(), write.path, write.text, {
          append: true,
          cmd: 'bash',
          shown: write.shown,
          now: this.now(),
          umask: this.world.session.umask,
        })
    }
  }

  /* ---------- Una orden simple ---------- */

  private simple(cmd: Simple, io: Io): number {
    const env = this.expandEnv(io)
    let argv: string[]
    const assigns: [string, string][] = []

    try {
      for (const assign of cmd.assigns) {
        const at = assign.indexOf('=')
        const plus = assign[at - 1] === '+'
        const name = assign.slice(0, plus ? at - 1 : at)
        const value = expandWord(assign.slice(at + 1), env, { split: false, glob: false }).join(' ')

        assigns.push([name, plus ? (this.getVar(name) ?? '') + value : value])
      }
      argv = cmd.words.flatMap((word) => expandWord(word, env))
    } catch (error) {
      if (error instanceof UnboundError || error instanceof ArithError || error instanceof Fail) {
        io.err(`${error.message}\n`)
        if (error instanceof UnboundError && this.depth > 1) throw new Exit(1)

        return 1
      }
      throw error
    }

    const alias = argv[0] === undefined ? undefined : own(this.world.session.aliases, argv[0])

    if (alias !== undefined && this.depth <= 2)
      argv = [...alias.split(/\s+/).filter(Boolean), ...argv.slice(1)]
    if (argv.length === 0) {
      for (const [name, value] of assigns) this.setVar(name, value)

      return this.withRedirs(cmd.redirs, io, () => 0)
    }
    if (this.world.session.opts.xtrace) io.err(`+ ${argv.join(' ')}\n`)

    // `X=1 orden`: la variable solo para esa orden.
    const saved = assigns.map(([name]) => [name, own(this.world.session.env, name)] as const)

    for (const [name, value] of assigns) this.world.session.env[name] = value
    try {
      return this.withRedirs(cmd.redirs, io, (inner) => this.dispatch(argv, inner))
    } catch (error) {
      if (error instanceof Fail) {
        io.err(`${error.message}\n`)

        return error.code
      }
      throw error
    } finally {
      for (const [name, value] of saved) {
        if (value === undefined) drop(this.world.session.env, name)
        else this.world.session.env[name] = value
      }
    }
  }

  /** Busca y ejecuta: función, orden de la shell, guion del PATH o programa. */
  private dispatch(argv: string[], io: Io): number {
    const [name = '', ...args] = argv

    try {
      const func = own(this.world.session.funcs, name)

      if (func !== undefined) return this.callFunction(func as Command, args, io)

      const builtin = own(BUILTINS, name)

      if (builtin !== undefined) return builtin(this, args, io)
      if (name.includes('/')) return this.runFile(name, args, io)

      const script = this.inPath(name)

      if (script !== null) return this.runFile(script, args, io)

      const program = own(COMMANDS, name)

      if (program !== undefined) {
        const installed = own(PACKAGED, name)

        if (installed !== undefined && own(this.machine().packages, installed) === undefined)
          return notFound(name, io, installed)

        return program({ name, args, io, sh: this })
      }
      if (EDITORS.has(name)) {
        io.err(
          `${name}: aquí no hay editor a pantalla completa. Escribe ficheros con: cat > fichero <<'EOF' (varias líneas y EOF al final), echo 'texto' > fichero o sed -i\n`,
        )

        return 1
      }

      return notFound(name, io)
    } catch (error) {
      if (error instanceof Fail) {
        io.err(`${error.message}\n`)

        return error.code
      }
      throw error
    }
  }

  private inPath(name: string): string | null {
    const path = this.getVar('PATH') ?? ''

    for (const dir of path.split(':')) {
      if (
        dir === '' ||
        dir === '/usr/bin' ||
        dir === '/bin' ||
        dir === '/usr/sbin' ||
        dir === '/sbin'
      )
        continue

      const full = `${dir.replace(/\/$/, '')}/${name}`

      try {
        const found = lookup(this.machine(), this.user(), this.abs(full))

        if (found?.node.kind === 'file') return full
      } catch {
        continue
      }
    }

    return null
  }

  private callFunction(body: Command, args: string[], io: Io): number {
    if (this.frames.length > LIMITS.depth)
      throw new ShellError(
        'peer4u-sandbox: demasiadas funciones una dentro de otra (¿se llama a sí misma?)',
      )
    this.frames.push({ args, locals: [new Map<string, string | undefined>()] })
    try {
      return this.command(body, io)
    } catch (signal) {
      if (signal instanceof Return) return signal.code
      throw signal
    } finally {
      const frame = this.frames.pop()

      // Las locales vuelven a su valor de antes.
      for (const scope of frame?.locals ?? [])
        for (const [name, value] of scope) {
          if (value === undefined) drop(this.world.session.vars, name)
          else this.world.session.vars[name] = value
        }
    }
  }

  /** `./guion.sh`, `/usr/local/bin/x` o `bash guion.sh`: un guion, en una shell hija. */
  runFile(path: string, args: string[], io: Io, viaShell = false): number {
    const full = this.abs(path)
    const found = lookup(this.machine(), this.user(), full)

    if (found === null) {
      // `/usr/bin/ls` y compañía: el programa simulado.
      const program = own(COMMANDS, baseOf(full))

      if (program !== undefined && /^\/(usr\/)?s?bin\//.test(full))
        return program({ name: baseOf(full), args, io, sh: this })
      throw new Fail(`bash: ${path}: ${ENOENT}`, 127)
    }
    if (found.node.kind === 'dir') throw new Fail(`bash: ${path}: Is a directory`, 126)
    if (!viaShell && !can(this.user(), found.node, 'x'))
      throw new Fail(`bash: ${path}: Permission denied`, 126)
    if (!can(this.user(), found.node, 'r')) throw new Fail(`bash: ${path}: Permission denied`, 126)

    const text = found.node.kind === 'file' ? found.node.text : ''

    if (!viaShell && !text.startsWith('#!') && text.includes('\u0000'))
      throw new Fail(`bash: ${path}: cannot execute binary file`, 126)

    return this.script(text, path, args, io)
  }

  private script(text: string, name: string, args: string[], io: Io): number {
    const saved = JSON.stringify(this.world.session)
    const savedName = this.name

    this.frames.push({ args, locals: [] })
    this.name = name
    // Un guion empieza sin las opciones de la shell que lo llama (ni sus variables sin exportar).
    this.world.session.vars = {}
    this.world.session.funcs = {}
    this.world.session.opts = { errexit: false, nounset: false, pipefail: false, xtrace: false }
    try {
      return this.source(text, io)
    } catch (signal) {
      if (signal instanceof Exit) return signal.code
      if (signal instanceof Incomplete) {
        io.err(`${name}: line ${text.split('\n').length}: syntax error: unexpected end of file\n`)

        return 2
      }
      if (signal instanceof ShellError && signal.message.startsWith('bash: syntax')) {
        io.err(`${name}: ${signal.message.slice(6)}\n`)

        return 2
      }
      throw signal
    } finally {
      this.frames.pop()
      this.name = savedName

      const history = this.world.session.history
      const host = this.world.session.host

      // Si el guion abrió sesiones (ssh), se cierran al acabar.
      if (host !== (JSON.parse(saved) as Session).host) this.world.stack.pop()
      this.world.session = JSON.parse(saved) as Session
      this.world.session.history = history
    }
  }

  /** La orden entera, desde la terminal. */
  entry(src: string): number {
    const io = this.terminal()

    try {
      return this.source(src, io)
    } catch (signal) {
      if (signal instanceof Exit) return signal.code
      if (signal instanceof Return) return signal.code
      if (signal instanceof Break) return 0
      throw signal
    }
  }
}

/**
 * Lo que solo mira y no cambia nada: no cuenta para las estrellas (como
 * `git status` en el curso de git). Solo si va solo, sin tubería ni
 * redirección: `cat f > g` sí cuenta.
 */
const LOOKING = new Set([
  'ls',
  'pwd',
  'cat',
  'less',
  'more',
  'man',
  'help',
  'history',
  'clear',
  'whoami',
  'id',
  'groups',
  'tree',
  'stat',
  'file',
  'type',
  'which',
  'hostname',
  'date',
  'uptime',
  'free',
  'df',
  'ps',
  'top',
  'htop',
  'jobs',
  'echo',
  'env',
  'printenv',
  'test',
  '[',
  '[[',
  'true',
  ':',
])

function lookingOnly(pipe: Pipeline): boolean {
  const [only] = pipe.cmds

  return (
    pipe.cmds.length === 1 &&
    only?.t === 'simple' &&
    only.redirs.length === 0 &&
    only.assigns.length === 0 &&
    LOOKING.has(only.words[0] ?? '')
  )
}

/** Programas que no vienen instalados: hay que instalarlos con `apt`. */
const PACKAGED: Record<string, string> = { htop: 'htop', tree: 'tree', jq: 'jq', rg: 'ripgrep' }

const EDITORS = new Set(['nano', 'vim', 'vi', 'emacs', 'pico', 'ed', 'code'])

function notFound(name: string, io: Io, pkg?: string): number {
  io.err(
    pkg === undefined
      ? `bash: ${name}: command not found\n`
      : `Command '${name}' not found, but can be installed with:\nsudo apt install ${pkg}\n`,
  )

  return 127
}

/** El cuerpo de un heredoc sin comillas: con variables y `$(…)`, pero sin dividir. */
function heredoc(body: string, env: ExpandEnv): string {
  const raw = `"${body.replace(/\\(?![$`\\])/g, '\\\\').replace(/"/g, '\\"')}"`

  return expandWord(raw, env, { split: false, glob: false }).join(' ')
}

export function freshSession(host: string, user: User, history: string[] = []): Session {
  return {
    host,
    user: user.name,
    cwd: user.home,
    env: {
      HOME: user.home,
      USER: user.name,
      LOGNAME: user.name,
      SHELL: user.shell,
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      LANG: 'C.UTF-8',
      TERM: 'xterm-256color',
    },
    vars: {},
    status: 0,
    opts: { errexit: false, nounset: false, pipefail: false, xtrace: false },
    aliases: user.uid === 0 ? {} : { ll: 'ls -alF', la: 'ls -A' },
    funcs: {},
    history,
    oldpwd: user.home,
    umask: user.uid === 0 ? 0o022 : 0o002,
  }
}

/* ---------- Órdenes de la shell ---------- */

type Builtin = (sh: Shell, args: string[], io: Io) => number

const assignName = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * El nombre del `eval` de bash, como clave calculada: así no se confunde con
 * el `eval` de JavaScript, que el motor no usa nunca (un test lo vigila).
 */
const BASH_EVAL = 'eval'

const BUILTINS: Record<string, Builtin> = {
  cd(sh, args, io) {
    const session = sh.session()
    const target =
      args[0] === undefined ? (session.env.HOME ?? '/') : args[0] === '-' ? session.oldpwd : args[0]
    const path = sh.abs(target)
    const found = lookup(sh.machine(), sh.user(), path)

    if (found === null) throw new Fail(`bash: cd: ${target}: ${ENOENT}`)
    if (found.node.kind !== 'dir') throw new Fail(`bash: cd: ${target}: Not a directory`)
    if (!can(sh.user(), found.node, 'x')) throw new Fail(`bash: cd: ${target}: Permission denied`)
    session.oldpwd = session.cwd
    session.cwd = path
    session.env.PWD = path
    if (args[0] === '-') io.out(`${path}\n`)

    return 0
  },
  pwd(sh, _args, io) {
    io.out(`${sh.session().cwd}\n`)

    return 0
  },
  export(sh, args, io) {
    if (args.length === 0 || args[0] === '-p') {
      for (const [name, value] of Object.entries(sh.session().env).sort())
        io.out(`declare -x ${name}="${value}"\n`)

      return 0
    }
    for (const arg of args) {
      const at = arg.indexOf('=')
      const name = at < 0 ? arg : arg.slice(0, at)

      if (!assignName.test(name)) throw new Fail(`bash: export: \`${arg}': not a valid identifier`)
      sh.setVar(name, at < 0 ? (sh.getVar(name) ?? '') : arg.slice(at + 1), true)
    }

    return 0
  },
  unset(sh, args) {
    for (const name of args.filter((arg) => !arg.startsWith('-'))) {
      drop(sh.session().vars, name)
      drop(sh.session().env, name)
      drop(sh.session().funcs, name)
    }

    return 0
  },
  local(sh, args) {
    const frame = sh.frames.at(-1)
    const scope = frame?.locals.at(-1)

    if (scope === undefined) throw new Fail('bash: local: can only be used in a function')
    for (const arg of args) {
      const at = arg.indexOf('=')
      const name = at < 0 ? arg : arg.slice(0, at)

      if (!scope.has(name)) scope.set(name, own(sh.session().vars, name))
      sh.session().vars[name] = at < 0 ? '' : arg.slice(at + 1)
    }

    return 0
  },
  declare(sh, args, io) {
    const rest = args.filter((arg) => !arg.startsWith('-'))

    if (rest.length === 0) {
      for (const [name, value] of Object.entries({
        ...sh.session().env,
        ...sh.session().vars,
      }).sort())
        io.out(`${name}=${value}\n`)

      return 0
    }
    for (const arg of rest) {
      const at = arg.indexOf('=')

      sh.setVar(
        at < 0 ? arg : arg.slice(0, at),
        at < 0 ? '' : arg.slice(at + 1),
        args.includes('-x'),
      )
    }

    return 0
  },
  set(sh, args, io) {
    const opts = sh.session().opts

    if (args.length === 0) {
      for (const [name, value] of Object.entries({
        ...sh.session().env,
        ...sh.session().vars,
      }).sort())
        io.out(`${name}=${value}\n`)

      return 0
    }
    for (let i = 0; i < args.length; i++) {
      const arg = args[i] ?? ''
      const on = arg.startsWith('-')

      if (arg === '-o' || arg === '+o') {
        const name = args[++i]

        if (name === 'pipefail') opts.pipefail = on
        else if (name === 'errexit') opts.errexit = on
        else if (name === 'nounset') opts.nounset = on
        else if (name === 'xtrace') opts.xtrace = on
        else throw new Fail(`bash: set: ${name ?? ''}: invalid option name`, 2)
        continue
      }
      if (/^[-+][euxo]+$/.test(arg)) {
        for (const c of arg.slice(1)) {
          if (c === 'e') opts.errexit = on
          if (c === 'u') opts.nounset = on
          if (c === 'x') opts.xtrace = on
          if (c === 'o') {
            const name = args[++i]

            if (name === 'pipefail') opts.pipefail = on
          }
        }
        continue
      }
      if (arg === '--') {
        sh.frames.at(-1)?.args.splice(0, Infinity, ...args.slice(i + 1))
        break
      }
      throw new Fail(`bash: set: ${arg}: invalid option`, 2)
    }

    return 0
  },
  shift(sh, args) {
    const frame = sh.frames.at(-1) ?? { args: [], locals: [] }

    frame.args = frame.args.slice(Number(args[0] ?? 1))

    return 0
  },
  read(sh, args, io) {
    const { flags, values, rest } = getopts(args, 'p')
    const prompt = values.get('p')

    if (prompt !== undefined) io.err(prompt)

    const line = io.stdin.readLine()

    if (line === null) return 1

    const text = flags.has('r') ? line : line.replace(/\\(.)/g, '$1')
    const names = rest.length === 0 ? ['REPLY'] : rest
    const parts = text.trim().split(/[ \t]+/)

    names.forEach((name, index) => {
      sh.setVar(
        name,
        index === names.length - 1 ? parts.slice(index).join(' ') : (parts[index] ?? ''),
      )
    })

    return 0
  },
  exit(sh, args, io) {
    const code = Number(args[0] ?? sh.session().status) & 255

    if (sh.depth > 1) throw new Exit(code)
    if (sh.world.stack.length > 0) {
      const back = sh.world.stack.pop() ?? sh.session()

      // Volver de `sudo -i` o `su` es solo «logout»; de un `ssh`, también se cierra la conexión.
      io.out(
        back.host === sh.session().host
          ? 'logout\n'
          : `logout\nConnection to ${sh.session().host} closed.\n`,
      )
      back.history = sh.session().history
      sh.world.session = back

      return 0
    }
    io.err('exit: esta es la terminal del curso: no hay a dónde salir (sigue jugando)\n')

    return 0
  },
  logout(sh, args, io) {
    return BUILTINS.exit?.(sh, args, io) ?? 0
  },
  return(_sh, args) {
    throw new Return(Number(args[0] ?? 0))
  },
  break(_sh, args) {
    throw new Break(Number(args[0] ?? 1), false)
  },
  continue(_sh, args) {
    throw new Break(Number(args[0] ?? 1), true)
  },
  source(sh, args, io) {
    const [file, ...rest] = args

    if (file === undefined) throw new Fail('bash: source: filename argument required', 2)

    const text = readText(sh.machine(), sh.user(), sh.abs(file), 'bash', file)
    const frames = sh.frames

    if (rest.length > 0) frames.push({ args: rest, locals: [] })
    try {
      return sh.source(text, io)
    } finally {
      if (rest.length > 0) frames.pop()
    }
  },
  '.'(sh, args, io) {
    return BUILTINS.source?.(sh, args, io) ?? 0
  },
  bash(sh, args, io) {
    const { values, rest } = getopts(args, 'c')
    const code = values.get('c')

    if (code !== undefined) return sh.source(code, io)
    if (rest[0] === undefined) {
      io.err('bash: ya estás en bash (aquí no se abre otra shell interactiva)\n')

      return 0
    }

    return sh.runFile(rest[0], rest.slice(1), io, true)
  },
  sh(sh, args, io) {
    return BUILTINS.bash?.(sh, args, io) ?? 0
  },
  // `eval` de bash: vuelve a leer el texto como una orden (dentro del simulador).
  [BASH_EVAL](sh, args, io) {
    return sh.source(args.join(' '), io)
  },
  alias(sh, args, io) {
    const aliases = sh.session().aliases

    if (args.length === 0) {
      for (const [name, value] of Object.entries(aliases)) io.out(`alias ${name}='${value}'\n`)

      return 0
    }
    for (const arg of args) {
      const at = arg.indexOf('=')

      if (at < 0) {
        const value = own(aliases, arg)

        if (value === undefined) throw new Fail(`bash: alias: ${arg}: not found`)
        io.out(`alias ${arg}='${value}'\n`)
      } else {
        const name = arg.slice(0, at)

        if (!assignName.test(name)) throw new Fail(`bash: alias: \`${name}': invalid alias name`)
        aliases[name] = arg.slice(at + 1)
      }
    }

    return 0
  },
  unalias(sh, args) {
    for (const name of args) drop(sh.session().aliases, name)

    return 0
  },
  history(sh, args, io) {
    const all = sh.session().history
    const n = args[0] === undefined ? all.length : Number(args[0])

    all.slice(-n).forEach((line, index) => {
      io.out(`${String(all.length - Math.min(n, all.length) + index + 1).padStart(5)}  ${line}\n`)
    })

    return 0
  },
  type(sh, args, io) {
    let code = 0

    for (const name of args.filter((arg) => !arg.startsWith('-'))) {
      if (own(sh.session().aliases, name) !== undefined)
        io.out(`${name} is aliased to \`${sh.session().aliases[name] ?? ''}'\n`)
      else if (own(sh.session().funcs, name) !== undefined) io.out(`${name} is a function\n`)
      else if (own(BUILTINS, name) !== undefined) io.out(`${name} is a shell builtin\n`)
      else if (own(COMMANDS, name) !== undefined) io.out(`${name} is /usr/bin/${name}\n`)
      else {
        io.err(`bash: type: ${name}: not found\n`)
        code = 1
      }
    }

    return code
  },
  command(sh, args, io) {
    if (args[0] === '-v') {
      const name = args[1] ?? ''

      if (own(BUILTINS, name) !== undefined) io.out(`${name}\n`)
      else if (own(COMMANDS, name) !== undefined) io.out(`/usr/bin/${name}\n`)
      else return 1

      return 0
    }

    return sh.runArgv(args, io)
  },
  true: () => 0,
  false: () => 1,
  ':': () => 0,
  test(sh, args) {
    return testExpr(args, sh, false)
  },
  '['(sh, args) {
    if (args.at(-1) !== ']') throw new Fail("bash: [: missing `]'", 2)

    return testExpr(args.slice(0, -1), sh, false)
  },
  let(sh, args, io) {
    let value = 0

    for (const arg of args) value = arith(arg, sh.expandEnv(io))

    return value === 0 ? 1 : 0
  },
  umask(sh, args, io) {
    if (args[0] === undefined) {
      io.out(`${sh.session().umask.toString(8).padStart(4, '0')}\n`)

      return 0
    }
    if (!/^[0-7]{1,4}$/.test(args[0]))
      throw new Fail(`bash: umask: ${args[0]}: octal number out of range`)
    sh.session().umask = parseInt(args[0], 8)

    return 0
  },
  wait: () => 0,
  jobs(sh, _args, io) {
    const mine = sh
      .machine()
      .procs.filter((proc) => proc.tty === 'pts/0' && proc.until !== undefined)

    mine.forEach((proc, index) => {
      io.out(
        `[${index + 1}]${index === mine.length - 1 ? '+' : '-'}  Running                 ${proc.cmd} &\n`,
      )
    })

    return 0
  },
  time(sh, args, io) {
    const code = sh.runArgv(args, io)

    io.err('\nreal\t0m0.004s\nuser\t0m0.001s\nsys\t0m0.002s\n')

    return code
  },
  sudo(sh, args, io) {
    const { flags, values, rest } = getopts(args, 'u', {}, true)
    const user = sh.user()

    if (user.uid !== 0 && !user.groups.includes('sudo') && !user.groups.includes('wheel')) {
      io.err(`${user.name} is not in the sudoers file.  This incident will be reported.\n`)

      return 1
    }
    if (
      flags.has('i') ||
      flags.has('s') ||
      (rest.length === 0 && flags.size === 0 && values.size === 0)
    ) {
      if (rest.length === 0) {
        sh.pushSession(sh.session().host, values.get('u') ?? 'root')

        return 0
      }
    }
    if (rest.length === 0)
      throw new Fail('usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command', 1)

    return sh.runArgv(rest, io, values.get('u') ?? 'root')
  },
  su(sh, args, io) {
    const rest = args.filter((arg) => arg !== '-' && arg !== '-l')
    const target = rest[0] ?? 'root'

    if (sh.user().uid !== 0) {
      io.err(
        'su: Authentication failure (en el simulador nadie sabe la contraseña: usa sudo -i o sudo -u)\n',
      )

      return 1
    }
    sh.pushSession(sh.session().host, target)

    return 0
  },
  sleep(sh, args) {
    const seconds = Number((args[0] ?? '0').replace(/s$/, ''))

    if (!Number.isFinite(seconds) || seconds < 0)
      throw new Fail(`sleep: invalid time interval '${args[0] ?? ''}'`)
    // El reloj del mundo avanza, pero nadie espera de verdad.
    sh.world.clock += Math.min(Math.round(seconds), 3600)

    return 0
  },
  nohup(sh, args, io) {
    io.err("nohup: ignoring input and appending output to 'nohup.out'\n")

    let text = ''
    const code = sh.runArgv(args, { ...io, out: (chunk) => (text += chunk) })

    writeText(sh.machine(), sh.user(), sh.abs('nohup.out'), text, {
      append: true,
      cmd: 'nohup',
      now: sh.now(),
      umask: sh.session().umask,
    })

    return code
  },
}

/** Lo que devuelve ejecutar una orden en la terminal. */
export type RunResult = {
  ok: boolean
  code: number
  /** Cuántas tuberías de la orden cuentan para las estrellas (las que salen bien y cambian algo). */
  counted: number
  /** Lo que se ve, línea a línea (errores incluidos). */
  output: string[]
  /** Solo la salida normal (sin errores), para comparar respuestas. */
  stdout: string
  world: World
  /** La orden está a medias (falta cerrar algo): la terminal pide otra línea. */
  incomplete?: boolean
}
