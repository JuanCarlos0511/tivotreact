export interface CodeLine {
  text: string;
  parent: number | null;
  end: number;
  depth: number;
  fixed: boolean;
  opensBlock: boolean;
  closingBlock: number | null;
}

const sourceText = (line: string) => line.replace(/\/\/.*$/, '').trim();
const WRAPPERS = new Set([
  'iniciar-programa',
  'finalizar-programa',
]);

// Keep the source string as the source of truth: indices always match the interpreter's lines.
export const describeCodeLines = (code: string): CodeLine[] => {
  const stack: number[] = [];
  const lines: CodeLine[] = [];

  code.split('\n').forEach((rawLine, index) => {
    const text = sourceText(rawLine);
    const closesBlock = text === 'fin;';
    let closingBlock: number | null = null;
    if (closesBlock) {
      const opening = stack.pop();
      if (opening !== undefined && lines[opening]) { lines[opening].end = index; closingBlock = opening; }
    }
    const opensBlock = /\binicio$/.test(text);
    lines.push({
      text,
      parent: stack.at(-1) ?? null,
      end: index,
      depth: stack.length + (WRAPPERS.has(text) ? 0 : 1),
      fixed: WRAPPERS.has(text),
      closingBlock,
      opensBlock,
    });
    if (opensBlock) stack.push(index);
  });

  return lines;
};

export const getInsertionIndex = (lines: CodeLine[], selected: number | null): number => {
  const line = selected === null ? undefined : lines[selected];
  if (line) {
    if (line.text === 'iniciar-programa') return 1;
    if (line.text === 'finalizar-programa' || line.text === 'fin;') return selected ?? 0;
    return (selected ?? 0) + 1;
  }
  const endIndex = lines.findIndex(entry => entry.text === 'finalizar-programa');
  return endIndex >= 0 ? endIndex : lines.length;
};

export const getSiblingIndex = (
  lines: CodeLine[],
  index: number,
  direction: -1 | 1
): number | null => {
  const current = lines[index];
  if (!current || current.fixed || current.closingBlock !== null) return null;
  if (direction === 1) {
    const candidate = lines[current.end + 1];
    return candidate && !candidate.fixed && candidate.closingBlock === null && candidate.parent === current.parent
      ? current.end + 1
      : null;
  }
  const previous = lines.findIndex(
    (line) => !line.fixed && line.closingBlock === null && line.parent === current.parent && line.end === index - 1
  );
  return previous < 0 ? null : previous;
};

export const moveCodeBlock = (
  code: string,
  index: number,
  direction: -1 | 1
): { code: string; selected: number } => {
  const descriptions = describeCodeLines(code);
  const sibling = getSiblingIndex(descriptions, index, direction);
  if (sibling === null) return { code, selected: index };
  const lines = code.split('\n');
  const start = Math.min(index, sibling);
  const middle = Math.max(index, sibling);
  const end = descriptions[middle]?.end ?? middle;
  const first = lines.slice(start, middle);
  const second = lines.slice(middle, end + 1);
  lines.splice(start, end - start + 1, ...second, ...first);
  return { code: lines.join('\n'), selected: direction === -1 ? sibling : start + second.length };
};

export const removeCodeBlock = (code: string, index: number): string => {
  const descriptions = describeCodeLines(code);
  index = descriptions[index]?.closingBlock ?? index;
  const line = descriptions[index];
  if (!line || line.fixed) return code;
  const lines = code.split('\n');
  lines.splice(index, line.end - index + 1);
  return lines.join('\n');
};

export interface CommandTemplate {
  id: string;
  label: string;
  group: 'Movimiento' | 'Fichas' | 'Control' | 'Mis instrucciones';
  description: string;
  source: string[];
}

export const COMMAND_TEMPLATES: CommandTemplate[] = [
  {
    id: 'avanza',
    label: 'Avanza',
    group: 'Movimiento',
    description: 'Avanza una esquina en la dirección actual. Revisa que el frente esté libre.',
    source: ['avanza;'],
  },
  {
    id: 'gira-izquierda',
    label: 'Gira a la izquierda',
    group: 'Movimiento',
    description: 'Gira 90° a la izquierda sin cambiar de esquina.',
    source: ['gira-izquierda;'],
  },
  {
    id: 'coge-ficha',
    label: 'Coge ficha',
    group: 'Fichas',
    description: 'Recoge una ficha de la esquina actual y la guarda en la mochila.',
    source: ['coge-ficha;'],
  },
  {
    id: 'deja-ficha',
    label: 'Deja ficha',
    group: 'Fichas',
    description:
      'Deja una ficha de la mochila en la esquina actual. Necesitas al menos una en la mochila.',
    source: ['deja-ficha;'],
  },
  {
    id: 'repetir',
    label: 'Repite',
    group: 'Control',
    description:
      'Repite las líneas del bloque el número de veces indicado. Edita el número en la primera línea.',
    source: ['repetir 2 veces inicio', '  avanza;', 'fin;'],
  },
  {
    id: 'si',
    label: 'Si… entonces',
    group: 'Control',
    description:
      'Ejecuta el bloque una vez si se cumple la condición. Elige la condición disponible para el nivel.',
    source: ['si junto-a-ficha entonces inicio', '  coge-ficha;', 'fin;'],
  },
  {
    id: 'mientras',
    label: 'Mientras… haz',
    group: 'Control',
    description:
      'Repite el bloque mientras se cumpla la condición. El cuerpo debe cambiar el mundo para que el bucle termine.',
    source: ['mientras frente-libre hacer inicio', '  avanza;', 'fin;'],
  },
  {
    id: 'define-nueva-instruccion',
    label: 'Crea instrucción',
    group: 'Mis instrucciones',
    description:
      'Define un bloque reutilizable dentro del programa. Cambia su nombre y añádelo al programa desde Mis instrucciones.',
    source: ['define-nueva-instruccion mi-instruccion como inicio', '  gira-izquierda;', 'fin;'],
  },
];

export const getCustomCommands = (lines: CodeLine[]): CommandTemplate[] => {
  const names = new Set(
    lines.flatMap((line) => {
      const name = line.text.match(
        /^define-nueva-instruccion\s+([a-zA-Z][\w-]*)\s+como\s+inicio$/
      )?.[1];
      return name ? [name] : [];
    })
  );
  return [...names].map((name) => ({
    id: name,
    label: name,
    group: 'Mis instrucciones',
    description: `Ejecuta las líneas de la instrucción ${name}. Su definición puede estar en cualquier parte del programa.`,
    source: [`${name};`],
  }));
};

// Preserve the teaching order from the level catalogue and hide unused categories.
export const getQuickCommands = (lines: CodeLine[], commandIds: readonly string[]): CommandTemplate[] => {
  const templates = commandIds.flatMap(id => {
    const command = COMMAND_TEMPLATES.find(template => template.id === id);
    return command ? [command] : [];
  });
  return commandIds.includes('define-nueva-instruccion')
    ? [...templates, ...getCustomCommands(lines)]
    : templates;
};
