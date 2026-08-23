type TiVotTextQuestion = {
  type: 'text_question'
  title: string
  scenario: string
  question: string
  hint: string
  expected_keywords: string[]
  explanation: string
}

type TiVotDragDropFlow = {
  type: 'drag_drop_flow'
  title: string
  scenario: string
  instructions: string
  steps_correct_order: Array<{ id: string; text: string }>
  explanation: string
}

export const TIVOT_TEXT_QUESTIONS: TiVotTextQuestion[] = [
  {
    type: 'text_question',
    title: 'Cobro duplicado por doble clic',
    scenario:
      'Un cliente pagó con tarjeta y el cajero presionó "Cobrar" dos veces por error al ver que tardaba; el sistema registró dos cobros idénticos y descontó el doble de mercancía.',
    question: '¿Qué causó este problema o qué acción inmediata se debe tomar?',
    hint: 'Piensa en una acción repetida antes de que la primera terminara de completarse.',
    expected_keywords: ['doble clic', 'cobro duplicado', 'venta repetida'],
    explanation:
      'El problema nace de ejecutar la misma venta dos veces. La acción correcta es detener el segundo cobro y revisar si la mercancía y el pago quedaron aplicados una sola vez.',
  },
  {
    type: 'text_question',
    title: 'Código de barras no reconocido',
    scenario:
      'Al pasar un refresco nuevo por el escáner, la pantalla muestra "Artículo no encontrado", impidiendo continuar con la fila de clientes.',
    question: '¿Qué causó este problema o qué acción inmediata se debe tomar?',
    hint: 'El producto puede existir físicamente, pero no estar en la lista registrada.',
    expected_keywords: ['no reconocido', 'registro', 'código correcto'],
    explanation:
      'El artículo no está registrado o el código no coincide con el que usa la tienda. Se debe verificar el código y darlo de alta antes de seguir cobrando.',
  },
  {
    type: 'text_question',
    title: 'Inventario fantasma',
    scenario:
      'El sistema permite seguir vendiendo galletas a pesar de marcar que quedan "-3 paquetes" en existencia.',
    question: '¿Qué causó este problema o qué acción inmediata se debe tomar?',
    hint: 'Algo se siguió descontando aunque ya no había piezas reales disponibles.',
    expected_keywords: ['stock negativo', 'conteo', 'ajuste'],
    explanation:
      'El conteo visible ya no coincide con la realidad. Hay que bloquear la venta, revisar el conteo físico y corregir el registro de piezas disponibles.',
  },
  {
    type: 'text_question',
    title: 'Faltante al cuadre de turno',
    scenario:
      'Al finalizar el día, el dinero físico en el cajón es menor al total que el sistema calculó según los tickets emitidos.',
    question: '¿Qué causó este problema o qué acción inmediata se debe tomar?',
    hint: 'Compara lo que se cobró en pantalla con lo que realmente quedó en caja.',
    expected_keywords: ['faltante', 'cuadre', 'caja'],
    explanation:
      'Hay una diferencia entre lo cobrado y el efectivo real. Se debe revisar tickets, cancelaciones y cobros incompletos para encontrar dónde faltó dinero.',
  },
  {
    type: 'text_question',
    title: 'Última pieza vendida dos veces',
    scenario:
      'Dos cajeros en diferentes cajas cobraron la última botella de agua al mismo segundo; uno pudo entregarla y el otro se quedó con el cobro hecho pero sin producto físico.',
    question: '¿Qué causó este problema o qué acción inmediata se debe tomar?',
    hint: 'Dos personas intentaron vender la misma última pieza al mismo tiempo.',
    expected_keywords: ['última pieza', 'venta simultánea', 'doble cobro'],
    explanation:
      'El mismo producto fue apartido por dos ventas al mismo tiempo. Se debe validar cuál cobro sí dejó salir la pieza y corregir el otro antes de entregar o reembolsar.',
  },
]

