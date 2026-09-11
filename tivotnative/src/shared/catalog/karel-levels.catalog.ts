import type { KarelLevel } from '../types'

export const KAREL_LEVELS: KarelLevel[] = [
  {
    id: 1,
    title: "Nivel 1: Primeros Pasos",
    subtitle: "Movimiento básico línea recta",
    objective: "Avanza desde la esquina inferior izquierda (1,1) hasta la esquina inferior derecha (1,8).",
    gridPosition: 'top-left',
    commands: ['avanza;'],
    quickCommands: ['avanza'],
    conditions: [],
    goal: { position: { street: 1, avenue: 8 } },
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  avanza;
finalizar-programa`,
    initialMessage: "¡Bienvenido a Karel el Robot! En este primer nivel aprenderás a moverte en línea recta. Tu meta es llevar a Karel desde la esquina (1,1) hasta la (1,8) utilizando únicamente la instrucción `avanza;` consecutivamente.",
  },
  {
    id: 2,
    title: "Nivel 2: Repeticiones",
    subtitle: "Uso de bucles repetir/veces",
    objective: "Llega de la esquina (1,1) a la (1,8) optimizando tu código con la estructura 'repetir N veces'.",
    gridPosition: 'top-right',
    commands: ['repetir N veces', 'avanza;'],
    quickCommands: ['repetir', 'avanza'],
    conditions: [],
    goal: { position: { street: 1, avenue: 8 } },
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  repetir 7 veces inicio
    avanza;
  fin;
finalizar-programa`,
    initialMessage: "¡Nivel 2! En lugar de escribir `avanza;` 7 veces seguidas, podemos usar una estructura de control para repetir instrucciones:\n\n```pascal\nrepetir 7 veces inicio\n  avanza;\nfin;\n```\n\nEl botón Repite ya incluye `avanza;` dentro del bloque. Cambia el número de veces y ejecuta para ver cómo Karel recorre la calle con menos líneas de código.",
  },
  {
    id: 3,
    title: "Nivel 3: Giros y Contorno",
    subtitle: "Giros y repeticiones en el perímetro",
    objective: "Recorre el contorno completo del mapa 8x8 dando la vuelta entera hasta regresar al inicio (1,1). Combina 'repetir' y 'avanza' para recorrer cada lado, y 'gira-izquierda' para cambiar de dirección en las esquinas.",
    gridPosition: 'bottom-left',
    commands: ['avanza;', 'gira-izquierda;', 'repetir N veces'],
    quickCommands: ['avanza', 'gira-izquierda', 'repetir'],
    conditions: [],
    goal: {
      position: { street: 1, avenue: 1 },
      direction: 'ESTE',
      requiredVisits: [
        { street: 1, avenue: 8 },
        { street: 8, avenue: 8 },
        { street: 8, avenue: 1 },
      ],
    },
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  repetir 4 veces inicio
    repetir 7 veces inicio
      avanza;
    fin;
    gira-izquierda;
  fin;
finalizar-programa`,
    initialMessage: "¡Nivel 3! Tu objetivo es dar la vuelta completa por todo el borde del mundo hasta volver a (1,1). Utiliza la combinación de `repetir` para recorrer cada lado y añade `gira-izquierda;` al terminar cada lado para continuar por el contorno.",
  },
  {
    id: 4,
    title: "Nivel 4: Mochilas y Fichas",
    subtitle: "Decisiones y recolección de fichas",
    objective: "Da la vuelta completa por el contorno del mapa y recoge todas las fichas que encuentres en el camino usando 'si junto-a-ficha' y 'coge-ficha'.",
    gridPosition: 'bottom-right',
    commands: ['avanza;', 'gira-izquierda;', 'repetir N veces', 'si junto-a-ficha entonces', 'coge-ficha;'],
    quickCommands: ['avanza', 'gira-izquierda', 'repetir', 'si', 'coge-ficha'],
    conditions: ['junto-a-ficha'],
    goal: {
      position: { street: 1, avenue: 1 },
      direction: 'ESTE',
      requireAllBeepers: true,
      requiredVisits: [
        { street: 1, avenue: 8 },
        { street: 8, avenue: 8 },
        { street: 8, avenue: 1 },
      ],
    },
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [
        { street: 1, avenue: 4, count: 1 },
        { street: 5, avenue: 8, count: 1 },
        { street: 8, avenue: 3, count: 1 },
        { street: 4, avenue: 1, count: 1 },
      ],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  repetir 4 veces inicio
    repetir 7 veces inicio
      si junto-a-ficha entonces inicio
        coge-ficha;
      fin;
      avanza;
    fin;
    gira-izquierda;
  fin;
finalizar-programa`,
    initialMessage: "¡Nivel 4: Mochilas y Fichas! En este nivel, mientras recorres el contorno encontrarás fichas en el camino. Antes de avanzar en cada esquina, verifica con `si junto-a-ficha` para recoger la ficha con `coge-ficha;` y guardarla en tu mochila.",
  },
]

export const getKarelLevelById = (levelId: number): KarelLevel | null =>
  KAREL_LEVELS.find((level) => level.id === levelId) ?? null

export const createKarelChallenge = (): KarelLevel => {
  const street = 1 + Math.floor(Math.random() * 8)
  const startAvenue = 1 + Math.floor(Math.random() * 4)
  const difficulty = 1 + Math.floor(Math.random() * 3)
  const cells = Array.from({ length: 64 }, (_, index) => ({
    street: Math.floor(index / 8) + 1,
    avenue: (index % 8) + 1,
  }))
  // Sample distinct cells across the whole map, rather than just ahead of Karel.
  const beepers = Array.from({ length: difficulty + 1 }, () => {
    const index = Math.floor(Math.random() * cells.length)
    const cell = cells.splice(index, 1)[0] ?? { street: 1, avenue: 1 }
    return { ...cell, count: 1 }
  })
  const difficultyLabel = ['Inicial', 'Intermedia', 'Avanzada'][difficulty - 1] ?? 'Inicial'
  const goal = { street, avenue: startAvenue }
  const objective = `Recoge todas las fichas de la cuadrícula y regresa a la meta en la calle ${goal.street}, avenida ${goal.avenue}. Empiezas mirando al este.`

  return {
    id: -Date.now(),
    mode: 'challenge',
    title: 'Recolección dinámica',
    subtitle: `Dificultad ${difficultyLabel.toLowerCase()}`,
    objective,
    gridPosition: 'bottom-right',
    commands: ['avanza;', 'gira-izquierda;', 'repetir N veces', 'si junto-a-ficha entonces', 'coge-ficha;'],
    quickCommands: ['avanza', 'gira-izquierda', 'repetir', 'si', 'coge-ficha'],
    conditions: ['junto-a-ficha'],
    goal: { position: goal, requireAllBeepers: true },
    initialWorld: {
      karelPosition: { street, avenue: startAvenue },
      karelDirection: 'ESTE',
      beepers,
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  avanza;
finalizar-programa`,
    initialMessage: '',
  }
}
