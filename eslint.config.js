import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const TS = ['**/*.ts', '**/*.tsx']

/**
 * Las reglas con tipos solo se aplican a TypeScript: un `.js` que no está en
 * ningún tsconfig no tiene tipos, y ESLint abortaría al encontrarlo.
 */
const onlyTs = (configs) => configs.map((config) => ({ ...config, files: TS }))

/**
 * Una sola configuración para todo el repositorio.
 *
 * 1. Con tipos: los errores de tipos se ven en el lint, no al compilar.
 * 2. Sin `any` implícito.
 * 3. Sin promesas sin `await`: un `await` olvidado es un bug silencioso.
 */
export default defineConfig(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/data/**', '.claude/**'],
  },
  js.configs.recommended,
  ...onlyTs(tseslint.configs.strictTypeChecked),
  ...onlyTs(tseslint.configs.stylisticTypeChecked),
  {
    files: TS,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Interpolar un número en un mensaje es normal; lo que no se quiere es
      // interpolar objetos o arrays por accidente.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Fronteras entre capas de la API: `core` e `integrations` no conocen los
    // módulos, y nadie importa las tripas de otro módulo salvo por su `index`.
    files: ['apps/api/src/core/**/*.ts', 'apps/api/src/integrations/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/**', '**/app/**'],
              message: '`core` e `integrations` no pueden depender de los módulos ni de la app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**'],
              message: 'Un módulo no puede depender de la composición de la app.',
            },
            {
              regex: '^\\.\\./[a-z-]+/(?!index\\.js$).+',
              message: 'De otro módulo solo se importa su `index.js`.',
            },
          ],
        },
      ],
    },
  },
  {
    // La composición también: de cada módulo, solo lo que publica su `index.js`.
    files: ['apps/api/src/app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./modules/[a-z-]+/(?!index\\.js$).+',
              message: 'De un módulo solo se importa su `index.js`.',
            },
          ],
        },
      ],
    },
  },
  {
    /**
     * Relajas solo para los tests de la API, y por razones concretas:
     * - `require-await`: un doble de `sleep` devuelve una promesa sin esperar nada.
     * - `no-floating-promises`: se disparan llamadas en paralelo a propósito,
     *   para probar la serialización del limitador.
     */
    files: ['apps/api/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-console': 'off',
    },
  },
  {
    /**
     * Fronteras entre funcionalidades de la web: una no importa las tripas de
     * otra. Lo que se comparte de hecho va a `shared/`. Quedan estas
     * excepciones, cada una porque una sección enseña, a propósito, una pieza
     * de otra:
     * - `notices/conversations`: `openChat` abre una conversación desde
     *   cualquier sitio (lo pide AGENTS.md).
     * - `calendar/EventDialog`: los avisos de `alerts` abren la ficha del evento.
     * - `facility/FacilityList|FacilityForm`: el panel, el staff y el mapa
     *   recogen y enseñan las incidencias de las instalaciones.
     * - `profile/HoursReport`: el panel enseña el informe de horas de cualquiera.
     * - `clicker/CapitalChart|CapitalHistory`: el panel sigue la partida de
     *   alguien con la misma gráfica que ve quien juega.
     * - `focus/FocusStatsView`: el panel enseña las cifras del Pomodoro de todos
     *   con la misma vista que cada cual ve de las suyas.
     * - `gitcourse/GitCourseTab` y `shellcourse/ShellCourseTab`: los cursos de git y de
     *   shell son pestañas de Not-games.
     * - `map/ProjectMap|ClusterMapView|SeatPicker`: la consulta y las terapias
     *   enseñan el mapa del clúster y eligen puestos en él.
     * - `map/SeatHeatMap`: la red de asientos enseña el uso de cada puesto sobre
     *   el plano del mapa, girado como cada cual lo tiene puesto allí.
     * - `help/BookHelp|tags`: la consulta reserva ayuda y el expediente enseña
     *   cómo te describieron quienes te ayudaron.
     * - `network/Meter|VerdictStats`: el expediente resume tu red de correcciones.
     * - `countdowns/CountdownDock|CountdownPicker`: el calendario tiene una vista de
     *   cuentas atrás con las mismas fichas y el mismo formulario que la ventanita.
     * - `agenda/GoalForm`: desde la vista de cuentas atrás se pone una meta nueva
     *   (y queda fijada) con el mismo formulario que en la agenda.
     */
    files: ['apps/web/src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^\\.\\./(?!\\.\\./)(?!(notices/conversations|calendar/EventDialog|facility/(FacilityList|FacilityForm)|profile/HoursReport|clicker/(CapitalChart|CapitalHistory)|focus/FocusStatsView|gitcourse/GitCourseTab|shellcourse/ShellCourseTab|map/(ProjectMap|ClusterMapView|SeatPicker|SeatHeatMap)|help/(BookHelp|tags)|network/(Meter|VerdictStats)|countdowns/(CountdownDock|CountdownPicker)|agenda/GoalForm)$)[a-z-]+/',
              message:
                'Una funcionalidad no importa de otra: lo compartido va a `shared/`. Las excepciones, con su porqué, están en eslint.config.js.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
)