export const TIVOT_DRAG_DROP_FLOWS: TiVotDragDropFlow[] = [
  {
    type: 'drag_drop_flow',
    title: 'Devolución de mercancía',
    scenario:
      'Un cliente llega con un producto devuelto y hay que regresar el dinero sin desordenar el conteo de piezas.',
    instructions: 'Arrastra y ordena los pasos en la secuencia correcta de inicio a fin.',
    steps_correct_order: [
      { id: '1', text: 'Escanear el ticket de compra original del cliente.' },
      { id: '2', text: 'Verificar físicamente el estado del producto devuelto.' },
      { id: '3', text: 'Registrar la entrada del artículo para sumar una pieza a lo disponible.' },
      { id: '4', text: 'Entregar el dinero o saldo al cliente y emitir el comprobante de cancelación.' },
    ],
    explanation:
      'Primero se confirma la compra, luego se revisa el producto y después se ajusta el conteo antes de devolver el dinero para no dejar huecos en el registro.',
  },
  {
    type: 'drag_drop_flow',
    title: 'Recepción de pedido de proveedor',
    scenario:
      'Llega un camión con mercancía nueva y hay que comparar lo recibido antes de subirlo al piso de venta.',
    instructions: 'Arrastra y ordena los pasos en la secuencia correcta de inicio a fin.',
    steps_correct_order: [
      { id: '1', text: 'Contar físicamente las cajas recibidas del camión de reparto.' },
      { id: '2', text: 'Comparar el conteo físico contra la hoja de entrega del proveedor.' },
      { id: '3', text: 'Ingresar la cantidad recibida para aumentar el conteo visible en tienda.' },
      { id: '4', text: 'Colocar la mercancía en piso de venta y confirmar la recepción final.' },
    ],
    explanation:
      'El conteo físico va primero, porque solo así se puede validar lo entregado y actualizar el registro antes de exhibir la mercancía.',
  },
  {
    type: 'drag_drop_flow',
    title: 'Cobro con tarjeta y cierre de venta',
    scenario:
      'Un cliente paga con tarjeta y la venta solo debe cerrarse cuando el banco confirme el pago.',
    instructions: 'Arrastra y ordena los pasos en la secuencia correcta de inicio a fin.',
    steps_correct_order: [
      { id: '1', text: 'Escanear todos los artículos del cliente.' },
      { id: '2', text: 'Seleccionar cobro con tarjeta e ingresar el monto en la terminal bancaria.' },
      { id: '3', text: 'Esperar la confirmación de pago aprobado por el banco.' },
      { id: '4', text: 'Descontar los productos del registro e imprimir el ticket final.' },
    ],
    explanation:
      'Primero se arma el total, luego se procesa el pago y solo después de la confirmación se cierra la venta y se imprime el ticket.',
  },
  {
    type: 'drag_drop_flow',
    title: 'Registro de merma',
    scenario:
      'Un producto dañado o caducado debe salir de la exhibición sin contarlo como venta.',
    instructions: 'Arrastra y ordena los pasos en la secuencia correcta de inicio a fin.',
    steps_correct_order: [
      { id: '1', text: 'Retirar el producto dañado de los estantes de exhibición.' },
      { id: '2', text: 'Escanear el código del producto en el menú de bajas.' },
      { id: '3', text: 'Seleccionar el motivo de retiro (roto, caducado o abierto).' },
      { id: '4', text: 'Confirmar la baja para restar la unidad del conteo oficial sin registrar venta.' },
    ],
    explanation:
      'Primero se retira el producto físico, luego se marca la baja con su motivo y al final se ajusta el conteo para que no cuente como venta.',
  },
]

export const TIVOT_GENERATION_PROMPT = `
Eres el motor de generación de retos del chatbot TiVot, un asistente diseñado para jóvenes de 14 a 16 años interesados en aprender cómo funciona la lógica detrás de tiendas y sistemas de cobro (POS).

REGLAS DE COMUNICACIÓN:
1. Lenguaje directo, claro y moderno. Evita formalidades excesivas o lenguaje infantil.
2. NUNCA utilices tecnicismos de programación o bases de datos (prohibido decir: "base de datos", "SQL", "concurrencia", "query", "rollback", "backend", "foreign key").
3. Traduce los conceptos técnicos a realidades operativas cotidianas:
   - "Base de datos / Stock" -> "El conteo de piezas disponibles" o "La lista de productos registrados".
   - "Race condition / Concurrencia" -> "Cobrar la misma última pieza al mismo tiempo en dos cajas".
   - "Rollback / Error de transacción" -> "Cobro no completado que deja el registro a medias".
   - "Primary key duplicada" -> "Dos productos diferentes usando el mismo código de barras".

CATÁLOGO DE ESCENARIOS:
${TIVOT_TEXT_QUESTIONS.map((scenario) => JSON.stringify(scenario, null, 2)).join('\n\n')}

${TIVOT_DRAG_DROP_FLOWS.map((scenario) => JSON.stringify(scenario, null, 2)).join('\n\n')}

FORMATO DE SALIDA EXCLUSIVO:
Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura según el tipo de ejercicio:

Para problemas de texto simple ("type": "text_question"):
{
  "type": "text_question",
  "title": "Título corto del problema",
  "scenario": "Descripción clara del problema en tienda (máximo 3 oraciones).",
  "question": "¿Qué causó este problema o qué acción inmediata se debe tomar?",
  "hint": "Pista sutil sin dar la respuesta completa.",
  "expected_keywords": ["palabra1", "palabra2", "palabra3"],
  "explanation": "Explicación breve de la lógica correcta detrás del problema."
}

Para problemas de flujo/arrastrar ("type": "drag_drop_flow"):
{
  "type": "drag_drop_flow",
  "title": "Título del procedimiento a ordenar",
  "scenario": "Situación práctica que requiere un orden lógico.",
  "instructions": "Arrastra y ordena los pasos en la secuencia correcta de inicio a fin.",
  "steps_correct_order": [
    {"id": "1", "text": "Primer paso a realizar"},
    {"id": "2", "text": "Segundo paso"},
    {"id": "3", "text": "Tercer paso"},
    {"id": "4", "text": "Paso final"}
  ],
  "explanation": "Por qué este orden es indispensable para no perder dinero ni desordenar el inventario."
}
`.trim()