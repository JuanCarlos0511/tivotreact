import type { AiProvider } from '@shared/types'
import type { ChatContextMessage } from './ai-provider.types'

export class MockTivotAdapter implements AiProvider {
  async complete(prompt: string, messages: ChatContextMessage[] = [{ role: 'user', content: prompt }]): Promise<string> {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content.toLowerCase() ?? ''

    if (lastUserMessage.includes('variable')) {
      return JSON.stringify({
        tipo: 'texto',
        mensaje:
          'Una variable en el POS es como una gaveta donde guardas un dato que puede cambiar, por ejemplo: total_cuenta = 120.50. ¿Qué otro dato de una venta crees que deba guardarse en una variable?',
        cuadros: null,
        opciones: ['💵 Dinero recibido', '🏷️ Nombre del cajero', '🎯 Lanzar un reto'],
      })
    }

    if (
      lastUserMessage.includes('condicional') ||
      lastUserMessage.includes('condicion') ||
      lastUserMessage.includes('condicionante') ||
      lastUserMessage.includes('if')
    ) {
      return JSON.stringify({
        tipo: 'texto',
        mensaje:
          'El condicional IF nos permite tomar decisiones en caja. Por ejemplo: SI el cliente tiene tarjeta de puntos, aplicamos 10% de descuento. ¿Qué pasa SI NO tiene tarjeta?',
        cuadros: null,
        opciones: ['Cobrar precio normal', 'Pedirle que se registre'],
      })
    }

    if (lastUserMessage.includes('lista') || lastUserMessage.includes('carrito') || lastUserMessage.includes('arreglo')) {
      return JSON.stringify({
        tipo: 'texto',
        mensaje:
          'Una lista en el POS es como el carrito de compras: guarda varios productos escaneados en orden, como carrito = ["Pan", "Leche"]. ¿Qué operación harías al agregar otro producto?',
        cuadros: null,
        opciones: ['➕ Agregarlo al carrito', '🧾 Imprimir ticket', '🎯 Lanzar un reto'],
      })
    }

    if (lastUserMessage.includes('bucle') || lastUserMessage.includes('repetir')) {
      return JSON.stringify({
        tipo: 'texto',
        mensaje:
          'Un bucle sirve para repetir una acción sin escribirla muchas veces, como escanear cada artículo del carrito. ¿Qué condición detiene el bucle?',
        cuadros: null,
        opciones: ['🛒 Carrito vacío', '🔌 Apagar la caja'],
      })
    }

    return JSON.stringify({
      tipo: 'texto',
      mensaje: 'Hola, soy Tivot, tu tutor de programación con ejemplos de punto de venta. ¿Qué tema quieres explorar hoy?',
      cuadros: null,
      opciones: ['📦 Variables', '🔀 Condicional IF', '🛒 Listas', '🔁 Bucles'],
    })
  }
}
