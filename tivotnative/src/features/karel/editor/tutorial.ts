export const TUTORIAL_STEPS = ['chat', 'code', 'runner', 'reset'] as const;
const LEVEL_4_TUTORIAL_STEPS = ['quickCommands'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number] | (typeof LEVEL_4_TUTORIAL_STEPS)[number];

export const TUTORIAL_COPY = {
  chat: {
    title: 'Conoce a Tivot',
    body: 'Tivot te acompaña durante el reto. Abre el chat del tutor desde el botón de conversación cuando necesites orientación.',
  },
  code: {
    title: 'Construye tu programa',
    body: 'Selecciona una línea y añade comandos desde los comandos rápidos. Las flechas mueven la instrucción seleccionada y la papelera la elimina. Usa el lápiz de los bloques para cambiar sus parámetros. El programa empieza con iniciar-programa y termina con finalizar-programa.',
  },
  quickCommands: {
    title: 'Más comandos rápidos',
    body: 'A partir de este nivel hay más opciones en la barra de comandos rápidos. Desplázala hacia la derecha para ver los comandos nuevos antes de agregarlos al programa.',
  },
  runner: {
    title: 'Controles de tiempo y paso a paso',
    body: 'Usa los controles junto al editor: ejecuta, pausa, retrocede o avanza un paso. Pulsa la velocidad para cambiar el ritmo.',
  },
  reset: {
    title: 'Ejecuta y reinicia',
    body: 'Ejecutar comprueba el código y comienza en la primera línea. Reiniciar devuelve a Karel al inicio y conserva tu código. Los ciclos muestran su iteración y resaltan las líneas que contienen.',
  },
} satisfies Record<TutorialStep, { title: string; body: string }>;

export const getTutorialStepsForLevel = (levelId: number): readonly TutorialStep[] =>
  levelId === 4 ? LEVEL_4_TUTORIAL_STEPS : TUTORIAL_STEPS;

export const getInitialTutorialStepForLevel = (levelId: number): TutorialStep | null => {
  if (levelId === 1) return 'chat';
  if (levelId === 4) return 'quickCommands';
  return null;
};

const seenLevels = new Set<number>();

export const hasSeenLevelHelp = (levelId: number): boolean => seenLevels.has(levelId);

export const markLevelHelpSeen = (levelId: number) => {
  seenLevels.add(levelId);
};
