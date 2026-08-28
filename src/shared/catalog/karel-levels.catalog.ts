import type { KarelLevel } from '@shared/types'

export const KAREL_LEVELS: KarelLevel[] = [
  {
    id: 1,
    title: "Nivel 1: Primeros Pasos",
    subtitle: "Movimiento básico línea recta",
    objective: "Avanza desde la esquina inferior izquierda (1,1) hasta la esquina inferior derecha (1,8) y apaga a Karel.",
    gridPosition: 'top-left',
    commands: ['avanza;', 'apagate;'],
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  inicia-ejecucion
    avanza;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage: "¡Bienvenido a Karel el Robot! En este primer nivel aprenderás a moverte en línea recta. Tu meta es llevar a Karel desde la esquina (1,1) hasta la (1,8) utilizando únicamente la instrucción `avanza;` consecutivamente y terminar con `apagate;`.",
  },
  {
    id: 2,
    title: "Nivel 2: Repeticiones",
    subtitle: "Uso de bucles repetir/veces",
    objective: "Llega de la esquina (1,1) a la (1,8) optimizando tu código con la estructura 'repetir N veces'.",
    gridPosition: 'top-right',
    commands: ['repetir N veces'],
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  inicia-ejecucion
    repetir 7 veces inicio
      avanza;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage: "¡Nivel 2! En lugar de escribir `avanza;` 7 veces seguidas, podemos usar una estructura de control para repetir instrucciones:\n\n```pascal\nrepetir 7 veces inicio\n  avanza;\nfin;\n```\n\nPrueba a compilar y ejecutar para ver cómo Karel recorre la calle con menos líneas de código.",
  },
  {
    id: 3,
    title: "Nivel 3: Decisiones y Contorno",
    subtitle: "Recorrer el perímetro del mapa",
    objective: "Recorre el contorno completo del mapa 8x8 dando la vuelta entera hasta regresar al inicio (1,1). Usa repeticiones para avanzar y decisiones con giros al llegar a cada pared.",
    gridPosition: 'bottom-left',
    commands: ['si frente-bloqueado', 'gira-izq;'],
    initialWorld: {
      karelPosition: { street: 1, avenue: 1 },
      karelDirection: 'ESTE',
      beepers: [],
      bagBeepers: 0,
    },
    starterCode: `iniciar-programa
  inicia-ejecucion
    repetir 4 veces inicio
      repetir 7 veces inicio
        avanza;
      fin;
      gira-izquierda;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage: "¡Nivel 3! Tu objetivo es dar la vuelta completa por todo el borde del mundo hasta volver a (1,1). Utiliza la combinación de `repetir` para recorrer cada lado y aprovecha las decisiones o giros (`gira-izquierda;`) cada vez que llegues a una pared para continuar por el contorno.",
  },
  {
    id: 4,
    title: "Nivel 4: Mochilas y Fichas",
    subtitle: "Recolección perimetral de fichas",
    objective: "Da la vuelta completa por el contorno del mapa y recoge todas las fichas (zumbadores) que encuentres en el camino con 'coge-zumbador'.",
    gridPosition: 'bottom-right',
    commands: ['coge-zumbador;', 'junto-a-zumbador'],
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
  inicia-ejecucion
    repetir 4 veces inicio
      repetir 7 veces inicio
        si junto-a-zumbador entonces inicio
          coge-zumbador;
        fin;
        avanza;
      fin;
      gira-izquierda;
    fin;
    apagate;
  termina-ejecucion
finalizar-programa`,
    initialMessage: "¡Nivel 4: Mochilas y Fichas! En este nivel, mientras recorres el contorno encontrarás fichas (zumbadores) en el camino. Antes de avanzar en cada esquina, verifica con `si junto-a-zumbador` para recoger la ficha con `coge-zumbador;` y guardarla en tu mochila.",
  },
]

export const getKarelLevelById = (levelId: number): KarelLevel | null =>
  KAREL_LEVELS.find((level) => level.id === levelId) ?? null
