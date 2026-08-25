import type { KarelLevel } from '@shared/types'

export const KAREL_LEVELS = [
  {
    id: 1,
    title: 'Nivel 1: Primeros Pasos',
    subtitle: 'Mundo, orientacion y movimiento basico.',
    objective: 'Avanza 3 esquinas hacia el Este y desconecta a Karel con apagate.',
    gridPosition: 'top-left',
    commands: ['avanza;', 'gira-izquierda;', 'apagate;'],
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  inicia-ejecucion
    avanza;
    avanza;
    avanza;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage:
      '¡Hola! Soy tu tutor de Karel el Robot. Karel vive en un mundo de calles (horizontales) y avenidas (verticales). Tus primeros 3 comandos son:\n\n- `avanza;` (avanza 1 esquina)\n- `gira-izquierda;` (gira 90° a la izquierda)\n- `apagate;` (termina el programa)\n\n¿Listo para tu primer reto? Intenta escribir un programa que mueva a Karel 3 esquinas al frente y se apague.',
  },
  {
    id: 2,
    title: 'Nivel 2: Mochila y Zumbadores',
    subtitle: 'Recoger y depositar beepers en el mundo.',
    objective: 'Ve a la esquina (1, 4), recoge el zumbador con coge-zumbador y regresa a tu cama (1, 1).',
    gridPosition: 'top-right',
    commands: ['coge-zumbador;', 'deja-zumbador;'],
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [{ street: 1, avenue: 4, count: 1 }],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  inicia-ejecucion
    avanza;
    coge-zumbador;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage:
      '¡Bienvenido al Nivel 2! En este nivel aprenderemos a usar la mochila de Karel y los zumbadores (beepers):\n\n- `coge-zumbador;` (toma un zumbador de la esquina actual)\n- `deja-zumbador;` (deja un zumbador de la mochila en la esquina)\n\nRecuerda: si ordenas recoger un zumbador en una esquina vacía, Karel marcará error. ¿Quieres ver cómo resolver el problema del periódico?',
  },
  {
    id: 3,
    title: 'Nivel 3: Repeticiones y Decisiones',
    subtitle: 'Estructuras repetir/veces y si/entonces condicional.',
    objective: 'Usa la sentencia repetir para recolectar los 3 zumbadores en linea recta.',
    gridPosition: 'bottom-left',
    commands: ['repetir N veces', 'si <condicion> entonces'],
    initialWorld: {
      karelPosition: { street: 2, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [
        { street: 2, avenue: 2, count: 1 },
        { street: 2, avenue: 3, count: 1 },
        { street: 2, avenue: 4, count: 1 },
      ],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  inicia-ejecucion
    repetir 3 veces inicio
      avanza;
      coge-zumbador;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage:
      '¡Entramos al Nivel 3! Para no repetir `avanza;` 10 veces manuales, usamos estructuras de control:\n\n```pascal\nrepetir 5 veces inicio\n   avanza;\nfin;\n```\n\nY para tomar decisiones según el entorno:\n```pascal\nsi junto-a-zumbador entonces inicio\n   coge-zumbador;\nfin;\n```\nCondiciones clave: `frente-libre`, `junto-a-zumbador`, `orientado-al-norte`.',
  },
  {
    id: 4,
    title: 'Nivel 4: Bucles y Procedimientos',
    subtitle: 'Bucles mientras/hacer y nuevas instrucciones.',
    objective: 'Crea la instruccion define-nueva-instruccion gira-derecha y recorre el pasillo con mientras frente-libre.',
    gridPosition: 'bottom-right',
    commands: ['mientras <condicion> hacer', 'define-nueva-instruccion'],
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [{ street: 5, avenue: 5, count: 1 }],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  define-nueva-instruccion gira-derecha como inicio
    repetir 3 veces inicio
      gira-izquierda;
    fin;
  fin;

  inicia-ejecucion
    mientras frente-libre hacer inicio
      avanza;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage:
      '¡Llegamos al Nivel 4! Karel puede adaptarse a distancias desconocidas con `mientras`:\n\n```pascal\nmientras frente-libre hacer inicio\n   avanza;\nfin;\n```\n\nAdemás, podemos enseñarle comandos nuevos como girar a la derecha:\n```pascal\ndefine-nueva-instruccion gira-derecha como inicio\n   repetir 3 veces inicio\n      gira-izquierda;\n   fin;\nfin;\n```\n¡Pregúntame cualquier duda o propón un problema!',
  },
] as const satisfies readonly KarelLevel[]

export const getKarelLevelById = (levelId: number): KarelLevel | null =>
  KAREL_LEVELS.find((level) => level.id === levelId) ?? null
