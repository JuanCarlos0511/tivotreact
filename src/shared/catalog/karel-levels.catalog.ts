import type { KarelLevel } from '@shared/types'

export const KAREL_LEVELS = [
  {
    id: 1,
    title: 'Nivel 1: Primeros Pasos',
    description: 'Mundo, orientacion y movimiento basico.',
    gridPosition: 'top-left',
    commands: ['avanza;', 'gira-izquierda;', 'apagate;'],
    world: {
      start: { avenue: 1, street: 1, direction: 'este' },
      goal: { avenue: 5, street: 1 },
      beepers: [],
      walls: [],
    },
    initialMessage:
      '¡Hola! Soy tu tutor de Karel el Robot. Karel vive en un mundo de calles (horizontales) y avenidas (verticales). Tus primeros 3 comandos son:\n\n- `avanza;` (avanza 1 esquina)\n- `gira-izquierda;` (gira 90° a la izquierda)\n- `apagate;` (termina el programa)\n\n¿Listo para tu primer reto? Intenta escribir un programa que mueva a Karel 3 esquinas al frente y se apague.',
  },
  {
    id: 2,
    title: 'Nivel 2: Mochila y Zumbadores',
    description: 'Recoger y depositar beepers en el mundo.',
    gridPosition: 'top-right',
    commands: ['coge-zumbador;', 'deja-zumbador;'],
    world: {
      start: { avenue: 1, street: 1, direction: 'este' },
      goal: { avenue: 1, street: 1 },
      beepers: [{ avenue: 3, street: 1, count: 1 }],
      walls: [],
      backpack: 0,
    },
    initialMessage:
      '¡Bienvenido al Nivel 2! En este nivel aprenderemos a usar la mochila de Karel y los zumbadores (beepers):\n\n- `coge-zumbador;` (toma un zumbador de la esquina actual)\n- `deja-zumbador;` (deja un zumbador de la mochila en la esquina)\n\nRecuerda: si ordenas recoger un zumbador en una esquina vacía, Karel marcará error. ¿Quieres ver cómo resolver el problema del periódico?',
  },
  {
    id: 3,
    title: 'Nivel 3: Repeticiones y Decisiones',
    description: 'Estructuras repetir/veces y si/entonces condicional.',
    gridPosition: 'bottom-left',
    commands: ['repetir N veces', 'si <condicion> entonces'],
    world: {
      start: { avenue: 1, street: 1, direction: 'este' },
      goal: { avenue: 15, street: 1 },
      beepers: [],
      walls: [],
    },
    initialMessage:
      '¡Entramos al Nivel 3! Para no repetir `avanza;` 10 veces manuales, usamos estructuras de control:\n\n```pascal\nrepetir 5 veces inicio\n   avanza;\nfin;\n```\n\nY para tomar decisiones según el entorno:\n```pascal\nsi junto-a-zumbador entonces inicio\n   coge-zumbador;\nfin;\n```\nCondiciones clave: `frente-libre`, `junto-a-zumbador`, `orientado-al-norte`.',
  },
  {
    id: 4,
    title: 'Nivel 4: Bucles y Procedimientos',
    description: 'Bucles mientras/hacer y nuevas instrucciones.',
    gridPosition: 'bottom-right',
    commands: ['mientras <condicion> hacer', 'define-nueva-instruccion'],
    world: {
      start: { avenue: 1, street: 1, direction: 'este' },
      goal: { avenue: null, street: 1 },
      beepers: [],
      walls: ['east-boundary'],
    },
    initialMessage:
      '¡Llegamos al Nivel 4! Karel puede adaptarse a distancias desconocidas con `mientras`:\n\n```pascal\nmientras frente-libre hacer inicio\n   avanza;\nfin;\n```\n\nAdemás, podemos enseñarle comandos nuevos como girar a la derecha:\n```pascal\ndefine-nueva-instruccion gira-derecha como inicio\n   repetir 3 veces inicio\n      gira-izquierda;\n   fin;\nfin;\n```\n¡Pregúntame cualquier duda o propón un problema!',
  },
] as const satisfies readonly KarelLevel[]

export const getKarelLevelById = (levelId: number): KarelLevel | null =>
  KAREL_LEVELS.find((level) => level.id === levelId) ?? null
