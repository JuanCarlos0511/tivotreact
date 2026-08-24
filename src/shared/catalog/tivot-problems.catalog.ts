import type { TivotProblem } from '@shared/types'

interface ProblemNode {
  id: string;
  label: string;
}

interface FlowDefinition {
  instruction: string;
  nodes: ProblemNode[];
  validOrders: string[][];
  failureHints?: Record<string, string>;
}

interface KidCatalogProblem {
  problemId: string;
  mode: 'standard_text' | 'interactive_flow';
  title: string;
  category: 'secuencias' | 'bucles' | 'condicionales' | 'depuracion' | 'variables';
  difficulty: 'facil' | 'medio' | 'reto';
  description: string;
  starterPrompt: string;
  evaluationCriteria: string;
  flowDefinition?: FlowDefinition;
}

const KID_PROBLEMS_CATALOG: KidCatalogProblem[] = [
  // ==========================================
  // 1. SECUENCIAS Y ALGORITMOS (PASO A PASO)
  // ==========================================
  {
    problemId: 'KID-SEQ-001',
    mode: 'interactive_flow',
    title: 'La Caja del Kiosco',
    category: 'secuencias',
    difficulty: 'facil',
    description: 'La caja del kiosco necesita seguir el orden correcto para abrir la venta del día.',
    starterPrompt: '¿Qué se hace primero para que la caja empiece bien el día?',
    evaluationCriteria: 'El usuario debe reconocer que los pasos del punto de venta deben seguir un orden correcto.',
    flowDefinition: {
      instruction: 'Ordena lo que debe pasar antes de empezar a vender:',
      nodes: [
        { id: 'caja_prender', label: '1. Encender la caja' },
        { id: 'caja_abrir', label: '2. Abrir la caja de dinero' },
        { id: 'caja_precios', label: '3. Revisar los precios de los productos' },
        { id: 'caja_venta', label: '4. Empezar a vender' }
      ],
      validOrders: [
        ['caja_prender', 'caja_abrir', 'caja_precios', 'caja_venta'],
        ['caja_prender', 'caja_precios', 'caja_abrir', 'caja_venta']
      ],
      failureHints: {
        caja_abrir_before_prender: 'La caja necesita estar lista antes de abrir la caja de dinero.'
      }
    }
  },
  {
    problemId: 'KID-SEQ-002',
    mode: 'interactive_flow',
    title: 'La Compra del Super',
    category: 'secuencias',
    difficulty: 'facil',
    description: 'Ayuda al cliente a llevar sus cosas en el orden correcto para pagar y salir feliz.',
    starterPrompt: '¿Cómo debe ir la compra para llegar bien a la caja?',
    evaluationCriteria: 'Comprender que cada paso de la compra tiene un orden para no confundir al cliente.',
    flowDefinition: {
      instruction: 'Ordena los pasos de una compra sencilla:',
      nodes: [
        { id: 'compra_tomar', label: 'Tomar los productos que quiere el cliente' },
        { id: 'compra_mirar', label: 'Mirar el precio de cada uno' },
        { id: 'compra_caja', label: 'Poner todo en la caja' },
        { id: 'compra_pagar', label: 'Pagar y guardar la bolsa' }
      ],
      validOrders: [
        ['compra_tomar', 'compra_mirar', 'compra_caja', 'compra_pagar']
      ]
    }
  },
  {
    problemId: 'KID-SEQ-003',
    mode: 'interactive_flow',
    title: 'La Tienda de Juguetes',
    category: 'secuencias',
    difficulty: 'medio',
    description: 'La tienda tiene que atender bien a cada cliente para que no se pierda ninguna compra.',
    starterPrompt: '¿Qué pasa primero cuando llega un cliente a la tienda?',
    evaluationCriteria: 'Reconocer que mirar, preparar y pagar son pasos que se siguen en orden.',
    flowDefinition: {
      instruction: 'Ordena la forma de atender a un cliente:',
      nodes: [
        { id: 'tienda_llega', label: 'El cliente llega a la tienda' },
        { id: 'tienda_elige', label: 'Elige los juguetes que quiere' },
        { id: 'tienda_caja', label: 'Pasa por la caja' },
        { id: 'tienda_pago', label: 'Recibe su bolsa y su cambio' }
      ],
      validOrders: [
        ['tienda_llega', 'tienda_elige', 'tienda_caja', 'tienda_pago']
      ]
    }
  },
  {
    problemId: 'KID-SEQ-004',
    mode: 'standard_text',
    title: 'La Receta de la Venta',
    category: 'secuencias',
    difficulty: 'facil',
    description: 'Un niño quiere ayudar a una tienda, pero necesita explicar bien los pasos de una venta sencilla.',
    starterPrompt: '¿Qué 3 o 4 pasos seguirías para vender una fruta a un cliente?',
    evaluationCriteria: 'El niño debe separar la venta en pasos claros y ordenados, desde mirar hasta pagar.'
  },

  // ==========================================
  // 2. BUCLES Y REPETICIONES (LOOPS)
  // ==========================================
  {
    problemId: 'KID-LUP-001',
    mode: 'interactive_flow',
    title: 'La Fila de la Panadería',
    category: 'bucles',
    difficulty: 'facil',
    description: 'La panadería repite el mismo paso muchas veces para atender a todos los clientes.',
    starterPrompt: '¿Cómo hace la panadería para atender a varias personas sin cansarse?',
    evaluationCriteria: 'Entender que repetir un paso ayuda a hacer la misma tarea muchas veces.',
    flowDefinition: {
      instruction: 'Ordena la rutina de la panadería:',
      nodes: [
        { id: 'pan_mira', label: 'Mirar lo que quiere cada cliente' },
        { id: 'pan_poner', label: 'Poner el pan en la bolsa' },
        { id: 'pan_cobrar', label: 'Cobrar el dinero' },
        { id: 'pan_repetir', label: 'Repetir todo con el siguiente cliente' }
      ],
      validOrders: [
        ['pan_mira', 'pan_poner', 'pan_cobrar', 'pan_repetir']
      ]
    }
  },
  {
    problemId: 'KID-LUP-002',
    mode: 'interactive_flow',
    title: 'Las Bolas de Dulce',
    category: 'bucles',
    difficulty: 'medio',
    description: 'La caja necesita contar varias bolsitas dulces para que cada cliente salga con lo que pidió.',
    starterPrompt: '¿Cómo le decimos a la caja que haga lo mismo varias veces?',
    evaluationCriteria: 'Entender que la misma tarea se repite hasta terminar la compra.',
    flowDefinition: {
      instruction: 'Arma la rutina para guardar varios dulces:',
      nodes: [
        { id: 'dulce_toma', label: 'Tomar una bolsita de dulce' },
        { id: 'dulce_pesa', label: 'Pesarla o revisarla' },
        { id: 'dulce_pone', label: 'Ponerla en la bolsa' },
        { id: 'dulce_vuelve', label: 'Si falta más, volver a empezar' }
      ],
      validOrders: [
        ['dulce_toma', 'dulce_pesa', 'dulce_pone', 'dulce_vuelve']
      ]
    }
  },
  {
    problemId: 'KID-LUP-003',
    mode: 'standard_text',
    title: 'El Moño de la Caja',
    category: 'bucles',
    difficulty: 'facil',
    description: 'La caja sigue repitiendo la misma acción sin parar y nadie sabe cuándo dejar de contar.',
    starterPrompt: 'Si la caja dice: “sumar, sumar, sumar...” sin decir cuándo parar, ¿qué pasa?',
    evaluationCriteria: 'El niño debe reconocer que hace falta una señal para terminar la repetición.'
  },

  // ==========================================
  // 3. CONDICIONALES (SI... ENTONCES / SI NO)
  // ==========================================
  {
    problemId: 'KID-CND-001',
    mode: 'interactive_flow',
    title: 'La Tienda con Luz',
    category: 'condicionales',
    difficulty: 'facil',
    description: 'La caja necesita decidir qué hacer según lo que trae el cliente.',
    starterPrompt: '¿Qué hace la caja cuando el cliente paga con tarjeta o con dinero?',
    evaluationCriteria: 'Comprender que la decisión cambia según lo que ocurre en la compra.',
    flowDefinition: {
      instruction: 'Ordena la elección de la caja:',
      nodes: [
        { id: 'luz_mira', label: 'Mirar cómo paga el cliente' },
        { id: 'luz_tarjeta', label: 'Si paga con tarjeta: pasar la tarjeta' },
        { id: 'luz_dinero', label: 'Si paga con dinero: contar el cambio' },
        { id: 'luz_fin', label: 'Dar el recibo y la bolsa' }
      ],
      validOrders: [
        ['luz_mira', 'luz_tarjeta', 'luz_dinero', 'luz_fin'],
        ['luz_mira', 'luz_dinero', 'luz_tarjeta', 'luz_fin']
      ]
    }
  },
  {
    problemId: 'KID-CND-002',
    mode: 'interactive_flow',
    title: 'La Puerta de la Tienda',
    category: 'condicionales',
    difficulty: 'medio',
    description: 'La puerta de la tienda sabe si debe abrirse o no según lo que lleve el cliente.',
    starterPrompt: '¿Cómo decide la tienda si abre la puerta o manda a esperar?',
    evaluationCriteria: 'Entender que una decisión puede cambiar según una pregunta simple.',
    flowDefinition: {
      instruction: 'Ordena la decisión de la puerta de la tienda:',
      nodes: [
        { id: 'puerta_mira', label: 'Mirar lo que trae el cliente' },
        { id: 'puerta_si', label: 'Si tiene la bolsa: dejar pasar' },
        { id: 'puerta_no', label: 'Si no la tiene: decirle que espere' },
        { id: 'puerta_fin', label: 'Guardar la entrada del día' }
      ],
      validOrders: [
        ['puerta_mira', 'puerta_si', 'puerta_no', 'puerta_fin'],
        ['puerta_mira', 'puerta_no', 'puerta_si', 'puerta_fin']
      ]
    }
  },
  {
    problemId: 'KID-CND-003',
    mode: 'standard_text',
    title: 'La Ropa del Clima',
    category: 'condicionales',
    difficulty: 'facil',
    description: 'La tienda quiere ayudar al cliente a decidir qué llevar según el día.',
    starterPrompt: 'Crea una regla sencilla con “SI… ENTONCES… SI NO…” para elegir si llevar sombrero o paraguas.',
    evaluationCriteria: 'Formular una decisión simple con un motivo claro y un resultado claro.'
  },

  // ==========================================
  // 4. DEPURACIÓN Y CAZA DE BUGS (ERRORES)
  // ==========================================
  {
    problemId: 'KID-BUG-001',
    mode: 'interactive_flow',
    title: 'Los Zapatos de la Caja',
    category: 'depuracion',
    difficulty: 'facil',
    description: 'La caja hizo el orden al revés y ahora el cliente se va confundido.',
    starterPrompt: '¡Hay un error en la caja! ¿Qué orden debe seguir?',
    evaluationCriteria: 'Identificar el orden correcto de los pasos antes de entregar la compra.',
    flowDefinition: {
      instruction: 'Ordena bien los pasos para arreglar la venta:',
      nodes: [
        { id: 'bug_peso', label: 'Pesar la compra' },
        { id: 'bug_caja', label: 'Ponerla en la caja' },
        { id: 'bug_pago', label: 'Cobrar el total' },
        { id: 'bug_bolsa', label: 'Dar la bolsa al cliente' }
      ],
      validOrders: [
        ['bug_peso', 'bug_caja', 'bug_pago', 'bug_bolsa']
      ]
    }
  },
  {
    problemId: 'KID-BUG-002',
    mode: 'interactive_flow',
    title: 'El Cambio Equivocado',
    category: 'depuracion',
    difficulty: 'medio',
    description: 'La cajera contó mal el cambio y ahora el cliente está triste.',
    starterPrompt: '¿En qué momento se debía contar bien el cambio?',
    evaluationCriteria: 'Ajustar el orden de la venta para que el cambio salga bien.',
    flowDefinition: {
      instruction: 'Corrige la secuencia para dar el cambio bien:',
      nodes: [
        { id: 'cambio_total', label: 'Ver el total de la compra' },
        { id: 'cambio_pago', label: 'Recibir el dinero del cliente' },
        { id: 'cambio_rest', label: 'Contar cuánto falta o sobra' },
        { id: 'cambio_dar', label: 'Dar el cambio y la bolsa' }
      ],
      validOrders: [
        ['cambio_total', 'cambio_pago', 'cambio_rest', 'cambio_dar']
      ]
    }
  },
  {
    problemId: 'KID-BUG-003',
    mode: 'standard_text',
    title: 'La Bolsa Al Revés',
    category: 'depuracion',
    difficulty: 'facil',
    description: 'La ayudante de la tienda puso la fruta en la bolsa al revés y ahora está toda mezclada.',
    starterPrompt: 'La ayudante puso: “fruta, pan, pan, fruta”. ¿Qué error hizo y cómo debe ir?',
    evaluationCriteria: 'Reconocer que el orden de los productos debe seguir la lista correcta.'
  },

  // ==========================================
  // 5. VARIABLES Y ESTADO (CAJITAS MÁGICAS)
  // ==========================================
  {
    problemId: 'KID-VAR-001',
    mode: 'interactive_flow',
    title: 'La Cajita del Total',
    category: 'variables',
    difficulty: 'medio',
    description: 'La tienda guarda el total de la venta en una cajita para saber cuánto se debe cobrar.',
    starterPrompt: '¡Vamos a guardar el total de la compra en una cajita del sistema!',
    evaluationCriteria: 'Entender que la cajita empieza en cero, suma el valor y muestra el total final.',
    flowDefinition: {
      instruction: 'Ordena cómo cambia la cajita del total:',
      nodes: [
        { id: 'total_cero', label: 'Crear la cajita del total con valor 0' },
        { id: 'total_venta', label: 'Un cliente compra un producto' },
        { id: 'total_suma', label: 'Sumar el precio al total' },
        { id: 'total_ver', label: 'Mostrar el total en la pantalla' }
      ],
      validOrders: [
        ['total_cero', 'total_venta', 'total_suma', 'total_ver']
      ]
    }
  },
  {
    problemId: 'KID-VAR-002',
    mode: 'standard_text',
    title: 'La Mochila de la Tienda',
    category: 'variables',
    difficulty: 'facil',
    description: 'La mochila guarda un nombre y luego cambia por otro, porque la tienda solo puede guardar uno a la vez.',
    starterPrompt: 'Si la mochila dice “manzana” y luego cambia a “pan”, ¿qué nombre queda al final?',
    evaluationCriteria: 'Entender que guardar un nuevo valor reemplaza el anterior.'
  }
];

const difficultyMap: Record<KidCatalogProblem['difficulty'], TivotProblem['difficulty']> = {
  facil: 'Junior',
  medio: 'Mid',
  reto: 'Senior',
}

export const TIVOT_PROBLEM_CATALOG: TivotProblem[] = KID_PROBLEMS_CATALOG.map((problem) => {
  const baseProblem = {
    problem_id: problem.problemId,
    mode: problem.mode,
    title: problem.title,
    difficulty: difficultyMap[problem.difficulty],
    tags: [problem.category],
    system_context: problem.description,
  }

  if (problem.mode === 'interactive_flow') {
    const flowDefinition = problem.flowDefinition

    return {
      ...baseProblem,
      mode: 'interactive_flow',
      flow_definition: {
        instruction: flowDefinition?.instruction ?? problem.starterPrompt,
        nodes: flowDefinition?.nodes ?? [],
        valid_orders: flowDefinition?.validOrders ?? [],
      },
      failure_hints: flowDefinition?.failureHints ?? {},
    }
  }

  return {
    ...baseProblem,
    mode: 'standard_text',
    evaluation_criteria: problem.evaluationCriteria,
  }
})
