export const TUTORIAL_STEPS = ['chat', 'code', 'runner', 'compile'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export const TUTORIAL_COPY = {
  chat: {
    title: 'Conoce a Tivot',
    body: 'Tivot te acompaña durante el reto. Abre el chat del tutor desde el botón de conversación cuando necesites orientación.',
  },
  code: {
    title: 'Construye tu programa',
    body: 'Selecciona una línea y añade comandos desde la izquierda. Las flechas mueven la instrucción seleccionada y la papelera la elimina. En móvil, usa el lápiz para escribir o cambiar parámetros. Termina con apagate;.',
  },
  runner: {
    title: 'Controles de tiempo y paso a paso',
    body: 'Los controles están al pie del editor: ejecuta, pausa, retrocede o avanza un paso. Pulsa la velocidad para cambiar el ritmo.',
  },
  compile: {
    title: 'Compilar y ejecutar',
    body: 'Compila para revisar errores. Ejecutar también comprueba tu programa antes de correrlo. La línea en ejecución se resalta mientras Tivot se mueve por el tablero.',
  },
} satisfies Record<TutorialStep, { title: string; body: string }>;

const seenLevels = new Set<number>();

export const hasSeenLevelHelp = (levelId: number): boolean => {
  if (seenLevels.has(levelId)) return true;
  try {
    return sessionStorage.getItem(`tivot-level-help:${levelId}`) === 'seen';
  } catch {
    return false;
  }
};

export const markLevelHelpSeen = (levelId: number) => {
  seenLevels.add(levelId);
  try {
    sessionStorage.setItem(`tivot-level-help:${levelId}`, 'seen');
  } catch {
    // The in-memory set still remembers dismissed help when storage is unavailable.
  }
};
