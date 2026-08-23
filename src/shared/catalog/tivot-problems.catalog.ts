import type { TivotProblem } from '@shared/types'

export const TIVOT_PROBLEM_CATALOG: TivotProblem[] = [
  {
    problem_id: 'POS-TXT-001',
    mode: 'standard_text',
    title: 'Redondeo monetario en moneda fraccionaria',
    difficulty: 'Junior',
    tags: ['Aritmetica', 'Precision', 'Medios de pago'],
    system_context:
      'Un POS opera en un pais donde se eliminaron las monedas de 1 y 2 centavos. Todo total en efectivo debe redondearse al multiplo de 5 centavos mas cercano, pero en pagos con tarjeta debe cobrarse el monto exacto.',
    evaluation_criteria:
      'El usuario debe identificar que no se debe usar float/double estandar por perdida de precision binaria y debe separar la logica de calculo segun el medio de pago.',
  },
  {
    problem_id: 'POS-TXT-002',
    mode: 'standard_text',
    title: 'Colision de codigo de barras',
    difficulty: 'Junior',
    tags: ['Identidad', 'Catalogo', 'Integridad'],
    system_context:
      'Dos articulos distintos fueron dados de alta con el mismo codigo de barras. La caja cobra el producto barato aunque se escanee el caro.',
    evaluation_criteria:
      'El usuario debe reconocer que el SKU/codigo debe ser un identificador unico, y que el alta de productos requiere validacion previa e inmutabilidad controlada.',
  },
  {
    problem_id: 'POS-FLW-001',
    mode: 'interactive_flow',
    title: 'Transaccion segura de venta con tarjeta',
    difficulty: 'Mid',
    tags: ['ACID', 'Concurrencia', 'Pasarelas de pago'],
    system_context:
      'Secuencia critica de operaciones al procesar una venta con terminal bancaria integrada para evitar discrepancias de inventario si el cobro es denegado.',
    flow_definition: {
      instruction: 'Ordena cronologicamente los pasos para garantizar atomicidad e integridad:',
      nodes: [
        { id: 'f1', label: 'Reservar temporalmente las unidades de inventario con lock optimista' },
        { id: 'f2', label: 'Enviar payload de cobro al procesador de pagos y esperar respuesta' },
        { id: 'f3', label: 'Confirmar commit de la transaccion en la base de datos local y descontar stock formalmente' },
        { id: 'f4', label: 'Emitir comprobante fiscal / ticket de venta al cliente' },
      ],
      valid_orders: [['f1', 'f2', 'f3', 'f4']],
    },
    failure_hints: {
      f2_before_f1: 'Que pasaria si otra caja vende el ultimo producto mientras la terminal bancaria procesa el pago?',
      f3_before_f2: 'Que ocurre con el stock si el banco rechaza la tarjeta por fondos insuficientes?',
    },
  },
  {
    problem_id: 'POS-FLW-002',
    mode: 'interactive_flow',
    title: 'Devolucion con reintegro y stock consistente',
    difficulty: 'Mid',
    tags: ['Rollback', 'Inventario', 'Auditoria'],
    system_context:
      'Un cliente devuelve un articulo. El POS debe validar la compra, registrar el retorno y emitir el reintegro sin duplicar stock ni dinero.',
    flow_definition: {
      instruction: 'Ordena los pasos de una devolucion segura:',
      nodes: [
        { id: 'r1', label: 'Localizar el ticket original y validar que la venta existe' },
        { id: 'r2', label: 'Inspeccionar el producto y confirmar que aplica devolucion' },
        { id: 'r3', label: 'Registrar la entrada de inventario con referencia al ticket original' },
        { id: 'r4', label: 'Emitir reintegro y comprobante de devolucion auditado' },
      ],
      valid_orders: [['r1', 'r2', 'r3', 'r4']],
    },
    failure_hints: {
      r3_before_r1: 'Como evitas sumar inventario si no confirmaste que la venta original existia?',
      r4_before_r3: 'Que diferencia queda entre dinero e inventario si reintegras antes de registrar la entrada?',
    },
  },
]
