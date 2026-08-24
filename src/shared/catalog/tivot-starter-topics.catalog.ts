import type { TivotStarterTopic } from '@shared/types'

export const TIVOT_STARTER_TOPICS: TivotStarterTopic[] = [
  {
    id: 'caja-del-kiosco',
    title: 'La Caja del Kiosco',
    description: 'Ordena los pasos para abrir la venta del día.',
    prompt: 'Quiero aprender a abrir la caja y empezar a vender con orden.',
    problemId: 'KID-SEQ-001',
    icon: 'robot',
  },
  {
    id: 'fila-de-dulces',
    title: 'La Fila de Dulces',
    description: 'Repite las mismas acciones para atender a más clientes.',
    prompt: 'Quiero aprender a repetir los pasos de la venta para muchas personas.',
    problemId: 'KID-LUP-001',
    icon: 'repeat',
  },
  {
    id: 'si-paga-o-no',
    title: 'Si Paga o No',
    description: 'Decide qué hacer según el pago del cliente.',
    prompt: 'Quiero aprender a elegir qué pasa si el cliente paga con dinero o con tarjeta.',
    problemId: 'KID-CND-001',
    icon: 'decision',
  },
  {
    id: 'cambio-equivocado',
    title: 'Cambio Equivocado',
    description: 'Encuentra el paso que hizo mal la venta.',
    prompt: 'Quiero encontrar el error cuando el cambio no sale bien.',
    problemId: 'KID-BUG-001',
    icon: 'bug',
  },
]
