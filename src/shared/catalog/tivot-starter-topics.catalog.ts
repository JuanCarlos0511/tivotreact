import type { TivotStarterTopic } from '@shared/types'

export const TIVOT_STARTER_TOPICS: TivotStarterTopic[] = [
  {
    id: 'que-es-variable',
    title: 'Que es una Variable?',
    description: 'Guardar precios y nombres de articulos.',
    prompt: 'Que es una variable? Explicamelo con una caja registradora.',
    icon: 'robot',
  },
  {
    id: 'tipos-de-datos',
    title: 'Tipos de Datos',
    description: 'Diferenciar numeros, texto y cajas abiertas.',
    prompt: 'Que son string, int, float y boolean en un sistema POS?',
    icon: 'repeat',
  },
  {
    id: 'decisiones-con-if',
    title: 'Decisiones con IF',
    description: 'Aplicar descuentos y verificar dinero.',
    prompt: 'Como funciona un if para aplicar descuentos o revisar si alcanza el dinero?',
    icon: 'decision',
  },
  {
    id: 'listas-y-carritos',
    title: 'Listas y Carritos',
    description: 'Guardar multiples productos en orden.',
    prompt: 'Que es una lista o arreglo usando un carrito de compras?',
    icon: 'bug',
  },
]
