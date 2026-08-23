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
    title: 'La Mañana del Robot Bip-Bop',
    category: 'secuencias',
    difficulty: 'facil',
    description: 'El robot Bip-Bop necesita tu ayuda para alistarse antes de ir a la escuela de robots.',
    starterPrompt: '¡Ayuda a Bip-Bop a ordenar su rutina de la mañana para no salir en pijamas!',
    evaluationCriteria: 'El usuario debe entender que una secuencia lógica sigue un orden temporal obligatorio.',
    flowDefinition: {
      instruction: 'Ordena las acciones que debe hacer Bip-Bop desde que se despierta:',
      nodes: [
        { id: 's1_despertar', label: '1. Abrir los ojos y apagar la alarma' },
        { id: 's1_lavar', label: '2. Lavarse la cara y los dientes' },
        { id: 's1_vestir', label: '3. Ponerse el uniforme escolar' },
        { id: 's1_desayuno', label: '4. Tomar un rico desayuno con jugo' }
      ],
      validOrders: [
        ['s1_despertar', 's1_lavar', 's1_vestir', 's1_desayuno'],
        ['s1_despertar', 's1_vestir', 's1_lavar', 's1_desayuno']
      ],
      failureHints: {
        vestir_before_despertar: '¡Ups! Bip-Bop no puede vestirse mientras sigue durmiendo.'
      }
    }
  },
  {
    problemId: 'KID-SEQ-002',
    mode: 'interactive_flow',
    title: 'La Fábrica de Pizza de Don Queso',
    category: 'secuencias',
    difficulty: 'facil',
    description: 'Aprende a programar la máquina pizzera para hornear una pizza deliciosa sin quemarla.',
    starterPrompt: '¿Cómo le ordenamos a la máquina pizzera que prepare la comida?',
    evaluationCriteria: 'Comprender que los ingredientes se colocan antes de la cocción.',
    flowDefinition: {
      instruction: 'Arrastra los pasos para preparar la pizza en el orden correcto:',
      nodes: [
        { id: 'pza_masa', label: 'Amasar y estirar la masa redonda' },
        { id: 'pza_salsa', label: 'Esparcir la salsa de tomate y queso' },
        { id: 'pza_horno', label: 'Meter al horno caliente por 10 minutos' },
        { id: 'pza_servir', label: 'Cortar en rebanadas y servir en el plato' }
      ],
      validOrders: [
        ['pza_masa', 'pza_salsa', 'pza_horno', 'pza_servir']
      ]
    }
  },
  {
    problemId: 'KID-SEQ-003',
    mode: 'interactive_flow',
    title: 'Misión Espacial: ¡Despegue!',
    category: 'secuencias',
    difficulty: 'medio',
    description: 'La nave Titán 3 va rumbo a Marte. Diseña la secuencia de despegue segura.',
    starterPrompt: '¡El astronauta necesita tu código de secuencia para encender los motores!',
    evaluationCriteria: 'Asegurar que la seguridad (cinturón/puertas) ocurra antes del encendido de propulsores.',
    flowDefinition: {
      instruction: 'Programa el orden de comandos para la computadora del cohete:',
      nodes: [
        { id: 'nav_entrar', label: 'Astronautas entran a la cabina' },
        { id: 'nav_seguro', label: 'Cerrar compuertas y ajustar cinturones' },
        { id: 'nav_conteo', label: 'Cuenta regresiva: 3, 2, 1...' },
        { id: 'nav_fuego', label: '¡Encender propulsores hacia el espacio!' }
      ],
      validOrders: [
        ['nav_entrar', 'nav_seguro', 'nav_conteo', 'nav_fuego']
      ]
    }
  },
  {
    problemId: 'KID-SEQ-004',
    mode: 'standard_text',
    title: 'Instrucciones para un Marcianito',
    category: 'secuencias',
    difficulty: 'facil',
    description: 'Llegó un marcianito que no sabe lavarse las manos con jabón. Explícaselo como a una computadora.',
    starterPrompt: 'Imagina que un marcianito nunca ha visto agua ni jabón. ¿Qué 3 o 4 pasos exactos le dirías para lavarse las manos?',
    evaluationCriteria: 'El infante debe descomponer una tarea cotidiana en pasos atómicos y ordenados.'
  },

  // ==========================================
  // 2. BUCLES Y REPETICIONES (LOOPS)
  // ==========================================
  {
    problemId: 'KID-LUP-001',
    mode: 'interactive_flow',
    title: 'El Baile de la Ranita Saltarína',
    category: 'bucles',
    difficulty: 'facil',
    description: 'Usa un bucle para programar los pasos de baile de la ranita sin repetir código muchas veces.',
    starterPrompt: '¿Cómo le decimos a la ranita que haga una coreografía repetida?',
    evaluationCriteria: 'Identificar el bloque contenedor o la acción de repetición al final del ciclo.',
    flowDefinition: {
      instruction: 'Ordena los pasos para que la ranita complete una vuelta de baile:',
      nodes: [
        { id: 'rn_salto', label: 'Dar un salto alto al frente' },
        { id: 'rn_giro', label: 'Girar hacia la derecha' },
        { id: 'rn_aplauso', label: 'Aplaudiendo con las ancas' },
        { id: 'rn_repetir', label: 'Repetir todo 4 veces' }
      ],
      validOrders: [
        ['rn_salto', 'rn_giro', 'rn_aplauso', 'rn_repetir']
      ]
    }
  },
  {
    problemId: 'KID-LUP-002',
    mode: 'interactive_flow',
    title: 'Recolectando Monedas del Dragón',
    category: 'bucles',
    difficulty: 'medio',
    description: 'El robot explorador debe recoger 5 monedas brillantes del sendero.',
    starterPrompt: '¡Vamos a llenar la alcancía! Diseña el bucle de recolección.',
    evaluationCriteria: 'Entender que el avance y la recolección forman el cuerpo del bucle antes de la condición de parada.',
    flowDefinition: {
      instruction: 'Arma el algoritmo para recolectar monedas una por una:',
      nodes: [
        { id: 'drg_camina', label: 'Avanzar 1 paso hacia la moneda' },
        { id: 'drg_toma', label: 'Tomar la moneda del suelo' },
        { id: 'drg_guarda', label: 'Guardar la moneda en la bolsa' },
        { id: 'drg_checa', label: '¿Hay más monedas? Si hay, volver a empezar' }
      ],
      validOrders: [
        ['drg_camina', 'drg_toma', 'drg_guarda', 'drg_checa']
      ]
    }
  },
  {
    problemId: 'KID-LUP-003',
    mode: 'standard_text',
    title: 'El Bucle Infinito del Gatito Miau',
    category: 'bucles',
    difficulty: 'facil',
    description: 'Un gatito programado para perseguir su cola no para nunca porque olvidamos la condición de alto.',
    starterPrompt: 'Si le dices a un robot "Come galletas, Come galletas, Come galletas..." sin decirle cuándo detenerse, ¿qué problema ocurre en su sistema?',
    evaluationCriteria: 'El niño debe reconocer la noción de bucle infinito y la necesidad de una condición de salida.'
  },

  // ==========================================
  // 3. CONDICIONALES (SI... ENTONCES / SI NO)
  // ==========================================
  {
    problemId: 'KID-CND-001',
    mode: 'interactive_flow',
    title: 'El Semáforo Inteligente',
    category: 'condicionales',
    difficulty: 'facil',
    description: 'Programa los sensores de un coche autónomo de juguete para cruzar la calle seguro.',
    starterPrompt: '¡El coche necesita tomar decisiones según la luz del semáforo!',
    evaluationCriteria: 'Comprender la relación entre condición (sensor/luz) y la acción consecuente.',
    flowDefinition: {
      instruction: 'Ordena la lógica de decisión del coche:',
      nodes: [
        { id: 'sm_mira', label: 'Escanear el color de la luz del semáforo' },
        { id: 'sm_verde', label: 'SI la luz es VERDE: Acelerar y avanzar' },
        { id: 'sm_rojo', label: 'SI la luz es ROJA: Frenar por completo' },
        { id: 'sm_espera', label: 'Esperar hasta el siguiente cambio de luz' }
      ],
      validOrders: [
        ['sm_mira', 'sm_verde', 'sm_rojo', 'sm_espera'],
        ['sm_mira', 'sm_rojo', 'sm_verde', 'sm_espera']
      ]
    }
  },
  {
    problemId: 'KID-CND-002',
    mode: 'interactive_flow',
    title: 'La Puerta del Castillo Encantado',
    category: 'condicionales',
    difficulty: 'medio',
    description: 'Para entrar al castillo, el caballero robot debe validar si tiene la llave dorada.',
    starterPrompt: '¿Cómo decide la puerta mágica si se abre o se queda con cerrojo?',
    evaluationCriteria: 'Entender la estructura de bifurcación SI / SI NO.',
    flowDefinition: {
      instruction: 'Ordena el proceso de decisión de la puerta mágica:',
      nodes: [
        { id: 'cst_sensor', label: 'Sensor revisa la mano del caballero' },
        { id: 'cst_si', label: 'SI tiene la Llave Dorada: Abrir el puente levadizo' },
        { id: 'cst_sino', label: 'SI NO la tiene: Mostrar mensaje "Busca la llave"' },
        { id: 'cst_fin', label: 'Registrar al visitante en el libro del reino' }
      ],
      validOrders: [
        ['cst_sensor', 'cst_si', 'cst_sino', 'cst_fin'],
        ['cst_sensor', 'cst_sino', 'cst_si', 'cst_fin']
      ]
    }
  },
  {
    problemId: 'KID-CND-003',
    mode: 'standard_text',
    title: 'El Guardarropa del Pingüino Pepe',
    category: 'condicionales',
    difficulty: 'facil',
    description: 'Pepe vive en una isla de clima loco. Ayúdalo a decidir su ropa con reglas lógicas.',
    starterPrompt: 'Crea una regla con "SI... ENTONCES... SI NO..." para que Pepe decida si llevar paraguas o ponerse lentes de sol hoy.',
    evaluationCriteria: 'Formular una condición lógica válida con causa y efecto directo.'
  },

  // ==========================================
  // 4. DEPURACIÓN Y CAZA DE BUGS (ERRORES)
  // ==========================================
  {
    problemId: 'KID-BUG-001',
    mode: 'interactive_flow',
    title: 'El Robot con Zapatos al Revés',
    category: 'depuracion',
    difficulty: 'facil',
    description: 'El robot tuvo un error de código y se puso los zapatos antes de las medias. ¡Arrégla el bug!',
    starterPrompt: '¡Hay un bug gracioso en los pies del robot! Arreglemos el orden.',
    evaluationCriteria: 'Identificar precondiciones indispensables en una secuencia.',
    flowDefinition: {
      instruction: 'Ordena los bloques correctamente para quitar el error:',
      nodes: [
        { id: 'bg_pie', label: 'Destapar el pie limpio' },
        { id: 'bg_media', label: 'Poner la media de lana' },
        { id: 'bg_zapato', label: 'Meter el pie en el zapato' },
        { id: 'bg_amarrar', label: 'Atar los cordones con un nudo' }
      ],
      validOrders: [
        ['bg_pie', 'bg_media', 'bg_zapato', 'bg_amarrar']
      ]
    }
  },
  {
    problemId: 'KID-BUG-002',
    mode: 'interactive_flow',
    title: 'El Choque contra la Muralla',
    category: 'depuracion',
    difficulty: 'medio',
    description: 'El coche de carreras se estrella porque gira después de avanzar demasiado. Corrige su trayectoria.',
    starterPrompt: '¡El coche chocó con el muro de llantas! ¿En qué momento debió girar?',
    evaluationCriteria: 'Ajustar el orden cronológico de eventos para evitar una colisión.',
    flowDefinition: {
      instruction: 'Corrige la ruta del coche para que pase por la curva segura:',
      nodes: [
        { id: 'bg_avanza', label: 'Avanzar 3 metros en línea recta' },
        { id: 'bg_frena', label: 'Disminuir la velocidad antes de la curva' },
        { id: 'bg_gira', label: 'Girar el volante hacia la izquierda' },
        { id: 'bg_recta', label: 'Acelerar por la nueva pista despejada' }
      ],
      validOrders: [
        ['bg_avanza', 'bg_frena', 'bg_gira', 'bg_recta']
      ]
    }
  },
  {
    problemId: 'KID-BUG-003',
    mode: 'standard_text',
    title: 'El Sándwich Invertido',
    category: 'depuracion',
    difficulty: 'facil',
    description: 'Un robot chef sirvió un sándwich con los dos panes en el medio y el queso y tomate por fuera.',
    starterPrompt: 'El robot chef puso: Queso -> Pan -> Pan -> Tomate. ¿Cuál fue su error y cómo debería ser el código correcto?',
    evaluationCriteria: 'Identificar el desorden en la estructura envolvente de los datos (capas de pan).'
  },

  // ==========================================
  // 5. VARIABLES Y ESTADO (CAJITAS MÁGICAS)
  // ==========================================
  {
    problemId: 'KID-VAR-001',
    mode: 'interactive_flow',
    title: 'El Marcador de Estrellas del Videojuego',
    category: 'variables',
    difficulty: 'medio',
    description: 'Aprende cómo funciona una variable de puntaje cuando recolectas premios.',
    starterPrompt: '¡Vamos a programar el marcador de puntos de tu propio videojuego!',
    evaluationCriteria: 'Comprender la inicialización en cero, incremento por evento y renderizado en pantalla.',
    flowDefinition: {
      instruction: 'Ordena cómo cambia el valor de la cajita mágica "PUNTOS":',
      nodes: [
        { id: 'vr_cero', label: 'Crear cajita "Puntos" con valor = 0' },
        { id: 'vr_estrella', label: 'El jugador toca una estrella brillante' },
        { id: 'vr_suma', label: 'Sumar +10 al número dentro de "Puntos"' },
        { id: 'vr_pantalla', label: 'Mostrar nuevo puntaje en la pantalla' }
      ],
      validOrders: [
        ['vr_cero', 'vr_estrella', 'vr_suma', 'vr_pantalla']
      ]
    }
  },
  {
    problemId: 'KID-VAR-002',
    mode: 'standard_text',
    title: 'La Mochila de Objetos Mágicos',
    category: 'variables',
    difficulty: 'facil',
    description: 'Imagina una variable como una cajita con una etiqueta donde solo cabe una cosa a la vez.',
    starterPrompt: 'Si tenemos una cajita llamada "Mascota" y guardamos "Perro", pero luego metemos "Gato"... ¿qué animal queda dentro de la cajita al final?',
    evaluationCriteria: 'El niño debe entender que asignar un nuevo valor a una variable sobreescribe el dato previo.'
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
